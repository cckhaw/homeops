CREATE TABLE "contractor_homes" (
	"contractor_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	CONSTRAINT "contractor_homes_contractor_id_household_id_pk" PRIMARY KEY("contractor_id","household_id")
);
--> statement-breakpoint
-- keep every existing contractor attached to the home it was created in
INSERT INTO "contractor_homes" ("contractor_id", "household_id") SELECT "id", "household_id" FROM "contractors" WHERE "household_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "contractors" DROP CONSTRAINT "contractors_household_id_households_id_fk";
--> statement-breakpoint
DROP INDEX "contractors_household_idx";--> statement-breakpoint
ALTER TABLE "contractor_homes" ADD CONSTRAINT "contractor_homes_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_homes" ADD CONSTRAINT "contractor_homes_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contractor_homes_home_idx" ON "contractor_homes" USING btree ("household_id");--> statement-breakpoint
ALTER TABLE "contractors" DROP COLUMN "household_id";