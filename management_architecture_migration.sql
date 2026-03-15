-- ===========================================================
-- Super Admin & Management Architecture Migration
-- ===========================================================

-- 1. ROLES SYSTEM
CREATE TABLE IF NOT EXISTS user_roles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff')),
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 2. CLIENT PAGE ACCESS
CREATE TABLE IF NOT EXISTS client_page_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    page_key text NOT NULL,
    enabled boolean DEFAULT true,
    UNIQUE(tenant_id, page_key)
);
CREATE INDEX IF NOT EXISTS idx_cpa_tenant ON client_page_access(tenant_id);

-- 3. STAFF PERMISSION SYSTEM
CREATE TABLE IF NOT EXISTS page_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
    page_key text NOT NULL,
    can_view boolean DEFAULT true,
    can_edit boolean DEFAULT false,
    UNIQUE(user_id, page_key)
);
CREATE INDEX IF NOT EXISTS idx_pp_user ON page_permissions(user_id);

-- 4. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    branch_name text NOT NULL,
    branch_code text,
    address text,
    phone text,
    manager_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);

-- 5. STAFF BRANCH ACCESS
CREATE TABLE IF NOT EXISTS staff_branch_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
    UNIQUE(user_id, branch_id)
);
CREATE INDEX IF NOT EXISTS idx_sba_user ON staff_branch_access(user_id);

-- 6. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    plan_name text NOT NULL,
    subscription_type text DEFAULT 'monthly' CHECK (subscription_type IN ('monthly', 'yearly', 'lifetime')),
    status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'cancelled')),
    start_date timestamptz DEFAULT now(),
    end_date timestamptz,
    is_lifetime boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name text NOT NULL UNIQUE,
    price numeric DEFAULT 0,
    billing_cycle text DEFAULT 'monthly',
    max_branches int DEFAULT 1,
    max_users int DEFAULT 5,
    max_products int DEFAULT 1000,
    features jsonb DEFAULT '[]',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 7. SYSTEM BACKUPS
CREATE TABLE IF NOT EXISTS system_backups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    backup_name text NOT NULL,
    backup_file text NOT NULL,
    status text DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'restoring')),
    created_by uuid, -- For super admin tracking
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_backups_tenant ON system_backups(tenant_id);

-- 8. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid, -- User auth ID or team profile ID
    tenant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    action text NOT NULL,
    target_type text,
    target_id uuid,
    description text,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON activity_logs(tenant_id);

-- 9. Insert Admin User manually? (Handled at application level or manually via UI)
-- Example: INSERT INTO user_roles (user_id, role) VALUES ('AUTH_USER_ID', 'super_admin');
