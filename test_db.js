import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function extract() {
    const tables = [
        'inventory_transactions',
        'supply_payments',
        'production_requests',
        'financial_accounts',
        'financial_transactions',
        'orders',
        'order_logs',
        'order_costs',
        'team_members',
        'branches',
        'client_page_access',
        'notifications'
    ];
    let out = '';
    
    for (const t of tables) {
        const { data } = await supabase.from(t).select('*').limit(1);
        if (data && data.length > 0) {
            out += `[${t}]: ${Object.keys(data[0]).join(', ')}\n`;
        } else {
            // Find columns using the options endpoint or just leave it empty if we can't
            out += `[${t}]: (Empty Table)\n`;
        }
    }
    
    fs.writeFileSync('db_out.txt', out);
    console.log("Schema map written to db_out.txt");
}
extract();
