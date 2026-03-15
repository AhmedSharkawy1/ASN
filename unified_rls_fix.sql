-- ===========================================================
-- UNIFIED RLS POLICY: Super Admin & Standard Users
-- ===========================================================

-- 1. Helper function for Super Admin check
CREATE OR REPLACE FUNCTION is_super_admin_safe() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper function to get current user's Tenant ID (Restaurant ID)
-- This checks both team_members (staff) and restaurants table (admin/owner)
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid AS $$
DECLARE
  tid uuid;
BEGIN
  -- 1. Check if user is in team_members
  SELECT restaurant_id INTO tid FROM public.team_members WHERE auth_id = auth.uid() LIMIT 1;
  IF tid IS NOT NULL THEN RETURN tid; END IF;
  
  -- 2. Check if user is the restaurant owner (matching email in restaurants table)
  SELECT id INTO tid FROM public.restaurants WHERE email = auth.jwt()->>'email' LIMIT 1;
  RETURN tid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 3. Apply Unified Policies to Main Tables

-- Table: restaurants
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_restaurant_access ON restaurants;
CREATE POLICY unified_restaurant_access ON restaurants 
FOR ALL TO authenticated 
USING (id = get_my_tenant_id() OR is_super_admin_safe());

-- Table: branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_branches_access ON branches;
CREATE POLICY unified_branches_access ON branches 
FOR ALL TO authenticated 
USING (tenant_id = get_my_tenant_id() OR is_super_admin_safe());

-- Table: subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_subscriptions_access ON subscriptions;
CREATE POLICY unified_subscriptions_access ON subscriptions 
FOR ALL TO authenticated 
USING (tenant_id = get_my_tenant_id() OR is_super_admin_safe());

-- Table: client_page_access
ALTER TABLE client_page_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_cpa_access ON client_page_access;
CREATE POLICY unified_cpa_access ON client_page_access 
FOR ALL TO authenticated 
USING (tenant_id = get_my_tenant_id() OR is_super_admin_safe());

-- Table: user_roles (Everyone needs to read their own and super admins read all)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_user_roles_access ON user_roles;
CREATE POLICY unified_user_roles_access ON user_roles 
FOR ALL TO authenticated 
USING (user_id = auth.uid() OR is_super_admin_safe());


-- 4. Main System Tables (Apply Tenant Isolation if needed, or leave as is if previously disabled)
-- If the user wants FULL security, they should run these:

/*
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_orders_access ON orders;
CREATE POLICY unified_orders_access ON orders FOR ALL TO authenticated 
USING (restaurant_id = get_my_tenant_id() OR is_super_admin_safe());

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_items_access ON items;
CREATE POLICY unified_items_access ON items FOR ALL TO authenticated 
USING (restaurant_id = get_my_tenant_id() OR is_super_admin_safe());
*/

-- 5. Final check for team_members itself
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_team_members_access ON team_members;
CREATE POLICY unified_team_members_access ON team_members 
FOR ALL TO authenticated 
USING (restaurant_id = get_my_tenant_id() OR is_super_admin_safe());
