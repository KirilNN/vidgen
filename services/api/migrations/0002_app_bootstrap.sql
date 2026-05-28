-- vidgen — application-layer bootstrap helpers (T-015).
--
-- Architecture references:
--   - docs/architecture.md §3.10 — Fastify gateway, authenticated routes.
--   - docs/architecture.md §11   — multi-tenant isolation via RLS. This
--                                  migration EXTENDS the workspace-bound
--                                  policies from 0001 with carefully-scoped
--                                  "self bootstrap" reads so the API can
--                                  serve `GET /me` and `GET/POST /workspaces`
--                                  without a workspace context.
--
-- Background — the bootstrap problem:
--   Three routes added by T-015 (`/me`, `GET /workspaces`, `POST /workspaces`)
--   run BEFORE the calling user has picked a workspace. At that point
--   `app.workspace_id` is NULL, and the workspace_isolation policies in
--   0001 (which require `workspace_id = current_workspace_id()`) return
--   zero rows from every tenant table — including the tables we MUST read
--   to answer these requests (users, tenant_members, tenants).
--
--   PostgreSQL OR-combines permissive RLS policies on the same FOR action.
--   So we add a NEW additive SELECT-only policy named
--   `self_bootstrap_read` that fires only when:
--     1. `app.workspace_id` is unset (preserves the existing safety
--        envelope for in-workspace requests, where bootstrap reads are
--        intentionally unavailable), AND
--     2. `app.user_id` IS set (the API plugin sets this from the verified
--        JWT subject after upserting the user record), AND
--     3. the row in question belongs to that caller (or to a workspace
--        the caller is a member of, for `tenants`).
--   The existing `workspace_isolation` policy is unchanged. Both apply
--   together: if either one returns true, the row is visible.
--
-- For writes — the `POST /workspaces` case:
--   Even a new workspace's first row (`tenants`) cannot pass the existing
--   `workspace_isolation` WITH CHECK because `current_workspace_id()` is
--   NULL during the bootstrap call. And the chicken-and-egg between
--   `tenants` and `tenant_members` means no application code can create
--   both rows in one atomic RLS-bound transaction. We solve this with a
--   SECURITY DEFINER function (`create_workspace_for_user`) that is owned
--   by the migration superuser (which bypasses RLS) and is EXECUTE-only
--   for the app role. The function:
--     * insists `current_user_id() = p_user_id` so the app role cannot
--       create memberships for someone else (defense in depth — the route
--       handler also constrains this);
--     * hardcodes the membership role to `owner` (no caller-controlled
--       privilege escalation);
--     * sets `search_path = pg_catalog, public` so a hostile schema cannot
--       shadow the tables we reference;
--     * is `REVOKE`d from PUBLIC and explicitly `GRANT`ed only to `app`.
--
-- An accompanying `upsert_user_by_email` SECURITY DEFINER function lets
-- the API resolve a Keycloak email claim into our internal `users.user_id`
-- on first sight, with the same hardening.

-- ---- 1. current_user_id() GUC reader ---------------------------------
-- Mirrors `current_workspace_id()` from T-010 (infra/compose/postgres/init/02-rls-helpers.sql).
-- Returns NULL when unset OR when the value fails the uuid cast (e.g. an
-- empty string), so RLS predicates can lean on a single "unset or invalid
-- => NULL => deny" rule instead of duplicating the check.
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
PARALLEL SAFE
AS $$
DECLARE
  v_text text;
