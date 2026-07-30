-- ============================================================================
-- RLS LOCKDOWN  (rewritten after reading the live pg_policies output)
--
-- The first version of this file dropped every policy on the tables it touched
-- and rebuilt them. That was wrong here, for two reasons that only became
-- visible once the actual policies were listed:
--
--   * pci_access_*  uses is_my_child_tenant(), which is the parent/branch
--     feature. final_*_access and unified_*_access encode the owner-by-email
--     and team_members paths. Dropping those and substituting a simpler
--     get_my_tenant_id() check would have cut parent restaurants off from
--     their own branches.
--
--   * the table list was far too short. It covered 11 tables. The real problem
--     spans about 23, including HR and recipes, which were not in it at all.
--
-- So this version ADDS rather than REPLACES. Every existing authenticated
-- policy is left exactly as it is; policies are OR'ed, so adding one can only
-- widen authenticated access, never narrow it. The only things dropped are the
-- named wide-open {public} policies listed in part 1.
--
-- Why those matter: in Postgres the role `public` means EVERYONE, including
-- anon — the key shipped in every browser bundle. A policy reading
-- `{public} ALL USING (true)` is not a restriction, it is an open door.
-- Measured with that key, before this script:
--
--     order_logs             1735 rows      inventory_items         76 rows
--     customers               304 rows      delivery_zones          50 rows
--     inventory_transactions  304 rows      recipes                 24 rows
--     orders                  595 rows      production_batches      12 rows
--     production_requests      95 rows      promotions              10 rows
--     notifications           353 rows      supplies                10 rows
--     hr_employees              3 rows      hr_attendance            3 rows
--     hr_locations              3 rows      suppliers                1 row
--
-- Most of those also carry {public} INSERT/UPDATE/DELETE, so the same key can
-- write and delete them. hr_employees and hr_payroll are staff records and
-- salaries; recipes are the restaurant's own costings.
--
-- Run part by part and test in between. Nothing here is irreversible: any
-- table can be reopened with
--     ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
-- ============================================================================


-- ---------------------------------------------------------------------------
-- PART 0 — helper used by the policies added below.
-- is_my_child_tenant / is_sa_final / get_tid_final already exist and are left
-- alone; this only (re)creates the two this script itself relies on.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin_safe()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles
                  WHERE user_id = auth.uid() AND role = 'super_admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid AS $$
DECLARE tid uuid;
BEGIN
  SELECT restaurant_id INTO tid FROM public.team_members WHERE auth_id = auth.uid() LIMIT 1;
  IF tid IS NOT NULL THEN RETURN tid; END IF;
  SELECT id INTO tid FROM public.restaurants WHERE email = auth.jwt()->>'email' LIMIT 1;
  RETURN tid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- PART 1 — drop ONLY the wide-open {public} policies, by name.
