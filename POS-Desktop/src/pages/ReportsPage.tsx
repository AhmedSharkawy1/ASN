import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { formatCurrency } from '../lib/helpers';
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Package, Calendar, Download, Users, Truck } from 'lucide-react';

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
        else if (range === 'custom' && customStart && customEnd) {
            const start = new Date(customStart); start.setHours(0, 0, 0, 0);
            const end = new Date(customEnd); end.setHours(23, 59, 59, 999);
            allOrders = allOrders.filter(o => { const d = new Date(o.created_at); return d >= start && d <= end; });
        }

        const revenue = allOrders.reduce((s, o) => s + (o.total || 0), 0);
        const avgTicket = allOrders.length > 0 ? revenue / allOrders.length : 0;
        const deliveryFees = allOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0);

        // Top Items with category
        const itemMap: Record<string, { count: number; revenue: number; category?: string }> = {};
        allOrders.forEach(o => { (o.items || []).forEach(i => { if (!itemMap[i.title]) itemMap[i.title] = { count: 0, revenue: 0, category: i.category }; itemMap[i.title].count += i.qty; itemMap[i.title].revenue += i.price * i.qty; }); });
        const topItems = Object.entries(itemMap).map(([title, v]) => ({ title, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 15);

        // Category breakdown
        const catMap: Record<string, { items: number; revenue: number }> = {};
        allOrders.forEach(o => { (o.items || []).forEach(i => { const cat = i.category || 'بدون قسم'; if (!catMap[cat]) catMap[cat] = { items: 0, revenue: 0 }; catMap[cat].items += i.qty; catMap[cat].revenue += i.price * i.qty; }); });
        const categoryBreakdown = Object.entries(catMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);

        // Staff breakdown
        const staffMap: Record<string, { orders: number; revenue: number }> = {};
        allOrders.forEach(o => { const name = o.cashier_name || 'غير محدد'; if (!staffMap[name]) staffMap[name] = { orders: 0, revenue: 0 }; staffMap[name].orders++; staffMap[name].revenue += o.total || 0; });
        const staffBreakdown = Object.entries(staffMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);

        setStats({ revenue, orders: allOrders.length, avgTicket, deliveryFees, topItems, categoryBreakdown, staffBreakdown });
        setLoading(false);
    }, [range, customStart, customEnd]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const exportCSV = () => {
        let headers: string[], rows: (string | number)[][];
        if (activeTab === 'items') { headers = ['الصنف', 'القسم', 'الكمية', 'الإيراد']; rows = stats.topItems.map(i => [i.title, i.category || '-', i.count, i.revenue]); }
        else if (activeTab === 'categories') { headers = ['القسم', 'الأصناف المباعة', 'الإيراد']; rows = stats.categoryBreakdown.map(c => [c.name, c.items, c.revenue]); }
        else { headers = ['الموظف', 'الطلبات', 'الإيراد']; rows = stats.staffBreakdown.map(s => [s.name, s.orders, s.revenue]); }
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `report-${activeTab}-${range}.csv`; a.click();
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-3"><BarChart3 className="w-7 h-7 text-emerald-500" /> تقارير المبيعات</h1>
                <div className="flex gap-2 items-center flex-wrap">
                    {range === 'custom' && (
                        <div className="flex gap-2 items-center bg-white dark:bg-dark-700 px-2 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.04]">
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-xs font-bold text-zinc-900 dark:text-white" />
                            <span className="text-zinc-500 text-xs">-</span>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-xs font-bold text-zinc-900 dark:text-white" />
                        </div>
                    )}
                    {(['today', 'week', 'month', 'all', 'custom'] as const).map(r => (
                        <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${range === r ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-white dark:bg-dark-700 text-zinc-500 border border-zinc-200 dark:border-white/[0.04] hover:text-zinc-900 dark:hover:text-zinc-300'}`}>
                            {{ today: 'اليوم', week: 'الأسبوع', month: 'الشهر', all: 'الكل', custom: 'مخصص' }[r]}
                        </button>))}
                </div>
            </div>

            {loading ? <div className="text-center py-12 text-zinc-500 animate-pulse">جاري التحميل...</div> : (
                <>
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { icon: DollarSign, label: 'الإيرادات', value: formatCurrency(stats.revenue), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                            { icon: ShoppingCart, label: 'الطلبات', value: stats.orders.toString(), color: 'text-blue-500', bg: 'bg-blue-500/10' },
                            { icon: TrendingUp, label: 'متوسط الطلب', value: formatCurrency(stats.avgTicket), color: 'text-amber-500', bg: 'bg-amber-500/10' },
                            { icon: Truck, label: 'حساب الدليفري', value: formatCurrency(stats.deliveryFees), color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white dark:bg-dark-700 border border-zinc-200 dark:border-white/[0.04] rounded-xl p-5 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}><s.icon className="w-6 h-6" /></div>
                                <div><p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{s.label}</p><p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p></div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-dark-700 border border-zinc-200 dark:border-white/[0.04] rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex gap-2">
                                {[{ key: 'items', label: 'الأصناف', icon: Package }, { key: 'categories', label: 'الأقسام', icon: BarChart3 }, { key: 'staff', label: 'الموظفين', icon: Users }].map(tab => (
                                    <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${activeTab === tab.key ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}><tab.icon className="w-3.5 h-3.5" /> {tab.label}</button>
                                ))}
                            </div>
                            <button onClick={exportCSV} className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:text-emerald-500 transition flex items-center gap-1"><Download className="w-3 h-3" /> تصدير CSV</button>
                        </div>

                        {/* ITEMS TAB */}
                        {activeTab === 'items' && (
                            stats.topItems.length === 0 ? <p className="text-center py-8 text-zinc-400 text-sm">لا توجد بيانات</p> :
                                <div className="space-y-1">
                                    {stats.topItems.map((item, i) => {
                                        const maxRev = stats.topItems[0]?.revenue || 1;
                                        return (
                                            <div key={i} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition">
                                                <span className="w-6 text-center text-xs font-bold text-zinc-400">{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2"><p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.title}</p>{item.category && <span className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-bold border border-blue-200 dark:border-blue-500/20">{item.category}</span>}</div>
                                                    <div className="w-full bg-zinc-100 dark:bg-dark-900 rounded-full h-1.5 mt-1"><div className="bg-emerald-500/50 h-1.5 rounded-full transition-all" style={{ width: `${(item.revenue / maxRev) * 100}%` }} /></div>
                                                </div>
                                                <span className="text-xs text-zinc-500 font-bold">{item.count} قطعة</span>
                                                <span className="text-sm font-extrabold text-emerald-500">{formatCurrency(item.revenue)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                        )}

                        {/* CATEGORIES TAB */}
                        {activeTab === 'categories' && (
                            stats.categoryBreakdown.length === 0 ? <p className="text-center py-8 text-zinc-400 text-sm">لا توجد بيانات</p> :
                                <div className="space-y-1">
                                    {stats.categoryBreakdown.map((cat, i) => {
                                        const maxRev = stats.categoryBreakdown[0]?.revenue || 1;
                                        return (
                                            <div key={i} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition">
                                                <span className="w-6 text-center text-xs font-bold text-zinc-400">{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{cat.name}</p>
                                                    <div className="w-full bg-zinc-100 dark:bg-dark-900 rounded-full h-1.5 mt-1"><div className="bg-blue-500/50 h-1.5 rounded-full transition-all" style={{ width: `${(cat.revenue / maxRev) * 100}%` }} /></div>
                                                </div>
                                                <span className="text-xs text-zinc-500 font-bold">{cat.items} صنف</span>
                                                <span className="text-sm font-extrabold text-blue-500">{formatCurrency(cat.revenue)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                        )}

                        {/* STAFF TAB */}
                        {activeTab === 'staff' && (
                            stats.staffBreakdown.length === 0 ? <p className="text-center py-8 text-zinc-400 text-sm">لا توجد بيانات</p> :
                                <div className="space-y-1">
                                    {stats.staffBreakdown.map((s, i) => {
                                        const maxRev = stats.staffBreakdown[0]?.revenue || 1;
                                        return (
                                            <div key={i} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">{s.name.charAt(0)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{s.name}</p>
                                                    <div className="w-full bg-zinc-100 dark:bg-dark-900 rounded-full h-1.5 mt-1"><div className="bg-amber-500/50 h-1.5 rounded-full transition-all" style={{ width: `${(s.revenue / maxRev) * 100}%` }} /></div>
                                                </div>
                                                <span className="text-xs text-zinc-500 font-bold">{s.orders} طلبات</span>
                                                <span className="text-sm font-extrabold text-amber-500">{formatCurrency(s.revenue)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
