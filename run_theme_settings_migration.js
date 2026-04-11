require('dotenv').config({ path: '.env.local' });

const sql = `
CREATE TABLE IF NOT EXISTS public.theme_settings (
    theme_id text PRIMARY KEY,
    custom_name_ar text,
    custom_name_en text,
    is_hidden boolean DEFAULT false,
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS theme_settings_read ON public.theme_settings;
CREATE POLICY theme_settings_read ON public.theme_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS theme_settings_manage ON public.theme_settings;
CREATE POLICY theme_settings_manage ON public.theme_settings FOR ALL TO authenticated USING (is_sa_final()) WITH CHECK (is_sa_final());
`;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)[1];

async function run() {
    // Use the Supabase SQL endpoint (pg-meta)
    const url = `https://${ref}.supabase.co/rest/v1/rpc/`;
    
    // Try using the direct postgres connection via fetch to the SQL editor API
    const sqlUrl = `https://${ref}.supabase.co/pg/query`;
    
    // Method: Use the service role key to directly query via PostgREST
    // Since exec_sql doesn't exist, let's create it first, then use it
    // Actually, let's just use the Supabase Management API
    
    const mgmtUrl = `https://api.supabase.com/v1/projects/${ref}/database/query`;
    
    console.log('Trying Supabase Management API...');
    try {
        const resp = await fetch(mgmtUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_KEY}`
            },
            body: JSON.stringify({ query: sql })
        });
        const text = await resp.text();
        console.log('Status:', resp.status);
        console.log('Response:', text.substring(0, 500));
    } catch (e) {
        console.log('Management API failed:', e.message);
    }

    // Alternative: Direct PostgREST with custom header
    console.log('\nTrying direct SQL via PostgREST...');
    try {
        // We'll just verify the table doesn't exist yet
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
        
        const { data, error } = await supabase.from('theme_settings').select('theme_id').limit(1);
        if (error) {
            console.log('Table does not exist yet:', error.message);
            console.log('\n⚠️  Please run the following SQL in the Supabase Dashboard SQL Editor:');
            console.log('='.repeat(60));
            console.log(sql);
            console.log('='.repeat(60));
        } else {
            console.log('✅ Table already exists! Rows:', data.length);
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

run();
