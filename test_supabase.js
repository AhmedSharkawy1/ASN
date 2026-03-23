const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", url);
console.log("Key starts with:", key ? key.substring(0, 15) + "..." : "MISSING");

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function check() {
    const { data, error } = await admin.from('pg_policies').select('*').eq('tablename', 'orders');
    if (error) {
        console.error("Select Error:", error);
    } else {
        console.log("Orders Policies:");
        data.forEach(p => console.log(p.policyname, "->", p.cmd));
    }
}
check();
