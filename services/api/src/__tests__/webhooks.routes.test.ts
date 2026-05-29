/**
 * services/api — /workspaces/:id/webhooks route tests (T-023).
 *
 * Uses the same `vi.mock('../db/client.js')` + `vi.mock('../db/repo.ts')`
 * pattern as server.test.ts. Adds a mock for `../db/webhooks-repo.ts`
 * that backs by an in-memory map keyed by workspace_id (so multi-tenant
 * isolation is verifiable at the API surface).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env["NODE_ENV"] = "test";
process.env["CONFIG_SKIP_DOTENV"] = "1";
process.env["APP_SECRET"] = "x".repeat(32);
process.env["POSTGRES_HOST"] = "localhost";
process.env["POSTGRES_PORT"] = "5432";
process.env["POSTGRES_USER"] = "app";
process.env["POSTGRES_PASSWORD"] = "dev-only";
process.env["POSTGRES_DB"] = "vidgen";
// Force the notifier plugin onto its in-memory bus path even when the
// shell happens to export NATS_URL (the smoke script sources
// infra/compose/.env which sets it).
delete process.env["NATS_URL"];
delete process.env["NOVU_API_URL"];
delete process.env["NOVU_API_KEY"];

interface FakeUser {
  userId: string;
  email: string;
  displayName: string | null;
}
interface FakeMembership {
  workspaceId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
}
interface FakeWorkspace {
  workspaceId: string;
  name: string;
  region: string;
  tier: string;
  createdAt: Date;
}
interface FakeWebhook {
  id: string;
  workspaceId: string;
  url: string;
  events: string[];
  secretEnc: string;
  createdAt: Date;
}

const store = {
  users: new Map<string, FakeUser>(),
  workspaces: new Map<string, FakeWorkspace>(),
  members: [] as FakeMembership[],
  webhooks: [] as FakeWebhook[],
  webhookCounter: 0,
  reset(): void {
    this.users.clear();
    this.workspaces.clear();
    this.members.length = 0;
    this.webhooks.length = 0;
    this.webhookCounter = 0;
  },
};

const ALICE_ID = "11111111-1111-4111-8111-111111111111";
const BOB_ID = "22222222-2222-4222-8222-222222222222";
const ID_BY_EMAIL: Record<string, string> = {
  "alice@example.com": ALICE_ID,
  "bob@example.com": BOB_ID,
};

vi.mock("../db/client.js", () => ({
  getDb: () => ({}) as unknown,
  closeDb: async () => {},
  withWorkspace: async <T>(_id: string, fn: (tx: unknown) => Promise<T>) => fn({}),
  withUserContext: async <T>(_id: string, fn: (tx: unknown) => Promise<T>) => fn({}),
  __setDbForTests: () => {},
  upsertUserByEmail: async (email: string, displayName?: string | null) => {
    const key = email.trim().toLowerCase();
    const existing = store.users.get(key);
    if (existing) {
      if (displayName) existing.displayName = displayName;
      return existing.userId;
    }
    const userId =
      ID_BY_EMAIL[key] ??
      `00000000-0000-4000-8000-${String(store.users.size + 1).padStart(12, "0")}`;
    store.users.set(key, { userId, email: key, displayName: displayName ?? null });
    return userId;
  },
  createWorkspaceForUser: async (workspaceId: string, name: string, userId: string) => {
    store.workspaces.set(workspaceId, {
      workspaceId,
      name,
      region: "local",
      tier: "free",
      createdAt: new Date(),
    });
    store.members.push({ workspaceId, userId, role: "owner" });
    return workspaceId;
  },
}));

vi.mock("../db/repo.ts", () => {
  const listMembershipsForUser = async (userId: string) =>
    store.members
      .filter((m) => m.userId === userId)
      .map((m) => ({ workspaceId: m.workspaceId, role: m.role }));
  return {
    findUserById: async (userId: string) =>
      [...store.users.values()].find((u) => u.userId === userId) ?? null,
    listMembershipsForUser,
    listWorkspacesByIds: async (_userId: string, ids: string[]) =>
      [...store.workspaces.values()].filter((w) => ids.includes(w.workspaceId)),
    listWorkspacesForUser: async (userId: string) => {
      const memberships = await listMembershipsForUser(userId);
      const ws = [...store.workspaces.values()].filter((w) =>
        memberships.some((m) => m.workspaceId === w.workspaceId),
      );
      const byId = new Map(ws.map((w) => [w.workspaceId, w]));
      return memberships
        .map((m) => {
          const t = byId.get(m.workspaceId);
          return t ? { ...t, role: m.role } : null;
        })
        .filter((w): w is NonNullable<typeof w> => w !== null);
    },
    findWorkspaceById: async (_userId: string, workspaceId: string) =>
      store.workspaces.get(workspaceId) ?? null,
  };
});

vi.mock("../db/webhooks-repo.ts", () => {
  const uuid = () => {
    store.webhookCounter++;
    const n = String(store.webhookCounter).padStart(12, "0");
    return `aaaaaaaa-aaaa-4aaa-8aaa-${n}`;
  };
  return {
    createWebhook: async (input: {
      workspaceId: string;
      url: string;
      events: string[];
      secretEnc: string;
    }) => {
      const row: FakeWebhook = {
        id: uuid(),
        workspaceId: input.workspaceId,
        url: input.url,
        events: input.events,
        secretEnc: input.secretEnc,
        createdAt: new Date(),
      };
      store.webhooks.unshift(row);
      return { ...row };
    },
    listWebhooks: async (workspaceId: string) =>
      store.webhooks.filter((w) => w.workspaceId === workspaceId).map((w) => ({ ...w })),
    deleteWebhook: async (workspaceId: string, id: string) => {
      const before = store.webhooks.length;
      store.webhooks = store.webhooks.filter(
        (w) => !(w.workspaceId === workspaceId && w.id === id),
      );
      return store.webhooks.length < before;
    },
    findWebhooksForSubject: async (workspaceId: string, subject: string) =>
      store.webhooks
        .filter((w) => w.workspaceId === workspaceId && w.events.includes(subject))
        .map((w) => ({ ...w })),
  };
});

const { buildServer } = await import("../server.js");

type FastifyApp = Awaited<ReturnType<typeof buildServer>>;

function makeVerifier(payload: Record<string, unknown>) {
  return async () => ({ payload: { iss: "test", aud: "test", ...payload } as never });
}

let app: FastifyApp;

beforeAll(async () => {
  app = await buildServer({ serverOptions: { logger: false } });
  app.authVerifier = makeVerifier({ sub: "kc-alice", email: "alice@example.com", azp: "app-web" });
});

beforeEach(() => {
  store.reset();
  app.authVerifier = makeVerifier({ sub: "kc-alice", email: "alice@example.com", azp: "app-web" });
});

afterEach(() => {
  vi.clearAllMocks();
});

async function createWorkspaceAs(name: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/workspaces",
    headers: { authorization: "Bearer fake", "content-type": "application/json" },
    payload: { name },
  });
  expect(res.statusCode).toBe(201);
  return res.json().workspaceId as string;
}

describe("POST /workspaces/:workspaceId/webhooks", () => {
  it("registers a webhook and returns a plaintext secret", async () => {
    const workspaceId = await createWorkspaceAs("Acme");
    const res = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/webhooks`,
      headers: { authorization: "Bearer fake", "content-type": "application/json" },
      payload: { url: "https://example.com/hook", events: ["asset.ingested"] },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.workspaceId).toBe(workspaceId);
    expect(body.url).toBe("https://example.com/hook");
    expect(body.events).toEqual(["asset.ingested"]);
    expect(typeof body.secret).toBe("string");
    expect(body.secret.length).toBeGreaterThan(20);
  });

  it("rejects an unknown event type with 400", async () => {
    const workspaceId = await createWorkspaceAs("Acme");
    const res = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/webhooks`,
      headers: { authorization: "Bearer fake", "content-type": "application/json" },
      payload: { url: "https://example.com/hook", events: ["asset.never"] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects an empty events array with 400", async () => {
    const workspaceId = await createWorkspaceAs("Acme");
    const res = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/webhooks`,
      headers: { authorization: "Bearer fake", "content-type": "application/json" },
      payload: { url: "https://example.com/hook", events: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects a non-http url with 400", async () => {
    const workspaceId = await createWorkspaceAs("Acme");
    const res = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/webhooks`,
      headers: { authorization: "Bearer fake", "content-type": "application/json" },
      payload: { url: "ftp://example.com/hook", events: ["asset.ingested"] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 401 without a Bearer token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/workspaces/anything/webhooks",
      headers: { "content-type": "application/json" },
      payload: { url: "https://example.com/hook", events: ["asset.ingested"] },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /workspaces/:workspaceId/webhooks", () => {
  it("never returns the plaintext secret", async () => {
    const workspaceId = await createWorkspaceAs("Acme");
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/webhooks`,
      headers: { authorization: "Bearer fake", "content-type": "application/json" },
      payload: { url: "https://example.com/hook", events: ["asset.ingested"] },
    });
    const list = await app.inject({
      method: "GET",
      url: `/workspaces/${workspaceId}/webhooks`,
      headers: { authorization: "Bearer fake" },
    });
    expect(list.statusCode).toBe(200);
    const body = list.json();
    expect(body.webhooks).toHaveLength(1);
    expect(body.webhooks[0]).not.toHaveProperty("secret");
    expect(body.webhooks[0]).not.toHaveProperty("secretEnc");
  });

  it("lists only the calling workspace's webhooks (multi-tenant)", async () => {
    // Alice creates two workspaces, each with one webhook.
    const wsAlice1 = await createWorkspaceAs("A1");
    const wsAlice2 = await createWorkspaceAs("A2");
    for (const ws of [wsAlice1, wsAlice2]) {
      await app.inject({
        method: "POST",
        url: `/workspaces/${ws}/webhooks`,
        headers: { authorization: "Bearer fake", "content-type": "application/json" },
        payload: { url: `https://example.com/${ws}`, events: ["asset.ingested"] },
      });
    }

    const list1 = await app.inject({
      method: "GET",
      url: `/workspaces/${wsAlice1}/webhooks`,
      headers: { authorization: "Bearer fake" },
    });
    expect(list1.statusCode).toBe(200);
    expect(list1.json().webhooks).toHaveLength(1);
    expect(list1.json().webhooks[0].url).toBe(`https://example.com/${wsAlice1}`);

    // Bob signs in and tries to read alice's webhooks → 403.
    app.authVerifier = makeVerifier({ sub: "kc-bob", email: "bob@example.com", azp: "app-web" });
    const forbidden = await app.inject({
      method: "GET",
      url: `/workspaces/${wsAlice1}/webhooks`,
      headers: { authorization: "Bearer bob" },
    });
    expect(forbidden.statusCode).toBe(403);
  });
});

describe("DELETE /workspaces/:workspaceId/webhooks/:id", () => {
  it("removes the webhook and returns 204", async () => {
    const workspaceId = await createWorkspaceAs("Acme");
    const create = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/webhooks`,
      headers: { authorization: "Bearer fake", "content-type": "application/json" },
      payload: { url: "https://example.com/hook", events: ["asset.ingested"] },
    });
    const id = create.json().id as string;
    const del = await app.inject({
      method: "DELETE",
      url: `/workspaces/${workspaceId}/webhooks/${id}`,
      headers: { authorization: "Bearer fake" },
    });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({
      method: "GET",
      url: `/workspaces/${workspaceId}/webhooks`,
      headers: { authorization: "Bearer fake" },
    });
    expect(list.json().webhooks).toHaveLength(0);
  });

  it("returns 404 for an unknown id", async () => {
    const workspaceId = await createWorkspaceAs("Acme");
    const del = await app.inject({
      method: "DELETE",
      url: `/workspaces/${workspaceId}/webhooks/00000000-0000-4000-8000-000000000099`,
      headers: { authorization: "Bearer fake" },
    });
    expect(del.statusCode).toBe(404);
  });

  it("returns 400 for a malformed id", async () => {
    const workspaceId = await createWorkspaceAs("Acme");
    const del = await app.inject({
      method: "DELETE",
      url: `/workspaces/${workspaceId}/webhooks/not-a-uuid`,
      headers: { authorization: "Bearer fake" },
    });
    expect(del.statusCode).toBe(400);
  });
});
