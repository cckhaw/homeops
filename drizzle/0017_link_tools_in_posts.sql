-- Internal links from the two starter articles to the new free tools (helps readers and search engines).
UPDATE "blog_posts"
SET "body" = "body" || E'\n\n## Estimate your yearly cost\n\nWant a quick number for your own home? Try our free [air-con service cost calculator](/tools/aircon-service-cost) for Singapore and Malaysia.\n',
    "updated_at" = now()
WHERE "slug" = 'how-often-service-aircon-singapore-malaysia' AND "body" NOT LIKE '%/tools/aircon-service-cost%';
--> statement-breakpoint
UPDATE "blog_posts"
SET "body" = "body" || E'\n\n## How long should your appliances last?\n\nCheck where each appliance stands with our free [appliance lifespan guide and age checker](/tools/appliance-lifespan).\n',
    "updated_at" = now()
WHERE "slug" = 'home-appliance-warranty-checklist' AND "body" NOT LIKE '%/tools/appliance-lifespan%';
