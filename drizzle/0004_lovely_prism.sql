CREATE TABLE "github_repositories" (
	"github_id" bigint PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"language" text,
	"stars" integer NOT NULL,
	"forks" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"pushed_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_id" bigint NOT NULL,
	"stars" integer NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "podcast_episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"podcast_name" text NOT NULL,
	"guid" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"category" text NOT NULL,
	"item_key" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_publications_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
ALTER TABLE "github_snapshots" ADD CONSTRAINT "github_snapshots_github_id_github_repositories_github_id_fk" FOREIGN KEY ("github_id") REFERENCES "public"."github_repositories"("github_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_snapshots_repository_time_idx" ON "github_snapshots" USING btree ("github_id","captured_at");--> statement-breakpoint
CREATE INDEX "podcast_episodes_published_idx" ON "podcast_episodes" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "discovery_publications_item_idx" ON "discovery_publications" USING btree ("guild_id","category","item_key");--> statement-breakpoint
CREATE INDEX "discovery_publications_date_idx" ON "discovery_publications" USING btree ("category","published_at");