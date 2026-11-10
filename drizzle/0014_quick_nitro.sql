ALTER TABLE "profiles" ADD COLUMN "notify_telegram" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "telegram_chat_id" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "telegram_linked_at" timestamp;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "telegram_link_hash" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "telegram_link_expires" timestamp;