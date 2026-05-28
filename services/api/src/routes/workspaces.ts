/**
 * services/api — /workspaces routes (T-015).
 *
 * GET  /workspaces — list workspaces the caller belongs to.
 * POST /workspaces — create a new workspace with the caller as owner.
 *
 * Architecture references:
 *   - arch §11 — multi-tenant isolation; every workspace row carries
 *                workspace_id and RLS enforces visibility.
 *   - arch §6  — POST is synchronous because the only writes are two
 *                rows in Postgres; nothing here is long-running.
 *
 * Tenancy:
 *   - GET goes through the bootstrap-context repo helpers (see
 *     db/repo.ts), which run inside `withUserContext` so RLS lets the
 *     caller see their own memberships + the matching tenants only.
 *   - POST calls `createWorkspaceForUser`, a SECURITY DEFINER function
 *     that refuses to create a workspace for any user other than
 *     `current_user_id()`, so even a bug that forwarded a different
 *     user id would fail closed.
 *
 * Workspace_id generation:
 *   - Server-generated UUID (v4 via crypto.randomUUID). Clients never
 *     pick the id, so accidental collisions are impossible.
 */
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { createWorkspaceForUser } from "../db/client.js";
import { findWorkspaceById, listWorkspacesForUser } from "../db/repo.js";

const WORKSPACE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["workspaceId", "name", "region", "tier", "role", "createdAt"],
  properties: {
    workspaceId: { type: "string" },
    name: { type: "string" },
    region: { type: "string" },
    tier: { type: "string" },
    role: { type: "string", enum: ["owner", "editor", "viewer"] },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

export default async function workspacesRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/workspaces",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["workspaces"],
            properties: {
              workspaces: { type: "array", items: WORKSPACE_SCHEMA },
            },
          },
        },
      },
    },
    async (request) => {
      const caller = request.user!;
      const rows = await listWorkspacesForUser(caller.user_id);
      return {
        workspaces: rows.map((w) => ({
          workspaceId: w.workspaceId,
          name: w.name,
          region: w.region,
          tier: w.tier,
          role: w.role,
          createdAt: w.createdAt.toISOString(),
        })),
      };
    },
  );

  app.post(
    "/workspaces",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ BearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 200 },
          },
        },
        response: {
          201: WORKSPACE_SCHEMA,
        },
      },
    },
    async (request, reply) => {
      const caller = request.user!;
      const body = request.body as { name: string };
      const workspaceId = randomUUID();

      await createWorkspaceForUser(workspaceId, body.name.trim(), caller.user_id);
      const row = await findWorkspaceById(caller.user_id, workspaceId);
      if (!row) {
        // Should be impossible — the create call just succeeded and we read
        // back via the same bootstrap-context helper. Surface as 500.
        throw new Error("workspace created but invisible to caller — RLS misconfiguration?");
      }
      reply.code(201);
      return {
        workspaceId: row.workspaceId,
        name: row.name,
        region: row.region,
        tier: row.tier,
        role: "owner" as const,
        createdAt: row.createdAt.toISOString(),
      };
    },
  );
}
