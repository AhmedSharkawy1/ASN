import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import type { Order } from '../lib/db';
import { formatCurrency, formatDateTime, statusLabels, statusColors, nextStatuses, timeAgo } from '../lib/helpers';
import { ClipboardList, Search, RefreshCw, Printer, ChevronDown, ChevronUp, Clock } from 'lucide-react';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQ, setSearchQ] = useState('');
    const [restaurantInfo, setRestaurantInfo] = useState({ name: '', phone: '' });

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        let result = await db.orders.orderBy('order_number').reverse().toArray();
        if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
        setOrders(result);

        const settings = await db.settings.toCollection().first();
        if (settings) {
            setRestaurantInfo({ name: settings.restaurant_name, phone: settings.restaurant_phone || '' });
        }
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const updateStatus = async (id: number, newStatus: string) => {
        await db.orders.update(id, { status: newStatus, updated_at: new Date().toISOString() });
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    };

    const printOrder = async (order: Order) => {
        // Fetch driver Name and Customer Address if needed, though they might not be fully in order object if legacy. But let's fetch customer address anyway.
        let cAddress = '';
        if (order.customer_phone) {
            const c = await db.customers.where('phone').equals(order.customer_phone).first();
            if (c?.address) cAddress = c.address;
        }

        const itemsHtml = order.items.map(i => `
            <tr>
                <td style="padding:4px 0;font-size:14px">
                    ${i.category ? `<span style="font-size:12px;color:#0284c7;font-weight:bold">${i.category}<br/></span>` : ''}
                    ${i.title}${i.size ? ` (${i.size})` : ''}
                </td>
                <td style="text-align:center;padding:4px 0;font-size:15px;font-weight:bold">${i.qty}</td>
                <td style="text-align:left;padding:4px 0;font-size:15px;font-weight:bold">${formatCurrency(i.price * i.qty)}</td>
            </tr>
        `).join('');

        const pw = window.open('', '_blank', 'width=300,height=600');
        if (!pw) return;
        pw.document.write(`
            <html><head><title>Receipt</title><style>body{font-family:'Courier New',monospace;font-size:15px;width:72mm;margin:0 auto;padding:10px;direction:rtl;color:#000}table{width:100%;border-collapse:collapse}td{padding:4px 0;vertical-align:top;font-size:15px}.line{border-top:1.5px dashed #000;margin:12px 0}@media print{body{width:72mm}}</style></head>
            <body>
                <div style="text-align:center;margin-bottom:15px">
                    <p style="font-weight:bold;font-size:22px;margin:0 0 5px">${restaurantInfo.name || 'Restaurant'}</p>
                    ${restaurantInfo.phone ? `<p style="font-size:13px;margin:0 0 5px;direction:ltr">📞 ${restaurantInfo.phone}</p>` : ''}
                    <p style="font-size:14px;margin:0 0 5px">${new Date(order.created_at).toLocaleDateString('ar-EG')} - ${new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p style="font-weight:bold;font-size:18px;margin:0">فاتورة رقم #${order.order_number}</p>
                </div>

                ${(order.customer_name || order.customer_phone || cAddress) ? `
                    <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                    <div style="font-size:14px">
                        ${order.customer_name ? `<p style="margin:2px 0">العميل: <strong>${order.customer_name}</strong></p>` : ''}
                        ${order.customer_phone ? `<p style="margin:2px 0" dir="ltr">هاتف: <strong>${order.customer_phone}</strong></p>` : ''}
                        ${cAddress ? `<p style="margin:2px 0">العنوان: <strong>${cAddress}</strong></p>` : ''}
                    </div>
                ` : ''}

                ${order.notes ? `
                    <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                    <div style="font-size:14px">
                        <p style="margin:2px 0">ملاحظات: <strong>${order.notes}</strong></p>
                    </div>
                ` : ''}

                <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                <table>
                    <thead>
                        <tr>
                            <td style="font-weight:bold;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">الصنف</td>
                            <td style="font-weight:bold;text-align:center;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">الكمية</td>
                            <td style="font-weight:bold;text-align:left;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">المبلغ</td>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:15px"><span>الخصم</span><span>-${formatCurrency(order.discount)}</span></div>` : ''}
                ${order.delivery_fee ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#0891b2"><span>🚚 حساب الدليفري ${order.delivery_driver_name ? `(${order.delivery_driver_name})` : ''}</span><span>+${formatCurrency(order.delivery_fee)}</span></div>` : ''}
                <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:20px;margin-top:10px"><span>الإجمالي</span><span>${formatCurrency(order.total)}</span></div>
                <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                <div style="text-align:center;font-size:13px;margin-top:20px;font-weight:bold"><p style="margin:0">شكرا لطلبكم نتمنى ان ينال اعجابكم ❤️</p></div>
            </body></html>
        `);
        pw.document.close();
        pw.focus();
        setTimeout(() => pw.print(), 250);
    };

    const filtered = orders.filter(o => {
        if (!searchQ) return true;
        const q = searchQ.toLowerCase();
        return o.order_number.toString().includes(q) || o.customer_name?.toLowerCase().includes(q);
    });

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-extrabold text-white flex items-center gap-3"><ClipboardList className="w-7 h-7 text-emerald-400" /> إدارة الطلبات</h1>
                <button onClick={fetchOrders} className="p-2.5 bg-dark-700 text-zinc-400 hover:text-white rounded-xl border border-white/[0.04] transition"><RefreshCw className="w-4 h-4" /></button>
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="بحث برقم الطلب أو اسم العميل..."
                        className="w-full pr-10 pl-4 py-2.5 bg-dark-700 border border-white/[0.04] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/40" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 bg-dark-700 border border-white/[0.04] rounded-xl text-sm text-white cursor-pointer">
                    <option value="all">كل الحالات</option>
                    <option value="completed">مكتمل</option>
                    <option value="cancelled">ملغى</option>
                </select>
            </div>

            {loading ? <div className="text-center py-12 text-zinc-500 animate-pulse">جاري التحميل...</div> : filtered.length === 0 ? (
                <div className="text-center py-16 text-zinc-600"><ClipboardList className="w-16 h-16 mx-auto mb-3 opacity-30" /><p className="font-bold">لا توجد طلبات</p></div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(order => (
                        <div key={order.id} className="bg-dark-700 border border-white/[0.04] rounded-xl overflow-hidden">
                            <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition" onClick={() => setExpanded(expanded === order.id! ? null : order.id!)}>
                                <span className="text-lg font-extrabold text-white w-14 text-center">#{order.order_number}</span>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${statusColors[order.status] || ''}`}>{statusLabels[order.status] || order.status}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-zinc-300 truncate">{order.customer_name || 'عميل'}</p>
                                    <p className="text-[10px] text-zinc-500">{order.items.length} أصناف</p>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-zinc-500"><Clock className="w-3 h-3" /> {timeAgo(order.created_at)}</div>
                                <span className="text-sm font-extrabold text-emerald-400">{formatCurrency(order.total)}</span>
                                <button onClick={e => { e.stopPropagation(); printOrder(order); }} className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"><Printer className="w-4 h-4" /></button>
                                {expanded === order.id ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                            </div>
                            {expanded === order.id && (
                                <div className="border-t border-white/[0.04] p-4 space-y-3 animate-fade-in">
                                    <div className="bg-dark-900/50 rounded-xl p-3">
                                        {order.items.map((item, i) => (
                                            <div key={i} className="flex justify-between py-2 border-b border-white/[0.03] last:border-0 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-zinc-300 font-bold">{item.title} {item.size ? `(${item.size})` : ''} × {item.qty}</span>
                                                    {item.category && <span className="text-[10px] text-zinc-500 font-bold">{item.category}</span>}
                                                </div>
                                                <span className="text-zinc-400 font-bold">{formatCurrency(item.price * item.qty)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {order.status !== 'cancelled' && (
                                            <button onClick={() => updateStatus(order.id!, 'cancelled')}
                                                className="text-xs font-bold px-4 py-2.5 rounded-xl border transition hover:bg-red-500/10 text-red-400 border-red-500/30">
                                                إلغاء الطلب
                                            </button>
                                        )}
                                        <button onClick={() => printOrder(order)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 font-bold text-xs rounded-xl hover:bg-emerald-500/20 transition border border-emerald-500/20">
                                            <Printer className="w-4 h-4" /> طباعة الفاتورة
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
