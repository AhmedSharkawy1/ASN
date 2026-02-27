"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
// lucide-react icons used elsewhere
import { FaWhatsapp, FaFacebook } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types (same interface as other themes) ───
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

type Props = {
    config: RestaurantConfig;
    categories: Category[];
    language: string;
};

/**
 * THEME: Bab Al-Hara (باب الحارة)
 * --------------------------------
 * Professional restaurant theme with Syrian/Arabic aesthetic.
 * Primary: #e31e24 (Red)
 * Background: Light (#f8f9fa) / Dark (#0a0a0a)
 * Features: Hero banner, circular Instagram-style category nav,
 *           2-column grid cards with item images, delivery/payment modals,
 *           floating WhatsApp button.
 * Typography: Cairo.
 */
export default function BabAlHaraMenu({ config, categories, language }: Props) {
    const isAr = language === "ar";

    // Dark mode via next-themes
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const toggleDarkMode = () => setTheme(isDark ? 'light' : 'dark');

    // State
    const [activeSection, setActiveSection] = useState<string>("");
    const [showCallMenu, setShowCallMenu] = useState(false);
    const [showPaymentMenu, setShowPaymentMenu] = useState(false);

    const categoryNavRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);

    // ─── Intersection Observer ───
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        const id = e.target.id.replace("bab-", "");
                        setActiveSection(id);
                        const btn = categoryNavRef.current?.querySelector(`[data-cat-id="${id}"]`);
                        btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                    }
                });
            },
            { rootMargin: "-140px 0px -75% 0px", threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(`bab-${cat.id}`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories]);

    // ─── Haptic ───
    const haptic = (ms: number | number[] = 10) => {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
    };

    // ─── Nav scroll helpers ───
    const handleArrowScroll = (direction: "left" | "right") => {
        categoryNavRef.current?.scrollBy({ left: direction === "left" ? -150 : 150, behavior: "smooth" });
    };

    const scrollToSection = (id: string) => {
        haptic(10);
        const el = document.getElementById(`bab-${id}`);
        if (el) {
            isManualScroll.current = true;
            setActiveSection(id);
            el.scrollIntoView({ behavior: "smooth" });
            setTimeout(() => { isManualScroll.current = false; }, 200);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setActiveSection("");
    };

    const currency = isAr ? "ج.م" : "EGP";
    const PRIMARY = "#e31e24";

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop";
    };

    return (
        <div className="min-h-screen pb-40 bg-[#f8f9fa] dark:bg-[#0a0a0a] transition-colors duration-500 antialiased" style={{ fontFamily: "'Cairo', sans-serif" }}>

            {/* ═══════ HERO HEADER ═══════ */}
            <div className="relative">
                {/* Top Banner with Background Image */}
                <div className="relative overflow-hidden px-6 py-14 md:py-24 flex flex-col items-center justify-center min-h-[280px]">
                    {config.cover_url && (
                        <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000 scale-105"
                            style={{ backgroundImage: `url(${config.cover_url})` }} />
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-black/20 to-[#f8f9fa] dark:to-[#0a0a0a]" />
                    <div className="absolute inset-0 z-[1] bg-black/30 backdrop-blur-[1px]" />

                    {/* Logo - Centered */}
                    <div className="w-full max-w-4xl flex items-center justify-center relative z-10">
                        {config.logo_url && (
                            <div className="w-36 h-36 md:w-48 md:h-48 rounded-full border-[8px] border-white/30 bg-white shadow-[0_25px_60px_rgba(0,0,0,0.7)] overflow-hidden p-0.5 transform transition-transform hover:scale-110 duration-500">
                                <div className="w-full h-full bg-white flex items-center justify-center rounded-full overflow-hidden">
                                    <img src={config.logo_url} alt={config.name} className="w-full h-full object-cover" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Brand Badge */}
                    <div className="absolute bottom-10 right-1/2 translate-x-1/2 z-10 text-white text-[12px] font-black px-6 py-2.5 rounded-full shadow-2xl tracking-widest whitespace-nowrap" style={{ backgroundColor: PRIMARY }}>
                        {config.name}
                    </div>
                </div>

                {/* Section Title */}
                <div className="px-6 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: PRIMARY, boxShadow: `0 10px 20px -5px ${PRIMARY}33` }}>
                            <span className="text-xl">★</span>
                        </div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{isAr ? "قائمة الطعام" : "Our Menu"}</h2>
                    </div>
                    <div className="h-0.5 flex-1 bg-zinc-200 dark:bg-zinc-800 mx-4 rounded-full opacity-50" />
                    <button onClick={toggleDarkMode} className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center shadow-sm transition-all active:scale-90" suppressHydrationWarning>
                        {isDark ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>

            {/* ═══════ STICKY CATEGORY NAV (Instagram-style) ═══════ */}
            <div className="sticky top-0 z-[100] bg-white/95 dark:bg-black/95 backdrop-blur-md py-3 border-b border-zinc-100 dark:border-white/5 shadow-sm">
                {/* Scroll Arrows */}
                <button onClick={() => handleArrowScroll("right")} className="bab-nav-arrow right-1.5">
                    <span className="text-sm font-bold leading-none">›</span>
                </button>
                <button onClick={() => handleArrowScroll("left")} className="bab-nav-arrow left-1.5">
                    <span className="text-sm font-bold leading-none">‹</span>
                </button>

                <div ref={categoryNavRef} className="flex items-center overflow-x-auto bab-no-scrollbar px-6 md:px-12 gap-5 scroll-smooth">
                    {/* Home / All button */}
                    <button onClick={scrollToTop} className="flex flex-col items-center gap-1 shrink-0">
                        <div className={`bab-cat-thumb border-2 p-1 bg-white dark:bg-zinc-800 transition-all ${activeSection === "" ? "bab-cat-active" : "border-transparent"}`}>
                            <div className="w-full h-full rounded-full overflow-hidden">
                                {config.logo_url ? (
                                    <img src={config.logo_url} alt={config.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 text-lg">🏠</div>
                                )}
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold ${activeSection === "" ? "bab-active-text" : "text-zinc-500"}`} style={activeSection === "" ? { color: PRIMARY } : {}}>{isAr ? "الكل" : "All"}</span>
                    </button>

                    {categories.map((cat) => (
                        <button key={cat.id} data-cat-id={cat.id} onClick={() => scrollToSection(cat.id)} className="flex flex-col items-center gap-1 shrink-0">
                            <div className={`bab-cat-thumb border-2 overflow-hidden p-1 bg-white dark:bg-zinc-800 transition-all ${activeSection === cat.id ? "bab-cat-active" : "border-zinc-100 dark:border-white/5"}`}>
                                {cat.image_url ? (
                                    <img src={cat.image_url} alt={isAr ? cat.name_ar : cat.name_en || cat.name_ar} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">{cat.emoji || "✨"}</div>
                                )}
                            </div>
                            <span className={`text-[10px] font-bold whitespace-nowrap ${activeSection === cat.id ? "" : "text-zinc-500"}`} style={activeSection === cat.id ? { color: PRIMARY } : {}}>
                                {isAr ? cat.name_ar : cat.name_en || cat.name_ar}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══════ MAIN CONTENT ═══════ */}
            <main className="mt-8 space-y-12">
                {categories.map((cat) => (
                    <section key={cat.id} id={`bab-${cat.id}`} className="px-4 md:px-6 bab-scroll-section">
                        {/* Section Header */}
                        <div className="flex flex-col gap-3 mb-6">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: `${PRIMARY}1a` }}>
                                    {cat.emoji || "✨"}
                                </div>
                                <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100 tracking-tight">{isAr ? cat.name_ar : cat.name_en || cat.name_ar}</h3>
                            </div>
                        </div>

                        {/* Items Grid (2 columns) */}
                        <div className="grid grid-cols-2 gap-3.5 md:gap-6">
                            {cat.items.map((item) => (
                                <div key={item.id} className="bab-item-card overflow-hidden flex flex-col transition-all duration-300 bg-white dark:bg-zinc-900 border border-transparent dark:border-white/5">
                                    {/* Item Image */}
                                    <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                        <img
                                            src={item.image_url || cat.image_url || ""}
                                            alt={isAr ? item.title_ar : item.title_en || item.title_ar}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={handleImageError}
                                        />
                                        <div className="absolute top-1.5 left-1.5 w-6 h-6 bg-black/30 backdrop-blur-md text-white rounded-lg flex items-center justify-center text-[8px] shadow-sm z-10">
                                            {item.is_spicy ? "🌶️" : "📄"}
                                        </div>
                                        {item.is_popular && (
                                            <div className="absolute top-1.5 right-1.5 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-lg z-10" style={{ backgroundColor: PRIMARY }}>
                                                {isAr ? "شائع" : "Popular"}
                                            </div>
                                        )}
                                    </div>

                                    {/* Item Info */}
                                    <div className="p-3 flex flex-col flex-1">
                                        <h3 className="text-[11px] md:text-base font-black text-zinc-900 dark:text-white line-clamp-1 mb-0.5">
                                            {isAr ? item.title_ar : item.title_en || item.title_ar}
                                        </h3>
                                        <p className="text-[8px] md:text-xs text-zinc-400 dark:text-zinc-500 line-clamp-2 h-6 leading-tight mb-2">
                                            {isAr ? (item.desc_ar || "جودة وطعم لا مثيل لهما") : (item.desc_en || item.desc_ar || "Premium quality and taste")}
                                        </p>

                                        {/* Prices */}
                                        <div className="mt-auto space-y-1.5">
                                            {item.prices.map((price, pIdx) => {
                                                const sizeLabel = item.size_labels?.[pIdx];
                                                return (
                                                    <div key={pIdx} className="flex items-center justify-between bg-zinc-50 dark:bg-white/5 p-1 rounded-lg">
                                                        <div className="flex items-baseline gap-0.5 order-1">
                                                            <span className="text-[11px] font-black tabular-nums" style={{ color: PRIMARY }}>{price}</span>
                                                            <span className="text-[7px] font-bold" style={{ color: `${PRIMARY}99` }}>{currency}</span>
                                                        </div>
                                                        <span className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 order-2">
                                                            {sizeLabel || (isAr ? "سعر" : "Price")}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* ═══════ BOTTOM NAVIGATION ═══════ */}
            <nav className="fixed bottom-0 left-0 right-0 z-[130] bab-bottom-nav px-2 py-4 flex items-center justify-around rounded-t-[2rem]">
                {config.facebook_url && (
                    <a href={config.facebook_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-10 h-10 flex items-center justify-center bg-[#1877F2]/10 text-[#1877F2] rounded-xl active:scale-90 transition-transform">
                            <FaFacebook className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black text-zinc-500">{isAr ? "فيسبوك" : "Facebook"}</span>
                    </a>
                )}

                <div onClick={() => { haptic(); setShowCallMenu(true); }} className="flex flex-col items-center gap-1 flex-1 cursor-pointer">
                    <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl active:scale-90 transition-transform">
                        <span className="text-lg">📞</span>
                    </div>
                    <span className="text-[9px] font-black text-zinc-500">{isAr ? "دليفري" : "Delivery"}</span>
                </div>

                <div onClick={scrollToTop} className="flex flex-col items-center gap-1 flex-1 -mt-8">
                    <div className="w-14 h-14 flex items-center justify-center text-white rounded-full shadow-lg border-[4px] border-[#f8f9fa] dark:border-[#121212] active:scale-90 transition-transform" style={{ backgroundColor: PRIMARY }}>
                        <span className="text-xl font-black">↑</span>
                    </div>
                    <span className="text-[9px] font-black mt-1" style={{ color: PRIMARY }}>{isAr ? "للأعلى" : "Top"}</span>
                </div>

                <div onClick={() => { haptic(); setShowPaymentMenu(true); }} className="flex flex-col items-center gap-1 flex-1 cursor-pointer">
                    <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl active:scale-90 transition-transform">
                        <span className="text-lg">💳</span>
                    </div>
                    <span className="text-[9px] font-black text-zinc-500">{isAr ? "الدفع" : "Pay"}</span>
                </div>

                {config.map_link && (
                    <a href={config.map_link} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl active:scale-90 transition-transform">
                            <span className="text-lg">📍</span>
                        </div>
                        <span className="text-[9px] font-black text-zinc-500">{isAr ? "موقعنا" : "Map"}</span>
                    </a>
                )}
            </nav>

            {/* ═══════ FLOATING WHATSAPP BUTTON ═══════ */}
            {config.whatsapp_number && (
                <a
                    href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-28 right-5 bg-[#25D366] w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 z-[100] transition-transform"
                >
                    <FaWhatsapp className="w-7 h-7" />
                </a>
            )}

            {/* ═══════ DELIVERY CALL MODAL ═══════ */}
            <AnimatePresence>
                {showCallMenu && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowCallMenu(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[85vh]"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="p-5 text-center shrink-0" style={{ backgroundColor: PRIMARY }}>
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-md">
                                    <span className="text-xl">📞</span>
                                </div>
                                <h3 className="text-white text-base font-black uppercase">{isAr ? "أرقام التوصيل" : "Delivery Numbers"}</h3>
                            </div>
                            <div className="p-3 space-y-2 overflow-y-auto bab-no-scrollbar">
                                {config.phone && (
                                    <a href={`tel:${config.phone}`} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 active:scale-95 transition-transform">
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-zinc-800 dark:text-white tabular-nums" dir="ltr">{config.phone}</span>
                                            <span className="text-[9px] text-zinc-400 font-bold">{isAr ? "الرقم الرئيسي" : "Main"}</span>
                                        </div>
                                        <div className="w-9 h-9 bg-white dark:bg-zinc-700 rounded-xl flex items-center justify-center" style={{ color: PRIMARY }}>☏</div>
                                    </a>
                                )}
                                {config.phone_numbers?.map((p, i) => (
                                    <a key={i} href={`tel:${p.number}`} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 active:scale-95 transition-transform">
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-zinc-800 dark:text-white tabular-nums" dir="ltr">{p.number}</span>
                                            <span className="text-[9px] text-zinc-400 font-bold">{p.label}</span>
                                        </div>
                                        <div className="w-9 h-9 bg-white dark:bg-zinc-700 rounded-xl flex items-center justify-center" style={{ color: PRIMARY }}>☏</div>
                                    </a>
                                ))}
                            </div>
                            <div className="p-4 pt-0 shrink-0">
                                <button onClick={() => setShowCallMenu(false)} className="w-full py-3 text-zinc-400 font-bold text-[10px] uppercase">{isAr ? "إغلاق القائمة" : "Close"}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════ PAYMENT MODAL ═══════ */}
            <AnimatePresence>
                {showPaymentMenu && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowPaymentMenu(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-zinc-90 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 pb-2 text-center shrink-0 flex justify-between items-start">
                                <button onClick={() => setShowPaymentMenu(false)} className="w-8 h-8 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center font-bold active:scale-95 text-zinc-500">✕</button>
                                <div className="text-right">
                                    <div className="w-12 h-12 bg-zinc-100 dark:bg-white/5 rounded-2xl flex items-center justify-center ml-auto mb-3 text-2xl">💳</div>
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-1">{isAr ? "وسائل الدفع" : "Payment Methods"}</h3>
                                    <p className="text-[10px] opacity-60 font-black uppercase tracking-widest">{isAr ? "طرق الدفع المتاحة" : "Available Payment Methods"}</p>
                                </div>
                            </div>
                            <div className="px-5 py-4 space-y-3 overflow-y-auto bab-no-scrollbar">
                                {config.payment_methods && config.payment_methods.length > 0 ? (
                                    config.payment_methods.map((pm) => (
                                        <div key={pm.id} className="block p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 text-right transition-all hover:border-[#e31e24]/50">
                                            <h4 className="font-black text-sm text-zinc-800 dark:text-white mb-1">{isAr ? pm.name_ar : pm.name_en || pm.name_ar}</h4>
                                            {(pm.desc_ar || pm.desc_en) && (
                                                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-3 leading-tight">{isAr ? pm.desc_ar : pm.desc_en || pm.desc_ar}</p>
                                            )}
                                            {pm.number && (
                                                <div className="flex items-center justify-between bg-white dark:bg-black/20 px-3 py-2.5 rounded-xl mb-2 border border-zinc-100 dark:border-white/5 group">
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(pm.number!);
                                                            alert(isAr ? "تم نسخ الرقم!" : "Number copied!");
                                                        }}
                                                        className="text-[#e31e24] text-[10px] font-black uppercase bg-[#e31e24]/10 px-2 py-1 rounded-lg active:scale-95"
                                                    >
                                                        {isAr ? "نسخ" : "Copy"}
                                                    </button>
                                                    <span className="font-black tabular-nums text-xs tracking-widest" dir="ltr">{pm.number}</span>
                                                </div>
                                            )}
                                            {pm.link && (
                                                <a href={pm.link} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-[#1877F2]/10 text-[#1877F2] font-black text-[10px] py-2.5 rounded-xl active:scale-95 transition-transform mt-2">
                                                    {isAr ? "رابط الدفع / انستا باي" : "Payment Link / InstaPay"}
                                                </a>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="block p-5 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 text-right">
                                        <span className="text-sm font-black text-zinc-800 dark:text-white block mb-1">{isAr ? "كاش عند الاستلام" : "Cash on Delivery"}</span>
                                        <p className="text-[10px] text-zinc-400 leading-tight">{isAr ? "الدفع المباشر كاش للمندوب عند وصول الطلب" : "Pay cash directly to the delivery agent"}</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 shrink-0 pt-0">
                                <button onClick={() => setShowPaymentMenu(false)} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-black text-[11px] active:scale-95 transition-all">{isAr ? "إغلاق" : "Close"}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════ FOOTER ═══════ */}
            <div className="px-6 mt-16 mb-12 text-center flex flex-col items-center">
                {/* QR Code */}
                <div className="mb-6 p-6 bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 border border-zinc-100 flex flex-col items-center">
                    <div className="w-48 h-48 mb-3 p-1 bg-white">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&color=000000`}
                            alt="QR Code Menu"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <span className="text-[11px] font-black text-zinc-800 uppercase tracking-widest">{isAr ? "امسح لمشاركة المنيو" : "Scan to share menu"}</span>
                </div>

                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 mb-2 leading-relaxed">
                    {isAr ? "مدعوم بواسطة" : "Powered by"} <span className="font-black" style={{ color: PRIMARY }}>ASN Technology</span>
                </p>
            </div>

            {/* ═══════ INLINE CSS ═══════ */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

                .bab-no-scrollbar::-webkit-scrollbar { display: none; }
                .bab-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                .bab-cat-thumb {
                    width: 54px; height: 54px;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    border-radius: 9999px;
                    display: flex; align-items: center; justify-content: center;
                    overflow: hidden;
                }
                @media (min-width: 768px) { .bab-cat-thumb { width: 64px; height: 64px; } }

                .bab-cat-active {
                    border-color: ${PRIMARY} !important;
                    border-width: 3px !important;
                    transform: scale(1.1);
                    box-shadow: 0 10px 20px -5px ${PRIMARY}4d;
                }

                .bab-item-card {
                    box-shadow: 0 4px 15px rgba(0,0,0,0.04);
                    border-radius: 1.5rem;
                    background: white;
                    transition: transform 0.2s ease;
                }
                .bab-item-card:active { transform: scale(0.97); }
                .dark .bab-item-card { background: #18181b; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }

                .bab-bottom-nav {
                    background: rgba(255, 255, 255, 0.96);
                    backdrop-filter: blur(20px);
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.08);
                }
                .dark .bab-bottom-nav { background: rgba(24, 24, 27, 0.96); box-shadow: 0 -10px 40px rgba(0,0,0,0.5); }

                .bab-scroll-section { scroll-margin-top: 120px; }

                .bab-nav-arrow {
                    position: absolute; top: 50%; transform: translateY(-50%); z-index: 50;
                    width: 28px; height: 28px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    cursor: pointer; transition: all 0.2s;
                    border: 1px solid rgba(0,0,0,0.05);
                    color: #a1a1aa;
                }
                .dark .bab-nav-arrow { background: rgba(40, 40, 40, 0.95); border-color: rgba(255,255,255,0.1); color: #71717a; }
            `}</style>
        </div>
    );
}
