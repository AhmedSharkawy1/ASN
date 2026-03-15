require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');
const fs = require('fs');

async function run() {
    console.log("Starting migration via pg client...");
    const connectionString = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL; // Wait, usually we need DATABASE_URL
    if (!process.env.DATABASE_URL) {
        console.error("Missing DATABASE_URL in .env.local. Cannot run raw SQL.");
        return;
    }
    
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log("Connected to PostgreSQL.");
        const sql = fs.readFileSync('f:/ASN/ASN/management_architecture_migration.sql', 'utf8');
        await client.query(sql);
        console.log("Migration executed successfully!");
    } catch(err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}
run();
