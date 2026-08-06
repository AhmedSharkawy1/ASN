const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dphylskqazuytvibiysn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlsc2txYXp1eXR2aWJpeXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA0ODM4NiwiZXhwIjoyMDg3NjI0Mzg2fQ.vELDlTa0irq1nauUxJxK-UOcbbe_B-GElqdaaAPrnEg';
const BUCKET = 'menu-images';
const RESTAURANT_ID = 'c4a3edb7-eb01-4030-8cce-de905b38f9dd'; // lacrosta

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log('='.repeat(70));
  console.log('🔎 تحليل HD Quality Images - La Crosta');
  console.log('='.repeat(70));

  // 1. فحص إعداد HD في الـ restaurant
  console.log('\n📋 [1] فحص إعداد high_quality_images في قاعدة البيانات:');
  const { data: rest, error: restErr } = await supabase
    .from('restaurants')
    .select('id, name, high_quality_images, show_asn_branding, theme')
    .eq('id', RESTAURANT_ID)
    .single();

  if (restErr) {
    console.error('❌ خطأ:', restErr.message);
  } else {
    console.log(`  🏪 الاسم: ${rest.name}`);
    console.log(`  🎨 الثيم: ${rest.theme}`);
    console.log(`  📸 high_quality_images: ${rest.high_quality_images ? '✅ مفعّل (HD ON)' : '❌ غير مفعّل'}`);
  }

  // 2. فحص الجداول المتاحة
  console.log('\n📋 [2] البحث عن جدول عناصر المنيو:');
  const tables = ['items', 'menu_items', 'products', 'menu_products'];
  let itemsTable = null;
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1);
    if (!error) {
      console.log(`  ✅ الجدول الصحيح: "${t}"`);
      itemsTable = t;
      break;
    } else {
      console.log(`  ❌ "${t}": ${error.message}`);
    }
  }

  if (!itemsTable) {
    console.log('\n⚠️ لم يتم العثور على جدول عناصر المنيو، جرب بطريقة مختلفة...');
    // جرب عبر RPC أو طريقة أخرى
    const { data: schemaData } = await supabase.rpc('get_tables').catch(() => ({ data: null }));
    if (schemaData) console.log('Schema tables:', schemaData);
    return;
  }

  // 3. فحص الصور في الوقت 4-5 صباحاً
  const from = new Date('2026-08-06T01:00:00.000Z');
  const to   = new Date('2026-08-06T02:00:00.000Z');

  console.log(`\n📋 [3] عناصر المنيو المُعدّلة بين 4:00-5:00 صباحاً في جدول "${itemsTable}":`)
  const { data: items, error: itemsErr } = await supabase
    .from(itemsTable)
    .select('id, title_ar, title_en, image_url, thumbnail_url, updated_at, created_at, restaurant_id')
    .eq('restaurant_id', RESTAURANT_ID)
    .gte('updated_at', from.toISOString())
    .lte('updated_at', to.toISOString())
    .order('updated_at', { ascending: false });

  if (itemsErr) {
    console.error('  ❌ خطأ:', itemsErr.message);
  } else if (!items || items.length === 0) {
    console.log('  ⚠️ لا توجد عناصر منيو معدّلة في هذا الوقت');
    
    // فحص آخر 20 عنصر معدّل بغض النظر عن الوقت
    console.log('\n  📋 آخر 20 عنصر معدّل في المنيو (بغض النظر عن الوقت):');
    const { data: recent } = await supabase
      .from(itemsTable)
      .select('id, title_ar, image_url, thumbnail_url, updated_at')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (recent && recent.length > 0) {
      recent.forEach((item, i) => {
        const t = new Date(item.updated_at);
        const localTime = t.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
        const hasImg = item.image_url ? '🖼️' : '❌';
        const hasThumb = item.thumbnail_url ? '📐' : '❌';
        console.log(`  ${i+1}. ${item.title_ar || '(بلا اسم)'} | ${localTime} | img:${hasImg} thumb:${hasThumb}`);
        if (item.image_url) console.log(`      URL: ${item.image_url}`);
      });
    } else {
      console.log('  لا توجد بيانات');
    }
  } else {
    console.log(`  ✅ عدد العناصر: ${items.length}`);
    items.forEach((item, i) => {
      const t = new Date(item.updated_at);
      const localTime = t.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
      console.log(`\n  ${i+1}. ${item.title_ar || item.title_en || '(بلا اسم)'}`);
      console.log(`     🕐 ${localTime}`);
      console.log(`     🖼️  image_url: ${item.image_url || '❌ فارغ'}`);
      console.log(`     📐 thumbnail_url: ${item.thumbnail_url || '❌ فارغ'}`);
    });
  }

  // 4. فحص الصور المرفوعة على Storage في نفس الوقت
  console.log('\n📋 [4] الصور المرفوعة على Storage بين 4:00-5:00 صباحاً:');
  let storageFiles = [];
  for (const folder of ['original', 'thumbs']) {
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
        limit: 100, offset,
        sortBy: { column: 'created_at', order: 'desc' }
      });
      if (error || !data || data.length === 0) break;
      const inRange = data.filter(f => {
        if (!f.created_at) return false;
        const t = new Date(f.created_at);
        return t >= from && t <= to;
      });
      storageFiles = storageFiles.concat(inRange.map(f => ({ ...f, folder })));
      const last = new Date(data[data.length - 1]?.created_at || 0);
      if (last < from || data.length < 100) break;
      offset += 100;
    }
  }

  const originals = storageFiles.filter(f => f.folder === 'original');
  const thumbs = storageFiles.filter(f => f.folder === 'thumbs');
  console.log(`  📦 Original files: ${originals.length}`);
  console.log(`  📦 Thumb files:    ${thumbs.length}`);

  // 5. مقارنة Storage بـ Database
  console.log('\n📋 [5] تحليل المشكلة - هل الصور متربطة بعناصر المنيو؟');
  
  // جيب كل عناصر المنيو اللي عندها image_url تشير لهذه الـ IDs
  const fileIds = originals.map(f => f.name.replace('.webp', ''));
  console.log(`\n  الـ file IDs المرفوعة (${fileIds.length} صورة):`);
  fileIds.forEach((id, i) => console.log(`    ${i+1}. ${id}`));

  if (fileIds.length > 0) {
    console.log('\n  🔍 البحث عن هذه الصور في قاعدة البيانات...');
    for (const fileId of fileIds.slice(0, 5)) { // أول 5 بس عشان ما يطولش
      const searchUrl = `%${fileId}%`;
      const { data: found } = await supabase
        .from(itemsTable)
        .select('id, title_ar, image_url, thumbnail_url, restaurant_id, updated_at')
        .like('image_url', searchUrl);
      
      if (found && found.length > 0) {
        found.forEach(item => {
          const t = new Date(item.updated_at);
          const localTime = t.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
          console.log(`  ✅ صورة "${fileId}" متربطة بـ: ${item.title_ar} (${localTime})`);
          console.log(`     restaurant_id: ${item.restaurant_id}`);
          const isLaCrosta = item.restaurant_id === RESTAURANT_ID;
          console.log(`     هل هي La Crosta؟ ${isLaCrosta ? '✅ نعم' : '❌ لا! مطعم تاني!'}`);
        });
      } else {
        console.log(`  ❌ صورة "${fileId}" → مش متربطة بأي عنصر في قاعدة البيانات!`);
      }
    }
  }

  // 6. ملخص
  console.log('\n' + '='.repeat(70));
  console.log('📊 ملخص التحليل:');
  console.log('='.repeat(70));
  console.log(`  ✅ الصور مرفوعة على Storage: ${originals.length} صورة`);
  console.log(`  🔍 high_quality_images: ${rest?.high_quality_images ? 'مفعّل ✅' : 'غير مفعّل ❌'}`);
  
  if (rest?.high_quality_images) {
    console.log('\n  ℹ️  لما يكون HD مفعّل، المنيو بيعرض original/ مش thumbs/');
    console.log('     وده لا يأثر على عملية الرفع، بس يأثر على العرض');
  }
}

main().catch(console.error);
