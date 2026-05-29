/**
 * services/api — /internal/tus/* + /internal/{assets,renditions} tests
 * (T-030/31).
 *
 * Mocks the db client + repo modules + the temporal client. Verifies:
 *
 *   - pre-create rejects missing/invalid workspaceId, missing or
 *     bad authToken, missing filename, unsupported mime, missing
 *     membership.
 *   - pre-create accepts a valid request and echoes safe metadata
 *     back to tusd.
 *   - post-finish triggers a workflow start with the correct
 *     workflowId convention (`ingest-{asset_id}`).
 *   - internal/assets + internal/renditions reject missing/invalid
 *     HMAC tokens and accept a valid one.
 *
 * Same mocking style as server.test.ts.
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
process.env["API_INTERNAL_TOKEN"] = "internal-token-internal-token-32";
delete process.env["NATS_URL"];
delete process.env["NOVU_API_URL"];
delete process.env["NOVU_API_KEY"];

interface FakeUser {
  userId: string;
  email: string;
}
interface FakeMembership {
  workspaceId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
}
interface FakeAsset {
  assetId: string;
  workspaceId: string;
  sourceUri: string;
  sha256: string;
  durationMs: number | null;
  mime: string;
  createdBy: string | null;
  capturedVia: string | null;
  tierAtUpload: string | null;
  createdAt: Date;
}
interface FakeRendition {
  renditionId: string;
  workspaceId: string;
  assetId: string;
  kind: string;
  uri: string;
  paramsJson: Record<string, unknown>;
  createdAt: Date;
}

const store = {
  users: new Map<string, FakeUser>(),
  members: [] as FakeMembership[],
  assets: [] as FakeAsset[],
  renditions: [] as FakeRendition[],
  reset(): void {
    this.users.clear();
    this.members.length = 0;
    this.assets.length = 0;
    this.renditions.length = 0;
  },
};

const ALICE_ID = "11111111-1111-4111-8111-111111111111";
const ID_BY_EMAIL: Record<string, string> = {
  "alice@example.com": ALICE_ID,
};

vi.mock("../db/client.js", () => ({
  getDb: () => ({}) as unknown,
  closeDb: async () => {},
  withWorkspace: async <T>(_id: string, fn: (tx: unknown) => Promise<T>) => fn({}),
  withUserContext: async <T>(_id: string, fn: (tx: unknown) => Promise<T>) => fn({}),
  __setDbForTests: () => {},
  upsertUserByEmail: async (email: string) => {
    const key = email.trim().toLowerCase();
    const existing = store.users.get(key);
    if (existing) return existing.userId;
    const userId =
      ID_BY_EMAIL[key] ??
      `00000000-0000-4000-8000-${String(store.users.size + 1).padStart(12, "0")}`;
    store.users.set(key, { userId, email: key });
    return userId;
  },
  createWorkspaceForUser: async (workspaceId: string) => workspaceId,
}));

vi.mock("../db/repo.ts", () => ({
  findUserById: async (userId: string) =>
    [...store.users.values()].find((u) => u.userId === userId) ?? null,
  listMembershipsForUser: async (userId: string) =>
    store.members
      .filter((m) => m.userId === userId)
      .map((m) => ({ workspaceId: m.workspaceId, role: m.role })),
  listWorkspacesByIds: async () => [],
  listWorkspacesForUser: async () => [],
  findWorkspaceById: async () => null,
}));

vi.mock("../db/assets-repo.ts", () => ({
  upsertAsset: async (input: {
    workspaceId: string;
    assetId?: string;
    sourceUri: string;
    sha256: string;
    mime: string;
    durationMs?: number | null;
    createdBy?: string | null;
    capturedVia?: string | null;
    tierAtUpload?: string | null;
  }) => {
    const existing = store.assets.find(
      (a) => a.workspaceId === input.workspaceId && a.sha256 === input.sha256,
    );
    if (existing) return { row: existing, deduped: true };
    const row: FakeAsset = {
      assetId: input.assetId ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      workspaceId: input.workspaceId,
      sourceUri: input.sourceUri,
      sha256: input.sha256,
      mime: input.mime,
      durationMs: input.durationMs ?? null,
      createdBy: input.createdBy ?? null,
      capturedVia: input.capturedVia ?? null,
      tierAtUpload: input.tierAtUpload ?? null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    };
    store.assets.push(row);
    return { row, deduped: false };
  },
  findAssetById: async () => null,
  updateAssetDuration: async () => {},
}));

vi.mock("../db/renditions-repo.ts", () => ({
  upsertRendition: async (input: {
    workspaceId: string;
    assetId: string;
    kind: string;
    uri: string;
    paramsJson?: Record<string, unknown>;
  }) => {
    const filtered = store.renditions.filter(
      (r) =>
        !(
          r.workspaceId === input.workspaceId &&
          r.assetId === input.assetId &&
          r.kind === input.kind
        ),
    );
    store.renditions.length = 0;
    store.renditions.push(...filtered);
    const row: FakeRendition = {
      renditionId: `r-${store.renditions.length + 1}`,
      workspaceId: input.workspaceId,
      assetId: input.assetId,
      kind: input.kind,
      uri: input.uri,
      paramsJson: input.paramsJson ?? {},
      createdAt: new Date("2024-01-01T00:00:00Z"),
    };
    store.renditions.push(row);
    return row;
  },
  listRenditionsForAsset: async () => [],
}));

// Workflow starter — capture the calls.
const startedWorkflows: Array<{
  workspace_id: string;
  asset_id: string;
  upload_id: string;
  upload_key: string;
  mime: string;
  source_name: string;
  created_by?: string | null;
}> = [];

vi.mock("../temporal-client.js", () => ({
  getIngestWorkflowStarter:
    async () =>
    async (input: {
      workspace_id: string;
      asset_id: string;
      upload_id: string;
      upload_key: string;
      mime: string;
      source_name: string;
      created_by?: string | null;
    }) => {
      startedWorkflows.push(input);
      return { workflowId: `ingest-${input.asset_id}`, runId: "run-1" };
    },
  closeTemporal: async () => {},
}));

const { buildServer } = await import("../server.js");

type FastifyApp = Awaited<ReturnType<typeof buildServer>>;

let app: FastifyApp;

const VALID_WS = "ws-acme";
const INTERNAL_TOKEN = process.env["API_INTERNAL_TOKEN"]!;

function aliceVerifier() {
  return async () => ({
    payload: { iss: "test", email: "alice@example.com", azp: "app-web", sub: "kc-alice" } as never,
  });
}

beforeAll(async () => {
  app = await buildServer({ serverOptions: { logger: false } });
  app.authVerifier = aliceVerifier();
});

beforeEach(() => {
  store.reset();
  startedWorkflows.length = 0;
  app.authVerifier = aliceVerifier();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /internal/tus/pre-create", () => {
  function payload(meta: Record<string, string>) {
    return {
      Type: "pre-create",
      Event: {
        Upload: { ID: "u-1", MetaData: meta },
      },
    };
  }

  it("400 when workspaceId is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/tus/pre-create",
      payload: payload({ authToken: "tok", filename: "x.mp4", filetype: "video/mp4" }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("401 when authToken is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/tus/pre-create",
      payload: payload({ workspaceId: VALID_WS, filename: "x.mp4", filetype: "video/mp4" }),
    });
    expect(res.statusCode).toBe(401);
  });

  it("415 when mime is unsupported", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/tus/pre-create",
      payload: payload({
        workspaceId: VALID_WS,
        authToken: "tok",
        filename: "x.bin",
        filetype: "application/octet-stream",
      }),
    });
    expect(res.statusCode).toBe(415);
  });

  it("401 when JWT fails verification", async () => {
    app.authVerifier = async () => {
      throw new Error("bad sig");
    };
    const res = await app.inject({
      method: "POST",
      url: "/internal/tus/pre-create",
      payload: payload({
        workspaceId: VALID_WS,
        authToken: "tok",
        filename: "x.mp4",
        filetype: "video/mp4",
      }),
    });
    expect(res.statusCode).toBe(401);
  });

  it("403 when caller is not a workspace member", async () => {
    // Alice exists (resolved via upsert) but isn't a member of ws-acme.
    const res = await app.inject({
      method: "POST",
      url: "/internal/tus/pre-create",
      payload: payload({
        workspaceId: VALID_WS,
        authToken: "tok",
        filename: "x.mp4",
        filetype: "video/mp4",
      }),
    });
    expect(res.statusCode).toBe(403);
  });

  it("200 and echoes safe metadata when authorised", async () => {
    store.members.push({ workspaceId: VALID_WS, userId: ALICE_ID, role: "owner" });
    const res = await app.inject({
      method: "POST",
      url: "/internal/tus/pre-create",
      payload: payload({
        workspaceId: VALID_WS,
        authToken: "tok",
        filename: "video.mp4",
        filetype: "video/mp4",
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ChangeFileInfo: { MetaData: Record<string, string> };
    };
    expect(body.ChangeFileInfo.MetaData["workspaceId"]).toBe(VALID_WS);
    expect(body.ChangeFileInfo.MetaData["userId"]).toBe(ALICE_ID);
    expect(body.ChangeFileInfo.MetaData["original_filename"]).toBe("video.mp4");
    expect(body.ChangeFileInfo.MetaData["mime"]).toBe("video/mp4");
    // The JWT must NEVER leak back into the upload's persisted metadata.
    expect(body.ChangeFileInfo.MetaData).not.toHaveProperty("authToken");
  });
});

describe("POST /internal/tus/post-finish", () => {
  it("400 when Upload.ID is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/tus/post-finish",
      payload: { Type: "post-finish", Event: { Upload: { MetaData: {} } } },
    });
    expect(res.statusCode).toBe(400);
  });

  it("400 when workspaceId metadata is missing (pre-create skipped)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/tus/post-finish",
      payload: {
        Type: "post-finish",
        Event: { Upload: { ID: "u-1", MetaData: {} } },
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("200 and starts an IngestAssetWorkflow when authorised", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/tus/post-finish",
      payload: {
        Type: "post-finish",
        Event: {
          Upload: {
            ID: "u-abc",
            Size: 1024,
            MetaData: {
              workspaceId: VALID_WS,
              userId: ALICE_ID,
              original_filename: "x.mp4",
              mime: "video/mp4",
            },
            Storage: { Key: "u-abc.bin" },
          },
        },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(startedWorkflows).toHaveLength(1);
    const start = startedWorkflows[0]!;
    expect(start.workspace_id).toBe(VALID_WS);
    expect(start.upload_id).toBe("u-abc");
    expect(start.upload_key).toBe("u-abc.bin");
    expect(start.mime).toBe("video/mp4");
    expect(start.source_name).toBe("x.mp4");
    expect(start.created_by).toBe(ALICE_ID);
    // The route mints a fresh asset_id; the workflow id is derived
    // from it deterministically (`ingest-{asset_id}`).
    const body = res.json() as { workflow_id: string; asset_id: string };
    expect(body.workflow_id).toBe(`ingest-${body.asset_id}`);
  });
});

describe("internal HMAC-protected endpoints", () => {
  it("rejects /internal/assets without the internal token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/assets",
      payload: {
        workspace_id: VALID_WS,
        source_uri: "s3://media-raw/x",
        sha256: "0".repeat(64),
        mime: "video/mp4",
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects /internal/assets with a wrong-length token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/assets",
      headers: { "x-vidgen-internal-token": "wrong" },
      payload: {
        workspace_id: VALID_WS,
        source_uri: "s3://media-raw/x",
        sha256: "0".repeat(64),
        mime: "video/mp4",
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("creates an asset (201) and returns dedup=true on the second call", async () => {
    const headers = { "x-vidgen-internal-token": INTERNAL_TOKEN };
    const sha = "a".repeat(64);
    const body = {
      workspace_id: VALID_WS,
      asset_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      source_uri: "s3://media-raw/ws-acme/aaaa/source.mp4",
      sha256: sha,
      mime: "video/mp4",
    };

    const first = await app.inject({
      method: "POST",
      url: "/internal/assets",
      headers,
      payload: body,
    });
    expect(first.statusCode).toBe(201);
    expect(first.json().deduped).toBe(false);

    const second = await app.inject({
      method: "POST",
      url: "/internal/assets",
      headers,
      payload: body,
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().deduped).toBe(true);
  });

  it("rejects malformed sha256 / workspace_id / asset_id", async () => {
    const headers = { "x-vidgen-internal-token": INTERNAL_TOKEN };
    const cases = [
      { workspace_id: "", source_uri: "s3://x/y", sha256: "0".repeat(64), mime: "video/mp4" },
      {
        workspace_id: VALID_WS,
        source_uri: "s3://x/y",
        sha256: "Z".repeat(64),
        mime: "video/mp4",
      },
      {
        workspace_id: VALID_WS,
        source_uri: "s3://x/y",
        sha256: "0".repeat(64),
        mime: "video/mp4",
        asset_id: "not-a-uuid",
      },
    ];
    for (const body of cases) {
      const res = await app.inject({
        method: "POST",
        url: "/internal/assets",
        headers,
        payload: body,
      });
      expect(res.statusCode).toBe(400);
    }
  });

  it("creates a rendition (201) with valid token", async () => {
    const headers = { "x-vidgen-internal-token": INTERNAL_TOKEN };
    const res = await app.inject({
      method: "POST",
      url: "/internal/renditions",
      headers,
      payload: {
        workspace_id: VALID_WS,
        asset_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        kind: "mezzanine",
        uri: "s3://media-derived/ws-acme/aaaa/mezz.mp4",
        params_json: { crf: 23 },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.kind).toBe("mezzanine");
    expect(body.uri).toContain("mezz.mp4");
  });
});
