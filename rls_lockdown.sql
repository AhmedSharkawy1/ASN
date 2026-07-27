-- ============================================================================
-- RLS LOCKDOWN
--
-- Fixes the "Policy Exists RLS Disabled" / "RLS Disabled in Public" advisories.
--
-- Measured with the public anon key (the one shipped in every browser bundle)
-- before this script:
--
--     customers        304 rows readable
--     orders           595 rows readable
--     order_logs      1733 rows readable
--     notifications    353 rows readable
--     inventory_items   76 rows readable
--     restaurants       44 rows readable  (incl. telegram_bot_token)
--
-- RLS being off also means anon can INSERT/UPDATE/DELETE these tables, because
-- PostgREST falls back to table GRANTs and Supabase grants anon full CRUD on
-- public tables by default.
--
-- Why the earlier unified_rls_fix.sql did not stick: every policy in it is
-- "TO authenticated". Turning RLS on with only those policies leaves anon with
-- nothing, which breaks the public menu — so RLS got switched back off. This
-- script gives anon exactly the narrow access the public menu actually needs
-- and nothing else.
--
-- RUN PARTS 1-4 FIRST. Part 5 needs the matching application change and is
-- marked accordingly. Run in the Supabase SQL editor; review before applying.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- PART 0 — helpers (same definitions as unified_rls_fix.sql, kept idempotent)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin_safe()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid AS $$
DECLARE
  tid uuid;
BEGIN
  SELECT restaurant_id INTO tid FROM public.team_members WHERE auth_id = auth.uid() LIMIT 1;
  IF tid IS NOT NULL THEN RETURN tid; END IF;
  SELECT id INTO tid FROM public.restaurants WHERE email = auth.jwt()->>'email' LIMIT 1;
  RETURN tid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- PART 0b — clear out the policies that are already there.
--
-- The advisory is "Policy Exists RLS Disabled", i.e. these tables already carry
-- policies that are currently inert because RLS is off. Enabling RLS would
-- switch every one of them back on, and any leftover "USING (true) TO public"
-- would quietly undo this whole script. Drop them all first so what is left is
-- only what is written below.
--
-- Inspect before running if you want to keep any:
--   SELECT tablename, policyname, roles, cmd, qual FROM pg_policies
--    WHERE schemaname = 'public' ORDER BY tablename;
-- ---------------------------------------------------------------------------

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('restaurants','categories','items','customers','orders',
                         'order_logs','notifications','tables','delivery_zones',
                         'promotions','inventory_items')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'dropped pre-existing policy %.% -> %', r.schemaname, r.tablename, r.policyname;
  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- PART 1 — tables the public site never touches.
