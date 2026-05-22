# vidgen — Postgres 16 + pgvector image (T-010)
#
# References:
#   - docs/architecture.md §5.1 — Postgres 16 + pgvector, pg_trgm, pgcrypto.
#   - docs/architecture.md §11   — Row-level security gates every tenant table
#                                   by workspace_id.
#
# Why this base image:
#   pgvector ships an official `pgvector/pgvector` image series tracked
#   against Postgres minor releases (pg16, pg17, ...). It includes both the
#   official Postgres 16 server *and* a prebuilt `vector.so` extension, so
#   we don't need to compile pgvector ourselves. The image is multi-arch
#   (linux/amd64 + linux/arm64), which matters for Apple-Silicon developers.
#
# What's added on top:
#   - The `pg_trgm` and `pgcrypto` extensions are bundled in `postgresql-contrib`
#     and are already present in the base image, so no apt install is needed.
#   - Init scripts in `init/` are copied to `/docker-entrypoint-initdb.d/` so the
#     official entrypoint runs them on *first* boot only (i.e. when `PGDATA` is
#     empty). Subsequent boots reuse the persisted `pg_data` volume and skip
#     init — exactly what we want for idempotency.
#
# Pinning policy:
#   Pin the *minor* image tag (pg16) and rely on Renovate/Dependabot to bump
#   when pgvector tags a new build. Avoid floating `:latest`.
FROM pgvector/pgvector:pg16

# Copy init scripts. Postgres' official entrypoint runs every *.sql / *.sh in
# this directory in lexical order on first init only.
COPY init/ /docker-entrypoint-initdb.d/

# The base image already declares the right ENTRYPOINT, CMD, EXPOSE 5432,
# VOLUME /var/lib/postgresql/data, and HEALTHCHECK-friendly `pg_isready`
# binary. We deliberately add nothing else here.
