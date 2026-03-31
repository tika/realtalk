CREATE TABLE "series" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story" RENAME TO "recording";--> statement-breakpoint
ALTER TABLE "error_instance" DROP CONSTRAINT "error_instance_story_id_story_id_fk";
--> statement-breakpoint
ALTER TABLE "recording" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "error_instance" ADD CONSTRAINT "error_instance_story_id_recording_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."recording"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording" ADD CONSTRAINT "recording_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;