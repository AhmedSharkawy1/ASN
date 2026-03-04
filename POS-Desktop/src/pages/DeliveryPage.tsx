import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import type { PosUser, Order } from '../lib/db';
import { formatCurrency } from '../lib/helpers';
import { Truck, Package, DollarSign, Calendar, User, Wallet } from 'lucide-react';

export default function DeliveryPage() {
    const [range, setRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [drivers, setDrivers] = useState<PosUser[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const allDrivers = await db.pos_users.where('role').equals('delivery').toArray();
        setDrivers(allDrivers);
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
        setOrders(allOrders); setLoading(false);
    }, [range, customStart, customEnd]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getDriverStats = (driverId: number) => {
        const driverOrders = orders.filter(o => o.delivery_driver_id === driverId);
        return {
            orderCount: driverOrders.length,
            totalRevenue: driverOrders.reduce((s, o) => s + o.total, 0),
            totalFees: driverOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0),
            orders: driverOrders.sort((a, b) => b.created_at.localeCompare(a.created_at)),
        };
    };

    const totalDeliveryOrders = orders.filter(o => o.delivery_driver_id).length;
    const totalDeliveryRevenue = orders.filter(o => o.delivery_driver_id).reduce((s, o) => s + o.total, 0);
    const totalDeliveryFees = orders.filter(o => o.delivery_driver_id).reduce((s, o) => s + (o.delivery_fee || 0), 0);

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-3"><Truck className="w-7 h-7 text-emerald-500" /> حسابات الدليفري</h1>
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
                            { icon: Truck, color: 'text-cyan-500', bg: 'bg-cyan-500/10', label: 'السائقين', val: drivers.length },
                            { icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'طلبات الدليفري', val: totalDeliveryOrders },
                            { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'إيرادات الدليفري', val: formatCurrency(totalDeliveryRevenue) },
                            { icon: Wallet, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'حساب الدليفري (إجمالي)', val: formatCurrency(totalDeliveryFees) },
                        ].map((card, i) => (
                            <div key={i} className="bg-white dark:bg-dark-700 border border-zinc-200 dark:border-white/[0.04] rounded-xl p-5 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center ${card.color}`}><card.icon className="w-6 h-6" /></div>
                                <div><p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{card.label}</p><p className={`text-xl font-extrabold ${card.color}`}>{card.val}</p></div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {drivers.map(driver => {
                            const stats = getDriverStats(driver.id!);
                            return (
                                <div key={driver.id} className="bg-white dark:bg-dark-700 border border-zinc-200 dark:border-white/[0.04] rounded-xl overflow-hidden">
                                    <div className="p-5 flex items-center gap-4 border-b border-zinc-200 dark:border-white/[0.04]">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-600 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">{driver.name.charAt(0)}</div>
                                        <div className="flex-1"><h3 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2"><User className="w-4 h-4 text-zinc-500" /> {driver.name}</h3><p className="text-[10px] text-zinc-500" dir="ltr">@{driver.username}</p></div>
                                        <div className="flex items-center gap-8 text-center">
                                            <div><p className="text-[10px] text-zinc-500 font-bold">الطلبات</p><p className="text-xl font-extrabold text-blue-500">{stats.orderCount}</p></div>
                                            <div><p className="text-[10px] text-zinc-500 font-bold">الإيراد</p><p className="text-xl font-extrabold text-emerald-500">{formatCurrency(stats.totalRevenue)}</p></div>
                                            <div><p className="text-[10px] text-zinc-500 font-bold">حساب الدليفري</p><p className="text-xl font-extrabold text-amber-500">{formatCurrency(stats.totalFees)}</p></div>
                                        </div>
                                        <div className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${driver.is_active ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' : 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'}`}>{driver.is_active ? 'نشط' : 'موقوف'}</div>
                                    </div>
                                    {stats.orders.length > 0 && (
                                        <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                            <table className="w-full text-xs">
                                                <thead><tr className="border-b border-zinc-200 dark:border-white/[0.04]">
                                                    <th className="text-right p-3 text-[10px] text-zinc-500 font-bold">رقم الطلب</th>
                                                    <th className="text-right p-3 text-[10px] text-zinc-500 font-bold">العميل</th>
                                                    <th className="text-center p-3 text-[10px] text-zinc-500 font-bold">الأصناف</th>
                                                    <th className="text-right p-3 text-[10px] text-zinc-500 font-bold">المبلغ</th>
                                                    <th className="text-right p-3 text-[10px] text-zinc-500 font-bold">حساب الدليفري</th>
                                                    <th className="text-right p-3 text-[10px] text-zinc-500 font-bold">التاريخ</th>
                                                </tr></thead>
                                                <tbody>{stats.orders.slice(0, 20).map(order => (
                                                    <tr key={order.id} className="border-b border-zinc-100 dark:border-white/[0.03] hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition">
                                                        <td className="p-3 font-bold text-zinc-400">#{order.order_number}</td>
                                                        <td className="p-3 text-zinc-700 dark:text-zinc-300">{order.customer_name || '-'}</td>
                                                        <td className="p-3 text-center text-zinc-500">{order.items.reduce((s, i) => s + i.qty, 0)}</td>
                                                        <td className="p-3 font-extrabold text-emerald-500">{formatCurrency(order.total)}</td>
                                                        <td className="p-3 font-extrabold text-amber-500">{order.delivery_fee ? formatCurrency(order.delivery_fee) : '-'}</td>
                                                        <td className="p-3 text-zinc-500">{new Date(order.created_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                    </tr>
                                                ))}</tbody>
                                            </table>
                                        </div>
                                    )}
                                    {stats.orders.length === 0 && <div className="p-8 text-center text-zinc-400 text-xs"><Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />لا توجد طلبات في هذه الفترة</div>}
                                </div>
                            );
                        })}
                    </div>
                    {drivers.length === 0 && <div className="text-center py-16 text-zinc-500"><Truck className="w-16 h-16 mx-auto mb-3 opacity-30" /><p className="font-bold">لا يوجد سائقين دليفري</p><p className="text-xs mt-1">أضف سائقين من صفحة إدارة الموظفين</p></div>}
                </>
            )}
        </div>
    );
}
