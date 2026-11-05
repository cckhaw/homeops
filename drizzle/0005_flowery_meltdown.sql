ALTER TABLE "households" ADD COLUMN "icon" text DEFAULT 'house' NOT NULL;
--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD COLUMN "assigned_to" uuid;
--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD COLUMN "completed_by" uuid;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "welcome_seen_at" timestamp;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "checklist_dismissed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "calendar_token" text;
--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_completed_by_profiles_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_calendar_token_unique" UNIQUE("calendar_token");
