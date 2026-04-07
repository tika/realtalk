CREATE TYPE "public"."error_type" AS ENUM('hesitation', 'mistake', 'fallback');--> statement-breakpoint
CREATE TABLE "error_instance" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"error_type" "error_type" NOT NULL,
	"original_text" text NOT NULL,
	"corrected_text" text NOT NULL,
	"context" text NOT NULL,
	"severity" integer DEFAULT 5 NOT NULL,
	"start_time_ms" integer NOT NULL,
	"end_time_ms" integer NOT NULL,
	"recording_id" uuid NOT NULL,
	CONSTRAINT "severity_in_range" CHECK ("error_instance"."severity" >= 1 AND "error_instance"."severity" <= 10)
);
--> statement-breakpoint
CREATE TABLE "recording" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audio_key" text NOT NULL,
	"prompt" text NOT NULL,
	"target_words" text[] DEFAULT '{}'::text[] NOT NULL,
	"topic_id" uuid NOT NULL,
	"timestamps" json,
	"transcript" text,
	"user_id" uuid NOT NULL,
	"missed_target_words" text[] DEFAULT '{}'::text[],
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "topic" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"words" text[] DEFAULT '{}'::text[] NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "topic_name_user_unique" UNIQUE("name","user_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"native_language" text NOT NULL,
	"target_language" text NOT NULL,
	CONSTRAINT "user_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "error_instance" ADD CONSTRAINT "error_instance_recording_id_recording_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recording"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording" ADD CONSTRAINT "recording_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording" ADD CONSTRAINT "recording_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic" ADD CONSTRAINT "topic_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;