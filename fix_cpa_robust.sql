-- NEW ROBUST RLS AND TID HELPER
CREATE OR REPLACE FUNCTION get_tid_final()
RETURNS uuid AS $$
DECLARE
  tid uuid;
BEGIN
  -- 1. Check if user is staff (exact match on auth_id)
  SELECT restaurant_id INTO tid FROM public.team_members WHERE auth_id = auth.uid() LIMIT 1;
  IF tid IS NOT NULL THEN RETURN tid; END IF;
  
  -- 2. Check if user is restaurant owner (CASE-INSENSITIVE email check)
  SELECT id INTO tid FROM public.restaurants WHERE LOWER(email) = LOWER(auth.jwt()->>'email') LIMIT 1;
  RETURN tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure unique constraint on client_page_access if not already there
ALTER TABLE client_page_access DROP CONSTRAINT IF EXISTS client_page_access_tenant_id_page_key_key;
ALTER TABLE client_page_access ADD CONSTRAINT client_page_access_tenant_id_page_key_key UNIQUE (tenant_id, page_key);

-- Policy update for CPA
ALTER TABLE client_page_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS final_cpa_access ON client_page_access;
CREATE POLICY final_cpa_access ON client_page_access FOR ALL TO authenticated 
USING (tenant_id = get_tid_final() OR is_sa_final());
