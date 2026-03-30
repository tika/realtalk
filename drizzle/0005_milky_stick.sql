ALTER TABLE "error_instance" RENAME COLUMN "start_time" TO "start_time_ms";--> statement-breakpoint
ALTER TABLE "error_instance" ALTER COLUMN "start_time_ms" TYPE integer USING 0;--> statement-breakpoint
ALTER TABLE "error_instance" RENAME COLUMN "end_time" TO "end_time_ms";--> statement-breakpoint
ALTER TABLE "error_instance" ALTER COLUMN "end_time_ms" TYPE integer USING 0;
