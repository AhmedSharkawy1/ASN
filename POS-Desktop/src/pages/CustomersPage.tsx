import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../lib/db';
import type { Customer } from '../lib/db';
import { formatCurrency, formatDate } from '../lib/helpers';
import { AppUser } from '../App';
import * as XLSX from 'xlsx';

export default function CustomersPage({ user }: { user: AppUser }) {
    const [customers, setCustomers] = useState<(Customer & { orders: number; total: number; lastOrder: string; status: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newCust, setNewCust] = useState({ name: '', phone: '', address: '', notes: '' });
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        const allCustomers = await db.customers.toArray();
        const allOrders = await db.orders.where('status').notEqual('cancelled').toArray();
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

        const enriched = allCustomers.map(c => {
            const custOrders = allOrders.filter(o => o.customer_phone === c.phone || o.customer_name === c.name);
            let status = 'خامل';
            if (custOrders.length >= 10) status = 'VIP';
            else if (custOrders.some(o => o.created_at >= thirtyDaysAgoStr)) status = 'نشط';
            return { ...c, orders: custOrders.length, total: custOrders.reduce((s, o) => s + (o.total || 0), 0), lastOrder: custOrders.length > 0 ? custOrders.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at : c.created_at, status };
        });

        const existingPhones = new Set(allCustomers.map(c => c.phone));
        const existingNames = new Set(allCustomers.map(c => c.name));
        const orphanMap: Record<string, { name: string; phone: string; orders: number; total: number; lastOrder: string; status: string }> = {};
        allOrders.forEach(o => {
            const key = o.customer_phone || o.customer_name || '';
            if (!key || existingPhones.has(key) || existingNames.has(o.customer_name || '')) return;
            if (!orphanMap[key]) orphanMap[key] = { name: o.customer_name || '-', phone: o.customer_phone || '-', orders: 0, total: 0, lastOrder: o.created_at, status: 'خامل' };
            orphanMap[key].orders++; orphanMap[key].total += o.total || 0;
            if (o.created_at > orphanMap[key].lastOrder) orphanMap[key].lastOrder = o.created_at;
            if (orphanMap[key].orders >= 10) orphanMap[key].status = 'VIP';
            else if (o.created_at >= thirtyDaysAgoStr) orphanMap[key].status = 'نشط';
        });

        const allList = [...enriched, ...Object.values(orphanMap).map(o => ({ ...o, id: undefined, address: undefined, notes: undefined, created_at: o.lastOrder }))];
        setCustomers(allList.sort((a, b) => b.orders - a.orders) as typeof customers);
        setLoading(false);
    }, []);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const filtered = customers.filter(c => {
        if (!searchQ) return true;
        const q = searchQ.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phone.includes(q);
    });

    const addCustomer = async () => {
        if (!newCust.name.trim() || !newCust.phone.trim()) return;
        await db.customers.add({ name: newCust.name.trim(), phone: newCust.phone.trim(), address: newCust.address.trim() || undefined, notes: newCust.notes.trim() || undefined, created_at: new Date().toISOString() });
        setNewCust({ name: '', phone: '', address: '', notes: '' }); setShowAdd(false); fetchCustomers();
    };

    const deleteCustomer = async (id: number) => {
        await db.customers.delete(id);
        setCustomers(prev => prev.filter(c => c.id !== id));
    };

    const exportCSV = () => {
        const headers = ['الاسم', 'الهاتف', 'العنوان', 'ملاحظات', 'التصنيف', 'عدد الطلبات', 'إجمالي الإنفاق'];
        const rows = filtered.map(c => [c.name, c.phone, c.address || '', c.notes || '', c.status, c.orders, c.total]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'customers.csv'; a.click();
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setImportStatus(null);
        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(new Uint8Array(data), { type: 'array' });
            const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);
            if (rows.length === 0) { setImportStatus({ type: 'error', message: 'الملف فارغ!' }); return; }
            const existing = await db.customers.toArray();
            const existingPhones = new Set(existing.map(c => c.phone));
            let count = 0;
            for (const row of rows) {
                const name = String(row['الاسم'] || row['Name'] || '').trim();
                const phone = String(row['الهاتف'] || row['Phone'] || '').trim();
                if (!name || !phone || existingPhones.has(phone)) continue;
                await db.customers.add({ name, phone, address: String(row['العنوان'] || row['Address'] || '').trim() || undefined, notes: String(row['ملاحظات'] || row['Notes'] || '').trim() || undefined, created_at: new Date().toISOString() });
                existingPhones.add(phone); count++;
            }
            setImportStatus({ type: 'success', message: `تم استيراد ${count} عميل بنجاح!` }); fetchCustomers();
        } catch { setImportStatus({ type: 'error', message: 'خطأ في قراءة الملف' }); }
        if (fileRef.current) fileRef.current.value = '';
    };

    const downloadTemplate = () => {
        const rows = [{ 'الاسم': 'أحمد', 'الهاتف': '01001234567', 'العنوان': 'المعادي', 'ملاحظات': 'عميل مميز' }];
        const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Customers'); XLSX.writeFile(wb, 'Customers_Template.xlsx');
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }} dir="rtl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>👥 بيانات العملاء</h1>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowAdd(true)} className="classic-btn" style={{ fontSize: 11, padding: '3px 12px' }}>➕ إضافة عميل</button>
                    <button onClick={exportCSV} className="classic-btn" style={{ fontSize: 11, padding: '3px 12px' }}>📥 تصدير CSV</button>
                </div>
            </div>

            {/* Import section */}
            <div style={{ background: '#f0ece0', border: '1px solid #999', padding: 12, marginBottom: 12 }}>
                <p style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>📊 استيراد العملاء من Excel</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} />
                    <button onClick={() => fileRef.current?.click()} className="classic-btn-green" style={{ fontSize: 12, padding: '4px 16px' }}>📤 استيراد</button>
                    <button onClick={downloadTemplate} className="classic-btn" style={{ fontSize: 11, padding: '3px 12px' }}>📄 تحميل نموذج</button>
                </div>
                {importStatus && (
                    <div style={{ marginTop: 8, padding: '6px 12px', fontSize: 12, fontWeight: 'bold', background: importStatus.type === 'success' ? '#d4edda' : '#f8d7da', border: `1px solid ${importStatus.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`, color: importStatus.type === 'success' ? '#155724' : '#721c24' }}>
                        {importStatus.message}
                    </div>
                )}
            </div>

            {/* Add customer */}
            {showAdd && (
                <div style={{ background: '#f0ece0', border: '2px solid #4080c0', padding: 16, marginBottom: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 10 }}>إضافة عميل جديد</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                        <input value={newCust.name} onChange={e => setNewCust(v => ({ ...v, name: e.target.value }))} placeholder="الاسم" style={{ padding: '5px 8px', border: '1px solid #999', fontSize: 13 }} />
                        <input value={newCust.phone} onChange={e => setNewCust(v => ({ ...v, phone: e.target.value }))} placeholder="الهاتف" dir="ltr" style={{ padding: '5px 8px', border: '1px solid #999', fontSize: 13 }} />
                        <input value={newCust.address} onChange={e => setNewCust(v => ({ ...v, address: e.target.value }))} placeholder="العنوان (اختياري)" style={{ padding: '5px 8px', border: '1px solid #999', fontSize: 13 }} />
                        <input value={newCust.notes} onChange={e => setNewCust(v => ({ ...v, notes: e.target.value }))} placeholder="ملاحظات (اختياري)" style={{ padding: '5px 8px', border: '1px solid #999', fontSize: 13 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowAdd(false)} className="classic-btn" style={{ fontSize: 12 }}>إلغاء</button>
                        <button onClick={addCustomer} className="classic-btn-green" style={{ fontSize: 12, padding: '4px 16px' }}>✓ إضافة</button>
                    </div>
                </div>
            )}

            {/* Search */}
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="بحث بالاسم أو الرقم..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #999', fontSize: 16, background: '#fff', marginBottom: 12 }} />

            {/* Table */}
            {loading ? <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>جاري التحميل...</p> : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#999' }}><p style={{ fontWeight: 'bold' }}>لا يوجد عملاء</p></div>
            ) : (
                <div style={{ background: '#f0ece0', border: '2px solid #999', overflow: 'auto', maxHeight: 500 }}>
                    <table className="classic-table">
                        <thead>
                            <tr style={{ fontSize: 16 }}>
                                <th>العميل</th>
                                <th>الهاتف</th>
                                <th style={{ textAlign: 'center' }}>التصنيف</th>
                                <th style={{ textAlign: 'center' }}>الطلبات</th>
                                <th>الإنفاق</th>
                                <th>آخر طلب</th>
                                <th style={{ width: 40 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c, i) => (
                                <tr key={i} style={{ fontSize: 16 }}>
                                    <td style={{ fontWeight: 'bold', fontSize: 18 }}>{c.name}</td>
                                    <td dir="ltr" style={{ color: '#666', fontSize: 18 }}>{c.phone}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{
                                            fontSize: 14, fontWeight: 'bold', padding: '2px 8px', border: '1px solid',
                                            background: c.status === 'VIP' ? '#fff3cd' : c.status === 'نشط' ? '#d4edda' : '#e2e3e5',
                                            color: c.status === 'VIP' ? '#856404' : c.status === 'نشط' ? '#155724' : '#6c757d',
                                            borderColor: c.status === 'VIP' ? '#ffc107' : c.status === 'نشط' ? '#c3e6cb' : '#d6d8db',
                                        }}>{c.status}</span>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#4080c0', fontSize: 18 }}>{c.orders}</td>
                                    <td style={{ fontWeight: 'bold', color: '#28a745', fontSize: 18 }}>{formatCurrency(c.total)}</td>
                                    <td style={{ fontSize: 14, color: '#666' }}>{formatDate(c.lastOrder)}</td>
                                    <td>{c.id && user.role === 'admin' && <button onClick={() => deleteCustomer(c.id!)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc3545', fontSize: 18 }}>🗑️</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
