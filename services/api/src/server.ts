/**
 * services/api — buildServer() factory (T-015).
 *
 * Constructs the Fastify instance with logger, error handler, auth, db,
 * @fastify/swagger, and the four T-015 routes. Exported as a function
 * so unit tests can spin up the server with custom plugins or skip the
 * DB plugin entirely (and instead seed `app.db` directly).
 *
 * Architecture references:
 *   - arch §3.10 — Fastify gateway.
 *
 * Plugin order matters:
 *   1. logger options pass into Fastify() constructor (cannot be added
 *      later — Fastify locks the logger at construction time).
 *   2. errorPlugin first so subsequent plugin errors are formatted.
 *   3. @fastify/sensible (for `httpErrors.unauthorized()` etc).
 *   4. @fastify/swagger so OpenAPI is served alongside the routes.
 *   5. authPlugin (depends on db for upsertUserByEmail).
 *   6. dbPlugin (registers `app.db` decorator and the close hook).
 *   7. routes.
 *
 * The `register` order between auth and db doesn't matter for the
 * current code (auth imports the db helpers directly rather than going
 * through the decorator) but keeping db registered last among
 * infrastructure plugins ensures `onClose` runs first on shutdown.
 */
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import fastifySensible from "@fastify/sensible";
import fastifySwagger from "@fastify/swagger";
import { buildLoggerOptions } from "./plugins/logger.js";
import errorPlugin from "./plugins/error.js";
import authPlugin from "./plugins/auth.js";
import dbPlugin from "./plugins/db.js";
import healthRoutes from "./routes/health.js";
import meRoutes from "./routes/me.js";
import workspacesRoutes from "./routes/workspaces.js";
import { getOpenApiDocument } from "./openapi.js";

export interface BuildServerOptions {
  /** Override Fastify constructor options (logger, requestIdHeader, …). */
  serverOptions?: FastifyServerOptions;
}

export async function buildServer(opts: BuildServerOptions = {}): Promise<FastifyInstance> {
  const { serverOptions } = opts;

  const loggerOpts = buildLoggerOptions();
  const constructorOpts: FastifyServerOptions = {
    // Honour proxy-injected request ids (Caddy adds X-Request-Id).
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "reqId",
    ...(loggerOpts ? { logger: loggerOpts } : {}),
    ...(serverOptions ?? {}),
  };

  const app: FastifyInstance = Fastify(constructorOpts);

  await app.register(errorPlugin);
  await app.register(fastifySensible);

  // Serve the OpenAPI spec for downstream tooling (SDK generation runs
  // off the static file, but a live `/openapi.json` is useful for the
  // Scalar docs UI that future tickets will mount). The `as never` cast
  // bridges our internal OpenApiDocument type (loaded by @vidgen/openapi)
  // to swagger-fastify's stricter OpenAPIV3 typing — the runtime shape
  // matches; only the TS surface is fussier.
  await app.register(fastifySwagger, {
    mode: "static",
    specification: { document: getOpenApiDocument() as never },
  });

  await app.register(dbPlugin);
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(meRoutes);
  await app.register(workspacesRoutes);

  return app;
}