--
-- Everything named here was verified as `{public}` with `USING (true)` or an
-- unconditional INSERT. Nothing else is touched: every pci_access_*, final_*,
-- unified_*, and super_admin_access_all policy survives untouched.
--
-- Deliberately NOT dropped, because the public menu needs them:
--     categories.public_select_categories
--     items.public_select_items
--     restaurants.public_select_restaurants
--     addons."Public can read active addons"   (already limited to is_active)
--     print_settings."Restaurants can view own print settings"   (has a real qual)
--     print_settings."Restaurants can update own print settings" (has a real qual)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
  doomed text[][] := ARRAY[
    ['addons','Restaurant owners can manage addons'],
    ['hr_attendance','hr_attendance_all'],
    ['hr_deduction_rules','hr_deduction_rules_all'],
    ['hr_deductions','hr_deductions_all'],
    ['hr_employees','hr_employees_all'],
    ['hr_locations','hr_locations_all'],
    ['hr_payroll','hr_payroll_all'],
    ['hr_payroll_items','hr_payroll_items_all'],
    ['hr_work_schedules','hr_work_schedules_all'],
    ['inventory_items','inventory_items_select'],
    ['inventory_items','inventory_items_insert'],
    ['inventory_items','inventory_items_update'],
    ['inventory_items','inventory_items_delete'],
    ['inventory_transactions','inventory_transactions_select'],
    ['inventory_transactions','inventory_transactions_insert'],
    ['print_settings','Allow all authenticated operations'],
    ['print_settings','Restaurants can insert own print settings'],
    ['production_batches','production_batches_select'],
    ['production_batches','production_batches_insert'],
    ['production_batches','production_batches_update'],
    ['production_batches','production_batches_delete'],
    ['production_requests','production_requests_select'],
    ['production_requests','production_requests_insert'],
    ['production_requests','production_requests_update'],
    ['production_requests','production_requests_delete'],
    ['promotions','Users can view their restaurant promotions'],
    ['promotions','Users can insert their restaurant promotions'],
    ['promotions','Users can update their restaurant promotions'],
    ['promotions','Users can delete their restaurant promotions'],
    ['recipe_ingredients','recipe_ingredients_select'],
    ['recipe_ingredients','recipe_ingredients_insert'],
    ['recipe_ingredients','recipe_ingredients_update'],
    ['recipe_ingredients','recipe_ingredients_delete'],
    ['recipes','recipes_select'],
    ['recipes','recipes_insert'],
    ['recipes','recipes_update'],
    ['recipes','recipes_delete'],
    ['suppliers','suppliers_select'],
    ['suppliers','suppliers_insert'],
    ['suppliers','suppliers_update'],
    ['suppliers','suppliers_delete'],
    ['supplies','supplies_select'],
    ['supplies','supplies_insert'],
    ['supplies','supplies_update'],
    ['supplies','supplies_delete']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(doomed, 1) LOOP
    IF to_regclass('public.' || doomed[i][1]) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', doomed[i][2], doomed[i][1]);
      RAISE NOTICE 'dropped open policy %.%', doomed[i][1], doomed[i][2];
    END IF;
  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- PART 2 — an owner/staff policy for every table, added alongside whatever is
-- already there. Additive: policies are OR'ed, so this can only grant, and it
-- fills the gaps where a table had only pci_access_* (branches) or nothing.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  -- items is deliberately NOT here: it has no restaurant_id of its own and is
  -- handled separately below. Listing it made this loop fail on the first run.
  by_restaurant text[] := ARRAY[
    'categories','delivery_zones','promotions','addons','tables',
    'inventory_items','inventory_transactions','recipes','suppliers','supplies',
    'production_batches','production_requests','print_settings','customers','orders'
  ];
  by_tenant text[] := ARRAY[
    'hr_employees','hr_payroll','hr_deductions','hr_deduction_rules',
    'hr_attendance','hr_locations','hr_work_schedules','activity_logs'
  ];
BEGIN
  FOREACH t IN ARRAY by_restaurant LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_access ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY owner_access ON public.%I FOR ALL TO authenticated
      USING (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
      WITH CHECK (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
    $f$, t);
  END LOOP;

  FOREACH t IN ARRAY by_tenant LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_access ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY owner_access ON public.%I FOR ALL TO authenticated
      USING (tenant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
      WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
    $f$, t);
  END LOOP;
END $$;

-- items has no restaurant_id; it belongs to a tenant through its category.
--
-- Two earlier attempts wrote the check inline in the policy. Both refused the
-- Excel import with "new row violates row-level security policy for table
-- items" even for a plain restaurant owner, with the category in the same run
-- written successfully. The inline version depends on how a subquery inside a
-- policy interacts with the referenced table's own RLS, which is the part that
-- could not be pinned down from outside the database.
--
-- So the check moved into a SECURITY DEFINER function, which reads categories
-- as the owner with no RLS involved at all. The ambiguity is gone: the
-- function either finds the category and its tenant or it does not.
--
-- It covers the same three routes categories itself allows — the caller's own
-- tenant, a branch of it via is_my_child_tenant(), and super admin — so an
-- owner, a team member and a parent restaurant all keep working.
CREATE OR REPLACE FUNCTION public.can_manage_category(p_category_id uuid)
RETURNS boolean AS $$
DECLARE
  owner_id uuid;
BEGIN
  IF public.is_super_admin_safe() THEN RETURN true; END IF;
  IF p_category_id IS NULL THEN RETURN false; END IF;

  SELECT restaurant_id INTO owner_id
    FROM public.categories WHERE id = p_category_id;
  IF owner_id IS NULL THEN RETURN false; END IF;

  IF owner_id = public.get_my_tenant_id() THEN RETURN true; END IF;

  -- is_my_child_tenant is pre-existing and may not be present on every
  -- deployment; treat a missing function as "not a branch" rather than failing.
  BEGIN
    RETURN public.is_my_child_tenant(owner_id);
  EXCEPTION WHEN undefined_function THEN
    RETURN false;
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_access ON public.items;
CREATE POLICY owner_access ON public.items FOR ALL TO authenticated
USING (public.can_manage_category(category_id))
WITH CHECK (public.can_manage_category(category_id));

-- These three have no tenant column of their own; they hang off a parent row.
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_access ON public.order_logs;
CREATE POLICY owner_access ON public.order_logs FOR ALL TO authenticated
USING (public.is_super_admin_safe() OR EXISTS (
  SELECT 1 FROM public.orders o
   WHERE o.id = order_logs.order_id AND o.restaurant_id = public.get_my_tenant_id()));

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_access ON public.recipe_ingredients;
CREATE POLICY owner_access ON public.recipe_ingredients FOR ALL TO authenticated
USING (public.is_super_admin_safe() OR EXISTS (
  SELECT 1 FROM public.recipes r
   WHERE r.id = recipe_ingredients.recipe_id AND r.restaurant_id = public.get_my_tenant_id()))
WITH CHECK (public.is_super_admin_safe() OR EXISTS (
  SELECT 1 FROM public.recipes r
   WHERE r.id = recipe_ingredients.recipe_id AND r.restaurant_id = public.get_my_tenant_id()));

ALTER TABLE public.hr_payroll_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_access ON public.hr_payroll_items;
CREATE POLICY owner_access ON public.hr_payroll_items FOR ALL TO authenticated
USING (public.is_super_admin_safe() OR EXISTS (
  SELECT 1 FROM public.hr_payroll p
   WHERE p.id = hr_payroll_items.payroll_id AND p.tenant_id = public.get_my_tenant_id()));

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants   ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- PART 3 — the narrow anonymous access the public site genuinely needs.
--
-- delivery_zones and promotions had NO {public} SELECT policy of their own,
-- only the wide-open CRUD ones dropped above, so enabling RLS without these
-- would blank the delivery zones and stop promotions applying at checkout.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS public_read ON public.delivery_zones;
CREATE POLICY public_read ON public.delivery_zones
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON public.promotions;
CREATE POLICY public_read ON public.promotions
FOR SELECT TO anon, authenticated USING (true);

-- Checkout appends to these and never reads them: INSERT with no SELECT policy
-- means a visitor can file a record and cannot read anyone's, including theirs.
DROP POLICY IF EXISTS public_insert ON public.orders;
CREATE POLICY public_insert ON public.orders
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS public_insert ON public.notifications;
CREATE POLICY public_insert ON public.notifications
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS public_insert ON public.order_logs;
CREATE POLICY public_insert ON public.order_logs
FOR INSERT TO anon, authenticated WITH CHECK (true);


-- ---------------------------------------------------------------------------
-- PART 4 — secrets on restaurants.
-- The menu needs anonymous SELECT on this table, but RLS is row-level only, so
-- the secret columns are removed from anon with a column GRANT instead.
-- (desktop_permissions is intentionally absent: no such column on this DB.)
-- ---------------------------------------------------------------------------

REVOKE SELECT (telegram_bot_token, telegram_chat_id, email)
  ON public.restaurants FROM anon;


-- ===========================================================================
-- PART 6 — access control tables: super admin, client dashboard, staff pages.
--
-- Three things have to hold at once, and the listing showed one of them does
-- not currently:
--
--   a) the super admin sees and edits every restaurant from /super-admin
--   b) the per-restaurant page show/hide set in /super-admin actually applies
--   c) the client can do everything inside their own dashboard
--
-- (a) holds: every owner_access policy added above carries
--     `OR public.is_super_admin_safe()`, and that function is SECURITY DEFINER
--     so it reads user_roles regardless of the RLS on user_roles itself.
--
-- (b) client_page_access already has unified_cpa_access
--     `(tenant_id = get_my_tenant_id() OR is_super_admin_safe())`, so the
--     dashboard can read its own row and the super admin can write it. Only
--     needs RLS actually switched on.
--
-- (c) page_permissions is the gap. Its ONLY policy is super_admin_access_all,
--     so a restaurant owner can neither read nor write the page permissions of
--     their own staff — dashboard/staff/page.tsx is locked out. That is the
--     staff-visibility feature, and it is broken today, before any of this.
--     page_permissions.user_id holds team_members.id, so the policy below
--     scopes a row through the staff member it belongs to.
-- ===========================================================================

