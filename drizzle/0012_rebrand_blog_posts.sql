-- Rebrand: HomeOps is now Wodejia. Update the wording of any existing blog posts (the starter posts were written under the old name).
UPDATE "blog_posts"
SET
  "title" = replace("title", 'HomeOps', 'Wodejia'),
  "excerpt" = replace("excerpt", 'HomeOps', 'Wodejia'),
  "seo_title" = replace("seo_title", 'HomeOps', 'Wodejia'),
  "meta_description" = replace("meta_description", 'HomeOps', 'Wodejia'),
  "body" = replace("body", 'HomeOps', 'Wodejia'),
  "author_name" = replace("author_name", 'HomeOps', 'Wodejia'),
  "updated_at" = now()
WHERE "title" LIKE '%HomeOps%' OR "excerpt" LIKE '%HomeOps%' OR "seo_title" LIKE '%HomeOps%' OR "meta_description" LIKE '%HomeOps%' OR "body" LIKE '%HomeOps%' OR "author_name" LIKE '%HomeOps%';
