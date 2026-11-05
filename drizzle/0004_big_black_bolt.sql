CREATE TABLE "asset_reminders" (
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "photo_url" text;
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "currency" text;
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "climate" text DEFAULT 'temperate' NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "warranty_lead_days" integer DEFAULT 30 NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "locale" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "suspended_at" timestamp;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_login_at" timestamp;
--> statement-breakpoint
ALTER TABLE "asset_reminders" ADD CONSTRAINT "asset_reminders_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "asset_reminders" ADD CONSTRAINT "asset_reminders_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "asset_reminders_pk" ON "asset_reminders" USING btree ("user_id","asset_id","kind");
--> statement-breakpoint
CREATE INDEX "audit_log_time_idx" ON "audit_log" USING btree ("created_at");
