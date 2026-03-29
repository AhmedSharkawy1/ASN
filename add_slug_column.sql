-- Run this in your Supabase SQL Editor
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS slug text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
