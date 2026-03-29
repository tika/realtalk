CREATE TYPE "public"."error_type" AS ENUM('hesitation', 'blank', 'mistake');--> statement-breakpoint
CREATE TYPE "public"."language_item_type" AS ENUM('word', 'sentence', 'paragraph');--> statement-breakpoint
CREATE TABLE "error_instance" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"corrected_text" text NOT NULL,
	"error_type" "error_type" NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"language_item_id" uuid,
	"original_text" text NOT NULL,
	"story_id" uuid NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "language_item" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"native_text" text NOT NULL,
	"target_text" text NOT NULL,
	"type" "language_item_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audio_url" text NOT NULL,
	"prompt" text NOT NULL,
	"transcript" text,
	"timestamps" json
);
--> statement-breakpoint
ALTER TABLE "error_instance" ADD CONSTRAINT "error_instance_language_item_id_language_item_id_fk" FOREIGN KEY ("language_item_id") REFERENCES "public"."language_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_instance" ADD CONSTRAINT "error_instance_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE no action ON UPDATE no action;