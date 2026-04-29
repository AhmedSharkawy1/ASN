"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { ShoppingCart, MapPin } from "lucide-react";
import { FaWhatsapp, FaFacebook, FaInstagram } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import SharedMarquee from "./SharedMarquee";
import CheckoutModal from "./CheckoutModal";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import ASNFooter from '@/components/menu/ASNFooter';

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
    slogan_ar?: string;
    slogan_en?: string;
    theme: string;
    phone?: string;
    whatsapp_number?: string;
    facebook_url?: string;
    instagram_url?: string;
    tiktok_url?: string;
    map_link?: string;
    logo_url?: string;
    cover_url?: string;
    cover_images?: string[];
    marquee_enabled?: boolean;
    marquee_text_ar?: string;
    marquee_text_en?: string;
    orders_enabled?: boolean;
    order_channel?: 'whatsapp' | 'website' | 'both';
    show_asn_branding?: boolean;
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
    category_name: string;
};

interface Props {
    config: RestaurantConfig;
    categories: Category[];
    language: string;
    restaurantId: string;
}

export default function PizzaPastaCyanMenu({ config, categories, language, restaurantId }: Props) {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const toggleDarkMode = () => setTheme(isDark ? 'light' : 'dark');

    const [activeSection, setActiveSection] = useState<string>(categories[0]?.id || "");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: Item; catName: string } | null>(null);
    const [tempSizeIdx, setTempSizeIdx] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "" });
    const [showBottomCallModal, setShowBottomCallModal] = useState(false);
    const [showCategoriesModal, setShowCategoriesModal] = useState(false);
    const [showPaymentOptions, setShowPaymentOptions] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const navScrollRef = useRef<HTMLDivElement>(null);

    const isManualScroll = useRef(false);

    const triggerHaptic = (ms: number = 10) => {
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
    };

    // --- SCROLL SYNC LOGIC ---
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: "-100px 0px -50% 0px", threshold: 0 }
        );

        categories.forEach((cat) => {
            const el = document.getElementById(cat.id.toString());
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [categories]);

    useEffect(() => {
        if (activeSection && navScrollRef.current) {
            const activeBtn = navScrollRef.current.querySelector(
                `[data-cat-id="${activeSection}"]`
            ) as HTMLElement;
            if (activeBtn) {
                const container = navScrollRef.current;
                const scrollLeft =
                    activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
                container.scrollTo({ left: scrollLeft, behavior: "smooth" });
            }
        }
    }, [activeSection]);

    const handleNavClick = (id: string) => {
        triggerHaptic(10);
        setShowCategoriesModal(false);
        setActiveSection(id);
        isManualScroll.current = true;

        const el = document.getElementById(id);
        if (el) {
            const offset = 160;
            const pos = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: pos, behavior: "smooth" });
        }

        setTimeout(() => {
            isManualScroll.current = false;
        }, 1000);
    };

    const scrollNav = (dir: "left" | "right") => {
        if (navScrollRef.current) {
            navScrollRef.current.scrollBy({ left: dir === "left" ? -150 : 150, behavior: "smooth" });
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
        const { item, catName } = selectedItem;
        const price = item.prices ? parseFloat(item.prices[tempSizeIdx]?.toString()) : 0;
        const sizeLabel = item.size_labels?.[tempSizeIdx] || "عادي";
        const cartId = `${item.id}-${sizeLabel}`;
        setCart((prev) => {
            const ex = prev.find((c) => c.id === cartId);
            if (ex) return prev.map((c) => (c.id === cartId ? { ...c, quantity: c.quantity + 1 } : c));
            return [...prev, { id: cartId, item, price, size_label: sizeLabel, quantity: 1, category_name: catName }];
        });
        setSelectedItem(null);
        triggerHaptic(20);
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const checkOutWhatsApp = () => {
        if (!config.whatsapp_number) {
            alert("⚠️ المطعم لم يقم بتوفير رقم واتساب للطلبات.");
            return;
        }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            alert("⚠️ يرجى إدخال جميع البيانات (الاسم، الموبايل، العنوان) لإتمام الطلب");
            return;
        }

        if (config.payment_methods && config.payment_methods.length > 0) {
            setShowPaymentOptions(true); // show the payment selection modal
        } else {
            finalizeOrder();
        }
    };

    const finalizeOrder = (selectedPaymentName?: string) => {
        let message = `🧾 *فاتورة طلب جديدة - ${config.name}*\n`;
        message += `------------------------------\n`;
        message += `👤 *الاسم:* ${customerInfo.name}\n`;
        message += `📞 *الموبايل:* ${customerInfo.phone}\n`;
        message += `📍 *العنوان:* ${customerInfo.address}\n`;

        if (selectedPaymentName) {
            message += `💳 *طريقة الدفع:* ${selectedPaymentName}\n`;
        }

        message += `------------------------------\n`;
        message += `📋 *الأصناف المطلوبة:*\n\n`;
        cart.forEach((c, idx) => {
            message += `${idx + 1}. ✨ *${c.item.title_ar}*\n`;
            if (c.size_label && c.item.size_labels?.length > 1) message += `   📏 الحجم: ${c.size_label}\n`;
            message += `   💵 السعر: ${c.price} ج\n`;
            message += `   🔢 الكمية: ${c.quantity}\n`;
            message += `   💰 المجموع: *${c.price * c.quantity} ج*\n\n`;
        });
        message += `------------------------------\n`;
        message += `💵 *الإجمالي المطلوب: ${cartTotal} ج*\n`;
        message += `------------------------------\n`;


        window.open(`https://wa.me/${config.whatsapp_number?.replace(/\+/g, "")}?text=${encodeURIComponent(message)}`, "_blank");

        setCart([]);
        setShowCart(false);
        setShowPaymentOptions(false);
    };

    const isAr = language === "ar";

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-zinc-200 antialiased selection:bg-cyan-500/30 font-cairo" dir="rtl">

            {/* ===== SHARED MARQUEE ===== */}
            {config.marquee_enabled && (config.marquee_text_ar || config.marquee_text_en) && (
                <div className="relative z-[60]">
                    <SharedMarquee
                        text={isAr ? (config.marquee_text_ar || config.marquee_text_en || '') : (config.marquee_text_en || config.marquee_text_ar || '')}
                        bgColor="#0891b2" // rose-600
                    />
                </div>
            )}

            {/* ===== HERO COVER ===== */}
            {(config.cover_images && config.cover_images.length > 0) ? (
                <div className="relative w-full h-32 md:h-64 z-40 bg-zinc-200 dark:bg-zinc-900 overflow-hidden">
                    <Swiper
                        modules={[Autoplay, EffectFade]}
                        effect="fade"
                        autoplay={{ delay: 3000, disableOnInteraction: false }}
                        loop={config.cover_images.length > 1}
                        className="w-full h-full"
                    >
                        {config.cover_images.map((img: string, idx: number) => (
                            <SwiperSlide key={idx}>
                                <img src={img || 'https://images.unsplash.com/photo-1574126154517-d1e0d89ef734?q=80&w=1000'}
                                    alt={`Banner ${idx}`} className="w-full h-full object-cover" />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            ) : config.cover_url ? (
                <div className="relative w-full h-32 md:h-64 z-40 bg-zinc-200 dark:bg-zinc-900 overflow-hidden">
                    <img src={config.cover_url} alt="Cover" className="w-full h-full object-cover" />
                </div>
            ) : null}

            {/* ===== HEADER ===== */}
            <header className="relative z-50 bg-white dark:bg-[#050505] border-b border-zinc-200 dark:border-white/10">
                <div className="max-w-2xl mx-auto px-5 py-4 md:py-6 text-right">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3 group">
                            {config.logo_url && (
                                <div className="w-16 h-16 relative flex items-center justify-center overflow-hidden rounded-full border-2 border-cyan-600 shadow-xl bg-white dark:bg-zinc-900 p-1 group-hover:rotate-12 transition-transform duration-500">
                                    <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain rounded-full" />
                                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            )}
                            <div className="flex flex-col">
                                <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none italic uppercase -mb-1">
                                    {config.name}
                                </h1>
                                <span className="text-cyan-600 dark:text-cyan-500 text-[10px] font-black uppercase tracking-[0.1em] mt-1">
                                    {isAr ? (config.slogan_ar || "مذاق إيطالي أصيل") : (config.slogan_en || config.slogan_ar || "Delicious Italian Taste")}
                                </span>
                            </div>
                        </div>
                        <button onClick={toggleDarkMode} className="w-11 h-11 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl transition-all active:scale-90 border border-zinc-200 dark:border-white/10 shadow-sm" suppressHydrationWarning>
                            {isDark ? '☀️' : '🌙'}
                        </button>
                    </div>

                    <div className="flex w-full gap-3">
                        {((config.phone_numbers && config.phone_numbers.length > 0)) && (
                            <div className="flex-1 relative">
                                <button
                                    onClick={() => { setShowBottomCallModal(true); triggerHaptic(10); }}
                                    className="w-full font-black py-4 rounded-3xl flex items-center justify-center gap-2 transition-all active:scale-[0.96] shadow-xl text-[13px] border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/10"
                                >
                                    <span className="text-xl animate-emoji">📞</span>
                                    <span>{isAr ? "اتصل للطلب" : "Call to Order"}</span>
                                </button>
                            </div>
                        )}
                        {config.facebook_url && (
                            <a href={config.facebook_url} target="_blank" rel="noopener noreferrer"
                                className="flex-1 bg-[#1877F2] text-white font-black py-4 rounded-3xl flex items-center justify-center gap-2 shadow-xl text-[13px] border border-white/10 active:scale-95 transition-transform">
                                <FaFacebook className="w-5 h-5" />
                                <span className="animate-popular">{isAr ? "فيسبوك" : "Facebook"}</span>
                            </a>
                        )}
                {config.instagram_url && (
                            <a href={config.instagram_url} target="_blank" rel="noopener noreferrer"
                                className="flex-1 bg-[#E1306C] text-white font-black py-4 rounded-3xl flex items-center justify-center gap-2 shadow-xl text-[13px] border border-white/10 active:scale-95 transition-transform">
                                <FaInstagram className="w-5 h-5" />
                                <span className="animate-popular">{isAr ? "انستجرام" : "Instagram"}</span>
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* ===== STICKY NAV ===== */}
            <nav className="sticky top-0 z-40 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-xl border-b border-zinc-200 dark:border-white/10 shadow-sm">
                <div className="max-w-2xl mx-auto relative flex items-center">
                    <button onClick={() => scrollNav("right")} className="absolute right-0 z-10 w-10 h-full flex items-center justify-center bg-gradient-to-l from-white dark:from-[#050505] to-transparent md:hidden">
                        <span className="text-cyan-600 font-bold text-lg">›</span>
                    </button>
                    <div ref={navScrollRef} className="flex gap-2 overflow-x-auto px-10 py-4 scroll-smooth" style={{ scrollbarWidth: "none" }}>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                data-cat-id={cat.id}
                                onClick={() => handleNavClick(cat.id)}
                                className={`whitespace-nowrap px-4 py-2 rounded-3xl text-[12px] font-black border transition-all duration-300 ${activeSection === cat.id
                                    ? "bg-cyan-600 text-white border-cyan-500 scale-105 shadow-md"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-500"
                                    }`}
                            >
                                {cat.emoji && <span className="ml-1">{cat.emoji}</span>}
                                {isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => scrollNav("left")} className="absolute left-0 z-10 w-10 h-full flex items-center justify-center bg-gradient-to-r from-white dark:from-[#050505] to-transparent md:hidden">
                        <span className="text-cyan-600 font-bold text-lg">‹</span>
                    </button>
                </div>
            </nav>

            {/* ===== FLOATING CART BAR ===== */}
            {config.orders_enabled !== false && (
                <AnimatePresence>
                    {cart.length > 0 && !showCart && !selectedItem && (
                        <motion.button
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={() => { setShowCart(true); triggerHaptic(20); }}
                            className="fixed bottom-24 right-6 left-6 z-[70] bg-cyan-600 text-white p-5 rounded-3xl shadow-2xl flex items-center justify-between animate-reveal border border-white/20 hover:scale-[1.02] transition-transform"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white text-cyan-600 w-7 h-7 rounded-xl flex items-center justify-center font-black text-sm shadow-inner animate-popular">{cart.length}</div>
                                <span className="font-black text-base">{isAr ? "مراجعة الفاتورة والطلب" : "Review order"}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="font-black text-lg leading-none">{cartTotal} {isAr ? "ج" : "EGP"}</span>
                                <span className="text-[10px] opacity-70 font-bold">{isAr ? "الإجمالي" : "Total"}</span>
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>
            )}

            {/* ===== MAIN CONTENT ===== */}
            <main className="max-w-2xl mx-auto px-5 py-8 pb-12">
                {categories.map((cat) => (
                    <section key={cat.id} id={cat.id.toString()} className="mb-6 scroll-mt-[170px]">

                        {/* Section Cover Image */}
                        <div className="relative aspect-[16/10] md:aspect-[21/9] rounded-[2rem] overflow-hidden mb-4 shadow-2xl border border-zinc-200 dark:border-white/5 bg-zinc-200 dark:bg-zinc-900 group">
                            {cat.image_url ? (
                                <img src={cat.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-cyan-600/30 via-zinc-900 to-cyan-900/50 flex items-center justify-center">
                                    <span className="text-6xl opacity-50">{cat.emoji || "🍽️"}</span>
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                            <div className="absolute bottom-6 right-6 left-6 text-right">
                                <div className="flex flex-col gap-1">
                                    <span className="text-cyan-500 font-black text-[10px] tracking-[0.2em] uppercase drop-shadow-md">{isAr ? "فئة القائمة" : "Menu Category"}</span>
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
                                <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-500 uppercase tracking-widest bg-cyan-50/50 dark:bg-cyan-900/10 py-2.5 rounded-xl border border-cyan-100 dark:border-cyan-900/20">
                                    ✨ {isAr ? "اضغط على السعر للاختيار والإضافة للسلة" : "Tap a price to select & add to cart"} ✨
                                </p>
                            </div>

                            <div className="divide-y divide-zinc-100 dark:divide-white/5">
                                {cat.items.map((item) => {
                                    const hasManyPrices = item.prices?.length >= 3;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`py-3 group transition-all -mx-2 px-2 rounded-3xl border border-transparent flex gap-3
                                                ${hasManyPrices ? "flex-col" : "items-center justify-between"}
                                                hover:bg-cyan-50/30 dark:hover:bg-cyan-900/5 hover:border-cyan-100 dark:hover:border-cyan-900/10`}
                                        >
                                            {/* Item Info */}
                                            <div className={`flex flex-col gap-0.5 flex-1 min-w-0 text-right ${hasManyPrices ? "w-full pr-0" : "pr-1"}`}>
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <div className="flex items-center gap-1 order-1">
                                                        {item.is_popular && <span className="bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md animate-popular">مميز</span>}
                                                        {item.is_spicy && <span className="animate-spicy text-xs leading-none">🌶️</span>}
                                                    </div>
                                                    <span className="text-zinc-900 dark:text-zinc-100 font-black text-lg leading-tight group-hover:text-cyan-600 transition-colors order-2 text-right w-full">
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
                                                    config.orders_enabled !== false ? (
                                                        <button
                                                            key={pIdx}
                                                            onClick={() => openItemSelect(item, isAr ? cat.name_ar : (cat.name_en || cat.name_ar), pIdx)}
                                                            className={`flex flex-col items-center gap-1 transition-all group/btn
                                                                ${hasManyPrices
                                                                    ? "bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-3xl py-2 px-1 active:scale-95 hover:border-cyan-500/50"
                                                                    : "active:scale-90"
                                                                }`}
                                                        >
                                                            {item.size_labels?.[pIdx] && (
                                                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-tighter">
                                                                    {item.size_labels[pIdx]}
                                                                </span>
                                                            )}
                                                            <div className={`flex items-center justify-center gap-0.5
                                                                ${hasManyPrices ? "" : "bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2 rounded-3xl border border-zinc-200 dark:border-white/5 hover:border-cyan-500/40 shadow-sm"}`}
                                                            >
                                                                <span className={`${hasManyPrices ? "text-cyan-600 dark:text-cyan-500 text-lg" : "text-cyan-600 text-base"} font-black leading-none tabular-nums`}>{price}</span>
                                                                <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-black">{isAr ? "ج" : "EGP"}</span>
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        <div
                                                            key={pIdx}
                                                            className={`flex flex-col items-center gap-1 transition-all group/btn
                                                                ${hasManyPrices
                                                                    ? "bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-3xl py-2 px-1"
                                                                    : ""
                                                                }`}
                                                        >
                                                            {item.size_labels?.[pIdx] && (
                                                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-tighter">
                                                                    {item.size_labels[pIdx]}
                                                                </span>
                                                            )}
                                                            <div className={`flex items-center justify-center gap-0.5
                                                                ${hasManyPrices ? "" : "bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2 rounded-3xl border border-zinc-200 dark:border-white/5 shadow-sm"}`}
                                                            >
                                                                <span className={`${hasManyPrices ? "text-cyan-600 dark:text-cyan-500 text-lg" : "text-cyan-600 text-base"} font-black leading-none tabular-nums`}>{price}</span>
                                                                <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-black">{isAr ? "ج" : "EGP"}</span>
                                                            </div>
                                                        </div>
                                                    )
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
                            <div className="w-24 h-24 relative flex items-center justify-center overflow-hidden rounded-full border-2 border-cyan-600 shadow-xl bg-white dark:bg-zinc-900 p-1 mb-2">
                                <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain rounded-full" />
                            </div>
                        </div>
                    )}
                    <div className="space-y-1 opacity-50 hover:opacity-100 transition-opacity">
                        {config.show_asn_branding !== false && (
                        <a href="/" target="_blank" className="text-cyan-600 font-black text-[9px] block tracking-wider">
                            {isAr ? "مدعوم بواسطة" : "Powered by"} ASN Technology
                        </a>
                        )}
                    </div>
                </footer>
            </main>

            {/* ===== ADD-TO-CART / CUSTOMIZATION MODAL ===== */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 md: backdrop-blur-md py-16 px-6 mb-safe"
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="w-[85vw] max-w-[310px] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] mx-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
                                <button onClick={() => setSelectedItem(null)} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center font-black transition-all active:scale-90 hover:bg-cyan-600 hover:text-white">✕</button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-none">{isAr ? selectedItem.item.title_ar : (selectedItem.item.title_en || selectedItem.item.title_ar)}</h3>
                                    <p className="text-[10px] text-cyan-600 font-black mt-1 uppercase tracking-widest">{selectedItem.catName}</p>
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
                                                className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1 ${tempSizeIdx === idx ? "border-cyan-600 bg-cyan-50 dark:bg-cyan-900/10" : "border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/5"}`}
                                            >
                                                <span className={`text-[9px] font-black uppercase ${tempSizeIdx === idx ? "text-cyan-600" : "text-zinc-400"}`}>
                                                    {selectedItem.item.size_labels?.[idx] || "عادي"}
                                                </span>
                                                <span className="text-lg font-black tabular-nums">{p} {isAr ? "ج" : "EGP"}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-zinc-50 dark:bg-white/5 border-t border-zinc-100 dark:border-white/5">
                                {config.orders_enabled !== false && (
                                    <button
                                        onClick={addToCart}
                                        className="w-full bg-cyan-600 text-white font-black py-4 rounded-3xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all text-base"
                                    >
                                        <ShoppingCart className="w-5 h-5" />
                                        {isAr ? "إضافة للطلب - " : "Add to Order - "}
                                        {selectedItem.item.prices?.[tempSizeIdx] || 0} {isAr ? "ج" : "EGP"}
                                    </button>
                                )}
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
                        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 md: backdrop-blur-md py-16 px-6 mb-safe"
                        onClick={() => setShowCart(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-[85vw] max-w-[310px] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] mx-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
                                <button onClick={() => setShowCart(false)} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center font-black transition-all active:scale-90 hover:bg-cyan-600 hover:text-white">✕</button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black italic">🛒 {isAr ? "مراجعة وتأكيد" : "Review & Confirm"}</h3>
                                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">{isAr ? "راجع طلبك ثم أكمل الشراء" : "Review your order then checkout"}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ scrollbarWidth: "none" }}>
                                {/* Cart Items */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-right text-zinc-400 uppercase tracking-widest">{isAr ? "محتويات السلة" : "Cart Items"}</h4>
                                    <div className="space-y-3">
                                        {cart.map((c) => (
                                            <div key={c.id} className="bg-zinc-50 dark:bg-white/5 p-4 rounded-3xl border border-zinc-100 dark:border-white/5 flex items-center justify-between">
                                                <div className="flex-1 text-right">
                                                    <h4 className="font-black text-sm">{isAr ? c.item.title_ar : (c.item.title_en || c.item.title_ar)}</h4>
                                                    <p className="text-[9px] text-zinc-500 font-bold">{c.size_label !== "عادي" ? c.size_label : ""}</p>
                                                    <p className="text-xs font-black mt-1 text-cyan-600">{c.price * c.quantity} {isAr ? "ج" : "EGP"}</p>
                                                </div>
                                                <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800 p-1 rounded-xl shadow-sm border border-zinc-100 dark:border-white/10">
                                                    <button onClick={() => updateCartQty(c.id, 1)} className="w-7 h-7 flex items-center justify-center bg-cyan-600 text-white rounded-lg font-black text-sm">+</button>
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
                                        <span className="text-2xl font-black tabular-nums text-cyan-600">{cartTotal} {isAr ? "ج" : "EGP"}</span>
                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{isAr ? "إجمالي الحساب" : "Total Amount"}</span>
                                    </div>
                                    <span className="text-base font-black text-zinc-500">{isAr ? "الحساب الكلي" : "Grand Total"}</span>
                                </div>
                                <button onClick={() => { setShowCart(false); setShowCheckout(true); }}
                                    className="w-full bg-cyan-600 text-white font-black py-4 rounded-3xl shadow-lg active:scale-95 transition-all text-base flex items-center justify-center gap-3">
                                    🛒 {isAr ? "إتمام الطلب" : "Proceed to Checkout"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )
                }
            </AnimatePresence >
            {/* ═══════ BOTTOM NAV DELIVERY MODAL ═══════ */}
            <AnimatePresence>
                {showBottomCallModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md py-16 px-6 mb-safe"
                        onClick={() => setShowBottomCallModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-[85vw] max-w-[310px] bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-zinc-200 dark:border-white/10 mx-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            
                            <div className="px-5 pb-4 pt-5 flex items-center justify-between border-b border-zinc-100 dark:border-white/5">
                                <h3 className="text-lg font-black text-zinc-900 dark:text-white">{isAr ? 'أرقام الدليفري' : 'Delivery Numbers'}</h3>
                                <button onClick={() => setShowBottomCallModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 active:scale-90 transition-transform">
                                    <span className="text-lg">✕</span>
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto space-y-3 pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 1rem), 1.5rem)' }}>
                                {config.phone_numbers && config.phone_numbers.length > 0 ? (
                                    config.phone_numbers.map((pn: {label?: string; number: string}, idx: number) => (
                                        <a key={idx} href={`tel:${pn.number}`}
                                            className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-100 dark:border-zinc-700/50 rounded-3xl active:scale-[0.97] transition-all hover:bg-rose-50 dark:hover:bg-rose-500/5 group"
                                        >
                                            <div className="flex flex-col text-right flex-1 min-w-0">
                                                <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[11px] mb-1">
                                                    {pn.label || (isAr ? `رقم ${idx + 1}` : `Line ${idx + 1}`)}
                                                </span>
                                                <span className="text-[17px] font-black text-rose-600 dark:text-rose-500 tabular-nums tracking-tight" dir="ltr">
                                                    {pn.number}
                                                </span>
                                            </div>
                                            <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm text-lg border border-zinc-100 dark:border-white/5 group-hover:scale-110 transition-transform shrink-0 ml-3">
                                                📞
                                            </div>
                                        </a>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-zinc-400 font-bold">{isAr ? 'لا توجد أرقام مسجلة' : 'No numbers registered'}</div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>



            <ASNFooter show={config.show_asn_branding !== false} />
            <CheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                cartItems={cart.map(c => ({
                    id: c.id,
                    title: isAr ? c.item.title_ar : c.item.title_en || c.item.title_ar,
                    qty: c.quantity,
                    price: c.price,
                    size: c.size_label,
                    category: c.category_name,
                }))}
                subtotal={cartTotal}
                restaurantId={restaurantId}
                restaurantName={config.name}
                whatsappNumber={config.whatsapp_number || config.phone}
                currency={isAr ? 'ج.م' : 'EGP'}
                language={isAr ? 'ar' : 'en'}
                orderChannel={config.order_channel}
                onOrderSuccess={() => { setCart([]); setShowCart(false); }}
            />

            {/* ===== CATEGORIES FULLSCREEN MODAL ===== */}
            <AnimatePresence>
                {showCategoriesModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md py-16 px-6 mb-safe"
                        onClick={() => setShowCategoriesModal(false)}
                    >
                        <div className="w-[85vw] max-w-[310px] bg-white dark:bg-[#09090b] rounded-[2rem] shadow-2xl overflow-hidden relative max-h-[85vh] flex flex-col mx-auto" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setShowCategoriesModal(false)} className="absolute top-6 left-6 w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center font-black transition-all active:scale-90 hover:bg-cyan-600 hover:text-white z-10">✕</button>
                            <div className="p-8 text-center border-b border-zinc-100 dark:border-white/5">
                                <h3 className="text-lg font-black text-zinc-900 dark:text-white">{isAr ? "أقسام المنيو" : "Menu Sections"}</h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3 max-h-[85vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleNavClick(cat.id)}
                                        className="flex flex-row-reverse items-center justify-between bg-zinc-50 dark:bg-[#1c1c1e] hover:bg-cyan-600 hover:text-white p-4 rounded-xl border border-zinc-100 dark:border-white/5 active:scale-95 transition-all group"
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
                <div className="w-[85vw] max-w-[310px] mx-auto bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 rounded-[2.5rem] p-1.5 flex items-center justify-around shadow-xl relative">
                    {config.whatsapp_number && (
                        <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, "")}`} className="flex-1 flex flex-col items-center py-2 text-[#25D366] active:scale-90 transition-transform">
                            <FaWhatsapp className="w-6 h-6" />
                            <span className="text-[8px] font-black text-zinc-400 mt-1 uppercase">{isAr ? "واتساب" : "WhatsApp"}</span>
                        </a>
                    )}

                    {(config.phone_numbers && config.phone_numbers.length > 0) && (
                        <button onClick={() => setShowBottomCallModal(true)} className="flex-1 flex flex-col items-center py-2 text-zinc-500 active:scale-90 transition-transform">
                            <span className="text-xl">📞</span>
                            <span className="text-[8px] font-black text-zinc-400 mt-1 uppercase">{isAr ? "اتصال" : "Call"}</span>
                        </button>
                    )}

                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="bg-cyan-600 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg -mt-10 border-4 border-white dark:border-[#050505] active:scale-90 z-[63] transition-all"
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

            {/* ===== PAYMENT OPTIONS MODAL ===== */}
            <AnimatePresence>
                {showPaymentOptions && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-md py-16 px-6 mb-safe"
                        onClick={() => setShowPaymentOptions(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 50 }}
                            className="bg-white dark:bg-zinc-90 w-[85vw] max-w-[310px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-zinc-200 dark:border-white/10 mx-auto"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
                                <button onClick={() => setShowPaymentOptions(false)} className="w-10 h-10 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center font-bold active:scale-95 text-zinc-500">✕</button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-white flex items-center justify-end gap-2">
                                        {isAr ? "وسيلة الدفع" : "Payment Method"} <span className="text-2xl">💳</span>
                                    </h3>
                                    <p className="text-[10px] opacity-60 font-black uppercase tracking-widest mt-1">{isAr ? "كيف تود الدفع؟" : "How would you like to pay?"}</p>
                                </div>
                            </div>

                            <div className="p-4 overflow-y-auto flex flex-col gap-3">
                                {config.payment_methods?.map((pm) => (
                                    <div key={pm.id} className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] p-4 text-right flex flex-col transition-all hover:border-cyan-600/50">
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
                                                    className="text-cyan-600 text-xs font-black uppercase bg-cyan-600/10 px-3 py-1.5 rounded-lg active:scale-95"
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
                                            className="w-full bg-cyan-600 text-white font-black py-3 rounded-xl active:scale-95 transition-transform shadow-md flex items-center justify-center gap-2"
                                        >
                                            <FaWhatsapp className="w-5 h-5" />
                                            {isAr ? "تأكيد واستمرار" : "Confirm & Continue"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .font-cairo { font-family: var(--font-cairo), 'Cairo', sans-serif; }
            `}</style>
        </div >
    );
}
