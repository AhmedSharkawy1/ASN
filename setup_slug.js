const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/DATABASE_URL=(.*)/)?.[1];

if (!url) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
}

const client = new Client({ connectionString: url });
const sql = `
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_slug_unique ON public.restaurants(slug) WHERE slug IS NOT NULL;
`;

client.connect()
    .then(() => client.query(sql))
    .then(() => {
        console.log('Database altered successfully');
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
