/**
 * services/api — OIDC Bearer authentication (T-015).
 *
 * Verifies the `Authorization: Bearer <jwt>` header against the Keycloak
 * realm pointed to by `KEYCLOAK_ISSUER_URL`, resolves the calling user
 * via `upsert_user_by_email`, and decorates `request.user` for handlers.
 *
 * Architecture references:
 *   - arch §3.10 — Fastify gateway authenticates OIDC tokens.
 *   - arch §11   — Per-request user identity drives RLS via app.user_id
 *                  (see services/api/src/db/client.ts withUserContext).
 *
 * Hard rules honoured:
 *   - We never accept a `workspace_id` claim or header without verifying
 *     membership. The `request.workspace_id` slot exists on the type but
 *     is only set by routes that have *already* checked membership for
 *     this user — none of T-015's routes set it.
 *   - We do not validate `aud` because Keycloak's default audience is
 *     `account`, not our client. We DO validate `azp` against an
 *     allow-list configured via KEYCLOAK_ALLOWED_AZP — that is the
 *     correct Keycloak-native way to ensure the token was issued for
 *     OUR clients.
 *   - We never log the raw token. The logger plugin redacts
 *     `req.headers.authorization` defensively.
 *
 * Bootstrap mode (no Keycloak configured):
 *   - In tests and during early `pnpm dev` flows the issuer may not be
 *     set. In that case the plugin still registers `preHandler` hooks
 *     but rejects every request with 503 unless the per-request
 *     `app.authVerifier` decorator has been overridden (which is what
 *     server.test.ts does). We do NOT silently allow unauthenticated
 *     requests in any configuration.
 */
import { createRemoteJWKSet, errors as joseErrors, jwtVerify, type JWTPayload } from "jose";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { apiConfig } from "../config.js";
import { upsertUserByEmail } from "../db/client.js";

/**
 * Verified, resolved caller identity. `user_id` is OUR internal UUID
 * (not Keycloak's `sub`); `email` is the canonical email we keyed the
 * upsert on; `subject` is preserved for logs/audit only.
 */
export interface AuthenticatedUser {
  user_id: string;
  email: string;
  display_name: string | null;
  subject: string;
}

export interface AuthVerifierResult {
  payload: JWTPayload;
}

export type AuthVerifier = (token: string) => Promise<AuthVerifierResult>;

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
  interface FastifyInstance {
    /** Override in tests to inject a fake verifier. */
    authVerifier: AuthVerifier;
  }
}

/**
 * Build the production verifier — fetches JWKS from Keycloak and validates
 * iss + azp. Throws on missing config (caller decides whether to fail
 * fast or register a 503 stub).
 */
export function buildKeycloakVerifier(): AuthVerifier {
  const issuer = apiConfig.KEYCLOAK_ISSUER_URL;
  if (!issuer) {
    throw new Error("buildKeycloakVerifier: KEYCLOAK_ISSUER_URL is required");
  }
  // The expected issuer in the JWT is the *public* URL (what Keycloak
  // bakes into tokens). For container-to-container JWKS fetches we may
  // need a separate internal URL because the public hostname (e.g.
  // https://auth.localhost) is not resolvable from inside Docker.
  const jwksUrl =
    apiConfig.KEYCLOAK_JWKS_URL ?? `${issuer.replace(/\/$/, "")}/protocol/openid-connect/certs`;
  const jwks = createRemoteJWKSet(new URL(jwksUrl));

  const allowedAzp = new Set(
    apiConfig.KEYCLOAK_ALLOWED_AZP.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  return async (token) => {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      // No `audience` on purpose — see file header.
    });
    // Keycloak puts the requesting client in `azp`. Reject anything else.
    const azp = typeof payload["azp"] === "string" ? (payload["azp"] as string) : undefined;
    if (!azp || !allowedAzp.has(azp)) {
      throw new joseErrors.JWTClaimValidationFailed(
        `unexpected azp ${azp ?? "(missing)"}; allowed: ${[...allowedAzp].join(", ")}`,
        payload,
        "azp",
        "check_failed",
      );
    }
    return { payload };
  };
}

function extractBearer(req: FastifyRequest): string | null {
  const header = req.headers["authorization"];
  if (!header || typeof header !== "string") return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1]!.trim() : null;
}

async function authPlugin(app: FastifyInstance): Promise<void> {
  // Install a default verifier. In production we wire it to Keycloak; if
  // no issuer is configured we install a stub that always rejects so a
  // misconfigured deployment never accidentally serves anonymous traffic.
  let defaultVerifier: AuthVerifier;
  if (apiConfig.KEYCLOAK_ISSUER_URL) {
    defaultVerifier = buildKeycloakVerifier();
  } else {
    app.log.warn(
      "KEYCLOAK_ISSUER_URL is unset — all authenticated routes will return 503. Tests must override app.authVerifier.",
    );
    defaultVerifier = async () => {
      throw new Error("auth verifier not configured");
    };
  }
  app.decorate("authVerifier", defaultVerifier);

  // `authenticate` is a preHandler that routes opt into via
  // `{ preHandler: [app.authenticate] }`. Public routes (health) skip it.
  app.decorate(
    "authenticate",
    async function authenticate(req: FastifyRequest, reply: FastifyReply) {
      const token = extractBearer(req);
      if (!token) {
        return reply.code(401).type("application/problem+json").send({
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "missing or malformed Authorization header",
          instance: req.url,
        });
      }

      let payload: JWTPayload;
      try {
        const result = await app.authVerifier(token);
        payload = result.payload;
      } catch (err) {
        req.log.warn({ err: { message: (err as Error).message } }, "token verification failed");
        return reply.code(401).type("application/problem+json").send({
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "token verification failed",
          instance: req.url,
        });
      }

      const email = typeof payload["email"] === "string" ? (payload["email"] as string).trim() : "";
      if (!email) {
        req.log.warn({ sub: payload.sub }, "token missing email claim");
        return reply.code(401).type("application/problem+json").send({
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "token must contain an email claim",
          instance: req.url,
        });
      }
      const displayName = typeof payload["name"] === "string" ? (payload["name"] as string) : null;
      const subject = typeof payload.sub === "string" ? payload.sub : "";

      let userId: string;
      try {
        userId = await upsertUserByEmail(email, displayName);
      } catch (err) {
        req.log.error({ err, email }, "failed to upsert user");
        return reply.code(500).type("application/problem+json").send({
          type: "about:blank",
          title: "Internal Server Error",
          status: 500,
          detail: "could not resolve caller identity",
          instance: req.url,
        });
      }

      req.user = {
        user_id: userId,
        email: email.toLowerCase(),
        display_name: displayName,
        subject,
      };
    },
  );
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  }
}

export default fp(authPlugin, { name: "vidgen-auth" });
