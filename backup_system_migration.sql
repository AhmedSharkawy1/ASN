-- =============================================
-- Backup System Migration
-- =============================================

-- 1. Create system_backups table if not exists
CREATE TABLE IF NOT EXISTS system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    backup_name TEXT NOT NULL,
    backup_type TEXT NOT NULL DEFAULT 'per_client',
    backup_file TEXT, -- Supabase Storage path
    file_size_bytes BIGINT DEFAULT 0,
    tables_included TEXT[] DEFAULT '{}',
    record_counts JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 2. Add any missing columns in case the table already existed with an older structure
ALTER TABLE public.system_backups ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0;
ALTER TABLE public.system_backups ADD COLUMN IF NOT EXISTS tables_included TEXT[] DEFAULT '{}';
ALTER TABLE public.system_backups ADD COLUMN IF NOT EXISTS record_counts JSONB DEFAULT '{}';
ALTER TABLE public.system_backups ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.system_backups ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. Fix check constraints (Drop old ones that might conflict, then apply updated ones)
ALTER TABLE public.system_backups DROP CONSTRAINT IF EXISTS system_backups_status_check;
ALTER TABLE public.system_backups ADD CONSTRAINT system_backups_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'));

ALTER TABLE public.system_backups DROP CONSTRAINT IF EXISTS system_backups_backup_type_check;
ALTER TABLE public.system_backups ADD CONSTRAINT system_backups_backup_type_check CHECK (backup_type IN ('full', 'per_client', 'auto'));


-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_system_backups_tenant ON system_backups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_backups_status ON system_backups(status);
CREATE INDEX IF NOT EXISTS idx_system_backups_created ON system_backups(created_at DESC);

-- Create storage bucket for backups (run in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('client-backups', 'client-backups', false)
-- ON CONFLICT DO NOTHING;

-- RLS policies for system_backups (super admin only via service role)
ALTER TABLE system_backups ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'system_backups' AND policyname = 'Service role full access on system_backups'
    ) THEN
        CREATE POLICY "Service role full access on system_backups"
            ON system_backups FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
