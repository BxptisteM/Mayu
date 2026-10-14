CREATE TYPE "public"."publication_intent_status" AS ENUM('pending', 'sending', 'published', 'uncertain');--> statement-breakpoint
CREATE TABLE "publication_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"kind" text NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"category" text NOT NULL,
	"item_key" text NOT NULL,
	"status" "publication_intent_status" DEFAULT 'pending' NOT NULL,
	"message_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "publication_intents_key_idx" ON "publication_intents" USING btree ("key");--> statement-breakpoint
CREATE INDEX "publication_intents_status_idx" ON "publication_intents" USING btree ("status");