import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../lib/db';
import type { Customer } from '../lib/db';
import { formatCurrency, formatDate } from '../lib/helpers';
import { AppUser } from '../App';
import { Users, Search, Download, Upload, Phone, ShoppingCart, Trash2, Plus, Check, X, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
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

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

        const enriched = allCustomers.map(c => {
            const custOrders = allOrders.filter(o => o.customer_phone === c.phone || o.customer_name === c.name);
            let status = 'خامل';
            if (custOrders.length >= 10) status = 'VIP';
            else if (custOrders.some(o => o.created_at >= thirtyDaysAgoStr)) status = 'نشط';

            return {
                ...c,
                orders: custOrders.length,
                total: custOrders.reduce((s, o) => s + (o.total || 0), 0),
                lastOrder: custOrders.length > 0 ? custOrders.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at : c.created_at,
                status
            };
        });

        // Also add customers from orders that aren't in customers table
        const existingPhones = new Set(allCustomers.map(c => c.phone));
        const existingNames = new Set(allCustomers.map(c => c.name));
        const orphanMap: Record<string, { name: string; phone: string; orders: number; total: number; lastOrder: string; status: string }> = {};
        allOrders.forEach(o => {
            const key = o.customer_phone || o.customer_name || '';
            if (!key || existingPhones.has(key) || existingNames.has(o.customer_name || '')) return;
            if (!orphanMap[key]) orphanMap[key] = { name: o.customer_name || '-', phone: o.customer_phone || '-', orders: 0, total: 0, lastOrder: o.created_at, status: 'خامل' };
            orphanMap[key].orders++;
            orphanMap[key].total += o.total || 0;
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
        const file = e.target.files?.[0];
        if (!file) return;
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
                existingPhones.add(phone);
                count++;
            }
            setImportStatus({ type: 'success', message: `تم استيراد ${count} عميل بنجاح!` });
            fetchCustomers();
        } catch { setImportStatus({ type: 'error', message: 'خطأ في قراءة الملف' }); }
        if (fileRef.current) fileRef.current.value = '';
    };

    const downloadTemplate = () => {
        const rows = [{ 'الاسم': 'أحمد', 'الهاتف': '01001234567', 'العنوان': 'المعادي', 'ملاحظات': 'عميل مميز' }];
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        XLSX.writeFile(wb, 'Customers_Template.xlsx');
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-extrabold text-white flex items-center gap-3"><Users className="w-7 h-7 text-emerald-400" /> بيانات العملاء</h1>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 bg-dark-700 text-zinc-300 font-bold text-xs rounded-xl border border-white/[0.04] hover:border-emerald-500/30 transition"><Plus className="w-3.5 h-3.5" /> إضافة عميل</button>
                    <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-dark-700 text-zinc-300 font-bold text-xs rounded-xl border border-white/[0.04] hover:border-emerald-500/30 transition"><Download className="w-3.5 h-3.5" /> تصدير CSV</button>
                </div>
            </div>

            {/* Import Section */}
            <div className="bg-dark-700 border border-white/[0.04] rounded-xl p-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-3"><FileSpreadsheet className="w-4 h-4 text-emerald-400" /> استيراد العملاء من Excel</h3>
                <div className="flex flex-wrap gap-3 items-center">
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm rounded-xl transition active:scale-95 shadow-lg shadow-emerald-500/20">
                        <Upload className="w-4 h-4" /> استيراد Excel
                    </button>
                    <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2.5 bg-dark-600 text-zinc-300 font-bold text-xs rounded-xl border border-white/[0.04]">
                        <FileSpreadsheet className="w-4 h-4" /> تحميل نموذج
                    </button>
                </div>
                {importStatus && (
                    <div className={`mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold animate-fade-in ${importStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {importStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {importStatus.message}
                    </div>
                )}
            </div>

            {/* Add Customer */}
            {showAdd && (
                <div className="bg-dark-700 border border-emerald-500/20 rounded-xl p-4 animate-fade-in space-y-3">
                    <h3 className="text-sm font-bold text-white">إضافة عميل جديد</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <input value={newCust.name} onChange={e => setNewCust(v => ({ ...v, name: e.target.value }))} placeholder="الاسم" className="px-3 py-2 bg-dark-900 border border-white/[0.06] rounded-lg text-sm text-white" />
                        <input value={newCust.phone} onChange={e => setNewCust(v => ({ ...v, phone: e.target.value }))} placeholder="الهاتف" dir="ltr" className="px-3 py-2 bg-dark-900 border border-white/[0.06] rounded-lg text-sm text-white" />
                        <input value={newCust.address} onChange={e => setNewCust(v => ({ ...v, address: e.target.value }))} placeholder="العنوان (اختياري)" className="px-3 py-2 bg-dark-900 border border-white/[0.06] rounded-lg text-sm text-white" />
                        <input value={newCust.notes} onChange={e => setNewCust(v => ({ ...v, notes: e.target.value }))} placeholder="ملاحظات (اختياري)" className="px-3 py-2 bg-dark-900 border border-white/[0.06] rounded-lg text-sm text-white" />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-zinc-400 text-xs font-bold">إلغاء</button>
                        <button onClick={addCustomer} className="px-4 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1"><Check className="w-3 h-3" /> إضافة</button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="بحث بالاسم أو الرقم..."
                    className="w-full pr-10 pl-4 py-2.5 bg-dark-700 border border-white/[0.04] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/40" />
            </div>

            {/* Table */}
            {loading ? <div className="text-center py-12 text-zinc-500 animate-pulse">جاري التحميل...</div> : filtered.length === 0 ? (
                <div className="text-center py-16 text-zinc-600"><Users className="w-16 h-16 mx-auto mb-3 opacity-30" /><p className="font-bold">لا يوجد عملاء</p></div>
            ) : (
                <div className="bg-dark-700 border border-white/[0.04] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/[0.04]">
                            <th className="text-right p-4 text-[10px] text-zinc-500 font-bold uppercase">العميل</th>
                            <th className="text-right p-4 text-[10px] text-zinc-500 font-bold uppercase">الهاتف</th>
                            <th className="text-center p-4 text-[10px] text-zinc-500 font-bold uppercase">التصنيف</th>
                            <th className="text-center p-4 text-[10px] text-zinc-500 font-bold uppercase">الطلبات</th>
                            <th className="text-right p-4 text-[10px] text-zinc-500 font-bold uppercase">الإنفاق</th>
                            <th className="text-right p-4 text-[10px] text-zinc-500 font-bold uppercase">آخر طلب</th>
                            <th className="p-4"></th>
                        </tr></thead>
                        <tbody>
                            {filtered.map((c, i) => (
                                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition">
                                    <td className="p-4 font-bold text-zinc-300">{c.name}</td>
                                    <td className="p-4 text-zinc-400 flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3" /> {c.phone}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${c.status === 'VIP' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : c.status === 'نشط' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center"><span className="bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 w-fit mx-auto"><ShoppingCart className="w-3 h-3" /> {c.orders}</span></td>
                                    <td className="p-4 font-extrabold text-emerald-400">{formatCurrency(c.total)}</td>
                                    <td className="p-4 text-zinc-500 text-xs">{formatDate(c.lastOrder)}</td>
                                    <td className="p-4">{c.id && user.role === 'admin' && <button onClick={() => deleteCustomer(c.id!)} className="text-zinc-600 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
