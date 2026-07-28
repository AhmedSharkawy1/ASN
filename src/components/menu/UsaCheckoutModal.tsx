"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { submitOrder, buildWhatsAppMessage, OrderItem } from "@/lib/helpers/submitOrder";
import { fetchActivePromotions, evaluatePromotions, AppliedPromotion, Promotion, CartItemForPromo } from "@/lib/helpers/promotionEngine";
import { parseCurrency } from "@/lib/currency";
import { FaWhatsapp } from "react-icons/fa";
import { X, Truck, Store, MapPin, Clock, CheckCircle, Loader2, Plus, Minus, Tag, AlertCircle, ShoppingBag } from "lucide-react";

type DeliveryZone = {
    id: string;
    name_ar: string;
    name_en?: string;
    fee: number;
    min_order: number;
    estimated_time: number;
    is_active: boolean;
};

type CheckoutCartItem = OrderItem & {
    categoryType?: 'savory' | 'sweet';
};

type UsaCheckoutModalProps = {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CheckoutCartItem[];
    subtotal: number;
    restaurantId: string;
    restaurantName: string;
    whatsappNumber?: string;
    currency?: string;
    orderChannel?: "whatsapp" | "website" | "both";
    onOrderSuccess?: () => void;
    branches?: string[];
};

