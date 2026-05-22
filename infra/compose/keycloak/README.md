# `infra/compose/keycloak/` — Keycloak IdP

Owned by [T-013](../../../docs/tickets.md#t-013--keycloak-with-realm--admin-bootstrap-).
Implements [`architecture.md` §3.9, §11](../../../docs/architecture.md) — OIDC
identity provider for the app, with per-realm tenancy as the long-term shape.

## What ships

| Service         | Image                            | Role                                                                                                              |
| --------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `keycloak-init` | `postgres:16-alpine`             | One-shot sidecar: creates the dedicated `keycloak` DB + role; renders the realm import file conditional on `ENV`. |
| `keycloak`      | `quay.io/keycloak/keycloak:26.0` | The IdP. Started with `start-dev --import-realm` for the local dev profile.                                       |

### Why a separate init container?

Keycloak does not create its own database, and the Postgres init scripts from
[T-010](../../../docs/tickets.md#t-010--postgres-16--pgvector-with-rls-bootstrap-)
only run on _first cluster bootstrap_ — they would skip an existing
`pg_data` volume. The init container therefore uses idempotent
`SELECT … WHERE NOT EXISTS \gexec` against the live cluster, leaving T-010's
init scripts untouched.

### Ports

| Port (host) | Port (container) | Purpose                       |
| ----------- | ---------------- | ----------------------------- |
| `8080`      | `8080`           | Keycloak HTTP (admin + OIDC). |

Caddy ([T-014](../../../docs/tickets.md#t-014--caddy-reverse-proxy-with-local-tls-))
will front this with `https://auth.localhost` once it lands; until then,
visit `http://localhost:8080` directly.

## Realm shape (`realm-export.json`)

| Item                 | Value                                       | Notes                                                                                              |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Realm name           | `app`                                       | Discovery: `/realms/app/.well-known/openid-configuration`                                          |
| Brute-force protect  | enabled                                     | Default safety net.                                                                                |
| Public client        | `app-web`                                   | SPA / Next.js. **PKCE S256 required** (no implicit / direct grants).                               |
| Confidential client  | `app-api`                                   | Server-side API. Secret read from `$${env.KEYCLOAK_CLIENT_SECRET_API}` at realm import time.       |
| Realm roles          | `owner`, `editor`, `viewer`                 | `viewer` is the default role assigned to new users.                                                |
| Test user (dev only) | `dev@local` / `dev` with realm role `owner` | Imported **only when `ENV=dev`** — the init container strips `users[]` from the import in non-dev. |

### Variable substitution

The realm file checks in a placeholder secret (`replaced-by-keycloak-init`)
for the confidential client. `keycloak-init` substitutes the value of
`$KEYCLOAK_CLIENT_SECRET_API` into the rendered file with `jq` before
Keycloak imports it.

> _Why not_ `${env.VAR}` _inside the realm file?_ Keycloak's realm import
> does **not** process `${env.X}` placeholders (that syntax is for the
> WildFly server config layer, not realm-import); environment substitution
> has to happen in the init container, where we already have `jq`.

## Run

```bash
cd infra/compose
cp .env.example .env                   # set strong KEYCLOAK_* values
docker compose --profile core up -d keycloak-init keycloak

# Visit:
open http://localhost:8080
# Admin login = KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD
# OIDC discovery:
curl -sf http://localhost:8080/realms/app/.well-known/openid-configuration | jq .issuer
```

## Smoke

`bash scripts/keycloak-smoke.sh` verifies every T-013 acceptance criterion
(container healthy, GET 200 on the discovery doc with the expected issuer,
both clients present, three roles present, and — when `ENV=dev` — the test
user can authenticate via the Direct Access Grant on `app-api`).

## Environment variables

These are declared in [`.env.example`](../.env.example):

| Variable                     | Used by     | Default                            | Purpose                                          |
| ---------------------------- | ----------- | ---------------------------------- | ------------------------------------------------ |
| `ENV`                        | init        | `dev`                              | Gates whether the dev test user is imported.     |
| `KEYCLOAK_ADMIN`             | server      | `change-me`                        | Initial superuser of the Keycloak admin console. |
| `KEYCLOAK_ADMIN_PASSWORD`    | server      | `change-me`                        | Initial superuser password.                      |
| `KEYCLOAK_DB_NAME`           | init+server | `keycloak`                         | Dedicated Postgres database name.                |
| `KEYCLOAK_DB_USER`           | init+server | `keycloak`                         | Dedicated Postgres role.                         |
| `KEYCLOAK_DB_PASSWORD`       | init+server | `change-me`                        | Password for the dedicated role.                 |
| `KEYCLOAK_REALM`             | smoke       | `app`                              | Realm to import + verify.                        |
| `KEYCLOAK_ISSUER_URL`        | smoke + API | `http://localhost:8080/realms/app` | The discovery issuer URL.                        |
| `KEYCLOAK_CLIENT_ID_WEB`     | reference   | `app-web`                          | Client ID of the SPA client.                     |
| `KEYCLOAK_CLIENT_ID_API`     | reference   | `app-api`                          | Client ID of the confidential server client.     |
| `KEYCLOAK_CLIENT_SECRET_API` | server      | `change-me`                        | Secret substituted into `app-api`.               |
| `KEYCLOAK_HTTP_PORT`         | compose     | `8080`                             | Host port mapped to the server's 8080.           |

## Out of scope (per ticket)

- TLS termination → T-014 Caddy.
- Per-tenant realms (one realm per workspace) → not needed for R1; the `app`
  realm is shared across workspaces during the wedge. Per-tenant realms are
  unlocked by F9.2 (SSO/SAML) work in Phase 12.
- SCIM provisioning → ships with F9.2.
- Token mapping into `app.workspace_id` claim → ships with the API auth
  plugin in T-015.
