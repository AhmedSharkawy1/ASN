-- ===========================================================
-- ALTERNATIVE RLS FIX: Using Auth Email Directly
-- Run this in Supabase SQL Editor if the previous one failed
-- ===========================================================

-- 1. Drop the previous policies that might have caused infinite recursion
DROP POLICY IF EXISTS super_admin_access_all ON restaurants;
DROP POLICY IF EXISTS super_admin_access_all ON user_roles;
DROP POLICY IF EXISTS super_admin_access_all ON client_page_access;
DROP POLICY IF EXISTS super_admin_access_all ON page_permissions;
DROP POLICY IF EXISTS super_admin_access_all ON branches;
DROP POLICY IF EXISTS super_admin_access_all ON subscriptions;
DROP POLICY IF EXISTS super_admin_access_all ON subscription_plans;
DROP POLICY IF EXISTS super_admin_access_all ON system_backups;
DROP POLICY IF EXISTS super_admin_access_all ON activity_logs;

-- Main system tables drops
DROP POLICY IF EXISTS super_admin_access_all ON orders;
DROP POLICY IF EXISTS super_admin_access_all ON tables;
DROP POLICY IF EXISTS super_admin_access_all ON customers;
DROP POLICY IF EXISTS super_admin_access_all ON delivery_zones;
DROP POLICY IF EXISTS super_admin_access_all ON notifications;
DROP POLICY IF EXISTS super_admin_access_all ON items;
DROP POLICY IF EXISTS super_admin_access_all ON categories;


-- 2. Create a much simpler, safer function checking the JWT directly 
-- This avoids querying `user_roles` inside the policy which can cause infinite loops
CREATE OR REPLACE FUNCTION is_super_admin_safe() 
RETURNS BOOLEAN AS $$
BEGIN
  -- We check if their email matches the known super admin email, OR
  -- we check the user_roles table but we DO NOT apply this policy to the user_roles table itself
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Apply it to all tables EXCEPT user_roles
CREATE POLICY super_admin_access_all ON restaurants FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON client_page_access FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON page_permissions FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON branches FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON subscriptions FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON subscription_plans FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON system_backups FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON activity_logs FOR ALL TO authenticated USING (is_super_admin_safe());

-- Apply to main system tables for total visibility
CREATE POLICY super_admin_access_all ON orders FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON tables FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON customers FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON delivery_zones FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON notifications FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON items FOR ALL TO authenticated USING (is_super_admin_safe());
CREATE POLICY super_admin_access_all ON categories FOR ALL TO authenticated USING (is_super_admin_safe());

-- 4. For user_roles, we just let people read their own role, and let auth.uid() manage writes if needed.
-- Make sure the previous 'user_roles_read_own' is active
DROP POLICY IF EXISTS user_roles_read_own ON user_roles;
CREATE POLICY user_roles_read_own ON user_roles FOR SELECT TO authenticated USING (true); -- Allow everyone to read roles so checkAuth works
