-- ===========================================================
-- RECURSION-FREE RLS FIX (FINAL RELEASE)
-- This script replaces all previous complex policies with safe, optimized ones.
-- ===========================================================

-- 1. Optimized Helper for Super Admin (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_sa_final() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Optimized Helper for Tenant ID (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION get_tid_final()
RETURNS uuid AS $$
DECLARE
  tid uuid;
BEGIN
  -- 1. Check if user is staff
  SELECT restaurant_id INTO tid FROM public.team_members WHERE auth_id = auth.uid() LIMIT 1;
  IF tid IS NOT NULL THEN RETURN tid; END IF;
  
  -- 2. Check if user is restaurant owner
  SELECT id INTO tid FROM public.restaurants WHERE email = auth.jwt()->>'email' LIMIT 1;
  RETURN tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. APPLY POLICIES (Cleaning up all potential old names)

-- Disable RLS temporarily to clean up and avoid lock issues
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;

-- RE-ENABLE RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 4. TABLE: restaurants (CRITICAL: No subquery on restaurants here)
DROP POLICY IF EXISTS unified_restaurant_access ON restaurants;
DROP POLICY IF EXISTS super_admin_force_all ON restaurants;
DROP POLICY IF EXISTS super_admin_access_all ON restaurants;
CREATE POLICY final_restaurant_access ON restaurants FOR ALL TO authenticated 
USING (
  is_sa_final() -- Role check
  OR 
  email = auth.jwt()->>'email' -- Owner check (Direct column compare)
  OR 
  id IN (SELECT restaurant_id FROM public.team_members WHERE auth_id = auth.uid()) -- Staff check (Queries different table)
);

-- 5. TABLE: user_roles
DROP POLICY IF EXISTS unified_user_roles_access ON user_roles;
DROP POLICY IF EXISTS super_admin_force_all ON user_roles;
DROP POLICY IF EXISTS super_admin_user_roles_bypass ON user_roles;
CREATE POLICY final_user_roles_access ON user_roles FOR ALL TO authenticated 
USING (user_id = auth.uid() OR is_sa_final());

-- 6. TABLE: branches
DROP POLICY IF EXISTS unified_branches_access ON branches;
DROP POLICY IF EXISTS super_admin_force_all ON branches;
CREATE POLICY final_branches_access ON branches FOR ALL TO authenticated 
USING (tenant_id = get_tid_final() OR is_sa_final());

-- 7. TABLE: subscriptions
DROP POLICY IF EXISTS unified_subscriptions_access ON subscriptions;
DROP POLICY IF EXISTS super_admin_force_all ON subscriptions;
CREATE POLICY final_subscriptions_access ON subscriptions FOR ALL TO authenticated 
USING (tenant_id = get_tid_final() OR is_sa_final());

-- 8. TABLE: team_members
DROP POLICY IF EXISTS unified_team_members_access ON team_members;
CREATE POLICY final_team_members_access ON team_members FOR ALL TO authenticated 
USING (restaurant_id = get_tid_final() OR is_sa_final());

-- 9. OTHER Management Tables (Apply tid check freely because tid_final is SECURITY DEFINER)
ALTER TABLE client_page_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_cpa_access ON client_page_access;
DROP POLICY IF EXISTS super_admin_force_all ON client_page_access;
CREATE POLICY final_cpa_access ON client_page_access FOR ALL TO authenticated 
USING (tenant_id = get_tid_final() OR is_sa_final());

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_logs_access ON activity_logs;
CREATE POLICY final_logs_access ON activity_logs FOR ALL TO authenticated 
USING (tenant_id = get_tid_final() OR is_sa_final());

ALTER TABLE system_backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unified_backups_access ON system_backups;
CREATE POLICY final_backups_access ON system_backups FOR ALL TO authenticated 
USING (tenant_id = get_tid_final() OR is_sa_final());
