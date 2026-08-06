/**
 * سكريبت ربط صور La Crosta بالـ items
 * 
 * المنطق:
 * - من الـ Storage، الصور المرفوعة في جلسات متتالية قريبة من بعض = جلسة رفع واحدة
 * - نحدد الجلسات اللي تخص La Crosta بناءً على التواريخ اللي عرفناها
 * - نرتب الـ items بنفس ترتيب الـ DB (sort_order)
 * - نربط بالترتيب: صورة رقم 1 → item رقم 1
 * - أي صور زيادة → نوضحها ونوقف
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dphylskqazuytvibiysn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlsc2txYXp1eXR2aWJpeXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA0ODM4NiwiZXhwIjoyMDg3NjI0Mzg2fQ.vELDlTa0irq1nauUxJxK-UOcbbe_B-GElqdaaAPrnEg';
const BUCKET = 'menu-images';
const BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const RESTAURANT_ID = 'c4a3edb7-eb01-4030-8cce-de905b38f9dd';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ======== تحديد جلسات الرفع الخاصة بـ La Crosta ========
// بناءً على تحليل التواريخ:
// الجلسة 1: 2026-08-05 (من 7:56 م حتى 8:12 م) - msgb...
// الجلسة 2: 2026-08-06 3:27 ص - 3:57 ص (msgs...)
// الجلسة 3: 2026-08-06 4:01 ص - 4:58 ص (msgt/msgu/msgv...)
// الجلسة 4: 2026-08-06 6:05 ص (msgx...) - هذه الوحيدة مرتبطة بـ 'كلاسيك لحم'
const LACROSTA_SESSIONS = [
  { from: new Date('2026-08-05T16:56:00Z'), to: new Date('2026-08-05T18:20:00Z'), label: 'جلسة 1 (5 أغسطس 7:56-8:12 م)' },
  { from: new Date('2026-08-06T00:27:00Z'), to: new Date('2026-08-06T00:57:59Z'), label: 'جلسة 2 (6 أغسطس 3:27-3:57 ص)' },
  { from: new Date('2026-08-06T01:00:00Z'), to: new Date('2026-08-06T02:00:00Z'), label: 'جلسة 3 (6 أغسطس 4:01-4:58 ص)' },
];

async function getStorageFilesInRange(from, to) {
  let files = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.storage.from(BUCKET).list('original', {
      limit: 100, offset, sortBy: { column: 'created_at', order: 'asc' }
    });
    if (error || !data || data.length === 0) break;
    const inRange = data.filter(f => {
      if (!f.created_at) return false;
      const t = new Date(f.created_at);
      return t >= from && t <= to;
    });
    files = files.concat(inRange);
    // إذا آخر ملف تجاوز الـ to أو وصلنا للنهاية، نوقف
    const last = new Date(data[data.length - 1]?.created_at || 0);
    if (last > to || data.length < 100) break;
    offset += 100;
  }
  return files.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

async function getAllLaCrostaItems() {
  const { data: cats } = await sb
    .from('categories')
    .select('id, name_ar, sort_order')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('sort_order', { ascending: true });

  let allItems = [];
  for (const cat of (cats || [])) {
    const { data: items } = await sb
      .from('items')
      .select('id, title_ar, image_url, thumbnail_url, sort_order, category_id')
      .eq('category_id', cat.id)
      .order('sort_order', { ascending: true });
    if (items) {
      allItems = allItems.concat(items.map(i => ({ ...i, cat_name: cat.name_ar })));
    }
  }
  return allItems;
}

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run');
  
  console.log('='.repeat(70));
  console.log('🚀 ربط صور La Crosta بالـ items' + (DRY_RUN ? ' [وضع المعاينة - لا تغييرات]' : ' [وضع التنفيذ الفعلي]'));
  console.log('='.repeat(70));

  // 1. جيب كل الـ items
  console.log('\n📋 [1] جلب كل عناصر المنيو...');
  const allItems = await getAllLaCrostaItems();
  const itemsWithoutImages = allItems.filter(i => !i.image_url);
  const itemsWithImages = allItems.filter(i => i.image_url);
  
  console.log(`  إجمالي العناصر: ${allItems.length}`);
  console.log(`  عناصر بها صور: ${itemsWithImages.length}`);
  console.log(`  عناصر بدون صور: ${itemsWithoutImages.length}`);

  // 2. جيب الصور من كل جلسة
  console.log('\n📦 [2] جلب الصور من Storage...');
  let allSessionFiles = [];
  for (const session of LACROSTA_SESSIONS) {
    const files = await getStorageFilesInRange(session.from, session.to);
    console.log(`  ${session.label}: ${files.length} صورة`);
    files.forEach(f => {
      const t = new Date(f.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
      console.log(`    - ${f.name} | ${t} | ${(f.metadata?.size/1024).toFixed(0)}KB`);
    });
    allSessionFiles = allSessionFiles.concat(files);
  }
  
  console.log(`\n  إجمالي الصور في جلسات La Crosta: ${allSessionFiles.length}`);

  // 3. تحقق من الصور المرتبطة بالفعل
  const alreadyLinkedIds = itemsWithImages.map(i => {
    const m = i.image_url?.match(/original\/([^.]+)\.webp/);
    return m ? m[1] : null;
  }).filter(Boolean);

  const unlinkedFiles = allSessionFiles.filter(f => !alreadyLinkedIds.includes(f.name.replace('.webp', '')));
  console.log(`\n  صور مرتبطة بالفعل: ${allSessionFiles.length - unlinkedFiles.length}`);
  console.log(`  صور تحتاج ربط: ${unlinkedFiles.length}`);

  // 4. ربط الصور بالـ items (بالترتيب)
  console.log('\n🔗 [3] خطة الربط:');
  
  if (unlinkedFiles.length === 0) {
    console.log('  ✅ كل الصور مرتبطة بالفعل!');
    return;
  }

  if (unlinkedFiles.length > itemsWithoutImages.length) {
    console.log(`\n  ⚠️  تحذير: عدد الصور (${unlinkedFiles.length}) أكبر من عدد العناصر بدون صور (${itemsWithoutImages.length})`);
    console.log('  سيتم ربط الصور بالعناصر بالترتيب، والصور الزيادة ستُترك.');
  }

  const updatePlan = [];
  for (let i = 0; i < Math.min(unlinkedFiles.length, itemsWithoutImages.length); i++) {
    const file = unlinkedFiles[i];
    const item = itemsWithoutImages[i];
    const fileId = file.name.replace('.webp', '');
    const originalUrl = `${BASE_URL}original/${fileId}.webp`;
    const thumbUrl = `${BASE_URL}thumbs/${fileId}.webp`;
    const t = new Date(file.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
    
    console.log(`  ${i+1}. "${item.title_ar}" (${item.cat_name})`);
    console.log(`     ← صورة: ${file.name} | ${t}`);
    updatePlan.push({ item, originalUrl, thumbUrl, fileId });
  }

  // الصور الزيادة
  if (unlinkedFiles.length > itemsWithoutImages.length) {
    const extras = unlinkedFiles.slice(itemsWithoutImages.length);
    console.log(`\n  📌 صور زيادة (${extras.length} صورة) ستُترك بدون ربط:`);
    extras.forEach(f => {
      const t = new Date(f.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
      console.log(`     - ${f.name} | ${t}`);
    });
  }

  if (DRY_RUN) {
    console.log('\n\n🔍 وضع المعاينة — لا تغييرات. تشغيل بدون --dry-run للتنفيذ الفعلي.');
    return;
  }

  // 5. تنفيذ التحديثات
  console.log('\n💾 [4] تنفيذ التحديثات في قاعدة البيانات...');
  let successCount = 0;
  let failCount = 0;

  for (const plan of updatePlan) {
    const { error } = await sb
      .from('items')
      .update({
        image_url: plan.originalUrl,
        thumbnail_url: plan.thumbUrl
      })
      .eq('id', plan.item.id);

    if (error) {
      console.log(`  ❌ فشل: "${plan.item.title_ar}" — ${error.message}`);
      failCount++;
    } else {
      console.log(`  ✅ تم: "${plan.item.title_ar}"`);
      successCount++;
    }
  }

  // 6. تثبيت HD flag
  console.log('\n⚙️  [5] تفعيل high_quality_images...');
  const { error: hdError } = await sb
    .from('restaurants')
    .update({ high_quality_images: true })
    .eq('id', RESTAURANT_ID);
  
  if (hdError) {
    console.log('  ❌ فشل تفعيل HD:', hdError.message);
  } else {
    console.log('  ✅ تم تفعيل high_quality_images = true');
  }

  // 7. ملخص
  console.log('\n' + '='.repeat(70));
  console.log('📊 ملخص النتائج:');
  console.log('='.repeat(70));
  console.log(`  ✅ تم ربط: ${successCount} صورة`);
  if (failCount > 0) console.log(`  ❌ فشل: ${failCount} صورة`);
  console.log(`  📸 HD Quality: ${hdError ? 'فشل' : 'مفعّل ✅'}`);
  
  // تحقق نهائي
  const { data: cats2 } = await sb.from('categories').select('id').eq('restaurant_id', RESTAURANT_ID);
  const catIds = (cats2 || []).map(c => c.id);
  const { data: finalItems } = await sb.from('items').select('id, image_url').in('category_id', catIds);
  const withImg = (finalItems || []).filter(i => i.image_url).length;
  console.log(`\n  إجمالي العناصر بصور بعد التحديث: ${withImg}/${(finalItems || []).length}`);
}

main().catch(console.error);