ALTER TABLE public.client_page_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_access ON public.client_page_access;
CREATE POLICY owner_access ON public.client_page_access FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id() OR public.is_super_admin_safe())
WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_super_admin_safe());

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_access ON public.team_members;
CREATE POLICY owner_access ON public.team_members FOR ALL TO authenticated
USING (
  public.is_super_admin_safe()
  OR restaurant_id = public.get_my_tenant_id()
  OR auth_id = auth.uid()          -- a staff member can always see their own row
)
WITH CHECK (restaurant_id = public.get_my_tenant_id() OR public.is_super_admin_safe());

ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_access ON public.page_permissions;
CREATE POLICY owner_access ON public.page_permissions FOR ALL TO authenticated
USING (
  public.is_super_admin_safe()
  OR EXISTS (SELECT 1 FROM public.team_members tm
              WHERE tm.id = page_permissions.user_id
                AND (tm.restaurant_id = public.get_my_tenant_id() OR tm.auth_id = auth.uid()))
)
WITH CHECK (
  public.is_super_admin_safe()
  OR EXISTS (SELECT 1 FROM public.team_members tm
              WHERE tm.id = page_permissions.user_id
                AND tm.restaurant_id = public.get_my_tenant_id())
);

-- user_roles is deliberately left exactly as it is. is_super_admin_safe() is
-- SECURITY DEFINER and reads it as the owner, so every super-admin check above
-- keeps working; adding a policy here would only widen who can see who is an
-- admin.


