require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testInsert() {
    const { data: cats } = await supabase.from('categories').select('id').limit(1);
    if (!cats || cats.length === 0) return console.log("No categories found");

    const catId = cats[0].id;

    const { data, error } = await supabase
        .from('items')
        .insert({
            category_id: catId,
            title_ar: "Test Item",
            title_en: undefined,
            desc_ar: undefined,
            desc_en: undefined,
            prices: [100],
            size_labels: ['Test'],
            is_popular: false,
            is_spicy: false,
            is_available: true
        }).select().single();

    if (error) {
        console.error("Supabase Error:", JSON.stringify(error, null, 2));
    } else {
        console.log("Success:", data);
    }
}
testInsert();
