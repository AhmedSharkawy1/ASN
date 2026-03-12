import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import type { Order } from '../lib/db';
import { formatCurrency, formatDateTime, statusLabels, statusColors, nextStatuses, timeAgo, getReceiptStyles } from '../lib/helpers';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateMode, setDateMode] = useState<'today' | 'all' | 'custom'>('today');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQ, setSearchQ] = useState('');
    const [restaurantInfo, setRestaurantInfo] = useState({ name: '', phone: '', address: '' });

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        let result = await db.orders.orderBy('order_number').reverse().toArray();
        if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
        if (dateMode === 'today') { const todayStr = new Date().toISOString().split('T')[0]; result = result.filter(o => o.created_at.startsWith(todayStr)); }
        else if (dateMode === 'custom' && customDate) { result = result.filter(o => o.created_at.startsWith(customDate)); }
        setOrders(result);
        const settings = await db.settings.toCollection().first();
        if (settings) setRestaurantInfo({ name: settings.restaurant_name, phone: settings.restaurant_phone || '', address: settings.restaurant_address || '' });
        setLoading(false);
    }, [statusFilter, dateMode, customDate]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const updateStatus = async (id: number, newStatus: string) => {
        await db.orders.update(id, { status: newStatus, updated_at: new Date().toISOString() });
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    };

    const printOrder = async (order: Order) => {
        let cAddress = '';
        if (order.customer_phone) {
            const c = await db.customers.where('phone').equals(order.customer_phone).first();
            if (c?.address) cAddress = c.address;
        }
        const itemsHtml = order.items.map(i => `<tr><td style="padding:4px 0;font-size:14px">${i.category ? `<span style="font-size:12px;color:#0284c7;font-weight:bold">${i.category}<br/></span>` : ''}${i.title}${i.size ? ` (${i.size})` : ''}</td><td style="text-align:center;padding:4px 0;font-size:15px;font-weight:bold">${i.qty}</td><td style="text-align:left;padding:4px 0;font-size:15px;font-weight:bold">${formatCurrency(i.price * i.qty)}</td></tr>`).join('');
        const pw = window.open('', '_blank', 'width=300,height=600');
        if (!pw) return;
        pw.document.write(`<html><head><title>Receipt</title><style>${getReceiptStyles()}</style></head><body>
            <div style="text-align:center;margin-bottom:15px">
                <p style="font-weight:bold;font-size:22px;margin:0 0 5px">${restaurantInfo.name || 'Restaurant'}</p>
                ${restaurantInfo.phone ? `<p style="font-size:13px;margin:0 0 5px;direction:ltr">📞 ${restaurantInfo.phone}</p>` : ''}
                ${restaurantInfo.address ? `<p style="font-size:14px;margin:0 0 5px">${restaurantInfo.address}</p>` : ''}
                <p style="font-size:14px;margin:0 0 5px">${new Date(order.created_at).toLocaleDateString('ar-EG')} - ${new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                <p style="font-weight:bold;font-size:18px;margin:0 0 5px 0">فاتورة رقم #${order.order_number}</p>
                <p style="font-size:16px;font-weight:bold;margin:0;display:inline-block;border:1px solid #000;padding:2px 6px;border-radius:4px">${(order as any).order_type === 'pickup' ? 'استلام من الفرع' : (order as any).order_type === 'delivery' ? 'دليفري' : 'من المطعم'}</p>
            </div>
            ${(order.customer_name || order.customer_phone || cAddress) ? `<div style="border-top:1.5px dashed #000;margin:12px 0"></div><div style="font-size:14px">${order.customer_name ? `<p style="margin:2px 0">العميل: <strong>${order.customer_name}</strong></p>` : ''}${order.customer_phone ? `<p style="margin:2px 0" dir="ltr">هاتف: <strong>${order.customer_phone}</strong></p>` : ''}${cAddress ? `<p style="margin:2px 0">العنوان: <strong>${cAddress}</strong></p>` : ''}</div>` : ''}
            ${order.notes ? `<div style="border-top:1.5px dashed #000;margin:12px 0"></div><div style="font-size:14px"><p style="margin:2px 0">ملاحظات: <strong>${order.notes}</strong></p></div>` : ''}
            <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
            <table><thead><tr><td style="font-weight:bold;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">الصنف</td><td style="font-weight:bold;text-align:center;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">الكمية</td><td style="font-weight:bold;text-align:left;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">المبلغ</td></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
            ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:15px"><span>الخصم</span><span>-${formatCurrency(order.discount)}</span></div>` : ''}
            ${order.delivery_fee ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#0891b2"><span>🚚 حساب الدليفري ${order.delivery_driver_name ? `(${order.delivery_driver_name})` : ''}</span><span>+${formatCurrency(order.delivery_fee)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:20px;margin-top:10px"><span>الإجمالي</span><span>${formatCurrency(order.total)}</span></div>
            <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
            <div style="text-align:center;font-size:13px;margin-top:20px;font-weight:bold"><p style="margin:0">شكرا لطلبكم نتمنى ان ينال اعجابكم ❤️</p></div>
        </body></html>`);
        pw.document.close(); pw.focus(); setTimeout(() => pw.print(), 250);

        setTimeout(() => {
            const kw = window.open('', '_blank', 'width=300,height=600');
            if (!kw) return;
            const orderTypeLabel = (order as any).order_type === 'pickup' ? 'استلام من الفرع' : (order as any).order_type === 'delivery' ? 'دليفري' : 'من المطعم';
            const kitchenItemsHtml = order.items.map(i => {
                const title = i.title + (i.size ? ` (${i.size})` : '');
                return `<tr><td style="padding:6px 0;font-size:16px"><div style="font-weight:bold">${i.qty}x ${title}</div>${i.category ? `<div style="font-size:12px;color:#555">القسم: ${i.category}</div>` : ''}</td></tr>`;
            }).join('<tr><td style="border-bottom:1px solid #ddd"></td></tr>');
            kw.document.write(`<html><head><title>Kitchen Receipt</title><style>${getReceiptStyles()}</style></head><body>
                <div style="text-align:center;border-bottom:2px dashed #000;padding-bottom:10px;margin-bottom:10px">
                    <h2 style="margin:0 0 5px 0;font-size:24px">نسخة المطبخ</h2>
                    <h3 style="margin:0;font-size:22px">طلب #${order.order_number}</h3>
                    <p style="margin:5px 0 0 0;font-size:16px;font-weight:bold;border:1px solid #000;display:inline-block;padding:3px 8px;border-radius:4px">${orderTypeLabel}</p>
                    <p style="margin:5px 0 0 0;font-size:14px">${new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                ${order.notes ? `<div style="border:1px solid #000;padding:5px;margin-bottom:10px;font-weight:bold">ملاحظات: ${order.notes}</div>` : ''}
                <table><tbody>${kitchenItemsHtml}</tbody></table>
            </body></html>`);
            kw.document.close(); kw.focus(); setTimeout(() => kw.print(), 250);
        }, 500);
    };

    const exportCSV = () => {
        const dStr = dateMode === 'today' ? new Date().toISOString().split('T')[0] : (dateMode === 'custom' ? customDate : 'all');
        let csv = '\uFEFF';
        csv += 'رقم الطلب,التاريخ والوقت,نوع الطلب,الكاشير,العميل,رقم هاتف العميل,المجموع,الخصم,الدليفري,الإجمالي,حالة الطلب\n';
        orders.forEach(o => {
            const dt = new Date(o.created_at);
            const time = dt.toLocaleTimeString('ar-EG') + ' ' + dt.toLocaleDateString('ar-EG');
            const type = (o as any).order_type === 'pickup' ? 'استلام من الفرع' : (o as any).order_type === 'delivery' ? 'دليفري' : 'من المطعم';
            const cashier = o.cashier_name || 'غير محدد';
            const custName = o.customer_name || 'غير محدد';
            const custPhone = o.customer_phone ? `"${o.customer_phone}"` : 'غير محدد';
            const status = statusLabels[o.status] || o.status;
            csv += `${o.order_number},"${time}","${type}","${cashier}","${custName}",${custPhone},${o.subtotal},${o.discount},${o.delivery_fee || 0},${o.total},"${status}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `orders_${dStr}.csv`; a.click(); URL.revokeObjectURL(url);
    };

    const filtered = orders.filter(o => {
        if (!searchQ) return true;
        const q = searchQ.toLowerCase();
        return o.order_number.toString().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.cashier_name?.toLowerCase().includes(q);
    });

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }} dir="rtl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h1 style={{ fontSize: 18, fontWeight: 'bold' }}>📋 إدارة الطلبات</h1>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={exportCSV} className="classic-btn" style={{ fontSize: 11, padding: '3px 12px' }}>📥 إخراج Excel</button>
                    <button onClick={fetchOrders} className="classic-btn" style={{ fontSize: 11, padding: '3px 10px' }}>🔄</button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="بحث برقم الطلب أو اسم العميل..."
                    style={{ flex: 1, minWidth: 200, padding: '5px 10px', border: '1px solid #999', fontSize: 12, background: '#fff' }} />
                <select value={dateMode} onChange={e => setDateMode(e.target.value as any)}
                    style={{ padding: '4px 8px', border: '1px solid #999', fontSize: 12, background: '#fff', cursor: 'pointer' }}>
                    <option value="today">اليوم</option>
                    <option value="custom">يوم محدد</option>
                    <option value="all">كل الأيام</option>
                </select>
                {dateMode === 'custom' && (
                    <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
                        style={{ padding: '4px 8px', border: '1px solid #999', fontSize: 12, background: '#fff' }} />
                )}
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid #999', fontSize: 12, background: '#fff', cursor: 'pointer' }}>
                    <option value="all">كل الحالات</option>
                    <option value="completed">مكتمل</option>
                    <option value="cancelled">ملغى</option>
                </select>
            </div>

            {loading ? <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>جاري التحميل...</p> : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                    <p style={{ fontSize: 14, fontWeight: 'bold' }}>لا توجد طلبات</p>
                </div>
            ) : (
                <div style={{ background: '#f0ece0', border: '2px solid #999' }}>
                    <table className="classic-table">
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>#</th>
                                <th>الحالة</th>
                                <th>العميل</th>
                                <th>الكاشير</th>
                                <th style={{ textAlign: 'center' }}>الأصناف</th>
                                <th>الوقت</th>
                                <th style={{ textAlign: 'center' }}>الإجمالي</th>
                                <th style={{ width: 60 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(order => (
                                <>
                                    <tr key={order.id} style={{ cursor: 'pointer' }}
                                        onClick={() => setExpanded(expanded === order.id! ? null : order.id!)}>
                                        <td style={{ fontWeight: 'bold' }}>#{order.order_number}</td>
                                        <td>
                                            <span style={{
                                                fontSize: 10, fontWeight: 'bold', padding: '2px 6px',
                                                border: '1px solid',
                                                background: order.status === 'completed' ? '#d4edda' : order.status === 'cancelled' ? '#f8d7da' : '#fff3cd',
                                                color: order.status === 'completed' ? '#155724' : order.status === 'cancelled' ? '#721c24' : '#856404',
                                                borderColor: order.status === 'completed' ? '#c3e6cb' : order.status === 'cancelled' ? '#f5c6cb' : '#ffc107',
                                            }}>
                                                {statusLabels[order.status] || order.status}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 'bold' }}>{order.customer_name || 'عميل'}</td>
                                        <td style={{ fontSize: 11, color: '#666' }}>{order.cashier_name || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{order.items.length}</td>
                                        <td style={{ fontSize: 10, color: '#666' }}>{timeAgo(order.created_at)}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(order.total)}</td>
                                        <td>
                                            <button onClick={e => { e.stopPropagation(); printOrder(order); }}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>🖨️</button>
                                        </td>
                                    </tr>
                                    {expanded === order.id && (
                                        <tr key={`${order.id}-expand`}>
                                            <td colSpan={8} style={{ padding: 12, background: '#f8f4e8' }}>
                                                <div style={{ marginBottom: 8 }}>
                                                    {order.items.map((item, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #ddd', fontSize: 12 }}>
                                                            <span style={{ fontWeight: 'bold' }}>
                                                                {item.title} {item.size ? `(${item.size})` : ''} × {item.qty}
                                                                {item.category && <span style={{ fontSize: 10, color: '#666', marginRight: 6 }}>({item.category})</span>}
                                                            </span>
                                                            <span style={{ fontWeight: 'bold' }}>{formatCurrency(item.price * item.qty)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    {order.status !== 'cancelled' && (
                                                        <button onClick={() => updateStatus(order.id!, 'cancelled')} className="classic-btn-red"
                                                            style={{ fontSize: 11, padding: '3px 10px' }}>إلغاء الطلب</button>
                                                    )}
                                                    <button onClick={() => printOrder(order)} className="classic-btn-green"
                                                        style={{ fontSize: 11, padding: '3px 10px' }}>🖨️ طباعة الفاتورة</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
