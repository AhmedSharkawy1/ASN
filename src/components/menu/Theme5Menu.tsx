"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Share2, Bike, X, Moon, Sun, ShoppingBag, Plus as PlusIcon, Minus, LayoutGrid } from 'lucide-react';
import { FaWhatsapp, FaFacebook } from 'react-icons/fa';
import SharedMarquee from './SharedMarquee';
import CheckoutModal from './CheckoutModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

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
    marquee_enabled?: boolean;
    marquee_text_ar?: string;
    marquee_text_en?: string;
    orders_enabled?: boolean;
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

interface CartItem {
    id: string;
    item: Item;
    price: number;
    size_label: string;
    quantity: number;
    notes?: string;
    category_name: string;
}

type Props = {
    config: RestaurantConfig;
    categories: Category[];
    language: string;
    restaurantId: string;
};

// Colors from F:\\ASN\\theme5
const THEME5_PRIMARY = '#4ba3e3'; // Light blue
const THEME5_LIGHT = '#e6f2fa';
const THEME5_GREEN = '#a7f3d0';
const THEME5_GREEN_TEXT = '#059669';

export default function Theme5Menu({ config, categories, language, restaurantId }: Props) {
    const isAr = language === "ar";
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string>('');
    const [showCallMenu, setShowCallMenu] = useState(false);
    const [showPaymentMenu, setShowPaymentMenu] = useState(false);

    // Modals
    const [selectedItem, setSelectedItem] = useState<{ item: Item; cName: string; catImg?: string } | null>(null);
    const [tempSizeIdx, setTempSizeIdx] = useState(0);
    const [showCart, setShowCart] = useState(false);
    const [showCategoriesModal, setShowCategoriesModal] = useState(false);

    const [cart, setCart] = useState<CartItem[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "", notes: "" });
    const [showCheckout, setShowCheckout] = useState(false);

    const categoryNavRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);

    const currency = isAr ? "ج.م" : "EGP";

    const filteredCategories = categories.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
            searchQuery === "" ||
            (item.title_ar && item.title_ar.includes(searchQuery)) ||
            (item.title_en && item.title_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.desc_ar && item.desc_ar.includes(searchQuery))
        )
    })).filter(cat => cat.items.length > 0);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        const id = e.target.id.replace("t5-s-", "");
                        setActiveSection(id);
                        const btn = categoryNavRef.current?.querySelector(`[data-cat-id="${id}"]`);
                        btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                    }
                });
            },
            { rootMargin: "-140px 0px -75% 0px", threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(`t5-s-${cat.id}`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories]);

    const haptic = (v = 10) => {
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(v);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setActiveSection('');
        haptic(5);
    };

    const scrollToSection = (id: string) => {
        haptic(10);
        const el = document.getElementById(`t5-s-${id}`);
        if (el) {
            isManualScroll.current = true;
            setActiveSection(id);
            el.scrollIntoView({ behavior: "smooth" });
            setTimeout(() => { isManualScroll.current = false; }, 800);
        }
    };

    const handleArrowScroll = (direction: 'left' | 'right') => {
        if (categoryNavRef.current) {
            const scrollAmount = 150;
            categoryNavRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            haptic(5);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: config.name,
                    text: isAr ? `أستمتع بأحلى مأكولات ${config.name} 😋` : `Enjoy the best from ${config.name} 😋`,
                    url: window.location.href,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert(isAr ? 'تم نسخ الرابط بنجاح!' : 'Link copied successfully!');
            });
        }
    };

    // ─── Cart Logic ───
    const openItemSelect = (item: Item, cName: string) => {
        if (config.orders_enabled === false) return;
        setSelectedItem({ item, cName });
        setTempSizeIdx(0);
        haptic(10);
    };

    const addToCart = () => {
        if (!selectedItem || config.orders_enabled === false) return;
        const { item, cName } = selectedItem;
        const price = item.prices ? parseFloat(item.prices[tempSizeIdx]?.toString()) : 0;
        const sizeLabel = item.size_labels?.[tempSizeIdx] || (isAr ? "عادي" : "Regular");
        const cartId = `${item.id}-${sizeLabel}`;
        setCart((prev) => {
            const ex = prev.find((c) => c.id === cartId);
            if (ex) return prev.map((c) => (c.id === cartId ? { ...c, quantity: c.quantity + 1 } : c));
            return [...prev, { id: cartId, item, price, size_label: sizeLabel, quantity: 1, category_name: cName }];
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const checkOutWhatsApp = () => {
        if (!config.whatsapp_number) { alert(isAr ? "عذراً، لم يتم توفير رقم واتساب." : "No WhatsApp number available."); return; }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            alert(isAr ? "⚠️ يرجى إدخال جميع البيانات" : "⚠️ Please fill all fields");
            return;
        }

        if (config.payment_methods && config.payment_methods.length > 0) {
            setShowPaymentMenu(true);
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
        setShowPaymentMenu(false);
    };

    return (
        <div className="min-h-screen pb-40 bg-[#f4f6f8] dark:bg-[#121212] transition-colors duration-500 font-sans" dir={isAr ? "rtl" : "ltr"}>

            {/* Header Area */}
            <div className="flex flex-col bg-white dark:bg-[#18181b]">
                {/* Top Navigation Bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 h-14">
                    <div className="flex items-center gap-4">
                        {isSearchOpen ? (
                            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1.5 animate-fade-in">
                                <input
                                    type="text"
                                    placeholder={isAr ? "بحث..." : "Search..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm w-32 md:w-48 dark:text-white text-right"
                                    autoFocus
                                    dir={isAr ? "rtl" : "ltr"}
                                />
                                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-zinc-500 mr-2">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsSearchOpen(true)} className="text-zinc-600 dark:text-zinc-300 transition-colors hover:text-[#4ba3e3]">
                                <Search className="w-5 h-5" />
                            </button>
                        )}
                        {!isSearchOpen && (
                            <button onClick={handleShare} className="text-zinc-600 dark:text-zinc-300 transition-colors hover:text-[#4ba3e3]">
                                <Share2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {!isSearchOpen && (
                        <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors">
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    )}

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{isAr ? "توصيل" : "Delivery"}</span>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: THEME5_PRIMARY }}>
                                <Bike className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shared Marquee Banner */}
                {config.marquee_enabled && (config.marquee_text_ar || config.marquee_text_en) && (
                    <SharedMarquee
                        text={isAr ? (config.marquee_text_ar || config.marquee_text_en || '') : (config.marquee_text_en || config.marquee_text_ar || '')}
                        bgColor={THEME5_PRIMARY}
                    />
                )}

                {/* Hero Section */}
                <div className="relative">
                    {/* Banner Image */}
                    <div className="h-48 md:h-64 w-full relative">
                        {config.cover_images && config.cover_images.length > 0 ? (
                            <Swiper
                                modules={[Autoplay, EffectFade]}
                                effect="fade"
                                autoplay={{ delay: 3000, disableOnInteraction: false }}
                                loop={config.cover_images.length > 1}
                                className="w-full h-full absolute inset-0 z-0"
                            >
                                {config.cover_images.map((img: string, idx: number) => (
                                    <SwiperSlide key={idx}>
                                        <img src={img || 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000&auto=format&fit=crop'}
                                            alt={`Cover ${idx}`} className="w-full h-full object-cover" />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        ) : config.cover_url ? (
                            <img src={config.cover_url} alt="Restaurant Banner" className="w-full h-full object-cover z-0" />
                        ) : (
                            <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 z-0"></div>
                        )}
                    </div>

                    {/* Floating Info Card */}
                    <div className="absolute -bottom-12 left-4 right-4 bg-white dark:bg-zinc-800 rounded-xl t5-shadow-floating p-4 flex items-center justify-between border border-zinc-100 dark:border-zinc-700 z-10">
                        <div className="flex flex-col gap-2">
                            <div className="px-3 py-1 rounded-md text-xs font-bold w-fit" style={{ backgroundColor: `${THEME5_GREEN}33`, color: THEME5_GREEN_TEXT }}>
                                {isAr ? "مفتوح" : "Open"}
                            </div>
                        </div>

                        <div className="flex flex-col items-end mr-16" dir={isAr ? "rtl" : "ltr"}>
                            <h1 className="text-lg font-bold text-zinc-900 dark:text-white line-clamp-1">{config.name}</h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{isAr ? "الفرع الرئيسي" : "Main Branch"}</p>
                        </div>

                        {/* Overlapping Logo */}
                        <div className="absolute -top-6 -right-2 w-24 h-24 rounded-full border-4 border-white dark:border-zinc-800 overflow-hidden bg-white shadow-sm z-20">
                            {config.logo_url ? (
                                <img src={config.logo_url} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-2xl">🍽️</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Spacing for floating card */}
                <div className="h-16"></div>

                {/* Announcement Banner */}
                <div className="mx-4 mb-4 rounded-lg p-3 text-center font-bold text-sm border flex items-center justify-center gap-2" style={{ backgroundColor: THEME5_LIGHT, color: THEME5_PRIMARY, borderColor: `${THEME5_PRIMARY}33` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: THEME5_PRIMARY }}></span>
                    {isAr ? `أستمتع بأحلى مأكولات ${config.name} 😋` : `Enjoy the best from ${config.name} 😋`}
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: THEME5_PRIMARY }}></span>
                </div>
            </div>

            {/* Category Nav */}
            <div className="sticky top-0 z-[100] bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md py-3 border-b border-zinc-100 dark:border-white/5 shadow-sm flex items-center justify-between flex-row-reverse px-2">
                <button
                    onClick={() => setShowCategoriesModal(true)}
                    className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full ml-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 active:scale-95 transition-transform"
                >
                    <LayoutGrid className="w-5 h-5" />
                </button>
                <div className="flex-1 relative overflow-hidden h-full flex items-center">
                    <button
                        onClick={() => handleArrowScroll('right')}
                        className="t5-nav-arrow right-1.5 flex items-center justify-center text-zinc-400 dark:text-zinc-500"
                    >
                        <span className="text-sm font-bold leading-none">›</span>
                    </button>
                    <button
                        onClick={() => handleArrowScroll('left')}
                        className="t5-nav-arrow left-1.5 flex items-center justify-center text-zinc-400 dark:text-zinc-500"
                    >
                        <span className="text-sm font-bold leading-none">‹</span>
                    </button>

                    <div ref={categoryNavRef} className="flex items-center overflow-x-auto t5-no-scrollbar px-6 py-1 gap-2 scroll-smooth" dir="rtl">
                        <button
                            onClick={scrollToTop}
                            data-cat-id="top"
                            className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-colors border ${activeSection === '' ? 'text-white' : 'bg-white dark:bg-zinc-900'}`}
                            style={activeSection === '' ? { backgroundColor: THEME5_PRIMARY, borderColor: THEME5_PRIMARY } : { color: THEME5_PRIMARY, borderColor: `${THEME5_PRIMARY}4d` }}
                        >
                            {isAr ? "الكل" : "All"}
                        </button>
                        {categories.map((c) => (
                            <button
                                key={c.id}
                                data-cat-id={c.id}
                                onClick={() => scrollToSection(c.id)}
                                className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors border ${activeSection === c.id ? 'text-white' : 'bg-white dark:bg-zinc-900'}`}
                                style={activeSection === c.id ? { backgroundColor: THEME5_PRIMARY, borderColor: THEME5_PRIMARY } : { color: THEME5_PRIMARY, borderColor: `${THEME5_PRIMARY}4d` }}
                            >
                                <span>{isAr ? c.name_ar : c.name_en || c.name_ar}</span>
                                {c.emoji && <span>{c.emoji}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Lists */}
            <main className="mt-8 space-y-12 max-w-4xl mx-auto px-4 md:px-6">
                {filteredCategories.map((cat) => (
                    <section key={cat.id} id={`t5-s-${cat.id}`}>
                        <div className="flex flex-col gap-3 mb-6">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: `${THEME5_PRIMARY}1a` }}>
                                    {cat.emoji}
                                </div>
                                <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100 tracking-tight">{isAr ? cat.name_ar : cat.name_en || cat.name_ar}</h3>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            {cat.items.map((item, idx) => {
                                const title = isAr ? item.title_ar : item.title_en || item.title_ar;
                                const desc = isAr ? item.desc_ar : item.desc_en;
                                return (
                                    <div
                                        key={idx}
                                        className="t5-item-card overflow-hidden flex items-center p-3 gap-3 transition-all duration-300 bg-white dark:bg-[#18181b] border border-[#edf2f7] dark:border-[#27272a] cursor-pointer"
                                        dir="ltr" // forces price left, image right when inside flex
                                    >
                                        {/* Price (Left) */}
                                        <div className="flex-shrink-0 flex flex-col gap-1.5 min-w-[3.5rem] items-center">
                                            {item.prices.map((price, pIdx) => {
                                                const sizeLabel = item.size_labels?.[pIdx] || (isAr ? "عادي" : "Regular");
                                                return (
                                                    <div key={pIdx} className="px-2 py-1 rounded-lg flex flex-col items-center justify-center min-w-[3.5rem]" style={{ backgroundColor: THEME5_LIGHT, color: THEME5_PRIMARY }}>
                                                        <div className="flex items-center gap-0.5">
                                                            <span className="text-sm font-bold">{price}</span>
                                                            <span className="text-[9px]">{currency}</span>
                                                        </div>
                                                        {item.prices.length > 1 && sizeLabel && <span className="text-[8px] font-bold opacity-80">{sizeLabel}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Content (Middle) */}
                                        <div className="flex-1 flex flex-col items-end text-right" dir="rtl">
                                            <h3 className="text-sm md:text-base font-bold text-zinc-900 dark:text-white line-clamp-1 mb-1">
                                                {title}
                                            </h3>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-tight">
                                                {desc || title}
                                            </p>
                                        </div>

                                        {/* Image (Right) */}
                                        <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                            {item.image_url || cat.image_url ? (
                                                <img src={item.image_url || cat.image_url} alt={title} className="w-full h-full object-cover" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-8 h-8 opacity-20" /></div>
                                            )}
                                            {item.is_popular && (
                                                <div className="absolute top-1 right-1 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10" style={{ backgroundColor: THEME5_PRIMARY }}>
                                                    {isAr ? "شائع" : "Popular"}
                                                </div>
                                            )}
                                        </div>
                                        {config.orders_enabled !== false && (
                                            <button onClick={() => openItemSelect(item, title)} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-600 dark:text-zinc-300 ml-3 active:scale-90 transition-transform shadow-sm">
                                                <PlusIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-[130] t5-bottom-nav px-2 py-4 flex items-center justify-around rounded-t-[2rem]">
                {config.facebook_url && (
                    <a href={config.facebook_url} target="_blank" className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-10 h-10 flex items-center justify-center bg-[#1877F2]/10 text-[#1877F2] rounded-xl active:scale-90 transition-transform">
                            <FaFacebook className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black text-zinc-500">{isAr ? "فيسبوك" : "Facebook"}</span>
                    </a>
                )}

                <div onClick={() => setShowCallMenu(true)} className="flex flex-col items-center gap-1 flex-1 cursor-pointer">
                    <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl active:scale-90 transition-transform">
                        <span className="text-lg">📞</span>
                    </div>
                    <span className="text-[9px] font-black text-zinc-500">{isAr ? "دليفري" : "Call"}</span>
                </div>

                <div onClick={scrollToTop} className="flex flex-col items-center gap-1 flex-1 -mt-8 cursor-pointer">
                    <div className="w-14 h-14 flex items-center justify-center text-white rounded-full shadow-lg border-[4px] border-[#f8f9fa] dark:border-[#121212] active:scale-90 transition-transform" style={{ backgroundColor: THEME5_PRIMARY }}>
                        <span className="text-xl font-black">↑</span>
                    </div>
                    <span className="text-[9px] font-black mt-1" style={{ color: THEME5_PRIMARY }}>{isAr ? "للأعلى" : "Top"}</span>
                </div>

                <div onClick={() => setShowPaymentMenu(true)} className="flex flex-col items-center gap-1 flex-1 cursor-pointer">
                    <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl active:scale-90 transition-transform">
                        <span className="text-lg">💳</span>
                    </div>
                    <span className="text-[9px] font-black text-zinc-500">{isAr ? "الدفع" : "Pay"}</span>
                </div>

                {config.map_link && (
                    <a href={config.map_link} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 flex-1 cursor-pointer">
                        <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl active:scale-90 transition-transform">
                            <span className="text-lg">📍</span>
                        </div>
                        <span className="text-[9px] font-black text-zinc-500">{isAr ? "الموقع" : "Map"}</span>
                    </a>
                )}

                {config.orders_enabled !== false && (
                    <div onClick={() => setShowCart(true)} className="flex flex-col items-center gap-1 flex-1 cursor-pointer relative">
                        <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl active:scale-90 transition-transform">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        {cartCount > 0 && (
                            <div className="absolute -top-1 right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</div>
                        )}
                        <span className="text-[9px] font-black text-zinc-500">{isAr ? "السلة" : "Cart"}</span>
                    </div>
                )}
            </nav>

            {/* Floating WhatsApp */}
            {config.whatsapp_number && (
                <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, "")}`} target="_blank" className="fixed bottom-28 right-5 bg-[#25D366] w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 z-[100]">
                    <FaWhatsapp className="w-7 h-7" />
                </a>
            )}

            {/* Modals */}
            <AnimatePresence>
                {/* Item Select Modal */}
                {selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-lg bg-white dark:bg-[#1E1E1E] rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="relative h-48 bg-zinc-100 dark:bg-zinc-800">
                                {selectedItem.catImg ? (
                                    <img src={selectedItem.catImg} alt={selectedItem.cName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">{selectedItem.item.is_spicy ? "🌶️" : "🍽️"}</div>
                                )}
                                <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 pb-2">
                                <h3 className="text-2xl font-bold mb-1 text-right">{selectedItem.cName}</h3>
                                <p className="text-zinc-500 text-sm text-right line-clamp-2">{isAr ? selectedItem.item.desc_ar : selectedItem.item.desc_en}</p>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                <div className="space-y-3">
                                    {selectedItem.item.prices.map((price, idx) => {
                                        const label = selectedItem.item.size_labels?.[idx] || (isAr ? "عادي" : "Regular");
                                        const isSelected = tempSizeIdx === idx;
                                        return (
                                            <div key={idx} onClick={() => setTempSizeIdx(idx)} className={`flex justify-between items-center p-4 rounded-xl border-2 cursor-pointer flex-row-reverse ${isSelected ? 'border-[#4ba3e3] bg-[#e6f2fa] dark:bg-[#4ba3e3]/10' : 'border-zinc-200 dark:border-zinc-800'}`}>
                                                <div className="flex items-center gap-3 flex-row-reverse">
                                                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: isSelected ? THEME5_PRIMARY : '#cbd5e1' }}>
                                                        {isSelected && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEME5_PRIMARY }}></div>}
                                                    </div>
                                                    <span className={`font-bold ${isSelected ? 'text-[#4ba3e3]' : ''}`}>{label}</span>
                                                </div>
                                                <span className={`font-bold ${isSelected ? 'text-[#4ba3e3]' : ''}`}>{price} {currency}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {config.orders_enabled !== false && (
                                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800">
                                    <button onClick={addToCart} className="w-full text-white py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2" style={{ backgroundColor: THEME5_PRIMARY }}>
                                        <ShoppingBag className="w-5 h-5" />
                                        {isAr ? "إضافة للسلة" : "Add to Cart"} — {selectedItem.item.prices[tempSizeIdx]} {currency}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                {/* Cart Modal */}
                {showCart && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCart(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-lg bg-white dark:bg-[#1E1E1E] rounded-3xl overflow-hidden flex flex-col max-h-[95vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center flex-row-reverse bg-gray-50 dark:bg-black/20">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    {isAr ? "سلة الطلبات" : "Your Cart"} <ShoppingBag className="w-5 h-5" style={{ color: THEME5_PRIMARY }} />
                                </h3>
                                <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-5 overflow-y-auto flex-1">
                                {cart.length === 0 ? (
                                    <div className="text-center py-10 opacity-50 font-bold">{isAr ? "السلة فارغة" : "Cart is empty"}</div>
                                ) : (
                                    <div className="space-y-4">
                                        {cart.map((c) => (
                                            <div key={c.id} className="flex gap-4 p-3 border rounded-2xl flex-row-reverse border-zinc-100 dark:border-zinc-800 bg-gray-50 dark:bg-black/10">
                                                <div className="flex flex-col items-center justify-between bg-white dark:bg-[#1E1E1E] border rounded-full p-1 border-zinc-100 dark:border-zinc-800">
                                                    <button onClick={() => updateCartQty(c.id, 1)} className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-[#333] flex items-center justify-center hover:bg-[#4ba3e3] hover:text-white transition-colors"><PlusIcon className="w-4 h-4" /></button>
                                                    <span className="font-bold tabular-nums my-1">{c.quantity}</span>
                                                    <button onClick={() => updateCartQty(c.id, -1)} className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-[#333] flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><Minus className="w-4 h-4" /></button>
                                                </div>
                                                <div className="flex-1 text-right flex flex-col justify-center">
                                                    <div className="flex justify-between items-start flex-row-reverse">
                                                        <h4 className="font-bold text-sm leading-tight flex-1 line-clamp-2">{isAr ? c.item.title_ar : c.item.title_en || c.item.title_ar}</h4>
                                                        <span className="font-bold shrink-0 tabular-nums ml-4" style={{ color: THEME5_PRIMARY }}>{c.price * c.quantity} {currency}</span>
                                                    </div>
                                                    <span className="text-xs text-zinc-500 mt-1 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-md w-fit font-medium">{c.size_label}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {cart.length > 0 && (
                                <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-gray-50 dark:bg-black/20">
                                    <div className="flex justify-between items-center mb-5 flex-row-reverse">
                                        <span className="font-bold text-zinc-500">{isAr ? "الإجمالي" : "Total"}</span>
                                        <span className="font-bold text-2xl tabular-nums" style={{ color: THEME5_PRIMARY }}>{cartTotal} {currency}</span>
                                    </div>
                                    <button onClick={() => { setShowCart(false); setShowCheckout(true); }} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 text-lg active:scale-95 transition-all shadow-lg shadow-emerald-500/30">
                                        {isAr ? "إتمام الطلب" : "Proceed to Checkout"}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                {/* Delivery Call Modal */}
                {showCallMenu && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowCallMenu(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                            <div className="p-5 text-center shrink-0" style={{ backgroundColor: THEME5_PRIMARY }}>
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-md">
                                    <span className="text-xl">📞</span>
                                </div>
                                <h3 className="text-xl font-black text-white uppercase">{isAr ? "أرقام التوصيل" : "Delivery"}</h3>
                            </div>
                            <div className="p-3 space-y-2 overflow-y-auto t5-no-scrollbar">
                                {config.phone && (
                                    <a href={`tel:${config.phone}`} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 active:scale-95 transition-transform group flex-row-reverse">
                                        <div className="flex flex-col items-end">
                                            <span className="text-base font-black text-zinc-800 dark:text-white tabular-nums">{config.phone}</span>
                                            <span className="text-[9px] text-zinc-400 font-bold">{isAr ? "الرقم الرئيسي" : "Main Number"}</span>
                                        </div>
                                        <div className="w-9 h-9 bg-white dark:bg-zinc-700 rounded-xl flex items-center justify-center text-lg" style={{ color: THEME5_PRIMARY }}>☏</div>
                                    </a>
                                )}
                                {config.phone_numbers?.map((num, i) => (
                                    <a key={i} href={`tel:${num.number}`} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 active:scale-95 transition-transform group flex-row-reverse">
                                        <div className="flex flex-col items-end">
                                            <span className="text-base font-black text-zinc-800 dark:text-white tabular-nums">{num.number}</span>
                                            <span className="text-[9px] text-zinc-400 font-bold">{num.label}</span>
                                        </div>
                                        <div className="w-9 h-9 bg-white dark:bg-zinc-700 rounded-xl flex items-center justify-center text-lg" style={{ color: THEME5_PRIMARY }}>☏</div>
                                    </a>
                                ))}
                            </div>
                            <div className="p-4 pt-0 shrink-0">
                                <button onClick={() => setShowCallMenu(false)} className="w-full py-3 text-zinc-400 font-bold text-[10px] uppercase">{isAr ? "إغلاق القائمة" : "Close"}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Payment Modal */}
                {showPaymentMenu && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowPaymentMenu(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                            <div className="p-6 pb-2 text-center shrink-0 flex justify-between items-start">
                                <button onClick={() => setShowPaymentMenu(false)} className="w-8 h-8 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center font-bold active:scale-95 text-zinc-500">✕</button>
                                <div className="text-right">
                                    <div className="w-12 h-12 bg-zinc-100 dark:bg-white/5 rounded-2xl flex items-center justify-center ml-auto mb-3 text-2xl" style={{ color: THEME5_PRIMARY }}>💳</div>
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-1">{isAr ? "وسائل الدفع" : "Payment Methods"}</h3>
                                    <p className="text-[10px] opacity-60 font-black uppercase tracking-widest">{isAr ? "طرق الدفع المتاحة" : "Available Payment Methods"}</p>
                                </div>
                            </div>
                            <div className="px-5 py-4 space-y-3 overflow-y-auto t5-no-scrollbar">
                                {config.payment_methods && config.payment_methods.length > 0 ? (
                                    config.payment_methods.map((pm) => (
                                        <div key={pm.id} className="block p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 text-right transition-all hover:border-[#4ba3e3]/50">
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
                                                        className="text-[10px] font-black uppercase px-2 py-1 rounded-lg active:scale-95"
                                                        style={{ color: THEME5_PRIMARY, backgroundColor: `${THEME5_PRIMARY}1a` }}
                                                    >
                                                        {isAr ? "نسخ" : "Copy"}
                                                    </button>
                                                    <span className="font-black tabular-nums text-xs tracking-widest flex items-center gap-2" dir="ltr">{pm.number}</span>
                                                </div>
                                            )}
                                            {pm.link && (
                                                <a href={pm.link} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-[#1877F2]/10 text-[#1877F2] font-black text-[10px] py-2.5 rounded-xl active:scale-95 transition-transform mt-2">
                                                    {isAr ? "رابط الدفع / انستا باي" : "Payment Link / InstaPay"}
                                                </a>
                                            )}
                                            {cart.length > 0 && (
                                                <button
                                                    onClick={() => finalizeOrder(isAr ? pm.name_ar : pm.name_en || pm.name_ar)}
                                                    className="w-full text-white font-black py-2.5 rounded-xl active:scale-95 transition-transform mt-2 shadow-md flex items-center justify-center gap-2 text-[11px]"
                                                    style={{ backgroundColor: THEME5_PRIMARY }}
                                                >
                                                    <FaWhatsapp className="w-4 h-4" />
                                                    {isAr ? "تأكيد واستمرار" : "Confirm & Continue"}
                                                </button>
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

                {/* Categories Grid Modal */}
                {showCategoriesModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCategoriesModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-[2rem] overflow-hidden flex flex-col max-h-[85vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="p-5 flex justify-between items-center bg-gray-50 dark:bg-black/20 border-b border-zinc-100 dark:border-zinc-800 flex-row-reverse shrink-0">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                                    <LayoutGrid className="w-5 h-5" style={{ color: THEME5_PRIMARY }} />
                                    {isAr ? "جميع الأقسام" : "All Categories"}
                                </h3>
                                <button onClick={() => setShowCategoriesModal(false)} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-4 overflow-y-auto t5-no-scrollbar grid grid-cols-2 gap-3 pb-8">
                                {categories.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            setShowCategoriesModal(false);
                                            scrollToSection(c.id);
                                        }}
                                        className="flex flex-col items-center justify-center p-4 border rounded-2xl bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all active:scale-95 group gap-2"
                                    >
                                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform" style={{ backgroundColor: `${THEME5_PRIMARY}1a` }}>
                                            {c.emoji || "🍽️"}
                                        </div>
                                        <span className="text-sm font-bold text-center text-zinc-800 dark:text-zinc-200 line-clamp-2 w-full leading-tight">{isAr ? c.name_ar : c.name_en || c.name_ar}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Checkout Modal */}
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
                whatsappNumber={config.whatsapp_number}
                currency={currency}
                language={language}
                onOrderSuccess={() => { setCart([]); setShowCart(false); }}
            />

            <style jsx global>{`
                .t5-scrollbar::-webkit-scrollbar { display: none; }
                .t5-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .t5-no-scrollbar::-webkit-scrollbar { display: none; }
                .t5-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                .t5-shadow-floating {
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                .dark .t5-shadow-floating {
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }

                .t5-nav-arrow {
                    position: absolute; top: 50%; transform: translateY(-50%); z-index: 50;
                    width: 28px; height: 28px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    cursor: pointer; transition: all 0.2s;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .dark .t5-nav-arrow { background: rgba(24, 24, 27, 0.95); border-color: rgba(255,255,255,0.1); }
                
                .t5-item-card {
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    border-radius: 1rem;
                }
                .dark .t5-item-card { box-shadow: 0 4px 20px rgba(0,0,0,0.3); }

                .t5-bottom-nav {
                    background: rgba(255, 255, 255, 0.96);
                    backdrop-filter: blur(20px);
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.08);
                }
                .dark .t5-bottom-nav { background: rgba(24, 24, 27, 0.96); box-shadow: 0 -10px 40px rgba(0,0,0,0.5); }
            `}</style>
        </div>
    );
}
