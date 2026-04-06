ALTER TABLE "language_item" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "recording" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "user_id" text NOT NULL;
