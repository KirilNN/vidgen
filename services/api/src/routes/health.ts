/**
 * services/api — GET /health (T-015).
 *
 * Unauthenticated liveness probe. Returns the API process status, the
 * package version, and the current server timestamp. Public on purpose:
 * load balancers and uptime monitors must be able to call it without
 * carrying a token.
 *
 * Architecture references:
 *   - OpenAPI §paths./health — wire contract.
 *
 * Notes:
 *   - The version is read once at module load — it cannot change for
 *     the lifetime of the process.
 *   - We deliberately do NOT touch Postgres here. A "deep health" probe
 *     belongs at `/ready`, which a later ticket will add. Mixing the
 *     two would couple every uptime ping to a DB round-trip.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { FastifyInstance } from "fastify";

const here = dirname(fileURLToPath(import.meta.url));
// services/api/src/routes/health.ts → services/api/package.json
const PKG_VERSION = (() => {
  try {
    const raw = readFileSync(join(here, "..", "..", "package.json"), "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

export default async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["ok", "version", "ts"],
            properties: {
              ok: { type: "boolean" },
              version: { type: "string" },
              ts: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    async () => {
      return { ok: true, version: PKG_VERSION, ts: new Date().toISOString() };
    },
  );
}
