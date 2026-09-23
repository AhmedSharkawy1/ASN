-- ============================================================================
-- Migration: Add is_available column to categories table
-- Description: Allows merchants to hide or show an entire category (and its items)
--              using the eye icon in the Menu Builder, identical to item visibility.
-- Defaults to true so all existing categories remain visible.
-- ============================================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.categories.is_available IS
  'Toggle to show/hide category from public menu. false hides category and all its items.';

-- Ensure permissions for authenticated and anon users
GRANT SELECT (is_available) ON public.categories TO anon, authenticated;
GRANT UPDATE (is_available) ON public.categories TO authenticated;

-- Backfill any existing NULL records to true
UPDATE public.categories
   SET is_available = true
 WHERE is_available IS NULL;

-- Verification query
SELECT is_available, count(*) AS categories_count
  FROM public.categories
 GROUP BY is_available;
