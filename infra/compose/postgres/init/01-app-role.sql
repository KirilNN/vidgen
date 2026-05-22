-- vidgen — non-superuser application role (T-010)
--
-- Architecture references:
--   - docs/architecture.md §11 — multi-tenant isolation is enforced by RLS;
--     RLS only applies to roles WITHOUT BYPASSRLS. The default superuser
--     created by POSTGRES_USER bypasses RLS, which is unsafe for app traffic.
--   - docs/architecture.md §5.2 — every tenant table carries workspace_id;
--     the app role is the principal those policies gate.
--
-- What this script does:
--   1. Creates a non-superuser LOGIN role whose NAME and PASSWORD come from
--      the APP_DB_USER / APP_DB_PASSWORD environment variables (the compose
--      service forwards POSTGRES_USER / POSTGRES_PASSWORD into them). Falls
--      back to literal `app` / `change-me` so a bare `docker run` still
--      boots in dev. A `change-me` value is the giant flashing warning sign.
--   2. Grants CONNECT on the app database and USAGE on the public schema.
--   3. Adds ALTER DEFAULT PRIVILEGES so future tables created by the
--      bootstrap/migrator role (T-011 Drizzle) are reachable by the role.
--   4. Idempotent: re-runs reset the password and re-grant; no error if the
--      role already exists.
--   5. Leaves BYPASSRLS *unset* — this is the whole point of the role.
--
-- Why not just use POSTGRES_USER as the cluster superuser AND the app role?
-- Because the official postgres entrypoint creates POSTGRES_USER with
-- SUPERUSER. SUPERUSERs bypass RLS unconditionally, which would defeat
-- multi-tenant isolation. So we keep the superuser separate and create a
-- distinct, RLS-bound login role for services.
--
-- The docker-entrypoint already runs this script connected to POSTGRES_DB,
-- so no \connect needed.

-- Pull APP_DB_USER / APP_DB_PASSWORD from the process environment via
-- backticks (psql runs the command in a subshell). The :- syntax provides
-- the dev fallback.
\set app_user `echo "${APP_DB_USER:-app}"`
\set app_password `echo "${APP_DB_PASSWORD:-change-me}"`

-- Create the role only if missing. \gexec runs whatever the preceding
-- SELECT returns as a SQL statement; if the WHERE clause filters everything
-- out we get zero rows and \gexec is a no-op.
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
\gexec

-- Always reset the password on each init so credential rotation works by
-- restarting the container with a new APP_DB_PASSWORD. Safe even on first
-- boot because the role exists by now.
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'app_user', :'app_password')
\gexec

-- Reach the database and the public schema. current_database() avoids
-- depending on a psql variable the entrypoint doesn't set.
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_user') \gexec

-- Forward-grants: every future table/sequence/function created by the
-- bootstrap role (the superuser, which is what migrations connect as) is
-- automatically reachable by the app role. T-011 layers per-table grants
-- on top for principle-of-least-privilege refinements.
SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
  :'app_user'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
  :'app_user'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO %I',
  :'app_user'
) \gexec