export default function UsaCheckoutModal({
    isOpen, onClose, cartItems, subtotal,
    restaurantId, restaurantName, whatsappNumber,
    currency: propCurrency = "EGP", orderChannel = "website", onOrderSuccess,
    branches: propBranches = []
}: UsaCheckoutModalProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const currency = parseCurrency(propCurrency, false);

    // Steps: 1 = Customer Info & Order Method, 2 = Summary & Confirmation, 3 = Success
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [orderNumber, setOrderNumber] = useState<number | null>(null);
    const [finalizedOrderDetails, setFinalizedOrderDetails] = useState<{
        items: OrderItem[];
        subtotal: number;
        extrasTotal: number;
        total: number;
    } | null>(null);

    // Customer info
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");

    // Order type
    const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
    const [address, setAddress] = useState("");
    const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>(propBranches[0] || "");

    // Order type visibility
    const [pickupEnabled, setPickupEnabled] = useState(true);
    const [deliveryEnabled, setDeliveryEnabled] = useState(true);

    // Promotions state
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [appliedPromo, setAppliedPromo] = useState<AppliedPromotion | null>(null);

    // Fetch delivery zones & settings
    useEffect(() => {
        if (!isOpen || !restaurantId) return;

        const loadZonesAndPromos = async () => {
            try {
                // Fetch Delivery Zones
                const { data: zonesData } = await supabase
                    .from('delivery_zones')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_active', true)
                    .order('fee', { ascending: true });

                if (zonesData && zonesData.length > 0) {
                    setZones(zonesData);
                    setSelectedZone(zonesData[0]);
                }

                // Fetch Restaurant Settings
                const { data: restData } = await supabase
                    .from('restaurants')
                    .select('pickup_enabled, delivery_enabled')
                    .eq('id', restaurantId)
                    .single();

                if (restData) {
                    const pickupAllowed = restData.pickup_enabled ?? true;
                    const deliveryAllowed = restData.delivery_enabled ?? true;
                    setPickupEnabled(pickupAllowed);
                    setDeliveryEnabled(deliveryAllowed);

                    if (!deliveryAllowed && pickupAllowed) {
                        setOrderType('pickup');
                    } else if (deliveryAllowed && !pickupAllowed) {
                        setOrderType('delivery');
                    }
                }

                // Fetch Active Promotions
                const activePromos = await fetchActivePromotions(restaurantId);
                setPromotions(activePromos);
            } catch (err) {
                console.error("Error loading checkout data:", err);
            }
        };

        loadZonesAndPromos();
    }, [isOpen, restaurantId]);

    // Delivery fee calculations
    const deliveryFee = orderType === 'delivery' && selectedZone ? selectedZone.fee : 0;

    // Recalculate promotion when order details change
    useEffect(() => {
        if (promotions.length > 0) {
            const promoItems: CartItemForPromo[] = cartItems.map(item => ({
                id: String(item.id),
                title: item.title,
                qty: item.qty,
                price: item.price
            }));
            const currentFee = orderType === 'delivery' && selectedZone ? selectedZone.fee : 0;
            const evaluated = evaluatePromotions(promoItems, promotions, subtotal, currentFee);
            setAppliedPromo(evaluated);
        } else {
            setAppliedPromo(null);
        }
    }, [promotions, cartItems, subtotal, orderType, selectedZone]);

    if (!isOpen) return null;

    const discountAmount = appliedPromo ? appliedPromo.discountAmount : 0;
    const grandTotal = Math.max(0, subtotal + deliveryFee - discountAmount);

    const handleZoneChange = (zoneId: string) => {
        const zone = zones.find(z => z.id === zoneId);
        setSelectedZone(zone || null);
    };

    const validateStep1 = () => {
        setErrorMessage("");
        if (!name.trim()) {
            setErrorMessage("Please enter your full name.");
            return false;
        }
        if (!phone.trim() || phone.trim().length < 8) {
            setErrorMessage("Please enter a valid phone number (at least 8 digits).");
            return false;
        }
        if (orderType === 'delivery') {
            if (!address.trim()) {
                setErrorMessage("Please enter your detailed delivery address.");
                return false;
            }
            if (zones.length > 0 && !selectedZone) {
                setErrorMessage("Please select a delivery zone.");
                return false;
            }
            if (selectedZone && subtotal < selectedZone.min_order) {
                setErrorMessage(`Minimum order for ${selectedZone.name_en || selectedZone.name_ar} is ${selectedZone.min_order} ${currency}.`);
                return false;
            }
        }
        return true;
    };

    const handleProceedToSummary = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleCompleteOrder = async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const formattedItems: OrderItem[] = cartItems.map(item => ({
                id: String(item.id),
                title: item.title,
                qty: item.qty,
                price: item.price,
                size: item.size,
                extras: item.extras,
                notes: item.notes
            }));

            const result = await submitOrder({
                restaurantId,
                customerName: name.trim(),
                customerPhone: phone.trim(),
                customerAddress: orderType === 'delivery' ? address.trim() : undefined,
                notes: notes.trim() || undefined,
                orderType,
                deliveryZoneId: selectedZone?.id,
                deliveryZoneName: selectedZone ? (selectedZone.name_en || selectedZone.name_ar) : undefined,
                deliveryFee,
                items: formattedItems,
                subtotal,
                total: grandTotal,
                paymentMethod: "Cash on Delivery",
                restaurantName,
                promotionId: appliedPromo?.promotion.id,
                promotionName: appliedPromo?.promotion.name_en || appliedPromo?.promotion.name_ar,
                discountAmount,
                discountType: appliedPromo?.promotion.discount_type,
                branchName: selectedBranch || undefined,
                currency
            });

            if (result.success && result.orderNumber) {
                setOrderNumber(result.orderNumber);
                setFinalizedOrderDetails({
                    items: formattedItems,
                    subtotal,
                    extrasTotal: 0,
                    total: grandTotal
                });
                setStep(3);
                if (onOrderSuccess) onOrderSuccess();
            } else {
                setErrorMessage(result.error || "Failed to submit order. Please try again.");
            }
        } catch (err: any) {
            console.error("Order submission error:", err);
            setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSendWhatsApp = () => {
        if (!whatsappNumber || !orderNumber || !finalizedOrderDetails) return;

        const cleanPhone = whatsappNumber.replace(/\+/g, '').replace(/\s+/g, '');
        const message = buildWhatsAppMessage({
            orderNumber,
            restaurantName,
            customerName: name.trim(),
            customerPhone: phone.trim(),
            customerAddress: orderType === 'delivery' ? address.trim() : undefined,
            orderType,
            deliveryZoneName: selectedZone ? (selectedZone.name_en || selectedZone.name_ar) : undefined,
            deliveryFee,
            items: finalizedOrderDetails.items,
            subtotal,
            total: grandTotal,
            notes: notes.trim() || undefined,
            currency,
            language: 'en',
            promotionName: appliedPromo?.promotion.name_en || appliedPromo?.promotion.name_ar,
            discountAmount,
            branchName: selectedBranch || undefined
        });

        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto ltr text-left">
            <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 overflow-hidden my-8">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-500">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-100">
                                {step === 3 ? "Order Confirmed!" : "Complete Checkout"}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">
                                {restaurantName} &bull; English Order Service
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">

                    {errorMessage && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Step 1: Customer Info & Fulfillment */}
                    {step === 1 && (
                        <div className="space-y-6">
                            
                            {/* Fulfillment Method Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Fulfillment Method
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {deliveryEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => setOrderType('delivery')}
                                            className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl font-semibold text-sm border transition-all ${
                                                orderType === 'delivery'
                                                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/20'
                                                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                                            }`}
                                        >
                                            <Truck className="w-4 h-4" />
                                            <span>Home Delivery</span>
                                        </button>
                                    )}

                                    {pickupEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => setOrderType('pickup')}
                                            className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl font-semibold text-sm border transition-all ${
                                                orderType === 'pickup'
                                                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/20'
                                                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                                            }`}
                                        >
                                            <Store className="w-4 h-4" />
                                            <span>Store Pickup</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Customer Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                        Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. John Doe"
                                        className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                        Phone Number <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="e.g. +1 555 019 2831"
                                        className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm"
                                    />
                                </div>

                                {/* Delivery Specific Fields */}
                                {orderType === 'delivery' && (
                                    <>
                                        {zones.length > 0 && (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                                    Delivery Area / Zone <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    value={selectedZone?.id || ""}
                                                    onChange={(e) => handleZoneChange(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-rose-500 text-sm"
                                                >
                                                    {zones.map(z => (
                                                        <option key={z.id} value={z.id}>
                                                            {z.name_en || z.name_ar} ({z.fee > 0 ? `+${z.fee} ${currency}` : 'Free Delivery'})
                                                        </option>
                                                    ))}
                                                </select>
                                                {selectedZone && (
                                                    <div className="flex items-center justify-between mt-2 text-xs text-slate-400 px-1">
                                                        <span>Est. Time: {selectedZone.estimated_time || 30} mins</span>
                                                        <span>Min Order: {selectedZone.min_order} {currency}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                                Delivery Address <span className="text-rose-500">*</span>
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="Street name, building number, floor, apartment..."
                                                className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm resize-none"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Branch Selection (if available) */}
                                {propBranches.length > 1 && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                            Select Preferred Branch
                                        </label>
                                        <select
                                            value={selectedBranch}
                                            onChange={(e) => setSelectedBranch(e.target.value)}
                                            className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-rose-500 text-sm"
                                        >
                                            {propBranches.map((b, i) => (
                                                <option key={i} value={b}>{b}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                        Special Order Notes / Instructions
                                    </label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="e.g. Ring doorbell, extra napkins, cutlery..."
                                        className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm"
                                    />
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Step 2: Order Summary & Review */}
                    {step === 2 && (
                        <div className="space-y-6">
                            
                            {/* Summary Card */}
                            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Customer:</span>
                                    <span className="font-semibold text-slate-200">{name} ({phone})</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Method:</span>
                                    <span className="font-semibold text-slate-200 uppercase">{orderType}</span>
                                </div>
                                {orderType === 'delivery' && address && (
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Address:</span>
                                        <span className="font-semibold text-slate-200 text-right max-w-[220px] truncate">{address}</span>
                                    </div>
                                )}
                            </div>

                            {/* Items List */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Order Items ({cartItems.reduce((s, i) => s + i.qty, 0)})
                                </h4>
                                <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                                    {cartItems.map((item, idx) => (
                                        <div key={idx} className="p-3.5 flex items-start justify-between gap-3 text-sm">
                                            <div className="space-y-0.5">
                                                <div className="font-semibold text-slate-100">
                                                    {item.title} <span className="text-rose-400 text-xs font-bold">x{item.qty}</span>
                                                </div>
                                                {item.size && (
                                                    <p className="text-xs text-slate-400">Size: {item.size}</p>
                                                )}
                                                {item.extras && item.extras.length > 0 && (
                                                    <p className="text-xs text-slate-400">
                                                        Addons: {item.extras.map(e => `${e.name} (x${e.qty})`).join(', ')}
                                                    </p>
                                                )}
                                                {item.notes && (
                                                    <p className="text-xs text-rose-300 italic">Note: "{item.notes}"</p>
                                                )}
                                            </div>
                                            <div className="font-bold text-slate-200 flex-shrink-0">
                                                {((item.price + (item.extras?.reduce((s, e) => s + e.price * e.qty, 0) || 0)) * item.qty).toFixed(2)} {currency}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Active Promotion Badge */}
                            {appliedPromo && (
                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4" />
                                        <span>Promotion Applied: {appliedPromo.promotion.name_en || appliedPromo.promotion.name_ar}</span>
                                    </div>
                                    <span className="font-bold">-{discountAmount.toFixed(2)} {currency}</span>
                                </div>
                            )}

                            {/* Pricing Breakdown */}
                            <div className="space-y-2 pt-2 border-t border-slate-800 text-sm">
                                <div className="flex justify-between text-slate-400">
                                    <span>Subtotal</span>
                                    <span className="font-medium text-slate-200">{subtotal.toFixed(2)} {currency}</span>
                                </div>
                                {orderType === 'delivery' && (
                                    <div className="flex justify-between text-slate-400">
                                        <span>Delivery Fee</span>
                                        <span className="font-medium text-slate-200">
                                            {deliveryFee > 0 ? `${deliveryFee.toFixed(2)} ${currency}` : 'Free'}
                                        </span>
                                    </div>
                                )}
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-400">
                                        <span>Discount</span>
                                        <span className="font-medium">-{discountAmount.toFixed(2)} {currency}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-bold text-slate-100 pt-3 border-t border-slate-800">
                                    <span>Total Amount</span>
                                    <span className="text-rose-400">{grandTotal.toFixed(2)} {currency}</span>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Step 3: Success Screen */}
                    {step === 3 && (
                        <div className="text-center py-6 space-y-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                                <CheckCircle className="w-10 h-10" />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold text-slate-100">Order Received!</h3>
                                <p className="text-sm text-slate-400">
                                    Thank you, <span className="text-slate-200 font-semibold">{name}</span>. Your order has been placed successfully.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 inline-block text-center min-w-[200px]">
                                <span className="text-xs uppercase tracking-wider text-slate-400 block mb-0.5">Order Number</span>
                                <span className="text-3xl font-black text-rose-500">#{orderNumber}</span>
                            </div>

                            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                                We are preparing your order. You can also send this order directly to our WhatsApp team for quick confirmation.
                            </p>

                            {whatsappNumber && (
                                <button
                                    onClick={handleSendWhatsApp}
                                    className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20 transition-all text-sm"
                                >
                                    <FaWhatsapp className="w-5 h-5" />
                                    <span>Send Order via WhatsApp</span>
                                </button>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer Buttons */}
                <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center gap-3">
                    {step === 1 && (
                        <button
                            type="button"
                            onClick={handleProceedToSummary}
                            className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/20 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            <span>Review Order & Summary</span>
                        </button>
                    )}

                    {step === 2 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                disabled={loading}
                                className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all text-sm"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleCompleteOrder}
                                disabled={loading}
                                className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/20 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Submitting Order...</span>
                                    </>
                                ) : (
                                    <span>Confirm & Place Order ({grandTotal.toFixed(2)} {currency})</span>
                                )}
                            </button>
                        </>
                    )}

                    {step === 3 && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all text-sm"
                        >
                            Done & Back to Menu
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
