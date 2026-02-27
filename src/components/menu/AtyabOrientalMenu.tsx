"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { ShoppingCart, X, MapPin, Phone } from "lucide-react";
import { FaWhatsapp, FaFacebook } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types (same as PizzaPastaMenu) ───
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
    payment_methods?: {
        id: string;
        name_ar: string;
        name_en: string;
        desc_ar: string;
        desc_en: string;
        number?: string;
        link?: string;
    }[];
};

type CartItem = {
    id: string;
    item: Item;
    price: number;
    size_label: string;
    quantity: number;
};

type Props = {
    config: RestaurantConfig;
    categories: Category[];
    language: string;
};

/**
 * THEME: Atyab Modern Oriental
 * ----------------------------
 * Professional, High-Contrast, Interactive.
 * Primary: #eab308 (Gold/Yellow)
 * Background: Dark (#050505) with Glassmorphism.
 * Typography: Cairo (Arabic-focused Sans-Serif).
 * Features: Floating emojis, Haptic feedback, Sticky nav, Category banners.
 */
export default function AtyabOrientalMenu({ config, categories, language }: Props) {
    const isAr = language === "ar";

    // Dark mode via next-themes
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const toggleDarkMode = () => setTheme(isDark ? 'light' : 'dark');

    // State
    const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || "");
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: Item; cName: string } | null>(null);
    const [tempSizeIdx, setTempSizeIdx] = useState(0);
    const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "" });
    const [showCallMenu, setShowCallMenu] = useState(false);
    const [showCategoriesGrid, setShowCategoriesGrid] = useState(false);
    const [showPaymentOptions, setShowPaymentOptions] = useState(false);

    const navRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);

    // ─── Intersection Observer for active section ───
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveCategory(entry.target.id);
                });
            },
            { root: null, rootMargin: "-180px 0px -40% 0px", threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(`atyab-${cat.id}`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories]);

    useEffect(() => {
        if (activeCategory && navRef.current) {
            const btn = navRef.current.querySelector(`[data-cat-id="${activeCategory}"]`);
            btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
    }, [activeCategory]);

    // ─── Haptic ───
    const haptic = (ms: number | number[] = 10) => {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
    };

    // ─── Nav click → smooth scroll ───
    const handleNavClick = (id: string) => {
        haptic(10);
        setShowCategoriesGrid(false);
        const el = document.getElementById(`atyab-${id}`);
        if (el) {
            isManualScroll.current = true;
            setActiveCategory(id);
            const top = el.getBoundingClientRect().top + window.pageYOffset - 170;
            window.scrollTo({ top, behavior: "auto" });
            setTimeout(() => { isManualScroll.current = false; }, 150);
        }
    };

    const scrollNav = (dir: "left" | "right") => {
        navRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
        haptic(5);
    };

    // ─── Cart Logic ───
    const openItemSelect = (item: Item, cName: string) => {
        setSelectedItem({ item, cName });
        setTempSizeIdx(0);
        haptic(10);
    };

    const addToCart = () => {
        if (!selectedItem) return;
        const { item } = selectedItem;
        const price = item.prices ? parseFloat(item.prices[tempSizeIdx]?.toString()) : 0;
        const sizeLabel = item.size_labels?.[tempSizeIdx] || "عادي";
        const cartId = `${item.id}-${sizeLabel}`;
        setCart((prev) => {
            const ex = prev.find((c) => c.id === cartId);
            if (ex) return prev.map((c) => (c.id === cartId ? { ...c, quantity: c.quantity + 1 } : c));
            return [...prev, { id: cartId, item, price, size_label: sizeLabel, quantity: 1 }];
        });
        setSelectedItem(null);
        haptic(20);
    };

    const updateCartQty = (id: string, delta: number) => {
        setCart((prev) =>
            prev.map((c) => (c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)).filter((c) => c.quantity > 0)
        );
        haptic(5);
    };

    const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

    const checkOutWhatsApp = () => {
        if (!config.whatsapp_number) { alert(isAr ? "عذراً، لم يتم توفير رقم واتساب." : "No WhatsApp number available."); return; }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            alert(isAr ? "⚠️ يرجى إدخال جميع البيانات" : "⚠️ Please fill all fields");
            return;
        }

        if (config.payment_methods && config.payment_methods.length > 0) {
            setShowPaymentOptions(true); // Open payment selection instead
        } else {
            finalizeOrder(); // Direct checkout if no optional payments defined
        }
    };

    const finalizeOrder = (selectedPaymentName?: string) => {
        let msg = `*🧾 فاتورة طلب جديدة - ${config.name}*\n------------------------------\n`;
        msg += `👤 *الاسم:* ${customerInfo.name}\n📞 *الموبايل:* ${customerInfo.phone}\n📍 *العنوان:* ${customerInfo.address}\n`;
        if (selectedPaymentName) {
            msg += `💳 *طريقة الدفع:* ${selectedPaymentName}\n`;
        }
        msg += `------------------------------\n*📋 الأصناف:*\n\n`;
        cart.forEach((c, i) => {
            msg += `${i + 1}. ✨ *${isAr ? c.item.title_ar : c.item.title_en || c.item.title_ar}*\n`;
            if (c.size_label !== "عادي") msg += `   📏 ${c.size_label}\n`;
            msg += `   💵 ${c.price} ج × ${c.quantity} = *${c.price * c.quantity} ج*\n\n`;
        });
        msg += `------------------------------\n*💵 الإجمالي: ${cartTotal} ج*\n🚚 غير شامل التوصيل`;

        window.open(`https://wa.me/${config.whatsapp_number?.replace(/\+/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");

        setCart([]);
        setShowCart(false);
        setShowPaymentOptions(false);
    };

    // ─── Filter Logic ───
    const activeCatData = categories.find((c) => c.id === activeCategory);
    let filteredItems = activeCatData?.items || [];
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filteredItems = categories.flatMap((c) => c.items).filter((item) =>
            item.title_ar.toLowerCase().includes(q) || item.title_en?.toLowerCase().includes(q)
        );
    }

    const currency = isAr ? "ج" : "EGP";

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-zinc-200 antialiased selection:bg-yellow-500/30" style={{ fontFamily: "'Cairo', sans-serif" }}>

            {/* ═══════ HEADER ═══════ */}
            <header className="relative z-50 bg-white dark:bg-[#050505] border-b border-zinc-200 dark:border-white/10 pt-[env(safe-area-inset-top,0px)]">
                <div className="max-w-2xl mx-auto px-5 py-4 md:py-6 text-right">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3 group">
                            {config.logo_url && (
                                <div className="w-16 h-16 relative flex items-center justify-center overflow-hidden rounded-full border-2 border-[#eab308] shadow-xl bg-white dark:bg-zinc-900 transition-transform group-hover:rotate-12 duration-500 p-1">
                                    <img src={config.logo_url} alt="Logo" className="w-full h-full object-cover scale-110" loading="eager" />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none italic uppercase -mb-1">
                                    {config.name}
                                </h1>
                                {config.phone && (
                                    <span className="text-[#eab308] text-[11px] font-black uppercase tracking-[0.1em] mt-1">
                                        {isAr ? "مذاقات أصيلة" : "Authentic Flavors"}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={toggleDarkMode} className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl transition-all active:scale-90 border border-zinc-200 dark:border-white/10 shadow-sm" suppressHydrationWarning>
                            {isDark ? '☀️' : '🌙'}
                        </button>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex w-full gap-3 relative">
                        <div className="flex-1 relative">
                            <button
                                onClick={() => { haptic(); setShowCallMenu(!showCallMenu); }}
                                className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.96] shadow-xl text-[14px] border ${showCallMenu ? "bg-zinc-900 text-white border-zinc-800" : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/10"}`}
                            >
                                <Phone className="w-5 h-5" />
                                <span>{isAr ? "اتصل بنا" : "Call Us"}</span>
                            </button>

                            {/* Call Menu Dropdown */}
                            <AnimatePresence>
                                {showCallMenu && (
                                    <>
                                        <div className="fixed inset-0 z-[-1] bg-black/40 backdrop-blur-[4px]" onClick={() => setShowCallMenu(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                            className="absolute top-full mt-3 left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden z-50"
                                        >
                                            <div className="px-4 py-2 bg-zinc-50 dark:bg-white/5 border-b border-zinc-100 dark:border-white/5">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isAr ? "خطوط الطلبات" : "Order Lines"}</span>
                                            </div>
                                            {config.phone && (
                                                <a href={`tel:${config.phone}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#eab308]/5 border-b border-zinc-100 dark:border-white/5 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-[#eab308]" />
                                                        <span className="text-[11px] font-bold text-zinc-500">{isAr ? "الرقم الرئيسي" : "Main"}</span>
                                                    </div>
                                                    <span className="text-[15px] font-black text-zinc-900 dark:text-white tabular-nums tracking-tighter" dir="ltr">{config.phone}</span>
                                                </a>
                                            )}
                                            {config.phone_numbers?.map((p, i) => (
                                                <a key={i} href={`tel:${p.number}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#eab308]/5 border-b last:border-0 border-zinc-100 dark:border-white/5 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-[#eab308]" />
                                                        <span className="text-[11px] font-bold text-zinc-500">{p.label}</span>
                                                    </div>
                                                    <span className="text-[15px] font-black text-zinc-900 dark:text-white tabular-nums tracking-tighter" dir="ltr">{p.number}</span>
                                                </a>
                                            ))}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {config.facebook_url && (
                            <a href={config.facebook_url} target="_blank" rel="noopener noreferrer"
                                className="flex-1 bg-[#1877F2] hover:bg-[#166fe5] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.96] shadow-xl text-[14px] border border-white/10">
                                <FaFacebook className="w-5 h-5" />
                                <span>{isAr ? "فيسبوك" : "Facebook"}</span>
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* ═══════ STICKY CATEGORY NAV ═══════ */}
            <nav className="sticky top-0 z-40 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-xl border-b border-zinc-200 dark:border-white/10 shadow-sm">
                <div className="max-w-2xl mx-auto relative flex items-center">
                    <button onClick={() => scrollNav("right")} className="absolute right-0 z-10 w-10 h-full bg-gradient-to-l from-white dark:from-[#050505] to-transparent flex items-center justify-center text-zinc-400 active:text-[#eab308] transition-all">
                        <span className="text-xl rotate-180">‹</span>
                    </button>
                    <div ref={navRef} className="flex gap-2 overflow-x-auto atyab-no-scrollbar px-10 py-4 scroll-smooth">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                data-cat-id={cat.id}
                                onClick={() => handleNavClick(cat.id)}
                                className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[12px] font-black border transition-all duration-300 ${activeCategory === cat.id
                                    ? "bg-[#eab308] text-black border-[#eab308] scale-105 shadow-lg shadow-[#eab308]/20"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-[#eab308]/30"
                                    }`}
                            >
                                <span className="atyab-emoji">{cat.emoji || "✨"}</span> {isAr ? cat.name_ar : cat.name_en || cat.name_ar}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => scrollNav("left")} className="absolute left-0 z-10 w-10 h-full bg-gradient-to-r from-white dark:from-[#050505] to-transparent flex items-center justify-center text-zinc-400 active:text-[#eab308] transition-all">
                        <span className="text-xl">‹</span>
                    </button>
                </div>
            </nav>

            {/* ═══════ MAIN CONTENT ═══════ */}
            <main className="max-w-2xl mx-auto px-5 py-8 pb-48">
                {/* Brand Card */}
                <div className="mb-8 rounded-[1.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 relative overflow-hidden text-right shadow-md atyab-reveal">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-1 leading-none italic uppercase tracking-tighter">{config.name}</h2>
                        <p className="text-[#eab308] text-[10px] font-black uppercase mb-2 tracking-widest">{isAr ? "مذاقات أصيلة" : "Authentic Flavors"}</p>
                    </div>
                    <div className="absolute -left-4 -bottom-4 text-[80px] opacity-[0.03] rotate-12 atyab-emoji">🥨</div>
                </div>

                {/* ═══════ SECTIONS ═══════ */}
                {categories.map((cat) => (
                    <section key={cat.id} id={`atyab-${cat.id}`} className="mb-6 scroll-mt-[170px]">
                        {/* Category Image Banner */}
                        {cat.image_url && (
                            <div className="relative aspect-[16/10] md:aspect-[21/9] rounded-[2rem] overflow-hidden mb-4 shadow-2xl border border-zinc-200 dark:border-white/5 bg-zinc-200 dark:bg-zinc-900 atyab-reveal group">
                                <img src={cat.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                                <div className="absolute bottom-6 right-6 left-6 text-right">
                                    <span className="text-[#eab308] font-black text-[10px] tracking-[0.2em] uppercase">{isAr ? "فئة القائمة" : "MENU CATEGORY"}</span>
                                    <div className="flex items-center gap-2 justify-end">
                                        <span className="text-2xl leading-none atyab-emoji">{cat.emoji}</span>
                                        <h2 className="text-2xl font-black text-white leading-none">{isAr ? cat.name_ar : cat.name_en || cat.name_ar}</h2>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Items List (Glassmorphism Card) */}
                        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] p-4 md:p-6 border border-zinc-200 dark:border-white/10 shadow-xl atyab-reveal">
                            <div className="divide-y divide-zinc-100 dark:divide-white/5">
                                {cat.items.map((item) => {
                                    const hasManyPrices = item.prices.length >= 3;
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => openItemSelect(item, isAr ? cat.name_ar : cat.name_en || cat.name_ar)}
                                            className={`py-2 group transition-all -mx-2 px-2 rounded-2xl border border-transparent cursor-pointer flex gap-2
                                                ${hasManyPrices ? "flex-col" : "items-center justify-between"}
                                                hover:bg-[#eab308]/5 hover:border-[#eab308]/10`}
                                        >
                                            {/* Name + Description */}
                                            <div className={`flex flex-col gap-0.5 flex-1 min-w-0 text-right ${hasManyPrices ? "w-full" : "pr-1"}`}>
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <div className="flex items-center gap-1 order-1">
                                                        {item.is_popular && <span className="bg-[#eab308] text-black text-[8px] font-black px-1.5 py-0.5 rounded-md atyab-popular">{isAr ? "مميز" : "Popular"}</span>}
                                                        {item.is_spicy && <span className="atyab-spicy text-xs leading-none">🌶️</span>}
                                                    </div>
                                                    <span className="text-zinc-900 dark:text-zinc-100 font-black text-lg leading-tight group-hover:text-[#eab308] transition-colors order-2 text-right w-full">
                                                        {isAr ? item.title_ar : item.title_en || item.title_ar}
                                                    </span>
                                                </div>
                                                {(item.desc_ar || item.desc_en) && (
                                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold leading-tight line-clamp-2">
                                                        {isAr ? item.desc_ar : item.desc_en || item.desc_ar}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Prices */}
                                            <div className={`${hasManyPrices ? "grid grid-cols-3 gap-1.5 w-full mt-1" : "flex gap-2 items-end shrink-0"}`}>
                                                {item.prices.map((price, pIdx) => (
                                                    <div key={pIdx} className={`flex flex-col items-center gap-0.5 ${hasManyPrices ? "bg-zinc-100 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-white/10 rounded-xl py-1.5 px-1" : ""}`}>
                                                        {item.size_labels?.[pIdx] && (
                                                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-tighter mb-0.5">{item.size_labels[pIdx]}</span>
                                                        )}
                                                        <div className={`${hasManyPrices ? "" : "px-2 py-1 min-w-[45px] rounded-xl border bg-zinc-100 dark:bg-zinc-800/80 group-hover:bg-white dark:group-hover:bg-zinc-800 border-zinc-200 dark:border-white/5 group-hover:border-[#eab308]/40 transition-all flex items-center justify-center gap-1 shadow-sm"}`}>
                                                            <div className="flex items-center justify-center gap-0.5">
                                                                <span className={`${hasManyPrices ? "text-[#eab308] text-lg" : "text-[#eab308] text-base"} font-black leading-none tabular-nums`}>{price}</span>
                                                                <span className={`${hasManyPrices ? "text-[#eab308]/60 text-[9px]" : "text-zinc-500 text-[8px]"} font-black`}>{currency}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                ))}

                {/* ═══════ FOOTER ═══════ */}
                <footer className="mt-16 pb-12 flex flex-col items-center gap-10 atyab-reveal">
                    <div className="w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 shadow-xl border border-zinc-200 dark:border-white/10 flex flex-col items-center gap-8 text-center">
                        {config.logo_url && (
                            <div className="w-20 h-20 relative flex items-center justify-center overflow-hidden rounded-full border-[3px] border-[#eab308] shadow-md bg-white dark:bg-zinc-900 p-1">
                                <img src={config.logo_url} alt="Logo" className="w-full h-full object-cover scale-110" />
                            </div>
                        )}
                        {/* QR Code */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative p-4 bg-white rounded-[2rem] border-4 border-zinc-50 dark:border-zinc-800 shadow-2xl">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`} alt="QR Code" className="w-44 h-44 md:w-52 md:h-52" />
                            </div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{isAr ? "امسح الكود لمشاركة المنيو" : "Scan to share menu"}</p>
                        </div>

                        {config.map_link && (
                            <div className="w-full border-t border-zinc-100 dark:border-white/5 pt-8">
                                <a href={config.map_link} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center group transition-transform active:scale-95">
                                    <span className="text-3xl mb-2 atyab-emoji">📍</span>
                                    <h4 className="text-xl font-black text-zinc-900 dark:text-white group-hover:text-[#eab308] transition-colors leading-none">{isAr ? "موقعنا على الخريطة" : "Find us on Map"}</h4>
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                        <a href="/" target="_blank" className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                            {isAr ? "مدعوم بواسطة" : "Powered by"} <span className="font-black text-[#eab308]">ASN Technology</span>
                        </a>
                    </div>
                </footer>
            </main>

            {/* ═══════ ADD TO CART MODAL ═══════ */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
                        onClick={() => setSelectedItem(null)}>
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 dark:border-white/10"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
                                <button onClick={() => setSelectedItem(null)} className="w-10 h-10 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center font-bold active:scale-95"><X className="w-5 h-5" /></button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black text-[#eab308]">{isAr ? selectedItem.item.title_ar : selectedItem.item.title_en || selectedItem.item.title_ar}</h3>
                                    <p className="text-[10px] text-[#eab308]/60 font-black uppercase tracking-widest">{selectedItem.cName}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedItem.item.image_url && (
                                    <div className="w-full h-40 rounded-[1.5rem] overflow-hidden mb-6 shadow-md">
                                        <img src={selectedItem.item.image_url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <h4 className="text-sm font-black text-right mb-4 opacity-70 uppercase tracking-widest">{isAr ? "اختر الحجم / السعر" : "Select Size / Variation"}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {(selectedItem.item.prices.length > 0 ? selectedItem.item.prices : [0]).map((p, idx) => (
                                        <button key={idx} onClick={() => { setTempSizeIdx(idx); haptic(5); }}
                                            className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1 ${tempSizeIdx === idx ? "border-[#eab308] bg-[#eab308]/10" : "border-transparent bg-zinc-100 dark:bg-white/5"}`}>
                                            <span className={`text-[10px] font-black uppercase ${tempSizeIdx === idx ? "text-[#eab308]" : "opacity-60"}`}>{selectedItem.item.size_labels?.[idx] || "عادي"}</span>
                                            <span className="text-xl font-black tabular-nums">{p} {isAr ? "ج.م" : "EGP"}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-zinc-50 dark:bg-white/5 border-t border-zinc-200 dark:border-white/10">
                                <button onClick={addToCart}
                                    className="w-full bg-[#eab308] text-black font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all text-lg">
                                    <ShoppingCart className="w-5 h-5" />
                                    {isAr ? "إضافة للطلب - " : "Add to Order - "}{selectedItem.item.prices?.[tempSizeIdx] || 0} {isAr ? "ج.م" : "EGP"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════ CART / CHECKOUT MODAL ═══════ */}
            <AnimatePresence>
                {showCart && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6"
                        onClick={() => setShowCart(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white w-full max-w-xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-zinc-200 dark:border-white/10"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
                                <button onClick={() => setShowCart(false)} className="w-10 h-10 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center font-bold active:scale-95"><X className="w-5 h-5" /></button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black">{isAr ? "🛒 مراجعة الطلب" : "🛒 Order Review"}</h3>
                                    <p className="text-[10px] opacity-60 font-black uppercase tracking-widest mt-1">{isAr ? "أكمل بياناتك للمتابعة" : "Complete details to proceed"}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
                                {/* Customer Form */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-black text-right flex items-center justify-end gap-2">{isAr ? "بيانات التوصيل" : "Delivery Details"} <MapPin className="w-4 h-4 text-[#eab308]" /></h4>
                                    <div className="space-y-3">
                                        {[
                                            { label: isAr ? "الاسم" : "Name", value: customerInfo.name, key: "name" as const, type: "text" },
                                            { label: isAr ? "الموبايل" : "Phone", value: customerInfo.phone, key: "phone" as const, type: "tel" },
                                        ].map((f) => (
                                            <div key={f.key} className="space-y-1">
                                                <label className="text-[10px] font-black uppercase opacity-60 ml-2 block text-right">{f.label}</label>
                                                <input type={f.type} value={f.value} onChange={(e) => setCustomerInfo({ ...customerInfo, [f.key]: e.target.value })}
                                                    className="w-full bg-zinc-50 dark:bg-white/5 border border-transparent p-3.5 rounded-xl outline-none focus:border-[#eab308] transition-all font-bold text-sm"
                                                    dir={f.key === "phone" ? "ltr" : isAr ? "rtl" : "ltr"} />
                                            </div>
                                        ))}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase opacity-60 ml-2 block text-right">{isAr ? "العنوان" : "Address"}</label>
                                            <textarea value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                                                className="w-full bg-zinc-50 dark:bg-white/5 border border-transparent p-3.5 rounded-xl outline-none focus:border-[#eab308] transition-all font-bold text-sm min-h-[80px]"
                                                dir={isAr ? "rtl" : "ltr"} />
                                        </div>
                                    </div>
                                </div>

                                {/* Cart Items */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-right opacity-60 uppercase tracking-widest border-b border-zinc-100 dark:border-white/5 pb-2">{isAr ? "محتويات السلة" : "Cart Items"}</h4>
                                    {cart.map((c) => (
                                        <div key={c.id} className="bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                                            <div className="flex-1 text-right">
                                                <h4 className="font-bold text-sm">{isAr ? c.item.title_ar : c.item.title_en || c.item.title_ar}</h4>
                                                <p className="text-[10px] opacity-70 font-bold mt-0.5">{c.size_label !== "عادي" ? c.size_label : ""}</p>
                                                <p className="text-xs font-black mt-1 text-[#eab308]">{c.price * c.quantity} ج.م</p>
                                            </div>
                                            <div className="flex items-center gap-2.5 bg-zinc-100 dark:bg-black/40 p-1 rounded-xl shadow-sm border border-zinc-200 dark:border-white/5">
                                                <button onClick={() => updateCartQty(c.id, 1)} className="w-7 h-7 flex items-center justify-center bg-[#eab308] text-black rounded-lg font-black text-sm">+</button>
                                                <span className="font-black text-sm tabular-nums w-4 text-center">{c.quantity}</span>
                                                <button onClick={() => updateCartQty(c.id, -1)} className="w-7 h-7 flex items-center justify-center bg-zinc-200 dark:bg-white/10 rounded-lg font-black text-sm">-</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <span className="text-2xl font-black tabular-nums text-[#eab308]">{cartTotal} {isAr ? "ج.م" : "EGP"}</span>
                                    <span className="text-[9px] font-black opacity-60 uppercase tracking-widest">{isAr ? "إجمالي الحساب" : "Total"}</span>
                                </div>
                                <button onClick={checkOutWhatsApp}
                                    className="w-full bg-[#25D366] text-white font-black py-4 rounded-2xl shadow-lg shadow-green-500/20 active:scale-95 transition-all text-base flex items-center justify-center gap-3 hover:bg-[#20bd5a]">
                                    <FaWhatsapp className="w-5 h-5" />
                                    {isAr ? "تأكيد الطلب عبر واتساب" : "Confirm via WhatsApp"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════ FLOATING CART BUTTON ═══════ */}
            <AnimatePresence>
                {cart.length > 0 && !showCart && !selectedItem && (
                    <motion.button
                        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                        onClick={() => { setShowCart(true); haptic(20); }}
                        className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[58] bg-[#eab308] text-black shadow-2xl shadow-[#eab308]/30 px-6 py-4 rounded-full flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 font-black">
                        <ShoppingCart className="w-5 h-5" />
                        <span>{isAr ? "سلة الطلبات" : "Cart"} ({cart.length})</span>
                        <span className="bg-black text-[#eab308] px-3 py-1 rounded-full text-sm">{cartTotal} {currency}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ═══════ BOTTOM NAVIGATION BAR ═══════ */}
            <nav className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-8 pt-2 md:hidden">
                <div className="max-w-xl mx-auto bg-white/80 dark:bg-[#0f0f0f]/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-[2.5rem] p-1 flex items-center justify-around shadow-xl relative">
                    {config.whatsapp_number && (
                        <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, "")}`} className="flex-1 flex flex-col items-center py-2 text-[#25D366] active:scale-90 transition-transform">
                            <FaWhatsapp className="w-6 h-6" />
                            <span className="text-[8px] font-black text-zinc-400 mt-0.5">{isAr ? "واتساب" : "WhatsApp"}</span>
                        </a>
                    )}

                    <button onClick={() => { haptic(); setShowCallMenu(!showCallMenu); }} className={`flex-1 flex flex-col items-center py-2 active:scale-90 transition-all ${showCallMenu ? "text-[#eab308]" : "text-zinc-500"}`}>
                        <span className="text-xl atyab-emoji">📞</span>
                        <span className="text-[8px] font-black text-zinc-400 mt-0.5">{isAr ? "اتصال" : "Call"}</span>
                    </button>

                    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="bg-[#eab308] w-14 h-14 rounded-full flex items-center justify-center text-black shadow-lg -mt-10 border-4 border-white dark:border-[#050505] active:scale-90 z-[63] transition-all">
                        <span className="text-lg atyab-emoji">🔝</span>
                    </button>

                    {config.map_link && (
                        <a href={config.map_link} target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col items-center py-2 text-zinc-500 active:scale-90 transition-transform">
                            <span className="text-xl atyab-emoji">📍</span>
                            <span className="text-[8px] font-black text-zinc-400 mt-0.5">{isAr ? "الموقع" : "Map"}</span>
                        </a>
                    )}

                    <button onClick={() => { setShowCategoriesGrid(true); }} className="flex-1 flex flex-col items-center py-2 text-zinc-500 active:scale-90 transition-all">
                        <svg className="w-6 h-6 atyab-emoji" viewBox="0 0 24 24" fill="none"><path d="M9 6H20M9 12H20M9 18H20M5 6V6.01M5 12V12.01M5 18V18.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="text-[8px] font-black text-zinc-400 mt-0.5">{isAr ? "المنيو" : "Menu"}</span>
                    </button>
                </div>
            </nav>

            {/* ═══════ CATEGORIES GRID MODAL ═══════ */}
            <AnimatePresence>
                {showCategoriesGrid && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowCategoriesGrid(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm bg-[#18181b] rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 text-center border-b border-white/5">
                                <h3 className="text-xl font-black text-white">{isAr ? "أقسام المنيو" : "Menu Categories"}</h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                                {categories.map((cat) => (
                                    <button key={cat.id} onClick={() => handleNavClick(cat.id)}
                                        className="flex flex-row-reverse items-center justify-between bg-[#27272a] hover:bg-[#3f3f46] p-4 rounded-2xl border border-white/5 active:scale-95 transition-all group">
                                        <span className="text-[13px] font-bold text-white group-hover:text-[#eab308] transition-colors">{isAr ? cat.name_ar : cat.name_en || cat.name_ar}</span>
                                        <span className="text-xl atyab-emoji">{cat.emoji}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════ PAYMENT OPTIONS MODAL ═══════ */}
            <AnimatePresence>
                {showPaymentOptions && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowPaymentOptions(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 50 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-zinc-200 dark:border-white/10"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
                                <button onClick={() => setShowPaymentOptions(false)} className="w-10 h-10 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center font-bold active:scale-95 text-zinc-500"><X className="w-5 h-5" /></button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-white flex items-center justify-end gap-2">
                                        {isAr ? "وسيلة الدفع" : "Payment Method"} <span className="text-2xl">💳</span>
                                    </h3>
                                    <p className="text-[10px] opacity-60 font-black uppercase tracking-widest mt-1">{isAr ? "كيف تود الدفع؟" : "How would you like to pay?"}</p>
                                </div>
                            </div>

                            <div className="p-4 overflow-y-auto flex flex-col gap-3">
                                {config.payment_methods?.map((pm) => (
                                    <div key={pm.id} className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] p-4 text-right flex flex-col transition-all hover:border-[#eab308]/50">
                                        <h4 className="font-black text-lg text-zinc-900 dark:text-white mb-1">{isAr ? pm.name_ar : pm.name_en || pm.name_ar}</h4>
                                        {(pm.desc_ar || pm.desc_en) && (
                                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-3">{isAr ? pm.desc_ar : pm.desc_en || pm.desc_ar}</p>
                                        )}
                                        {pm.number && (
                                            <div className="flex items-center justify-between bg-white dark:bg-black/20 px-4 py-3 rounded-xl mb-3 border border-zinc-100 dark:border-white/5 group">
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(pm.number!);
                                                        alert(isAr ? "تم نسخ الرقم!" : "Number copied!");
                                                    }}
                                                    className="text-[#eab308] text-xs font-black uppercase bg-[#eab308]/10 px-3 py-1.5 rounded-lg active:scale-95"
                                                >
                                                    {isAr ? "نسخ" : "Copy"}
                                                </button>
                                                <span className="font-black tabular-nums text-sm tracking-widest" dir="ltr">{pm.number}</span>
                                            </div>
                                        )}
                                        {pm.link && (
                                            <a href={pm.link} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-[#1877F2]/10 text-[#1877F2] font-black text-xs py-3 rounded-xl mb-3 active:scale-95 transition-transform">
                                                {isAr ? "رابط الدفع / انستا باي" : "Payment Link / InstaPay"}
                                            </a>
                                        )}
                                        <button
                                            onClick={() => finalizeOrder(isAr ? pm.name_ar : pm.name_en || pm.name_ar)}
                                            className="w-full bg-[#eab308] text-black font-black py-3 rounded-xl active:scale-95 transition-transform shadow-md flex items-center justify-center gap-2"
                                        >
                                            <FaWhatsapp className="w-4 h-4" />
                                            {isAr ? "تأكيد واستمرار" : "Confirm & Continue"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════ INLINE CSS ANIMATIONS ═══════ */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap');

                .atyab-no-scrollbar::-webkit-scrollbar { display: none; }
                .atyab-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes atyab-reveal {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .atyab-reveal { animation: atyab-reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

                @keyframes atyab-floating-emoji {
                    0% { transform: translateY(0) rotate(0deg); }
                    25% { transform: translateY(-3px) rotate(8deg); }
                    50% { transform: translateY(0) rotate(0deg); }
                    75% { transform: translateY(-3px) rotate(-8deg); }
                    100% { transform: translateY(0) rotate(0deg); }
                }
                .atyab-emoji { display: inline-block; animation: atyab-floating-emoji 3s ease-in-out infinite; }

                @keyframes atyab-popular-pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.9; }
                }
                .atyab-popular { animation: atyab-popular-pulse 2s infinite ease-in-out; }

                @keyframes atyab-spicy-shake {
                    0% { transform: rotate(0deg) scale(1); }
                    25% { transform: rotate(10deg) scale(1.05); }
                    50% { transform: rotate(0deg) scale(1); }
                    75% { transform: rotate(-10deg) scale(1.05); }
                    100% { transform: rotate(0deg) scale(1); }
                }
                .atyab-spicy { display: inline-block; animation: atyab-spicy-shake 2.5s ease-in-out infinite; }
            `}</style>
        </div>
    );
}
