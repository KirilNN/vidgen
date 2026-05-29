# services/api/src/tus — tus + worker→API internal routes

This plugin owns four endpoints that intentionally live **outside** the
public OpenAPI surface:

| Method | Path                        | Auth                                             | Caller              | Ticket        |
| ------ | --------------------------- | ------------------------------------------------ | ------------------- | ------------- |
| POST   | `/internal/tus/pre-create`  | tus `Upload-Metadata.authToken` (Keycloak JWT)   | `tusd` sidecar      | T-030         |
| POST   | `/internal/tus/post-finish` | tus `Upload-Metadata.userId` (set by pre-create) | `tusd` sidecar      | T-030 / T-031 |
| POST   | `/internal/assets`          | `x-vidgen-internal-token` HMAC                   | worker (light pool) | T-031         |
| POST   | `/internal/renditions`      | `x-vidgen-internal-token` HMAC                   | worker (light pool) | T-031         |

These routes are deliberately _not_ in `packages/openapi/openapi.yaml`:

- Different auth (HMAC + tusd-attached JWT vs the public OIDC bearer).
- Different SLA — internal endpoints are not part of any external
  contract; they can change shape whenever the worker and API ship
  together.
- They have no SDK consumer.

The Caddy gateway must NOT proxy `/internal/*` from the public Internet
— `infra/compose/caddy/Caddyfile` confines them to the compose network.

---

## `/internal/tus/pre-create` (T-030)

Called by tusd **before** it accepts a new upload. The browser SPA
hands tusd a metadata bag like:

```
workspaceId   = ws_acme
authToken     = <Keycloak access_token>
filename      = lecture-2024-04-01.mp4
filetype      = video/mp4
```

The hook:

1. Validates the metadata shape (regex-checked `workspaceId`, known mime).
2. Verifies the JWT through `app.authVerifier` (same code path public
   `/me` uses).
3. Resolves the caller's `user_id` via `upsertUserByEmail`.
4. Confirms the caller is a member of the claimed workspace via
   `listMembershipsForUser`.
5. On success, echoes a safe metadata subset back (`workspaceId`,
   `userId`, `original_filename`, `mime`) — the JWT is dropped so it
   never persists on the upload object.

Failures return RFC 7807 problem+json so tusd can surface a useful
error to the client.

## `/internal/tus/post-finish` (T-030 / T-031)

Called by tusd **after** the final PATCH completes. The hook:

1. Reads the metadata pre-create stamped on the upload.
2. Mints a fresh `asset_id` (UUID v4).
3. Starts `IngestAssetWorkflow` on the `INGEST_TASK_QUEUE` (default
   `light`) with workflow id `ingest-<asset_id>`.

The `ingest-<asset_id>` naming makes Temporal collapse double-fires
onto a single run; sha256-based dedup happens inside the workflow's
`finalizeUpload` activity once we've actually read the bytes.

## `/internal/assets` + `/internal/renditions` (T-031)

The worker can't reach Postgres directly (architecture: storage is an
adapter, the API owns metadata writes). The light-pool activities
`finalize-upload` and `create-rendition` POST here.

Auth: the `x-vidgen-internal-token` header carries a shared HMAC token.
The value is `API_INTERNAL_TOKEN` (defaults to `APP_SECRET` so dev is
zero-config). Compared in constant time via `crypto.timingSafeEqual`.

Body shapes are validated:

- `workspace_id` must match `^[A-Za-z0-9_\-.]+$`.
- `asset_id`, `created_by` (if set) must be UUIDs.
- `sha256` must be 64 lowercase hex chars.
- `mime`, `source_uri`, `kind`, `uri` must be present.

Returns `201 Created` on insert, `200 OK` with `{deduped: true}` when
the asset row already exists (sha256 collision in the same workspace).

---

## Why a separate auth scheme for `/internal/*`

The runbook hard rule is "workspace_id on every new row/bucket
prefix/queue task." That rule is enforced by the **handler body** (it
demands `workspace_id` in every request) and by the **repo layer**
(`withWorkspace` opens an RLS transaction). The HMAC token is _not_ a
substitute for that — it's the defence-in-depth layer that proves the
caller is on the compose network so a misconfigured public ingress
can't accidentally expose write endpoints.
