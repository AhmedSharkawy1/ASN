import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
const envPath = path.resolve('.env.local');
const fallbackEnvPath = path.resolve('.env');

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else if (fs.existsSync(fallbackEnvPath)) {
    dotenv.config({ path: fallbackEnvPath });
} else {
    console.error("No .env file found");
    process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    console.log("Checking restaurants table...");
    const { data: restaurants, error } = await supabase.from('restaurants').select('id, name, email, parent_id');
    
    if (error) {
        console.error("Error fetching restaurants (RLS heavily restricted?):", error.message);
    } else {
        console.log(`Found ${restaurants.length} restaurants via ANON key.`);
        const branches = restaurants.filter(r => r.parent_id !== null);
        console.log("Branches found:", branches.length);
        if (branches.length > 0) {
            console.log(branches);
        }
        
        console.log("\nAll restaurants:");
        console.log(restaurants.map(r => `${r.name} (${r.email}) - Parent: ${r.parent_id}`));
    }
}

check();
