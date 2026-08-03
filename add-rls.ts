import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { error } = await supabase.rpc('execute_sql', {
        sql_query: `
            ALTER TABLE public.client_page_access ENABLE ROW LEVEL SECURITY;
            
            DROP POLICY IF EXISTS "Enable read access for tenant" ON public.client_page_access;
            CREATE POLICY "Enable read access for tenant" ON public.client_page_access
                FOR SELECT USING (
                    tenant_id IN (
                        SELECT id FROM public.restaurants WHERE email = current_user
                    )
                    OR
                    tenant_id IN (
                        SELECT restaurant_id FROM public.team_members WHERE auth_id = auth.uid()
                    )
                );
        `
    });
    if (error) console.error("RPC Error:", error);
    else console.log("RLS policy created!");
}
run();
