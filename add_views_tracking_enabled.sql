-- ============================================================================
-- Per-restaurant toggle for the menu views / مشاهدات tracking feature.
--
-- When false the public menu page will NOT fire the POST /api/menu-views
-- call, and the API itself will reject any stray increments.  The existing
-- view count is preserved so it picks up where it left off if re-enabled.
--
-- Defaults to true so every existing restaurant keeps tracking on deploy.
-- ============================================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS views_tracking_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.restaurants.views_tracking_enabled IS
  'Per-restaurant switch. false disables the menu views counter without affecting the menu itself.';

-- The public menu reads this column anonymously to decide whether to track.
GRANT SELECT (views_tracking_enabled) ON public.restaurants TO anon, authenticated;

-- Sanity check
SELECT views_tracking_enabled, count(*) AS restaurants
  FROM public.restaurants
 GROUP BY views_tracking_enabled;
