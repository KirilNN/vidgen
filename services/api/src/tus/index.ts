/**
 * services/api/src/tus — Fastify plugin: tus hooks + internal write
 * surface (T-030/31).
 *
 * Mounts four endpoints under `/internal/`:
 *
 *   POST /internal/tus/pre-create   — tusd hook, JWT-authorised
 *   POST /internal/tus/post-finish  — tusd hook, JWT-authorised
 *   POST /internal/assets           — worker → API, HMAC token
 *   POST /internal/renditions       — worker → API, HMAC token
 *
 * Note: the tus hooks DO NOT use the HMAC token because the user's
 * Keycloak JWT (carried in Upload-Metadata) is what authorises the
 * upload. tusd forwards headers via `-hooks-http-forward-headers`,
 * but we don't need any of them — the metadata path is sufficient.
 *
 * The two worker→API endpoints DO use the HMAC token because the
 * worker has no user context (it's a service). The token is a small
 * defence-in-depth layer on top of compose network isolation.
 *
 * Architecture refs:
 *   - §3.1, §3.10 — gateway authorises uploads.
 *   - §6.1, §6.2 — worker → API metadata writes go through narrow
 *     internal endpoints rather than direct DB.
 *   - §11 — RLS enforced by `withWorkspace` inside the repos.
 */
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { registerTusPreCreate } from "./pre-create.js";
import { registerTusPostFinish } from "./post-finish.js";
import { registerInternalAssetRoutes } from "./internal-routes.js";

async function tusPlugin(app: FastifyInstance): Promise<void> {
  registerTusPreCreate(app);
  registerTusPostFinish(app);
  registerInternalAssetRoutes(app);
}

export default fp(tusPlugin, {
  name: "vidgen-tus",
  dependencies: ["vidgen-db", "vidgen-auth"],
});
