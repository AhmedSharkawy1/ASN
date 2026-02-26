"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef } from "react";
import { ShoppingCart, MapPin } from "lucide-react";
import { FaWhatsapp, FaFacebook } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

type Item = {
    id: string;
    title_ar: string;
    title_en?: string;
    desc_ar?: string;
    desc_en?: string;
    prices: number[];
    size_labels: string[];
    is_popular: boolean;
    is_spicy: boolean;
    image_url?: string;
    is_available: boolean;
};

type Category = {
    id: string;
    name_ar: string;
    name_en?: string;
    emoji?: string;
    image_url?: string;
    items: Item[];
};

type RestaurantConfig = {
    name: string;
    theme: string;
    phone?: string;
    whatsapp_number?: string;
    facebook_url?: string;
    instagram_url?: string;
    tiktok_url?: string;
    map_link?: string;
    logo_url?: string;
    cover_url?: string;
    phone_numbers?: { label: string; number: string }[];
};

type CartItem = {
    id: string;
    item: Item;
    price: number;
    size_label: string;
    quantity: number;
};

interface Props {
    config: RestaurantConfig;
    categories: Category[];
    language: string;
}

export default function PizzaPastaMenu({ config, categories, language }: Props) {
    const [activeSection, setActiveSection] = useState<string>(categories[0]?.id || "");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: Item; catName: string } | null>(null);
    const [tempSizeIdx, setTempSizeIdx] = useState(0);
    const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "" });
    const [showCallMenu, setShowCallMenu] = useState(false);
    const [showCategoriesModal, setShowCategoriesModal] = useState(false);
    const navScrollRef = useRef<HTMLDivElement>(null);

    const triggerHaptic = (ms: number = 10) => {
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
    };

    const scrollNav = (dir: "left" | "right") => {
        if (navScrollRef.current) {
            navScrollRef.current.scrollBy({ left: dir === "left" ? -150 : 150, behavior: "smooth" });
        }
    };

    const handleNavClick = (id: string) => {
        triggerHaptic(10);
        setShowCategoriesModal(false);
        setActiveSection(id);
        const el = document.getElementById(`section-${id}`);
        if (el) {
            const offset = 160;
            const pos = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: pos, behavior: "smooth" });
        }
    };

    // ---- Cart Logic ----
    const openItemSelect = (item: Item, catName: string, priceIdx: number) => {
        triggerHaptic(20);
        setSelectedItem({ item, catName });
        setTempSizeIdx(priceIdx);
    };

    const addToCart = () => {
        if (!selectedItem) return;
        const { item } = selectedItem;
        const price = item.prices ? parseFloat(item.prices[tempSizeIdx]?.toString()) : 0;
        const sizeLabel = item.size_labels?.[tempSizeIdx] || "عادي";
        const cartId = `${item.id}-${sizeLabel}`;

        setCart((prev) => {
            const existing = prev.find((c) => c.id === cartId);
            if (existing) return prev.map((c) => (c.id === cartId ? { ...c, quantity: c.quantity + 1 } : c));
            return [...prev, { id: cartId, item, price, size_label: sizeLabel, quantity: 1 }];
        });
        setSelectedItem(null);
        triggerHaptic(30);
    };

    const updateCartQty = (id: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((c) => (c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c))
                .filter((c) => c.quantity > 0)
        );
        triggerHaptic(5);
    };

    const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

    const checkOutWhatsApp = () => {
        if (!config.whatsapp_number) {
            alert("⚠️ المطعم لم يقم بتوفير رقم واتساب للطلبات.");
            return;
        }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            alert("⚠️ يرجى إدخال جميع البيانات (الاسم، الموبايل، العنوان) لإتمام الطلب");
            return;
        }
        let message = `*🧾 فاتورة طلب جديدة - ${config.name}*\n`;
        message += `------------------------------\n`;
        message += `👤 *الاسم:* ${customerInfo.name}\n`;
        message += `📞 *الموبايل:* ${customerInfo.phone}\n`;
        message += `📍 *العنوان:* ${customerInfo.address}\n`;
        message += `------------------------------\n`;
        message += `*📋 الأصناف المطلوبة:*\n\n`;
        cart.forEach((c, idx) => {
            message += `${idx + 1}. ✨ *${c.item.title_ar}*\n`;
            if (c.size_label && c.item.size_labels?.length > 1) message += `   📏 الحجم: ${c.size_label}\n`;
            message += `   💵 السعر: ${c.price} ج\n`;
            message += `   🔢 الكمية: ${c.quantity}\n`;
            message += `   💰 المجموع: *${c.price * c.quantity} ج*\n\n`;
        });
        message += `------------------------------\n`;
        message += `*💵 الإجمالي المطلوب: ${cartTotal} ج*\n`;
        message += `------------------------------\n`;
        message += `🚚 *تنبيه:* السعر غير شامل خدمة التوصيل.\n`;
        window.open(`https://wa.me/${config.whatsapp_number.replace(/\+/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
        setCart([]);
        setShowCart(false);
    };

    const isAr = language === "ar";

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-zinc-200 antialiased selection:bg-rose-500/30 font-cairo" dir="rtl">

            {/* ===== HEADER ===== */}
            <header className="relative z-50 bg-white dark:bg-[#050505] border-b border-zinc-200 dark:border-white/10">
                <div className="max-w-2xl mx-auto px-5 py-4 md:py-6 text-right">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3 group">
                            {config.logo_url && (
                                <div className="w-16 h-16 relative flex items-center justify-center overflow-hidden rounded-full border-2 border-rose-600 shadow-xl bg-white dark:bg-zinc-900 p-1 group-hover:rotate-12 transition-transform duration-500">
                                    <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain rounded-full" />
                                    <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            )}
                            <div className="flex flex-col">
                                <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none italic uppercase -mb-1">
                                    {config.name}
                                </h1>
                                <span className="text-rose-600 dark:text-rose-500 text-[10px] font-black uppercase tracking-[0.1em] mt-1">
                                    {isAr ? "مذاق إيطالي أصيل" : "Delicious Italian Taste"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex w-full gap-3">
                        {(config.phone || (config.phone_numbers && config.phone_numbers.length > 0)) && (
                            <div className="flex-1 relative">
                                <button
                                    onClick={() => { setShowCallMenu(!showCallMenu); triggerHaptic(10); }}
                                    className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.96] shadow-xl text-[13px] border ${showCallMenu ? "bg-zinc-900 text-white border-zinc-800" : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/10"}`}
                                >
                                    <span className="text-xl animate-emoji">📞</span>
                                    <span>{isAr ? "اتصل للطلب" : "Call to Order"}</span>
                                </button>
                                {showCallMenu && (
                                    <>
                                        <div className="fixed inset-0 z-[-1] bg-black/40 backdrop-blur-[4px]" onClick={() => setShowCallMenu(false)}></div>
                                        <div className="absolute top-full mt-3 left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden animate-slideUp z-50">
                                            {config.phone && (
                                                <a href={`tel:${config.phone}`} className="flex items-center justify-between px-5 py-4 hover:bg-rose-50 dark:hover:bg-rose-500/5 border-b last:border-0 border-zinc-100 dark:border-white/5 transition-all group">
                                                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{isAr ? "الرقم الأساسي" : "Main"}</span>
                                                    <span className="text-[15px] font-black tabular-nums text-rose-600 dark:text-rose-500 flex items-center gap-2" dir="ltr">
                                                        {config.phone} <span className="group-hover:animate-emoji text-xs">📞</span>
                                                    </span>
                                                </a>
                                            )}
                                            {config.phone_numbers?.map((pn, idx) => (
                                                <a key={idx} href={`tel:${pn.number}`} className="flex items-center justify-between px-5 py-4 hover:bg-rose-50 dark:hover:bg-rose-500/5 border-b last:border-0 border-zinc-100 dark:border-white/5 transition-all group">
                                                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{pn.label || `${isAr ? 'رقم' : 'Line'} ${idx + 1}`}</span>
                                                    <span className="text-[15px] font-black tabular-nums text-rose-600 dark:text-rose-500 flex items-center gap-2" dir="ltr">
                                                        {pn.number} <span className="group-hover:animate-emoji text-xs">📞</span>
                                                    </span>
                                                </a>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {config.facebook_url && (
                            <a href={config.facebook_url} target="_blank" rel="noopener noreferrer"
                                className="flex-1 bg-[#1877F2] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl text-[13px] border border-white/10 active:scale-95 transition-transform">
                                <FaFacebook className="w-5 h-5" />
                                <span className="animate-popular">{isAr ? "فيسبوك" : "Facebook"}</span>
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* ===== STICKY NAV ===== */}
            <nav className="sticky top-0 z-40 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-xl border-b border-zinc-200 dark:border-white/10 shadow-sm">
                <div className="max-w-2xl mx-auto relative flex items-center">
                    <button onClick={() => scrollNav("right")} className="absolute right-0 z-10 w-10 h-full flex items-center justify-center bg-gradient-to-l from-white dark:from-[#050505] to-transparent md:hidden">
                        <span className="text-rose-600 font-bold text-lg">›</span>
                    </button>
                    <div ref={navScrollRef} className="flex gap-2 overflow-x-auto px-10 py-4 scroll-smooth" style={{ scrollbarWidth: "none" }}>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleNavClick(cat.id)}
                                className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[12px] font-black border transition-all duration-300 ${activeSection === cat.id
                                    ? "bg-rose-600 text-white border-rose-500 scale-105 shadow-md"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-500"
                                    }`}
                            >
                                {cat.emoji && <span className="ml-1">{cat.emoji}</span>}
                                {isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => scrollNav("left")} className="absolute left-0 z-10 w-10 h-full flex items-center justify-center bg-gradient-to-r from-white dark:from-[#050505] to-transparent md:hidden">
                        <span className="text-rose-600 font-bold text-lg">‹</span>
                    </button>
                </div>
            </nav>

            {/* ===== FLOATING CART BAR ===== */}
            <AnimatePresence>
                {cart.length > 0 && !showCart && !selectedItem && (
                    <motion.button
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        onClick={() => { setShowCart(true); triggerHaptic(20); }}
                        className="fixed bottom-24 right-6 left-6 z-[70] bg-rose-600 text-white p-5 rounded-3xl shadow-2xl flex items-center justify-between animate-reveal border border-white/20 hover:scale-[1.02] transition-transform"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white text-rose-600 w-7 h-7 rounded-xl flex items-center justify-center font-black text-sm shadow-inner animate-popular">{cart.length}</div>
                            <span className="font-black text-base">{isAr ? "مراجعة الفاتورة والطلب" : "Review order"}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="font-black text-lg leading-none">{cartTotal} {isAr ? "ج" : "EGP"}</span>
                            <span className="text-[10px] opacity-70 font-bold">{isAr ? "الإجمالي" : "Total"}</span>
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ===== MAIN CONTENT ===== */}
            <main className="max-w-2xl mx-auto px-5 py-8 pb-12">
                {categories.map((cat) => (
                    <section key={cat.id} id={`section-${cat.id}`} className="mb-6 scroll-mt-[170px]">

                        {/* Section Cover Image */}
                        <div className="relative aspect-[16/10] md:aspect-[21/9] rounded-[2rem] overflow-hidden mb-4 shadow-2xl border border-zinc-200 dark:border-white/5 bg-zinc-200 dark:bg-zinc-900 group">
                            {cat.image_url ? (
                                <img src={cat.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-rose-600/30 via-zinc-900 to-rose-900/50 flex items-center justify-center">
                                    <span className="text-6xl opacity-50">{cat.emoji || "🍽️"}</span>
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                            <div className="absolute bottom-6 right-6 left-6 text-right">
                                <div className="flex flex-col gap-1">
                                    <span className="text-rose-500 font-black text-[10px] tracking-[0.2em] uppercase drop-shadow-md">{isAr ? "فئة القائمة" : "Menu Category"}</span>
                                    <div className="flex items-center gap-2 justify-end">
                                        <span className="text-2xl leading-none animate-emoji drop-shadow-lg">{cat.emoji}</span>
                                        <h2 className="text-2xl font-black text-white leading-none drop-shadow-lg">
                                            {isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}
                                        </h2>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Container */}
                        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] p-4 md:p-6 border border-zinc-200 dark:border-white/10 shadow-xl">
                            <div className="mb-4 pb-3 border-b border-zinc-100 dark:border-white/5 text-center">
                                <p className="text-[10px] font-black text-rose-600 dark:text-rose-500 uppercase tracking-widest bg-rose-50/50 dark:bg-rose-900/10 py-2.5 rounded-xl border border-rose-100 dark:border-rose-900/20">
                                    ✨ {isAr ? "اضغط على السعر للاختيار والإضافة للسلة" : "Tap a price to select & add to cart"} ✨
                                </p>
                            </div>

                            <div className="divide-y divide-zinc-100 dark:divide-white/5">
                                {cat.items.map((item) => {
                                    const hasManyPrices = item.prices?.length >= 3;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`py-3 group transition-all -mx-2 px-2 rounded-2xl border border-transparent flex gap-3
                                                ${hasManyPrices ? "flex-col" : "items-center justify-between"}
                                                hover:bg-rose-50/30 dark:hover:bg-rose-900/5 hover:border-rose-100 dark:hover:border-rose-900/10`}
                                        >
                                            {/* Item Info */}
                                            <div className={`flex flex-col gap-0.5 flex-1 min-w-0 text-right ${hasManyPrices ? "w-full pr-0" : "pr-1"}`}>
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <div className="flex items-center gap-1 order-1">
                                                        {item.is_popular && <span className="bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md animate-popular">مميز</span>}
                                                        {item.is_spicy && <span className="animate-spicy text-xs leading-none">🌶️</span>}
                                                    </div>
                                                    <span className="text-zinc-900 dark:text-zinc-100 font-black text-lg leading-tight group-hover:text-rose-600 transition-colors order-2 text-right w-full">
                                                        {isAr ? item.title_ar : (item.title_en || item.title_ar)}
                                                    </span>
                                                </div>
                                                {(item.desc_ar || item.desc_en) && (
                                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold leading-tight line-clamp-2">
                                                        {isAr ? item.desc_ar : (item.desc_en || item.desc_ar)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Prices */}
                                            <div className={`${hasManyPrices ? "grid grid-cols-3 gap-2 w-full mt-2" : "flex gap-2 items-center shrink-0"}`}>
                                                {item.prices?.map((price, pIdx) => (
                                                    <button
                                                        key={pIdx}
                                                        onClick={() => openItemSelect(item, isAr ? cat.name_ar : (cat.name_en || cat.name_ar), pIdx)}
                                                        className={`flex flex-col items-center gap-1 transition-all group/btn
                                                            ${hasManyPrices
                                                                ? "bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl py-2 px-1 active:scale-95 hover:border-rose-500/50"
                                                                : "active:scale-90"
                                                            }`}
                                                    >
                                                        {item.size_labels?.[pIdx] && (
                                                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-tighter">
                                                                {item.size_labels[pIdx]}
                                                            </span>
                                                        )}
                                                        <div className={`flex items-center justify-center gap-0.5
                                                            ${hasManyPrices ? "" : "bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/5 hover:border-rose-500/40 shadow-sm"}`}
                                                        >
                                                            <span className={`${hasManyPrices ? "text-rose-600 dark:text-rose-500 text-lg" : "text-rose-600 text-base"} font-black leading-none tabular-nums`}>{price}</span>
                                                            <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-black">{isAr ? "ج" : "EGP"}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                ))}

                {/* Footer */}
                <footer className="mt-12 py-16 border-t border-zinc-200 dark:border-white/10 text-center space-y-10 pb-44">
                    {config.logo_url && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-24 h-24 relative flex items-center justify-center overflow-hidden rounded-full border-2 border-rose-600 shadow-xl bg-white dark:bg-zinc-900 p-1 mb-2">
                                <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain rounded-full" />
                            </div>
                        </div>
                    )}
                    <div className="space-y-1 opacity-50 hover:opacity-100 transition-opacity">
                        <a href="/" target="_blank" className="text-rose-600 font-black text-[9px] block tracking-wider">
                            {isAr ? "مدعوم بواسطة" : "Powered by"} ASN Technology
                        </a>
                    </div>
                </footer>
            </main>

            {/* ===== ADD-TO-CART / CUSTOMIZATION MODAL ===== */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-10 md:p-24"
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[82vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
                                <button onClick={() => setSelectedItem(null)} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center font-black transition-all active:scale-90 hover:bg-rose-600 hover:text-white">✕</button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-none">{isAr ? selectedItem.item.title_ar : (selectedItem.item.title_en || selectedItem.item.title_ar)}</h3>
                                    <p className="text-[10px] text-rose-600 font-black mt-1 uppercase tracking-widest">{selectedItem.catName}</p>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ scrollbarWidth: "none" }}>
                                <div>
                                    <h4 className="text-[11px] font-black text-right mb-4 text-zinc-400 uppercase tracking-widest">{isAr ? "اختر الحجم" : "Select Size"}</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(selectedItem.item.prices?.length > 0 ? selectedItem.item.prices : [0]).map((p, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { setTempSizeIdx(idx); triggerHaptic(5); }}
                                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${tempSizeIdx === idx ? "border-rose-600 bg-rose-50 dark:bg-rose-900/10" : "border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/5"}`}
                                            >
                                                <span className={`text-[9px] font-black uppercase ${tempSizeIdx === idx ? "text-rose-600" : "text-zinc-400"}`}>
                                                    {selectedItem.item.size_labels?.[idx] || "عادي"}
                                                </span>
                                                <span className="text-xl font-black tabular-nums">{p} {isAr ? "ج" : "EGP"}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-zinc-50 dark:bg-white/5 border-t border-zinc-100 dark:border-white/5">
                                <button
                                    onClick={addToCart}
                                    className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all text-base"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    {isAr ? "إضافة للطلب - " : "Add to Order - "}
                                    {selectedItem.item.prices?.[tempSizeIdx] || 0} {isAr ? "ج" : "EGP"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== CHECKOUT MODAL ===== */}
            <AnimatePresence>
                {showCart && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10 md:p-32"
                        onClick={() => setShowCart(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[82vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
                                <button onClick={() => setShowCart(false)} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center font-black transition-all active:scale-90 hover:bg-rose-600 hover:text-white">✕</button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black italic">🛒 {isAr ? "مراجعة وتأكيد" : "Review & Confirm"}</h3>
                                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">{isAr ? "أكمل بياناتك لمتابعة الطلب" : "Complete details to proceed"}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ scrollbarWidth: "none" }}>
                                {/* Customer Form */}
                                <div className="space-y-6">
                                    <h4 className="text-sm font-black text-right text-zinc-900 dark:text-white flex items-center justify-end gap-2">
                                        {isAr ? "بيانات التوصيل" : "Delivery Details"} <span className="text-xl">📍</span>
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-zinc-400 mr-2 tracking-widest">{isAr ? "الاسم" : "Name"}</label>
                                            <input type="text" value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                                className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-white/10 p-4 rounded-xl outline-none focus:border-rose-600 transition-all font-bold text-right text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-zinc-400 mr-2 tracking-widest">{isAr ? "الموبايل" : "Phone"}</label>
                                            <input type="tel" value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                                className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-white/10 p-4 rounded-xl outline-none focus:border-rose-600 transition-all font-bold text-right tabular-nums text-sm" dir="ltr" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-zinc-400 mr-2 tracking-widest">{isAr ? "العنوان" : "Address"}</label>
                                            <textarea value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                                                className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-white/10 p-4 rounded-xl outline-none focus:border-rose-600 transition-all font-bold text-right min-h-[100px] text-sm" />
                                        </div>
                                    </div>
                                </div>

                                {/* Cart Items */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-right text-zinc-400 uppercase tracking-widest">{isAr ? "محتويات السلة" : "Cart Items"}</h4>
                                    <div className="space-y-3">
                                        {cart.map((c) => (
                                            <div key={c.id} className="bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-zinc-100 dark:border-white/5 flex items-center justify-between">
                                                <div className="flex-1 text-right">
                                                    <h4 className="font-black text-sm">{isAr ? c.item.title_ar : (c.item.title_en || c.item.title_ar)}</h4>
                                                    <p className="text-[9px] text-zinc-500 font-bold">{c.size_label !== "عادي" ? c.size_label : ""}</p>
                                                    <p className="text-xs font-black mt-1 text-rose-600">{c.price * c.quantity} {isAr ? "ج" : "EGP"}</p>
                                                </div>
                                                <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800 p-1 rounded-xl shadow-sm border border-zinc-100 dark:border-white/10">
                                                    <button onClick={() => updateCartQty(c.id, 1)} className="w-7 h-7 flex items-center justify-center bg-rose-600 text-white rounded-lg font-black text-sm">+</button>
                                                    <span className="font-black text-sm tabular-nums w-4 text-center">{c.quantity}</span>
                                                    <button onClick={() => updateCartQty(c.id, -1)} className="w-7 h-7 flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 rounded-lg font-black text-sm">-</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/5">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className="flex flex-col items-start">
                                        <span className="text-2xl font-black tabular-nums text-rose-600">{cartTotal} {isAr ? "ج" : "EGP"}</span>
                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{isAr ? "إجمالي الحساب" : "Total Amount"}</span>
                                    </div>
                                    <span className="text-base font-black text-zinc-500">{isAr ? "الحساب الكلي" : "Grand Total"}</span>
                                </div>
                                <button onClick={checkOutWhatsApp}
                                    className="w-full bg-[#25D366] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-base flex items-center justify-center gap-3">
                                    <FaWhatsapp className="w-6 h-6" />
                                    {isAr ? "تأكيد الطلب عبر واتساب" : "Confirm via WhatsApp"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== CATEGORIES FULLSCREEN MODAL ===== */}
            <AnimatePresence>
                {showCategoriesModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowCategoriesModal(false)}
                    >
                        <div className="w-full max-w-sm bg-white dark:bg-[#09090b] rounded-[2rem] shadow-2xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setShowCategoriesModal(false)} className="absolute top-6 left-6 w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center font-black transition-all active:scale-90 hover:bg-rose-600 hover:text-white z-10">✕</button>
                            <div className="p-8 text-center border-b border-zinc-100 dark:border-white/5">
                                <h3 className="text-lg font-black text-zinc-900 dark:text-white">{isAr ? "أقسام المنيو" : "Menu Sections"}</h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleNavClick(cat.id)}
                                        className="flex flex-row-reverse items-center justify-between bg-zinc-50 dark:bg-[#1c1c1e] hover:bg-rose-600 hover:text-white p-4 rounded-xl border border-zinc-100 dark:border-white/5 active:scale-95 transition-all group"
                                    >
                                        <span className="text-[11px] font-black group-hover:text-white">{isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}</span>
                                        <span className="text-xl group-hover:animate-emoji">{cat.emoji}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== BOTTOM GLASS DOCK ===== */}
            <nav className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-8 pt-2">
                <div className="max-w-xl mx-auto bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 rounded-[2.5rem] p-1.5 flex items-center justify-around shadow-xl relative">
                    {config.whatsapp_number && (
                        <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, "")}`} className="flex-1 flex flex-col items-center py-2 text-[#25D366] active:scale-90 transition-transform">
                            <FaWhatsapp className="w-6 h-6" />
                            <span className="text-[8px] font-black text-zinc-400 mt-1 uppercase">{isAr ? "واتساب" : "WhatsApp"}</span>
                        </a>
                    )}

                    {config.phone && (
                        <a href={`tel:${config.phone}`} className="flex-1 flex flex-col items-center py-2 text-zinc-500 active:scale-90 transition-transform">
                            <span className="text-xl">📞</span>
                            <span className="text-[8px] font-black text-zinc-400 mt-1 uppercase">{isAr ? "اتصال" : "Call"}</span>
                        </a>
                    )}

                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="bg-rose-600 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg -mt-10 border-4 border-white dark:border-[#050505] active:scale-90 z-[63] transition-all"
                    >
                        <span className="text-xl">🔝</span>
                    </button>

                    {config.map_link && (
                        <a href={config.map_link} target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col items-center py-2 text-zinc-500 active:scale-90 transition-transform">
                            <MapPin className="w-5 h-5" />
                            <span className="text-[8px] font-black text-zinc-400 mt-1 uppercase">{isAr ? "الموقع" : "Location"}</span>
                        </a>
                    )}

                    <button
                        onClick={() => { setShowCategoriesModal(true); triggerHaptic(10); }}
                        className="flex-1 flex flex-col items-center py-2 text-zinc-500 active:scale-90 transition-all"
                    >
                        <svg className="w-6 h-6 animate-popular" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 6H20M9 12H20M9 18H20M5 6V6.01M5 12V12.01M5 18V18.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[8px] font-black text-zinc-400 mt-1 uppercase">{isAr ? "المنيو" : "Menu"}</span>
                    </button>
                </div>
            </nav>

            <style jsx global>{`
                .font-cairo { font-family: var(--font-cairo), 'Cairo', sans-serif; }
            `}</style>
        </div>
    );
}
