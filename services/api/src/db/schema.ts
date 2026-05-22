/**
 * services/api — Drizzle schema (T-011).
 *
 * Mirrors the core schema excerpt in docs/architecture.md §5.2. Every tenant
 * table carries `workspace_id` (text) so the global RLS policy
 *   workspace_isolation USING (workspace_id = current_workspace_id())
 * applies uniformly (see migrations/0001_rls_policies.sql).
 *
 * Type choices:
 *   - `workspace_id` is `text`, matching the return type of the
 *     `current_workspace_id()` helper installed by T-010
 *     (infra/compose/postgres/init/02-rls-helpers.sql). Keeping the same
 *     type on both sides means the RLS predicate is a direct equality with
 *     no casts — easier to read and impossible to mis-index.
 *   - Primary keys are `uuid` with `gen_random_uuid()` (pgcrypto, installed
 *     by 00-extensions.sql). Surrogate keys keep the URL layer opaque.
 *   - `*_ms` durations are `integer` (max ~24 days); only `audit_log.id`
 *     uses bigserial since events accumulate without bound.
 *   - `embeddings.embedding` is `vector(1024)` — pgvector type. 1024 fits
 *     the most common open embedding models (e5-large, gte-large,
 *     bge-large) without truncation.
 *
 * What this file deliberately does NOT contain:
 *   - RLS policies (those live in migrations/0001_rls_policies.sql so the
 *     order and the predicate text are version-controlled exactly as
 *     applied).
 *   - Application-level business logic (constraints, defaults beyond what
 *     the DB itself enforces, etc.). That lives in `services/api/src/*`
 *     and is added by feature tickets.
 *
 * Architecture references:
 *   - arch §5.1, §5.2 — store + schema shape.
 *   - arch §5.3 — transcript-as-source-of-truth; `edits` is the event log.
 *   - arch §6   — `workflows` mirrors Temporal workflow status.
 *   - arch §11  — workspace_id is mandatory on every row.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---- pgvector custom type ----------------------------------------------------
//
// Declaring a `customType` keeps the DDL explicit (`vector(1024)`) and
// survives upstream API renames in drizzle-orm. pgvector encodes vectors on
// the wire as the text form `[0.1,0.2,...]`; the driver returns / accepts
// that string, which we round-trip to `number[]` here.
const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    if (!config) throw new Error("vector() requires { dimensions } config");
    return `vector(${config.dimensions})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((s) => Number(s));
  },
});

// Reusable timestamp default ("now()" at insert time, no app-clock skew).
// Pass the SQL column name explicitly; otherwise drizzle uses the JS property
// name verbatim and we'd get `"createdAt"` instead of `"created_at"`.
const nowTs = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" }).defaultNow().notNull();

// ---- tenants -----------------------------------------------------------------
// The workspace itself. `workspace_id` IS the primary key so the same column
// name carries through every related table — RLS policies stay copy-paste
// identical and JOINs read naturally.
export const tenants = pgTable("tenants", {
  workspaceId: text("workspace_id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull().default("local"),
  tier: text("tier").notNull().default("free"),
  brandKitId: uuid("brand_kit_id"),
  createdAt: nowTs("created_at"),
  updatedAt: nowTs("updated_at"),
});

// ---- users -------------------------------------------------------------------
// Cross-tenant identity (a user can belong to N workspaces via tenant_members).
// No `workspace_id` column — visibility is computed via tenant_members in the
// RLS policy (see 0001_rls_policies.sql). That keeps the user record single
// even when the same person is invited to two workspaces.
export const users = pgTable(
  "users",
  {
    userId: uuid("user_id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    createdAt: nowTs("created_at"),
    updatedAt: nowTs("updated_at"),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

// ---- tenant_members ----------------------------------------------------------
// Composite PK (workspace_id, user_id). Role is one of owner | editor | viewer
// (arch §11; Keycloak T-013 maps the same names). Stored as text + check to
// avoid an enum migration churn the first time we add a role.
export const tenantMembers = pgTable(
  "tenant_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    role: text("role").notNull().default("viewer"),
    createdAt: nowTs("created_at"),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    index("tenant_members_user_idx").on(t.userId),
  ],
);

// ---- assets ------------------------------------------------------------------
// Ticket spec: asset_id, workspace_id, source_uri, sha256, duration_ms, mime,
// created_by, captured_via, tier_at_upload, created_at.
//
// `source_uri` is an S3-style URI into MinIO/R2 — Postgres stores metadata
// only (arch §5.1, principle E2).
// `sha256` enables content-addressed dedup (arch E6) — UNIQUE per workspace.
export const assets = pgTable(
  "assets",
  {
    assetId: uuid("asset_id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    sourceUri: text("source_uri").notNull(),
    sha256: text("sha256").notNull(),
    durationMs: integer("duration_ms"),
    mime: text("mime").notNull(),
    createdBy: uuid("created_by").references(() => users.userId, { onDelete: "set null" }),
    capturedVia: text("captured_via"),
    tierAtUpload: text("tier_at_upload"),
    createdAt: nowTs("created_at"),
  },
  (t) => [
    index("assets_workspace_idx").on(t.workspaceId),
    uniqueIndex("assets_workspace_sha256_unique").on(t.workspaceId, t.sha256),
  ],
);

// ---- renditions --------------------------------------------------------------
// Derived bytes (mezzanine MP4, HLS rendition ladder, thumbnails). All
// rebuildable from `assets.source_uri`. `params_json` records the FFmpeg /
// Remotion args so two renditions with identical params can be deduped.
export const renditions = pgTable(
  "renditions",
  {
    renditionId: uuid("rendition_id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.assetId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    uri: text("uri").notNull(),
    paramsJson: jsonb("params_json")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: nowTs("created_at"),
  },
  (t) => [index("renditions_asset_idx").on(t.assetId)],
);

// ---- projects ----------------------------------------------------------------
export const projects = pgTable(
  "projects",
  {
    projectId: uuid("project_id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brandKitId: uuid("brand_kit_id"),
    createdAt: nowTs("created_at"),
    updatedAt: nowTs("updated_at"),
  },
  (t) => [index("projects_workspace_idx").on(t.workspaceId)],
);

// ---- project_clips -----------------------------------------------------------
// Lightweight clip placement on the timeline. The *materialised* timeline is
// derived from `edits` (arch §5.3) — these rows are an optimisation hint
// (search, "all clips containing asset X"), not the source of truth.
export const projectClips = pgTable(
  "project_clips",
  {
    clipId: uuid("clip_id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.assetId, { onDelete: "restrict" }),
    inMs: integer("in_ms").notNull(),
    outMs: integer("out_ms").notNull(),
    track: integer("track").notNull().default(0),
    z: integer("z").notNull().default(0),
    createdAt: nowTs("created_at"),
  },
  (t) => [
    index("project_clips_project_idx").on(t.projectId),
    index("project_clips_asset_idx").on(t.assetId),
  ],
);

// ---- transcripts -------------------------------------------------------------
export const transcripts = pgTable(
  "transcripts",
  {
    transcriptId: uuid("transcript_id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.assetId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    language: text("language").notNull(),
    model: text("model").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: nowTs("created_at"),
  },
  (t) => [index("transcripts_asset_idx").on(t.assetId)],
);

// ---- transcript_segments -----------------------------------------------------
export const transcriptSegments = pgTable(
  "transcript_segments",
  {
    segmentId: uuid("segment_id").primaryKey().defaultRandom(),
    transcriptId: uuid("transcript_id")
      .notNull()
      .references(() => transcripts.transcriptId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    speaker: text("speaker"),
    text: text("text").notNull(),
    confidence: integer("confidence"),
  },
  (t) => [index("transcript_segments_transcript_idx").on(t.transcriptId)],
);

// ---- transcript_words --------------------------------------------------------
export const transcriptWords = pgTable(
  "transcript_words",
  {
    wordId: uuid("word_id").primaryKey().defaultRandom(),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => transcriptSegments.segmentId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    text: text("text").notNull(),
  },
  (t) => [index("transcript_words_segment_idx").on(t.segmentId)],
);

// ---- captions ----------------------------------------------------------------
export const captions = pgTable(
  "captions",
  {
    captionId: uuid("caption_id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.assetId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    lang: text("lang").notNull(),
    format: text("format").notNull(),
    styleJson: jsonb("style_json")
      .notNull()
      .default(sql`'{}'::jsonb`),
    uri: text("uri").notNull(),
    createdAt: nowTs("created_at"),
  },
  (t) => [index("captions_asset_idx").on(t.assetId)],
);

// ---- edits -------------------------------------------------------------------
// Event-sourced edit log (arch §5.3). `op_jsonb` is opaque to Postgres; the
// materialise function (T-060) reads it. Append-only by convention; no
// UPDATE/DELETE in app code.
export const edits = pgTable(
  "edits",
  {
    editId: uuid("edit_id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    opJsonb: jsonb("op_jsonb").notNull(),
    authorId: uuid("author_id").references(() => users.userId, { onDelete: "set null" }),
    ts: nowTs("ts"),
  },
  (t) => [index("edits_project_ts_idx").on(t.projectId, t.ts)],
);

// ---- renders -----------------------------------------------------------------
export const renders = pgTable(
  "renders",
  {
    renderId: uuid("render_id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    target: text("target").notNull(),
    status: text("status").notNull().default("queued"),
    outputUri: text("output_uri"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [index("renders_project_idx").on(t.projectId)],
);

// ---- workflows ---------------------------------------------------------------
// Mirror of Temporal workflow status (arch §6). The workflow engine remains
// the source of truth; this table exists so we can render lists / filters /
// audit without querying Temporal on every request.
export const workflows = pgTable(
  "workflows",
  {
    workflowId: text("workflow_id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    payloadUri: text("payload_uri"),
    createdAt: nowTs("created_at"),
    updatedAt: nowTs("updated_at"),
  },
  (t) => [index("workflows_workspace_kind_idx").on(t.workspaceId, t.kind)],
);

// ---- comments ----------------------------------------------------------------
export const comments = pgTable(
  "comments",
  {
    commentId: uuid("comment_id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    anchorMs: integer("anchor_ms"),
    body: text("body").notNull(),
    threadId: uuid("thread_id"),
    authorId: uuid("author_id").references(() => users.userId, { onDelete: "set null" }),
    ts: nowTs("ts"),
  },
  (t) => [index("comments_project_idx").on(t.projectId)],
);

// ---- audit_log ---------------------------------------------------------------
// Hash-chained append-only log (arch §11). `hash_self = sha256(hash_prev || row)`
// is computed and validated at the app layer (T-120). Keeping `id` as
// bigserial gives a monotonic ordering even if `ts` clashes.
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    actor: text("actor"),
    action: text("action").notNull(),
    target: text("target"),
    hashPrev: text("hash_prev"),
    hashSelf: text("hash_self"),
    ts: nowTs("ts"),
  },
  (t) => [index("audit_log_workspace_ts_idx").on(t.workspaceId, t.ts)],
);

// ---- embeddings --------------------------------------------------------------
// pgvector storage for clip/segment search. 1024 dims matches the default
// open embedding models (arch §3.2 / §7).
export const embeddings = pgTable(
  "embeddings",
  {
    embeddingId: uuid("embedding_id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assets.assetId, { onDelete: "cascade" }),
    segmentId: uuid("segment_id").references(() => transcriptSegments.segmentId, {
      onDelete: "cascade",
    }),
    kind: text("kind").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
    model: text("model").notNull(),
    createdAt: nowTs("created_at"),
  },
  (t) => [index("embeddings_workspace_kind_idx").on(t.workspaceId, t.kind)],
  // Note: an ivfflat / hnsw index on the vector column is added in a
  // later ticket once we have realistic data to pick `lists` / `m`.
);

// ---- share_links -------------------------------------------------------------
export const shareLinks = pgTable(
  "share_links",
  {
    token: text("token").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    settingsJson: jsonb("settings_json")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: nowTs("created_at"),
  },
  (t) => [index("share_links_project_idx").on(t.projectId)],
);

// ---- oauth_connections -------------------------------------------------------
// Per-user, per-tenant third-party OAuth tokens (YouTube, LinkedIn, ...).
// `workspace_id` is denormalised here so the standard RLS policy applies
// without a join. `token_enc` / `refresh_enc` are envelope-encrypted blobs.
export const oauthConnections = pgTable(
  "oauth_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    scopes: text("scopes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    tokenEnc: text("token_enc").notNull(),
    refreshEnc: text("refresh_enc"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    createdAt: nowTs("created_at"),
  },
  (t) => [
    uniqueIndex("oauth_connections_workspace_user_provider_unique").on(
      t.workspaceId,
      t.userId,
      t.provider,
    ),
  ],
);

// ---- webhooks ----------------------------------------------------------------
// Per-tenant outbound webhook subscriptions (arch §E10). `events` is a
// Postgres text[] of event names the subscriber wants delivered.
export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => tenants.workspaceId, { onDelete: "cascade" }),
    url: text("url").notNull(),
    events: text("events")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    secretEnc: text("secret_enc").notNull(),
    createdAt: nowTs("created_at"),
  },
  (t) => [index("webhooks_workspace_idx").on(t.workspaceId)],
);

// ---- Type helpers ------------------------------------------------------------
export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type TenantMember = typeof tenantMembers.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Rendition = typeof renditions.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectClip = typeof projectClips.$inferSelect;
export type Transcript = typeof transcripts.$inferSelect;
export type TranscriptSegment = typeof transcriptSegments.$inferSelect;
export type TranscriptWord = typeof transcriptWords.$inferSelect;
export type Caption = typeof captions.$inferSelect;
export type Edit = typeof edits.$inferSelect;
export type Render = typeof renders.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type Embedding = typeof embeddings.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
export type OauthConnection = typeof oauthConnections.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;

/**
 * Exhaustive list of every table the schema declares.
 *
 * Used by tests, the RLS smoke script, and any auditor that wants to verify
 * every table is covered by an RLS policy. Update this list whenever you
 * add a new table — `src/__tests__/schema.rls.test.ts` will fail otherwise.
 */
export const ALL_TABLE_NAMES = [
  "tenants",
  "users",
  "tenant_members",
  "assets",
  "renditions",
  "projects",
  "project_clips",
  "transcripts",
  "transcript_segments",
  "transcript_words",
  "captions",
  "edits",
  "renders",
  "workflows",
  "comments",
  "audit_log",
  "embeddings",
  "share_links",
  "oauth_connections",
  "webhooks",
] as const;

export type TableName = (typeof ALL_TABLE_NAMES)[number];
