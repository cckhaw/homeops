CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"category" text NOT NULL,
	"tags" text DEFAULT '' NOT NULL,
	"author_name" text DEFAULT 'HomeOps Team' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_posts_live_idx" ON "blog_posts" USING btree ("status","publish_at");
--> statement-breakpoint
-- Starter posts. The first is live now; the second is scheduled for 13 Nov 2026, 09:00 Singapore time (01:00 UTC).
INSERT INTO "blog_posts" ("slug", "title", "excerpt", "body", "category", "tags", "author_name", "status", "publish_at") VALUES
($md$how-often-should-you-service-your-air-con-in-singapore-malaysia$md$, $md$How often should you service your air-con in Singapore/Malaysia?$md$, $md$A practical servicing schedule for the tropics: what to clean yourself, when to book a general service or chemical wash, and the warning signs that mean it is overdue.$md$, $md$If you live in Singapore or Malaysia, your air-con is probably the hardest-working appliance in the house. It runs for hours every day, in heat and humidity that never really let up. So the question isn't *whether* to service it — it's how often, and what "a service" should actually include.

## The short answer

For a home air-con that is used daily:

- **Wash the filters yourself every 2–4 weeks.**
- **Book a general service every 3–4 months.** If the unit is only used lightly (say, a bedroom unit at night), every 6 months is a reasonable minimum.
- **Book a chemical wash about once a year**, or every 6 months for heavily used units.
- **Plan a full chemical overhaul every 1–2 years**, or sooner if a musty smell or weak cooling keeps coming back.

These are common local practice, not a legal rule. Your manual and your technician's advice about *your* unit come first.

## Why our climate is tougher on air-cons

An air-con in a temperate country might run for a few weeks a year. Here it can run for ten hours or more a day, every day. That has a few effects:

- **Constant moisture.** The indoor coil is wet whenever the unit cools, which is the perfect place for mould and slime to grow. That is where the musty smell comes from.
- **Dust and grime build up fast.** Construction nearby, hazy periods, cooking fumes drifting from the kitchen, pets and open windows all load the filters and coils.
- **Clogged drains cause leaks.** The condensate drain carries away the water the unit pulls from the air. Slime and dirt can block it, and then the water drips into your room.
- **Salt air** near the coast can corrode the outdoor unit.

## A simple servicing schedule

| What | Who does it | How often | Why it matters |
|---|---|---|---|
| Wash the filters | You | Every 2–4 weeks | Keeps airflow strong and the unit working less hard |
| General service | Technician | Every 3–4 months (6 for light use) | Cleans the indoor unit, checks the drain and the outdoor unit |
| Chemical wash | Technician | Every 6–12 months | Deep-cleans the coil and blower where mould builds up |
| Chemical overhaul | Technician | Every 1–2 years, or when problems return | Dismantles the indoor unit for a full clean |
| Refrigerant (gas) check | Technician | Only when cooling drops | Gas isn't "used up" — if it's low, there is a leak to fix |

## Signs your air-con is overdue

Don't wait for the calendar if you notice any of these:

- It takes longer than before to cool the room.
- **Water drips** from the indoor unit.
- A **musty or sour smell** when it starts.
- Unusual noises, or ice forming on the pipes.
- The **electricity bill creeps up** although you use it the same way.
- Dust or dark specks blowing out of the vents.

## What a proper service should include

Ask the technician to confirm the visit covers:

- [ ] Filters cleaned
- [ ] Indoor coil and blower wheel cleaned
- [ ] Drain tray and condensate pipe cleared
- [ ] Outdoor unit coil cleaned and its surroundings checked for blockages
- [ ] Electrical connections and capacitor checked
- [ ] Refrigerant pressure checked (no top-up unless a leak is found and fixed)
- [ ] Temperature drop measured to show it is cooling properly

Always ask for an invoice or job sheet that says what was done. Some warranties and service contracts expect regular maintenance, so a paper trail protects you.

## Do you really need it as often as the shop says?

It depends on how you use the unit:

- **Living-room unit running most of the day:** every 3 months is sensible.
- **Bedroom unit used at night:** every 4–6 months is usually fine.
- **Rarely used guest-room unit:** once or twice a year, and run it for a while every month so it doesn't sit damp.

A good technician will show you the dirty filter or wash water so you can judge for yourself. Be cautious about routine "gas top-ups" — if the gas is low, the right fix is finding the leak.

## Small habits that make servicing go further

- Set the temperature around 24–25°C instead of the lowest setting; it is kinder to your bill and the compressor.
- Keep doors and windows closed while it runs.
- Keep plants, boxes and clutter away from the outdoor unit so air can flow.
- Don't leave a wet, unused unit shut up for weeks — run it on fan mode for a while to dry the coil.

## Never forget a service again

The hard part isn't knowing the schedule — it's remembering. With HomeOps you can add each air-con as an asset (brand, model, serial number, warranty), get seasonal air-con servicing tasks for tropical homes that reschedule themselves when you tick them off, and receive a reminder by e-mail or push notification. Log each service with the contractor and cost, and your yearly spending report shows what keeping the house cool really costs.

[Create your free HomeOps account](/register) and put your air-cons on a schedule today.
$md$, $md$Maintenance$md$, $md$aircon,maintenance,singapore,malaysia$md$, 'HomeOps Team', 'published', now()),
($md$ultimate-home-appliance-warranty-checklist$md$, $md$The Ultimate Home Appliance Warranty Checklist$md$, $md$From the shop counter to your final week of cover: a step-by-step checklist so you never lose a warranty claim to missing paperwork.$md$, $md$A warranty only helps you if you can prove when you bought the appliance, say exactly what it is, and make your claim before the cover runs out. Most people can't do all three when the washing machine suddenly stops. This checklist walks you through the whole life of a warranty — from the shop counter to the final week of cover — so you never lose a claim to missing paperwork.

## 1. When you buy

- [ ] **Keep the receipt or invoice.** Take a photo straight away and keep the original. It proves your purchase date.
- [ ] **Write down the model and serial number.** They are usually on a sticker at the back, side or inside the door.
- [ ] **Register the product** if the brand asks you to, and note any deadline for doing so.
- [ ] **Read what is covered — and what isn't.** Look at parts versus labour, whether repairs happen at home or at a service centre, and exclusions such as accidental damage or commercial use.
- [ ] **Find out when the warranty starts**: the purchase date, the delivery date or the installation date can all be different.
- [ ] **Check any extended warranty separately.** Note who provides it, what it adds and when it begins.
- [ ] **Keep the manual and quick-start guide**, and note whether the warranty requires professional installation.
- [ ] **Photograph the item as delivered**, so any transport damage is documented.

## 2. In the first month at home

- [ ] **Test every function** while the shop's return or exchange window is still open.
- [ ] **Record the installation date** and the installer's name and contact details.
- [ ] **File the warranty card** and save the service hotline number.
- [ ] **Set a reminder** for about 60 days before the warranty ends.

## 3. During the warranty

- [ ] **Follow the maintenance the maker asks for** — cleaning filters, descaling, servicing — and keep proof you did.
- [ ] **Use authorised repairers**, because some warranties are void if someone else opens the appliance.
- [ ] **Use it as intended**, on the right power supply, ideally through a surge protector.
- [ ] **Keep a service history** of every repair or visit, with the date, who did it and what it cost.

## 4. The last 60 days

This is the most valuable time to check, because claims have to be made before the cover ends.

- [ ] **Run every program and function** and note anything odd.
- [ ] **Photograph or film any fault**, including the date it appears.
- [ ] **Report problems now**, not after the expiry date.
- [ ] **Decide whether to extend the cover**, based on the repair cost and the age of the appliance.

## 5. Making a claim

- [ ] **Gather your proof**: receipt, serial number, warranty card and photos or video of the fault.
- [ ] **Contact the manufacturer's authorised service centre** (or the retailer, if they handle claims) and say clearly what is wrong.
- [ ] **Get a job reference number**, and note the date, the name of the person and what was promised.
- [ ] **Ask in writing what is covered**, how long the repair should take and whether you pay anything.
- [ ] **Keep every repair document** — it proves what was fixed, when and by whom.
- [ ] **Know your rights if you are refused.** Consumer-protection laws give you baseline rights beyond the printed warranty — for example Singapore's Consumer Protection (Fair Trading) Act and Malaysia's Consumer Protection Act 1999. Consumer organisations such as CASE in Singapore and the National Consumer Complaints Centre in Malaysia can advise on next steps.

## Where to find the serial number

| Appliance | Look here |
|---|---|
| Fridge | Inside the door frame or on the back panel |
| Washing machine | Around the door opening or on the back |
| Air-conditioner | Side of the indoor unit (often under a flap) and the outdoor unit label |
| Television | Back panel, near the ports |
| Water heater | Label on the tank or the underside |
| Oven and hob | Door frame, edge of the oven cavity, or under the hob |

If you can't find it, check the box, the invoice and the manual — and take a photo of the sticker as soon as you do.

## The one-page version

If you remember nothing else:

1. **Keep proof of purchase** (receipt, with a photo backup).
2. **Record the model, serial number and warranty end date.**
3. **Set a reminder** well before the warranty ends.
4. **Test everything** in the last 60 days and claim before expiry.

## Keep it all in one place

Paper receipts fade, e-mails get buried and warranty cards disappear. HomeOps keeps every appliance, receipt, manual, serial number and warranty date together. It can read a receipt from a photo, warn you 30, 60 or 90 days before a warranty ends, store insurance and other documents in a private vault, and hand over a complete move-out pack when you sell or rent out your home.

[Create your free HomeOps account](/register) and turn this checklist into reminders that find you.
$md$, $md$Warranties$md$, $md$warranty,appliances,checklist,receipts$md$, 'HomeOps Team', 'published', '2026-11-13 01:00:00')
ON CONFLICT ("slug") DO NOTHING;
