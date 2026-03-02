"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { submitOrder, buildWhatsAppMessage, OrderItem, OrderItemExtra } from "@/lib/helpers/submitOrder";
import { FaWhatsapp } from "react-icons/fa";
import { X, Truck, Store, MapPin, Clock, CheckCircle, Loader2, Printer, Plus, Minus } from "lucide-react";

type DeliveryZone = {
    id: string;
    name_ar: string;
    name_en?: string;
    fee: number;
    min_order: number;
    estimated_time: number;
    is_active: boolean;
};

type Addon = {
    id: string;
    name_ar: string;
    name_en?: string;
    price: number;
    type: 'savory' | 'sweet';
};

type CheckoutCartItem = OrderItem & {
    categoryType?: 'savory' | 'sweet';
};

type CheckoutModalProps = {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CheckoutCartItem[];
    subtotal: number;
    restaurantId: string;
    restaurantName: string;
    whatsappNumber?: string;
    currency?: string;
    language: string;
    onOrderSuccess?: () => void;
};

export default function CheckoutModal({
    isOpen, onClose, cartItems, subtotal,
    restaurantId, restaurantName, whatsappNumber,
    currency = "ج.م", language, onOrderSuccess
}: CheckoutModalProps) {
    const isAr = language === "ar";
    const printRef = useRef<HTMLDivElement>(null);

    // Steps: 1=extras, 2=customer info, 3=order type, 4=summary, 5=success
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [orderNumber, setOrderNumber] = useState<number | null>(null);

    // Extras state: { [itemIndex]: { [addonId]: qty } }
    const [itemExtras, setItemExtras] = useState<Record<number, Record<string, number>>>({});
    const [addons, setAddons] = useState<Addon[]>([]);

    // Customer info
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");

    // Order type
    const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('pickup');
    const [address, setAddress] = useState("");
    const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
    const [zones, setZones] = useState<DeliveryZone[]>([]);

    // Fetch addons
    useEffect(() => {
        if (!isOpen || !restaurantId) return;
        (async () => {
            const { data } = await supabase
                .from('addons')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('is_active', true)
                .order('sort_order');
            setAddons((data as Addon[]) || []);
        })();
    }, [isOpen, restaurantId]);

    // Fetch delivery zones
    useEffect(() => {
        if (!isOpen || !restaurantId) return;
        (async () => {
            const { data } = await supabase
                .from('delivery_zones')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('is_active', true)
                .order('name_ar');
            setZones((data as DeliveryZone[]) || []);
        })();
    }, [isOpen, restaurantId]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setLoading(false);
            setOrderNumber(null);
            setItemExtras({});
        }
    }, [isOpen]);

    // Determine if we should show extras step (only if there are addons)
    const hasAddons = addons.length > 0;

    const getAddonsForItem = (item: CheckoutCartItem): Addon[] => {
        if (!item.categoryType) return addons; // show all if no type specified
        return addons.filter(a => a.type === item.categoryType);
    };

    const updateExtraQty = (itemIdx: number, addonId: string, delta: number) => {
        setItemExtras(prev => {
            const copy = { ...prev };
            if (!copy[itemIdx]) copy[itemIdx] = {};
            const current = copy[itemIdx][addonId] || 0;
            const next = Math.max(0, current + delta);
            if (next === 0) {
                delete copy[itemIdx][addonId];
            } else {
                copy[itemIdx][addonId] = next;
            }
            return copy;
        });
    };

    // Build final items with extras
    const getFinalItems = (): OrderItem[] => {
        return cartItems.map((item, idx) => {
            const extras: OrderItemExtra[] = [];
            const itemAddonMap = itemExtras[idx] || {};
            Object.entries(itemAddonMap).forEach(([addonId, qty]) => {
                if (qty > 0) {
                    const addon = addons.find(a => a.id === addonId);
                    if (addon) {
                        extras.push({
                            name: isAr ? addon.name_ar : (addon.name_en || addon.name_ar),
                            qty,
                            price: addon.price,
                        });
                    }
                }
            });
            return { ...item, extras };
        });
    };

    // Calculate totals
    const getExtrasTotal = (): number => {
        let t = 0;
        cartItems.forEach((item, idx) => {
            const itemAddonMap = itemExtras[idx] || {};
            Object.entries(itemAddonMap).forEach(([addonId, qty]) => {
                const addon = addons.find(a => a.id === addonId);
                if (addon && qty > 0) {
                    t += addon.price * qty * item.qty;
                }
            });
        });
        return t;
    };

    const extrasTotal = getExtrasTotal();
    const deliveryFee = orderType === 'delivery' && selectedZone ? selectedZone.fee : 0;
    const total = subtotal + extrasTotal + deliveryFee;

    const canProceedStep2 = name.trim().length > 0 && phone.trim().length >= 8;
    const canProceedStep3 = orderType === 'pickup' || (orderType === 'delivery' && selectedZone && address.trim().length > 0);

    const handleSubmit = async () => {
        setLoading(true);
        const finalItems = getFinalItems();
        const result = await submitOrder({
            restaurantId,
            restaurantName,
            customerName: name.trim(),
            customerPhone: phone.trim(),
            customerAddress: orderType === 'delivery' ? address.trim() : undefined,
            notes: notes.trim() || undefined,
            orderType,
            deliveryZoneId: selectedZone?.id,
            deliveryZoneName: selectedZone ? (isAr ? selectedZone.name_ar : (selectedZone.name_en || selectedZone.name_ar)) : undefined,
            deliveryFee,
            items: finalItems,
            subtotal: subtotal + extrasTotal,
            total,
        });

        setLoading(false);
        if (result.success) {
            setOrderNumber(result.orderNumber || 0);
            setStep(5);
            onOrderSuccess?.();

            // Auto send WhatsApp
            if (whatsappNumber) {
                const msg = buildWhatsAppMessage({
                    orderNumber: result.orderNumber || 0,
                    restaurantName,
                    customerName: name,
                    customerPhone: phone,
                    customerAddress: orderType === 'delivery' ? address : undefined,
                    orderType,
                    deliveryZoneName: selectedZone ? (isAr ? selectedZone.name_ar : (selectedZone.name_en || selectedZone.name_ar)) : undefined,
                    deliveryFee,
                    items: finalItems,
                    subtotal: subtotal + extrasTotal,
                    total,
                    notes: notes || undefined,
                    currency: currency.replace('.', ''),
                    language,
                });
                // Use window.location.href to avoid mobile popup blockers after async await
                window.location.href = `https://wa.me/${whatsappNumber.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(msg)}`;
            }
        } else {
            alert(result.error || (isAr ? "حدث خطأ" : "Something went wrong"));
        }
    };

    const sendWhatsApp = () => {
        if (!whatsappNumber) return;
        const finalItems = getFinalItems();
        const msg = buildWhatsAppMessage({
            orderNumber: orderNumber || 0,
            restaurantName,
            customerName: name,
            customerPhone: phone,
            customerAddress: orderType === 'delivery' ? address : undefined,
            orderType,
            deliveryZoneName: selectedZone ? (isAr ? selectedZone.name_ar : (selectedZone.name_en || selectedZone.name_ar)) : undefined,
            deliveryFee,
            items: finalItems,
            subtotal: subtotal + extrasTotal,
            total,
            notes: notes || undefined,
            currency: currency.replace('.', ''),
            language,
        });
        window.open(`https://wa.me/${whatsappNumber.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) return;
        const finalItems = getFinalItems();

        const itemsHtml = finalItems.map((item, idx) => {
            const extrasHtml = (item.extras || []).map(e =>
                `<div style="padding-right:16px;color:#666;font-size:11px;">🔹 ${e.name} ×${e.qty} = ${e.price * e.qty} ${currency}</div>`
            ).join('');
            const itemExtrasTotal = (item.extras || []).reduce((s, e) => s + e.price * e.qty, 0);
            const itemTotal = (item.price * item.qty) + (itemExtrasTotal * item.qty);
            return `
                <div style="border-bottom:1px dashed #ddd;padding:8px 0;">
                    <div style="display:flex;justify-content:space-between;font-weight:bold;">
                        <span>${idx + 1}. ${item.title}</span>
                        <span>${itemTotal} ${currency}</span>
                    </div>
                    ${item.category ? `<div style="color:#888;font-size:11px;">📂 ${item.category}</div>` : ''}
                    ${item.size && item.size !== 'عادي' ? `<div style="color:#888;font-size:11px;">📏 ${item.size}</div>` : ''}
                    <div style="color:#888;font-size:11px;">💵 ${item.price} × ${item.qty}</div>
                    ${extrasHtml}
                </div>`;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="${isAr ? 'rtl' : 'ltr'}">
            <head>
                <meta charset="utf-8">
                <title>${isAr ? 'فاتورة' : 'Invoice'} #${orderNumber}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; max-width: 380px; margin: 0 auto; color: #222; }
                    .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 12px; }
                    .header h1 { font-size: 18px; margin-bottom: 4px; }
                    .header .order-num { font-size: 24px; font-weight: 900; color: #16a34a; }
                    .info { margin-bottom: 12px; }
                    .info div { font-size: 13px; margin: 3px 0; }
                    .items { margin-bottom: 12px; }
                    .totals { border-top: 2px solid #222; padding-top: 8px; }
                    .totals div { display: flex; justify-content: space-between; font-size: 13px; margin: 3px 0; }
                    .totals .grand { font-size: 18px; font-weight: 900; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd; }
                    .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #888; border-top: 1px dashed #ddd; padding-top: 12px; }
                    @media print { body { padding: 10px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🧾 ${restaurantName}</h1>
                    <div class="order-num">#${orderNumber}</div>
                    <div style="font-size:11px;color:#888;">${new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US')}</div>
                </div>
                <div class="info">
                    <div>👤 <strong>${isAr ? 'الاسم:' : 'Name:'}</strong> ${name}</div>
                    <div>📞 <strong>${isAr ? 'الموبايل:' : 'Phone:'}</strong> ${phone}</div>
                    ${orderType === 'delivery' && address ? `<div>📍 <strong>${isAr ? 'العنوان:' : 'Address:'}</strong> ${address}</div>` : ''}
                    <div>${orderType === 'delivery' ? `🚚 ${isAr ? 'دليفري' : 'Delivery'}${selectedZone ? ` — ${isAr ? selectedZone.name_ar : selectedZone.name_en}` : ''}` : `🏪 ${isAr ? 'استلام من المطعم' : 'Pickup'}`}</div>
                </div>
                <div class="items">${itemsHtml}</div>
                <div class="totals">
                    <div><span>${isAr ? 'مجموع الأصناف' : 'Subtotal'}</span><span>${subtotal + extrasTotal} ${currency}</span></div>
                    ${deliveryFee > 0 ? `<div><span>${isAr ? 'رسوم التوصيل' : 'Delivery'}</span><span>${deliveryFee} ${currency}</span></div>` : ''}
                    <div class="grand"><span>${isAr ? 'الإجمالي' : 'Total'}</span><span>${total} ${currency}</span></div>
                </div>
                ${notes ? `<div style="margin-top:8px;font-size:12px;color:#666;">📝 ${notes}</div>` : ''}
                <div class="footer">
                    ${isAr ? 'شكراً لاختياركم' : 'Thank you for choosing'} ${restaurantName} ❤️
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 300);
    };

    if (!isOpen) return null;

    const stepLabels = hasAddons
        ? { 1: isAr ? "الإضافات" : "Extras", 2: isAr ? "بيانات العميل" : "Customer Info", 3: isAr ? "نوع الطلب" : "Order Type", 4: isAr ? "تأكيد الطلب" : "Confirm Order", 5: isAr ? "تم الطلب! 🎉" : "Order Placed! 🎉" }
        : { 1: isAr ? "بيانات العميل" : "Customer Info", 2: isAr ? "نوع الطلب" : "Order Type", 3: isAr ? "تأكيد الطلب" : "Confirm Order", 4: isAr ? "تم الطلب! 🎉" : "Order Placed! 🎉" };

    // When no addons, remap steps: 1->customer, 2->type, 3->summary, 4->success
    const effectiveStep = hasAddons ? step : step + 1;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" dir={isAr ? "rtl" : "ltr"}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={effectiveStep < 5 ? onClose : undefined} />

            {/* Modal */}
            <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-[slideUp_0.3s_ease-out]">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-t-2xl">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {stepLabels[step as keyof typeof stepLabels]}
                    </h3>
                    {effectiveStep < 5 && (
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                            <X className="w-5 h-5 text-zinc-500" />
                        </button>
                    )}
                </div>

                <div className="p-5 space-y-4">
                    {/* ════════ STEP: EXTRAS ════════ */}
                    {effectiveStep === 1 && hasAddons && (
                        <>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {isAr ? "اختر الإضافات لكل صنف (اختياري)" : "Choose extras for each item (optional)"}
                            </p>
                            <div className="space-y-5 max-h-[55vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                {cartItems.map((item, idx) => {
                                    const relevantAddons = getAddonsForItem(item);
                                    if (relevantAddons.length === 0) return null;
                                    return (
                                        <div key={idx} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm text-zinc-900 dark:text-white">{item.title}</span>
                                                <span className="text-xs text-zinc-400">{item.category || ''}</span>
                                            </div>
                                            <div className="space-y-2">
                                                {relevantAddons.map(addon => {
                                                    const qty = itemExtras[idx]?.[addon.id] || 0;
                                                    return (
                                                        <div key={addon.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700">
                                                            <div>
                                                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                                    {isAr ? addon.name_ar : (addon.name_en || addon.name_ar)}
                                                                </span>
                                                                <span className="text-xs text-emerald-600 ms-2 font-bold">{addon.price} {currency}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => updateExtraQty(idx, addon.id, -1)}
                                                                    className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 active:scale-90 transition"
                                                                >
                                                                    <Minus className="w-3.5 h-3.5" />
                                                                </button>
                                                                <span className="text-sm font-bold tabular-nums w-5 text-center">{qty}</span>
                                                                <button
                                                                    onClick={() => updateExtraQty(idx, addon.id, 1)}
                                                                    className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-90 transition"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {extrasTotal > 0 && (
                                <div className="flex justify-between text-sm font-bold bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                                    <span className="text-emerald-700 dark:text-emerald-300">{isAr ? "إجمالي الإضافات" : "Extras Total"}</span>
                                    <span className="text-emerald-600">{extrasTotal} {currency}</span>
                                </div>
                            )}
                            <button
                                onClick={() => setStep(hasAddons ? 2 : 1)}
                                className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition text-sm"
                            >
                                {isAr ? "التالي ←" : "Next →"}
                            </button>
                        </>
                    )}

                    {/* ════════ STEP: CUSTOMER INFO ════════ */}
                    {effectiveStep === 2 && (
                        <>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                                    {isAr ? "الاسم" : "Name"} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    value={name} onChange={e => setName(e.target.value)}
                                    placeholder={isAr ? "أدخل اسمك" : "Enter your name"}
                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-emerald-500 transition text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                                    {isAr ? "رقم الهاتف" : "Phone"} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    value={phone} onChange={e => setPhone(e.target.value)}
                                    placeholder={isAr ? "01xxxxxxxxx" : "01xxxxxxxxx"}
                                    dir="ltr"
                                    type="tel"
                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-emerald-500 transition text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                                    {isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
                                </label>
                                <textarea
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder={isAr ? "أي تعليمات خاصة..." : "Any special instructions..."}
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-emerald-500 transition text-sm resize-none"
                                />
                            </div>
                            <div className="flex gap-2">
                                {hasAddons && (
                                    <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm">
                                        {isAr ? "← رجوع" : "← Back"}
                                    </button>
                                )}
                                <button
                                    disabled={!canProceedStep2}
                                    onClick={() => setStep(hasAddons ? 3 : 2)}
                                    className={`${hasAddons ? 'flex-1' : 'w-full'} py-3.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm`}
                                >
                                    {isAr ? "التالي ←" : "Next →"}
                                </button>
                            </div>
                        </>
                    )}

                    {/* ════════ STEP: ORDER TYPE ════════ */}
                    {effectiveStep === 3 && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setOrderType('delivery')}
                                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${orderType === 'delivery'
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
                                >
                                    <Truck className={`w-8 h-8 ${orderType === 'delivery' ? 'text-emerald-500' : 'text-zinc-400'}`} />
                                    <span className={`font-bold text-sm ${orderType === 'delivery' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                        {isAr ? "دليفري" : "Delivery"}
                                    </span>
                                </button>
                                <button
                                    onClick={() => { setOrderType('pickup'); setSelectedZone(null); }}
                                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${orderType === 'pickup'
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
                                >
                                    <Store className={`w-8 h-8 ${orderType === 'pickup' ? 'text-emerald-500' : 'text-zinc-400'}`} />
                                    <span className={`font-bold text-sm ${orderType === 'pickup' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                        {isAr ? "استلام من المطعم" : "Pickup"}
                                    </span>
                                </button>
                            </div>

                            {/* Delivery Zone Selection */}
                            {orderType === 'delivery' && (
                                <div className="space-y-3 mt-2">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                                            <MapPin className="w-3.5 h-3.5 inline-block me-1" />
                                            {isAr ? "اختر منطقة التوصيل" : "Select Delivery Zone"} <span className="text-red-500">*</span>
                                        </label>
                                        {zones.length === 0 ? (
                                            <p className="text-xs text-zinc-400 py-3 text-center">{isAr ? "لا توجد مناطق توصيل متاحة" : "No delivery zones available"}</p>
                                        ) : (
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {zones.map(zone => (
                                                    <button
                                                        key={zone.id}
                                                        onClick={() => setSelectedZone(zone)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-start ${selectedZone?.id === zone.id
                                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
                                                    >
                                                        <div>
                                                            <p className={`font-bold text-sm ${selectedZone?.id === zone.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                                {isAr ? zone.name_ar : (zone.name_en || zone.name_ar)}
                                                            </p>
                                                            <p className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                                                                <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{zone.estimated_time} {isAr ? "دقيقة" : "min"}</span>
                                                                {zone.min_order > 0 && <span>{isAr ? "حد أدنى:" : "Min:"} {zone.min_order} {currency}</span>}
                                                            </p>
                                                        </div>
                                                        <span className={`font-bold text-sm ${selectedZone?.id === zone.id ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                                            {zone.fee > 0 ? `${zone.fee} ${currency}` : (isAr ? "مجاناً" : "Free")}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                                            {isAr ? "العنوان بالتفصيل" : "Detailed Address"} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={address} onChange={e => setAddress(e.target.value)}
                                            placeholder={isAr ? "الشارع، المبنى، الطابق، رقم الشقة..." : "Street, building, floor, apartment..."}
                                            rows={2}
                                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-emerald-500 transition text-sm resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {orderType === 'pickup' && (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                    <Store className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        {isAr ? `يمكنك استلام طلبك من ${restaurantName} مباشرة.` : `You can pick up your order from ${restaurantName} directly.`}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setStep(hasAddons ? 2 : 1)} className="flex-1 py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm">
                                    {isAr ? "← رجوع" : "← Back"}
                                </button>
                                <button
                                    disabled={!canProceedStep3}
                                    onClick={() => setStep(hasAddons ? 4 : 3)}
                                    className="flex-1 py-3 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"
                                >
                                    {isAr ? "التالي ←" : "Next →"}
                                </button>
                            </div>
                        </>
                    )}

                    {/* ════════ STEP: SUMMARY ════════ */}
                    {effectiveStep === 4 && (
                        <>
                            {/* Items list with extras */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 space-y-3 max-h-48 overflow-y-auto">
                                {getFinalItems().map((item, i) => {
                                    const itemExtrasTotal = (item.extras || []).reduce((s, e) => s + e.price * e.qty, 0);
                                    const itemTotal = (item.price * item.qty) + (itemExtrasTotal * item.qty);
                                    return (
                                        <div key={i} className="border-b border-zinc-100 dark:border-zinc-700 pb-2 last:border-0">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-700 dark:text-zinc-300 font-bold">{item.title}{item.size && item.size !== 'عادي' ? ` (${item.size})` : ''} × {item.qty}</span>
                                                <span className="font-bold text-zinc-900 dark:text-white">{itemTotal} {currency}</span>
                                            </div>
                                            {item.category && (
                                                <p className="text-[10px] text-zinc-400 mt-0.5">🗂️ {item.category}</p>
                                            )}
                                            {item.extras && item.extras.length > 0 && (
                                                <div className="mt-1 space-y-0.5">
                                                    {item.extras.map((e, ei) => (
                                                        <p key={ei} className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                                            🔹 {e.name} ×{e.qty} = {e.price * e.qty} {currency}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Totals */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                                    <span>{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
                                    <span>{subtotal} {currency}</span>
                                </div>
                                {extrasTotal > 0 && (
                                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                                        <span>{isAr ? "الإضافات" : "Extras"}</span>
                                        <span>{extrasTotal} {currency}</span>
                                    </div>
                                )}
                                {deliveryFee > 0 && (
                                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                                        <span>{isAr ? "رسوم التوصيل" : "Delivery Fee"}</span>
                                        <span>{deliveryFee} {currency}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-extrabold text-lg text-zinc-900 dark:text-white pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                    <span>{isAr ? "الإجمالي" : "Total"}</span>
                                    <span className="text-emerald-500">{total} {currency}</span>
                                </div>
                            </div>

                            {/* Customer summary */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg">
                                    <span className="text-zinc-400 block">{isAr ? "الاسم" : "Name"}</span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-200">{name}</span>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg">
                                    <span className="text-zinc-400 block">{isAr ? "الهاتف" : "Phone"}</span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-200" dir="ltr">{phone}</span>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg col-span-2">
                                    <span className="text-zinc-400 block">{isAr ? "نوع الطلب" : "Type"}</span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-200">
                                        {orderType === 'delivery' ? (isAr ? `🏍️ دليفري — ${selectedZone?.name_ar}` : `🏍️ Delivery — ${selectedZone?.name_en || selectedZone?.name_ar}`) : (isAr ? "🏪 استلام من المطعم" : "🏪 Pickup")}
                                    </span>
                                </div>
                                {orderType === 'delivery' && address && (
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg col-span-2">
                                        <span className="text-zinc-400 block">{isAr ? "العنوان" : "Address"}</span>
                                        <span className="font-bold text-zinc-700 dark:text-zinc-200">{address}</span>
                                    </div>
                                )}
                                {notes && (
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg col-span-2">
                                        <span className="text-zinc-400 block">{isAr ? "ملاحظات" : "Notes"}</span>
                                        <span className="font-bold text-zinc-700 dark:text-zinc-200">{notes}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setStep(hasAddons ? 3 : 2)} className="flex-1 py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm">
                                    {isAr ? "← رجوع" : "← Back"}
                                </button>
                                <button
                                    disabled={loading}
                                    onClick={handleSubmit}
                                    className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 transition text-sm flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> {isAr ? "جاري الإرسال..." : "Submitting..."}</>
                                    ) : (
                                        <><CheckCircle className="w-4 h-4" /> {isAr ? "تأكيد الطلب" : "Confirm Order"}</>
                                    )}
                                </button>
                            </div>
                        </>
                    )}

                    {/* ════════ STEP: SUCCESS ════════ */}
                    {effectiveStep === 5 && (
                        <div className="text-center space-y-4 py-4" ref={printRef}>
                            <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">{isAr ? "تم استلام طلبك!" : "Order Received!"}</p>
                                <p className="text-4xl font-black text-emerald-500 mt-2">#{orderNumber}</p>
                                <p className="text-sm text-zinc-500 mt-2">
                                    {isAr ? "سيتم تحضير طلبك في أقرب وقت. شكراً لك!" : "Your order will be prepared shortly. Thank you!"}
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <div className="flex gap-2">
                                    {whatsappNumber && (
                                        <button
                                            onClick={sendWhatsApp}
                                            className="flex-1 py-3 rounded-xl font-bold text-white bg-[#25D366] hover:bg-[#1da851] transition text-sm flex items-center justify-center gap-2"
                                        >
                                            <FaWhatsapp className="w-5 h-5" />
                                            {isAr ? "إرسال عبر واتساب" : "Send via WhatsApp"}
                                        </button>
                                    )}
                                    <button
                                        onClick={handlePrint}
                                        className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-500 hover:bg-blue-600 transition text-sm flex items-center justify-center gap-2"
                                    >
                                        <Printer className="w-4 h-4" />
                                        {isAr ? "طباعة الفاتورة" : "Print Invoice"}
                                    </button>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm"
                                >
                                    {isAr ? "إغلاق" : "Close"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step indicator */}
                {effectiveStep < 5 && (
                    <div className="flex justify-center gap-2 pb-5">
                        {(hasAddons ? [1, 2, 3, 4] : [1, 2, 3]).map(s => (
                            <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-8 bg-emerald-500' : s < step ? 'w-4 bg-emerald-300' : 'w-4 bg-zinc-200 dark:bg-zinc-700'}`} />
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
