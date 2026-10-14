CREATE TYPE "public"."ai_reservation_status" AS ENUM('reserved', 'completed', 'uncertain');--> statement-breakpoint
CREATE TABLE "ai_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" text NOT NULL,
	"operation" text NOT NULL,
	"status" "ai_reservation_status" DEFAULT 'reserved' NOT NULL,
	"reserved_usd" numeric(14, 10) NOT NULL,
	"actual_usd" numeric(14, 10),
	"input_tokens" integer,
	"output_tokens" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "ai_reservations_created_idx" ON "ai_reservations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_reservations_status_idx" ON "ai_reservations" USING btree ("status");