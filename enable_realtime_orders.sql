-- Enable Realtime for order alerts.
--
-- Without this the app's INSERT subscription fails with:
--   "Unable to subscribe to changes with given parameters.
--    Please check Realtime is enabled for the given connect parameters"
-- and new-order notifications only arrive on the background poll cycle
-- (up to 45s late) instead of the instant they are placed.
--
-- Adding a table to the publication does NOT bypass RLS: Realtime still
-- evaluates the subscriber's policies, so each user only receives rows for
-- their own restaurant. Nothing about existing behaviour changes.
--
-- Safe to run more than once.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        RAISE NOTICE 'orders added to supabase_realtime';
    ELSE
        RAISE NOTICE 'orders already in supabase_realtime — nothing to do';
    END IF;
END $$;

-- Realtime sends only the primary key in the old record on UPDATE/DELETE
-- unless the table replicates full rows. The app reads the new row on INSERT,
-- so DEFAULT would be enough today; FULL keeps update-driven features (order
-- status changes) working without a second migration later.
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Verify: this should return one row.
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'orders';
