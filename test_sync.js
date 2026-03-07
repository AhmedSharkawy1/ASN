const fs = require('fs');
const crypto = require('crypto');
const env = fs.readFileSync('.env.local', 'utf8');
const u = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const ak = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const { createClient } = require('@supabase/supabase-js');

async function test() {
    const sb = createClient(u, ak);
    
    // Sign in as staff
    const { data: si, error: se } = await sb.auth.signInWithPassword({
        email: 'a@6cd35d66-f5e6-4add-a594-b7ec0ba8041a.asn',
        password: '123456'
    });
    if (se) { console.log('SIGNIN FAIL:', se.message); return; }
    console.log('Signed in as staff OK');

    // Try upsert like POS does
    const id = crypto.randomUUID();
    const { error } = await sb.from('orders').upsert({
        id,
        restaurant_id: '6cd35d66-f5e6-4add-a594-b7ec0ba8041a',
        order_number: 99999,
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        payment_method: 'cash',
        status: 'completed',
        is_draft: false,
        created_at: new Date().toISOString(),
        source: 'pos'
    });
    
    if (error) {
        console.log('UPSERT FAILED:', JSON.stringify(error, null, 2));
    } else {
        console.log('UPSERT SUCCESS!');
        // Cleanup
        await sb.from('orders').delete().eq('id', id);
        console.log('Cleaned up');
    }
}

test();
