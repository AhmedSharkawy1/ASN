import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db, getNextOrderNumber } from '../lib/db';
import type { Category, MenuItem, Customer, PosUser, Order } from '../lib/db';
import { formatCurrency, getReceiptStyles } from '../lib/helpers';
import { AppUser } from '../App';

/* ═══════════════════════════ TYPES ═══════════════════════════ */
type CartItem = {
    menuItem: MenuItem; qty: number; selectedSizeIdx: number;
    unitPrice: number; note?: string; categoryName?: string;
    weightUnit?: string;
};
type HeldOrder = {
    id?: number; items: { title: string; qty: number; price: number; size?: string; category?: string }[];
    subtotal: number; discount: number; total: number; customer_name?: string;
    notes?: string; created_at: string; payment_method: string;
};

type Props = { user: AppUser; restaurantName: string; restaurantPhone?: string; restaurantAddress?: string };

/* ── Color palette for product buttons ── */
const PRODUCT_COLORS = [
    '#90c890', '#f0a0a0', '#a0d0f0', '#f0c080', '#c0a0e0',
    '#f0b0c0', '#a0e0c0', '#e0d080', '#b0b0f0', '#f0a0d0',
    '#80d0d0', '#d0f0a0', '#f0c0c0', '#a0c0a0', '#e0b0a0',
    '#c0e0f0', '#f0d0a0', '#b0f0b0', '#d0a0f0', '#a0f0e0',
];

