-- ============================================================================
-- Super-admin switch to take a restaurant's public menu offline.
--
-- Distinct from orders_enabled, which only hides the ordering flow while the
-- menu stays readable. This takes the whole public page down — for a client
-- who has not paid, or one who asked to be paused — while leaving their
-- dashboard and data untouched so nothing is lost and switching back is
-- instant.
--
-- Defaults to true, so every existing restaurant stays live when this runs.
-- ============================================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS menu_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.restaurants.menu_enabled IS
  'Super-admin switch. false takes the public menu offline; the dashboard and all data stay intact.';

-- The public menu reads this column anonymously, so anon must be able to see
-- it. Part 4 of rls_lockdown.sql revoked only the secret columns, so a plain
-- grant is all that is needed here.
GRANT SELECT (menu_enabled) ON public.restaurants TO anon, authenticated;

-- Check the result: every restaurant should come back enabled.
SELECT menu_enabled, count(*) AS restaurants
  FROM public.restaurants
 GROUP BY menu_enabled;
