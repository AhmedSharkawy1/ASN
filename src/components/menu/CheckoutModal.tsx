"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { submitOrder, buildWhatsAppMessage, OrderItem, OrderItemExtra } from "@/lib/helpers/submitOrder";
import { fetchActivePromotions, evaluatePromotions, AppliedPromotion, Promotion } from "@/lib/helpers/promotionEngine";
import { FaWhatsapp } from "react-icons/fa";
import { X, Truck, Store, MapPin, Clock, CheckCircle, Loader2, Plus, Minus, Tag } from "lucide-react";

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
    orderChannel?: "whatsapp" | "website" | "both";
    onOrderSuccess?: () => void;
    branches?: string[];
};

export default function CheckoutModal({
    isOpen, onClose, cartItems, subtotal,
    restaurantId, restaurantName, whatsappNumber,
    currency: propCurrency = "ج.م", language, orderChannel = "whatsapp", onOrderSuccess,
    branches: propBranches = []
}: CheckoutModalProps) {
    const isAr = language === "ar";
    const printRef = useRef<HTMLDivElement>(null);
    const [currency, setCurrency] = useState(propCurrency);

    // Sync propCurrency with local state
    useEffect(() => {
        if (propCurrency) {
            setCurrency(propCurrency);
        }
    }, [propCurrency]);

    // Steps: 1=extras, 2=customer info, 3=order type, 4=summary, 5=success
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [orderNumber, setOrderNumber] = useState<number | null>(null);
    const [finalizedOrderDetails, setFinalizedOrderDetails] = useState<{
        items: OrderItem[];
        subtotal: number;
        extrasTotal: number;
        total: number;
    } | null>(null);

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

    // Promotions state
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [appliedPromo, setAppliedPromo] = useState<AppliedPromotion | null>(null);

    // Branch state
    const [localBranches, setLocalBranches] = useState<string[]>(propBranches);
    const [selectedBranch, setSelectedBranch] = useState("");

    // Sync propBranches with local state
    useEffect(() => {
        if (propBranches && propBranches.length > 0) {
            setLocalBranches(propBranches);
        }
    }, [propBranches]);

    // Fetch branches and currency from DB
    useEffect(() => {
        if (!isOpen || !restaurantId) return;

        (async () => {
            try {
                const { data } = await supabase
                    .from('restaurants')
                    .select('branches_enabled, branches, currency')
                    .eq('id', restaurantId)
                    .single();
                if (data) {
                    if (propBranches && propBranches.length > 0) {
                        // Keep prop branches
                    } else if (data.branches_enabled && Array.isArray(data.branches)) {
                        setLocalBranches(data.branches);
                    } else {
                        setLocalBranches([]);
                    }

                    if (data.currency) {
                        setCurrency(data.currency);
                    }
                }
            } catch (err) {
                console.error("Error fetching restaurant config in CheckoutModal:", err);
            }
        })();
    }, [isOpen, restaurantId, propBranches]);

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

    // Fetch promotions
    useEffect(() => {
        if (!isOpen || !restaurantId) return;
        (async () => {
            const promos = await fetchActivePromotions(restaurantId);
            setPromotions(promos);
        })();
    }, [isOpen, restaurantId]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setLoading(false);
            setOrderNumber(null);
            setItemExtras({});
            setFinalizedOrderDetails(null);
            setSelectedBranch("");
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
            return {
                ...item,
                id: (item as CheckoutCartItem & { item?: { id: string } }).item?.id || item.id,
                extras
            };
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

    // Evaluate promotions against current cart
    useEffect(() => {
        if (promotions.length === 0) { setAppliedPromo(null); return; }
        // Extract original item ID from cart items (handles all theme formats)
        const cartForPromo = cartItems.map(ci => {
            // 1) If theme spreads the full item object, use item.id directly
            const itemObj = (ci as any).item;
            if (itemObj?.id) {
                return { id: String(itemObj.id), title: ci.title, qty: ci.qty, price: ci.price };
            }
            // 2) Try to extract UUID pattern from composite cart ID
            const uuidMatch = ci.id.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            if (uuidMatch) {
                return { id: uuidMatch[1], title: ci.title, qty: ci.qty, price: ci.price };
            }
            // 3) Fallback: use raw id
            return { id: ci.id, title: ci.title, qty: ci.qty, price: ci.price };
        });
        console.log('[PROMO DEBUG] Cart items for promo:', cartForPromo.map(c => ({ id: c.id, title: c.title })));
        console.log('[PROMO DEBUG] Subtotal+extras:', subtotal + extrasTotal, 'deliveryFee:', deliveryFee);
        const result = evaluatePromotions(cartForPromo, promotions, subtotal + extrasTotal, deliveryFee);
        console.log('[PROMO DEBUG] Result:', result ? { name: result.promotion.name_ar, discount: result.discountAmount, freeShipping: result.freeShipping } : 'NO MATCH');
        setAppliedPromo(result);
    }, [cartItems, promotions, subtotal, extrasTotal, deliveryFee]);

    const promoDiscount = appliedPromo ? appliedPromo.discountAmount : 0;
    const total = subtotal + extrasTotal + deliveryFee - promoDiscount;

    const canProceedStep2 = name.trim().length > 0 && phone.trim().length >= 8;
    const canProceedStep3 = (orderType === 'pickup' || (orderType === 'delivery' && address.trim().length > 0)) && (localBranches && localBranches.length > 0 ? selectedBranch !== "" : true);

    const handleSubmit = async (viaWhatsApp = false) => {
        setLoading(true);
        const finalItems = getFinalItems();
        const currentExtrasTotal = extrasTotal;
        const currentSubtotal = subtotal;
        const currentTotal = total;

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
            promotionId: appliedPromo?.promotion.id,
            promotionName: appliedPromo ? (isAr ? appliedPromo.promotion.name_ar : (appliedPromo.promotion.name_en || appliedPromo.promotion.name_ar)) : undefined,
            discountAmount: promoDiscount > 0 ? promoDiscount : undefined,
            discountType: appliedPromo?.promotion.discount_type,
            branchName: localBranches && localBranches.length > 0 ? selectedBranch : undefined,
            currency: currency,
        });

        setLoading(false);
        if (result.success) {
            setOrderNumber(result.orderNumber || 0);
            setFinalizedOrderDetails({
                items: finalItems,
                subtotal: currentSubtotal,
                extrasTotal: currentExtrasTotal,
                total: currentTotal
            });
            setStep(hasAddons ? 5 : 4);
            onOrderSuccess?.();
            
            // If the customer clicked the WhatsApp button, redirect them directly to WhatsApp
            if (viaWhatsApp) {
                sendWhatsApp(result.orderNumber);
            }
        } else {
            alert(result.error || (isAr ? "حدث خطأ" : "Something went wrong"));
        }
    };

    const sendWhatsApp = (newOrderNum?: number) => {
        if (!whatsappNumber) return;
        const finalItems = finalizedOrderDetails ? finalizedOrderDetails.items : getFinalItems();
        const finalSubtotal = finalizedOrderDetails ? finalizedOrderDetails.subtotal + finalizedOrderDetails.extrasTotal : subtotal + extrasTotal;
        const finalTotal = finalizedOrderDetails ? finalizedOrderDetails.total : total;

        const msg = buildWhatsAppMessage({
            orderNumber: newOrderNum || orderNumber || 0,
            restaurantName,
            customerName: name,
            customerPhone: phone,
            customerAddress: orderType === 'delivery' ? address : undefined,
            orderType,
            deliveryZoneName: selectedZone ? (isAr ? selectedZone.name_ar : (selectedZone.name_en || selectedZone.name_ar)) : undefined,
            deliveryFee,
            items: finalItems,
            subtotal: finalSubtotal,
            total: finalTotal,
            notes: notes || undefined,
            currency: currency,
            language,
            promotionName: appliedPromo ? (isAr ? appliedPromo.promotion.name_ar : (appliedPromo.promotion.name_en || appliedPromo.promotion.name_ar)) : undefined,
            discountAmount: promoDiscount > 0 ? promoDiscount : undefined,
            discountType: appliedPromo?.promotion.discount_type,
            branchName: localBranches && localBranches.length > 0 ? selectedBranch : undefined,
        });
        // Use window.location.href to redirect directly — window.open gets blocked after async calls
        const waUrl = `https://wa.me/${whatsappNumber.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(msg.replace(/\uFE0F/g, ''))}`;
        window.location.href = waUrl;
    };

    // Removed handlePrint here

    if (!isOpen) return null;

    const stepLabels = hasAddons
        ? { 1: isAr ? "الإضافات" : "Extras", 2: isAr ? "بيانات العميل" : "Customer Info", 3: isAr ? "نوع الطلب" : "Order Type", 4: isAr ? "تأكيد الطلب" : "Confirm Order", 5: isAr ? "تم الطلب! 🎉" : "Order Placed! 🎉" }
        : { 1: isAr ? "بيانات العميل" : "Customer Info", 2: isAr ? "نوع الطلب" : "Order Type", 3: isAr ? "تأكيد الطلب" : "Confirm Order", 4: isAr ? "تم الطلب! 🎉" : "Order Placed! 🎉" };

    // When no addons, remap steps: 1->customer, 2->type, 3->summary, 4->success
    const effectiveStep = hasAddons ? step : step + 1;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center py-16 px-6 mb-safe" dir={isAr ? "rtl" : "ltr"}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={effectiveStep < 5 ? onClose : undefined} />

            {/* Modal */}
            <div
                className="relative w-[85vw] max-w-[310px] max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 mx-auto"
                style={{ animation: "popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-t-[2rem]">
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white flex-1 text-center">
                        {stepLabels[step as keyof typeof stepLabels]}
                    </h3>
                    <button onClick={onClose} className="absolute left-4 p-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-90">
                        <X className="w-5 h-5 font-bold" />
                    </button>
                    <div className="absolute right-4 w-10"></div> {/* Spacer for centering */}
                </div>

                <div className="p-5 space-y-4">
                    {/* ════════ STEP: EXTRAS ════════ */}
                    {effectiveStep === 1 && hasAddons && (
                        <>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {isAr ? "اختر الإضافات لكل صنف (اختياري)" : "Choose extras for each item (optional)"}
                            </p>
                            <div className="space-y-5 max-h-[85vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
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

                            {/* Branch Selection */}
                            {localBranches && localBranches.length > 0 && (
                                <div className="space-y-2 mt-2">
                                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                                        🏢 {isAr ? "اختر الفرع" : "Select Branch"} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-1">
                                        {localBranches.map((branchName, bIdx) => {
                                            const isSelected = selectedBranch === branchName;
                                            return (
                                                <button
                                                    key={bIdx}
                                                    type="button"
                                                    onClick={() => setSelectedBranch(branchName)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-start transition-all ${isSelected
                                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold'
                                                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300'}`}
                                                >
                                                    <span className="text-sm">{branchName}</span>
                                                    {isSelected && <span className="text-emerald-500">✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Delivery Zone Selection */}
                            {orderType === 'delivery' && (
                                <div className="space-y-3 mt-2">
                                    {zones.length > 0 && (
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                                            <MapPin className="w-3.5 h-3.5 inline-block me-1" />
                                            {isAr ? "اختر منطقة التوصيل (اختياري)" : "Select Delivery Zone (optional)"}
                                        </label>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {zones.map(zone => (
                                                <button
                                                    key={zone.id}
                                                    onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
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
                                    </div>
                                    )}
                                    {!selectedZone && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                                            <span className="text-amber-500 text-base">⚠️</span>
                                            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                                {isAr ? "السعر غير شامل رسوم التوصيل" : "Price does not include delivery fee"}
                                            </p>
                                        </div>
                                    )}

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
                                        {appliedPromo?.freeShipping ? (
                                            <span className="flex items-center gap-2">
                                                <span className="text-emerald-500 font-bold">0 {currency}</span>
                                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.5 rounded">{isAr ? 'شحن مجاني' : 'Free'}</span>
                                            </span>
                                        ) : (
                                            <span>{deliveryFee} {currency}</span>
                                        )}
                                    </div>
                                )}
                                {appliedPromo && promoDiscount > 0 && (
                                    <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 p-2.5 rounded-xl border border-amber-200 dark:border-amber-500/20">
                                        <div className="flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-amber-700 dark:text-amber-300 font-bold text-xs">{isAr ? appliedPromo.promotion.name_ar : (appliedPromo.promotion.name_en || appliedPromo.promotion.name_ar)}</span>
                                        </div>
                                        <span className="font-bold text-amber-600 text-sm">-{promoDiscount} {currency}</span>
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
                                {localBranches && localBranches.length > 0 && selectedBranch && (
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg col-span-2">
                                        <span className="text-zinc-400 block">{isAr ? "الفرع" : "Branch"}</span>
                                        <span className="font-bold text-zinc-700 dark:text-zinc-200">🏢 {selectedBranch}</span>
                                    </div>
                                )}
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
                                <button onClick={() => setStep(hasAddons ? 3 : 2)} className="w-[100px] py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm">
                                    {isAr ? "← رجوع" : "← Back"}
                                </button>
                                <button
                                    disabled={loading}
                                    onClick={() => handleSubmit(true)}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-60 transition text-sm flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> {isAr ? "جاري الإرسال..." : "Sending..."}</>
                                    ) : (
                                        <><FaWhatsapp className="w-4 h-4" /> {isAr ? "طلب عبر واتساب" : "Order via WhatsApp"}</>
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
                                <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">{isAr ? "تم إرسال الأوردر!" : "Order Sent!"}</p>
                                <p className="text-4xl font-black text-emerald-500 mt-2">#{orderNumber}</p>
                                <p className="text-sm text-zinc-500 mt-2 font-bold">
                                    {isAr ? "تم ارسال الاوردر وسيتم تاكيده من احد موظفى المطعم" : "Your order has been sent and will be confirmed by restaurant staff."}
                                </p>
                            </div>

                            {/* Order Summary with Discount */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 text-sm space-y-2 text-start">
                                <div className="flex justify-between text-zinc-500">
                                    <span>{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
                                    <span>{finalizedOrderDetails ? finalizedOrderDetails.subtotal + finalizedOrderDetails.extrasTotal : subtotal + extrasTotal} {currency}</span>
                                </div>
                                {deliveryFee > 0 && (
                                    <div className="flex justify-between text-zinc-500">
                                        <span>{isAr ? "رسوم التوصيل" : "Delivery Fee"}</span>
                                        {appliedPromo?.freeShipping ? (
                                            <span className="flex items-center gap-2">
                                                <span className="text-emerald-500 font-bold">0 {currency}</span>
                                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.5 rounded">{isAr ? 'شحن مجاني' : 'Free'}</span>
                                            </span>
                                        ) : (
                                            <span>{deliveryFee} {currency}</span>
                                        )}
                                    </div>
                                )}
                                {appliedPromo && promoDiscount > 0 && (
                                    <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 p-2.5 rounded-xl border border-amber-200 dark:border-amber-500/20 -mx-1">
                                        <div className="flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-amber-700 dark:text-amber-300 font-bold text-xs">
                                                {isAr ? appliedPromo.promotion.name_ar : (appliedPromo.promotion.name_en || appliedPromo.promotion.name_ar)}
                                                {appliedPromo.freeShipping && ` (${isAr ? 'شحن مجاني' : 'Free Shipping'})`}
                                            </span>
                                        </div>
                                        <span className="font-bold text-amber-600 text-sm">-{promoDiscount} {currency}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-extrabold text-base text-zinc-900 dark:text-white pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                    <span>{isAr ? "الإجمالي" : "Total"}</span>
                                    <span className="text-emerald-500">{finalizedOrderDetails ? finalizedOrderDetails.total : total} {currency}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                {whatsappNumber && (
                                    <button
                                        onClick={() => sendWhatsApp()}
                                        className="w-full py-3.5 rounded-xl font-bold text-white bg-[#25D366] hover:bg-[#1da851] transition text-sm flex items-center justify-center gap-2"
                                    >
                                        <FaWhatsapp className="w-5 h-5" />
                                        {isAr ? "إرسال عبر واتساب" : "Send via WhatsApp"}
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm"
                                >
                                    {isAr ? "الرجوع للمنيو" : "Back to Menu"}
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
                @keyframes popIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
