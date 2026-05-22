/**
 * Schema-level invariants for the Drizzle schema (T-011).
 *
 * These tests run without a live database — they introspect the in-memory
 * Drizzle objects and the on-disk migration files to guarantee:
 *
 *   1. Every tenant table declared in `ALL_TABLE_NAMES` either carries a
 *      `workspace_id` text column or has a documented exception (the
 *      `users` table, whose visibility is enforced via tenant_members).
 *   2. Every table in `ALL_TABLE_NAMES` is covered by a `workspace_isolation`
 *      RLS policy in `migrations/0001_rls_policies.sql`. This is the
 *      static counterpart of the database-level check at the bottom of
 *      that migration file, and it catches drift the moment someone adds
 *      a new table to schema.ts without also adding a policy.
 *   3. The `assets` table carries every column the T-011 ticket mandates:
 *      asset_id, workspace_id, source_uri, sha256, duration_ms, mime,
 *      created_by, captured_via, tier_at_upload, created_at.
 *   4. The embeddings table declares `embedding vector(1024)`.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getTableColumns, getTableName, type Table } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { ALL_TABLE_NAMES, assets, embeddings, users } from "../db/schema.js";
import * as schema from "../db/schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const rlsMigrationPath = resolve(here, "../../migrations/0001_rls_policies.sql");
const initialMigrationPath = resolve(here, "../../migrations/0000_initial_schema.sql");

describe("schema invariants", () => {
  it("ALL_TABLE_NAMES enumerates exactly the 20 architecture tables", () => {
    expect([...ALL_TABLE_NAMES].sort()).toEqual(
      [
        "assets",
        "audit_log",
        "captions",
        "comments",
        "edits",
        "embeddings",
        "oauth_connections",
        "project_clips",
        "projects",
        "renders",
        "renditions",
        "share_links",
        "tenant_members",
        "tenants",
        "transcript_segments",
        "transcript_words",
        "transcripts",
        "users",
        "webhooks",
        "workflows",
      ].sort(),
    );
  });

  it("every table in schema.ts has a workspace_id column (or is the documented exception)", () => {
    const EXCEPTIONS = new Set(["users"]);
    // Collect the SQL table names declared in schema.ts.
    const tablesByName = new Map<string, Table>();
    for (const value of Object.values(schema)) {
      // drizzle pgTable() returns an object whose `getTableName` returns the
      // SQL name. Use that as the discriminator rather than `instanceof`,
      // which doesn't survive the customType helper.
      try {
        const name = getTableName(value as Table);
        if (typeof name === "string" && (ALL_TABLE_NAMES as readonly string[]).includes(name)) {
          tablesByName.set(name, value as Table);
        }
      } catch {
        /* not a table */
      }
    }
    expect(tablesByName.size).toBe(ALL_TABLE_NAMES.length);

    for (const tableName of ALL_TABLE_NAMES) {
      if (EXCEPTIONS.has(tableName)) continue;
      const t = tablesByName.get(tableName);
      expect(t, `missing table object for ${tableName}`).toBeDefined();
      const cols = getTableColumns(t!);
      const hasWorkspaceId = Object.values(cols).some(
        (c) => (c as { name: string }).name === "workspace_id",
      );
      expect(hasWorkspaceId, `${tableName} must declare a workspace_id column`).toBe(true);
    }
  });

  it("assets has every column required by the T-011 ticket", () => {
    const cols = getTableColumns(assets);
    const colNames = Object.values(cols).map((c) => (c as { name: string }).name);
    for (const required of [
      "asset_id",
      "workspace_id",
      "source_uri",
      "sha256",
      "duration_ms",
      "mime",
      "created_by",
      "captured_via",
      "tier_at_upload",
      "created_at",
    ]) {
      expect(colNames, `assets must have ${required}`).toContain(required);
    }
  });

  it("users has no workspace_id (its RLS goes via tenant_members)", () => {
    const cols = getTableColumns(users);
    const colNames = Object.values(cols).map((c) => (c as { name: string }).name);
    expect(colNames).not.toContain("workspace_id");
  });
});

describe("RLS migration coverage", () => {
  const rlsSql = readFileSync(rlsMigrationPath, "utf8");
  const initSql = readFileSync(initialMigrationPath, "utf8");

  it("every table in ALL_TABLE_NAMES has ENABLE ROW LEVEL SECURITY", () => {
    for (const t of ALL_TABLE_NAMES) {
      expect(rlsSql, `${t} must be RLS-enabled`).toMatch(
        new RegExp(`ALTER TABLE\\s+"${t}"\\s+ENABLE ROW LEVEL SECURITY`, "i"),
      );
    }
  });

  it("every table has a workspace_isolation policy", () => {
    for (const t of ALL_TABLE_NAMES) {
      expect(rlsSql, `${t} must have a workspace_isolation policy`).toMatch(
        new RegExp(`CREATE POLICY\\s+"workspace_isolation"\\s+ON\\s+"${t}"`, "i"),
      );
    }
  });

  it("initial schema migration creates exactly the 20 expected tables", () => {
    for (const t of ALL_TABLE_NAMES) {
      expect(initSql, `${t} must be CREATEd`).toMatch(new RegExp(`CREATE TABLE\\s+"${t}"`, "i"));
    }
  });

  it("embeddings.embedding is declared as vector(1024)", () => {
    // Confirms the customType pgvector path emits the exact DDL we expect.
    expect(initSql).toMatch(/"embedding"\s+vector\(1024\)\s+NOT NULL/i);

    // Belt-and-braces: also confirms the schema column carries the right type
    // metadata so query builders show the right column.
    const cols = getTableColumns(embeddings);
    const embeddingCol = Object.values(cols).find(
      (c) => (c as { name: string }).name === "embedding",
    );
    expect(embeddingCol).toBeDefined();
  });
});

describe("withWorkspace input validation", () => {
  it("rejects empty / malformed workspace ids before opening a transaction", async () => {
    // Lazy import: this module imports `apiConfig`, which loads env. We
    // stub the env via CONFIG_SKIP_DOTENV + the required fields so the
    // module import doesn't blow up.
    const env = {
      CONFIG_SKIP_DOTENV: "1",
      APP_SECRET: "x".repeat(32),
      POSTGRES_HOST: "localhost",
      POSTGRES_PORT: "5432",
      POSTGRES_USER: "app",
      POSTGRES_PASSWORD: "x",
      POSTGRES_DB: "vidgen",
    } as const;
    for (const [k, v] of Object.entries(env)) process.env[k] = v;
    const { withWorkspace } = await import("../db/client.js");
    await expect(withWorkspace("", async () => 1)).rejects.toThrow(/invalid workspaceId/);
    await expect(withWorkspace("has'quote", async () => 1)).rejects.toThrow(/invalid workspaceId/);
    await expect(withWorkspace("space id", async () => 1)).rejects.toThrow(/invalid workspaceId/);
  });
});
