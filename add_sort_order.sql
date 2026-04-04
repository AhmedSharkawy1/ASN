ALTER TABLE "public"."items" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
