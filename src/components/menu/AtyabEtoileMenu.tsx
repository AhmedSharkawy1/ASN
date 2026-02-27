"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { Phone, X, MapPin, ShoppingCart } from "lucide-react";
import { FaWhatsapp, FaFacebook } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types (same as other themes) ───
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
    cover_images?: string[];
    working_hours?: string;
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
 * THEME: Atyab Etoile Style
 * --------------------------
 * Clean, Elegant, E-commerce style.
 * Primary: #B89038 (Gold)
 * Surface: #FDFBF7 (Cream) / #1E1E1E (Dark)
 * Background: #FFFFFF / #121212
 * Typography: Tajawal (Arabic Sans-Serif)
 * Features: Scrolling marquee, hero banner slider, grid item cards with images,
 *           pill-shaped category nav, glassmorphism bottom bar.
 */
export default function AtyabEtoileMenu({ config, categories, language }: Props) {
    const isAr = language === "ar";

    // Dark mode via next-themes
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const toggleDarkMode = () => setTheme(isDark ? 'light' : 'dark');

    // State
    const [activeSection, setActiveSection] = useState<string>(categories[0]?.id || "");
    const [showCallMenu, setShowCallMenu] = useState(false);
    const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
    const [currentBannerIdx, setCurrentBannerIdx] = useState(0);
    const [showPaymentOptions, setShowPaymentOptions] = useState(false);

    // Interactive State
    const [searchQuery, setSearchQuery] = useState("");
    const [favorites, setFavorites] = useState<string[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: Item; cName: string } | null>(null);
    const [tempSizeIdx, setTempSizeIdx] = useState(0);
    const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "", notes: "" });

    const toggleFavorite = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        haptic(10);
        setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    };

    const openItemSelect = (item: Item, cName: string) => {
        setSelectedItem({ item, cName });
        setTempSizeIdx(0);
        haptic(10);
    };

    const addToCart = () => {
        if (!selectedItem) return;
        const { item } = selectedItem;
        const price = item.prices ? parseFloat(item.prices[tempSizeIdx]?.toString()) : 0;
        const sizeLabel = item.size_labels?.[tempSizeIdx] || (isAr ? "عادي" : "Regular");
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
    const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

    const checkOutWhatsApp = () => {
        if (!config.whatsapp_number) { alert(isAr ? "عذراً، لم يتم توفير رقم واتساب." : "No WhatsApp number available."); return; }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            alert(isAr ? "⚠️ يرجى إدخال جميع البيانات" : "⚠️ Please fill all fields");
            return;
        }

        if (config.payment_methods && config.payment_methods.length > 0) {
            setShowPaymentOptions(true);
        } else {
            finalizeOrder();
        }
    };

    const finalizeOrder = (selectedPaymentName?: string) => {
        let msg = `*🧾 فاتورة طلب جديدة - ${config.name}*\n------------------------------\n`;
        msg += `👤 *الاسم:* ${customerInfo.name}\n📞 *الموبايل:* ${customerInfo.phone}\n📍 *العنوان:* ${customerInfo.address}\n`;

        if (customerInfo.notes) msg += `📝 *ملاحظات:* ${customerInfo.notes}\n`;
        if (selectedPaymentName) msg += `💳 *طريقة الدفع:* ${selectedPaymentName}\n`;

        msg += `------------------------------\n*📋 الأصناف:*\n\n`;

        cart.forEach((c) => {
            msg += `▪️ ${isAr ? c.item.title_ar : c.item.title_en || c.item.title_ar} (${c.size_label})\n`;
            msg += `   الكمية: ${c.quantity} × ${c.price} ${currency} = ${c.quantity * c.price} ${currency}\n`;
        });

        msg += `\n------------------------------\n*💰 الإجمالي:* ${cartTotal} ${currency}\n`;
        msg += `*🛵 يضاف مصاريف التوصيل*\n------------------------------\n`;

        const url = `https://wa.me/${config.whatsapp_number?.replace(/\+/g, "")}?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");

        haptic(50);
        setShowCart(false);
        setCart([]);
        setShowPaymentOptions(false);
    };

    const filteredCategories = categories.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
            searchQuery === "" ||
            (item.title_ar && item.title_ar.includes(searchQuery)) ||
            (item.title_en && item.title_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.desc_ar && item.desc_ar.includes(searchQuery))
        )
    })).filter(cat => cat.items.length > 0);

    const navRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);

    // Banner images from cover_url or fallbacks
    const BANNER_IMAGES = config.cover_images && config.cover_images.length > 0
        ? config.cover_images
        : [
            config.cover_url || "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
        ];

    // Auto-slide banner
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentBannerIdx((prev) => (prev + 1) % BANNER_IMAGES.length);
        }, 4000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Intersection Observer for active section
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace("etoile-", "");
                        setActiveSection(id);
                    }
                });
            },
            { root: null, rootMargin: "-180px 0px -40% 0px", threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(`etoile-${cat.id}`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories]);

    // Scroll active nav button into view
    useEffect(() => {
        if (activeSection && navRef.current) {
            const btn = navRef.current.querySelector(`[data-cat-id="${activeSection}"]`);
            btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
    }, [activeSection]);

    // Haptic
    const haptic = (ms: number | number[] = 10) => {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
    };

    // Nav click → scroll to section
    const handleNavClick = (id: string) => {
        haptic(10);
        setShowCategoriesMenu(false);
        const el = document.getElementById(`etoile-${id}`);
        if (el) {
            isManualScroll.current = true;
            setActiveSection(id);
            const top = el.getBoundingClientRect().top + window.pageYOffset - 170;
            window.scrollTo({ top, behavior: "auto" });
            setTimeout(() => { isManualScroll.current = false; }, 150);
        }
    };

    const scrollNav = (dir: "left" | "right") => {
        navRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
        haptic(5);
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop";
    };

    const currency = isAr ? "ج.م" : "EGP";
    const PRIMARY = "#B89038";

    return (
        <div className="min-h-screen bg-white dark:bg-[#121212] text-[#333] dark:text-[#F5F5F5] antialiased" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>

            {/* ═══════ MARQUEE TOP BAR ═══════ */}
            <div className="text-white text-[10px] md:text-xs py-2 overflow-hidden flex items-center font-medium" style={{ backgroundColor: PRIMARY }} dir="rtl">
                <div className="etoile-marquee flex gap-12 whitespace-nowrap w-max">
                    <div className="flex gap-12">
                        <span>{isAr ? "اتصل بنا:" : "Call us:"} {config.phone || config.phone_numbers?.[0]?.number || ""}</span>
                        <span>{isAr ? "وقت التوصيل من 45 إلى 60 دقيقة" : "Delivery: 45-60 min"}</span>
                        <span>{isAr ? "طرق دفع سهلة" : "Easy payment methods"}</span>
                    </div>
                    <div className="flex gap-12">
                        <span>{isAr ? "اتصل بنا:" : "Call us:"} {config.phone || config.phone_numbers?.[0]?.number || ""}</span>
                        <span>{isAr ? "وقت التوصيل من 45 إلى 60 دقيقة" : "Delivery: 45-60 min"}</span>
                        <span>{isAr ? "طرق دفع سهلة" : "Easy payment methods"}</span>
                    </div>
                </div>
            </div>

            {/* ═══════ HEADER ═══════ */}
            <header className="relative z-50 bg-[#FDFBF7] dark:bg-[#1E1E1E] shadow-sm pt-[env(safe-area-inset-top,0px)]">
                <div className="max-w-4xl mx-auto px-4 py-3 md:py-4">
                    {/* Main Header Row */}
                    <div className="flex items-center justify-between mb-4">
                        {/* Hamburger */}
                        <button onClick={() => { haptic(); setShowCategoriesMenu(true); }} className="w-10 h-10 border border-[#EAEAEA] dark:border-[#333] rounded-md flex items-center justify-center text-[#888] hover:text-[#B89038] transition-colors active:scale-95">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>

                        {/* Logo */}
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                            {config.logo_url && (
                                <div className="w-10 h-10 md:w-12 md:h-12 relative flex items-center justify-center overflow-hidden rounded-full bg-[#FDFBF7] dark:bg-[#1E1E1E] shadow-sm border border-[#EAEAEA] dark:border-[#333] p-1">
                                    <img src={config.logo_url} alt={config.name} className="w-full h-full object-cover rounded-full" />
                                </div>
                            )}
                            <div className="hidden md:flex flex-col">
                                <h1 className="text-lg font-bold leading-none">{config.name}</h1>
                            </div>
                        </div>

                        {/* Dark mode toggle */}
                        <button onClick={toggleDarkMode} className="w-10 h-10 rounded-full flex items-center justify-center text-lg text-[#888] hover:text-[#B89038] hover:bg-[#B89038]/5 transition-colors active:scale-95 border border-[#EAEAEA] dark:border-[#333]" suppressHydrationWarning>
                            {isDark ? "☀️" : "🌙"}
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={isAr ? "ابحث عن.." : "Search..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border border-[#EAEAEA] dark:border-[#333] rounded-full py-2.5 px-6 text-sm outline-none focus:border-[#B89038] transition-colors text-right"
                            dir="rtl"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#333] dark:text-[#F5F5F5]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                </div>
            </header>

            {/* ═══════ HERO BANNER SLIDER ═══════ */}
            <section className="relative w-full max-w-4xl mx-auto mt-4 px-4 overflow-hidden">
                <div className="relative rounded-2xl overflow-hidden shadow-sm h-[200px] md:h-[300px]">
                    {BANNER_IMAGES.map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt={`Banner ${idx + 1}`}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === currentBannerIdx ? 'opacity-100' : 'opacity-0'}`}
                            onError={handleImageError}
                        />
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                        <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 leading-tight drop-shadow-md">
                            {config.name}
                        </h2>
                        <p className="text-white/90 text-sm md:text-base font-medium drop-shadow-sm">
                            {isAr ? "أشهى الأطعمة بين يديك" : "Delicious food at your fingertips"}
                        </p>
                    </div>
                    {/* Slider Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {BANNER_IMAGES.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentBannerIdx(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentBannerIdx ? 'w-8' : 'w-4 bg-white/50 hover:bg-white/80'}`}
                                style={idx === currentBannerIdx ? { backgroundColor: PRIMARY, width: '2rem' } : {}}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ STICKY CATEGORY NAV (Pill Buttons) ═══════ */}
            <nav className="sticky top-0 z-40 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-b border-[#EAEAEA] dark:border-[#333] shadow-sm mt-6">
                <div className="max-w-4xl mx-auto relative flex items-center">
                    <button onClick={() => scrollNav("right")} className="absolute right-0 z-10 w-12 h-full bg-gradient-to-l from-white dark:from-[#121212] to-transparent flex items-center justify-center text-[#888] hover:text-[#B89038] transition-colors">
                        <span className="text-2xl rotate-180">‹</span>
                    </button>
                    <div ref={navRef} className="flex gap-4 overflow-x-auto etoile-no-scrollbar px-12 py-3 scroll-smooth">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                data-cat-id={cat.id}
                                onClick={() => handleNavClick(cat.id)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${activeSection === cat.id
                                    ? "text-white shadow-sm"
                                    : "bg-[#FDFBF7] dark:bg-[#1E1E1E] text-[#888] hover:text-[#B89038] border border-[#EAEAEA] dark:border-[#333]"
                                    }`}
                                style={activeSection === cat.id ? { backgroundColor: PRIMARY } : {}}
                            >
                                {isAr ? cat.name_ar : cat.name_en || cat.name_ar}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => scrollNav("left")} className="absolute left-0 z-10 w-12 h-full bg-gradient-to-r from-white dark:from-[#121212] to-transparent flex items-center justify-center text-[#888] hover:text-[#B89038] transition-colors">
                        <span className="text-2xl">‹</span>
                    </button>
                </div>
            </nav>

            {/* ═══════ MAIN CONTENT ═══════ */}
            <main className="max-w-4xl mx-auto px-4 py-8 pb-48">
                {filteredCategories.map((cat) => (
                    <section key={cat.id} id={`etoile-${cat.id}`} className="mb-12 scroll-mt-[120px]">
                        {/* Section Title */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg md:text-xl font-bold uppercase tracking-wide relative inline-block">
                                {isAr ? cat.name_ar : cat.name_en || cat.name_ar}
                                <span className="absolute -bottom-2 left-0 w-1/2 h-0.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
                            </h2>
                        </div>

                        {/* Items Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                            {cat.items.map((item) => {
                                const displayPrice = item.prices[0];
                                return (
                                    <div
                                        key={item.id}
                                        className="bg-[#FDFBF7] dark:bg-[#1E1E1E] rounded-2xl p-3 md:p-4 flex flex-col shadow-sm border border-[#EAEAEA] dark:border-[#333] relative group cursor-pointer hover:shadow-md transition-shadow"
                                    >
                                        {/* Image */}
                                        <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-white dark:bg-[#121212]">
                                            <img
                                                src={item.image_url || cat.image_url || ""}
                                                alt={isAr ? item.title_ar : item.title_en || item.title_ar}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                                onError={handleImageError}
                                            />
                                            {/* Badges */}
                                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                                {item.is_popular && (
                                                    <span className="text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-sm uppercase" style={{ backgroundColor: PRIMARY }}>
                                                        {isAr ? "الأكثر مبيعاً" : "Best Seller"}
                                                    </span>
                                                )}
                                                {item.is_spicy && (
                                                    <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-sm uppercase">
                                                        {isAr ? "حار 🌶️" : "Spicy 🌶️"}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Heart */}
                                            <button
                                                onClick={(e) => toggleFavorite(e, item.id)}
                                                className={`absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm transition-colors active:scale-95 ${favorites.includes(item.id) ? "text-red-500" : "text-[#888] hover:text-[#B89038]"}`}
                                            >
                                                <svg className={`w-4 h-4 ${favorites.includes(item.id) ? "fill-current" : "fill-none stroke-current stroke-2"}`} viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                            </button>
                                        </div>

                                        {/* Content */}
                                        <div className="flex flex-col flex-1 text-right">
                                            <h3 className="text-sm md:text-base font-medium leading-tight mb-1 line-clamp-2">
                                                {isAr ? item.title_ar : item.title_en || item.title_ar}
                                            </h3>
                                            {(item.desc_ar || item.desc_en) && (
                                                <p className="text-[10px] text-[#888] line-clamp-2 mb-1">
                                                    {isAr ? item.desc_ar : item.desc_en || item.desc_ar}
                                                </p>
                                            )}

                                            {/* Stars (decorative) */}
                                            <div className="flex items-center justify-end gap-1 mb-2">
                                                <div className="flex text-[10px]">
                                                    <span style={{ color: PRIMARY }}>★</span><span style={{ color: PRIMARY }}>★</span><span style={{ color: PRIMARY }}>★</span><span style={{ color: PRIMARY }}>★</span><span style={{ color: PRIMARY }}>★</span>
                                                </div>
                                            </div>

                                            {/* Price / Sizes */}
                                            <div className="mt-auto mb-3 flex flex-col items-end justify-end gap-1 w-full">
                                                {item.prices.length > 1 ? (
                                                    <div className="w-full space-y-1">
                                                        {item.prices.map((price, idx) => {
                                                            const sizeLabel = item.size_labels?.[idx] || (isAr ? "عادي" : "Reg");
                                                            return (
                                                                <div key={idx} className="flex justify-between items-center w-full text-xs bg-gray-50 dark:bg-black/20 px-2 py-1 rounded-md border border-[#EAEAEA] dark:border-[#333]">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="font-bold tabular-nums" style={{ color: PRIMARY }}>{price}</span>
                                                                        <span className="text-[9px] font-bold" style={{ color: PRIMARY }}>{currency}</span>
                                                                    </div>
                                                                    <span className="font-medium text-[#888]">{sizeLabel}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-end gap-1">
                                                        <span className="font-bold text-lg leading-none tabular-nums" style={{ color: PRIMARY }}>{displayPrice}</span>
                                                        <span className="text-[10px] font-bold" style={{ color: PRIMARY }}>{currency}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Add to Cart */}
                                            <button
                                                onClick={() => openItemSelect(item, cat.name_ar)}
                                                disabled={item.is_available === false}
                                                className="w-full text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                                style={{ backgroundColor: PRIMARY, opacity: item.is_available === false ? 0.5 : 1 }}
                                            >
                                                <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                {isAr ? "أضف للسلة" : "Add to Cart"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}

                {/* ═══════ FOOTER ═══════ */}
                <footer className="mt-16 rounded-t-[2rem] text-white py-12 px-6" style={{ backgroundColor: PRIMARY }}>
                    <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-8">
                        <p className="text-lg md:text-xl font-bold">
                            {config.working_hours || (isAr ? "أوقات العمل من 10 صباحاً إلى 2 صباحاً، 7 أيام في الأسبوع" : "Open 10 AM - 2 AM, 7 days a week")}
                        </p>

                        <div className="w-24 h-0.5 bg-white/30 rounded-full my-2" />

                        <div className="flex gap-6">
                            {config.map_link && (
                                <a href={config.map_link} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white flex items-center justify-center hover:bg-white hover:text-[#B89038] transition-colors">
                                    <MapPin className="w-5 h-5" />
                                </a>
                            )}
                            {config.whatsapp_number && (
                                <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, "")}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white flex items-center justify-center hover:bg-white hover:text-[#B89038] transition-colors">
                                    <FaWhatsapp className="w-5 h-5" />
                                </a>
                            )}
                            {config.facebook_url && (
                                <a href={config.facebook_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white flex items-center justify-center hover:bg-white hover:text-[#B89038] transition-colors">
                                    <FaFacebook className="w-5 h-5" />
                                </a>
                            )}
                        </div>

                        {/* QR Code */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-white rounded-2xl shadow-lg">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                                    alt="QR Code"
                                    className="w-32 h-32"
                                />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{isAr ? "امسح لمشاركة المنيو" : "Scan to share menu"}</p>
                        </div>

                        <div className="flex flex-col items-center gap-1 mt-4 opacity-80">
                            <p className="text-[10px] font-medium uppercase tracking-wider">
                                {isAr ? "مدعوم بواسطة" : "Powered by"} <span className="font-black">ASN Technology</span>
                            </p>
                        </div>
                    </div>
                </footer>
            </main>

            {/* ═══════ BOTTOM NAVIGATION BAR ═══════ */}
            <nav className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-8 pt-2 md:hidden">
                <div className="max-w-xl mx-auto etoile-glass border border-[#EAEAEA] dark:border-[#333] rounded-full p-1.5 flex items-center justify-around shadow-lg relative">
                    {config.whatsapp_number && (
                        <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, "")}`} className="flex-1 flex flex-col items-center py-2 text-[#25D366] active:scale-95 transition-transform">
                            <FaWhatsapp className="w-6 h-6" />
                            <span className="text-[10px] font-medium text-[#888] mt-1 uppercase">{isAr ? "واتساب" : "WhatsApp"}</span>
                        </a>
                    )}

                    <button onClick={() => { haptic(); setShowCallMenu(!showCallMenu); setShowCategoriesMenu(false); }} className={`flex-1 flex flex-col items-center py-2 active:scale-95 transition-all ${showCallMenu ? "text-[#B89038]" : "text-[#888]"}`}>
                        <span className="text-xl">📞</span>
                        <span className="text-[10px] font-medium mt-1 uppercase">{isAr ? "اتصال" : "Call"}</span>
                    </button>

                    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg -mt-8 border-4 border-white dark:border-[#121212] active:scale-95 z-[63] transition-transform" style={{ backgroundColor: PRIMARY }}>
                        <span className="text-lg">🔝</span>
                    </button>

                    {config.map_link && (
                        <a href={config.map_link} target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col items-center py-2 text-[#888] active:scale-95 transition-transform">
                            <span className="text-xl">📍</span>
                            <span className="text-[10px] font-medium mt-1 uppercase">{isAr ? "الموقع" : "Map"}</span>
                        </a>
                    )}

                    <button onClick={() => { setShowCategoriesMenu(true); setShowCallMenu(false); }} className={`flex-1 flex flex-col items-center py-2 active:scale-95 transition-all ${showCategoriesMenu ? "text-[#B89038]" : "text-[#888]"}`}>
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M9 6H20M9 12H20M9 18H20M5 6V6.01M5 12V12.01M5 18V18.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span className="text-[10px] font-medium mt-1 uppercase">{isAr ? "المنيو" : "Menu"}</span>
                    </button>

                    {/* Call Menu Overlay */}
                    <AnimatePresence>
                        {showCallMenu && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-[calc(100%+1.5rem)] left-0 right-0 bg-[#FDFBF7] dark:bg-[#1E1E1E] border border-[#EAEAEA] dark:border-[#333] rounded-[1.5rem] shadow-xl mx-2 z-[62] overflow-hidden"
                            >
                                <div className="px-5 py-3 bg-white dark:bg-[#121212] border-b border-[#EAEAEA] dark:border-[#333] text-right flex justify-between items-center flex-row-reverse">
                                    <span className="text-[11px] font-bold text-[#888] uppercase tracking-widest">{isAr ? "تواصل" : "Contact"}</span>
                                    <span className="text-lg">📞</span>
                                </div>
                                {config.phone && (
                                    <a href={`tel:${config.phone}`} className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAEA] dark:border-[#333] active:bg-[#B89038]/5 transition-colors group">
                                        <span className="text-[12px] font-medium text-[#888] group-hover:text-[#B89038]">{isAr ? "الرئيسي" : "Main"}</span>
                                        <span className="text-base font-bold tabular-nums" style={{ color: PRIMARY }}>{config.phone}</span>
                                    </a>
                                )}
                                {config.phone_numbers?.map((p, i) => (
                                    <a key={i} href={`tel:${p.number}`} className="flex items-center justify-between px-6 py-4 border-b last:border-0 border-[#EAEAEA] dark:border-[#333] active:bg-[#B89038]/5 transition-colors group">
                                        <span className="text-[12px] font-medium text-[#888] group-hover:text-[#B89038]">{p.label}</span>
                                        <span className="text-base font-bold tabular-nums" style={{ color: PRIMARY }}>{p.number}</span>
                                    </a>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </nav>

            {/* ═══════ BACKDROP for overlays ═══════ */}
            <AnimatePresence>
                {(showCallMenu || showCategoriesMenu) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[59]"
                        onClick={() => { setShowCallMenu(false); setShowCategoriesMenu(false); }}
                    />
                )}
            </AnimatePresence>

            {/* ═══════ CATEGORIES GRID MODAL ═══════ */}
            <AnimatePresence>
                {showCategoriesMenu && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowCategoriesMenu(false)}
                    >
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm bg-[#FDFBF7] dark:bg-[#1E1E1E] rounded-[2rem] shadow-2xl border border-[#EAEAEA] dark:border-[#333] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 text-center border-b border-[#EAEAEA] dark:border-[#333]">
                                <h3 className="text-2xl font-bold uppercase">{isAr ? "أقسام المنيو" : "Menu Categories"}</h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto etoile-no-scrollbar">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleNavClick(cat.id)}
                                        className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-[#121212] hover:bg-[#B89038]/5 p-4 rounded-2xl border border-[#EAEAEA] dark:border-[#333] active:scale-95 transition-all group"
                                    >
                                        <span className="text-3xl">{cat.emoji || "✨"}</span>
                                        <span className="text-[13px] font-semibold group-hover:text-[#B89038] uppercase text-center leading-tight">
                                            {isAr ? cat.name_ar : cat.name_en || cat.name_ar}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════ FLOATING CART BUTTON ═══════ */}
            <AnimatePresence>
                {cartCount > 0 && !showCart && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => { haptic(); setShowCart(true); }}
                        className="fixed bottom-28 md:bottom-10 right-4 z-50 w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
                        style={{ backgroundColor: PRIMARY }}
                    >
                        <ShoppingCart className="w-6 h-6" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-[#121212]">
                            {cartCount}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ═══════ ITEM SELECT MODAL ═══════ */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
                        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="w-full max-w-md mx-auto bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl overflow-hidden mt-auto md:mt-0" onClick={e => e.stopPropagation()}>
                            <div className="relative aspect-video bg-gray-100 dark:bg-black overflow-hidden">
                                <img src={selectedItem.item.image_url || categories.find(c => c.name_ar === selectedItem.cName)?.image_url || ""} alt="" className="w-full h-full object-cover" onError={handleImageError} />
                                <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white text-right">
                                    <h3 className="text-xl font-bold">{isAr ? selectedItem.item.title_ar : selectedItem.item.title_en || selectedItem.item.title_ar}</h3>
                                    {(selectedItem.item.desc_ar || selectedItem.item.desc_en) && (
                                        <p className="text-xs text-white/80 mt-1">{isAr ? selectedItem.item.desc_ar : selectedItem.item.desc_en || selectedItem.item.desc_ar}</p>
                                    )}
                                </div>
                            </div>
                            <div className="p-5 overflow-y-auto max-h-[50vh]">
                                <h4 className="font-bold mb-3 text-right">{isAr ? "اختر الحجم" : "Select Size"}</h4>
                                <div className="space-y-2">
                                    {selectedItem.item.prices.map((p, idx) => {
                                        const sLabel = selectedItem.item.size_labels?.[idx] || (isAr ? "عادي" : "Regular");
                                        const isSelected = tempSizeIdx === idx;
                                        return (
                                            <div key={idx} onClick={() => { haptic(5); setTempSizeIdx(idx); }} className={`flex justify-between items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? "border-[#B89038] bg-[#B89038]/5" : "border-[#EAEAEA] dark:border-[#333] hover:border-[#B89038]/50"}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-[#B89038]" : "border-gray-300"}`}>
                                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#B89038]" />}
                                                    </div>
                                                    <span className="font-bold">{p} {currency}</span>
                                                </div>
                                                <span className="text-sm font-medium">{sLabel}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-[#EAEAEA] dark:border-[#333]">
                                <button onClick={addToCart} className="w-full text-white py-3 rounded-xl font-bold shadow-md hover:opacity-90 active:scale-95 transition-all" style={{ backgroundColor: PRIMARY }}>
                                    {isAr ? "إضافة للسلة" : "Add to Cart"} = {selectedItem.item.prices[tempSizeIdx]} {currency}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════ CART MODAL ═══════ */}
            <AnimatePresence>
                {showCart && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)}>
                        <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }} className="w-full max-w-lg mx-auto bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl overflow-hidden mt-auto md:mt-0 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-[#EAEAEA] dark:border-[#333] flex justify-between items-center bg-gray-50 dark:bg-black/20">
                                <button onClick={() => setShowCart(false)} className="w-8 h-8 bg-gray-200 dark:bg-[#333] text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"><X className="w-5 h-5" /></button>
                                <h3 className="text-xl font-bold flex items-center gap-2">{isAr ? "سلة الطلبات" : "Your Cart"} <ShoppingCart className="w-5 h-5 text-[#B89038]" /></h3>
                            </div>
                            <div className="p-5 overflow-y-auto flex-1">
                                {cart.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <ShoppingCart className="w-16 h-16 mx-auto mb-4" />
                                        <p className="font-bold">{isAr ? "السلة فارغة" : "Cart is empty"}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cart.map((c) => (
                                            <div key={c.id} className="flex gap-4 p-3 rounded-2xl border border-[#EAEAEA] dark:border-[#333] bg-gray-50 dark:bg-black/10">
                                                <div className="flex flex-col items-center justify-between bg-white dark:bg-[#1E1E1E] rounded-full p-1 border border-[#EAEAEA] dark:border-[#333]">
                                                    <button onClick={() => updateCartQty(c.id, 1)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#333] flex items-center justify-center hover:bg-[#B89038] hover:text-white transition-colors" >+</button>
                                                    <span className="font-bold text-sm my-1">{c.quantity}</span>
                                                    <button onClick={() => updateCartQty(c.id, -1)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#333] flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">−</button>
                                                </div>
                                                <div className="flex-1 text-right flex flex-col justify-center">
                                                    <div className="flex justify-between items-start mb-1 flex-row-reverse">
                                                        <h4 className="font-bold text-sm leading-tight">{isAr ? c.item.title_ar : c.item.title_en || c.item.title_ar}</h4>
                                                        <span className="font-bold text-[#B89038]">{c.price * c.quantity} {currency}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 bg-gray-200 dark:bg-[#333] px-2 py-0.5 rounded-md w-fit ml-auto">{c.size_label}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {cart.length > 0 && (
                                <div className="p-5 border-t border-[#EAEAEA] dark:border-[#333] bg-gray-50 dark:bg-black/20">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold text-[#B89038] text-xl">{cartTotal} {currency}</span>
                                        <span className="font-bold text-gray-500">{isAr ? "الإجمالي" : "Total"}</span>
                                    </div>
                                    <div className="space-y-3 mb-5">
                                        <input type="text" placeholder={isAr ? "الاسم" : "Name"} value={customerInfo.name} onChange={e => setCustomerInfo(p => ({ ...p, name: e.target.value }))} className="w-full border border-[#EAEAEA] dark:border-[#333] rounded-xl px-4 py-3 bg-white dark:bg-[#1E1E1E] text-right focus:border-[#B89038] outline-none" dir="rtl" />
                                        <input type="tel" placeholder={isAr ? "رقم الموبايل" : "Phone"} value={customerInfo.phone} onChange={e => setCustomerInfo(p => ({ ...p, phone: e.target.value }))} className="w-full border border-[#EAEAEA] dark:border-[#333] rounded-xl px-4 py-3 bg-white dark:bg-[#1E1E1E] text-right focus:border-[#B89038] outline-none" dir="rtl" />
                                        <textarea placeholder={isAr ? "العنوان بالتفصيل" : "Detailed Address"} value={customerInfo.address} onChange={e => setCustomerInfo(p => ({ ...p, address: e.target.value }))} className="w-full border border-[#EAEAEA] dark:border-[#333] rounded-xl px-4 py-3 bg-white dark:bg-[#1E1E1E] text-right focus:border-[#B89038] outline-none h-20 resize-none" dir="rtl" />
                                        <textarea placeholder={isAr ? "ملاحظات إضافية (اختياري)" : "Additional Notes (Optional)"} value={customerInfo.notes} onChange={e => setCustomerInfo(p => ({ ...p, notes: e.target.value }))} className="w-full border border-[#EAEAEA] dark:border-[#333] rounded-xl px-4 py-3 bg-white dark:bg-[#1E1E1E] text-right focus:border-[#B89038] outline-none h-16 resize-none" dir="rtl" />
                                    </div>
                                    <button onClick={checkOutWhatsApp} className="w-full text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-600 transition-colors flex justify-center items-center gap-2 active:scale-95 bg-green-500">
                                        <FaWhatsapp className="w-6 h-6" />
                                        {isAr ? "إرسال الطلب عبر واتساب" : "Order via WhatsApp"}
                                    </button>
                                </div>
                            )}
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
                            className="bg-white dark:bg-[#1E1E1E] w-full max-w-sm rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-[#EAEAEA] dark:border-[#333]"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-[#EAEAEA] dark:border-[#333] flex items-center justify-between">
                                <button onClick={() => setShowPaymentOptions(false)} className="w-10 h-10 bg-gray-100 dark:bg-[#333] rounded-full flex items-center justify-center font-bold active:scale-95 text-[#888]"><X className="w-5 h-5" /></button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black text-black dark:text-white flex items-center justify-end gap-2">
                                        {isAr ? "وسيلة الدفع" : "Payment Method"} <span className="text-2xl">💳</span>
                                    </h3>
                                    <p className="text-[10px] opacity-60 font-black uppercase tracking-widest mt-1">{isAr ? "كيف تود الدفع؟" : "How would you like to pay?"}</p>
                                </div>
                            </div>

                            <div className="p-4 overflow-y-auto flex flex-col gap-3">
                                {config.payment_methods?.map((pm) => (
                                    <div key={pm.id} className="bg-[#FDFBF7] dark:bg-[#121212] border border-[#EAEAEA] dark:border-[#333] rounded-[1.5rem] p-4 text-right flex flex-col transition-all hover:border-[#B89038]/50">
                                        <h4 className="font-bold text-lg text-[#333] dark:text-[#F5F5F5] mb-1">{isAr ? pm.name_ar : pm.name_en || pm.name_ar}</h4>
                                        {(pm.desc_ar || pm.desc_en) && (
                                            <p className="text-xs font-medium text-[#888] mb-3">{isAr ? pm.desc_ar : pm.desc_en || pm.desc_ar}</p>
                                        )}
                                        {pm.number && (
                                            <div className="flex items-center justify-between bg-white dark:bg-[#1E1E1E] px-4 py-3 rounded-xl mb-3 border border-[#EAEAEA] dark:border-[#333] group">
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(pm.number!);
                                                        alert(isAr ? "تم نسخ الرقم!" : "Number copied!");
                                                    }}
                                                    className="text-[#B89038] text-xs font-bold uppercase bg-[#B89038]/10 px-3 py-1.5 rounded-lg active:scale-95"
                                                >
                                                    {isAr ? "نسخ" : "Copy"}
                                                </button>
                                                <span className="font-bold tabular-nums text-sm tracking-widest" dir="ltr">{pm.number}</span>
                                            </div>
                                        )}
                                        {pm.link && (
                                            <a href={pm.link} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-[#1877F2]/10 text-[#1877F2] font-bold text-xs py-3 rounded-xl mb-3 active:scale-95 transition-transform">
                                                {isAr ? "رابط الدفع / انستا باي" : "Payment Link / InstaPay"}
                                            </a>
                                        )}
                                        <button
                                            onClick={() => finalizeOrder(isAr ? pm.name_ar : pm.name_en || pm.name_ar)}
                                            className="w-full text-white font-bold py-3 rounded-xl active:scale-95 transition-transform shadow-md flex items-center justify-center gap-2"
                                            style={{ backgroundColor: PRIMARY }}
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

            {/* ═══════ INLINE CSS ═══════ */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');

                .etoile-no-scrollbar::-webkit-scrollbar { display: none; }
                .etoile-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                .etoile-glass {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }
                .dark .etoile-glass {
                    background: rgba(30, 30, 30, 0.95);
                }

                @keyframes etoile-marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(50%); }
                }
                .etoile-marquee {
                    animation: etoile-marquee 15s linear infinite;
                }
            `}</style>
        </div>
    );
}
