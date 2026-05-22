-- vidgen — Postgres extensions bootstrap (T-010)
--
-- Runs once, on first cluster init. The official postgres docker-entrypoint
-- invokes this script with `psql --dbname "$POSTGRES_DB" -f`, so we are
-- already connected to the app database — no \connect needed.
--
-- References:
--   - docs/architecture.md §5.1 — pgvector, pg_trgm, pgcrypto are required.
--   - docs/architecture.md §11  — RLS uses these primitives later.
--
-- Idempotency: every CREATE EXTENSION uses IF NOT EXISTS so re-running by
-- hand (e.g. inside an already-initialised cluster) is a no-op.

-- pgvector — vector(N) column type for embeddings (arch §5.2 `embeddings`).
CREATE EXTENSION IF NOT EXISTS vector;

-- pg_trgm — trigram indexes for typo-tolerant search (arch §5.1).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- pgcrypto — gen_random_uuid(), digest(), pgp_*; underpins audit-log hashing
-- (arch §11) and envelope-encryption helpers (arch §5.1).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
