ALTER TABLE "assets" ADD COLUMN "make" text;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "model" text;--> statement-breakpoint
UPDATE "assets" SET "model" = "make_model" WHERE "make_model" IS NOT NULL AND "model" IS NULL;
