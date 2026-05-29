/**
 * services/api — Fastify server unit tests (T-015).
 *
 * Uses `app.inject()` to drive routes without binding a socket. The DB
 * is mocked via two `vi.mock` calls:
 *
 *   - `../db/client.js`: replaces the postgres-touching helpers
 *     (`upsertUserByEmail`, `createWorkspaceForUser`, `getDb`,
 *     `closeDb`) with in-memory equivalents. `withUserContext` becomes a
 *     pass-through that just invokes the callback with a sentinel.
 *   - `../db/repo.ts`: replaces the read helpers
 *     (`findUserById`, `listMembershipsForUser`, `listWorkspacesByIds`,
 *     `listWorkspacesForUser`, `findWorkspaceById`) with reads against
 *     the same in-memory store the writes populate.
 *
 * Auth is mocked by overriding `app.authVerifier` after `buildServer()`
 * returns; the real auth plugin still runs (so we cover its
 * `Authorization` parsing, error envelope, and email-claim guard) but
 * the JWT signature check is short-circuited.
 *
 * Covered acceptance criteria for T-015:
 *   1. GET /health returns the new {ok, version, ts} shape.
 *   2. Protected routes return 401 without a Bearer token.
 *   3. /me returns the upserted user + memberships.
 *   4. POST /workspaces persists and the caller sees it in GET /workspaces.
 *   5. A second user does NOT see the first user's workspace
 *      (multi-tenant isolation at the API surface).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// --- Required env for `services/api/src/config.ts` --------------------
// Has to happen BEFORE any import that transitively loads config.ts.
process.env["NODE_ENV"] = "test";
process.env["CONFIG_SKIP_DOTENV"] = "1";
process.env["APP_SECRET"] = "x".repeat(32);
process.env["POSTGRES_HOST"] = "localhost";
process.env["POSTGRES_PORT"] = "5432";
process.env["POSTGRES_USER"] = "app";
process.env["POSTGRES_PASSWORD"] = "dev-only";
process.env["POSTGRES_DB"] = "vidgen";
// Force the notifier plugin (T-023) onto its in-memory bus path
// regardless of what the shell exported.
delete process.env["NATS_URL"];
delete process.env["NOVU_API_URL"];
delete process.env["NOVU_API_KEY"];
// No KEYCLOAK_ISSUER_URL — the auth plugin installs a stub verifier we
// will override per-test below.

// --- In-memory store shared by both mocks -----------------------------
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

const store = {
  users: new Map<string, FakeUser>(), // keyed by email (lowercased)
  workspaces: new Map<string, FakeWorkspace>(),
  members: [] as FakeMembership[],
  reset(): void {
    this.users.clear();
    this.workspaces.clear();
    this.members.length = 0;
  },
};

// A stable UUID for the two test users so assertions read cleanly.
const ALICE_ID = "11111111-1111-4111-8111-111111111111";
const BOB_ID = "22222222-2222-4222-8222-222222222222";
const ID_BY_EMAIL: Record<string, string> = {
  "alice@example.com": ALICE_ID,
  "bob@example.com": BOB_ID,
};

vi.mock("../db/client.js", () => {
  return {
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
      if (store.workspaces.has(workspaceId)) {
        throw new Error("duplicate workspace");
      }
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
  };
});

vi.mock("../db/repo.ts", () => {
  // Note: the route imports use `../db/repo.js` but vitest resolves the
  // `.js` specifier back to the actual `.ts` source. Mock the resolved
  // file (no extension) and vitest will hand back this module for both
  // `../db/repo.js` and `../db/repo.ts` resolutions.
  const byUserId = (userId: string) =>
    [...store.users.values()].find((u) => u.userId === userId) ?? null;
  const listMembershipsForUser = async (userId: string) =>
    store.members
      .filter((m) => m.userId === userId)
      .map((m) => ({ workspaceId: m.workspaceId, role: m.role }));
  const listWorkspacesByIds = async (_userId: string, ids: string[]) =>
    [...store.workspaces.values()].filter((w) => ids.includes(w.workspaceId));
  return {
    findUserById: async (userId: string) => byUserId(userId),
    listMembershipsForUser,
    listWorkspacesByIds,
    listWorkspacesForUser: async (userId: string) => {
      const memberships = await listMembershipsForUser(userId);
      const ws = await listWorkspacesByIds(
        userId,
        memberships.map((m) => m.workspaceId),
      );
      const byId = new Map(ws.map((w) => [w.workspaceId, w]));
      return memberships
        .map((m) => {
          const t = byId.get(m.workspaceId);
          if (!t) return null;
          return { ...t, role: m.role };
        })
        .filter((w): w is NonNullable<typeof w> => w !== null)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
    findWorkspaceById: async (_userId: string, workspaceId: string) =>
      store.workspaces.get(workspaceId) ?? null,
  };
});

// Import AFTER the mocks so the real modules never load.
const { buildServer } = await import("../server.js");

type FastifyApp = Awaited<ReturnType<typeof buildServer>>;

function makeVerifier(payload: Record<string, unknown>) {
  return async () => ({ payload: { iss: "test", aud: "test", ...payload } as never });
}

let app: FastifyApp;

beforeAll(async () => {
  app = await buildServer({ serverOptions: { logger: false } });
  // Default verifier: alice. Override per-test as needed.
  app.authVerifier = makeVerifier({ sub: "kc-alice", email: "alice@example.com", azp: "app-web" });
});

beforeEach(() => {
  store.reset();
  // Default to alice.
  app.authVerifier = makeVerifier({ sub: "kc-alice", email: "alice@example.com", azp: "app-web" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /health", () => {
  it("returns ok, version, and an ISO timestamp", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(body.ts))).toBe(false);
  });

  it("does not require a token", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });
});

describe("authentication", () => {
  it("returns 401 problem+json when Authorization header is missing", async () => {
    const res = await app.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(401);
    expect(res.headers["content-type"]).toMatch(/application\/problem\+json/);
    const body = res.json();
    expect(body.status).toBe(401);
    expect(body.title).toBe("Unauthorized");
  });

  it("returns 401 when the token fails verification", async () => {
    app.authVerifier = async () => {
      throw new Error("bad signature");
    };
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: "Bearer fake" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 when the token has no email claim", async () => {
    app.authVerifier = makeVerifier({ sub: "kc-x", azp: "app-web" });
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: "Bearer fake" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().detail).toMatch(/email/);
  });
});

describe("GET /me", () => {
  it("returns the resolved user and empty workspaces on first call", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: "Bearer fake", "x-test": "alice" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.userId).toBe(ALICE_ID);
    expect(body.user.email).toBe("alice@example.com");
    expect(body.workspaces).toEqual([]);
  });

  it("reflects newly-created workspaces", async () => {
    await app.inject({
      method: "POST",
      url: "/workspaces",
      headers: { authorization: "Bearer fake", "content-type": "application/json" },
      payload: { name: "Acme" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: "Bearer fake" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.workspaces).toHaveLength(1);
    expect(body.workspaces[0].name).toBe("Acme");
    expect(body.workspaces[0].role).toBe("owner");
  });
});

describe("POST /workspaces", () => {
  it("returns 400 when name is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/workspaces",
      headers: { authorization: "Bearer fake", "content-type": "application/json" },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toMatch(/problem\+json/);
  });

  it("creates the workspace, sets the caller as owner, and returns 201", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/workspaces",
      headers: { authorization: "Bearer fake", "content-type": "application/json" },
      payload: { name: "Brand New" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("Brand New");
    expect(body.role).toBe("owner");
    expect(body.region).toBe("local");
    expect(body.tier).toBe("free");
    expect(typeof body.workspaceId).toBe("string");
    expect(body.workspaceId.length).toBeGreaterThan(0);
  });
});

describe("multi-tenant isolation", () => {
  it("a second user cannot see the first user's workspaces", async () => {
    // Alice creates a workspace.
    const create = await app.inject({
      method: "POST",
      url: "/workspaces",
      headers: { authorization: "Bearer alice", "content-type": "application/json" },
      payload: { name: "Alice Co" },
    });
    expect(create.statusCode).toBe(201);

    // Bob signs in. Switch the verifier to return bob's email.
    app.authVerifier = makeVerifier({ sub: "kc-bob", email: "bob@example.com", azp: "app-web" });

    const list = await app.inject({
      method: "GET",
      url: "/workspaces",
      headers: { authorization: "Bearer bob" },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().workspaces).toEqual([]);

    const me = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: "Bearer bob" },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().workspaces).toEqual([]);
    expect(me.json().user.email).toBe("bob@example.com");
    expect(me.json().user.userId).toBe(BOB_ID);
  });
});
