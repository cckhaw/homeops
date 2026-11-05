CREATE TABLE "task_reminders" (
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "passport_password_hash" text;
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "passport_failed" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "passport_locked_until" timestamp;
--> statement-breakpoint
ALTER TABLE "login_tokens" ADD COLUMN "purpose" text DEFAULT 'reset' NOT NULL;
--> statement-breakpoint
ALTER TABLE "login_tokens" ADD COLUMN "payload" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "password_hash" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email_verified_at" timestamp;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "totp_secret" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "totp_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "totp_last_step" integer;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "recovery_codes" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "failed_attempts" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "locked_until" timestamp;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "notify_reminders" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "reminder_lead_days" integer DEFAULT 3 NOT NULL;
--> statement-breakpoint
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_task_id_maintenance_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."maintenance_tasks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "task_reminders_pk" ON "task_reminders" USING btree ("user_id","task_id");
--> statement-breakpoint
UPDATE "profiles" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;
--> statement-breakpoint
DELETE FROM "login_tokens";
