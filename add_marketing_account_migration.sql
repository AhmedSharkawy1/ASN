-- Run this in Supabase SQL Editor to add the marketing account flag
ALTER TABLE public.restaurants
ADD COLUMN is_marketing_account BOOLEAN DEFAULT FALSE;

-- Optional: If you already have a 'demo' account, you can activate it directly:
-- UPDATE public.restaurants SET is_marketing_account = TRUE WHERE slug = 'demo';
