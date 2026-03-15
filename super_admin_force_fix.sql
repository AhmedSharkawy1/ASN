-- ===========================================================
-- SUPER ADMIN FORCE VISIBILITY FIX (JWT BASED)
-- This version uses JWT metadata to bypass lookups where possible
-- ===========================================================

-- 1. Create a function that checks JWT metadata first (Fastest/Safest)
-- This avoids recursion entirely if you set the role in user metadata
CREATE OR REPLACE FUNCTION is_sa_authenticated() 
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is logged in
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;

  -- First check JWT claims (if you or Supabase set it there)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin' THEN RETURN TRUE; END IF;
  
  -- Fallback to table check (Using Definer to bypass its own RLS)
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop all previous complex policies and apply "The Big Hammer"
-- We will allow everything if is_sa_authenticated() is true

-- Table: restaurants
DROP POLICY IF EXISTS unified_restaurant_access ON restaurants;
CREATE POLICY super_admin_force_all ON restaurants FOR ALL TO authenticated 
USING (is_sa_authenticated() OR id = (SELECT id FROM restaurants WHERE email = auth.jwt()->>'email'));

-- Table: subscriptions
DROP POLICY IF EXISTS unified_subscriptions_access ON subscriptions;
CREATE POLICY super_admin_force_all ON subscriptions FOR ALL TO authenticated 
USING (is_sa_authenticated() OR tenant_id IN (SELECT id FROM restaurants WHERE email = auth.jwt()->>'email'));

-- Table: branches
DROP POLICY IF EXISTS unified_branches_access ON branches;
CREATE POLICY super_admin_force_all ON branches FOR ALL TO authenticated 
USING (is_sa_authenticated() OR tenant_id IN (SELECT id FROM restaurants WHERE email = auth.jwt()->>'email'));

-- Table: user_roles
DROP POLICY IF EXISTS super_admin_user_roles_bypass ON user_roles;
DROP POLICY IF EXISTS unified_user_roles_access ON user_roles;
CREATE POLICY super_admin_force_all ON user_roles FOR ALL TO authenticated 
USING (is_sa_authenticated() OR user_id = auth.uid());

-- Table: client_page_access
DROP POLICY IF EXISTS unified_cpa_access ON client_page_access;
CREATE POLICY super_admin_force_all ON client_page_access FOR ALL TO authenticated 
USING (is_sa_authenticated() OR tenant_id IN (SELECT id FROM restaurants WHERE email = auth.jwt()->>'email'));

-- Repeat for others as needed
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY; -- Temporary to fix visibility
ALTER TABLE system_backups DISABLE ROW LEVEL SECURITY; -- Temporary to fix visibility

-- 3. DIAGNOSTIC TOOL
-- Run this and see if it returns TRUE for you
-- SELECT is_sa_authenticated();
