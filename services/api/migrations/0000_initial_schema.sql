CREATE TABLE "assets" (
	"asset_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"source_uri" text NOT NULL,
	"sha256" text NOT NULL,
	"duration_ms" integer,
	"mime" text NOT NULL,
	"created_by" uuid,
	"captured_via" text,
	"tier_at_upload" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"actor" text,
	"action" text NOT NULL,
	"target" text,
	"hash_prev" text,
	"hash_self" text,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captions" (
	"caption_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"lang" text NOT NULL,
	"format" text NOT NULL,
	"style_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uri" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"comment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"anchor_ms" integer,
	"body" text NOT NULL,
	"thread_id" uuid,
	"author_id" uuid,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edits" (
	"edit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"op_jsonb" jsonb NOT NULL,
	"author_id" uuid,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embeddings" (
	"embedding_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"asset_id" uuid,
	"segment_id" uuid,
	"kind" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"token_enc" text NOT NULL,
	"refresh_enc" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_clips" (
	"clip_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"in_ms" integer NOT NULL,
	"out_ms" integer NOT NULL,
	"track" integer DEFAULT 0 NOT NULL,
	"z" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"project_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"brand_kit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renders" (
	"render_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"target" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"output_uri" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "renditions" (
	"rendition_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" text NOT NULL,
	"uri" text NOT NULL,
	"params_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"token" text PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" text NOT NULL,
	"expires_at" timestamp with time zone,
	"settings_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_members" (
	"workspace_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region" text DEFAULT 'local' NOT NULL,
	"tier" text DEFAULT 'free' NOT NULL,
	"brand_kit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_segments" (
	"segment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transcript_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"speaker" text,
	"text" text NOT NULL,
	"confidence" integer
);
--> statement-breakpoint
CREATE TABLE "transcript_words" (
	"word_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"transcript_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"language" text NOT NULL,
	"model" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"url" text NOT NULL,
	"events" text[] DEFAULT '{}'::text[] NOT NULL,
	"secret_enc" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"workflow_id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"payload_uri" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "captions" ADD CONSTRAINT "captions_asset_id_assets_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("asset_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "captions" ADD CONSTRAINT "captions_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edits" ADD CONSTRAINT "edits_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edits" ADD CONSTRAINT "edits_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edits" ADD CONSTRAINT "edits_author_id_users_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_asset_id_assets_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("asset_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_segment_id_transcript_segments_segment_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."transcript_segments"("segment_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_clips" ADD CONSTRAINT "project_clips_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_clips" ADD CONSTRAINT "project_clips_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_clips" ADD CONSTRAINT "project_clips_asset_id_assets_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("asset_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renditions" ADD CONSTRAINT "renditions_asset_id_assets_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("asset_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renditions" ADD CONSTRAINT "renditions_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_transcript_id_transcripts_transcript_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcripts"("transcript_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_words" ADD CONSTRAINT "transcript_words_segment_id_transcript_segments_segment_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."transcript_segments"("segment_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_words" ADD CONSTRAINT "transcript_words_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_asset_id_assets_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("asset_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_id_tenants_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."tenants"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_workspace_idx" ON "assets" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_workspace_sha256_unique" ON "assets" USING btree ("workspace_id","sha256");--> statement-breakpoint
CREATE INDEX "audit_log_workspace_ts_idx" ON "audit_log" USING btree ("workspace_id","ts");--> statement-breakpoint
CREATE INDEX "captions_asset_idx" ON "captions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "comments_project_idx" ON "comments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "edits_project_ts_idx" ON "edits" USING btree ("project_id","ts");--> statement-breakpoint
CREATE INDEX "embeddings_workspace_kind_idx" ON "embeddings" USING btree ("workspace_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_connections_workspace_user_provider_unique" ON "oauth_connections" USING btree ("workspace_id","user_id","provider");--> statement-breakpoint
CREATE INDEX "project_clips_project_idx" ON "project_clips" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_clips_asset_idx" ON "project_clips" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "projects_workspace_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "renders_project_idx" ON "renders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "renditions_asset_idx" ON "renditions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "share_links_project_idx" ON "share_links" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tenant_members_user_idx" ON "tenant_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transcript_segments_transcript_idx" ON "transcript_segments" USING btree ("transcript_id");--> statement-breakpoint
CREATE INDEX "transcript_words_segment_idx" ON "transcript_words" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "transcripts_asset_idx" ON "transcripts" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "webhooks_workspace_idx" ON "webhooks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workflows_workspace_kind_idx" ON "workflows" USING btree ("workspace_id","kind");