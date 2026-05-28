/**
 * services/api — Drizzle DB plugin (T-015).
 *
 * Exposes the database client on the Fastify instance and ensures the
 * connection pool is closed cleanly when the server shuts down.
 *
 * Architecture references:
 *   - arch §5.1 — Postgres connection lifecycle.
 *   - arch §11  — All workspace-bound reads/writes go through
 *                 `withWorkspace`; cross-tenant bootstrap reads go through
 *                 `withUserContext`. Both live in services/api/src/db/client.ts.
 *
 * Why expose the helpers via decorators?
 *   Routes import them directly from `../db/client.js`; the decorator
 *   slot is mostly here so tests can substitute a fake DB via
 *   `__setDbForTests` plus the plugin's `onClose` hook can flush state.
 */
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { closeDb, getDb, type AppDatabase } from "../db/client.js";

declare module "fastify" {
  interface FastifyInstance {
    db: AppDatabase;
  }
}

async function dbPlugin(app: FastifyInstance): Promise<void> {
  const db = getDb();
  app.decorate("db", db);
  app.addHook("onClose", async () => {
    await closeDb();
  });
}

export default fp(dbPlugin, { name: "vidgen-db" });
