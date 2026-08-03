'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, MapPin, Phone, User, Store, ArrowLeft, ArrowRight, Send, CheckCircle2, MessageSquare, Tag, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { parseCurrency } from '@/lib/currency';
interface Promotion {
    id: string;
    code: string;
    discount_type: 'fixed' | 'percentage';
    discount_value: number;
    min_order_amount?: number;
    is_active: boolean;
}

interface CartItem {
    id: string;
    title: string;
    qty: number;
    price: number;
    size?: string;
    notes?: string;
}

interface UsaDualCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    subtotal: number;
    restaurantId: string;
    restaurantName: string;
    whatsappNumber?: string;
    currency?: string;
    orderChannel?: 'whatsapp' | 'website' | 'both';
    onOrderSuccess?: () => void;
    branches?: any[];
    lang?: 'en' | 'ar';
}

export default function UsaDualCheckoutModal({
    isOpen,
    onClose,
    cartItems,
    subtotal,
    restaurantId,
    restaurantName,
    whatsappNumber,
    currency = 'USD',
    orderChannel = 'both',
    onOrderSuccess,
    branches = [],
    lang = 'en'
}: UsaDualCheckoutModalProps) {
    const [currentLang, setCurrentLang] = useState<'en' | 'ar'>(lang);
    useEffect(() => setCurrentLang(lang), [lang]);

    const isAr = currentLang === 'ar';
    const parsedCurrency = parseCurrency(currency, isAr);

    const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [notes, setNotes] = useState('');
    
    const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
    const [selectedZone, setSelectedZone] = useState<any | null>(null);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
    const [promoError, setPromoError] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [orderCompleted, setOrderCompleted] = useState(false);
    const [createdOrder, setCreatedOrder] = useState<any | null>(null);

    useEffect(() => {
        if (!isOpen || !restaurantId) return;

        const fetchData = async () => {
            try {
                const { data: zones } = await supabase
                    .from('delivery_zones')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_active', true);
                
                if (zones && zones.length > 0) {
                    setDeliveryZones(zones);
                    setSelectedZone(zones[0]);
                }

                const { data: promos } = await supabase
                    .from('promotions')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_active', true);
                
                if (promos) {
                    setPromotions(promos as Promotion[]);
                }
            } catch (err) {
                console.error("Error fetching checkout data:", err);
            }
        };

        fetchData();
    }, [isOpen, restaurantId]);

    useEffect(() => {
        if (branches.length > 0 && !selectedBranch) {
            setSelectedBranch(branches[0].name_en || branches[0].name_ar || branches[0].name || '');
        }
    }, [branches, selectedBranch]);

    const deliveryFee = orderType === 'delivery' ? Number(selectedZone?.price || 0) : 0;
    
    const cartForPromo = cartItems.map(item => ({
        id: item.id,
        quantity: item.qty,
        price: item.price,
        totalPrice: item.price * item.qty,
    }));

    const discountAmount = appliedPromo 
        ? (appliedPromo.discount_type === 'percentage' 
            ? (subtotal * appliedPromo.discount_value) / 100 
            : appliedPromo.discount_value) 
        : 0;
    const finalTotal = Math.max(0, subtotal + deliveryFee - discountAmount);

    const handleApplyPromoCode = () => {
        setPromoError('');
        if (!promoCodeInput.trim()) return;

        const codeToFind = promoCodeInput.trim().toUpperCase();
        const found = promotions.find(p => p.code && p.code.toUpperCase() === codeToFind);

        if (!found) {
            setPromoError(isAr ? 'كود الخصم غير صحيح أو منتهي الصلاحية' : 'Invalid or expired promo code');
            setAppliedPromo(null);
            return;
        }

        setAppliedPromo(found);
        setPromoError('');
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName.trim() || !customerPhone.trim()) {
            alert(isAr ? 'يرجى ملء الاسم ورقم الهاتف لمتابعة الطلب.' : 'Please fill in your name and phone number.');
            return;
        }

        if (orderType === 'delivery' && !deliveryAddress.trim()) {
            alert(isAr ? 'يرجى كتابة عنوان التوصيل بالتفصيل.' : 'Please enter complete delivery address.');
            return;
        }

        setSubmitting(true);

        try {
            const orderPayload = {
                restaurant_id: restaurantId,
                type: orderType,
                customer_name: customerName,
                customer_phone: customerPhone,
                delivery_address: orderType === 'delivery' ? deliveryAddress : undefined,
                delivery_zone_id: orderType === 'delivery' ? selectedZone?.id : undefined,
                branch: orderType === 'pickup' ? selectedBranch : undefined,
                items: cartItems.map(i => ({
                    id: i.id,
                    title: i.title,
                    qty: i.qty,
                    price: i.price,
                    size: i.size,
                    notes: i.notes
                })),
                subtotal: subtotal,
                delivery_fee: deliveryFee,
                discount: discountAmount,
                total: finalTotal,
                notes: notes,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('orders')
                .insert([orderPayload])
                .select()
                .single();

            if (error) console.warn("Database order notice:", error);

            const currentOrder = data || orderPayload;

            // Create notification for restaurant owner
            await supabase.from('notifications').insert({
                restaurant_id: restaurantId,
                title: `طلب جديد #${currentOrder.order_number || 'NEW'}`,
                body: `${customerName} — ${cartItems.length} أصناف — ${finalTotal.toFixed(2)} ${parsedCurrency} — ${orderType === 'delivery' ? 'دليفري' : 'استلام'}`,
                type: 'order',
                target: 'admin',
                is_read: false,
            });

            setCreatedOrder(currentOrder);
            setOrderCompleted(true);
            
            if (onOrderSuccess) onOrderSuccess();
        } catch (err: any) {
            console.error("Order submit exception:", err);
            alert((isAr ? "حدث خطأ: " : "Error submitting order: ") + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatWhatsAppMessage = () => {
        let msg = isAr ? `*طلب جديد - ثيم USA الثنائي 🇺🇸*\n` : `*New Order - USA Dual Theme 🇺🇸*\n`;
        msg += `*${isAr ? 'المكان' : 'Restaurant'}:* ${restaurantName}\n\n`;
        msg += `*${isAr ? 'العميل' : 'Customer'}:* ${customerName}\n`;
        msg += `*${isAr ? 'الهاتف' : 'Phone'}:* ${customerPhone}\n`;
        msg += `*${isAr ? 'نوع الطلب' : 'Order Type'}:* ${orderType === 'delivery' ? (isAr ? 'توصيل' : 'Delivery') : (isAr ? 'استلام' : 'Pickup')}\n`;

        if (orderType === 'delivery') {
            msg += `*${isAr ? 'العنوان' : 'Address'}:* ${deliveryAddress}\n`;
            if (selectedZone) msg += `*${isAr ? 'المنطقة' : 'Zone'}:* ${selectedZone.name_en || selectedZone.name_ar || selectedZone.name}\n`;
        } else if (selectedBranch) {
            msg += `*${isAr ? 'الفرع' : 'Branch'}:* ${selectedBranch}\n`;
        }

        msg += `\n*${isAr ? 'الطلبات' : 'Items'}:*\n`;
        cartItems.forEach((item, idx) => {
            msg += `${idx + 1}. ${item.title} x${item.qty} - ${(item.price * item.qty).toFixed(2)} ${parsedCurrency}\n`;
            if (item.size) msg += `   ${isAr ? 'الحجم' : 'Size'}: ${item.size}\n`;
            if (item.notes) msg += `   ${isAr ? 'ملاحظة' : 'Note'}: ${item.notes}\n`;
        });

        msg += `\n*${isAr ? 'المجموع الفرعي' : 'Subtotal'}:* ${subtotal.toFixed(2)} ${parsedCurrency}\n`;
        if (orderType === 'delivery') msg += `*${isAr ? 'التوصيل' : 'Delivery Fee'}:* ${deliveryFee.toFixed(2)} ${parsedCurrency}\n`;
        if (discountAmount > 0) msg += `*${isAr ? 'الخصم' : 'Discount'}:* -${discountAmount.toFixed(2)} ${parsedCurrency}\n`;
        msg += `*${isAr ? 'الإجمالي' : 'Total'}:* ${finalTotal.toFixed(2)} ${parsedCurrency}\n`;

        if (notes) msg += `\n*${isAr ? 'ملاحظات' : 'Notes'}:* ${notes}\n`;

        return encodeURIComponent(msg);
    };

    const handleSendWhatsApp = () => {
        if (!whatsappNumber) return;
        const cleanNumber = whatsappNumber.replace(/\+/g, '').trim();
        const url = `https://wa.me/${cleanNumber}?text=${formatWhatsAppMessage()}`;
        window.open(url, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto ${isAr ? 'rtl text-right' : 'ltr text-left'}`}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden my-6"
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
                    <div className="flex items-center gap-2.5">
                        <ShoppingBag className="w-5 h-5 text-rose-500" />
                        <h3 className="font-extrabold text-lg">
                            {isAr ? 'إتمام طلب الشراء' : 'Complete Your Order'}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Language Switcher */}
                        <button
                            type="button"
                            onClick={() => setCurrentLang(isAr ? 'en' : 'ar')}
                            className="p-1.5 px-3 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 border border-slate-700"
                        >
                            <Globe className="w-3.5 h-3.5 text-rose-500" />
                            <span>{isAr ? 'EN' : 'عربي'}</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {!orderCompleted ? (
                    <form onSubmit={handleCreateOrder} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                        
                        {/* Order Type Switcher */}
                        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
                            <button
                                type="button"
                                onClick={() => setOrderType('delivery')}
                                className={`py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                                    orderType === 'delivery'
                                        ? 'bg-rose-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <MapPin className="w-4 h-4" />
                                <span>{isAr ? 'توصيل للمنزل' : 'Home Delivery'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setOrderType('pickup')}
                                className={`py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                                    orderType === 'pickup'
                                        ? 'bg-rose-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Store className="w-4 h-4" />
                                <span>{isAr ? 'استلام من الفرع' : 'Store Pickup'}</span>
                            </button>
                        </div>

                        {/* Customer Info */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{isAr ? 'الاسم بالكامل *' : 'Full Name *'}</label>
                                <div className="relative">
                                    <User className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${isAr ? 'right-3.5' : 'left-3.5'}`} />
                                    <input
                                        type="text"
                                        required
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        placeholder={isAr ? "مثال: جون سميث" : "e.g. John Smith"}
                                        className={`w-full py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm ${
                                            isAr ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'
                                        }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{isAr ? 'رقم الهاتف والتواصل *' : 'Phone Number *'}</label>
                                <div className="relative">
                                    <Phone className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${isAr ? 'right-3.5' : 'left-3.5'}`} />
                                    <input
                                        type="tel"
                                        required
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value)}
                                        placeholder="+1 234 567 8900"
                                        className={`w-full py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm ltr ${
                                            isAr ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'
                                        }`}
                                    />
                                </div>
                            </div>

                            {orderType === 'delivery' ? (
                                <div className="space-y-3 pt-1">
                                    {deliveryZones.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">{isAr ? 'منطقة التوصيل' : 'Delivery Area'}</label>
                                            <select
                                                value={selectedZone?.id || ''}
                                                onChange={e => {
                                                    const z = deliveryZones.find(dz => dz.id === e.target.value);
                                                    setSelectedZone(z || null);
                                                }}
                                                className="w-full px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 focus:outline-none focus:border-rose-500 text-sm"
                                            >
                                                {deliveryZones.map(z => (
                                                    <option key={z.id} value={z.id}>
                                                        {isAr ? (z.name_ar || z.name_en || z.name) : (z.name_en || z.name_ar || z.name)} (+{z.price} {parsedCurrency})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">{isAr ? 'عنوان التوصيل التفصيلي *' : 'Detailed Delivery Address *'}</label>
                                        <textarea
                                            rows={2}
                                            required
                                            value={deliveryAddress}
                                            onChange={e => setDeliveryAddress(e.target.value)}
                                            placeholder={isAr ? "المنطقة، الشارع، المبنى، الشقة..." : "Street name, building, apartment #..."}
                                            className="w-full px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm resize-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                branches.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">{isAr ? 'فرع الاستلام' : 'Pickup Branch'}</label>
                                        <select
                                            value={selectedBranch}
                                            onChange={e => setSelectedBranch(e.target.value)}
                                            className="w-full px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 focus:outline-none focus:border-rose-500 text-sm"
                                        >
                                            {branches.map((b, i) => (
                                                <option key={i} value={isAr ? (b.name_ar || b.name_en || b.name) : (b.name_en || b.name_ar || b.name)}>
                                                    {isAr ? (b.name_ar || b.name_en || b.name) : (b.name_en || b.name_ar || b.name)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{isAr ? 'كود الخصم (اختياري)' : 'Promo Code (Optional)'}</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Tag className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${isAr ? 'right-3.5' : 'left-3.5'}`} />
                                        <input
                                            type="text"
                                            value={promoCodeInput}
                                            onChange={e => setPromoCodeInput(e.target.value)}
                                            placeholder={isAr ? "أدخل الكود" : "Enter code"}
                                            className={`w-full py-2.5 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 uppercase text-xs ${
                                                isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'
                                            }`}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleApplyPromoCode}
                                        className="px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-rose-400 font-bold text-xs hover:bg-slate-700"
                                    >
                                        {isAr ? 'تطبيق' : 'Apply'}
                                    </button>
                                </div>
                                {promoError && <p className="text-xs text-rose-400 mt-1">{promoError}</p>}
                                {appliedPromo && <p className="text-xs text-emerald-400 mt-1">{isAr ? 'تم تطبيق الخصم!' : 'Promo applied!'}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{isAr ? 'ملاحظات للطلب' : 'Special Instructions'}</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={isAr ? "تعليمات خاصة للمطعم..." : "Any order notes..."}
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Summary Box */}
                        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-300">
                                <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                                <span>{subtotal.toFixed(2)} {parsedCurrency}</span>
                            </div>
                            {orderType === 'delivery' && (
                                <div className="flex justify-between text-slate-300">
                                    <span>{isAr ? 'رسوم التوصيل:' : 'Delivery Fee:'}</span>
                                    <span>{deliveryFee.toFixed(2)} {parsedCurrency}</span>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-rose-400 font-bold">
                                    <span>{isAr ? 'الخصم:' : 'Discount:'}</span>
                                    <span>-{discountAmount.toFixed(2)} {parsedCurrency}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-extrabold text-sm text-slate-100">
                                <span>{isAr ? 'الإجمالي الكلي:' : 'Total Amount:'}</span>
                                <span className="text-rose-400 text-base">{finalTotal.toFixed(2)} {parsedCurrency}</span>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="space-y-2 pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                <span>{submitting ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'تأكيد وإرسال الطلب' : 'Confirm Order')}</span>
                            </button>

                            {whatsappNumber && (
                                <button
                                    type="button"
                                    onClick={handleSendWhatsApp}
                                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>{isAr ? 'إرسال عبر واتساب' : 'Send via WhatsApp'}</span>
                                </button>
                            )}
                        </div>

                    </form>
                ) : (
                    /* Order Completed State */
                    <div className="p-8 text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-100">{isAr ? 'تم استلام طلبك بنجاح!' : 'Order Placed Successfully!'}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                {isAr ? `شكراً لطلبك من ${restaurantName}. تم تسجيل الطلب بنجاح.` : `Thank you for ordering from ${restaurantName}.`}
                            </p>
                        </div>

                        {whatsappNumber && (
                            <button
                                onClick={handleSendWhatsApp}
                                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <MessageSquare className="w-5 h-5" />
                                <span>{isAr ? 'إرسال التفاصيل عبر واتساب' : 'Send Details via WhatsApp'}</span>
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                        >
                            {isAr ? 'إغلاق النافذة' : 'Close'}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
