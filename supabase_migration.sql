-- Run this in Supabase SQL Editor to add multi-phone support
-- and ensure logo/cover columns exist

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone_numbers jsonb DEFAULT '[]';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cover_url text;

-- Make sure the categories table has image_url
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url text;

-- Make sure the items table has all required columns
ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS desc_ar text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS desc_en text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS title_en text;

-- Theme color customization
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS theme_colors jsonb DEFAULT '{}';
