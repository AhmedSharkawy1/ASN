/**
 * يولد صفحة HTML تعرض كل الصور اليتيمة من جلسات La Crosta
 * مع الـ items المقابلة عشان المستخدم يتحقق بصرياً
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://dphylskqazuytvibiysn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlsc2txYXp1eXR2aWJpeXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA0ODM4NiwiZXhwIjoyMDg3NjI0Mzg2fQ.vELDlTa0irq1nauUxJxK-UOcbbe_B-GElqdaaAPrnEg';
const BUCKET = 'menu-images';
const BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const RESTAURANT_ID = 'c4a3edb7-eb01-4030-8cce-de905b38f9dd';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// جلسات La Crosta المحددة (الصور اليتيمة في هذه النطاقات)
const LACROSTA_SESSIONS = [
  { from: new Date('2026-08-05T16:56:00Z'), to: new Date('2026-08-05T18:20:00Z') },
  { from: new Date('2026-08-06T00:27:00Z'), to: new Date('2026-08-06T00:57:59Z') },
  { from: new Date('2026-08-06T01:00:00Z'), to: new Date('2026-08-06T02:00:00Z') },
];

async function getAllLinkedImageIds() {
  let allLinkedIds = new Set();
  let offset = 0;
  while (true) {
    const { data } = await sb.from('items').select('image_url').not('image_url', 'is', null).range(offset, offset + 999);
    if (!data || data.length === 0) break;
    data.forEach(item => {
      const m = item.image_url?.match(/(?:original|thumbs)\/([^.]+)\.webp/);
      if (m) allLinkedIds.add(m[1]);
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
    const { data } = await sb.storage.from(BUCKET).list('original', { limit: 100, offset, sortBy: { column: 'created_at', order: 'asc' } });
    if (!data || data.length === 0) break;
    allFiles = allFiles.concat(data);
    if (data.length < 100) break;
    offset += 100;
  }
  return allFiles;
}

async function getLaCrostaItems() {
  const { data: cats } = await sb.from('categories').select('id, name_ar, sort_order').eq('restaurant_id', RESTAURANT_ID).order('sort_order');
  let items = [];
  for (const cat of (cats || [])) {
    const { data } = await sb.from('items').select('id, title_ar, image_url, sort_order').eq('category_id', cat.id).order('sort_order');
    if (data) items = items.concat(data.map(i => ({ ...i, cat_name: cat.name_ar })));
  }
  return items;
}

async function main() {
  console.log('جاري التحليل...');
  const [linkedIds, allFiles, allItems] = await Promise.all([
    getAllLinkedImageIds(),
    getAllStorageFiles(),
    getLaCrostaItems()
  ]);

  // الصور اليتيمة
  const orphanFiles = allFiles.filter(f => !linkedIds.has(f.name.replace('.webp', '')));

  // فلتر الصور في جلسات La Crosta
  const sessionFiles = orphanFiles.filter(f => {
    const t = new Date(f.created_at);
    return LACROSTA_SESSIONS.some(s => t >= s.from && t <= s.to);
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  console.log(`صور جلسات La Crosta: ${sessionFiles.length}`);
  console.log(`عناصر المنيو: ${allItems.length}`);

  const itemsWithoutImages = allItems.filter(i => !i.image_url);

  // توليد HTML
  const rows = sessionFiles.map((f, i) => {
    const fileId = f.name.replace('.webp', '');
    const thumbUrl = `${BASE_URL}thumbs/${f.name}`;
    const origUrl = `${BASE_URL}original/${f.name}`;
    const t = new Date(f.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
    const size = f.metadata?.size ? (f.metadata.size / 1024).toFixed(0) + ' KB' : '?';
    const item = itemsWithoutImages[i];
    const itemDisplay = item ? `${i + 1}. ${item.title_ar} (${item.cat_name})` : `⚠️ لا يوجد عنصر مقابل`;

    return `
    <tr id="row-${i+1}" class="${i % 2 === 0 ? 'even' : 'odd'}">
      <td class="num">${i + 1}</td>
      <td class="img-cell">
        <a href="${origUrl}" target="_blank">
          <img src="${thumbUrl}" alt="صورة ${i+1}" onerror="this.src='${origUrl}'" />
        </a>
        <div class="file-info">${t}<br/>${size}</div>
      </td>
      <td class="item-name">${itemDisplay}</td>
      <td class="url-cell">
        <code>${fileId}</code>
        <br/><a href="${thumbUrl}" target="_blank">thumb</a>
        &nbsp;|&nbsp;
        <a href="${origUrl}" target="_blank">original</a>
      </td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>صور La Crosta - مراجعة</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    h1 { color: #f59e0b; text-align: center; margin-bottom: 5px; }
    .subtitle { text-align: center; color: #94a3b8; margin-bottom: 20px; font-size: 14px; }
    .stats { display: flex; gap: 20px; justify-content: center; margin-bottom: 20px; }
    .stat { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 12px 24px; text-align: center; }
    .stat .num { font-size: 28px; font-weight: bold; color: #f59e0b; }
    .stat .label { font-size: 12px; color: #94a3b8; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 12px; overflow: hidden; }
    th { background: #334155; padding: 12px; text-align: right; color: #f59e0b; font-size: 13px; }
    tr.even { background: #1e293b; }
    tr.odd { background: #172033; }
    tr:hover { background: #263350 !important; }
    td { padding: 10px; vertical-align: middle; border-bottom: 1px solid #2d3748; }
    td.num { width: 40px; text-align: center; color: #64748b; font-size: 13px; }
    td.img-cell { width: 130px; text-align: center; }
    td.img-cell img { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #334155; cursor: pointer; transition: transform 0.2s; }
    td.img-cell img:hover { transform: scale(2.5); z-index: 100; position: relative; }
    .file-info { font-size: 10px; color: #64748b; margin-top: 4px; }
    td.item-name { font-size: 14px; font-weight: bold; color: #e2e8f0; }
    td.url-cell { font-size: 11px; color: #64748b; word-break: break-all; }
    td.url-cell code { background: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #94a3b8; }
    td.url-cell a { color: #3b82f6; }
    .warning { background: #7c2d12; border: 1px solid #dc2626; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center; }
    .info { background: #1e3a5f; border: 1px solid #3b82f6; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center; }
  </style>
</head>
<body>
  <h1>🖼️ صور La Crosta - مراجعة التطابق</h1>
  <p class="subtitle">lacrosta@asntechnology.net</p>
  
  <div class="stats">
    <div class="stat"><div class="num">${sessionFiles.length}</div><div class="label">صورة مُعثور عليها</div></div>
    <div class="stat"><div class="num">${allItems.length}</div><div class="label">إجمالي العناصر</div></div>
    <div class="stat"><div class="num">${itemsWithoutImages.length}</div><div class="label">عناصر بدون صور</div></div>
  </div>

  ${sessionFiles.length !== itemsWithoutImages.length ? 
    `<div class="warning">⚠️ عدد الصور (${sessionFiles.length}) لا يساوي عدد العناصر بدون صور (${itemsWithoutImages.length})</div>` : 
    `<div class="info">✅ عدد الصور يساوي عدد العناصر تماماً (${sessionFiles.length})</div>`
  }

  <div class="info">🔍 تحقق من الصور — اضغط على أي صورة لفتحها بالحجم الكامل. الصور مرتبة بالتوقيت (الأقدم أولاً)</div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>الصورة</th>
        <th>العنصر المقترح (حسب الترتيب)</th>
        <th>معرّف الملف</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  fs.writeFileSync('lacrosta_images_preview.html', html, 'utf8');
  console.log('\n✅ تم توليد الملف: lacrosta_images_preview.html');
  console.log('افتح الملف في المتصفح لمراجعة الصور');
}

main().catch(console.error);
