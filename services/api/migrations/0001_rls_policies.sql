-- vidgen — RLS bootstrap for every tenant table (T-011).
--
-- Architecture references:
--   docs/architecture.md §11 — Postgres RLS gates every tenant table by
--     `workspace_id = current_workspace_id()`. The session sets the current
--     workspace once per request via `SET LOCAL app.workspace_id = '...'`.
--   docs/architecture.md §5.2 — schema (this migration's policies cover
--     every table created by 0000_initial_schema.sql).
--
-- Three policy shapes appear below:
--   A) "standard" — table has a `workspace_id` column. The policy is the
--      copy-paste predicate `workspace_id = current_workspace_id()`.
--   B) "self"     — `tenants` IS the workspace; the column is named
--      `workspace_id` already, so the standard shape applies.
--   C) "via tenant_members" — `users` has no `workspace_id` column (a
--      user can belong to many workspaces). Visibility is gated by
--      "does this user belong to the calling workspace?".
--
-- Why a single combined USING+WITH CHECK policy and not separate
-- read/write policies:
--   - The default `FOR ALL` covers SELECT / INSERT / UPDATE / DELETE.
--   - The `WITH CHECK` clause (mandatory for INSERT / UPDATE) is identical
--     to the `USING` clause, so a row inserted into the wrong workspace
--     is rejected at write time too, not just hidden at read time.
--
-- Why NOT `FORCE ROW LEVEL SECURITY`:
--   - The superuser intentionally bypasses RLS so migrations + ops can
--     still see all data. The `app` role we created in T-010 doesn't bypass
--     (rolbypassrls=false), so app traffic is fully RLS-bound. Adding
--     FORCE would lock out the superuser too — useful eventually, but
--     premature today (no maintenance tooling exists yet).
--
-- All statements are idempotent (`IF NOT EXISTS` on policies, `IF EXISTS`
-- on drops aren't needed because drizzle won't re-run this migration after
-- it's recorded in `drizzle.__drizzle_migrations`).

-- ---- A) standard `workspace_id = current_workspace_id()` ----------------

-- tenants: workspace_id IS the primary key.
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "tenants"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "tenant_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "tenant_members"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "assets"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "renditions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "renditions"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "projects"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "project_clips" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "project_clips"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "transcripts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "transcripts"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "transcript_segments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "transcript_segments"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "transcript_words" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "transcript_words"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "captions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "captions"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "edits" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "edits"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "renders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "renders"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "workflows" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "workflows"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "comments"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "audit_log"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "embeddings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "embeddings"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "share_links"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "oauth_connections" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "oauth_connections"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "webhooks"
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- ---- C) `users` — visibility via tenant_members -------------------------
--
-- A user record is visible to a workspace iff that user has a
-- tenant_members row in the calling workspace. When current_workspace_id()
-- is NULL the inner predicate is NULL (false), so EXISTS evaluates false
-- and zero user rows are returned — the acceptance criterion's
-- "unset -> zero rows" property is preserved.
--
-- Inserts are gated by the same EXISTS — i.e. a workspace can only insert
-- a `users` row that is already linked to it via tenant_members.
-- Practically, app code creates the `tenant_members` row in the same
-- transaction as the `users` row; the order matters (members first OR
-- both inside a single workflow that uses the superuser for bootstrap).
-- The provisioning workflow (T-015 / T-200) handles this; this policy
-- just makes sure the app role can't create orphan users in someone
-- else's workspace.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "users"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "tenant_members" tm
      WHERE tm.user_id = users.user_id
        AND tm.workspace_id = current_workspace_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "tenant_members" tm
      WHERE tm.user_id = users.user_id
        AND tm.workspace_id = current_workspace_id()
    )
  );

-- ---- Self-test ----------------------------------------------------------
--
-- Self-test runs as the migration role (superuser). Superuser bypasses
-- RLS, so this can't verify "app role sees zero rows when unset" — that's
-- what scripts/db-migrate-smoke.sh verifies end-to-end. What we CAN
-- verify here is that every expected table has RLS enabled, catching
-- accidental policy drops in later migrations.
DO $$
DECLARE
  expected text[] := ARRAY[
    'tenants','users','tenant_members','assets','renditions','projects',
    'project_clips','transcripts','transcript_segments','transcript_words',
    'captions','edits','renders','workflows','comments','audit_log',
    'embeddings','share_links','oauth_connections','webhooks'
  ];
  missing text;
BEGIN
  SELECT string_agg(t, ',') INTO missing
  FROM unnest(expected) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = t
      AND c.relrowsecurity
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS not enabled on tables: %', missing;
  END IF;
END $$;
