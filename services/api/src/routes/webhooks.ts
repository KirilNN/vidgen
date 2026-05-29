/**
 * services/api/routes/webhooks — webhook registration REST (T-023).
 *
 * REST shape (workspace-scoped, like the rest of T-015's surface):
 *
 *   POST   /workspaces/:workspaceId/webhooks       register
 *   GET    /workspaces/:workspaceId/webhooks       list
 *   DELETE /workspaces/:workspaceId/webhooks/:id   remove
 *
 * Authorization: every route requires a valid Bearer token (set by the
 * auth plugin) AND a workspace-membership check — the caller must
 * appear in `tenant_members` for the path's `workspaceId`. We do NOT
 * accept a workspace from a header or claim without that check (arch
 * §11, agent-runbook hard rules).
 *
 * Secret handling:
 *   - POST returns the plaintext `secret` exactly once. It is encrypted
 *     at rest via `notifier/crypto.ts` and never returned again.
 *   - GET / DELETE never expose the secret field.
 *
 * Subscription validation:
 *   - The `events` array must contain at least one known `EventType`.
 *     Unknown event names are rejected (400) so a typo doesn't silently
 *     create a webhook that never fires.
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { ALL_EVENT_TYPES } from "@vidgen/events";
import { apiConfig } from "../config.js";
import { listMembershipsForUser } from "../db/repo.js";
import {
  createWebhook,
  deleteWebhook,
  listWebhooks,
  type WebhookRow,
} from "../db/webhooks-repo.js";
import { encryptSecret, generateWebhookSecret, resolveEncryptionKey } from "../notifier/crypto.js";

const WORKSPACE_ID_RE = /^[A-Za-z0-9_\-.]+$/;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const WEBHOOK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "workspaceId", "url", "events", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    workspaceId: { type: "string" },
    url: { type: "string", format: "uri" },
    events: { type: "array", items: { type: "string" } },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

const REGISTER_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "workspaceId", "url", "events", "createdAt", "secret"],
  properties: {
    id: { type: "string", format: "uuid" },
    workspaceId: { type: "string" },
    url: { type: "string", format: "uri" },
    events: { type: "array", items: { type: "string" } },
    createdAt: { type: "string", format: "date-time" },
    secret: { type: "string", description: "Plaintext HMAC secret. Returned once; store it now." },
  },
} as const;

function toPublic(row: WebhookRow): Record<string, unknown> {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    url: row.url,
    events: row.events,
    createdAt: row.createdAt.toISOString(),
  };
}

export default async function webhooksRoutes(app: FastifyInstance): Promise<void> {
  // Resolve the encryption key at boot so misconfiguration fails fast
  // (rather than at the first POST).
  const encryptionKey = resolveEncryptionKey(
    apiConfig.WEBHOOK_SECRET_ENCRYPTION_KEY || undefined,
    apiConfig.APP_SECRET,
  );

  /**
   * Verify the caller belongs to the workspace. Throws via
   * `app.httpErrors` on failure (the error plugin formats those into
   * `application/problem+json`); returns `undefined` on success.
   */
  async function assertMembership(request: FastifyRequest, workspaceId: string): Promise<void> {
    if (!WORKSPACE_ID_RE.test(workspaceId)) {
      throw app.httpErrors.badRequest("malformed workspaceId");
    }
    const caller = request.user!;
    const memberships = await listMembershipsForUser(caller.user_id);
    const member = memberships.some((m) => m.workspaceId === workspaceId);
    if (!member) {
      throw app.httpErrors.forbidden("caller is not a member of this workspace");
    }
  }

  app.post(
    "/workspaces/:workspaceId/webhooks",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ BearerAuth: [] }],
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: { workspaceId: { type: "string" } },
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["url", "events"],
          properties: {
            url: { type: "string", format: "uri", maxLength: 2048 },
            events: {
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: { type: "string", enum: [...ALL_EVENT_TYPES] },
            },
          },
        },
        response: { 201: REGISTER_RESPONSE_SCHEMA },
      },
    },
    async (request, reply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      await assertMembership(request, workspaceId);
      const body = request.body as { url: string; events: string[] };
      if (!/^https?:\/\//i.test(body.url)) {
        throw app.httpErrors.badRequest("url must use http or https scheme");
      }
      const secret = generateWebhookSecret();
      const secretEnc = encryptSecret(secret, encryptionKey);
      const row = await createWebhook({
        workspaceId,
        url: body.url,
        events: body.events,
        secretEnc,
      });
      reply.code(201);
      return { ...toPublic(row), secret };
    },
  );

  app.get(
    "/workspaces/:workspaceId/webhooks",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ BearerAuth: [] }],
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: { workspaceId: { type: "string" } },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["webhooks"],
            properties: {
              webhooks: { type: "array", items: WEBHOOK_SCHEMA },
            },
          },
        },
      },
    },
    async (request) => {
      const { workspaceId } = request.params as { workspaceId: string };
      await assertMembership(request, workspaceId);
      const rows = await listWebhooks(workspaceId);
      return { webhooks: rows.map(toPublic) };
    },
  );

  app.delete(
    "/workspaces/:workspaceId/webhooks/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ BearerAuth: [] }],
        params: {
          type: "object",
          required: ["workspaceId", "id"],
          properties: {
            workspaceId: { type: "string" },
            id: { type: "string", format: "uuid" },
          },
        },
        response: { 204: { type: "null" } },
      },
    },
    async (request, reply) => {
      const { workspaceId, id } = request.params as { workspaceId: string; id: string };
      await assertMembership(request, workspaceId);
      if (!UUID_RE.test(id)) {
        throw app.httpErrors.badRequest("id must be a UUID");
      }
      const removed = await deleteWebhook(workspaceId, id);
      if (!removed) {
        throw app.httpErrors.notFound("webhook not found in this workspace");
      }
      reply.code(204);
      return null;
    },
  );
}
