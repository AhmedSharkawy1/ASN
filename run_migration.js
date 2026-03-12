require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Starting migration via Supabase RPC...");
    const sql = fs.readFileSync('f:/ASN/ASN/factory_order_tracking_migration.sql', 'utf8');
    
    // Fallback: If no run_sql RPC exists, we will try to just select to confirm connection
    // Then I will inform the user.
    try {
      const { data, error } = await supabase.rpc('run_sql', { query: sql });
      if (error) {
         console.warn("RPC run_sql failed, trying raw insert if possible (though alter table is hard via API). Error:", error.message);
      } else {
         console.log("Success:", data);
      }
    } catch(err) {
      console.error(err);
    }
}
run();
