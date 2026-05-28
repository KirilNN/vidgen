/**
 * services/api — repository functions for the T-015 routes.
 *
 * Wraps the raw Drizzle queries used by `/me` and `/workspaces` in
 * single-purpose async functions. Two reasons:
 *
 *   1. Each function takes responsibility for setting the correct GUC
 *      via `withUserContext` so the route handler never has to think
 *      about RLS context.
 *   2. Routes become trivial to unit-test by `vi.mock`-ing this module.
 *      The alternative (mocking the entire Drizzle chain) is painful and
 *      brittle.
 *
 * Architecture references:
 *   - arch §11 — every read/write keys off the GUC set by the helpers
 *                here. Direct SQL goes through migration 0002's
 *                self_bootstrap_read RLS policy.
 */
import { eq, inArray } from "drizzle-orm";
import { withUserContext } from "./client.js";
import { tenantMembers, tenants, users } from "./schema.js";

export interface UserRecord {
  userId: string;
  email: string;
  displayName: string | null;
}

export interface MembershipRecord {
  workspaceId: string;
  role: "owner" | "editor" | "viewer";
}

export interface WorkspaceRecord {
  workspaceId: string;
  name: string;
  region: string;
  tier: string;
  createdAt: Date;
}

/** Read the caller's own user row inside an `app.user_id`-bound transaction. */
export async function findUserById(userId: string): Promise<UserRecord | null> {
  return withUserContext(userId, async (tx) => {
    const rows = await tx
      .select({ userId: users.userId, email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  });
}

/** List the caller's memberships. Bootstrap-context read; no workspace bound. */
export async function listMembershipsForUser(userId: string): Promise<MembershipRecord[]> {
  return withUserContext(userId, async (tx) => {
    const rows = await tx
      .select({ workspaceId: tenantMembers.workspaceId, role: tenantMembers.role })
      .from(tenantMembers)
      .where(eq(tenantMembers.userId, userId));
    return rows.map((r) => ({
      workspaceId: r.workspaceId,
      role: r.role as MembershipRecord["role"],
    }));
  });
}

/** Read the workspace rows that match a list of ids, still in bootstrap context. */
export async function listWorkspacesByIds(
  userId: string,
  workspaceIds: string[],
): Promise<WorkspaceRecord[]> {
  if (workspaceIds.length === 0) return [];
  return withUserContext(userId, async (tx) => {
    const rows = await tx
      .select({
        workspaceId: tenants.workspaceId,
        name: tenants.name,
        region: tenants.region,
        tier: tenants.tier,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(inArray(tenants.workspaceId, workspaceIds));
    return rows;
  });
}

/** Convenience for /me + GET /workspaces: returns memberships joined with tenant data. */
export async function listWorkspacesForUser(
  userId: string,
): Promise<Array<WorkspaceRecord & { role: MembershipRecord["role"] }>> {
  const memberships = await listMembershipsForUser(userId);
  const workspaces = await listWorkspacesByIds(
    userId,
    memberships.map((m) => m.workspaceId),
  );
  const byId = new Map(workspaces.map((w) => [w.workspaceId, w]));
  return memberships
    .map((m) => {
      const t = byId.get(m.workspaceId);
      if (!t) return null;
      return { ...t, role: m.role };
    })
    .filter((w): w is WorkspaceRecord & { role: MembershipRecord["role"] } => w !== null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** Single-workspace read used after POST /workspaces returns. */
export async function findWorkspaceById(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRecord | null> {
  return withUserContext(userId, async (tx) => {
    const rows = await tx
      .select({
        workspaceId: tenants.workspaceId,
        name: tenants.name,
        region: tenants.region,
        tier: tenants.tier,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(eq(tenants.workspaceId, workspaceId))
      .limit(1);
    return rows[0] ?? null;
  });
}
