ALTER TABLE "articles" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "discord_published_at" timestamp with time zone;