-- ===========================================================================
-- PART 5 — order numbering + customers.  Needs the deployed app code.
--
-- Checkout used to read customers by phone and scan orders for the highest
-- number, both with the anon key. No policy can narrow "read customers" to
-- "just the phone typed", so anon SELECT there kept all 304 customers
-- readable. These functions do the read as the owner and return one value, so
-- anon needs no read at all.
--
-- Deploy the app first: the current code calls these and falls back to the old
-- table queries when they are absent, but the OLD code reads the tables
-- directly and this part removes that access.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.order_counters (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  last_number   integer NOT NULL DEFAULT 0
);
ALTER TABLE public.order_counters ENABLE ROW LEVEL SECURITY;

-- Hands out a contiguous block and returns its first number, so a till can
-- reserve 100 while online and issue them with no connection. The counter only
-- moves forward, so a deleted order's number is retired, never reissued.
CREATE OR REPLACE FUNCTION public.reserve_order_numbers(
  p_restaurant_id uuid, p_count integer DEFAULT 1)
RETURNS integer AS $$
DECLARE start_num integer; first_num integer;
BEGIN
  IF p_count IS NULL OR p_count < 1 THEN p_count := 1; END IF;
  IF p_count > 1000 THEN p_count := 1000; END IF;

  SELECT starting_order_number INTO start_num
    FROM public.restaurants WHERE id = p_restaurant_id;

  INSERT INTO public.order_counters (restaurant_id, last_number)
  SELECT p_restaurant_id, COALESCE(MAX(order_number), 0)
    FROM public.orders WHERE restaurant_id = p_restaurant_id
  ON CONFLICT (restaurant_id) DO NOTHING;

  UPDATE public.order_counters c
     SET last_number = GREATEST(
           c.last_number,
           COALESCE((SELECT MAX(o.order_number) FROM public.orders o
                      WHERE o.restaurant_id = p_restaurant_id), 0),
           COALESCE(start_num, 1) - 1
         ) + p_count
   WHERE c.restaurant_id = p_restaurant_id
   RETURNING c.last_number - p_count + 1 INTO first_num;

  RETURN first_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.next_order_number(p_restaurant_id uuid)
