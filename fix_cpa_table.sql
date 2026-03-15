-- Ensure client_page_access has a unique constraint for upsert to work
ALTER TABLE client_page_access DROP CONSTRAINT IF EXISTS client_page_access_tenant_id_page_key_key;
ALTER TABLE client_page_access ADD CONSTRAINT client_page_access_tenant_id_page_key_key UNIQUE (tenant_id, page_key);

-- Ensure RLS is correctly applied
ALTER TABLE client_page_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS final_cpa_access ON client_page_access;
CREATE POLICY final_cpa_access ON client_page_access FOR ALL TO authenticated 
USING (tenant_id = get_tid_final() OR is_sa_final());
