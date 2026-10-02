-- Migration: Add is_new column to items table
-- Allows marking items as new arrivals / "جديدنا" for themes (e.g. Theme 31, 30, 28, 29)

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.items.is_new IS
  'Flag indicating whether the item is marked as new arrival ("جديدنا")';

GRANT SELECT (is_new) ON public.items TO anon, authenticated;
GRANT UPDATE (is_new) ON public.items TO authenticated;

UPDATE public.items
   SET is_new = false
 WHERE is_new IS NULL;

-- Verification query
SELECT is_new, count(*) AS items_count
  FROM public.items
 GROUP BY is_new;
