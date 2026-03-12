import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import type { PosUser, Order } from '../lib/db';
import { formatCurrency } from '../lib/helpers';

export default function DeliveryPage() {
    const [range, setRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [drivers, setDrivers] = useState<PosUser[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

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
    const totalDeliveryFees = orders.filter(o => o.delivery_driver_id).reduce((s, o) => s + (o.delivery_fee || 0), 0);

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }} dir="rtl">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h1 style={{ fontSize: 18, fontWeight: 'bold' }}>🚚 حسابات الدليفري</h1>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {range === 'custom' && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#f0ece0', padding: '2px 8px', border: '1px solid #999' }}>
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                                style={{ border: '1px solid #ccc', padding: '2px 4px', fontSize: 12 }} />
                            <span style={{ fontSize: 11 }}>-</span>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                                style={{ border: '1px solid #ccc', padding: '2px 4px', fontSize: 12 }} />
                        </div>
                    )}
                    {(['today', 'week', 'month', 'all', 'custom'] as const).map(r => (
                        <button key={r} onClick={() => setRange(r)}
                            className={range === r ? 'classic-btn-green' : 'classic-btn'}
                            style={{ fontSize: 11, padding: '3px 10px' }}>
                            {{ today: 'اليوم', week: 'الأسبوع', month: 'الشهر', all: 'الكل', custom: 'مخصص' }[r]}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>جاري التحميل...</p> : (
                <>
                    {/* Stats bar */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1, background: '#f0ece0', border: '1px solid #999', padding: '8px 12px', textAlign: 'center' }}>
                            <p style={{ fontSize: 11, color: '#666', fontWeight: 'bold' }}>السائقين</p>
                            <p style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>{drivers.length}</p>
                        </div>
                        <div style={{ flex: 1, background: '#f0ece0', border: '1px solid #999', padding: '8px 12px', textAlign: 'center' }}>
                            <p style={{ fontSize: 11, color: '#666', fontWeight: 'bold' }}>طلبات الدليفري</p>
                            <p style={{ fontSize: 20, fontWeight: 'bold', color: '#4080c0' }}>{totalDeliveryOrders}</p>
                        </div>
                        <div style={{ flex: 1, background: '#f0ece0', border: '1px solid #999', padding: '8px 12px', textAlign: 'center' }}>
                            <p style={{ fontSize: 11, color: '#666', fontWeight: 'bold' }}>حساب الدليفري (إجمالي)</p>
                            <p style={{ fontSize: 20, fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(totalDeliveryFees)}</p>
                        </div>
                    </div>

                    {/* Driver list */}
                    <div style={{ background: '#f0ece0', border: '2px solid #999', padding: 12 }}>
                        <div style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 13, fontWeight: 'bold', marginLeft: 8 }}>الطيارين</label>
                            <select value={selectedDriver || ''} onChange={e => setSelectedDriver(e.target.value ? Number(e.target.value) : null)}
                                style={{ padding: '4px 8px', border: '1px solid #999', fontSize: 13, background: '#fff' }}>
                                <option value="">الكل</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        {/* Orders table */}
                        <div style={{ maxHeight: 400, overflow: 'auto' }}>
                            <table className="classic-table">
                                <thead>
                                    <tr>
                                        <th>الاسم</th>
                                        <th style={{ textAlign: 'center' }}>الفاتورة</th>
                                        <th style={{ textAlign: 'center' }}>الاجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drivers.filter(d => !selectedDriver || d.id === selectedDriver).map(driver => {
                                        const stats = getDriverStats(driver.id!);
                                        return stats.orders.map(order => (
                                            <tr key={order.id}>
                                                <td style={{ fontWeight: 'bold' }}>{driver.name}</td>
                                                <td style={{ textAlign: 'center' }}>#{order.order_number}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(order.total)}</td>
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {drivers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                            <p style={{ fontWeight: 'bold', fontSize: 14 }}>لا يوجد سائقين دليفري</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>أضف سائقين من صفحة إدارة الموظفين</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
