-- ==============================================
-- Theme Settings Migration
-- Allows Super Admin to hide/show themes and rename them
-- ==============================================

CREATE TABLE IF NOT EXISTS public.theme_settings (
    theme_id text PRIMARY KEY,
    custom_name_ar text,
    custom_name_en text,
    is_hidden boolean DEFAULT false,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read (clients need to see customized names)
DROP POLICY IF EXISTS theme_settings_read ON public.theme_settings;
CREATE POLICY theme_settings_read ON public.theme_settings
    FOR SELECT TO authenticated USING (true);

-- Only super admin can manage (uses existing is_sa_final() SECURITY DEFINER function)
DROP POLICY IF EXISTS theme_settings_manage ON public.theme_settings;
CREATE POLICY theme_settings_manage ON public.theme_settings
    FOR ALL TO authenticated USING (is_sa_final())
    WITH CHECK (is_sa_final());
