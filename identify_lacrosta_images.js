/**
 * تحديد الصور الخاصة بـ La Crosta فقط
 * 
 * المنطق:
 * - كل الصور في Storage مشتركة بين كل المطاعم
 * - نجيب كل image_urls المحفوظة في items لكل المطاعم
 * - الصور اللي مش مرتبطة بأي مطعم تاني = هي الصور اليتيمة
 * - من الصور اليتيمة، نحدد الفترات الزمنية الخاصة بـ La Crosta
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dphylskqazuytvibiysn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlsc2txYXp1eXR2aWJpeXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA0ODM4NiwiZXhwIjoyMDg3NjI0Mzg2fQ.vELDlTa0irq1nauUxJxK-UOcbbe_B-GElqdaaAPrnEg';
const BUCKET = 'menu-images';
const BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const RESTAURANT_ID = 'c4a3edb7-eb01-4030-8cce-de905b38f9dd';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function getAllLinkedImageIds() {
  // جيب كل image_urls المحفوظة في items لكل المطاعم (مش بس La Crosta)
  let allLinkedIds = new Set();
  let offset = 0;
  
  while (true) {
    const { data, error } = await sb
      .from('items')
      .select('image_url, thumbnail_url')
      .not('image_url', 'is', null)
      .range(offset, offset + 999);
    
    if (error || !data || data.length === 0) break;
    
    data.forEach(item => {
      const extractId = url => {
        if (!url) return null;
        const m = url.match(/(?:original|thumbs)\/([^.]+)\.webp/);
        return m ? m[1] : null;
      };
      const id1 = extractId(item.image_url);
      const id2 = extractId(item.thumbnail_url);
      if (id1) allLinkedIds.add(id1);
      if (id2) allLinkedIds.add(id2);
    });
    
    if (data.length < 1000) break;
    offset += 1000;
  }
  
  return allLinkedIds;
}

async function getAllStorageFiles() {
  let allFiles = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.storage.from(BUCKET).list('original', {
      limit: 100, offset, sortBy: { column: 'created_at', order: 'asc' }
    });
    if (error || !data || data.length === 0) break;
    allFiles = allFiles.concat(data);
    if (data.length < 100) break;
    offset += 100;
  }
  return allFiles;
}

function detectSessions(files, maxGapMinutes = 15) {
  // جمّع الصور في جلسات بناءً على الفجوة الزمنية
  const sessions = [];
  let current = [];
  
  for (let i = 0; i < files.length; i++) {
    if (current.length === 0) {
      current.push(files[i]);
    } else {
      const prev = new Date(files[i-1].created_at);
      const curr = new Date(files[i].created_at);
      const gapMin = (curr - prev) / 1000 / 60;
      
      if (gapMin <= maxGapMinutes) {
        current.push(files[i]);
      } else {
        sessions.push(current);
        current = [files[i]];
      }
    }
  }
  if (current.length > 0) sessions.push(current);
  return sessions;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🔍 تحديد الصور الخاصة بـ La Crosta فقط');
  console.log('='.repeat(70));

  // 1. جيب كل الصور المرتبطة بأي مطعم في الـ DB
  console.log('\n[1] جلب كل الصور المرتبطة في قاعدة البيانات (كل المطاعم)...');
  const linkedIds = await getAllLinkedImageIds();
  console.log(`  إجمالي الصور المرتبطة: ${linkedIds.size}`);

  // 2. جيب كل الصور على Storage
  console.log('\n[2] جلب كل الصور من Storage...');
  const allFiles = await getAllStorageFiles();
  console.log(`  إجمالي الصور على Storage: ${allFiles.length}`);

  // 3. الصور اليتيمة (غير مرتبطة بأي مطعم)
  const orphanFiles = allFiles.filter(f => !linkedIds.has(f.name.replace('.webp', '')));
  console.log(`  الصور اليتيمة (غير مرتبطة): ${orphanFiles.length}`);

  // 4. جلسات الصور اليتيمة
  console.log('\n[3] تحليل جلسات الصور اليتيمة:');
  const sessions = detectSessions(orphanFiles, 15);
  console.log(`  عدد الجلسات: ${sessions.length}`);

  sessions.forEach((session, si) => {
    const first = new Date(session[0].created_at);
    const last = new Date(session[session.length-1].created_at);
    const firstLocal = first.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
    const lastLocal = last.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
    const durationMin = Math.round((last - first) / 1000 / 60);
    console.log(`\n  جلسة ${si+1}: ${session.length} صورة`);
    console.log(`    من: ${firstLocal}`);
    console.log(`    إلى: ${lastLocal}`);
    console.log(`    المدة: ${durationMin} دقيقة`);
    session.forEach((f, fi) => {
      const t = new Date(f.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
      const size = f.metadata?.size ? (f.metadata.size/1024).toFixed(0)+'KB' : '?';
      console.log(`      ${fi+1}. ${f.name} | ${t} | ${size}`);
    });
  });

  // 5. حساب La Crosta items بدون صور
  const { data: cats } = await sb.from('categories').select('id, name_ar, sort_order').eq('restaurant_id', RESTAURANT_ID).order('sort_order');
  let itemsWithoutImages = [];
  for (const cat of (cats || [])) {
    const { data: items } = await sb.from('items')
      .select('id, title_ar, sort_order, category_id')
      .eq('category_id', cat.id)
      .is('image_url', null)
      .order('sort_order');
    if (items) itemsWithoutImages = itemsWithoutImages.concat(items.map(i => ({ ...i, cat_name: cat.name_ar })));
  }
  
  console.log(`\n[4] عناصر La Crosta بدون صور: ${itemsWithoutImages.length}`);
  console.log(`    إجمالي الصور اليتيمة: ${orphanFiles.length}`);
  
  if (orphanFiles.length === itemsWithoutImages.length) {
    console.log('\n  ✅ عدد الصور = عدد العناصر بدون صور تماماً!');
  } else {
    console.log(`\n  ⚠️  فرق: ${Math.abs(orphanFiles.length - itemsWithoutImages.length)} (صور ${orphanFiles.length > itemsWithoutImages.length ? 'زيادة' : 'ناقصة'})`);
  }
  
  console.log('\n[5] تفاصيل العناصر:');
  itemsWithoutImages.forEach((item, i) => {
    console.log(`  ${i+1}. ${item.title_ar} (${item.cat_name})`);
  });
}

main().catch(console.error);
