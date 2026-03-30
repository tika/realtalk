ALTER TABLE "error_instance" ADD COLUMN "start_time" timestamp DEFAULT to_timestamp(0) NOT NULL;--> statement-breakpoint
ALTER TABLE "error_instance" ADD COLUMN "end_time" timestamp DEFAULT to_timestamp(0) NOT NULL;--> statement-breakpoint
ALTER TABLE "error_instance" ALTER COLUMN "start_time" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "error_instance" ALTER COLUMN "end_time" DROP DEFAULT;