RETURNS integer AS $$
  SELECT public.reserve_order_numbers(p_restaurant_id, 1);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- No address parameter: customers has no address column. The delivery address
-- lives on orders.customer_address. Totals are incremented here rather than in
-- the browser, which also closes the lost-update race in the old read-then-write.
CREATE OR REPLACE FUNCTION public.upsert_order_customer(
  p_restaurant_id uuid, p_phone text, p_name text, p_order_total numeric DEFAULT 0)
RETURNS uuid AS $$
DECLARE cid uuid;
BEGIN
  SELECT id INTO cid FROM public.customers
   WHERE restaurant_id = p_restaurant_id AND phone = p_phone LIMIT 1;

  IF cid IS NULL THEN
    INSERT INTO public.customers
      (restaurant_id, phone, name, total_orders, total_spent, last_order_date)
    VALUES (p_restaurant_id, p_phone, p_name, 1, p_order_total, now())
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

REVOKE ALL ON FUNCTION public.reserve_order_numbers(uuid, integer) FROM public;
REVOKE ALL ON FUNCTION public.next_order_number(uuid) FROM public;
REVOKE ALL ON FUNCTION public.upsert_order_customer(uuid, text, text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.reserve_order_numbers(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_order_number(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_order_customer(uuid, text, text, numeric) TO anon, authenticated;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders    ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- VERIFY — every row should read rls_enabled = true with policies > 0, and the
-- open_to_public column should be 0 everywhere except the menu tables that are
-- meant to be readable (categories, items, restaurants, delivery_zones,
-- promotions, addons) and the append-only ones (orders, notifications,
-- order_logs).
-- ---------------------------------------------------------------------------

SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       count(p.polname) AS policies,
       count(*) FILTER (
         WHERE 'public' = ANY (SELECT rolname FROM pg_roles WHERE oid = ANY (p.polroles))
            OR 'anon'   = ANY (SELECT rolname FROM pg_roles WHERE oid = ANY (p.polroles))
       ) AS open_to_public
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
 WHERE n.nspname = 'public' AND c.relkind = 'r'
   AND c.relname IN ('restaurants','categories','items','customers','orders',
                     'order_logs','notifications','tables','delivery_zones',
                     'promotions','inventory_items','inventory_transactions',
                     'recipes','recipe_ingredients','suppliers','supplies',
                     'production_batches','production_requests','addons',
                     'print_settings','activity_logs','order_counters',
                     'hr_employees','hr_payroll','hr_payroll_items','hr_deductions',
                     'hr_deduction_rules','hr_attendance','hr_locations',
                     'hr_work_schedules','client_page_access','page_permissions',
                     'team_members','user_roles')
 GROUP BY c.relname, c.relrowsecurity
 ORDER BY c.relrowsecurity, c.relname;