-- Staff only. Zero risk to the menu: nothing anonymous reads these.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tables', 'inventory_items'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_all ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_all ON public.%I
      FOR ALL TO authenticated
      USING (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
      WITH CHECK (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
    $f$, t);
  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- PART 2 — tables the public MENU reads.
--
-- anon gets SELECT and nothing else. This alone removes anonymous
-- INSERT/UPDATE/DELETE on the menu, which is open right now.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories', 'items', 'delivery_zones', 'promotions'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS public_read ON public.%I', t);
    EXECUTE format('CREATE POLICY public_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);

    EXECUTE format('DROP POLICY IF EXISTS tenant_write ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_write ON public.%I
      FOR ALL TO authenticated
      USING (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
      WITH CHECK (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
    $f$, t);
  END LOOP;
END $$;

-- items has no restaurant_id of its own; it inherits the tenant via category.
DROP POLICY IF EXISTS tenant_write ON public.items;
CREATE POLICY tenant_write ON public.items
FOR ALL TO authenticated
USING (
  public.is_super_admin_safe()
  OR EXISTS (SELECT 1 FROM public.categories c
             WHERE c.id = items.category_id AND c.restaurant_id = public.get_my_tenant_id())
)
WITH CHECK (
  public.is_super_admin_safe()
  OR EXISTS (SELECT 1 FROM public.categories c
             WHERE c.id = items.category_id AND c.restaurant_id = public.get_my_tenant_id())
);


-- ---------------------------------------------------------------------------
-- PART 3 — restaurants.
--
-- The menu needs anonymous SELECT here, but this table also holds secrets.
-- RLS is row-level only, so the secrets are handled with a column GRANT:
-- anon simply loses the privilege to select those columns at all.
-- ---------------------------------------------------------------------------

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read ON public.restaurants;
CREATE POLICY public_read ON public.restaurants
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS tenant_write ON public.restaurants;
CREATE POLICY tenant_write ON public.restaurants
FOR ALL TO authenticated
USING (id = public.get_my_tenant_id() OR public.is_super_admin_safe())
WITH CHECK (id = public.get_my_tenant_id() OR public.is_super_admin_safe());

-- Nothing on the public menu selects these; the dashboard reads them as an
-- authenticated user, which is unaffected.
-- (desktop_permissions is deliberately absent from this list — the column does
-- not exist on this database, and naming it here would abort the script.)
REVOKE SELECT (telegram_bot_token, telegram_chat_id, email)
  ON public.restaurants FROM anon;


-- ---------------------------------------------------------------------------
-- PART 4 — write-only tables for the ordering flow.
--
-- The public checkout appends to these but has no reason to ever read them.
-- INSERT with no SELECT policy means a visitor can file a record and cannot
-- read anyone's, including their own.
-- ---------------------------------------------------------------------------

-- notifications carries restaurant_id directly.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_insert ON public.notifications;
CREATE POLICY public_insert ON public.notifications
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS tenant_read ON public.notifications;
CREATE POLICY tenant_read ON public.notifications
FOR ALL TO authenticated
USING (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
WITH CHECK (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe());

-- order_logs has no restaurant_id of its own (columns are order_id, action,
-- created_at), so the tenant is reached through the order it belongs to.
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_insert ON public.order_logs;
CREATE POLICY public_insert ON public.order_logs
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS tenant_read ON public.order_logs;
CREATE POLICY tenant_read ON public.order_logs
FOR ALL TO authenticated
USING (
  public.is_super_admin_safe()
  OR EXISTS (SELECT 1 FROM public.orders o
             WHERE o.id = order_logs.order_id
               AND o.restaurant_id = public.get_my_tenant_id())
)
WITH CHECK (
  public.is_super_admin_safe()
  OR EXISTS (SELECT 1 FROM public.orders o
             WHERE o.id = order_logs.order_id
               AND o.restaurant_id = public.get_my_tenant_id())
);


-- ===========================================================================
-- PART 5 — customers and orders.  DO NOT RUN ON ITS OWN.
--
-- These two are the reason the whole thing was left open. src/lib/helpers/
-- submitOrder.ts runs the checkout in the BROWSER with the anon key, and it
-- needs to read before it writes:
--
--   customers : SELECT id,total_orders,total_spent WHERE restaurant_id + phone
--   orders    : SELECT max(order_number) WHERE restaurant_id
--
-- No RLS policy can express "only the row matching the phone you just typed",
-- so leaving anon with SELECT here would keep all 304 customers and 595 orders
-- readable — the exact hole we are closing.
--
-- The fix is to stop reading these tables from the browser at all. The two
-- SECURITY DEFINER functions below do the reads server-side and hand back only
-- the single value the checkout needs, so anon can be dropped to INSERT-only.
--
-- Apply this part ONLY together with the matching change to submitOrder.ts.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.next_order_number(p_restaurant_id uuid)
RETURNS integer AS $$
DECLARE
  next_num integer;
  start_num integer;
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO next_num
    FROM public.orders WHERE restaurant_id = p_restaurant_id;
  SELECT starting_order_number INTO start_num
    FROM public.restaurants WHERE id = p_restaurant_id;
  IF start_num IS NOT NULL AND next_num < start_num THEN
    next_num := start_num;
  END IF;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Returns only the customer id — never the row, never anyone else's.
-- The running totals are incremented here rather than in the browser. The old
-- client-side read-then-write lost updates whenever two orders for the same
-- phone overlapped; "total_spent = total_spent + x" cannot.
-- No address parameter: this table has no address column. The delivery address
-- lives on the order row (orders.customer_address), which is where the old
-- code put it too.
CREATE OR REPLACE FUNCTION public.upsert_order_customer(
  p_restaurant_id uuid,
  p_phone text,
  p_name text,
  p_order_total numeric DEFAULT 0
)
RETURNS uuid AS $$
DECLARE
  cid uuid;
BEGIN
  SELECT id INTO cid FROM public.customers
   WHERE restaurant_id = p_restaurant_id AND phone = p_phone LIMIT 1;

  IF cid IS NULL THEN
    INSERT INTO public.customers
      (restaurant_id, phone, name, total_orders, total_spent, last_order_date)
    VALUES
      (p_restaurant_id, p_phone, p_name, 1, p_order_total, now())
    RETURNING id INTO cid;
  ELSE
    UPDATE public.customers
       SET name            = COALESCE(NULLIF(p_name, ''), name),
           total_orders    = COALESCE(total_orders, 0) + 1,
           total_spent     = COALESCE(total_spent, 0) + p_order_total,
           last_order_date = now()
     WHERE id = cid;
  END IF;

  RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.next_order_number(uuid) FROM public;
REVOKE ALL ON FUNCTION public.upsert_order_customer(uuid, text, text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.next_order_number(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_order_customer(uuid, text, text, numeric) TO anon, authenticated;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_read   ON public.customers;   -- remove any blanket read
DROP POLICY IF EXISTS tenant_all    ON public.customers;
CREATE POLICY tenant_all ON public.customers
FOR ALL TO authenticated
USING (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
WITH CHECK (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe());

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_read    ON public.orders;
DROP POLICY IF EXISTS public_insert  ON public.orders;
DROP POLICY IF EXISTS tenant_all     ON public.orders;
CREATE POLICY public_insert ON public.orders
FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY tenant_all ON public.orders
FOR ALL TO authenticated
USING (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
WITH CHECK (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe());


-- ---------------------------------------------------------------------------
-- VERIFY — every row should read rls_enabled = true and have policies > 0.
-- ---------------------------------------------------------------------------

SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       count(p.polname) AS policies
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
 WHERE n.nspname = 'public'
   AND c.relkind = 'r'
   AND c.relname IN ('restaurants','categories','items','customers','orders',
                     'order_logs','notifications','tables','delivery_zones',
                     'promotions','inventory_items')
 GROUP BY c.relname, c.relrowsecurity
 ORDER BY c.relrowsecurity, c.relname;
