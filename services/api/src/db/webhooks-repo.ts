/**
 * services/api/db/webhooks-repo — webhooks table CRUD (T-023).
 *
 * Every function runs through `withWorkspace` so RLS is enforced —
 * the policy installed by `migrations/0001_rls_policies.sql` keys off
 * `app.workspace_id` to filter rows. A handler that forgets to set
 * the workspace context will simply see zero rows; we do not bypass
 * RLS here.
 *
 * Architecture: §3.8 F8.9 (subscriptions), §11 (multi-tenant rule).
 */
import { and, eq, sql } from "drizzle-orm";
import { withWorkspace } from "./client.js";
import { webhooks } from "./schema.js";

export interface WebhookRow {
  id: string;
  workspaceId: string;
  url: string;
  events: string[];
  /** Encrypted envelope from notifier/crypto. NEVER returned to API clients. */
  secretEnc: string;
  createdAt: Date;
}

export interface CreateWebhookInput {
  workspaceId: string;
  url: string;
  events: string[];
  /** Encrypted via {@link encryptSecret} BEFORE calling. */
  secretEnc: string;
}

/** Insert a new subscription. Returns the persisted row. */
export async function createWebhook(input: CreateWebhookInput): Promise<WebhookRow> {
  return withWorkspace(input.workspaceId, async (tx) => {
    const rows = await tx
      .insert(webhooks)
      .values({
        workspaceId: input.workspaceId,
        url: input.url,
        events: input.events,
        secretEnc: input.secretEnc,
      })
      .returning();
    if (!rows[0]) throw new Error("createWebhook: insert returned no rows");
    return mapRow(rows[0]);
  });
}

/** List every webhook in the workspace, newest first. */
export async function listWebhooks(workspaceId: string): Promise<WebhookRow[]> {
  return withWorkspace(workspaceId, async (tx) => {
    const rows = await tx
      .select()
      .from(webhooks)
      .where(eq(webhooks.workspaceId, workspaceId))
      .orderBy(sql`${webhooks.createdAt} desc`);
    return rows.map(mapRow);
  });
}

/** Delete a single webhook; returns true if a row was removed. */
export async function deleteWebhook(workspaceId: string, id: string): Promise<boolean> {
  return withWorkspace(workspaceId, async (tx) => {
    const rows = await tx
      .delete(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.workspaceId, workspaceId)))
      .returning({ id: webhooks.id });
    return rows.length > 0;
  });
}

/**
 * Fan-out lookup: every webhook in the workspace whose `events` array
 * contains the given subject. Used by `notifier/fanout.ts` on each
 * incoming event.
 *
 * Note: PostgreSQL `text[] && text[]` is the array-overlap operator,
 * which uses the GIN index more efficiently than `ANY (...)`. We pass
 * a single-element array so the index can match.
 */
export async function findWebhooksForSubject(
  workspaceId: string,
  subject: string,
): Promise<WebhookRow[]> {
  return withWorkspace(workspaceId, async (tx) => {
    const rows = await tx
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.workspaceId, workspaceId),
          sql`${webhooks.events} && ARRAY[${subject}]::text[]`,
        ),
      );
    return rows.map(mapRow);
  });
}

function mapRow(r: typeof webhooks.$inferSelect): WebhookRow {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    url: r.url,
    events: r.events,
    secretEnc: r.secretEnc,
    createdAt: r.createdAt,
  };
}
