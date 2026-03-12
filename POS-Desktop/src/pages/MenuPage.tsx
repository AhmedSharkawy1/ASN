import { useState, useEffect, useCallback, useRef } from 'react';
import { db, fileToBase64 } from '../lib/db';
import type { Category, MenuItem } from '../lib/db';
import { formatCurrency } from '../lib/helpers';
import * as XLSX from 'xlsx';

export default function MenuPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsedCats, setCollapsedCats] = useState<Set<number>>(new Set());
    const [showAddCat, setShowAddCat] = useState(false);
    const [showAddItem, setShowAddItem] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<number | null>(null);
    const [editingCat, setEditingCat] = useState<number | null>(null);
    const [deletingCat, setDeletingCat] = useState<number | null>(null);
    const [deletingItem, setDeletingItem] = useState<number | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newCat, setNewCat] = useState({ name_ar: '', name_en: '', emoji: '🍽️' });
    const [newCatImage, setNewCatImage] = useState<string | null>(null);
    const [newItemForm, setNewItemForm] = useState({ title_ar: '', title_en: '', desc_ar: '', desc_en: '' });
    const [newItemPrices, setNewItemPrices] = useState<number[]>([0]);
    const [newItemSizes, setNewItemSizes] = useState<string[]>(['عادي']);
    const [newItemPopular, setNewItemPopular] = useState(false);
    const [newItemImage, setNewItemImage] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ title_ar: '', title_en: '', prices: [0], sizes: [''] });
    const [editCatForm, setEditCatForm] = useState({ name_ar: '', name_en: '', emoji: '' });

    const fetchData = useCallback(async () => { setLoading(true); setCategories(await db.categories.orderBy('sort_order').toArray()); setItems(await db.menu_items.toArray()); setLoading(false); }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleCollapse = (id: number) => setCollapsedCats(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const handleCategoryImage = async (catId: number, file: File) => { const b64 = await fileToBase64(file); await db.categories.update(catId, { image_data: b64 }); setCategories(prev => prev.map(c => c.id === catId ? { ...c, image_data: b64 } : c)); };
    const handleItemImage = async (itemId: number, file: File) => { const b64 = await fileToBase64(file); await db.menu_items.update(itemId, { image_data: b64 }); setItems(prev => prev.map(i => i.id === itemId ? { ...i, image_data: b64 } : i)); };

    const addCategory = async () => { if (!newCat.name_ar.trim()) return; const mo = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0; await db.categories.add({ name_ar: newCat.name_ar.trim(), name_en: newCat.name_en.trim() || undefined, emoji: newCat.emoji || '🍽️', image_data: newCatImage || undefined, sort_order: mo + 1 }); setNewCat({ name_ar: '', name_en: '', emoji: '🍽️' }); setNewCatImage(null); setShowAddCat(false); fetchData(); };
    const confirmDeleteCat = async () => { if (!deletingCat) return; const ci = items.filter(i => i.category_id === deletingCat); for (const item of ci) await db.menu_items.delete(item.id!); await db.categories.delete(deletingCat); setDeletingCat(null); fetchData(); };
    const startEditCat = (cat: Category) => { setEditingCat(cat.id!); setEditCatForm({ name_ar: cat.name_ar, name_en: cat.name_en || '', emoji: cat.emoji || '' }); };
    const saveEditCat = async () => { if (!editingCat || !editCatForm.name_ar.trim()) return; await db.categories.update(editingCat, { name_ar: editCatForm.name_ar.trim(), name_en: editCatForm.name_en.trim() || undefined, emoji: editCatForm.emoji || undefined }); setEditingCat(null); fetchData(); };
    const resetNewItem = () => { setNewItemForm({ title_ar: '', title_en: '', desc_ar: '', desc_en: '' }); setNewItemPrices([0]); setNewItemSizes(['عادي']); setNewItemPopular(false); setNewItemImage(null); };
    const addItem = async (catId: number) => { const p = newItemPrices.filter(p => p > 0); if (!newItemForm.title_ar.trim() || p.length === 0) return; const l = newItemSizes.filter((_, i) => newItemPrices[i] > 0); await db.menu_items.add({ category_id: catId, title_ar: newItemForm.title_ar.trim(), title_en: newItemForm.title_en.trim() || undefined, prices: p, size_labels: l, is_available: true, is_popular: newItemPopular, image_data: newItemImage || undefined }); resetNewItem(); setShowAddItem(null); fetchData(); };
    const startEditItem = (item: MenuItem) => { setEditingItem(item.id!); setEditForm({ title_ar: item.title_ar, title_en: item.title_en || '', prices: [...item.prices], sizes: [...(item.size_labels || item.prices.map(() => ''))] }); };
    const saveEditItem = async () => { if (!editingItem) return; const p = editForm.prices.filter(p => p > 0); const s = editForm.sizes.filter((_, i) => editForm.prices[i] > 0); await db.menu_items.update(editingItem, { title_ar: editForm.title_ar.trim(), title_en: editForm.title_en.trim() || undefined, prices: p, size_labels: s }); setEditingItem(null); fetchData(); };
    const toggleAvailability = async (item: MenuItem) => { await db.menu_items.update(item.id!, { is_available: !item.is_available }); setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !item.is_available } : i)); };
    const confirmDeleteItem = async () => { if (!deletingItem) return; await db.menu_items.delete(deletingItem); setDeletingItem(null); fetchData(); };
    const togglePopular = async (item: MenuItem) => { await db.menu_items.update(item.id!, { is_popular: !item.is_popular }); setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_popular: !item.is_popular } : i)); };

    const exportExcel = () => { const rows: Record<string, string | number>[] = []; categories.forEach(cat => { const ci = items.filter(i => i.category_id === cat.id); if (ci.length === 0) rows.push({ 'Category AR': cat.name_ar, 'Category EN': cat.name_en || '', 'Emoji': cat.emoji || '', 'Item AR': '', 'Item EN': '', 'Sizes': '', 'Prices': '', 'Popular': '' }); else ci.forEach(item => rows.push({ 'Category AR': cat.name_ar, 'Category EN': cat.name_en || '', 'Emoji': cat.emoji || '', 'Item AR': item.title_ar, 'Item EN': item.title_en || '', 'Sizes': (item.size_labels || []).join(','), 'Prices': item.prices.join(','), 'Popular': item.is_popular ? 'Yes' : 'No' })); }); const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Menu'); XLSX.writeFile(wb, `Menu_${new Date().toISOString().split('T')[0]}.xlsx`); };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setImportStatus(null); try { const data = await file.arrayBuffer(); const wb = XLSX.read(new Uint8Array(data), { type: 'array' }); const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(wb.Sheets[wb.SheetNames[0]]); if (rows.length === 0) { setImportStatus({ type: 'error', message: 'الملف فارغ!' }); return; } const existingCats = await db.categories.toArray(); const catMap = new Map<string, number>(); existingCats.forEach(c => catMap.set(c.name_ar.trim(), c.id!)); let nc = 0, ni = 0; for (const row of rows) { const ca = String(row['Category AR'] || '').trim(); if (!ca || catMap.has(ca)) continue; const mo = (await db.categories.orderBy('sort_order').last())?.sort_order || 0; const id = await db.categories.add({ name_ar: ca, name_en: String(row['Category EN'] || '').trim() || undefined, emoji: String(row['Emoji'] || '').trim() || '🍽️', sort_order: mo + 1 }); catMap.set(ca, id as number); nc++; } for (const row of rows) { const ca = String(row['Category AR'] || '').trim(); const ia = String(row['Item AR'] || '').trim(); if (!ca || !ia) continue; const cid = catMap.get(ca); if (!cid) continue; const pr = String(row['Prices'] || '0').split(',').map(p => parseFloat(p.trim()) || 0).filter(p => p > 0); if (pr.length === 0) pr.push(0); const sl = String(row['Sizes'] || '').split(',').map(s => s.trim()).filter(s => s); while (sl.length < pr.length) sl.push(sl[0] || 'عادي'); await db.menu_items.add({ category_id: cid, title_ar: ia, title_en: String(row['Item EN'] || '').trim() || undefined, prices: pr, size_labels: sl.slice(0, pr.length), is_available: true, is_popular: String(row['Popular'] || '').toLowerCase() === 'yes' }); ni++; } setImportStatus({ type: 'success', message: `تم استيراد ${ni} صنف${nc > 0 ? ` و ${nc} قسم جديد` : ''} بنجاح!` }); fetchData(); } catch { setImportStatus({ type: 'error', message: 'خطأ في قراءة الملف' }); } if (fileInputRef.current) fileInputRef.current.value = ''; };
    const downloadTemplate = () => { const rows = [{ 'Category AR': 'ساندوتشات', 'Category EN': 'Sandwiches', 'Emoji': '🥪', 'Item AR': 'شاورما', 'Item EN': 'Shawarma', 'Sizes': 'صغير,وسط,كبير', 'Prices': '30,50,70', 'Popular': 'Yes' }]; const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Menu'); XLSX.writeFile(wb, 'Menu_Template.xlsx'); };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }} dir="rtl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h1 style={{ fontSize: 18, fontWeight: 'bold' }}>🍽️ إدارة المنيو</h1>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowAddCat(true)} className="classic-btn-blue" style={{ fontSize: 11, padding: '3px 12px' }}>➕ قسم جديد</button>
                    <button onClick={fetchData} className="classic-btn" style={{ fontSize: 11, padding: '3px 8px' }}>🔄</button>
                    <button onClick={exportExcel} className="classic-btn-green" style={{ fontSize: 11, padding: '3px 12px' }}>📥 تصدير</button>
                </div>
            </div>

            {/* Import */}
            <div style={{ background: '#f0ece0', border: '1px solid #999', padding: 12, marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>📊 استيراد من Excel</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current?.click()} className="classic-btn-green" style={{ fontSize: 12, padding: '4px 16px' }}>📤 استيراد</button>
                    <button onClick={downloadTemplate} className="classic-btn" style={{ fontSize: 11, padding: '3px 12px' }}>📄 نموذج فارغ</button>
                </div>
                {importStatus && <div style={{ marginTop: 8, padding: '6px 12px', fontSize: 12, fontWeight: 'bold', background: importStatus.type === 'success' ? '#d4edda' : '#f8d7da', border: `1px solid ${importStatus.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`, color: importStatus.type === 'success' ? '#155724' : '#721c24' }}>{importStatus.message}</div>}
            </div>

            {/* Add Category */}
            {showAddCat && (
                <div style={{ background: '#f0ece0', border: '2px solid #4080c0', padding: 16, marginBottom: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 10 }}>➕ إضافة قسم جديد</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 10 }}>
                        <input value={newCat.name_ar} onChange={e => setNewCat(v => ({ ...v, name_ar: e.target.value }))} placeholder="اسم القسم (عربي) *" style={{ padding: '5px 8px', border: '1px solid #999', fontSize: 13 }} />
                        <input value={newCat.name_en} onChange={e => setNewCat(v => ({ ...v, name_en: e.target.value }))} placeholder="اسم القسم (إنجليزي)" dir="ltr" style={{ padding: '5px 8px', border: '1px solid #999', fontSize: 13 }} />
                        <input value={newCat.emoji} onChange={e => setNewCat(v => ({ ...v, emoji: e.target.value }))} maxLength={4} style={{ width: 50, padding: '5px 8px', border: '1px solid #999', fontSize: 18, textAlign: 'center' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={addCategory} disabled={!newCat.name_ar.trim()} className="classic-btn-green" style={{ fontSize: 12, padding: '4px 16px', opacity: !newCat.name_ar.trim() ? 0.5 : 1 }}>💾 حفظ</button>
                        <button onClick={() => setShowAddCat(false)} className="classic-btn" style={{ fontSize: 12 }}>إلغاء</button>
                    </div>
                </div>
            )}

            {/* Categories */}
            {loading ? <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>جاري التحميل...</p> : (
                <div>
                    {categories.map(cat => {
                        const catItems = items.filter(i => i.category_id === cat.id);
                        const collapsed = collapsedCats.has(cat.id!);
                        return (
                            <div key={cat.id} style={{ background: '#f0ece0', border: '1px solid #999', marginBottom: 8 }}>
                                <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#e0d8c0', borderBottom: collapsed ? 'none' : '1px solid #bbb' }} onClick={() => toggleCollapse(cat.id!)}>
                                    <span style={{ fontSize: 18 }}>{cat.emoji || '📁'}</span>
                                    {editingCat === cat.id ? (
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                            <input value={editCatForm.name_ar} onChange={e => setEditCatForm(v => ({ ...v, name_ar: e.target.value }))} style={{ width: 120, padding: '2px 6px', border: '1px solid #999', fontSize: 12 }} />
                                            <input value={editCatForm.name_en} onChange={e => setEditCatForm(v => ({ ...v, name_en: e.target.value }))} dir="ltr" placeholder="EN" style={{ width: 100, padding: '2px 6px', border: '1px solid #999', fontSize: 12 }} />
                                            <button onClick={() => saveEditCat()} className="classic-btn-green" style={{ fontSize: 10, padding: '1px 6px' }}>✓</button>
                                            <button onClick={() => setEditingCat(null)} className="classic-btn" style={{ fontSize: 10, padding: '1px 6px' }}>✕</button>
                                        </div>
                                    ) : (
                                        <span style={{ fontWeight: 'bold', fontSize: 14 }}>{cat.name_ar} {cat.name_en && <span style={{ color: '#666', fontSize: 11 }}>({cat.name_en})</span>}</span>
                                    )}
                                    <span style={{ fontSize: 10, background: '#d0d0c0', padding: '1px 6px', border: '1px solid #bbb' }}>{catItems.length} صنف</span>
                                    <div style={{ marginRight: 'auto', display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => setShowAddItem(showAddItem === cat.id ? null : cat.id!)} className="classic-btn-green" style={{ fontSize: 10, padding: '1px 6px' }}>+ صنف</button>
                                        <button onClick={() => startEditCat(cat)} className="classic-btn" style={{ fontSize: 10, padding: '1px 6px' }}>تعديل</button>
                                        <button onClick={() => setDeletingCat(cat.id!)} className="classic-btn-red" style={{ fontSize: 10, padding: '1px 6px' }}>حذف</button>
                                    </div>
                                    <span style={{ fontSize: 12 }}>{collapsed ? '▼' : '▲'}</span>
                                </div>

                                {/* Add item */}
                                {showAddItem === cat.id && !collapsed && (
                                    <div style={{ padding: 12, background: '#f8f4e8', borderBottom: '1px solid #bbb' }}>
                                        <p style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>➕ إضافة صنف جديد</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                                            <input value={newItemForm.title_ar} onChange={e => setNewItemForm(v => ({ ...v, title_ar: e.target.value }))} placeholder="اسم الصنف (عربي) *" style={{ padding: '4px 8px', border: '1px solid #999', fontSize: 12 }} />
                                            <input value={newItemForm.title_en} onChange={e => setNewItemForm(v => ({ ...v, title_en: e.target.value }))} placeholder="اسم الصنف (إنجليزي)" dir="ltr" style={{ padding: '4px 8px', border: '1px solid #999', fontSize: 12 }} />
                                        </div>
                                        <p style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>الأحجام والأسعار:</p>
                                        {newItemPrices.map((p, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                                                <input value={newItemSizes[idx] || ''} onChange={e => { const ns = [...newItemSizes]; ns[idx] = e.target.value; setNewItemSizes(ns); }} placeholder="اسم الحجم" style={{ width: 120, padding: '3px 6px', border: '1px solid #999', fontSize: 12 }} />
                                                <input type="number" value={p || ''} onChange={e => { const np = [...newItemPrices]; np[idx] = parseFloat(e.target.value) || 0; setNewItemPrices(np); }} placeholder="السعر" style={{ width: 80, padding: '3px 6px', border: '1px solid #999', fontSize: 12 }} dir="ltr" />
                                                {newItemPrices.length > 1 && <button onClick={() => { setNewItemPrices(newItemPrices.filter((_, i) => i !== idx)); setNewItemSizes(newItemSizes.filter((_, i) => i !== idx)); }} className="classic-btn-red" style={{ fontSize: 10, padding: '0 4px' }}>✕</button>}
                                            </div>
                                        ))}
                                        <button onClick={() => { setNewItemPrices([...newItemPrices, 0]); setNewItemSizes([...newItemSizes, '']); }} className="classic-btn" style={{ fontSize: 10, padding: '1px 8px', marginBottom: 8 }}>+ حجم</button>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => setNewItemPopular(!newItemPopular)} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid', cursor: 'pointer', background: newItemPopular ? '#fff3cd' : '#f0f0e0', borderColor: newItemPopular ? '#ffc107' : '#999', fontWeight: 'bold' }}>⭐ مميز</button>
                                            <button onClick={() => addItem(cat.id!)} disabled={!newItemForm.title_ar.trim() || newItemPrices.every(p => p <= 0)} className="classic-btn-green" style={{ fontSize: 12, padding: '3px 12px', opacity: !newItemForm.title_ar.trim() ? 0.5 : 1 }}>💾 حفظ</button>
                                            <button onClick={() => { setShowAddItem(null); resetNewItem(); }} className="classic-btn" style={{ fontSize: 12 }}>إلغاء</button>
                                        </div>
                                    </div>
                                )}

                                {/* Items */}
                                {!collapsed && (
                                    <div>
                                        {catItems.length === 0 ? <p style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 12 }}>لا توجد أصناف</p> :
                                            <table className="classic-table" style={{ fontSize: 11 }}>
                                                <thead><tr><th>الصنف</th><th style={{ textAlign: 'center' }}>الأسعار</th><th style={{ textAlign: 'center' }}>حالة</th><th style={{ width: 120 }}></th></tr></thead>
                                                <tbody>
                                                    {catItems.map(item => (
                                                        <tr key={item.id}>
                                                            <td>
                                                                {editingItem === item.id ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                                            <input value={editForm.title_ar} onChange={e => setEditForm(v => ({ ...v, title_ar: e.target.value }))} style={{ width: 120, padding: '2px 4px', border: '1px solid #999', fontSize: 11 }} />
                                                                            <input value={editForm.title_en} onChange={e => setEditForm(v => ({ ...v, title_en: e.target.value }))} dir="ltr" placeholder="EN" style={{ width: 100, padding: '2px 4px', border: '1px solid #999', fontSize: 11 }} />
                                                                        </div>
                                                                        {editForm.prices.map((p, idx) => <div key={idx} style={{ display: 'flex', gap: 4 }}><input value={editForm.sizes[idx] || ''} onChange={e => { const ns = [...editForm.sizes]; ns[idx] = e.target.value; setEditForm(v => ({ ...v, sizes: ns })); }} style={{ width: 80, padding: '1px 4px', border: '1px solid #999', fontSize: 10 }} /><input type="number" value={p || ''} onChange={e => { const np = [...editForm.prices]; np[idx] = parseFloat(e.target.value) || 0; setEditForm(v => ({ ...v, prices: np })); }} style={{ width: 60, padding: '1px 4px', border: '1px solid #999', fontSize: 10 }} dir="ltr" /></div>)}
                                                                        <div style={{ display: 'flex', gap: 4 }}><button onClick={saveEditItem} className="classic-btn-green" style={{ fontSize: 10, padding: '1px 6px' }}>✓</button><button onClick={() => setEditingItem(null)} className="classic-btn" style={{ fontSize: 10, padding: '1px 6px' }}>✕</button></div>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <span style={{ fontWeight: 'bold' }}>{item.title_ar}</span>
                                                                        {item.title_en && <span style={{ color: '#666', fontSize: 10, marginRight: 4 }}>({item.title_en})</span>}
                                                                        {item.is_popular && <span style={{ fontSize: 9, background: '#fff3cd', border: '1px solid #ffc107', padding: '0 3px', marginRight: 4 }}>⭐</span>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td style={{ textAlign: 'center', color: '#28a745', fontWeight: 'bold' }}>{item.prices.map((p, i) => `${item.size_labels?.[i] || ''} ${formatCurrency(p)}`).join(' / ')}</td>
                                                            <td style={{ textAlign: 'center' }}><button onClick={() => toggleAvailability(item)} style={{ fontSize: 9, fontWeight: 'bold', padding: '1px 6px', border: '1px solid', cursor: 'pointer', background: item.is_available ? '#d4edda' : '#f8d7da', color: item.is_available ? '#155724' : '#721c24', borderColor: item.is_available ? '#c3e6cb' : '#f5c6cb' }}>{item.is_available ? 'متاح' : 'غير متاح'}</button></td>
                                                            <td><div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}><button onClick={() => togglePopular(item)} style={{ fontSize: 10, cursor: 'pointer', background: 'transparent', border: 'none', color: item.is_popular ? '#e0a000' : '#ccc' }}>⭐</button><button onClick={() => startEditItem(item)} className="classic-btn" style={{ fontSize: 9, padding: '0 4px' }}>✎</button><button onClick={() => setDeletingItem(item.id!)} className="classic-btn-red" style={{ fontSize: 9, padding: '0 4px' }}>✕</button></div></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Category Modal */}
            {deletingCat !== null && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#f0ece0', border: '2px solid #999', padding: 24, maxWidth: 360, width: '100%', textAlign: 'center' }}>
                        <p style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>🗑️ هل أنت متأكد من حذف هذا القسم وكل أصنافه؟</p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button onClick={confirmDeleteCat} className="classic-btn-red" style={{ fontSize: 13, padding: '6px 20px' }}>تأكيد الحذف</button>
                            <button onClick={() => setDeletingCat(null)} className="classic-btn" style={{ fontSize: 13, padding: '6px 20px' }}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Item Modal */}
            {deletingItem !== null && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#f0ece0', border: '2px solid #999', padding: 24, maxWidth: 360, width: '100%', textAlign: 'center' }}>
                        <p style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>🗑️ هل أنت متأكد من حذف هذا الصنف؟</p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button onClick={confirmDeleteItem} className="classic-btn-red" style={{ fontSize: 13, padding: '6px 20px' }}>تأكيد الحذف</button>
                            <button onClick={() => setDeletingItem(null)} className="classic-btn" style={{ fontSize: 13, padding: '6px 20px' }}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
