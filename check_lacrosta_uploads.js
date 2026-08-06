const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dphylskqazuytvibiysn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlsc2txYXp1eXR2aWJpeXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA0ODM4NiwiZXhwIjoyMDg3NjI0Mzg2fQ.vELDlTa0irq1nauUxJxK-UOcbbe_B-GElqdaaAPrnEg';
const BUCKET = 'menu-images';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function getRestaurantId(email) {
  console.log(`\n🔍 البحث عن المطعم: ${email}`);
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, email')
    .eq('email', email)
    .single();

  if (error) {
    console.error('❌ خطأ في البحث:', error.message);
    // try without .single()
    const { data: all } = await supabase
      .from('restaurants')
      .select('id, name, email')
      .ilike('email', `%lacrosta%`);
    console.log('بحث بالاسم lacrosta:', all);
    return null;
  }
  console.log(`✅ المطعم: ${data.name} (ID: ${data.id})`);
  return data;
}

async function checkMenuItems(restaurantId, from, to) {
  console.log(`\n📋 فحص عناصر المنيو المُعدّلة بين ${from.toISOString()} و ${to.toISOString()}`);
  
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, image_url, thumbnail_url, updated_at, created_at')
    .eq('restaurant_id', restaurantId)
    .gte('updated_at', from.toISOString())
    .lte('updated_at', to.toISOString())
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ خطأ في فحص المنيو:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  لم يتم العثور على عناصر منيو معدّلة في هذا الوقت');
  } else {
    console.log(`✅ عدد العناصر المعدّلة: ${data.length}`);
    data.forEach((item, i) => {
      const updatedAt = new Date(item.updated_at);
      const localTime = updatedAt.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
      console.log(`\n  ${i + 1}. ${item.name || '(بدون اسم)'}`);
      console.log(`     🕐 وقت التعديل: ${localTime}`);
      console.log(`     🖼️  صورة: ${item.image_url ? '✅ موجودة' : '❌ لا توجد'}`);
      if (item.image_url) console.log(`     🔗 ${item.image_url}`);
      if (item.thumbnail_url) console.log(`     🔗 Thumb: ${item.thumbnail_url}`);
    });
  }
}

async function checkStorageFiles(from, to) {
  console.log(`\n📦 فحص ملفات Storage بين ${from.toISOString()} و ${to.toISOString()}`);

  const folders = ['original', 'thumbs'];
  let allFiles = [];

  for (const folder of folders) {
    let offset = 0;
    const limit = 100;
    while (true) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(folder, {
          limit,
          offset,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error(`❌ خطأ في قراءة ${folder}:`, error.message);
        break;
      }
      if (!data || data.length === 0) break;

      const inRange = data.filter(f => {
        if (!f.created_at) return false;
        const t = new Date(f.created_at);
        return t >= from && t <= to;
      });

      allFiles = allFiles.concat(inRange.map(f => ({ ...f, folder })));

      // إذا كان آخر ملف أقدم من النطاق، نوقف
      const last = new Date(data[data.length - 1]?.created_at || 0);
      if (last < from || data.length < limit) break;
      offset += limit;
    }
  }

  if (allFiles.length === 0) {
    console.log('⚠️  لم يتم العثور على ملفات مرفوعة في هذا النطاق الزمني في Storage');
  } else {
    console.log(`\n✅ عدد الملفات المرفوعة: ${allFiles.length}`);
    allFiles.forEach((f, i) => {
      const t = new Date(f.created_at);
      const localTime = t.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${f.folder}/${f.name}`;
      console.log(`\n  ${i + 1}. [${f.folder}] ${f.name}`);
      console.log(`     🕐 ${localTime}`);
      console.log(`     📏 ${f.metadata?.size ? (f.metadata.size / 1024).toFixed(1) + ' KB' : 'غير معروف'}`);
      console.log(`     🔗 ${url}`);
    });
  }
}

async function main() {
  // التاريخ: اليوم السابق (2026-08-05 / 2026-08-06)
  // الوقت: 4:00 صباحاً حتى 5:00 صباحاً بتوقيت مصر (UTC+3 = 01:00 UTC حتى 02:00 UTC)
  
  // نجرب التواريخ المحتملة
  const checkDates = [
    // 2026-08-06 4:00-5:00 صباحاً (Cairo = UTC+3)
    {
      from: new Date('2026-08-06T01:00:00.000Z'),
      to:   new Date('2026-08-06T02:00:00.000Z'),
      label: '2026-08-06 الساعة 4-5 صباحاً (توقيت القاهرة)'
    },
    // 2026-08-05 4:00-5:00 صباحاً
    {
      from: new Date('2026-08-05T01:00:00.000Z'),
      to:   new Date('2026-08-05T02:00:00.000Z'),
      label: '2026-08-05 الساعة 4-5 صباحاً (توقيت القاهرة)'
    }
  ];

  console.log('='.repeat(60));
  console.log('🔎 فحص الصور المرفوعة على أكونت La Crosta');
  console.log('='.repeat(60));

  const restaurant = await getRestaurantId('lacrosta@asntechnology.net');

  for (const { from, to, label } of checkDates) {
    console.log('\n' + '='.repeat(60));
    console.log(`📅 الفترة: ${label}`);
    console.log('='.repeat(60));

    if (restaurant) {
      await checkMenuItems(restaurant.id, from, to);
    }
    await checkStorageFiles(from, to);
  }

  // كمان نفحص آخر الصور المرفوعة عموماً في Storage (مش مقيد بـ restaurant)
  console.log('\n' + '='.repeat(60));
  console.log('📋 آخر 20 ملف مرفوع على Storage (original) بغض النظر عن الوقت');
  console.log('='.repeat(60));
  
  const { data: recentFiles } = await supabase.storage
    .from(BUCKET)
    .list('original', {
      limit: 20,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (recentFiles && recentFiles.length > 0) {
    recentFiles.forEach((f, i) => {
      const t = new Date(f.created_at);
      const localTime = t.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
      console.log(`  ${i+1}. ${f.name} | ${localTime} | ${f.metadata?.size ? (f.metadata.size/1024).toFixed(1)+'KB' : '?'}`);
    });
  } else {
    console.log('لا توجد ملفات');
  }
}

main().catch(console.error);
