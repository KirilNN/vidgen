# `infra/compose/caddy/` — Caddy reverse proxy

Owned by [T-014](../../../docs/tickets.md#t-014--caddy-reverse-proxy-with-local-tls-).
Implements [`architecture.md` §10](../../../docs/architecture.md) — Caddy in
front, automatic Let's Encrypt for real public domains, Caddy's internal CA
for `*.localhost` in dev.

## What ships

| Service | Image                | Role                                                                             |
| ------- | -------------------- | -------------------------------------------------------------------------------- |
| `caddy` | `caddy:2.8.4-alpine` | Terminates HTTPS on every `*.localhost` subdomain; reverse-proxies to the stack. |

## Routes (Caddyfile)

| Subdomain         | Default upstream            | Owner ticket | Notes                                                                  |
| ----------------- | --------------------------- | ------------ | ---------------------------------------------------------------------- |
| `app.localhost`   | `host.docker.internal:3000` | T-016        | Next.js web app. `pnpm dev` on host by default.                        |
| `api.localhost`   | `host.docker.internal:3001` | T-015        | Fastify API. Port 3001 matches `@vidgen/config` / SDK / OpenAPI today. |
| `share.localhost` | `host.docker.internal:3002` | T-100        | Static share / embed app.                                              |
| `auth.localhost`  | `keycloak:8080`             | T-013        | Keycloak OIDC. Already container-resident in `core`.                   |
| `s3.localhost`    | `minio:9000`                | T-012        | MinIO S3 API. `flush_interval -1` for streaming uploads / downloads.   |
| `minio.localhost` | `minio:9001`                | T-012        | MinIO web console.                                                     |

Every upstream is a `{$VAR:default}` substitution in the Caddyfile, so later
tickets can flip a route from `host.docker.internal:PORT` to a service-name
upstream by setting the env var in `infra/compose/.env` — no Caddyfile edit
needed.

## Ports

| Port (host) | Port (container) | Purpose                              |
| ----------- | ---------------- | ------------------------------------ |
| `80`        | `80`             | HTTP (auto-redirects to HTTPS).      |
| `443/tcp`   | `443/tcp`        | HTTPS (HTTP/1.1, HTTP/2).            |
| `443/udp`   | `443/udp`        | HTTPS over QUIC / HTTP/3 (free win). |

Host ports are overridable via `CADDY_HTTP_PORT` / `CADDY_HTTPS_PORT` for
machines where 80 / 443 are already taken. If you override, browser URLs
become `https://app.localhost:8443` (etc.).

## TLS

Sites use `tls internal`, which makes Caddy mint leaf certs from a local
root CA stored in the `caddy_data` named volume
(`/data/caddy/pki/authorities/local/root.crt`). The dev installs that CA
into the host trust store once — see
[`infra/compose/README.md` → "Trusting Caddy's local CA"](../README.md).

Production domains can continue to use ACME / Let's Encrypt automatically:
the global `email` directive is already in place; just add a new site block
without `tls internal`.

## Files

| File        | Purpose                                                            |
| ----------- | ------------------------------------------------------------------ |
| `Caddyfile` | Single source of truth for global options, snippets, and site map. |
| `README.md` | This file.                                                         |

## Acceptance (T-014)

| Criterion                                              | How to verify                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| All `*.localhost` URLs respond over HTTPS              | `bash scripts/caddy-smoke.sh` (after `docker compose --profile core up -d`)                                         |
| No browser warnings after the host trusts the local CA | Install per README, then open `https://auth.localhost/realms/app/.well-known/openid-configuration` — green padlock. |
| Caddy is part of the `core` profile                    | `docker compose --profile core config` lists the `caddy` service.                                                   |

## Out of scope (per ticket)

- Production ACME / Let's Encrypt automation (deferred — global `email`
  is configured but no public site is wired yet).
- Per-tenant white-label custom domains (F7.6 — Phase 10+).
- Upstreams that don't exist on `main` yet (web/api/share) — those land in
  T-015, T-016, T-100; until then the route returns 502 by design.
