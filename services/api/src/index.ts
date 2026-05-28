/**
 * services/api — entry point (T-015).
 *
 * Builds the Fastify server and listens on `API_PORT`. Bound to
 * `0.0.0.0` so the container is reachable from Caddy and from the host;
 * outside the container the default API_PORT is 3001 and Caddy proxies
 * api.localhost → this process.
 *
 * Architecture references:
 *   - arch §3.10 — Fastify gateway.
 *   - decisions.md ADR-0001 — Caddy fronts the API on localhost.
 */
import { apiConfig } from "./config.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  const app = await buildServer();
  const close = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, "shutting down");
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "graceful shutdown failed");
      process.exit(1);
    }
  };
  process.once("SIGINT", () => void close("SIGINT"));
  process.once("SIGTERM", () => void close("SIGTERM"));

  await app.listen({ host: "0.0.0.0", port: apiConfig.API_PORT });
}

main().catch((err) => {
  // The Fastify logger may not be available yet; print the raw error.
  console.error("[services/api] fatal:", err);
  process.exit(1);
});
