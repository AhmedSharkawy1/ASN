-- SQL Script to add custom slogan fields to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS slogan_ar text,
ADD COLUMN IF NOT EXISTS slogan_en text;
