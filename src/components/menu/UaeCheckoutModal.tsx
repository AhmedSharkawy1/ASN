'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, MapPin, Phone, User, Store, ArrowLeft, Send, CheckCircle2, MessageSquare, Tag } from 'lucide-react';
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

interface UaeCheckoutModalProps {
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
}

export default function UaeCheckoutModal({
    isOpen,
    onClose,
    cartItems,
    subtotal,
    restaurantId,
    restaurantName,
    whatsappNumber,
    currency = 'AED',
    orderChannel = 'both',
    onOrderSuccess,
    branches = []
}: UaeCheckoutModalProps) {
    const parsedCurrency = parseCurrency(currency, true);

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

    // Fetch delivery zones & promotions
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
            setSelectedBranch(branches[0].name_ar || branches[0].name || '');
        }
    }, [branches, selectedBranch]);

    // Calculate delivery fee & promo discounts
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
            setPromoError('كود الخصم غير صحيح أو منتهي الصلاحية');
            setAppliedPromo(null);
            return;
        }

        setAppliedPromo(found);
        setPromoError('');
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName.trim() || !customerPhone.trim()) {
            alert('يرجى ملء الاسم ورقم الهاتف لمتابعة الطلب.');
            return;
        }

        if (orderType === 'delivery' && !deliveryAddress.trim()) {
            alert('يرجى كتابة عنوان التوصيل بالتفصيل.');
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

            if (error) {
                console.warn("Database order creation notice:", error);
            }

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
            alert("حدث خطأ أثناء إرسال الطلب: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatWhatsAppMessage = () => {
        let msg = `*طلب جديد - ثيم الإمارات 🇦🇪*\n`;
        msg += `*المكان:* ${restaurantName}\n\n`;
        msg += `*العميل:* ${customerName}\n`;
        msg += `*الهاتف:* ${customerPhone}\n`;
        msg += `*نوع الطلب:* ${orderType === 'delivery' ? 'توصيل للمنزل' : 'استلام من الفرع'}\n`;

        if (orderType === 'delivery') {
            msg += `*العنوان:* ${deliveryAddress}\n`;
            if (selectedZone) msg += `*منطقة التوصيل:* ${selectedZone.name_ar || selectedZone.name}\n`;
        } else if (selectedBranch) {
            msg += `*الفرع:* ${selectedBranch}\n`;
        }

        msg += `\n*الطلبات:*\n`;
        cartItems.forEach((item, idx) => {
            msg += `${idx + 1}. ${item.title} x${item.qty} - ${(item.price * item.qty).toFixed(2)} ${parsedCurrency}\n`;
            if (item.size) msg += `   الحجم: ${item.size}\n`;
            if (item.notes) msg += `   ملاحظة: ${item.notes}\n`;
        });

        msg += `\n*المجموع الفرعي:* ${subtotal.toFixed(2)} ${parsedCurrency}\n`;
        if (orderType === 'delivery') msg += `*رسوم التوصيل:* ${deliveryFee.toFixed(2)} ${parsedCurrency}\n`;
        if (discountAmount > 0) msg += `*الخصم:* -${discountAmount.toFixed(2)} ${parsedCurrency}\n`;
        msg += `*الإجمالي الكلي:* ${finalTotal.toFixed(2)} ${parsedCurrency}\n`;

        if (notes) msg += `\n*ملاحظات إضافية:* ${notes}\n`;

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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto rtl text-right">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden my-6"
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
                    <div className="flex items-center gap-2.5">
                        <ShoppingBag className="w-5 h-5 text-amber-500" />
                        <h3 className="font-extrabold text-lg">إتمام إرسال الطلب (ثيم الإمارات)</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
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
                                        ? 'bg-amber-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <MapPin className="w-4 h-4" />
                                <span>توصيل للمنزل</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setOrderType('pickup')}
                                className={`py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                                    orderType === 'pickup'
                                        ? 'bg-amber-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Store className="w-4 h-4" />
                                <span>استلام من الفرع</span>
                            </button>
                        </div>

                        {/* Customer Info */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">الاسم بالكامل *</label>
                                <div className="relative">
                                    <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        required
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        placeholder="مثال: أحمد الإماراتي"
                                        className="w-full pr-10 pl-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">رقم الهاتف والتواصل *</label>
                                <div className="relative">
                                    <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="tel"
                                        required
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value)}
                                        placeholder="+971 50 123 4567"
                                        className="w-full pr-10 pl-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm ltr text-right"
                                    />
                                </div>
                            </div>

                            {orderType === 'delivery' ? (
                                <div className="space-y-3 pt-1">
                                    {deliveryZones.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">منطقة التوصيل</label>
                                            <select
                                                value={selectedZone?.id || ''}
                                                onChange={e => {
                                                    const z = deliveryZones.find(dz => dz.id === e.target.value);
                                                    setSelectedZone(z || null);
                                                }}
                                                className="w-full px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                                            >
                                                {deliveryZones.map(z => (
                                                    <option key={z.id} value={z.id}>
                                                        {z.name_ar || z.name} (+{z.price} {parsedCurrency})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">عنوان التوصيل التفصيلي *</label>
                                        <textarea
                                            rows={2}
                                            required
                                            value={deliveryAddress}
                                            onChange={e => setDeliveryAddress(e.target.value)}
                                            placeholder="المنطقة، الشارع، اسم البناية، الشقة..."
                                            className="w-full px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm resize-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                branches.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">فرع الاستلام</label>
                                        <select
                                            value={selectedBranch}
                                            onChange={e => setSelectedBranch(e.target.value)}
                                            className="w-full px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                                        >
                                            {branches.map((b, i) => (
                                                <option key={i} value={b.name_ar || b.name}>
                                                    {b.name_ar || b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">كود الخصم (اختياري)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Tag className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            value={promoCodeInput}
                                            onChange={e => setPromoCodeInput(e.target.value)}
                                            placeholder="أدخل كود الخصم"
                                            className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 uppercase text-xs"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleApplyPromoCode}
                                        className="px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-amber-400 font-bold text-xs hover:bg-slate-700"
                                    >
                                        تطبيق
                                    </button>
                                </div>
                                {promoError && <p className="text-xs text-rose-400 mt-1">{promoError}</p>}
                                {appliedPromo && <p className="text-xs text-emerald-400 mt-1">تم تطبيق الكود بنجاح!</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ملاحظات إضافية للطلب</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="أي تعليمات إضافية للمطعم أو السائق..."
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Summary Box */}
                        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-300">
                                <span>المجموع الفرعي:</span>
                                <span>{subtotal.toFixed(2)} {parsedCurrency}</span>
                            </div>
                            {orderType === 'delivery' && (
                                <div className="flex justify-between text-slate-300">
                                    <span>رسوم التوصيل:</span>
                                    <span>{deliveryFee.toFixed(2)} {parsedCurrency}</span>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-amber-400 font-bold">
                                    <span>مبلغ الخصم:</span>
                                    <span>-{discountAmount.toFixed(2)} {parsedCurrency}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-extrabold text-sm text-slate-100">
                                <span>المجموع الكلي:</span>
                                <span className="text-amber-400 text-base">{finalTotal.toFixed(2)} {parsedCurrency}</span>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="space-y-2 pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-sm shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                <span>{submitting ? 'جاري إرسال الطلب...' : 'تأكيد وإرسال الطلب'}</span>
                            </button>

                            {whatsappNumber && (
                                <button
                                    type="button"
                                    onClick={handleSendWhatsApp}
                                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>إرسال مباشر عبر واتساب</span>
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
                            <h3 className="text-2xl font-black text-slate-100">تم استلام طلبك بنجاح!</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                شكراً لطلبك من {restaurantName}. تم تسجيل الطلب بنجاح وجاري المتابعة.
                            </p>
                        </div>

                        {whatsappNumber && (
                            <button
                                onClick={handleSendWhatsApp}
                                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <MessageSquare className="w-5 h-5" />
                                <span>إرسال تفاصيل الطلب عبر واتساب</span>
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                        >
                            إغلاق النافذة العودة للمنيو
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