export default function POSPage({ user, restaurantName, restaurantPhone, restaurantAddress }: Props) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
    const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0 });
    const [drivers, setDrivers] = useState<PosUser[]>([]);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

    const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
    const [searchQ, setSearchQ] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
    const [discountValue, setDiscountValue] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [selectedDriver, setSelectedDriver] = useState<number | ''>('');
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [showHeld, setShowHeld] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
    const [lastOrderCart, setLastOrderCart] = useState<CartItem[]>([]);
    const [lastOrderDiscount, setLastOrderDiscount] = useState(0);
    const [lastOrderTotal, setLastOrderTotal] = useState(0);
    const [lastOrderCustomer, setLastOrderCustomer] = useState({ name: '', phone: '', address: '' });
    const [lastOrderNotes, setLastOrderNotes] = useState('');
    const [lastDeliveryFee, setLastDeliveryFee] = useState(0);
    const [lastDriverName, setLastDriverName] = useState('');
    const [successFlash, setSuccessFlash] = useState(false);
    const [sizePickerItem, setSizePickerItem] = useState<MenuItem | null>(null);
    const [orderType, setOrderType] = useState<'takeaway' | 'delivery' | 'pickup'>('takeaway');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const [orderNumber, setOrderNumber] = useState(0);

    const [weightPrompt, setWeightPrompt] = useState<{ item: MenuItem, sizeIdx: number, editingIndex?: number } | null>(null);
    const [weightInput, setWeightInput] = useState<string>('');

    const searchRef = useRef<HTMLInputElement>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);

    const playBeep = useCallback(() => {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 800; osc.type = 'sine'; gain.gain.value = 0.08;
            osc.start(); osc.stop(ctx.currentTime + 0.08);
        } catch { /* */ }
    }, []);

    const loadData = useCallback(async () => {
        const catsPromise = db.categories.orderBy('sort_order').toArray();
        const itemsPromise = db.menu_items.toArray().then(all => all.filter(i => i.is_available));
        const driversPromise = db.pos_users.where('role').equals('delivery').filter(u => !!u.is_active).toArray();
        const custsPromise = db.customers.toArray();
        const todayStr = new Date().toISOString().split('T')[0];
        const heldOrdersPromise = db.orders.where('status').equals('held').toArray();
        const todayOrdersPromise = db.orders.filter(o => o.created_at.startsWith(todayStr) && o.status !== 'cancelled' && o.status !== 'held').toArray();

        const [cats, items, driverList, custs, held, todayOrders] = await Promise.all([
            catsPromise, itemsPromise, driversPromise, custsPromise, heldOrdersPromise, todayOrdersPromise
        ]);

        setCategories(cats);
        setMenuItems(items);
        setDrivers(driverList);
        setTodayStats({ count: todayOrders.length, revenue: todayOrders.reduce((s, o) => s + o.total, 0) });
        setHeldOrders(held.map(o => ({ id: o.id, items: o.items, subtotal: o.subtotal, discount: o.discount, total: o.total, customer_name: o.customer_name, notes: undefined, created_at: o.created_at, payment_method: o.payment_method })));
        setAllCustomers(custs);
        setOrderNumber(todayOrders.length + 1);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setSearchQ(''); setSizePickerItem(null); setShowReceipt(false); setShowHeld(false); setShowCustomerSuggestions(false); setWeightPrompt(null); }
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); searchRef.current?.focus(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    /* ── Customer autocomplete ── */
    const [focusedField, setFocusedField] = useState<'name' | 'phone' | null>(null);
    const customerSuggestions = useMemo(() => {
        const val = focusedField === 'phone' ? customerPhone : customerName;
        if (!val || val.length < 1) return [];
        const q = val.toLowerCase().trim();
        return allCustomers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q)).slice(0, 5);
    }, [customerName, customerPhone, focusedField, allCustomers]);

    const selectCustomer = (c: Customer) => {
        setCustomerName(c.name || '');
        setCustomerPhone(c.phone || '');
        setCustomerAddress(c.address || '');
        setFocusedField(null);
        setShowCustomerSuggestions(false);
    };

    /* ── Filtering ── */
    const filteredItems = useMemo(() => menuItems.filter(item => {
        if (activeCategory !== 'all' && item.category_id !== activeCategory) return false;
        if (searchQ) { const q = searchQ.toLowerCase(); return item.title_ar.toLowerCase().includes(q) || item.title_en?.toLowerCase().includes(q); }
        return true;
    }), [menuItems, activeCategory, searchQ]);

    const getCatName = (catId: number) => categories.find(c => c.id === catId)?.name_ar || '';

    const displayUnit = (u: string) => {
        const unitMap: Record<string, string> = {
            'kg': 'كيلو', 'piece': 'وحدة', 'liter': 'لتر', 'pack': 'باكيت', 'gram': 'جرام', 'unit': 'وحدة', 'كيلو': 'كيلو', 'وحدة': 'وحدة', 'لتر': 'لتر', 'باكيت': 'باكيت', 'جرام': 'جرام', 'قطعة': 'قطعة', 'كجم': 'كيلو'
        };
        return unitMap[u.toLowerCase()] || u;
    };

    /* ── Cart ── */
    const addToCart = useCallback((item: MenuItem, sizeIdx: number = 0) => {
        if (item.sell_by_weight) {
            setWeightPrompt({ item, sizeIdx });
            setWeightInput('');
            return;
        }

        const price = item.prices[sizeIdx] || item.prices[0];
        const catName = categories.find(c => c.id === item.category_id)?.name_ar;
        setCart(prev => {
            const idx = prev.findIndex(c => c.menuItem.id === item.id && c.selectedSizeIdx === sizeIdx);
            if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { menuItem: item, qty: 1, selectedSizeIdx: sizeIdx, unitPrice: price, categoryName: catName }];
        });
        playBeep();
    }, [playBeep, categories]);

    const confirmWeight = () => {
        if (!weightPrompt) return;
        const weight = parseFloat(weightInput);
        if (isNaN(weight) || weight <= 0) {
            alert('الرجاء إدخال وزن صحيح');
            return;
        }
        const { item, sizeIdx, editingIndex } = weightPrompt;
        const price = item.prices[sizeIdx] || item.prices[0];
        const catName = categories.find(c => c.id === item.category_id)?.name_ar;
        const weightUnit = displayUnit(item.weight_unit || 'كيلو');

        if (editingIndex !== undefined) {
             setCart(prev => prev.map((c, i) => i === editingIndex ? { ...c, qty: weight, weightUnit } : c));
        } else {
             setCart(prev => {
                const idx = prev.findIndex(c => c.menuItem.id === item.id && c.selectedSizeIdx === sizeIdx);
                if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + weight, weightUnit } : c);
                return [...prev, { menuItem: item, qty: weight, selectedSizeIdx: sizeIdx, unitPrice: price, categoryName: catName, weightUnit }];
            });
            playBeep();
        }
        setWeightPrompt(null);
    };

    const updateQty = (index: number, delta: number) => { setCart(prev => prev.map((c, i) => { if (i !== index) return c; const nq = c.qty + delta; return nq > 0 ? { ...c, qty: nq } : c; }).filter(c => c.qty > 0)); };
    const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));
    const clearCart = () => { setCart([]); setDiscountValue(0); setCustomerName(''); setCustomerPhone(''); setCustomerAddress(''); setOrderNotes(''); setPaymentMethod('cash'); setSelectedDriver(''); setDeliveryFee(0); setOrderType('takeaway'); };

    const subtotal = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
    const discount = discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;
    const total = Math.max(0, subtotal - discount + deliveryFee);

    /* ── Submit ── */
    const submitOrder = useCallback(async (isHold = false) => {
        if (cart.length === 0 || submitting) return;
        setSubmitting(true);
        try {
            const orderNum = await getNextOrderNumber();
            const items = cart.map(c => ({
                title: c.menuItem.title_ar, qty: c.qty, price: c.unitPrice,
                size: c.menuItem.size_labels?.[c.selectedSizeIdx] || undefined,
                category: c.categoryName,
            }));
            const driverName = selectedDriver ? drivers.find(d => d.id === selectedDriver)?.name : undefined;
            const fullNotes = orderNotes;
            await db.orders.add({
                order_number: orderNum, items, subtotal, discount, total,
                payment_method: paymentMethod, customer_name: customerName || undefined,
                customer_phone: customerPhone || undefined,
                notes: fullNotes || undefined,
                delivery_driver_id: orderType === 'delivery' && selectedDriver ? selectedDriver : undefined,
                delivery_driver_name: orderType === 'delivery' ? driverName : undefined,
                delivery_fee: orderType === 'delivery' ? (deliveryFee || undefined) : undefined,
                cashier_id: user.id, cashier_name: user.name,
                status: isHold ? 'held' : 'completed', created_at: new Date().toISOString(),
                order_type: orderType
            } as Order & { order_type: string });

            if (customerName && customerPhone) {
                const existing = await db.customers.where('phone').equals(customerPhone).first();
                if (existing) {
                    if (customerAddress && existing.address !== customerAddress) {
                        await db.customers.update(existing.id!, { address: customerAddress, name: customerName });
                    }
                } else {
                    await db.customers.add({ name: customerName, phone: customerPhone, address: customerAddress || undefined, created_at: new Date().toISOString() });
                }
            }

            if (isHold) { loadData(); } else {
                setLastOrderNumber(orderNum);
                const capturedCart = [...cart];
                setLastOrderCart(capturedCart);
                setLastOrderDiscount(discount);
                setLastOrderTotal(total);
                setLastOrderCustomer({ name: customerName, phone: customerPhone, address: customerAddress });
                setLastOrderNotes(fullNotes || '');
                setLastDeliveryFee(orderType === 'delivery' ? deliveryFee : 0);
                setLastDriverName(orderType === 'delivery' ? (driverName || '') : '');

                printDirectReceipt(
                    orderNum, capturedCart, customerName, customerPhone, customerAddress,
                    fullNotes || '', orderType === 'delivery' ? deliveryFee : 0,
                    driverName || '', orderType as any, discount, total
                );

                setSuccessFlash(true);
                setTimeout(() => setSuccessFlash(false), 3000);
                setTodayStats(p => ({ count: p.count + 1, revenue: p.revenue + total }));
            }
            clearCart();
        } catch (e) { console.error(e); }
        finally { setSubmitting(false); }
    }, [cart, subtotal, discount, total, paymentMethod, orderType, customerName, customerPhone, selectedDriver, drivers, submitting, loadData]);

    const restoreHeldOrder = async (order: HeldOrder) => {
        const restored: CartItem[] = order.items.map(item => {
            const m = menuItems.find(mm => mm.title_ar === item.title);
            return { menuItem: m || { id: 0, title_ar: item.title, prices: [item.price], category_id: 0, is_available: true } as MenuItem, qty: item.qty, selectedSizeIdx: 0, unitPrice: item.price, categoryName: item.category };
        });
        setCart(restored); setCustomerName(order.customer_name || ''); setPaymentMethod(order.payment_method || 'cash');
        if (order.id) await db.orders.delete(order.id);
        setHeldOrders(prev => prev.filter(h => h.id !== order.id)); setShowHeld(false);
    };
    const deleteHeldOrder = async (id: number) => { await db.orders.delete(id); setHeldOrders(prev => prev.filter(h => h.id !== id)); };

    const handleItemClick = useCallback((item: MenuItem) => { item.prices.length > 1 ? setSizePickerItem(item) : addToCart(item, 0); }, [addToCart]);

    const printDirectReceipt = (
        orderNum: number, cartItems: CartItem[], cName: string, cPhone: string, cAddress: string,
        n: string, dFee: number, dName: string, oType: 'takeaway' | 'pickup' | 'delivery', disc: number, oTotal: number
    ) => {
        // 1. KITCHEN RECEIPT
        const kw = window.open('', '_blank', 'width=300,height=600');
        if (kw) {
            const orderTypeLabel = oType === 'pickup' ? 'استلام' : oType === 'delivery' ? 'دليفري' : 'طاولة';
            const itemsHtml = cartItems.map(c => {
                const title = c.menuItem.sell_by_weight ? `(x ${displayUnit(c.weightUnit || 'كيلو')}) ${c.menuItem.title_ar}` : c.menuItem.title_ar + (c.menuItem.size_labels && c.menuItem.size_labels.length > 1 ? ` (${c.menuItem.size_labels[c.selectedSizeIdx]})` : '');
                const qtyStr = c.menuItem.sell_by_weight ? `1x ` : `${c.qty}x `;
                return `<tr><td style="padding:2px 0;font-size:14px;border-bottom:1px dashed #ccc"><div style="font-weight:bold">${qtyStr}${title}</div>${c.categoryName ? `<div style="font-size:11px;color:#555">القسم: ${c.categoryName}</div>` : ''}${c.note ? `<div style="font-size:12px;margin-top:1px">📝 ${c.note}</div>` : ''}</td></tr>`;
            }).join('');
            kw.document.write(`<html><head><title>Kitchen Receipt</title><style>${getReceiptStyles()}</style></head><body>
                <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:5px">
                    <h2 style="margin:0;font-size:18px">المطبخ #${orderNum}</h2>
                    <p style="margin:2px 0 0 0;font-size:13px;font-weight:bold;display:inline-block;padding:1px 4px;border:1px solid #000;border-radius:3px">${orderTypeLabel}</p>
                    <p style="margin:2px 0 0 0;font-size:12px">${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                ${n ? `<div style="padding:3px;margin-bottom:5px;font-weight:bold;font-size:13px;border:1px solid #000">ملاحظات: ${n}</div>` : ''}
                <table style="margin-bottom:10px;"><tbody>${itemsHtml}</tbody></table>
            </body></html>`);
            kw.document.close(); kw.focus(); kw.print();
        }
        // 2. CUSTOMER RECEIPT
        const pw = window.open('', '_blank', 'width=300,height=600');
        if (pw) {
            const orderTypeLabel = oType === 'pickup' ? 'استلام من الفرع' : oType === 'delivery' ? 'دليفري' : 'من المطعم';
            const itemsHtml = cartItems.map(c => {
                const title = c.menuItem.sell_by_weight ? `(x ${displayUnit(c.weightUnit || 'كيلو')}) ${c.menuItem.title_ar}` : c.menuItem.title_ar + (c.menuItem.size_labels && c.menuItem.size_labels.length > 1 ? ` (${c.menuItem.size_labels[c.selectedSizeIdx]})` : '');
                const qtyStr = c.menuItem.sell_by_weight ? `1` : `${c.qty}`;
                return `<tr>
                    <td style="padding:4px 0;font-size:14px">${c.categoryName ? `<span style="font-size:12px;color:#0284c7;font-weight:bold">${c.categoryName}<br/></span>` : ''}${title}</td>
                    <td style="text-align:center;padding:4px 0;font-size:15px;font-weight:bold">${qtyStr}</td>
                    <td style="text-align:left;padding:4px 0;font-size:15px;font-weight:bold">${formatCurrency(c.unitPrice * c.qty)}</td>
                </tr>`;
            }).join('');
            pw.document.write(`<html><head><title>Receipt</title><style>${getReceiptStyles()}</style></head><body>
                <div style="text-align:center;margin-bottom:15px">
                    <p style="font-weight:bold;font-size:22px;margin:0 0 5px 0">${restaurantName || 'Restaurant'}</p>
                    ${restaurantPhone ? `<p style="font-size:13px;margin:0 0 5px 0;direction:ltr">📞 ${restaurantPhone}</p>` : ''}
                    ${restaurantAddress ? `<p style="font-size:14px;margin:0 0 5px 0">${restaurantAddress}</p>` : ''}
                    <p style="font-size:14px;margin:0 0 5px 0">${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p style="font-weight:bold;font-size:18px;margin:0 0 5px 0">فاتورة رقم #${orderNum}</p>
                    <p style="font-size:16px;font-weight:bold;margin:0;display:inline-block;border:1px solid #000;padding:2px 6px;border-radius:4px">${orderTypeLabel}</p>
                </div>
                ${(cName || cPhone) ? `<div style="border-top:1.5px dashed #000;margin:12px 0"></div><div style="font-size:14px">
                    ${cName ? `<p style="margin:2px 0">العميل: <strong>${cName}</strong></p>` : ''}
                    ${cPhone ? `<p style="margin:2px 0" dir="ltr">هاتف: <strong>${cPhone}</strong></p>` : ''}
                    ${cAddress ? `<p style="margin:2px 0">العنوان: <strong>${cAddress}</strong></p>` : ''}
                </div>` : ''}
                ${n ? `<div style="border-top:1.5px dashed #000;margin:12px 0"></div><div style="font-size:14px"><p style="margin:2px 0">ملاحظات: <strong>${n}</strong></p></div>` : ''}
                <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
                    <thead><tr>
                        <td style="font-weight:bold;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">الصنف</td>
                        <td style="font-weight:bold;text-align:center;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">الكمية</td>
                        <td style="font-weight:bold;text-align:left;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">المبلغ</td>
                    </tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                ${disc > 0 ? `<div style="display:flex;justify-content:space-between;font-size:15px"><span>الخصم</span><span>-${formatCurrency(disc)}</span></div>` : ''}
                ${dFee > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#0891b2"><span>🚚 حساب الدليفري (${dName})</span><span>+${formatCurrency(dFee)}</span></div>` : ''}
                <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:20px;margin-top:10px"><span>الإجمالي</span><span>${formatCurrency(oTotal)}</span></div>
                <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                <div style="text-align:center;font-size:13px;margin-top:20px;font-weight:bold"><p style="margin:0">شكرا لطلبكم نتمنى ان ينال اعجابكم ❤️</p></div>
            </body></html>`);
            pw.document.close(); pw.focus(); pw.print();
        }
    };

    const printReceipt = () => {
        if (!receiptRef.current) return;
        const pw = window.open('', '_blank', 'width=300,height=600');
        if (!pw) return;
        pw.document.write(`<html><head><title>Receipt</title><style>${getReceiptStyles()}</style></head><body>${receiptRef.current.innerHTML}</body></html>`);
        pw.document.close(); pw.focus(); pw.print();
    };

    const today = currentTime.toLocaleDateString('en-CA'); // YYYY-MM-DD format

    /* ═══════════════════════════ RENDER ═══════════════════════════ */
    return (
        <div style={{ display: 'flex', height: '100%', gap: 0, background: '#c0c8d0' }} dir="rtl">
            {/* RIGHT PANEL (Products & Categories) - 60% width roughly */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Category tabs */}
                <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', background: '#d8d8c8' }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id!)}
                            style={{
                                padding: '4px 10px', fontSize: 13, fontWeight: activeCategory === cat.id ? 'bold' : 'normal',
                                background: activeCategory === cat.id ? '#f0ece0' : '#d8d8c8',
                                border: '1px solid #999', borderBottom: activeCategory === cat.id ? 'none' : '1px solid #999',
                                cursor: 'pointer', color: '#333', marginBottom: -1, zIndex: activeCategory === cat.id ? 10 : 1,
                                flexShrink: 0, whiteSpace: 'nowrap'
                            }}>
                            {cat.name_ar}
                        </button>
                    ))}
                </div>

                {/* Product Grid Area */}
                <div style={{
                    flex: 1, overflow: 'auto', padding: 12,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gridAutoRows: 'minmax(80px, 1fr)',
                    gap: 12,
                    background: '#e0e4e4',
                    borderTop: '1px solid #999',
                }}>
                    {filteredItems.map((item, idx) => {
                        if (item.prices.length > 1) {
                            return item.prices.map((price, sIdx) => (
                                <button
                                    key={`${item.id}-${sIdx}`}
                                    className="product-btn"
                                    onClick={() => addToCart(item, sIdx)}
                                    style={{
                                        background: PRODUCT_COLORS[(idx + sIdx) % PRODUCT_COLORS.length],
                                        height: '100%',
                                    }}>
                                    <span className="product-btn-title">{item.title_ar}</span>
                                    {item.size_labels?.[sIdx] && (
                                        <span className="product-btn-size">
                                            {item.size_labels[sIdx]}
                                        </span>
                                    )}
                                </button>
                            ));
                        }
                        return (
                            <button
                                key={item.id}
                                className="product-btn"
                                onClick={() => handleItemClick(item)}
                                style={{
                                    background: PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
                                    height: '100%',
                                }}>
                                <span className="product-btn-title">{item.title_ar}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* LEFT PANEL (Order Area) - ~38% width */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '38%', minWidth: 400, flexShrink: 0, background: '#c0c8d0', borderRight: '2px solid #666' }}>

                {/* Search Bar at Top of Left Panel */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', background: '#d8d8c8', borderBottom: '1px solid #999', minHeight: 28 }}>
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>بحث برقم العميل</span>
                    <input ref={searchRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        style={{ width: 140, padding: '2px 6px', border: '1px solid #999', fontSize: 12, background: '#fff' }} />
                    <span style={{ fontSize: 12, color: '#666' }}>_ مروة طارق</span>
                    {searchQ && (
                        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #999', padding: '0 4px', fontSize: 12 }}>
                            <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>▼</button>
                        </div>
                    )}
                </div>

                {/* Left Panel Main Split: Cart Table vs Stacked Inputs */}
                <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

                    {/* CART AREA (Right inner visually, RTL Start) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#c0c8d0' }}>
                        {/* Cart Table */}
                        <div style={{ flex: 1, overflow: 'auto', background: '#949ca4', borderBottom: '2px solid #999' }}>
                            <table className="classic-table" style={{ fontSize: 11, width: '100%' }}>
                                <thead style={{ background: '#e0e4e0' }}>
                                    <tr>
                                        <th style={{ width: '40%', padding: '6px', textAlign: 'center', border: '1px solid #999', fontSize: 13 }}>الصنف</th>
                                        <th style={{ width: '20%', padding: '6px', textAlign: 'center', border: '1px solid #999', fontSize: 13 }}>السعر</th>
                                        <th style={{ width: '15%', padding: '6px', textAlign: 'center', border: '1px solid #999', fontSize: 13 }}>العدد</th>
                                        <th style={{ width: '25%', padding: '6px', textAlign: 'center', border: '1px solid #999', fontSize: 13 }}>الاجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((c, i) => (
                                        <tr key={`${c.menuItem.id}-${c.selectedSizeIdx}-${i}`}
                                            style={{ cursor: 'pointer', background: '#d0d8dc' }}
                                            onContextMenu={e => { e.preventDefault(); removeFromCart(i); }}>
                                            <td style={{ fontSize: 13, fontWeight: 'bold', border: '1px solid #999', padding: '4px 6px' }}>
                                                {c.menuItem.sell_by_weight ? `(x ${displayUnit(c.weightUnit || 'كيلو')}) ${c.menuItem.title_ar}` : c.menuItem.title_ar} {c.menuItem.size_labels && c.menuItem.size_labels.length > 1 && `(${c.menuItem.size_labels[c.selectedSizeIdx]})`}
                                            </td>
                                            <td style={{ textAlign: 'center', border: '1px solid #999', padding: '4px 6px', fontSize: 13 }}>{c.unitPrice}</td>
                                            <td style={{ textAlign: 'center', border: '1px solid #999', padding: '4px 6px' }}>
                                                {c.menuItem.sell_by_weight ? (
                                                    <button onClick={(e) => { e.stopPropagation(); setWeightPrompt({ item: c.menuItem, sizeIdx: c.selectedSizeIdx, editingIndex: i }); setWeightInput(c.qty.toString()); }}
                                                        style={{ padding: '4px 10px', fontSize: 13, fontWeight: 'bold', background: '#e0f0ff', border: '1px solid #90b0d0', borderRadius: 4, cursor: 'pointer' }}>
                                                        {c.qty} {displayUnit(c.weightUnit || 'كيلو')}
                                                    </button>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                        <button onClick={(e) => { e.stopPropagation(); updateQty(i, -1); }} style={{ width: 22, height: 22, fontSize: 14, padding: 0 }}>−</button>
                                                        <span style={{ fontWeight: 'bold', minWidth: 16, textAlign: 'center', fontSize: 14 }}>{c.qty}</span>
                                                        <button onClick={(e) => { e.stopPropagation(); updateQty(i, 1); }} style={{ width: 22, height: 22, fontSize: 14, padding: 0 }}>+</button>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid #999', padding: '4px 6px', fontSize: 14 }}>{formatCurrency(c.unitPrice * c.qty)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Cart Footer Controls: Address, Delivery, Tools */}
                            <div style={{ padding: '6px 8px', background: '#d0d8d8' }}>
                                {/* Address Row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 14, width: 45, fontWeight: 'bold' }}>العنوان</span>
                                    <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
                                        style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--box-border)', fontSize: 14, background: '#fffde0', borderRadius: 4 }} />
                                </div>

                                {/* Delivery Row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontSize: 14, width: 45, fontWeight: 'bold' }}>دليفري</span>
                                    <select value={orderType} onChange={e => setOrderType(e.target.value as any)}
                                        style={{ padding: '4px 6px', border: '1px solid var(--box-border)', fontSize: 13, background: '#e0ecec', cursor: 'pointer', width: 80, borderRadius: 4 }}>
                                        <option value="takeaway">المطعم</option>
                                        <option value="pickup">استلام</option>
                                        <option value="delivery">دليفري</option>
                                    </select>
                                    <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value ? Number(e.target.value) : '')}
                                        style={{ padding: '4px 6px', border: '1px solid var(--box-border)', fontSize: 13, background: '#e0ecec', cursor: 'pointer', flex: 1, borderRadius: 4 }}>
                                        <option value="">اختر السائق</option>
                                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <span style={{ fontSize: 14, fontWeight: 'bold' }}>القيمة</span>
                                    <input type="number" value={deliveryFee || ''} onChange={e => setDeliveryFee(Number(e.target.value))}
                                        style={{ width: 60, padding: '4px 6px', border: '1px solid var(--box-border)', fontSize: 14, background: '#fffde0', borderRadius: 4, fontWeight: 'bold' }} min="0" />
                                    <input type="checkbox" style={{ width: 16, height: 16 }} />
                                </div>

                                {/* Bottom Tool Row: History & Date */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6, flexWrap: 'nowrap', paddingTop: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>التاريخ</span>
                                    <input type="text" value={currentTime.toLocaleDateString('en-CA').replace(/-/g, '/')} readOnly
                                        style={{ width: 90, padding: '3px 6px', border: '1px solid var(--box-border)', fontSize: 13, background: '#fff', textAlign: 'center', borderRadius: 4, fontWeight: 'bold' }} />

                                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>فاتورة سابقة</span>
                                    <select onClick={() => setShowReceipt(true)}
                                        style={{ padding: '2px 6px', border: '1px solid var(--box-border)', fontSize: 13, background: '#fff', width: 60, cursor: 'pointer', borderRadius: 4, fontWeight: 'bold' }}>
                                        <option>{lastOrderNumber || '-'}</option>
                                    </select>

                                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>الفاتورة</span>
                                    <span style={{ border: '1px solid var(--box-border)', background: '#d0d8dc', padding: '3px 8px', fontSize: 14, minWidth: 40, textAlign: 'center', borderRadius: 4, fontWeight: 'bold' }}>
                                        {todayStats.count + 1}
                                    </span>

                                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>العدد</span>
                                    <input type="number" value={orderNumber} readOnly
                                        style={{ width: 45, padding: '3px', border: '1px solid var(--box-border)', fontSize: 14, background: '#fff', textAlign: 'center', borderRadius: 4, fontWeight: 'bold' }} />

                                    <button onClick={() => clearCart()} className="classic-btn"
                                        style={{ background: '#ffccdd', padding: '4px 12px', fontSize: 13, fontWeight: 'bold', borderRadius: 4 }}>
                                        فاتورة جديدة
                                    </button>

                                    <button onClick={() => {
                                        if (cart.length === 0) return;
                                        printDirectReceipt(
                                            todayStats.count + 1, cart, customerName, customerPhone, customerAddress,
                                            orderNotes || '', orderType === 'delivery' ? deliveryFee : 0,
                                            orderType === 'delivery' ? (drivers.find(d => d.id === selectedDriver)?.name || '') : '',
                                            orderType as any, discount, orderType === 'delivery' ? total : Math.max(0, subtotal - discount)
                                        );
                                    }} className="classic-btn"
                                        disabled={cart.length === 0}
                                        style={{ background: '#a0d8f0', padding: '4px 12px', fontSize: 13, fontWeight: 'bold', borderRadius: 4, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', opacity: cart.length === 0 ? 0.5 : 1 }}>
                                        🖨️ طباعة
                                    </button>

                                    {heldOrders.length > 0 && (
                                        <button onClick={() => setShowHeld(true)} className="classic-btn"
                                            style={{ background: '#f0e0a0', padding: '4px 8px', fontSize: 12, fontWeight: 'bold', borderRadius: 4 }}>
                                            معلقة
                                        </button>
                                    )}
                                </div>
                        </div>
                    </div>

                    {/* VERTICAL STACK AREA (Left inner visually, RTL End) */}
                    <div style={{ width: 120, display: 'flex', flexDirection: 'column', borderRight: '2px solid #a0a090', padding: '6px 8px', background: '#d0e0e0' }}>

                        {/* NO Stack */}
                        <div style={{ textAlign: 'center', marginBottom: 10 }}>
                            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4, color: '#222' }}>NO</div>
                            <div style={{ background: '#b0c8d8', border: '2px solid var(--box-border)', padding: '10px 0', fontSize: 24, fontWeight: 'bold', color: '#333', borderRadius: 4 }}>
                                {lastOrderNumber || todayStats.count + 1}
                            </div>
                        </div>

                        {/* Customer Info Stack */}
                        <div style={{ textAlign: 'center', marginBottom: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4, color: '#222' }}>العميل</div>
                            <div style={{ position: 'relative' }}>
                                <input value={customerName}
                                    onChange={e => { setCustomerName(e.target.value); setShowCustomerSuggestions(true); setFocusedField('name'); }}
                                    onFocus={() => { setShowCustomerSuggestions(true); setFocusedField('name'); }}
                                    onBlur={() => setTimeout(() => { setShowCustomerSuggestions(false); setFocusedField(null); }, 300)}
                                    style={{ width: '100%', padding: '6px 8px', border: '2px solid var(--box-border)', fontSize: 14, background: '#fffde0', textAlign: 'center', borderRadius: 4 }}
                                />
                                {showCustomerSuggestions && focusedField === 'name' && customerSuggestions.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: -50, width: 200, background: '#fff', border: '1px solid var(--box-border)', zIndex: 50, boxShadow: '2px 2px 6px rgba(0,0,0,0.2)' }}>
                                        {customerSuggestions.map((c, i) => (
                                            <button key={i} onClick={() => selectCustomer(c)}
                                                style={{ width: '100%', textAlign: 'right', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', background: 'transparent', border: 'none', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: 13 }}>
                                                <span style={{ fontWeight: 'bold' }}>{c.name}</span>
                                                <span style={{ color: '#666' }} dir="ltr">{c.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Phone Stack */}
                        <div style={{ textAlign: 'center', marginBottom: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4, color: '#222' }}>موبايل</div>
                            <input value={customerPhone}
                                onChange={e => { setCustomerPhone(e.target.value); setShowCustomerSuggestions(true); setFocusedField('phone'); }}
                                onFocus={() => { setShowCustomerSuggestions(true); setFocusedField('phone'); }}
                                onBlur={() => setTimeout(() => { setShowCustomerSuggestions(false); setFocusedField(null); }, 300)}
                                dir="ltr"
                                style={{ width: '100%', padding: '6px 8px', border: '2px solid var(--box-border)', fontSize: 14, background: '#fffde0', textAlign: 'center', borderRadius: 4 }}
                            />
                        </div>

                        {/* Total Stack */}
                        <div style={{ textAlign: 'center', marginBottom: 12, marginTop: 'auto' }}>
                            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#222' }}>اجمالي الفاتورة</div>
                            <div style={{ background: '#fffde0', border: '2px solid var(--box-border)', padding: '8px 0', fontSize: 22, fontWeight: 'bold', color: '#111', borderRadius: 4 }}>
                                {formatCurrency(orderType === 'delivery' ? total : Math.max(0, subtotal - discount))}
                            </div>
                        </div>

                        {/* Print Button */}
                        <button
                            onClick={() => submitOrder(false)}
                            disabled={cart.length === 0 || submitting}
                            style={{
                                background: '#90ee90', border: '1px solid #666', padding: '10px 0', fontSize: 14, fontWeight: 'bold',
                                color: '#111', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', opacity: cart.length === 0 ? 0.6 : 1,
                                width: '100%'
                            }}>
                            {submitting ? '...' : 'طباعة'}
                        </button>

                    </div>

                </div>
            </div>

            {/* SIZE PICKER MODAL */}
            {
                sizePickerItem && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setSizePickerItem(null)}>
                        <div style={{ background: '#f0ece0', border: '2px solid #999', width: 300, boxShadow: '4px 4px 12px rgba(0,0,0,0.3)' }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ background: 'linear-gradient(90deg, #405880, #506890)', padding: '6px 12px', color: '#fff', fontSize: 13, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                                <span>اختر الحجم</span>
                                <button onClick={() => setSizePickerItem(null)} style={{ color: '#fff', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>×</button>
                            </div>
                            <div style={{ padding: 16 }}>
                                <p style={{ marginBottom: 12, fontWeight: 'bold', fontSize: 14 }}>{sizePickerItem.title_ar}</p>
                                {sizePickerItem.prices.map((price, idx) => (
                                    <button key={idx} onClick={() => { addToCart(sizePickerItem, idx); setSizePickerItem(null); }}
                                        className="classic-btn" style={{
                                            width: '100%', marginBottom: 6, display: 'flex', justifyContent: 'space-between',
                                            padding: '8px 12px', fontSize: 14,
                                        }}>
                                        <span>{sizePickerItem.size_labels?.[idx] || `حجم ${idx + 1}`}</span>
                                        <span style={{ fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(price)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* SUCCESS FLASH */}
            {
                successFlash && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <div style={{
                            background: '#d4edda', border: '3px solid #28a745', padding: '24px 40px',
                            boxShadow: '4px 4px 16px rgba(0,0,0,0.3)', textAlign: 'center',
                        }}>
                            <p style={{ fontSize: 24, fontWeight: 'bold', color: '#155724', marginBottom: 8 }}>✓ تم إرسال الطلب!</p>
                            {lastOrderNumber && <p style={{ fontSize: 16, color: '#333' }}>#{lastOrderNumber}</p>}
                        </div>
                    </div>
                )
            }

            {/* HELD ORDERS PANEL */}
            {
                showHeld && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
                        <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowHeld(false)} />
                        <div style={{ width: 360, background: '#f0ece0', borderRight: '2px solid #999', display: 'flex', flexDirection: 'column', boxShadow: '-2px 0 8px rgba(0,0,0,0.2)' }}>
                            <div style={{ background: 'linear-gradient(90deg, #405880, #506890)', padding: '8px 12px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>طلبات معلقة ({heldOrders.length})</span>
                                <button onClick={() => setShowHeld(false)} style={{ color: '#fff', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
                            </div>
                            <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                                {heldOrders.length === 0 ? (
                                    <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>لا توجد طلبات معلقة</p>
                                ) : heldOrders.map(o => (
                                    <div key={o.id} style={{ background: '#fff', border: '1px solid #ccc', padding: 10, marginBottom: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontWeight: 'bold', fontSize: 13 }}>{o.customer_name || 'بدون اسم'}</span>
                                            <span style={{ fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(o.total)}</span>
                                        </div>
                                        <div style={{ marginBottom: 6 }}>
                                            {o.items.slice(0, 3).map((item, idx) => (
                                                <p key={idx} style={{ fontSize: 11, color: '#666' }}>• {item.title} × {item.qty}</p>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => restoreHeldOrder(o)} className="classic-btn-green" style={{ flex: 1, fontSize: 11, padding: '3px 8px' }}>استعادة</button>
                                            <button onClick={() => deleteHeldOrder(o.id!)} className="classic-btn-red" style={{ fontSize: 11, padding: '3px 8px' }}>حذف</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* RECEIPT MODAL */}
            {
                showReceipt && lastOrderNumber && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowReceipt(false)}>
                        <div style={{ background: '#fff', width: 320, maxHeight: '80vh', overflow: 'auto', border: '2px solid #999', boxShadow: '4px 4px 16px rgba(0,0,0,0.3)' }}
                            onClick={e => e.stopPropagation()}>
                            <div ref={receiptRef} style={{ padding: 16, fontSize: 14, color: '#000', fontFamily: "'Courier New', monospace" }} dir="rtl">
                                <div style={{ textAlign: 'center', marginBottom: 15 }}>
                                    <p style={{ fontWeight: 'bold', fontSize: 22, margin: '0 0 5px 0' }}>{restaurantName || 'Restaurant'}</p>
                                    {restaurantPhone && <p style={{ fontSize: 13, margin: '0 0 5px 0', direction: 'ltr' }}>📞 {restaurantPhone}</p>}
                                    {restaurantAddress && <p style={{ fontSize: 14, margin: '0 0 5px 0' }}>{restaurantAddress}</p>}
                                    <p style={{ fontSize: 14, margin: '0 0 5px 0' }}>{new Date().toLocaleDateString('ar-EG')} - {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                                    <p style={{ fontWeight: 'bold', fontSize: 18, margin: '0 0 5px 0' }}>فاتورة رقم #{lastOrderNumber}</p>
                                </div>
                                {(lastOrderCustomer.name || lastOrderCustomer.phone) && (
                                    <>
                                        <div style={{ borderTop: '1.5px dashed #000', margin: '12px 0' }} />
                                        <div style={{ fontSize: 14 }}>
                                            {lastOrderCustomer.name && <p style={{ margin: '2px 0' }}>العميل: <strong>{lastOrderCustomer.name}</strong></p>}
                                            {lastOrderCustomer.phone && <p style={{ margin: '2px 0' }} dir="ltr">هاتف: <strong>{lastOrderCustomer.phone}</strong></p>}
                                            {lastOrderCustomer.address && <p style={{ margin: '2px 0' }}>العنوان: <strong>{lastOrderCustomer.address}</strong></p>}
                                        </div>
                                    </>
                                )}
                                <div style={{ borderTop: '1.5px dashed #000', margin: '12px 0' }} />
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
                                    <thead><tr>
                                        <td style={{ fontWeight: 'bold', paddingBottom: 8, borderBottom: '1.5px dashed #000', fontSize: 15 }}>الصنف</td>
                                        <td style={{ fontWeight: 'bold', textAlign: 'center', paddingBottom: 8, borderBottom: '1.5px dashed #000', fontSize: 15 }}>الكمية</td>
                                        <td style={{ fontWeight: 'bold', textAlign: 'left', paddingBottom: 8, borderBottom: '1.5px dashed #000', fontSize: 15 }}>المبلغ</td>
                                    </tr></thead>
                                    <tbody>
                                        {lastOrderCart.map((c, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: '4px 0', fontSize: 14 }}>
                                                    {c.menuItem.sell_by_weight ? `(x ${displayUnit(c.weightUnit || 'كيلو')}) ${c.menuItem.title_ar}` : c.menuItem.title_ar}
                                                    {c.menuItem.size_labels && c.menuItem.size_labels.length > 1 ? ` (${c.menuItem.size_labels[c.selectedSizeIdx]})` : ''}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '4px 0', fontSize: 15, fontWeight: 'bold' }}>
                                                    {c.menuItem.sell_by_weight ? 1 : c.qty}
                                                </td>
                                                <td style={{ textAlign: 'left', padding: '4px 0', fontSize: 15, fontWeight: 'bold' }}>{formatCurrency(c.unitPrice * c.qty)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ borderTop: '1.5px dashed #000', margin: '12px 0' }} />
                                {lastOrderDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span>الخصم</span><span>-{formatCurrency(lastOrderDiscount)}</span></div>}
                                {lastDeliveryFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#0891b2' }}><span>🚚 حساب الدليفري ({lastDriverName})</span><span>+{formatCurrency(lastDeliveryFee)}</span></div>}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 20, marginTop: 10 }}><span>الإجمالي</span><span>{formatCurrency(lastOrderTotal)}</span></div>
                                <div style={{ borderTop: '1.5px dashed #000', margin: '12px 0' }} />
                                <div style={{ textAlign: 'center', fontSize: 13, marginTop: 20, fontWeight: 'bold' }}><p style={{ margin: 0 }}>شكرا لطلبكم نتمنى ان ينال اعجابكم ❤️</p></div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, padding: 8, borderTop: '1px solid #ccc' }}>
                                <button onClick={() => setShowReceipt(false)} className="classic-btn" style={{ flex: 1 }}>إغلاق</button>
                                <button onClick={printReceipt} className="classic-btn-green" style={{ flex: 1 }}>طباعة</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* WEIGHT PICKER MODAL */}
            {
                weightPrompt && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setWeightPrompt(null)}>
                        <div style={{ background: '#f0ece0', border: '2px solid #999', width: 280, boxShadow: '4px 4px 12px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ background: 'linear-gradient(90deg, #405880, #506890)', padding: '6px 12px', color: '#fff', fontSize: 13, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                                <span>⚖️ الوزن المطلوب</span>
                                <button onClick={() => setWeightPrompt(null)} style={{ color: '#fff', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>×</button>
                            </div>
                            <div style={{ padding: 16 }}>
                                <p style={{ marginBottom: 16, fontWeight: 'bold', fontSize: 15, textAlign: 'center', color: '#0284c7' }}>{weightPrompt.item.title_ar}</p>
                                
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
                                    <input 
                                        type="number" 
                                        autoFocus
                                        value={weightInput} 
                                        onChange={e => setWeightInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && confirmWeight()}
                                        placeholder="0.00" 
                                        min="0" 
                                        step="0.01"
                                        style={{ width: '100%', textAlign: 'center', fontSize: 24, fontWeight: 'bold', padding: '8px 40px', border: '2px solid #a0c0e0', borderRadius: 4, background: '#fff' }}
                                    />
                                    <span style={{ position: 'absolute', left: 12, fontSize: 16, fontWeight: 'bold', color: '#666' }}>{displayUnit(weightPrompt.item.weight_unit || 'كيلو')}</span>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, justifyContent: 'center' }}>
                                    {[0.25, 0.5, 1, 1.5, 2, 5].map(w => (
                                        <button key={w} onClick={() => setWeightInput(w.toString())} 
                                            style={{ width: '30%', padding: '6px 0', fontSize: 14, fontWeight: 'bold', background: '#fff', border: '1px solid #999', cursor: 'pointer', borderRadius: 4 }}>
                                            {w}
                                        </button>
                                    ))}
                                </div>

                                <button onClick={confirmWeight} className="classic-btn-green" style={{ width: '100%', padding: '10px 0', fontSize: 16, fontWeight: 'bold' }}>
                                    تأكيد وإضافة
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
