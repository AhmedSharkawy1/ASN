-- ============================================
-- ASN HR System - Complete Database Migration
-- ============================================

-- 1. HR Employees (extended profile linked to team_members)
CREATE TABLE IF NOT EXISTS hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    national_id TEXT,
    department TEXT DEFAULT 'عام',
    job_title TEXT,
    hire_date DATE,
    base_salary NUMERIC(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'EGP',
    face_descriptor JSONB, -- face-api.js descriptor array for facial recognition
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Work Schedules per employee
CREATE TABLE IF NOT EXISTS hr_work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    is_working_day BOOLEAN DEFAULT true,
    start_time TIME DEFAULT '09:00',
    end_time TIME DEFAULT '17:00',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, day_of_week)
);

-- 3. Authorized work locations (geofencing)
CREATE TABLE IF NOT EXISTS hr_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INT DEFAULT 200, -- allowed radius in meters
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Attendance records
CREATE TABLE IF NOT EXISTS hr_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    check_in_lat DOUBLE PRECISION,
    check_in_lng DOUBLE PRECISION,
    check_out_lat DOUBLE PRECISION,
    check_out_lng DOUBLE PRECISION,
    check_in_location_id UUID REFERENCES hr_locations(id),
    check_out_location_id UUID REFERENCES hr_locations(id),
    face_verified_in BOOLEAN DEFAULT false,
    face_verified_out BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'absent' CHECK (status IN ('present','absent','late','early_leave','holiday','excused')),
    worked_hours NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, date)
);

-- 5. Deduction rules (configurable templates)
CREATE TABLE IF NOT EXISTS hr_deduction_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('absence','late','early_leave','custom')),
    threshold_days INT DEFAULT 0, -- e.g., after 2 absence days
    deduction_amount NUMERIC(12,2) DEFAULT 0,
    deduction_percentage NUMERIC(5,2) DEFAULT 0, -- alternative: % of salary
    per_occurrence BOOLEAN DEFAULT false, -- deduct per each extra day
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Applied deductions
CREATE TABLE IF NOT EXISTS hr_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES hr_deduction_rules(id) ON DELETE SET NULL,
    period_month INT NOT NULL, -- 1-12
    period_year INT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    applied_automatically BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Payroll summary
CREATE TABLE IF NOT EXISTS hr_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    period_month INT NOT NULL,
    period_year INT NOT NULL,
    base_salary NUMERIC(12,2) DEFAULT 0,
    total_bonuses NUMERIC(12,2) DEFAULT 0,
    total_deductions NUMERIC(12,2) DEFAULT 0,
    net_salary NUMERIC(12,2) DEFAULT 0,
    working_days INT DEFAULT 0,
    attended_days INT DEFAULT 0,
    absent_days INT DEFAULT 0,
    late_days INT DEFAULT 0,
    total_hours NUMERIC(7,2) DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, period_month, period_year)
);

-- 8. Payroll line items
CREATE TABLE IF NOT EXISTS hr_payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_id UUID NOT NULL REFERENCES hr_payroll(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('salary','bonus','deduction','allowance','overtime')),
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_employees_tenant ON hr_employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_employee_date ON hr_attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_tenant_date ON hr_attendance(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_tenant_period ON hr_payroll(tenant_id, period_month, period_year);
CREATE INDEX IF NOT EXISTS idx_hr_deductions_employee ON hr_deductions(employee_id, period_month, period_year);
CREATE INDEX IF NOT EXISTS idx_hr_locations_tenant ON hr_locations(tenant_id);

-- Enable RLS
ALTER TABLE hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_deduction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_payroll_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for authenticated users - tenant isolation handled by app)
CREATE POLICY "hr_employees_all" ON hr_employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hr_work_schedules_all" ON hr_work_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hr_locations_all" ON hr_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hr_attendance_all" ON hr_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hr_deduction_rules_all" ON hr_deduction_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hr_deductions_all" ON hr_deductions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hr_payroll_all" ON hr_payroll FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hr_payroll_items_all" ON hr_payroll_items FOR ALL USING (true) WITH CHECK (true);