BEGIN
  v_text := nullif(current_setting('app.user_id', true), '');
  IF v_text IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN v_text::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.current_user_id() IS
  'Returns the user_id from session GUC app.user_id, or NULL when unset or '
  'malformed. Set per request with: SELECT set_config(''app.user_id'', '
  '''<uuid>'', true) inside a withUserContext transaction. Powers the '
  'self_bootstrap_read RLS policies on users / tenant_members / tenants.';

-- The app role must call this helper from within its self_bootstrap_read
-- policy. PUBLIC has EXECUTE by default; granting explicitly to `app`
-- keeps the contract obvious if a future REVOKE FROM PUBLIC lands.
GRANT EXECUTE ON FUNCTION public.current_user_id() TO app;

-- ---- 2. self_bootstrap_read RLS policies ------------------------------

-- A user can read their OWN users row when no workspace is bound. This is
-- additive to the existing tenant_members-EXISTS policy from 0001 and is
-- only active during the bootstrap window (workspace_id unset).
CREATE POLICY "self_bootstrap_read" ON "users"
  FOR SELECT
  USING (
    current_workspace_id() IS NULL
    AND current_user_id() IS NOT NULL
    AND user_id = current_user_id()
  );

-- A user can read their OWN tenant_members rows when no workspace is
-- bound. This is what powers `GET /workspaces` -- the API joins
-- tenant_members → tenants to enumerate memberships.
CREATE POLICY "self_bootstrap_read" ON "tenant_members"
  FOR SELECT
  USING (
    current_workspace_id() IS NULL
    AND current_user_id() IS NOT NULL
    AND user_id = current_user_id()
  );

-- A user can read a tenants row when no workspace is bound and they have
-- a tenant_members row in that tenant. Note the EXISTS subquery itself
-- runs under RLS, but the inner reference to tenant_members.user_id =
-- current_user_id() is satisfied by the new self_bootstrap_read policy
-- above (also additive on tenant_members).
CREATE POLICY "self_bootstrap_read" ON "tenants"
  FOR SELECT
  USING (
    current_workspace_id() IS NULL
    AND current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.workspace_id = tenants.workspace_id
        AND tm.user_id = current_user_id()
    )
  );

-- ---- 3. upsert_user_by_email() SECURITY DEFINER ----------------------
--
-- Resolves an email (from the verified Keycloak ID token) to our internal
-- `users.user_id`. Idempotent: re-running with the same email returns the
-- same user_id and refreshes `updated_at`. Trims & lower-cases the email
-- to keep the unique index deterministic across IdPs.
--
-- Hardening:
--   - SECURITY DEFINER so the function bypasses RLS (it inserts into
--     `users`, which would otherwise require a workspace membership).
--   - `SET search_path = pg_catalog, public` prevents a hostile schema in
--     the search_path from shadowing `public.users`.
--   - Tables are schema-qualified (`public.users`) for the same reason.
--   - REVOKE from PUBLIC + GRANT EXECUTE to app (only the app role can
--     call it).
CREATE OR REPLACE FUNCTION public.upsert_user_by_email(
  p_email text,
  p_display_name text DEFAULT NULL
) RETURNS uuid
SECURITY DEFINER
SET search_path = pg_catalog, public
LANGUAGE plpgsql AS $$
DECLARE
  v_email text;
  v_user_id uuid;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'upsert_user_by_email: email is required'
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;
  v_email := lower(trim(p_email));

  INSERT INTO public.users (email, display_name)
    VALUES (v_email, p_display_name)
    ON CONFLICT (email) DO UPDATE
      SET display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
          updated_at = now()
    RETURNING user_id INTO v_user_id;
  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_user_by_email(text, text) IS
  'Idempotent email→user_id resolver used by services/api on every '
  'authenticated request. SECURITY DEFINER because it inserts into '
  'public.users, which is RLS-bound. Email is normalised (trim + lower) '
  'to match the unique index.';

REVOKE ALL ON FUNCTION public.upsert_user_by_email(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_user_by_email(text, text) TO app;

-- ---- 4. create_workspace_for_user() SECURITY DEFINER -----------------
--
-- Atomically creates a tenant + its founding `tenant_members` row in one
-- transaction, owned by the supplied user. This is the ONLY blessed path
-- for the app role to create workspaces; the standard
-- workspace_isolation policy on `tenants` blocks direct INSERTs because
-- `current_workspace_id()` is NULL during the bootstrap call.
--
-- Hardening:
--   - SECURITY DEFINER + restricted search_path (same rationale as above).
--   - Forces `p_user_id = current_user_id()`: the caller (api service)
--     MUST be running inside `withUserContext(userId, ...)` and the
--     workspace MUST be created for THAT user. Prevents the app role
--     from creating owner memberships for arbitrary users even if a bug
--     in the API let p_user_id be controlled by an untrusted source.
--   - Role is hardcoded to `owner` (no privilege-escalation surface).
--   - REVOKE from PUBLIC + GRANT EXECUTE to app.
CREATE OR REPLACE FUNCTION public.create_workspace_for_user(
  p_workspace_id text,
  p_name text,
  p_user_id uuid
) RETURNS text
SECURITY DEFINER
SET search_path = pg_catalog, public
LANGUAGE plpgsql AS $$
BEGIN
  IF p_workspace_id IS NULL OR length(trim(p_workspace_id)) = 0 THEN
    RAISE EXCEPTION 'create_workspace_for_user: workspace_id is required'
      USING ERRCODE = '22023';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'create_workspace_for_user: user_id is required'
      USING ERRCODE = '22023';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'create_workspace_for_user: name is required'
      USING ERRCODE = '22023';
  END IF;
  IF public.current_user_id() IS NULL OR public.current_user_id() <> p_user_id THEN
    RAISE EXCEPTION 'create_workspace_for_user: caller must set app.user_id = %', p_user_id
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  INSERT INTO public.tenants (workspace_id, name) VALUES (p_workspace_id, p_name);
  INSERT INTO public.tenant_members (workspace_id, user_id, role)
    VALUES (p_workspace_id, p_user_id, 'owner');
  RETURN p_workspace_id;
END;
$$;

COMMENT ON FUNCTION public.create_workspace_for_user(text, text, uuid) IS
  'Atomic tenants + tenant_members(owner) insert for the bootstrap '
  'POST /workspaces route. SECURITY DEFINER bypasses RLS; the function '
  'forces p_user_id = current_user_id() so the app role cannot create '
  'memberships for other users. Role is hardcoded to owner.';

REVOKE ALL ON FUNCTION public.create_workspace_for_user(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace_for_user(text, text, uuid) TO app;

-- ---- 5. Self-test ----------------------------------------------------
--
-- Runs as the migration role (superuser). Verifies that
-- current_user_id() correctly normalises unset / empty / malformed
-- inputs to NULL. Bypasses RLS so it can't check the policies
-- end-to-end; that's what scripts/api-smoke.sh asserts.
DO $$
DECLARE
  v uuid;
BEGIN
  PERFORM set_config('app.user_id', '', true);
  v := public.current_user_id();
  IF v IS NOT NULL THEN
    RAISE EXCEPTION 'current_user_id() self-test failed: expected NULL when unset, got %', v;
  END IF;

  PERFORM set_config('app.user_id', 'not-a-uuid', true);
  v := public.current_user_id();
  IF v IS NOT NULL THEN
    RAISE EXCEPTION 'current_user_id() self-test failed: expected NULL when malformed, got %', v;
  END IF;

  PERFORM set_config('app.user_id', '00000000-0000-0000-0000-000000000001', true);
  v := public.current_user_id();
  IF v IS DISTINCT FROM '00000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE EXCEPTION 'current_user_id() self-test failed: expected uuid, got %', v;
  END IF;
END $$;
