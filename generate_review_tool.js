/**
 * أداة مراجعة وتصحيح — تعرض الصور المرتبطة حالياً بأصناف La Crosta
 * المستخدم يقدر يسحب صورة من صنف لصنف تاني أو يحذفها
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://dphylskqazuytvibiysn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlsc2txYXp1eXR2aWJpeXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA0ODM4NiwiZXhwIjoyMDg3NjI0Mzg2fQ.vELDlTa0irq1nauUxJxK-UOcbbe_B-GElqdaaAPrnEg';
const RESTAURANT_ID = 'c4a3edb7-eb01-4030-8cce-de905b38f9dd';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function getLaCrostaItemsWithImages() {
  const { data: cats } = await sb.from('categories').select('id, name_ar, sort_order').eq('restaurant_id', RESTAURANT_ID).order('sort_order');
  let items = [];
  for (const cat of (cats || [])) {
    const { data } = await sb.from('items').select('id, title_ar, image_url, thumbnail_url, sort_order').eq('category_id', cat.id).order('sort_order');
    if (data) items = items.concat(data.map(i => ({ ...i, cat_name: cat.name_ar })));
  }
  return items;
}

async function main() {
  console.log('جاري جلب البيانات...');
  const allItems = await getLaCrostaItemsWithImages();
  const itemsWithImages = allItems.filter(i => i.image_url);
  const itemsWithout = allItems.filter(i => !i.image_url);

  console.log(`إجمالي الأصناف: ${allItems.length}`);
  console.log(`بها صور: ${itemsWithImages.length}`);
  console.log(`بدون صور: ${itemsWithout.length}`);

  // بناء HTML
  const itemsJson = JSON.stringify(allItems);

  // Group by category for display
  const cats = {};
  allItems.forEach(item => {
    if (!cats[item.cat_name]) cats[item.cat_name] = [];
    cats[item.cat_name].push(item);
  });

  const catSections = Object.entries(cats).map(([catName, items]) => {
    const rows = items.map(item => {
      const thumbUrl = item.thumbnail_url || item.image_url || '';
      const origUrl = item.image_url || '';
      const hasImg = !!item.image_url;
      return `
        <div class="item-card ${hasImg ? 'has-img' : 'no-img'}" id="item-${item.id}" data-item-id="${item.id}" data-item-name="${item.title_ar}" data-cat="${item.cat_name}">
          <div class="img-area" onclick="${hasImg ? `openModal('${origUrl}','${item.id}')` : ''}">
            ${hasImg
              ? `<img src="${thumbUrl}" onerror="this.src='${origUrl}'" alt="${item.title_ar}" />`
              : `<div class="no-img-placeholder">📷<br><span>لا توجد صورة</span></div>`
            }
            ${hasImg ? `<div class="img-overlay">🔍 عرض</div>` : ''}
          </div>
          <div class="item-info">
            <div class="item-title">${item.title_ar}</div>
            <div class="item-cat-label">${item.cat_name}</div>
            ${hasImg ? `
            <div class="item-actions">
              <button class="btn-move" onclick="startMove('${item.id}', '${thumbUrl}', '${origUrl}', '${item.title_ar}')">🔄 نقل لصنف آخر</button>
              <button class="btn-remove" onclick="removeImage('${item.id}', '${item.title_ar}')">🗑️ حذف الصورة</button>
            </div>` : `
            <div class="item-actions">
              <button class="btn-assign" onclick="assignPending('${item.id}')">➕ إسناد صورة</button>
            </div>`
            }
          </div>
        </div>`;
    }).join('');

    const hasImgCount = items.filter(i => i.image_url).length;
    return `
      <div class="cat-section">
        <div class="cat-header">
          <span class="cat-icon">📂</span>
          <span class="cat-name">${catName}</span>
          <span class="cat-count">${hasImgCount}/${items.length} صورة</span>
        </div>
        <div class="items-grid">${rows}</div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>🍕 La Crosta — مراجعة وتصحيح الصور</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }

    header { background: #1e293b; border-bottom: 2px solid #f59e0b; padding: 16px 24px; position: sticky; top: 0; z-index: 200; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
    header h1 { color: #f59e0b; font-size: 18px; }
    .stats-bar { display: flex; gap: 12px; margin-right: auto; flex-wrap: wrap; }
    .stat-pill { background: #0f172a; border: 1px solid #334155; border-radius: 20px; padding: 4px 14px; font-size: 12px; color: #94a3b8; }
    .stat-pill.green { border-color: #22c55e; color: #22c55e; }
    .stat-pill.red { border-color: #ef4444; color: #ef4444; }

    .main { max-width: 1400px; margin: 0 auto; padding: 24px; }

    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.7; }
    .alert-info { background: #1e3a5f; border: 1px solid #3b82f6; }
    .alert-warning { background: #422006; border: 1px solid #f59e0b; }

    .cat-section { margin-bottom: 32px; }
    .cat-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 10px 16px; background: #1e293b; border-radius: 10px; border-right: 4px solid #f59e0b; }
    .cat-name { font-size: 16px; font-weight: bold; color: #f59e0b; }
    .cat-count { font-size: 12px; color: #64748b; background: #0f172a; padding: 2px 10px; border-radius: 20px; margin-right: auto; }

    .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }

    .item-card { background: #1e293b; border: 2px solid #334155; border-radius: 12px; overflow: hidden; transition: all .2s; }
    .item-card.has-img { border-color: #3b82f6; }
    .item-card.no-img { border-color: #334155; opacity: 0.7; }
    .item-card.move-target { border-color: #22c55e !important; box-shadow: 0 0 0 3px rgba(34,197,94,0.3); cursor: pointer; animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0.1)} }

    .img-area { position: relative; height: 150px; background: #0f172a; cursor: pointer; overflow: hidden; }
    .img-area img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
    .img-area:hover img { transform: scale(1.05); }
    .img-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 20px; opacity: 0; transition: opacity .2s; }
    .img-area:hover .img-overlay { opacity: 1; }
    .no-img-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: #334155; font-size: 28px; }
    .no-img-placeholder span { font-size: 11px; }

    .item-info { padding: 10px; }
    .item-title { font-size: 13px; font-weight: bold; color: #e2e8f0; margin-bottom: 2px; }
    .item-cat-label { font-size: 11px; color: #64748b; margin-bottom: 8px; }
    .item-actions { display: flex; flex-direction: column; gap: 4px; }

    button { border: none; border-radius: 6px; cursor: pointer; font-size: 11px; padding: 5px 8px; font-weight: bold; transition: all .15s; }
    .btn-move { background: #1d4ed8; color: white; }
    .btn-move:hover { background: #1e40af; }
    .btn-remove { background: #7f1d1d; color: #fca5a5; }
    .btn-remove:hover { background: #991b1b; }
    .btn-assign { background: #14532d; color: #86efac; }
    .btn-assign:hover { background: #166534; }
    .btn-cancel { background: #334155; color: #e2e8f0; padding: 8px 20px; font-size: 13px; }

    /* Moving mode banner */
    #move-banner { display: none; position: fixed; top: 0; left: 0; right: 0; background: #16a34a; color: white; padding: 14px 24px; z-index: 300; text-align: center; font-size: 15px; font-weight: bold; }
    #move-banner.show { display: flex; align-items: center; justify-content: center; gap: 16px; }

    /* Modal */
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 999; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
    .modal.show { display: flex; }
    .modal img { max-width: 85vw; max-height: 80vh; object-fit: contain; border-radius: 12px; border: 2px solid #334155; }
    .modal-actions { display: flex; gap: 12px; }
    .modal-title { color: #f59e0b; font-size: 18px; font-weight: bold; }
    .btn-modal-remove { background: #dc2626; color: white; padding: 10px 24px; font-size: 14px; border-radius: 8px; }
    .btn-modal-move { background: #2563eb; color: white; padding: 10px 24px; font-size: 14px; border-radius: 8px; }
    .btn-modal-close { background: #334155; color: white; padding: 10px 24px; font-size: 14px; border-radius: 8px; }

    /* Toast */
    #toast { position: fixed; bottom: 24px; right: 24px; background: #22c55e; color: #0f172a; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 14px; z-index: 999; opacity: 0; transition: opacity .3s; }
    #toast.show { opacity: 1; }
    #toast.error { background: #ef4444; color: white; }
  </style>
</head>
<body>

<div id="move-banner">
  <span id="move-banner-text">🔄 اختر الصنف الجديد للصورة</span>
  <button class="btn-cancel" onclick="cancelMove()">❌ إلغاء</button>
</div>

<header>
  <div>
    <h1>🍕 La Crosta — مراجعة وتصحيح الصور</h1>
    <div style="font-size:11px;color:#64748b">اضغط على الصورة لتكبيرها · اضغط "نقل" لتغيير الصنف · "حذف" لإزالة الصورة</div>
  </div>
  <div class="stats-bar">
    <span class="stat-pill green" id="stat-with">✅ بصور: ${itemsWithImages.length}</span>
    <span class="stat-pill red" id="stat-without">❌ بدون: ${itemsWithout.length}</span>
    <span class="stat-pill">📋 الكل: ${allItems.length}</span>
  </div>
</header>

<div class="main">
  <div class="alert alert-info">
    💡 <strong>كيفية التصحيح:</strong> افتح الصورة ← تأكد هي صورة الصنف الصح ← إذا غلط اضغط <strong>🔄 نقل</strong> ثم اختر الصنف الصح · أو <strong>🗑️ حذف</strong> إذا مش تابعة للحساب
  </div>

  ${catSections}
</div>

<!-- Modal لعرض الصورة -->
<div class="modal" id="modal">
  <div class="modal-title" id="modal-item-name"></div>
  <img id="modal-img" src="" alt="" />
  <div class="modal-actions">
    <button class="btn-modal-move" onclick="startMoveFromModal()">🔄 نقل لصنف آخر</button>
    <button class="btn-modal-remove" onclick="removeFromModal()">🗑️ حذف الصورة</button>
    <button class="btn-modal-close" onclick="closeModal()">✕ إغلاق</button>
  </div>
</div>

<div id="toast"></div>

<script>
const SUPABASE_URL = '${SUPABASE_URL}';
const SERVICE_KEY = '${SERVICE_ROLE_KEY}';

let currentModalItemId = null;
let currentModalOrigUrl = null;
let movingItemId = null;
let movingOrigUrl = null;
let movingThumbUrl = null;

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (isError ? ' error' : '');
  setTimeout(() => t.className = '', 3000);
}

function openModal(origUrl, itemId) {
  currentModalItemId = itemId;
  currentModalOrigUrl = origUrl;
  const card = document.getElementById('item-' + itemId);
  document.getElementById('modal-item-name').textContent = card?.dataset.itemName || '';
  document.getElementById('modal-img').src = origUrl;
  document.getElementById('modal').classList.add('show');
}
function closeModal() {
  document.getElementById('modal').classList.remove('show');
  currentModalItemId = null;
  currentModalOrigUrl = null;
}

function startMoveFromModal() {
  const card = document.getElementById('item-' + currentModalItemId);
  const img = card?.querySelector('img');
  startMove(currentModalItemId, img?.src || currentModalOrigUrl, currentModalOrigUrl, card?.dataset.itemName);
  closeModal();
}
function removeFromModal() {
  removeImage(currentModalItemId, document.getElementById('item-' + currentModalItemId)?.dataset.itemName);
  closeModal();
}

async function removeImage(itemId, itemName) {
  if (!confirm('حذف صورة "' + itemName + '"؟\\nالصورة ستُزال من هذا الصنف لكن تبقى على Storage')) return;
  const res = await updateItemImage(itemId, null, null);
  if (res) {
    const card = document.getElementById('item-' + itemId);
    card.classList.remove('has-img');
    card.classList.add('no-img');
    card.querySelector('.img-area').innerHTML = '<div class="no-img-placeholder">📷<br><span>لا توجد صورة</span></div>';
    card.querySelector('.item-actions').innerHTML = \`<button class="btn-assign" onclick="assignPending('\${itemId}')">➕ إسناد صورة</button>\`;
    updateStats(-1);
    showToast('✅ تم حذف الصورة من "' + itemName + '"');
  }
}

function startMove(itemId, thumbUrl, origUrl, itemName) {
  movingItemId = itemId;
  movingOrigUrl = origUrl;
  movingThumbUrl = thumbUrl;
  
  // highlight all cards as targets except the current one
  document.querySelectorAll('.item-card').forEach(card => {
    if (card.id !== 'item-' + itemId) {
      card.classList.add('move-target');
      card.onclick = () => completeMove(card.dataset.itemId, card.dataset.itemName);
    }
  });
  
  const banner = document.getElementById('move-banner');
  document.getElementById('move-banner-text').textContent = '🔄 انقل صورة "' + itemName + '" → اضغط على الصنف الجديد';
  banner.classList.add('show');
}

async function completeMove(targetItemId, targetItemName) {
  if (!movingItemId) return;
  
  // Get current target item's image
  const targetCard = document.getElementById('item-' + targetItemId);
  const targetImg = targetCard.querySelector('img');
  const targetHasImg = targetCard.classList.contains('has-img');
  
  // Get source card info
  const sourceCard = document.getElementById('item-' + movingItemId);
  const sourceImg = sourceCard.querySelector('img');

  // Swap images in DB
  const sourceOrigUrl = movingOrigUrl;
  const sourceThumbUrl = movingThumbUrl;
  
  if (targetHasImg) {
    // Swap
    const targetOrigUrl = targetImg?.src;
    const targetThumbUrl = targetImg?.src?.replace('/original/', '/thumbs/');
    
    await Promise.all([
      updateItemImage(movingItemId, targetOrigUrl, targetThumbUrl),
      updateItemImage(targetItemId, sourceOrigUrl, sourceThumbUrl)
    ]);
    
    // Update UI
    if (sourceImg) sourceImg.src = targetOrigUrl;
    targetImg.src = sourceOrigUrl;
    showToast('✅ تم تبديل الصورتين بين "' + sourceCard.dataset.itemName + '" و "' + targetItemName + '"');
  } else {
    // Move to empty slot
    await Promise.all([
      updateItemImage(movingItemId, null, null),
      updateItemImage(targetItemId, sourceOrigUrl, sourceThumbUrl)
    ]);
    
    // Update source to no-img
    sourceCard.classList.remove('has-img');
    sourceCard.classList.add('no-img');
    sourceCard.querySelector('.img-area').innerHTML = '<div class="no-img-placeholder">📷<br><span>لا توجد صورة</span></div>';
    sourceCard.querySelector('.item-actions').innerHTML = \`<button class="btn-assign" onclick="assignPending('\${movingItemId}')">➕ إسناد صورة</button>\`;
    
    // Update target to has-img
    targetCard.classList.add('has-img');
    targetCard.classList.remove('no-img');
    targetCard.querySelector('.img-area').innerHTML = \`<img src="\${sourceThumbUrl}" onerror="this.src='\${sourceOrigUrl}'" /><div class="img-overlay">🔍 عرض</div>\`;
    targetCard.querySelector('.img-area').onclick = () => openModal(sourceOrigUrl, targetItemId);
    targetCard.querySelector('.item-actions').innerHTML = \`
      <button class="btn-move" onclick="startMove('\${targetItemId}','\${sourceThumbUrl}','\${sourceOrigUrl}','\${targetItemName}')">🔄 نقل لصنف آخر</button>
      <button class="btn-remove" onclick="removeImage('\${targetItemId}','\${targetItemName}')">🗑️ حذف الصورة</button>\`;
    
    showToast('✅ تم نقل الصورة إلى "' + targetItemName + '"');
  }
  
  cancelMove();
}

function cancelMove() {
  movingItemId = null;
  movingOrigUrl = null;
  movingThumbUrl = null;
  document.querySelectorAll('.item-card').forEach(card => {
    card.classList.remove('move-target');
    card.onclick = null;
  });
  document.getElementById('move-banner').classList.remove('show');
}

function assignPending(itemId) {
  showToast('⚠️ لإسناد صورة جديدة، ارفعها من الداشبورد مباشرة', true);
}

async function updateItemImage(itemId, imageUrl, thumbnailUrl) {
  try {
    const res = await fetch(\`\${SUPABASE_URL}/rest/v1/items?id=eq.\${itemId}\`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ image_url: imageUrl, thumbnail_url: thumbnailUrl })
    });
    return res.ok;
  } catch(e) {
    showToast('❌ خطأ في الحفظ', true);
    return false;
  }
}

function updateStats(delta) {
  const withEl = document.getElementById('stat-with');
  const withoutEl = document.getElementById('stat-without');
  const cur = parseInt(withEl.textContent.match(/\\d+/)[0]);
  withEl.textContent = '✅ بصور: ' + (cur + delta);
  const curOut = parseInt(withoutEl.textContent.match(/\\d+/)[0]);
  withoutEl.textContent = '❌ بدون: ' + (curOut - delta);
}

// Close modal on background click
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
</script>
</body>
</html>`;

  fs.writeFileSync('lacrosta_review_tool.html', html, 'utf8');
  console.log('✅ تم توليد أداة المراجعة: lacrosta_review_tool.html');
  console.log(`بصور: ${itemsWithImages.length} | بدون: ${itemsWithout.length}`);
}

main().catch(console.error);
