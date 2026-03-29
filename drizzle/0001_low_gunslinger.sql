ALTER TABLE "language_item" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."language_item_type";--> statement-breakpoint
CREATE TYPE "public"."language_item_type" AS ENUM('vocab', 'phrase', 'grammar_rule');--> statement-breakpoint
ALTER TABLE "language_item" ALTER COLUMN "type" SET DATA TYPE "public"."language_item_type" USING "type"::"public"."language_item_type";--> statement-breakpoint
ALTER TABLE "error_instance" ADD COLUMN "context" text NOT NULL;--> statement-breakpoint
ALTER TABLE "error_instance" DROP COLUMN "start_time";--> statement-breakpoint
ALTER TABLE "error_instance" DROP COLUMN "end_time";