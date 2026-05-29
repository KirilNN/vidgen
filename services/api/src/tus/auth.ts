/**
 * services/api/src/tus — internal-only HMAC authenticator (T-030/31).
 *
 * Used by:
 *   - `/internal/tus/pre-create` + `/internal/tus/post-finish` — the
 *     two webhooks tusd (sidecar in compose `core` profile) calls
 *     into the API.
 *   - `/internal/assets`, `/internal/renditions` — worker → API
 *     metadata writes from `services/worker/light/activities/`.
 *
 * Why a separate auth scheme from the public OIDC bearer:
 *   - tusd and the worker are inside the compose network; they can't
 *     do Keycloak roundtrips on every request and don't have user
 *     identities.
 *   - We still want a positive auth check (defence in depth — a
 *     misconfigured Caddy rule must NOT let public traffic hit these
 *     endpoints). A static shared token on the loopback network is
 *     the simplest credential that satisfies that.
 *
 * The token defaults to `APP_SECRET` so the dev flow is zero-config.
 * Operators who want strict separation (one secret per surface) set
 * `API_INTERNAL_TOKEN` explicitly.
 *
 * Constant-time compare: even though our header is short and the
 * attacker is in-network, a timing-safe compare is one line of code
 * and removes one class of footgun. Use Node's `timingSafeEqual`.
 *
 * Architecture refs:
 *   - §11 — multi-tenant guard ON TOP of this; the route handler
 *           still validates the workspace_id in the body.
 *   - agent-runbook hard rule: never accept workspace_id without
 *           proof of access. This auth proves "the caller is on the
 *           internal network"; the handler proves "the workspace_id
 *           in the body is the one we just authenticated for".
 */
import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { apiConfig } from "../config.js";

/** Header tusd is configured to forward; matches the compose env. */
export const INTERNAL_TOKEN_HEADER = "x-vidgen-internal-token";

/** Resolve the token the API expects on internal calls. */
export function expectedInternalToken(): string {
  return apiConfig.API_INTERNAL_TOKEN ?? apiConfig.APP_SECRET;
}

function safeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Pre-handler that verifies the internal token. Mounted by the
 * internal routes (`/internal/*`). Returns the standard problem+json
 * envelope on failure so the calling worker/tusd sees a useful
 * error.
 */
export async function requireInternalToken(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const expected = expectedInternalToken();
  if (!expected) {
    reply.code(503).type("application/problem+json").send({
      type: "about:blank",
      title: "Service Unavailable",
      status: 503,
      detail: "internal token not configured",
      instance: req.url,
    });
    return;
  }
  const headerVal = req.headers[INTERNAL_TOKEN_HEADER];
  const provided = Array.isArray(headerVal) ? headerVal[0] : headerVal;
  if (!provided || typeof provided !== "string" || !safeEquals(provided, expected)) {
    reply.code(401).type("application/problem+json").send({
      type: "about:blank",
      title: "Unauthorized",
      status: 401,
      detail: "missing or invalid internal token",
      instance: req.url,
    });
    return;
  }
}
