-- ============================================================================
-- Migration: Add is_popular column to categories table
-- Description: Allows merchants to mark an entire category as featured/popular.
-- ============================================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.categories.is_popular IS
  'Toggle to mark an entire category as featured/popular in the menu.';

-- Ensure permissions for authenticated and anon users
GRANT SELECT (is_popular) ON public.categories TO anon, authenticated;
GRANT UPDATE (is_popular) ON public.categories TO authenticated;

-- Backfill any existing NULL records to false
UPDATE public.categories
   SET is_popular = false
 WHERE is_popular IS NULL;

-- Verification query
SELECT is_popular, count(*) AS categories_count
  FROM public.categories
 GROUP BY is_popular;
