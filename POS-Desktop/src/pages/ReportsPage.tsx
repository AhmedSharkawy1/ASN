import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { formatCurrency } from '../lib/helpers';

export default function ReportsPage() {
    const [range, setRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [stats, setStats] = useState({ revenue: 0, orders: 0, avgTicket: 0, deliveryFees: 0, topItems: [] as { title: string; count: number; revenue: number; category?: string }[], categoryBreakdown: [] as { name: string; items: number; revenue: number }[], staffBreakdown: [] as { name: string; orders: number; revenue: number }[] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'staff'>('items');

    const fetchStats = useCallback(async () => {
        setLoading(true);
        let allOrders = await db.orders.where('status').notEqual('cancelled').toArray();
        allOrders = allOrders.filter(o => o.status !== 'held');
        const now = new Date();
        if (range === 'today') { const ts = now.toISOString().split('T')[0]; allOrders = allOrders.filter(o => o.created_at.startsWith(ts)); }
        else if (range === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); allOrders = allOrders.filter(o => new Date(o.created_at) >= w); }
        else if (range === 'month') { const m = new Date(now); m.setMonth(m.getMonth() - 1); allOrders = allOrders.filter(o => new Date(o.created_at) >= m); }
        else if (range === 'custom' && customStart && customEnd) { const s = new Date(customStart); s.setHours(0, 0, 0, 0); const e = new Date(customEnd); e.setHours(23, 59, 59, 999); allOrders = allOrders.filter(o => { const d = new Date(o.created_at); return d >= s && d <= e; }); }
        const revenue = allOrders.reduce((s, o) => s + (o.total || 0), 0);
        const itemMap: Record<string, { count: number; revenue: number; category?: string }> = {};
        allOrders.forEach(o => { (o.items || []).forEach(i => { if (!itemMap[i.title]) itemMap[i.title] = { count: 0, revenue: 0, category: i.category }; itemMap[i.title].count += i.qty; itemMap[i.title].revenue += i.price * i.qty; }); });
        const catMap: Record<string, { items: number; revenue: number }> = {};
        allOrders.forEach(o => { (o.items || []).forEach(i => { const cat = i.category || 'بدون قسم'; if (!catMap[cat]) catMap[cat] = { items: 0, revenue: 0 }; catMap[cat].items += i.qty; catMap[cat].revenue += i.price * i.qty; }); });
        const staffMap: Record<string, { orders: number; revenue: number }> = {};
        allOrders.forEach(o => { const n = o.cashier_name || 'غير محدد'; if (!staffMap[n]) staffMap[n] = { orders: 0, revenue: 0 }; staffMap[n].orders++; staffMap[n].revenue += o.total || 0; });
        setStats({ revenue, orders: allOrders.length, avgTicket: allOrders.length > 0 ? revenue / allOrders.length : 0, deliveryFees: allOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0), topItems: Object.entries(itemMap).map(([title, v]) => ({ title, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 15), categoryBreakdown: Object.entries(catMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue), staffBreakdown: Object.entries(staffMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue) });
        setLoading(false);
    }, [range, customStart, customEnd]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const exportCSV = () => {
        let h: string[], r: (string | number)[][];
        if (activeTab === 'items') { h = ['الصنف', 'القسم', 'الكمية', 'الإيراد']; r = stats.topItems.map(i => [i.title, i.category || '-', i.count, i.revenue]); }
        else if (activeTab === 'categories') { h = ['القسم', 'الأصناف', 'الإيراد']; r = stats.categoryBreakdown.map(c => [c.name, c.items, c.revenue]); }
        else { h = ['الموظف', 'الطلبات', 'الإيراد']; r = stats.staffBreakdown.map(s => [s.name, s.orders, s.revenue]); }
        const csv = [h, ...r].map(x => x.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `report-${activeTab}-${range}.csv`; a.click();
    };

    const rangeLabels: Record<string, string> = { today: 'اليوم', week: 'الأسبوع', month: 'الشهر', all: 'الكل', custom: 'مخصص' };
    const tabLabels = [{ key: 'items' as const, label: '📦 الأصناف' }, { key: 'categories' as const, label: '📊 الأقسام' }, { key: 'staff' as const, label: '👤 الموظفين' }];

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }} dir="rtl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h1 style={{ fontSize: 18, fontWeight: 'bold' }}>📊 تقارير المبيعات</h1>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {range === 'custom' && <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#f0ece0', padding: '2px 8px', border: '1px solid #999' }}><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ border: '1px solid #ccc', padding: '2px 4px', fontSize: 12 }} /><span>-</span><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ border: '1px solid #ccc', padding: '2px 4px', fontSize: 12 }} /></div>}
                    {(['today', 'week', 'month', 'all', 'custom'] as const).map(r => <button key={r} onClick={() => setRange(r)} className={range === r ? 'classic-btn-green' : 'classic-btn'} style={{ fontSize: 11, padding: '3px 10px' }}>{rangeLabels[r]}</button>)}
                </div>
            </div>
            {loading ? <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>جاري التحميل...</p> : (<>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                    {[{ l: 'الإيرادات', v: formatCurrency(stats.revenue), c: '#28a745' }, { l: 'الطلبات', v: String(stats.orders), c: '#4080c0' }, { l: 'متوسط الطلب', v: formatCurrency(stats.avgTicket), c: '#e0a000' }, { l: 'حساب الدليفري', v: formatCurrency(stats.deliveryFees), c: '#17a2b8' }].map((s, i) => <div key={i} style={{ background: '#f0ece0', border: '1px solid #999', padding: '10px 12px', textAlign: 'center' }}><p style={{ fontSize: 11, color: '#666', fontWeight: 'bold' }}>{s.l}</p><p style={{ fontSize: 22, fontWeight: 'bold', color: s.c, marginTop: 4 }}>{s.v}</p></div>)}
                </div>
                <div style={{ background: '#f0ece0', border: '2px solid #999' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #999', background: '#e0d8c0' }}>
                        {tabLabels.map(t => <button key={t.key} onClick={() => setActiveTab(t.key)} className="classic-tab" style={{ background: activeTab === t.key ? '#f0ece0' : undefined, fontWeight: activeTab === t.key ? 'bold' : 'normal', padding: '6px 16px', fontSize: 12 }}>{t.label}</button>)}
                        <div style={{ marginRight: 'auto', padding: '4px 8px' }}><button onClick={exportCSV} className="classic-btn" style={{ fontSize: 10, padding: '2px 8px' }}>📥 CSV</button></div>
                    </div>
                    <div style={{ padding: 12 }}>
                        {activeTab === 'items' && (stats.topItems.length === 0 ? <p style={{ textAlign: 'center', padding: 30, color: '#999' }}>لا توجد بيانات</p> :
                            <table className="classic-table"><thead><tr><th>#</th><th>الصنف</th><th>القسم</th><th style={{ textAlign: 'center' }}>الكمية</th><th style={{ textAlign: 'center' }}>الإيراد</th></tr></thead><tbody>{stats.topItems.map((item, i) => <tr key={i}><td style={{ textAlign: 'center', color: '#999' }}>{i + 1}</td><td style={{ fontWeight: 'bold' }}>{item.title}</td><td style={{ color: '#666', fontSize: 11 }}>{item.category || '-'}</td><td style={{ textAlign: 'center' }}>{item.count}</td><td style={{ textAlign: 'center', fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(item.revenue)}</td></tr>)}</tbody></table>)}
                        {activeTab === 'categories' && (stats.categoryBreakdown.length === 0 ? <p style={{ textAlign: 'center', padding: 30, color: '#999' }}>لا توجد بيانات</p> :
                            <table className="classic-table"><thead><tr><th>#</th><th>القسم</th><th style={{ textAlign: 'center' }}>الأصناف</th><th style={{ textAlign: 'center' }}>الإيراد</th></tr></thead><tbody>{stats.categoryBreakdown.map((c, i) => <tr key={i}><td style={{ textAlign: 'center', color: '#999' }}>{i + 1}</td><td style={{ fontWeight: 'bold' }}>{c.name}</td><td style={{ textAlign: 'center' }}>{c.items}</td><td style={{ textAlign: 'center', fontWeight: 'bold', color: '#4080c0' }}>{formatCurrency(c.revenue)}</td></tr>)}</tbody></table>)}
                        {activeTab === 'staff' && (stats.staffBreakdown.length === 0 ? <p style={{ textAlign: 'center', padding: 30, color: '#999' }}>لا توجد بيانات</p> :
                            <table className="classic-table"><thead><tr><th>#</th><th>الموظف</th><th style={{ textAlign: 'center' }}>الطلبات</th><th style={{ textAlign: 'center' }}>الإيراد</th></tr></thead><tbody>{stats.staffBreakdown.map((s, i) => <tr key={i}><td style={{ textAlign: 'center', color: '#999' }}>{i + 1}</td><td style={{ fontWeight: 'bold' }}>{s.name}</td><td style={{ textAlign: 'center' }}>{s.orders}</td><td style={{ textAlign: 'center', fontWeight: 'bold', color: '#e0a000' }}>{formatCurrency(s.revenue)}</td></tr>)}</tbody></table>)}
                    </div>
                </div>
            </>)}
        </div>
    );
}
