ALTER TABLE "language_item" ADD COLUMN "purpose" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "language_item" ALTER COLUMN "purpose" DROP DEFAULT;
