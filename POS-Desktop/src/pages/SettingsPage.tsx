import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import type { Category, MenuItem, PosUser, Order, AppSettings } from '../lib/db';
import { formatCurrency, getPrinterSettings, savePrinterSettings, PAPER_SIZES } from '../lib/helpers';
import type { PrinterSettings } from '../lib/helpers';

type Props = { onSettingsChange: (name: string, phone: string, address: string) => void };

export default function SettingsPage({ onSettingsChange }: Props) {
    const [activeTab, setActiveTab] = useState<'items' | 'printer' | 'delivery' | 'deliveryAccount' | 'config'>('items');
    // Items tab state
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [catName, setCatName] = useState('');
    const [showCatForm, setShowCatForm] = useState(false);
    // Printer tab
    const [printerName, setPrinterName] = useState('XP-80C');
    const [pSettings, setPSettings] = useState<PrinterSettings>({ paperWidth: '72mm', fontSize: 15 });
    // Delivery tab - drivers
    const [drivers, setDrivers] = useState<PosUser[]>([]);
    // Delivery account tab
    const [deliveryOrders, setDeliveryOrders] = useState<Order[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
    // Settings
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [restName, setRestName] = useState('');
    const [restPhone, setRestPhone] = useState('');
    const [restAddress, setRestAddress] = useState('');

    const fetchData = useCallback(async () => {
        setCategories(await db.categories.orderBy('sort_order').toArray());
        setItems(await db.menu_items.toArray());
        const d = await db.pos_users.where('role').equals('delivery').toArray();
        setDrivers(d);
        const orders = await db.orders.where('status').notEqual('cancelled').toArray();
        setDeliveryOrders(orders.filter(o => o.status !== 'held' && o.delivery_driver_id));
        const s = await db.settings.toCollection().first();
        if (s) { setSettings(s); setRestName(s.restaurant_name); setRestPhone(s.restaurant_phone || ''); setRestAddress(s.restaurant_address || ''); }
    }, []);

    useEffect(() => { fetchData(); setPSettings(getPrinterSettings()); }, [fetchData]);

    // Items tab handlers
    const catItems = selectedCatId ? items.filter(i => i.category_id === selectedCatId) : [];
    const handleSelectItem = (item: MenuItem) => { setSelectedItemId(item.id!); setItemName(item.title_ar); setItemPrice(String(item.prices[0] || '')); };
    const handleSaveItem = async () => {
        if (!selectedCatId || !itemName.trim() || !itemPrice) return;
        const price = parseFloat(itemPrice) || 0;
        if (selectedItemId) {
            await db.menu_items.update(selectedItemId, { title_ar: itemName.trim(), prices: [price] });
        } else {
            await db.menu_items.add({ category_id: selectedCatId, title_ar: itemName.trim(), prices: [price], size_labels: ['عادي'], is_available: true, is_popular: false });
        }
        handleClearItem(); fetchData();
    };
    const handleEditItem = async () => { if (selectedItemId) handleSaveItem(); };
    const handleDeleteItem = async () => { if (!selectedItemId) return; await db.menu_items.delete(selectedItemId); handleClearItem(); fetchData(); };
    const handleClearItem = () => { setSelectedItemId(null); setItemName(''); setItemPrice(''); };
    const handleAddCategory = async () => { if (!catName.trim()) return; const mo = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0; await db.categories.add({ name_ar: catName.trim(), emoji: '🍽️', sort_order: mo + 1 }); setCatName(''); setShowCatForm(false); fetchData(); };
    const handleDeleteCategory = async () => { if (!selectedCatId) return; if (!confirm('هل تريد حذف هذا القسم وكل أصنافه؟')) return; const ci = items.filter(i => i.category_id === selectedCatId); for (const item of ci) await db.menu_items.delete(item.id!); await db.categories.delete(selectedCatId); setSelectedCatId(null); handleClearItem(); fetchData(); };

    // Config tab handlers
    const handleSaveConfig = async () => {
        let s = await db.settings.toCollection().first();
        if (s) {
            await db.settings.update(s.id!, { restaurant_name: restName, restaurant_phone: restPhone, restaurant_address: restAddress });
        } else {
            await db.settings.add({ restaurant_name: restName, restaurant_phone: restPhone, restaurant_address: restAddress, currency: 'EGP', language: 'ar' });
        }
        onSettingsChange(restName, restPhone, restAddress);
        alert('تم حفظ إعدادات المطعم بنجاح!');
    };

    // Delivery account helpers
    const getDriverStats = (driverId: number) => { const dOrders = deliveryOrders.filter(o => o.delivery_driver_id === driverId); return { count: dOrders.length, total: dOrders.reduce((s, o) => s + o.total, 0), fees: dOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0) }; };

    const handleExportBackup = async () => { try { const data = { settings: await db.settings.toArray(), categories: await db.categories.toArray(), menu_items: await db.menu_items.toArray(), orders: await db.orders.toArray(), customers: await db.customers.toArray(), pos_users: await db.pos_users.toArray() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ASN_POS_Backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url); } catch { alert('حدث خطأ'); } };

    const tabs = [
        { key: 'items' as const, label: 'الاصناف' },
        { key: 'printer' as const, label: 'الطباعة' },
        { key: 'delivery' as const, label: 'دليفري' },
        { key: 'deliveryAccount' as const, label: 'حساب الداليفري' },
        { key: 'config' as const, label: 'إعدادات المطعم' },
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 16px' }} dir="rtl">
            {/* Yellow outer area with beige inner panel */}
            <div style={{ flex: 1, background: '#c8c080', border: '2px solid #999', padding: 12, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, background: '#f0ece0', border: '1px solid #bbb', display: 'flex', flexDirection: 'column' }}>
                    {/* Tabs - positioned at top right */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0' }}>
                        {tabs.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                style={{
                                    padding: '4px 14px', fontSize: 12, fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                                    background: activeTab === tab.key ? '#f0ece0' : '#d8d8c8',
                                    border: '1px solid #999', borderBottom: activeTab === tab.key ? '1px solid #f0ece0' : '1px solid #999',
                                    cursor: 'pointer', color: '#333', marginBottom: -1,
                                }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ borderTop: '1px solid #999' }} />

                    {/* Tab content */}
                    <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
                        {/* ============ الاصناف TAB ============ */}
                        {activeTab === 'items' && (
                            <div>
                                {/* Category row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <span style={{ fontSize: 14, fontWeight: 'bold' }}>الاصناف</span>
                                    <select value={selectedCatId || ''} onChange={e => { setSelectedCatId(e.target.value ? Number(e.target.value) : null); handleClearItem(); }}
                                        style={{ flex: 1, maxWidth: 300, padding: '4px 8px', border: '1px solid #999', fontSize: 13, background: '#fff' }}>
                                        <option value="">-- اختر قسم --</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                                    </select>
                                    <button onClick={() => setShowCatForm(!showCatForm)} style={{ padding: '4px 12px', border: '1px solid #999', background: '#e8e0c8', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>اختر</button>
                                    {selectedCatId && <button onClick={handleDeleteCategory} style={{ padding: '4px 12px', border: '1px solid #c00', background: '#fdd', cursor: 'pointer', fontSize: 11, color: '#c00' }}>حذف القسم</button>}
                                </div>

                                {showCatForm && (
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                                        <span style={{ fontSize: 12 }}>قسم جديد:</span>
                                        <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="اسم القسم" style={{ padding: '4px 8px', border: '1px solid #999', fontSize: 13, width: 200 }} />
                                        <button onClick={handleAddCategory} className="classic-btn-green" style={{ fontSize: 11, padding: '3px 12px' }}>حفظ</button>
                                    </div>
                                )}

                                {/* Item list from selected category */}
                                {selectedCatId && catItems.length > 0 && (
                                    <div style={{ marginBottom: 16, maxHeight: 120, overflow: 'auto', border: '1px solid #ccc', background: '#fff' }}>
                                        {catItems.map(item => (
                                            <div key={item.id} onClick={() => handleSelectItem(item)}
                                                style={{ padding: '3px 8px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #eee', background: selectedItemId === item.id ? '#d0e0f0' : '#fff' }}>
                                                {item.title_ar} - {formatCurrency(item.prices[0])}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Item form */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <span style={{ fontSize: 14, fontWeight: 'bold', minWidth: 50 }}>الصنف</span>
                                    <input value={itemName} onChange={e => setItemName(e.target.value)} placeholder=""
                                        style={{ flex: 1, maxWidth: 400, padding: '4px 8px', border: '1px solid #999', fontSize: 13, background: '#fff' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                    <span style={{ fontSize: 14, fontWeight: 'bold', minWidth: 50 }}>السعر</span>
                                    <input type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder=""
                                        style={{ width: 150, padding: '4px 8px', border: '1px solid #999', fontSize: 13, background: '#fffde0' }} dir="ltr" />
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                    <button onClick={handleSaveItem} disabled={!selectedCatId || !itemName.trim()}
                                        style={{ padding: '6px 24px', border: '1px solid #999', background: '#e8e0c8', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', opacity: !selectedCatId || !itemName.trim() ? 0.5 : 1 }}>تسجيل</button>
                                    <button onClick={handleEditItem} disabled={!selectedItemId}
                                        style={{ padding: '6px 24px', border: '1px solid #999', background: '#e8e0c8', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', opacity: !selectedItemId ? 0.5 : 1 }}>تعديل</button>
                                    <button onClick={handleDeleteItem} disabled={!selectedItemId}
                                        style={{ padding: '6px 24px', border: '1px solid #999', background: '#e8e0c8', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', opacity: !selectedItemId ? 0.5 : 1 }}>حذف</button>
                                    <button onClick={handleClearItem}
                                        style={{ padding: '6px 24px', border: '1px solid #999', background: '#e8e0c8', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>جديد</button>
                                </div>
                            </div>
                        )}

                        {/* ============ الطباعة TAB ============ */}
                        {activeTab === 'printer' && (
                            <div style={{ maxWidth: 500, margin: '20px auto' }}>
                                <div className="classic-form-area" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: 8 }}>إعدادات الطباعة (POS)</h3>
                                    
                                    <div>
                                        <label style={{ fontSize: 13, fontWeight: 'bold', display: 'block', marginBottom: 6 }}>اسم الطابعة الافتراضية</label>
                                        <input value={printerName} onChange={e => setPrinterName(e.target.value)}
                                            style={{ width: '100%', padding: '6px 10px', border: '1px solid #999', fontSize: 14, background: '#fff' }} />
                                    </div>
                                    
                                    <div>
                                        <label style={{ fontSize: 13, fontWeight: 'bold', display: 'block', marginBottom: 6 }}>مقاس الورق</label>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {PAPER_SIZES.map(size => (
                                                <button key={size.value} onClick={() => setPSettings({ ...pSettings, paperWidth: size.value })}
                                                    style={{ flex: 1, minWidth: '45%', padding: '10px', border: pSettings.paperWidth === size.value ? '2px solid #28a745' : '1px solid #ccc', background: pSettings.paperWidth === size.value ? '#e8f5e9' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 'bold', borderRadius: 4 }}>
                                                    {size.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: 13, fontWeight: 'bold', display: 'block', marginBottom: 6 }}>حجم الخط: {pSettings.fontSize}px</label>
                                        <input type="range" min="10" max="22" step="1" value={pSettings.fontSize}
                                            onChange={e => setPSettings({ ...pSettings, fontSize: Number(e.target.value) })}
                                            style={{ width: '100%', cursor: 'pointer' }} />
                                    </div>

                                    <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                                        <button onClick={() => { savePrinterSettings(pSettings); alert('تم حفظ إعدادات الطباعة بنجاح!'); }}
                                            className="classic-btn-green" style={{ flex: 1, padding: '8px', fontSize: 14 }}>حفظ الإعدادات</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ============ دليفري TAB ============ */}
                        {activeTab === 'delivery' && (
                            <div>
                                <h3 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>إدارة سائقي الدليفري</h3>
                                {drivers.length === 0 ? <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>لا يوجد سائقين - أضف من إدارة الموظفين</p> :
                                    <table className="classic-table"><thead><tr><th>الاسم</th><th>المستخدم</th><th style={{ textAlign: 'center' }}>الحالة</th></tr></thead><tbody>{drivers.map(d => <tr key={d.id}><td style={{ fontWeight: 'bold' }}>{d.name}</td><td dir="ltr">{d.username}</td><td style={{ textAlign: 'center', color: d.is_active ? '#28a745' : '#dc3545' }}>{d.is_active ? 'نشط' : 'موقوف'}</td></tr>)}</tbody></table>}
                            </div>
                        )}

                        {/* ============ حساب الداليفري TAB ============ */}
                        {activeTab === 'deliveryAccount' && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>السائق:</span>
                                    <select value={selectedDriver || ''} onChange={e => setSelectedDriver(e.target.value ? Number(e.target.value) : null)}
                                        style={{ padding: '4px 8px', border: '1px solid #999', fontSize: 13, width: 200 }}>
                                        <option value="">الكل</option>
                                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <table className="classic-table"><thead><tr><th>السائق</th><th style={{ textAlign: 'center' }}>الطلبات</th><th style={{ textAlign: 'center' }}>الإجمالي</th><th style={{ textAlign: 'center' }}>حساب الدليفري</th></tr></thead>
                                    <tbody>{drivers.filter(d => !selectedDriver || d.id === selectedDriver).map(d => { const st = getDriverStats(d.id!); return <tr key={d.id}><td style={{ fontWeight: 'bold' }}>{d.name}</td><td style={{ textAlign: 'center' }}>{st.count}</td><td style={{ textAlign: 'center', fontWeight: 'bold' }}>{formatCurrency(st.total)}</td><td style={{ textAlign: 'center', fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(st.fees)}</td></tr>; })}</tbody></table>
                            </div>
                        )}

                        {/* ============ إعدادات المطعم TAB ============ */}
                        {activeTab === 'config' && (
                            <div style={{ maxWidth: 500, margin: '20px auto' }}>
                                <div className="classic-form-area" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: 8 }}>البيانات الأساسية للمطعم</h3>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}>اسم المطعم (يظهر في الأعلى)</label>
                                        <input value={restName} onChange={e => setRestName(e.target.value)} style={{ width: '100%' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}>أرقام التليفونات (تطبع على الفاتورة)</label>
                                        <input value={restPhone} onChange={e => setRestPhone(e.target.value)} style={{ width: '100%' }} dir="ltr" placeholder="01012345678 - 01112345678" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}>العنوان (يطبع على الفاتورة)</label>
                                        <input value={restAddress} onChange={e => setRestAddress(e.target.value)} style={{ width: '100%' }} />
                                    </div>
                                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                                        <button onClick={handleSaveConfig} className="classic-btn-green" style={{ width: '100%' }}>حفظ الإعدادات</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
