/**
 * يولّد أداة تفاعلية - كل صورة يتم إسنادها للصنف الصح يدوياً
 * ثم حفظ النتيجة كـ JSON وتطبيقه على الداتابيز
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://dphylskqazuytvibiysn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlsc2txYXp1eXR2aWJpeXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA0ODM4NiwiZXhwIjoyMDg3NjI0Mzg2fQ.vELDlTa0irq1nauUxJxK-UOcbbe_B-GElqdaaAPrnEg';
const BUCKET = 'menu-images';
const BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const RESTAURANT_ID = 'c4a3edb7-eb01-4030-8cce-de905b38f9dd';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const LACROSTA_SESSIONS = [
  { from: new Date('2026-08-05T16:56:00Z'), to: new Date('2026-08-05T18:20:00Z') },
  { from: new Date('2026-08-06T00:27:00Z'), to: new Date('2026-08-06T00:57:59Z') },
  { from: new Date('2026-08-06T01:00:00Z'), to: new Date('2026-08-06T02:00:00Z') },
];

async function getAllLinkedImageIds() {
  let ids = new Set();
  let offset = 0;
  while (true) {
    const { data } = await sb.from('items').select('image_url').not('image_url', 'is', null).range(offset, offset + 999);
    if (!data || data.length === 0) break;
    data.forEach(i => { const m = i.image_url?.match(/(?:original|thumbs)\/([^.]+)\.webp/); if (m) ids.add(m[1]); });
    if (data.length < 1000) break;
    offset += 1000;
  }
  return ids;
}

async function getAllStorageFiles() {
  let files = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.storage.from(BUCKET).list('original', { limit: 100, offset, sortBy: { column: 'created_at', order: 'asc' } });
    if (!data || data.length === 0) break;
    files = files.concat(data);
    if (data.length < 100) break;
    offset += 100;
  }
  return files;
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
  console.log('جاري التحضير...');
  const [linkedIds, allFiles, allItems] = await Promise.all([getAllLinkedImageIds(), getAllStorageFiles(), getLaCrostaItems()]);

  const orphanFiles = allFiles.filter(f => !linkedIds.has(f.name.replace('.webp', '')));
  const sessionFiles = orphanFiles.filter(f => {
    const t = new Date(f.created_at);
    return LACROSTA_SESSIONS.some(s => t >= s.from && t <= s.to);
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  console.log(`صور الجلسات: ${sessionFiles.length}, عناصر المنيو: ${allItems.length}`);

  // بيانات JSON للصفحة
  const imagesData = sessionFiles.map((f, i) => ({
    index: i,
    fileId: f.name.replace('.webp', ''),
    thumbUrl: `${BASE_URL}thumbs/${f.name}`,
    origUrl: `${BASE_URL}original/${f.name}`,
    time: new Date(f.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }),
    size: f.metadata?.size ? (f.metadata.size / 1024).toFixed(0) + ' KB' : '?'
  }));

  const itemsData = allItems.map((item, i) => ({
    index: i,
    id: item.id,
    title: item.title_ar,
    cat: item.cat_name,
    hasImage: !!item.image_url
  }));

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>🍕 La Crosta - ربط الصور بالأصناف</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #0f172a; color: #e2e8f0; }
    header { background: #1e293b; border-bottom: 2px solid #f59e0b; padding: 16px 24px; display: flex; align-items: center; gap: 16px; position: sticky; top: 0; z-index: 100; }
    header h1 { color: #f59e0b; font-size: 20px; }
    header .stats { display: flex; gap: 16px; margin-right: auto; font-size: 13px; color: #94a3b8; }
    header .stats span { background: #0f172a; padding: 4px 12px; border-radius: 20px; border: 1px solid #334155; }
    header .stats .done { color: #22c55e; border-color: #22c55e; }
    .btn { padding: 8px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: bold; transition: all .2s; }
    .btn-primary { background: #f59e0b; color: #0f172a; }
    .btn-primary:hover { background: #d97706; }
    .btn-danger { background: #dc2626; color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-success { background: #22c55e; color: #0f172a; }
    .btn-success:hover { background: #16a34a; }
    .container { display: flex; height: calc(100vh - 65px); }
    /* يسار: الصور */
    .images-panel { width: 55%; border-left: 2px solid #334155; overflow-y: auto; padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; align-content: start; }
    .img-card { background: #1e293b; border: 2px solid #334155; border-radius: 12px; overflow: hidden; cursor: pointer; transition: all .2s; position: relative; }
    .img-card:hover { border-color: #f59e0b; transform: translateY(-2px); }
    .img-card.selected { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.3); }
    .img-card.linked { border-color: #3b82f6; opacity: 0.7; }
    .img-card.linked::after { content: '✓'; position: absolute; top: 6px; right: 6px; background: #3b82f6; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 13px; }
    .img-card img { width: 100%; height: 140px; object-fit: cover; display: block; }
    .img-info { padding: 8px; font-size: 11px; color: #64748b; }
    .img-info .idx { font-weight: bold; color: #94a3b8; font-size: 13px; }
    .img-info .linked-to { color: #3b82f6; font-size: 11px; margin-top: 2px; word-break: break-word; }
    /* يمين: الأصناف */
    .items-panel { width: 45%; overflow-y: auto; padding: 16px; }
    .items-panel h2 { color: #f59e0b; margin-bottom: 12px; font-size: 15px; }
    .cat-group { margin-bottom: 20px; }
    .cat-title { background: #1e293b; border-right: 3px solid #f59e0b; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; color: #f59e0b; margin-bottom: 8px; }
    .item-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: all .2s; border: 1.5px solid transparent; margin-bottom: 4px; }
    .item-row:hover { background: #1e293b; border-color: #334155; }
    .item-row.has-image { border-color: #3b82f6; background: #1e3a5f; }
    .item-row.just-assigned { border-color: #22c55e; background: #14532d; }
    .item-num { width: 28px; height: 28px; background: #334155; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94a3b8; font-weight: bold; flex-shrink: 0; }
    .item-thumb { width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid #334155; flex-shrink: 0; }
    .item-thumb-placeholder { width: 44px; height: 44px; border-radius: 6px; background: #1e293b; border: 1px dashed #334155; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .item-details { flex: 1; min-width: 0; }
    .item-name { font-size: 14px; font-weight: bold; color: #e2e8f0; }
    .item-cat { font-size: 11px; color: #64748b; }
    .item-remove { width: 26px; height: 26px; background: #dc2626; border: none; border-radius: 50%; cursor: pointer; color: white; font-size: 14px; display: none; align-items: center; justify-content: center; flex-shrink: 0; }
    .item-row.has-image .item-remove { display: flex; }
    .item-row.just-assigned .item-remove { display: flex; }
    /* Modal تكبير الصورة */
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 999; align-items: center; justify-content: center; }
    .modal.show { display: flex; }
    .modal img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 12px; }
    .modal-close { position: fixed; top: 20px; left: 20px; background: #dc2626; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px; }
    /* Instructions */
    .instructions { background: #1e3a5f; border: 1px solid #3b82f6; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; line-height: 1.8; }
    .instructions strong { color: #f59e0b; }
    /* Save panel */
    .save-panel { position: fixed; bottom: 0; left: 0; right: 0; background: #1e293b; border-top: 2px solid #334155; padding: 12px 24px; display: flex; align-items: center; gap: 12px; z-index: 100; }
    .save-info { font-size: 13px; color: #94a3b8; flex: 1; }
    #status-msg { padding: 8px 16px; background: #0f172a; border-radius: 8px; font-size: 13px; border: 1px solid #334155; }
    .panels-wrap { display: flex; width: 100%; height: calc(100vh - 65px - 56px); }
  </style>
</head>
<body>

<header>
  <div>
    <h1>🍕 La Crosta — ربط الصور بالأصناف</h1>
    <div style="font-size:12px;color:#64748b">اختر صورة ← اضغط على الصنف المقابل لها</div>
  </div>
  <div class="stats">
    <span id="stat-total">📸 <strong id="img-count">0</strong> صورة</span>
    <span id="stat-done" class="done">✅ تم ربط: <strong id="done-count">0</strong></span>
    <span>📋 أصناف بدون صور: <strong id="no-img-count">0</strong></span>
  </div>
  <button class="btn btn-danger" onclick="clearAll()">🗑️ مسح الكل</button>
  <button class="btn btn-success" onclick="saveToServer()">💾 حفظ في قاعدة البيانات</button>
</header>

<div class="panels-wrap">
  <!-- الأصناف - يمين -->
  <div class="items-panel" id="items-panel">
    <div class="instructions">
      <strong>طريقة الاستخدام:</strong><br>
      1️⃣ اختر صورة من اليسار (ستتحول لإطار أخضر)<br>
      2️⃣ اضغط على الصنف المقابل لها من اليمين<br>
      3️⃣ اضغط "حفظ في قاعدة البيانات" بعد الانتهاء<br>
      ❌ زر الإزالة يلغي الربط ويرجع الصورة للقائمة
    </div>
    <h2>📋 أصناف La Crosta</h2>
    <div id="items-container"></div>
  </div>
  
  <!-- الصور - يسار -->
  <div class="images-panel" id="images-panel"></div>
</div>

<div class="save-panel">
  <div class="save-info">بعد ربط كل الصور بأصنافها، اضغط "حفظ" لتطبيق التغييرات مباشرة على قاعدة البيانات</div>
  <div id="status-msg">جاري التحميل...</div>
  <button class="btn btn-success" onclick="saveToServer()" style="padding:10px 28px;font-size:15px">💾 حفظ الكل</button>
</div>

<div class="modal" id="modal" onclick="closeModal()">
  <button class="modal-close" onclick="closeModal()">✕</button>
  <img id="modal-img" src="" alt="">
</div>

<script>
const SUPABASE_URL = '${SUPABASE_URL}';
const SERVICE_KEY = '${SERVICE_ROLE_KEY}';

const IMAGES = ${JSON.stringify(imagesData, null, 2)};
const ITEMS = ${JSON.stringify(itemsData, null, 2)};

// state
let selectedImageIdx = null;  // فهرس الصورة المختارة حالياً
let assignments = {};  // { itemId: { imageIdx, fileId, thumbUrl, origUrl } }
// Load existing assignments from items that already have images
ITEMS.forEach(item => {
  if (item.hasImage) {
    // mark as already linked (we'll skip them in saving)
    assignments[item.id] = { existing: true };
  }
});

function renderImages() {
  const panel = document.getElementById('images-panel');
  panel.innerHTML = '';
  IMAGES.forEach((img, idx) => {
    const isLinked = Object.values(assignments).some(a => !a.existing && a.imageIdx === idx);
    const isSelected = selectedImageIdx === idx;
    const card = document.createElement('div');
    card.className = 'img-card' + (isSelected ? ' selected' : '') + (isLinked ? ' linked' : '');
    card.dataset.idx = idx;
    
    // Find what item this is linked to
    let linkedLabel = '';
    if (isLinked) {
      const assignedItem = ITEMS.find(item => assignments[item.id]?.imageIdx === idx);
      if (assignedItem) linkedLabel = \`<div class="linked-to">→ \${assignedItem.title} (\${assignedItem.cat})</div>\`;
    }
    
    card.innerHTML = \`
      <img src="\${img.thumbUrl}" alt="\${idx+1}" loading="lazy"
           onerror="this.src='\${img.origUrl}'"
           ondblclick="openModal('\${img.origUrl}')" />
      <div class="img-info">
        <div class="idx">#\${idx+1} · \${img.time.split('،')[1]?.trim() || img.time}</div>
        <div>\${img.size}</div>
        \${linkedLabel}
      </div>\`;
    card.onclick = (e) => {
      if (e.target.tagName === 'IMG' && e.detail === 1) selectImage(idx);
      else if (e.target.tagName !== 'IMG') selectImage(idx);
    };
    panel.appendChild(card);
  });
  updateStats();
}

function renderItems() {
  const container = document.getElementById('items-container');
  container.innerHTML = '';
  
  // Group by category
  const cats = {};
  ITEMS.forEach(item => {
    if (!cats[item.cat]) cats[item.cat] = [];
    cats[item.cat].push(item);
  });
  
  Object.entries(cats).forEach(([catName, items]) => {
    const group = document.createElement('div');
    group.className = 'cat-group';
    group.innerHTML = \`<div class="cat-title">📂 \${catName}</div>\`;
    
    items.forEach(item => {
      const assigned = assignments[item.id];
      const hasNewAssignment = assigned && !assigned.existing;
      const hasExistingImage = assigned && assigned.existing;
      
      const row = document.createElement('div');
      row.className = 'item-row' + (hasNewAssignment ? ' just-assigned' : '') + (hasExistingImage ? ' has-image' : '');
      row.dataset.itemId = item.id;
      
      let thumbHtml = '';
      if (hasNewAssignment) {
        const img = IMAGES[assigned.imageIdx];
        thumbHtml = \`<img class="item-thumb" src="\${img.thumbUrl}" onerror="this.src='\${img.origUrl}'" />\`;
      } else if (hasExistingImage) {
        thumbHtml = \`<div class="item-thumb-placeholder">🖼️</div>\`;
      } else {
        thumbHtml = \`<div class="item-thumb-placeholder">📷</div>\`;
      }
      
      row.innerHTML = \`
        \${thumbHtml}
        <div class="item-num">\${item.index+1}</div>
        <div class="item-details">
          <div class="item-name">\${item.title}</div>
          <div class="item-cat">\${item.cat}</div>
        </div>
        <button class="item-remove" onclick="removeAssignment(event, '\${item.id}')">✕</button>\`;
      
      row.onclick = () => assignToItem(item.id);
      group.appendChild(row);
    });
    container.appendChild(group);
  });
}

function selectImage(idx) {
  selectedImageIdx = idx;
  renderImages();
  document.getElementById('status-msg').textContent = \`✅ صورة #\${idx+1} محددة — اضغط على الصنف المقابل لها\`;
}

function assignToItem(itemId) {
  if (selectedImageIdx === null) {
    document.getElementById('status-msg').textContent = '⚠️ اختر صورة أولاً من اليسار';
    return;
  }
  
  // Check if this image is already assigned to another item, remove that assignment
  Object.keys(assignments).forEach(id => {
    if (assignments[id].imageIdx === selectedImageIdx) {
      delete assignments[id];
    }
  });
  
  const img = IMAGES[selectedImageIdx];
  assignments[itemId] = { imageIdx: selectedImageIdx, fileId: img.fileId, thumbUrl: img.thumbUrl, origUrl: img.origUrl };
  
  const item = ITEMS.find(i => i.id === itemId);
  document.getElementById('status-msg').textContent = \`✅ تم ربط صورة #\${selectedImageIdx+1} بـ "\${item?.title}"\`;
  
  selectedImageIdx = null;
  renderImages();
  renderItems();
}

function removeAssignment(e, itemId) {
  e.stopPropagation();
  delete assignments[itemId];
  renderImages();
  renderItems();
  document.getElementById('status-msg').textContent = '🗑️ تم إلغاء الربط';
}

function clearAll() {
  if (!confirm('هل تريد مسح كل الروابط الجديدة؟')) return;
  Object.keys(assignments).forEach(id => {
    if (!assignments[id].existing) delete assignments[id];
  });
  selectedImageIdx = null;
  renderImages();
  renderItems();
}

function updateStats() {
  document.getElementById('img-count').textContent = IMAGES.length;
  const doneCount = Object.values(assignments).filter(a => !a.existing).length;
  document.getElementById('done-count').textContent = doneCount;
  const noImgCount = ITEMS.filter(i => !assignments[i.id]).length;
  document.getElementById('no-img-count').textContent = noImgCount;
}

function openModal(url) {
  document.getElementById('modal-img').src = url;
  document.getElementById('modal').classList.add('show');
}
function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

async function saveToServer() {
  const newAssignments = Object.entries(assignments).filter(([_, a]) => !a.existing);
  if (newAssignments.length === 0) {
    document.getElementById('status-msg').textContent = '⚠️ لا يوجد روابط جديدة للحفظ';
    return;
  }
  
  const btn = document.querySelector('.btn-success');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الحفظ...';
  document.getElementById('status-msg').textContent = 'جاري الحفظ...';
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [itemId, assignment] of newAssignments) {
    const BASE = '${BASE_URL}';
    const origUrl = BASE + 'original/' + assignment.fileId + '.webp';
    const thumbUrl = BASE + 'thumbs/' + assignment.fileId + '.webp';
    
    try {
      const res = await fetch(\`\${SUPABASE_URL}/rest/v1/items?id=eq.\${itemId}\`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': 'Bearer ' + SERVICE_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ image_url: origUrl, thumbnail_url: thumbUrl })
      });
      
      if (res.ok) {
        successCount++;
      } else {
        const err = await res.text();
        console.error('Failed for item', itemId, err);
        failCount++;
      }
    } catch(e) {
      console.error(e);
      failCount++;
    }
  }
  
  btn.disabled = false;
  btn.textContent = '💾 حفظ الكل';
  
  if (failCount === 0) {
    document.getElementById('status-msg').textContent = \`✅ تم حفظ \${successCount} صورة بنجاح!\`;
    // Mark as existing
    newAssignments.forEach(([id, a]) => { assignments[id] = { ...a, existing: true }; });
    renderItems();
  } else {
    document.getElementById('status-msg').textContent = \`⚠️ تم: \${successCount} / فشل: \${failCount}\`;
  }
}

// Init
document.getElementById('status-msg').textContent = 'اختر صورة من اليسار ثم اضغط على الصنف المقابل';
renderImages();
renderItems();
updateStats();
</script>
</body>
</html>`;

  fs.writeFileSync('lacrosta_assign_tool.html', html, 'utf8');
  console.log('✅ تم توليد الأداة: lacrosta_assign_tool.html');
  console.log(`📸 الصور المتاحة: ${sessionFiles.length}`);
  console.log(`📋 الأصناف: ${allItems.length}`);
}

main().catch(console.error);
