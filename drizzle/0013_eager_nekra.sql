CREATE TABLE "brand_assets" (
	"kind" text PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"data" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"rev" text NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ALTER COLUMN "author_name" SET DEFAULT 'Wodejia Team';--> statement-breakpoint
ALTER TABLE "brand_assets" ADD CONSTRAINT "brand_assets_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;