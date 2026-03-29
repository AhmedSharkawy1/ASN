-- قم بنسخ هذا الكود وتشغيله في صفحة SQL Editor في لوحة تحكم Supabase الخاص بك

ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS slogan_ar text;

ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS slogan_en text;
