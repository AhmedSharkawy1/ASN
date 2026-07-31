-- "Call the waiter" from the menu.
--
-- A customer sitting at a table opens the menu from its QR code and presses a
-- button; the restaurant's phone gets an alert naming the table. Off by
-- default, so nothing changes for any restaurant until it is switched on.
--
-- Safe to run more than once.

-- 1. The switch, per restaurant.
ALTER TABLE public.restaurants
    ADD COLUMN IF NOT EXISTS waiter_call_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.restaurants.waiter_call_enabled IS
    'Shows the "call the waiter" button on the menu when opened from a table QR code.';

-- 2. The calls themselves.
CREATE TABLE IF NOT EXISTS public.waiter_calls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number text NOT NULL,
    -- pending → the floor has not answered yet; resolved → someone went.
    status text NOT NULL DEFAULT 'pending',
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolved_by uuid
);

-- The app reads "recent calls for my restaurant, newest first" on every poll.
CREATE INDEX IF NOT EXISTS waiter_calls_restaurant_created_idx
    ON public.waiter_calls (restaurant_id, created_at DESC);

-- 3. RLS. The customer pressing the button is anonymous: it may create a call
--    and nothing else. Staff see and resolve only their own restaurant's.
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waiter_calls_insert_anon ON public.waiter_calls;
CREATE POLICY waiter_calls_insert_anon
    ON public.waiter_calls
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        -- Only for a restaurant that has the feature switched on, so a stale
        -- link cannot be used to spam a restaurant that turned it off.
        EXISTS (
            SELECT 1 FROM public.restaurants r
            WHERE r.id = restaurant_id
              AND r.waiter_call_enabled = true
        )
    );

-- Scoping reuses the helpers rls_lockdown.sql already defines, so this table
-- resolves a user's restaurant exactly the way every other table does.
DROP POLICY IF EXISTS waiter_calls_select_staff ON public.waiter_calls;
CREATE POLICY waiter_calls_select_staff
    ON public.waiter_calls
    FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS waiter_calls_update_staff ON public.waiter_calls;
CREATE POLICY waiter_calls_update_staff
    ON public.waiter_calls
    FOR UPDATE
    TO authenticated
    USING (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin());

-- 4. Realtime, so the alert is instant rather than waiting for the next poll.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'waiter_calls'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_calls;
        RAISE NOTICE 'waiter_calls added to supabase_realtime';
    END IF;
END $$;

-- Verify: the column, the table, and the publication entry.
SELECT
    (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'restaurants'
        AND column_name = 'waiter_call_enabled')                AS switch_added,
    (SELECT count(*) FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'waiter_calls') AS table_added,
    (SELECT count(*) FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'waiter_calls') AS realtime_on;
