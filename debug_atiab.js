const url = 'https://dphylskqazuytvibiysn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlsc2txYXp1eXR2aWJpeXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA0ODM4NiwiZXhwIjoyMDg3NjI0Mzg2fQ.vELDlTa0irq1nauUxJxK-UOcbbe_B-GElqdaaAPrnEg';

async function check() {
    const res = await fetch(`${url}/rest/v1/restaurants?select=id,name,slug`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const rests = await res.json();
    console.log("All Restaurants:");
    rests.forEach(r => console.log(`- ${r.name} (UUID: ${r.id}, Slug: ${r.slug})`));

    const atiab = rests.find(r => r.slug === 'atiab');
    if (atiab) {
        console.log(`\nFound 'atiab' restaurant: ${atiab.name} (ID: ${atiab.id})`);
        const catRes = await fetch(`${url}/rest/v1/categories?restaurant_id=eq.${atiab.id}`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const cats = await catRes.json();
        console.log(`Categories count for ${atiab.id}: ${cats.length}`);
    } else {
        console.log("\nNO RESTAURANT WITH SLUG 'atiab' FOUND!");
        const oldId = rests.find(r => r.id === '6cd35d66-f5e6-4add-a594-b7ec0ba8041a');
        if (oldId) {
            console.log(`BUT wait, the old UUID (6cd35d66-...) belongs to: ${oldId.name} with slug: ${oldId.slug}`);
        }
    }
}
check();
