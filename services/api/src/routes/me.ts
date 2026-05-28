/**
 * services/api — GET /me (T-015).
 *
 * Returns the calling user record + every workspace they're a member of.
 * Authenticated route. The auth plugin has already upserted the user by
 * email and stored the resolved record on `request.user`.
 *
 * Architecture references:
 *   - arch §11 — Cross-tenant bootstrap reads via app.user_id GUC.
 *   - OpenAPI §schemas.Me — response shape.
 *
 * RLS: all reads go through `db/repo.ts` helpers, which run inside
 * `withUserContext(user_id, ...)` so the `self_bootstrap_read` policies
 * from migration 0002 apply. No `current_workspace_id()` is set, so
 * workspace-bound reads remain locked.
 */
import type { FastifyInstance } from "fastify";
import { findUserById, listWorkspacesForUser } from "../db/repo.js";

export default async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/me",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["user", "workspaces"],
            properties: {
              user: {
                type: "object",
                additionalProperties: false,
                required: ["userId", "email"],
                properties: {
                  userId: { type: "string", format: "uuid" },
                  email: { type: "string", format: "email" },
                  displayName: { type: "string", nullable: true },
                },
              },
              workspaces: {
                type: "array",
                items: {
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
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const caller = request.user!;
      const [userRow, workspaces] = await Promise.all([
        findUserById(caller.user_id),
        listWorkspacesForUser(caller.user_id),
      ]);
      return {
        user: {
          userId: userRow?.userId ?? caller.user_id,
          email: userRow?.email ?? caller.email,
          displayName: userRow?.displayName ?? caller.display_name,
        },
        workspaces: workspaces.map((w) => ({
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
}
