-- Show the table's real name in a waiter call, not its UUID.
--
-- A QR code may carry the table's id rather than its label — every code printed
-- before the app started sending labels does. The alert then read
-- "ترابيزة 4c7f9b9c-0751-…" which is useless to a waiter.
--
-- Resolving it here rather than in the app fixes it for every client at once,
-- including codes already printed and stuck on tables. SECURITY DEFINER because
-- the customer pressing the button is anonymous and cannot read `tables`.
--
-- Safe to run more than once.

-- Keep the id when we have it, so a renamed table can still be traced back.
ALTER TABLE public.waiter_calls
    ADD COLUMN IF NOT EXISTS table_id uuid;

CREATE OR REPLACE FUNCTION public.resolve_waiter_call_table()
RETURNS trigger AS $$
DECLARE
    resolved text;
BEGIN
    -- Only when what arrived looks like an id rather than a name.
    IF NEW.table_number ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF NEW.table_id IS NULL THEN
            NEW.table_id := NEW.table_number::uuid;
        END IF;

        SELECT t.label INTO resolved
        FROM public.tables t
        WHERE t.id = NEW.table_number::uuid
          AND t.restaurant_id = NEW.restaurant_id;

        -- A table that no longer exists keeps the id: a waiter reading a UUID
        -- is bad, but losing the call entirely is worse.
        IF resolved IS NOT NULL AND btrim(resolved) <> '' THEN
            NEW.table_number := btrim(resolved);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS waiter_calls_resolve_table ON public.waiter_calls;
CREATE TRIGGER waiter_calls_resolve_table
    BEFORE INSERT ON public.waiter_calls
    FOR EACH ROW
    EXECUTE FUNCTION public.resolve_waiter_call_table();

-- Clean up the calls already recorded with an id, so the list reads properly.
UPDATE public.waiter_calls w
SET table_id = w.table_number::uuid,
    table_number = t.label
FROM public.tables t
WHERE t.id::text = w.table_number
  AND t.restaurant_id = w.restaurant_id
  AND w.table_number ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Verify: no call should still be showing a UUID for a table that exists.
SELECT count(*) AS calls_still_showing_an_id
FROM public.waiter_calls
WHERE table_number ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
