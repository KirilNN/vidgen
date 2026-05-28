# @vidgen/web

Next.js 15 App-Router shell for Vidgen (T-016). Renders the login page,
runs the Keycloak OIDC + PKCE flow, and gives the signed-in user a
dashboard where they can see and create workspaces.

## Architecture refs

- arch §8.1 — Web stack (Next.js + Tailwind + shadcn primitives + TanStack Query)
- arch §3.10 — All API calls go through `@vidgen/sdk-ts`
- arch §11 — Multi-tenant: each workspace row carries `workspace_id`; RLS is enforced server-side
- decisions.md ADR-0006 — Keycloak as OIDC IDP for dev + prod

## Auth model

- Public PKCE client `app-web` (see `infra/compose/keycloak/realm-export.json`).
- Server-side: `openid-client` v6 with `None()` auth method. The discovered
  Keycloak metadata is cached per process.
- Cookie: `iron-session` v8 seals the access_token + expiry + sub into an
  httpOnly cookie keyed by `APP_SECRET`. Nothing is stored server-side.
- No refresh token today — token TTL (~15 min in the dev realm) forces a
  re-login. Refresh + server-side session backed by Redis is a follow-up
  (use the new `redis` service from T-017 once the editor needs it).
- Browser calls hit our own `/api/*` proxy routes (`/api/me`,
  `/api/workspaces`). The proxy attaches `Authorization: Bearer <session>`
  server-side so the access_token never reaches the browser.

## Env vars (defined in `@vidgen/config/web`)

| Name                         | Default                             | Purpose                                                            |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `WEB_PORT`                   | `3000`                              | Next listen port                                                   |
| `WEB_PUBLIC_URL`             | `http://localhost:3000`             | Browser-facing origin of the web app                               |
| `APP_SECRET`                 | (required, ≥32 chars)               | Seals the iron-session cookie                                      |
| `KEYCLOAK_PUBLIC_ISSUER_URL` | `https://auth.localhost/realms/app` | OIDC issuer; **must** match the API's `KEYCLOAK_ISSUER_URL`        |
| `KEYCLOAK_CLIENT_ID_WEB`     | `app-web`                           | OIDC client_id                                                     |
| `API_INTERNAL_URL`           | `http://localhost:3001`             | Where the Next server reaches the API (compose: `http://api:3001`) |
| `NEXT_PUBLIC_API_PUBLIC_URL` | `http://localhost:3001`             | Display-only API URL for the UI                                    |

## Local dev

```bash
# Start the supporting services (Postgres, Keycloak, Redis, Caddy, API).
docker compose -f infra/compose/docker-compose.yml --profile core up -d \
  postgres redis keycloak caddy api

# Then run the web app locally (faster iteration than the container).
pnpm --filter @vidgen/web dev
# → open http://localhost:3000
```

The browser must trust Caddy's local root CA so `https://auth.localhost`
resolves cleanly. See `infra/compose/README.md` for the one-time cert-trust
step.

## Run inside compose

```bash
docker compose -f infra/compose/docker-compose.yml --profile core up -d
# Then open https://app.localhost (proxied by Caddy → web:3000)
```

The `web` compose service mounts the Caddy CA read-only at `/caddy-pki` and
sets `NODE_EXTRA_CA_CERTS` so server-side token exchange to
`https://auth.localhost` works without warnings.

## Test

```bash
pnpm --filter @vidgen/web test       # unit tests (PKCE, session, proxy)
pnpm --filter @vidgen/web type-check
pnpm --filter @vidgen/web lint
pnpm --filter @vidgen/web build      # next build (standalone)
```

Smoke check (after `docker compose --profile core up -d`):

```bash
./scripts/web-smoke.sh
```

## File layout

```
src/
  app/
    layout.tsx, page.tsx, providers.tsx, globals.css
    (auth)/login/page.tsx
    (app)/dashboard/page.tsx + dashboard-client.tsx
    api/
      healthz/route.ts
      auth/{login,callback,logout}/route.ts
      me/route.ts
      workspaces/route.ts
  components/
    sign-in-button.tsx
    ui/{button,card,input}.tsx
  lib/
    auth.ts        # openid-client v6 wrapper, PKCE helpers
    session.ts     # iron-session config (session + pre-login)
    api.ts         # SDK factory + proxyWithBearer helper
    env.ts         # cached loadWebConfig()
    cn.ts          # clsx + tailwind-merge
```
