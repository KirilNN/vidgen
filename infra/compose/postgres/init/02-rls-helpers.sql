-- vidgen — Row-Level-Security helpers (T-010)
--
-- Architecture references:
--   - docs/architecture.md §5.1 / §11 — RLS gates every tenant table by
--     `workspace_id = current_workspace_id()`. The session sets the current
--     workspace once per request via `SET LOCAL app.workspace_id = '...'`.
--   - docs/architecture.md §5.2 — concrete tables with workspace_id land in
--     T-011; this file only ships the function they will key off.
--
-- Function contract (acceptance criterion for T-010):
--   * SELECT current_workspace_id()             -> NULL (when unset)
--   * SET LOCAL app.workspace_id = 'abc';
--     SELECT current_workspace_id()             -> 'abc'
--
-- Why a SECURITY-INVOKER function and not a view / GUC read inline:
--   - Functions can be wrapped in DEFAULT expressions and CHECK / USING
--     clauses without leaking the GUC name across the schema.
--   - We can later add validation (UUID format, audit emission) inside the
--     function body without touching every policy.
--   - SECURITY INVOKER keeps the function harmless: it can only read what
--     the calling role can read; no privilege escalation.
--
-- `current_setting(name, missing_ok => true)` returns NULL instead of
-- raising when the GUC has never been set in the session. An empty-string
-- value (rare, but possible via misconfigured callers) is normalised to
-- NULL so policies treat `unset` and `empty` identically.
--
-- The docker-entrypoint already runs this script connected to POSTGRES_DB,
-- so no \connect needed.

CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
PARALLEL SAFE
AS $$
  SELECT NULLIF(current_setting('app.workspace_id', true), '');
$$;

COMMENT ON FUNCTION public.current_workspace_id() IS
  'Returns the workspace_id from session GUC app.workspace_id, or NULL when '
  'unset. Used by RLS policies on every tenant table (arch §11). Set per '
  'request with: SET LOCAL app.workspace_id = ''<uuid>'';';

-- The app role must be allowed to call the helper. PUBLIC has EXECUTE by
-- default on new functions, but we declare it explicitly so a future
-- REVOKE FROM PUBLIC at the schema level doesn't silently break tenancy.
-- The role name is whatever 01-app-role.sql created (APP_DB_USER), so we
-- look it up the same way (env -> psql backtick fallback).
\set app_user `echo "${APP_DB_USER:-app}"`
SELECT format('GRANT EXECUTE ON FUNCTION public.current_workspace_id() TO %I', :'app_user') \gexec

-- A tiny self-test the entrypoint runs once on first init. It uses an
-- assertion via a DO block so a regression in the helper fails the init,
-- which fails the container healthcheck loop, which surfaces as a clear
-- "postgres unhealthy" in compose ps. Keeps the contract honest.
DO $$
DECLARE
  unset_value text;
  set_value   text;
BEGIN
  -- Unset path
  PERFORM set_config('app.workspace_id', '', true); -- '' is normalised to NULL
  unset_value := public.current_workspace_id();
  IF unset_value IS NOT NULL THEN
    RAISE EXCEPTION 'current_workspace_id() self-test failed: expected NULL when unset, got %', unset_value;
  END IF;

  -- Set path
  PERFORM set_config('app.workspace_id', 'abc', true);
  set_value := public.current_workspace_id();
  IF set_value IS DISTINCT FROM 'abc' THEN
    RAISE EXCEPTION 'current_workspace_id() self-test failed: expected ''abc'', got %', set_value;
  END IF;
END $$;
