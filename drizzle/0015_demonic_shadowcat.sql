CREATE TABLE "condition_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"room" text NOT NULL,
	"item" text NOT NULL,
	"condition" text NOT NULL,
	"notes" text,
	"photo_url" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "condition_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"tenancy_id" uuid,
	"kind" text NOT NULL,
	"inspected_on" date NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rent_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenancy_id" uuid NOT NULL,
	"period" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"paid_on" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"tenant_name" text NOT NULL,
	"tenant_phone" text,
	"tenant_email" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"rent_cents" integer NOT NULL,
	"due_day" integer NOT NULL,
	"deposit_cents" integer,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"ended_on" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD COLUMN "tenancy_id" uuid;--> statement-breakpoint
ALTER TABLE "condition_items" ADD CONSTRAINT "condition_items_report_id_condition_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."condition_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_reports" ADD CONSTRAINT "condition_reports_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_reports" ADD CONSTRAINT "condition_reports_tenancy_id_tenancies_id_fk" FOREIGN KEY ("tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_reports" ADD CONSTRAINT "condition_reports_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_payments" ADD CONSTRAINT "rent_payments_tenancy_id_tenancies_id_fk" FOREIGN KEY ("tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "condition_items_report_idx" ON "condition_items" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "condition_reports_household_idx" ON "condition_reports" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rent_payments_period_idx" ON "rent_payments" USING btree ("tenancy_id","period");--> statement-breakpoint
CREATE INDEX "tenancies_household_idx" ON "tenancies" USING btree ("household_id","status");--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_tenancy_id_tenancies_id_fk" FOREIGN KEY ("tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE cascade ON UPDATE no action;