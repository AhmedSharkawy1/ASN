-- ===========================================================
-- RLS FIX: Granting Super Admin Full Visibility
-- Run this in Supabase SQL Editor
-- ===========================================================

-- 1. Create a helper function to check if the current user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply "Super Admin Access All" policy to all relevant tables
-- This allows the super_admin to SELECT, INSERT, UPDATE, DELETE everything.

-- Table: restaurants
DROP POLICY IF EXISTS super_admin_access_all ON restaurants;
CREATE POLICY super_admin_access_all ON restaurants FOR ALL TO authenticated USING (is_super_admin());

-- Table: user_roles
DROP POLICY IF EXISTS super_admin_access_all ON user_roles;
CREATE POLICY super_admin_access_all ON user_roles FOR ALL TO authenticated USING (is_super_admin());

-- Table: client_page_access
DROP POLICY IF EXISTS super_admin_access_all ON client_page_access;
CREATE POLICY super_admin_access_all ON client_page_access FOR ALL TO authenticated USING (is_super_admin());

-- Table: page_permissions
DROP POLICY IF EXISTS super_admin_access_all ON page_permissions;
CREATE POLICY super_admin_access_all ON page_permissions FOR ALL TO authenticated USING (is_super_admin());

-- Table: branches
DROP POLICY IF EXISTS super_admin_access_all ON branches;
CREATE POLICY super_admin_access_all ON branches FOR ALL TO authenticated USING (is_super_admin());

-- Table: subscriptions
DROP POLICY IF EXISTS super_admin_access_all ON subscriptions;
CREATE POLICY super_admin_access_all ON subscriptions FOR ALL TO authenticated USING (is_super_admin());

-- Table: subscription_plans
DROP POLICY IF EXISTS super_admin_access_all ON subscription_plans;
CREATE POLICY super_admin_access_all ON subscription_plans FOR ALL TO authenticated USING (is_super_admin());

-- Table: system_backups
DROP POLICY IF EXISTS super_admin_access_all ON system_backups;
CREATE POLICY super_admin_access_all ON system_backups FOR ALL TO authenticated USING (is_super_admin());

-- Table: activity_logs
DROP POLICY IF EXISTS super_admin_access_all ON activity_logs;
CREATE POLICY super_admin_access_all ON activity_logs FOR ALL TO authenticated USING (is_super_admin());

-- 3. Ensure RLS is enabled on these tables (if not already)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_page_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. Allow regular users to read their own role (needed for the dashboard to load)
DROP POLICY IF EXISTS user_roles_read_own ON user_roles;
CREATE POLICY user_roles_read_own ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
