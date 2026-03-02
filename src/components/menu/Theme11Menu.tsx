'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, AlertCircle, Moon, Sun, ShoppingCart, Plus, Minus, Trash2, X, FileText, MapPin as MapIcon, List, Globe, PhoneCall } from 'lucide-react';
import { FaWhatsapp, FaFacebookF, FaSnapchatGhost, FaInstagram } from 'react-icons/fa';
import SharedMarquee from './SharedMarquee';
import CheckoutModal from './CheckoutModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

type MenuItem = {
    id: string | number;
    title_ar: string;
    title_en?: string;
    description_ar?: string;
    description_en?: string;
    image?: string;
    image_url?: string;
    prices: number[];
    size_labels?: string[];
    extras?: { id?: number | string; name_ar: string; name_en?: string; price: number }[];
    is_available?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

// ================= THEME 11 CONSTANTS =================
const T11_PRIMARY = '#e54750'; // Luxe red

interface CategoryWithItemsType {
    id: string | number;
    name_ar: string;
    name_en?: string;
    items?: MenuItem[];
    image_url?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface RestaurantType {
    name: string;
    theme?: string;
    theme_colors?: {
        main_color?: string;
        bg_color?: string;
        text_color?: string;
    };
    cover_images?: string[];
    marquee_enabled?: boolean;
    marquee_text_ar?: string;
    marquee_text_en?: string;
    orders_enabled?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface Theme11MenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
}

export default function Theme11Menu({ config, categories, restaurantId }: Theme11MenuProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isPhoneMenuOpen, setIsPhoneMenuOpen] = useState(false);
    useEffect(() => setMounted(true), []);

    const isAr = config.default_language === 'ar' || true; // Defaulting to true for now since design is RTL primary
    const isDark = mounted && theme === 'dark';
    const cur = '';

    // Theme Variables - matching HTML
    const bgBody = isDark ? '#0f172a' : '#f8fafc'; // slate-900 / slate-50
    const bgCard = isDark ? '#1e293b' : '#ffffff'; // slate-800 / white
    const textMain = isDark ? '#f1f5f9' : '#0f172a'; // slate-100 / slate-900
    const textMuted = isDark ? '#94a3b8' : '#64748b'; // slate-400 / slate-500
    const borderColor = isDark ? '#334155' : '#e2e8f0'; // slate-700 / slate-200
    const primaryColor = config.theme_colors?.main_color || T11_PRIMARY;

    // State
    const [activeCategory, setActiveCategory] = useState<string>('all');

    // Drawers & Modals
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; catName: string; catImg?: string } | null>(null);

    // Item Detail Modal
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [notes, setNotes] = useState('');
    const [selectedExtras, setSelectedExtras] = useState<{ id: number | string, name: string, price: number }[]>([]);

    // Checkout
    const [showCheckout, setShowCheckout] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
    const [cart, setCart] = useState<{ id: string, item: MenuItem, catName: string, price: number, sizeLabel: string, quantity: number, notes: string }[]>([]);

    const itemName = (item: MenuItem) => isAr ? item.title_ar : (item.title_en || item.title_ar);
    const catName = (cat: CategoryWithItemsType) => isAr ? cat.name_ar : (cat.name_en || cat.name_ar);

    // Derived cart values
    const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
    const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    // ── CART HANDLING ──
    const openItemSelect = (item: MenuItem, cName: string, cImg?: string) => {
        if (config.orders_enabled === false) return;
        setSelectedItem({ item, catName: cName, catImg: cImg });
        setQty(1);
        setSizeIdx(0);
        setSelectedExtras([]);
        setNotes('');
        // openItemModal();
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setSelectedItem(null);
        document.body.style.overflow = 'auto';
    };

    // Cart Handlers
    const addToCart = () => {
        if (!selectedItem || config.orders_enabled === false) return;
        const itemP = selectedItem.item.prices[sizeIdx] || 0;
        const extP = selectedExtras.reduce((sum, e) => sum + e.price, 0);
        const finalPrice = itemP + extP;

        let sizeLbl = selectedItem.item.size_labels?.[sizeIdx] || '';
        if (selectedExtras.length > 0) {
            const extNames = selectedExtras.map(e => e.name).join(' + ');
            sizeLbl = sizeLbl ? `${sizeLbl} | +${extNames}` : `+${extNames}`;
        }

        const cId = `${selectedItem.item.id}-${sizeIdx}-${selectedExtras.map(e => e.id).sort().join('-')}`;

        setCart(prev => {
            const ex = prev.find(c => c.id === cId && c.notes === notes);
            if (ex) return prev.map(c => c.id === cId && c.notes === notes ? { ...c, quantity: c.quantity + qty } : c);
            return [...prev, {
                id: cId,
                item: selectedItem.item,
                catName: selectedItem.catName,
                price: finalPrice,
                sizeLabel: sizeLbl,
                quantity: qty,
                notes
            }];
        });
        closeModal();
        setIsCartOpen(true);
    };

    const updateQty = (id: string, itemNotes: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id === id && c.notes === itemNotes) {
                const n = c.quantity + delta;
                return n > 0 ? { ...c, quantity: n } : c;
            }
            return c;
        }).filter(c => c.quantity > 0));
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const checkOutWhatsApp = () => {
        if (!config.phone) {
            alert(isAr ? 'رقم المطعم غير متوفر' : 'Restaurant phone unavailable');
            return;
        }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            alert(isAr ? 'يرجى إكمال بيانات التوصيل' : 'Please complete delivery details');
            return;
        }

        let txt = isAr ? `*طلب جديد من ${customerInfo.name}*%0A` : `*New Order from ${customerInfo.name}*%0A`;
        txt += isAr ? `رقم الهاتف: ${customerInfo.phone}%0A` : `Phone: ${customerInfo.phone}%0A`;
        txt += isAr ? `العنوان: ${customerInfo.address}%0A%0A` : `Address: ${customerInfo.address}%0A%0A`;

        cart.forEach(c => {
            txt += `▪ ${itemName(c.item)} (${c.quantity}x)\n`;
            if (c.sizeLabel) txt += `   ${c.sizeLabel}\n`;
            if (c.notes) txt += `   📝 ${c.notes}\n`;
            txt += `   ${cur}${(c.price * c.quantity).toFixed?.(0)}\n\n`;
        });

        txt += isAr ? `*الإجمالي: ${cur}${cartTotal.toFixed?.(0)}*` : `*Total: ${cur}${cartTotal.toFixed?.(0)}*`;

        const tel = config.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`, '_blank');
    };

    // Filter Logic
    const activeCatList = activeCategory === 'all'
        ? categories
        : categories.filter(c => c.id === activeCategory);

    if (!mounted) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;

    return (
        <div className={`min-h-screen font-poppins pb-24`} style={{ backgroundColor: bgBody, color: textMain }} dir={isAr ? 'rtl' : 'ltr'}>

            {/* Header Marquee */}
            {config.marquee_enabled && (
                <div className="font-poppins text-sm text-white" style={{ backgroundColor: primaryColor }}>
                    <SharedMarquee
                        text={isAr ? (config.marquee_text_ar || '') : (config.marquee_text_en || config.marquee_text_ar || '')}
                    />
                </div>
            )}

            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-[100] shadow-sm backdrop-blur-md border-b transition-colors duration-300" style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)', borderColor }}>
                <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={config.logo_url} alt="Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border-2 shadow-sm" style={{ borderColor: primaryColor }} />
                        <div>
                            <h1 className="font-extrabold text-base md:text-xl line-clamp-1">{config.name}</h1>
                            <p className="text-[10px] md:text-sm font-semibold flex items-center gap-1" style={{ color: textMuted }}>
                                <UtensilsCrossed className="w-3 h-3" />
                                {isAr ? 'القائمة الرقمية' : 'Digital Menu'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-1.5 md:gap-2 mr-2 md:mr-4 border-r pr-2 md:pr-4 border-gray-200 dark:border-slate-700">
                            {config.map_link ? (
                                <a href={config.map_link} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700">
                                    <MapIcon className="w-4 h-4 md:w-4.5 md:h-4.5" />
                                </a>
                            ) : (config.latitude && config.longitude && (
                                <a href={`https://www.google.com/maps/search/?api=1&query=${config.latitude},${config.longitude}`} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700">
                                    <MapIcon className="w-4 h-4 md:w-4.5 md:h-4.5" />
                                </a>
                            ))}

                            {(config.social_links?.facebook || config.facebook_url) && (
                                <a href={config.social_links?.facebook || config.facebook_url} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-[#1877f2] hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700">
                                    <FaFacebookF className="text-sm md:text-base" />
                                </a>
                            )}

                            {(config.social_links?.instagram || config.instagram_url) && (
                                <a href={config.social_links?.instagram || config.instagram_url} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-[#E1306C] hover:bg-pink-50 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700">
                                    <FaInstagram className="text-sm md:text-base" />
                                </a>
                            )}

                            {(config.social_links?.whatsapp || config.whatsapp_number) && (
                                <a href={`https://wa.me/${(config.social_links?.whatsapp || config.whatsapp_number || '').replace(/\+/g, '')}`} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-[#25D366] hover:bg-green-50 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700">
                                    <FaWhatsapp className="text-sm md:text-base md:text-lg" />
                                </a>
                            )}

                            {config.social_links?.snapchat && (
                                <a href={config.social_links.snapchat} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-[#fffc00] hover:bg-yellow-50 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700">
                                    <FaSnapchatGhost className="text-sm md:text-base" />
                                </a>
                            )}

                            {config.website_url && (
                                <a href={config.website_url} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700">
                                    <Globe className="w-4 h-4 md:w-4.5 md:h-4.5" />
                                </a>
                            )}

                            {(config.phone || (config.phones && config.phones.length > 0)) && (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsPhoneMenuOpen(!isPhoneMenuOpen)}
                                        className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700"
                                    >
                                        <PhoneCall className="w-4 h-4 md:w-4.5 md:h-4.5" />
                                    </button>

                                    <AnimatePresence>
                                        {isPhoneMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 py-2 z-[110] overflow-hidden"
                                            >
                                                <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 text-xs font-bold text-gray-500 uppercase text-center">
                                                    أرقام الديلفري
                                                </div>
                                                {config.phones && config.phones.length > 0 ? (
                                                    config.phones.map((phoneNum: string, idx: number) => (
                                                        <a
                                                            key={idx}
                                                            href={`tel:${phoneNum}`}
                                                            className="block px-4 py-2.5 text-center text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                                        >
                                                            {phoneNum}
                                                        </a>
                                                    ))
                                                ) : (
                                                    <a
                                                        href={`tel:${config.phone}`}
                                                        className="block px-4 py-2.5 text-center text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        {config.phone}
                                                    </a>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="w-9 h-9 md:w-10 md:h-10 flex flex-col items-center justify-center rounded-full transition-colors border" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor }}>
                            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
                        </button>
                        {config.orders_enabled !== false && (
                            <button onClick={() => setIsCartOpen(true)} className="relative w-9 h-9 md:w-10 md:h-10 flex flex-col items-center justify-center rounded-full text-white transition-transform active:scale-95 shadow-md hover:shadow-lg" style={{ backgroundColor: primaryColor }}>
                                <ShoppingCart className="w-5 h-5" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-xs font-bold flex items-center justify-center border-2" style={{ color: primaryColor, borderColor: primaryColor }}>
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-[1200px] mx-auto px-4 w-full">

                {/* Hero Banner Container */}
                <div className="pt-6 relative z-10">
                    <div className="rounded-2xl md:rounded-3xl overflow-hidden shadow-lg border relative aspect-[21/9] sm:aspect-[21/7] max-h-[350px] w-full" style={{ borderColor }}>
                        {config.cover_images && config.cover_images.length > 1 ? (
                            <Swiper
                                modules={[Autoplay]}
                                spaceBetween={0}
                                slidesPerView={1}
                                loop={true}
                                autoplay={{ delay: 3000, disableOnInteraction: false }}
                                className="w-full h-full"
                            >
                                {config.cover_images.map((img, idx) => (
                                    <SwiperSlide key={idx} className="w-full h-full">
                                        <div className="w-full h-full relative">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                            <img
                                                src={img}
                                                alt={`Cover ${idx}`}
                                                className="w-full h-full object-cover select-none"
                                            />
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        ) : (
                            <div className="w-full h-full relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                <img src={config.cover_url || config.cover_images?.[0] || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000"} alt="Cover" className="w-full h-full object-cover" />
                            </div>
                        )}

                        {/* Info Header overlaying banner */}
                        <div className="absolute z-20 bottom-3 md:bottom-6 left-4 right-4 flex justify-between items-end">
                            <div className="text-white">
                                <h1 className="text-2xl md:text-4xl font-black mb-1 md:mb-2 drop-shadow-md">{config.name}</h1>
                                {config.time_open && (
                                    <p className="text-sm md:text-base opacity-90 font-semibold drop-shadow-sm flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        {isAr ? 'مفتوح الآن' : 'Open Now'} • {config.time_open} - {config.time_close}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category Navigation (Swiper Based) */}
                <div className="my-6 sticky top-[65px] z-40" style={{ backgroundColor: bgBody }}>
                    {/* Shadow overlay for sticky effect */}
                    <div className="absolute -inset-x-4 inset-y-0 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] pointer-events-none" />
                    <div className="relative z-10 py-3">
                        <Swiper
                            modules={[FreeMode]}
                            slidesPerView="auto"
                            spaceBetween={10}
                            freeMode={true}
                            dir={isAr ? 'rtl' : 'ltr'}
                            className="w-full pb-2 px-1"
                        >
                            <SwiperSlide style={{ width: 'auto' }}>
                                <button
                                    onClick={() => setActiveCategory('all')}
                                    className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all border-2 shadow-sm ${activeCategory === 'all' ? 'text-white' : ''}`}
                                    style={{
                                        backgroundColor: activeCategory === 'all' ? primaryColor : bgCard,
                                        borderColor: activeCategory === 'all' ? primaryColor : borderColor,
                                        color: activeCategory === 'all' ? '#fff' : textMain,
                                    }}
                                >
                                    {isAr ? 'الكل' : 'All'}
                                </button>
                            </SwiperSlide>
                            {categories.map((cat) => (
                                <SwiperSlide key={cat.id} style={{ width: 'auto' }}>
                                    <button
                                        onClick={() => setActiveCategory(cat.id.toString())}
                                        className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all border-2 shadow-sm flex items-center gap-2 ${activeCategory === cat.id.toString() ? 'text-white' : ''}`}
                                        style={{
                                            backgroundColor: activeCategory === cat.id.toString() ? primaryColor : bgCard,
                                            borderColor: activeCategory === cat.id.toString() ? primaryColor : borderColor,
                                            color: activeCategory === cat.id.toString() ? '#fff' : textMain,
                                        }}
                                    >
                                        {cat.image_url && (
                                            <img src={cat.image_url} alt={catName(cat)} className="w-5 h-5 rounded-full object-cover" />
                                        )}
                                        {catName(cat)}
                                    </button>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-10 min-h-[50vh]">
                    {activeCatList.map((cat) => (
                        <div key={cat.id} className="scroll-mt-32">
                            <h2 className="text-2xl md:text-3xl font-black mb-6 flex items-center gap-3">
                                <span className="w-2 h-8 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                                {catName(cat)}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {cat.items?.map((item: MenuItem, idx: number) => (
                                    <div key={item.id || idx} onClick={() => openItemSelect(item, catName(cat), cat.image_url)}
                                        className="rounded-2xl overflow-hidden border transition-all hover:shadow-md cursor-pointer group flex flex-row p-3 gap-3"
                                        style={{ backgroundColor: bgCard, borderColor }}>

                                        {/* Content Box (Left Side in LTR, Right Side in RTL) */}
                                        <div className="flex-1 flex flex-col min-w-0 justify-between">
                                            <div>
                                                <h3 className="font-w600 text-[15px] sm:text-[17px] leading-snug line-clamp-2 mb-1.5" style={{ color: textMain }}>
                                                    {itemName(item)}
                                                </h3>
                                                {(item.description_ar || item.description_en) && (
                                                    <p className="text-xs sm:text-[13px] line-clamp-2 mb-2 leading-relaxed" style={{ color: textMuted }}>
                                                        {isAr ? item.description_ar : (item.description_en || item.description_ar)}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-auto pt-2 flex flex-col justify-end gap-y-1">
                                                <div className="max-h-[60px] overflow-y-auto pr-1 flex flex-col gap-1 custom-scrollbar">
                                                    {item.prices.map((price, pIdx) => (
                                                        <div key={pIdx} className="flex flex-row items-center gap-2">
                                                            {item.size_labels?.[pIdx] && (
                                                                <span className="text-[11px] opacity-70 mb-0.5 line-clamp-1 flex-1" style={{ color: textMuted }}>
                                                                    {item.size_labels[pIdx]}
                                                                </span>
                                                            )}
                                                            <div className="font-w600 text-[14px] sm:text-[15px] font-bold tracking-tight shrink-0" style={{ color: primaryColor }}>
                                                                {cur}{price?.toFixed?.(0) || price}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Image Box (Right Side in LTR, Left Side in RTL) */}
                                        <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] shrink-0 relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                            <img src={item.image_url || cat.image_url || cat.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=300'}
                                                alt={itemName(item)}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            {/* Add Button Badge overlay */}
                                            {config.orders_enabled !== false && (
                                                <div className="absolute right-2 bottom-2 w-8 h-8 rounded-full shadow-lg flex items-center justify-center text-white backdrop-blur-sm transition-transform active:scale-90" style={{ backgroundColor: primaryColor }}>
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {activeCatList.length === 0 && (
                        <div className="text-center py-20 opacity-50 font-bold text-xl">
                            {isAr ? 'لا توجد منتجات' : 'No products found'}
                        </div>
                    )}
                </div>
            </main>



            {/* Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
                        onClick={closeModal}>
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full sm:max-w-[500px] h-[95vh] sm:h-[auto] sm:max-h-[95vh] rounded-t-3xl sm:rounded-[24px] overflow-hidden flex flex-col shadow-2xl"
                            style={{ backgroundColor: bgCard }}
                            onClick={e => e.stopPropagation()}>

                            {/* Mobile DRAG Handle */}
                            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden absolute top-0 z-30" onClick={closeModal}>
                                <div className="w-12 h-1.5 rounded-full bg-white/50 backdrop-blur-md" />
                            </div>

                            {/* Close Button UI */}
                            <button onClick={closeModal} className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-colors">
                                <X className="w-5 h-5" />
                            </button>

                            {/* Modal Header Image */}
                            <div className="w-full h-[35vh] sm:h-[250px] shrink-0 relative bg-slate-100 dark:bg-slate-800">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                <img src={selectedItem.item.image_url || selectedItem.catImg || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600'}
                                    alt={itemName(selectedItem.item)} className="w-full h-full object-cover" />

                                <div className="absolute bottom-4 left-4 right-4 z-20" dir={isAr ? 'rtl' : 'ltr'}>
                                    <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md mb-1">{itemName(selectedItem.item)}</h2>
                                    <p className="text-white/90 text-sm sm:text-base font-bold drop-shadow-sm line-clamp-2">
                                        {isAr ? selectedItem.item.description_ar : (selectedItem.item.description_en || selectedItem.item.description_ar)}
                                    </p>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-5 pb-24" style={{ color: textMain }}>

                                {/* Base Price */}
                                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border p-4 rounded-xl mb-6" style={{ borderColor }}>
                                    <span className="font-bold">{isAr ? 'السعر' : 'Price'}</span>
                                    <span className="text-xl font-black" style={{ color: primaryColor }}>{cur}{selectedItem.item.prices[sizeIdx]?.toFixed?.(0)}</span>
                                </div>

                                {/* Sizes */}
                                {selectedItem.item.prices.length > 1 && (
                                    <div className="mb-6">
                                        <h3 className="font-bold mb-3 flex items-center gap-2">
                                            <List className="w-4 h-4 text-slate-400" />
                                            {isAr ? 'اختر الحجم' : 'Select Size'}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedItem.item.prices.map((p, idx) => {
                                                const label = selectedItem.item.size_labels?.[idx] || (isAr ? `حجم ${idx + 1}` : `Size ${idx + 1}`);
                                                return (
                                                    <label key={idx} className="flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-center"
                                                        style={{ borderColor: sizeIdx === idx ? primaryColor : borderColor, backgroundColor: sizeIdx === idx ? `${primaryColor}15` : 'transparent' }}
                                                        onClick={() => setSizeIdx(idx)}>
                                                        <span className="font-bold text-sm mb-1">{label}</span>
                                                        <span className="text-xs font-semibold">{cur}{p}</span>
                                                        <input type="radio" checked={sizeIdx === idx} readOnly className="hidden" />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Extras */}
                                {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="font-bold mb-3 flex items-center gap-2">
                                            <Plus className="w-4 h-4 text-slate-400" />
                                            {isAr ? 'إضافات (اختياري)' : 'Extras (Optional)'}
                                        </h3>
                                        <div className="space-y-3">
                                            {selectedItem.item.extras.map((ext, idx) => {
                                                const id = ext.id || idx;
                                                const isSel = selectedExtras.some(e => e.id === id);
                                                return (
                                                    <label key={idx} className="flex items-center justify-between p-3 rounded-xl border border-dashed cursor-pointer transition-colors"
                                                        style={{ borderColor: isSel ? primaryColor : borderColor, backgroundColor: isSel ? `${primaryColor}05` : 'transparent' }}>
                                                        <input type="checkbox" className="hidden" checked={isSel}
                                                            onChange={() => {
                                                                if (isSel) setSelectedExtras(p => p.filter(e => e.id !== id));
                                                                else setSelectedExtras(p => [...p, { id, name: isAr ? ext.name_ar : (ext.name_en || ext.name_ar), price: ext.price }]);
                                                            }} />
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                                                                style={{ borderColor: isSel ? primaryColor : borderColor, backgroundColor: isSel ? primaryColor : 'transparent' }}>
                                                                {isSel && <X className="w-3 h-3 text-white" style={{ transform: 'rotate(45deg)' }} />}
                                                            </div>
                                                            <span className="text-sm font-semibold">{isAr ? ext.name_ar : (ext.name_en || ext.name_ar)}</span>
                                                        </div>
                                                        <span className="text-sm font-bold" style={{ color: primaryColor }}>{ext.price > 0 ? `+${cur}${ext.price}` : (isAr ? 'مجاناً' : 'Free')}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                <div className="mb-6">
                                    <h3 className="font-bold mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        {isAr ? 'ملاحظات' : 'Notes'}
                                    </h3>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                        placeholder={isAr ? 'أضف ملاحظاتك الخاصة هنا...' : 'Special instructions...'}
                                        className="w-full rounded-xl p-3 outline-none resize-none h-24 text-sm border focus:ring-1 transition-all"
                                        style={{ backgroundColor: bgBody, color: textMain, borderColor, '--tw-ring-color': primaryColor } as React.CSSProperties} />
                                </div>
                            </div>

                            {/* Sticky Bottom Actions */}
                            {config.orders_enabled !== false && (
                                <div className="absolute bottom-0 w-full p-4 border-t shadow-[0_-10px_20px_rgba(0,0,0,0.05)]" style={{ backgroundColor: bgCard, borderColor }}>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full h-12 px-2 border" style={{ borderColor }}>
                                            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded-full flex flex-col items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center font-bold text-lg">{qty}</span>
                                            <button onClick={() => setQty(qty + 1)} className="w-8 h-8 rounded-full flex flex-col items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button onClick={addToCart} className="flex-1 h-12 rounded-full text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md hover:shadow-lg"
                                            style={{ backgroundColor: primaryColor }}>
                                            <ShoppingCart className="w-5 h-5" />
                                            {isAr ? 'إضافة إلى السلة' : 'Add to Cart'} — {cur}{(((selectedItem.item.prices[sizeIdx] || 0) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty).toFixed?.(0)}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Drawer */}
            <AnimatePresence>
                {isCartOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsCartOpen(false)}>
                        <motion.div initial={{ x: isAr ? '100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isAr ? '100%' : '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`absolute top-0 ${isAr ? 'right-0' : 'right-0'} w-full max-w-[400px] h-full flex flex-col shadow-2xl`}
                            style={{ backgroundColor: bgCard }}
                            onClick={e => e.stopPropagation()}>

                            {/* Cart Header */}
                            <div className="p-5 flex justify-between items-center text-white shadow-md z-10 sticky top-0" style={{ backgroundColor: primaryColor }}>
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg leading-none mb-1">{isAr ? 'عربة التسوق' : 'Cart'}</span>
                                    <span className="text-xs opacity-90">{cartCount} {isAr ? 'عناصر' : 'items'}</span>
                                </div>
                                <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 flex flex-col items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            {/* Cart Body */}
                            <div className="flex-1 overflow-y-auto" style={{ backgroundColor: bgBody }}>
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4" style={{ color: textMuted }}>
                                        <div className="w-24 h-24 mb-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                            <ShoppingCart className="w-10 h-10 opacity-40" />
                                        </div>
                                        <p className="font-bold text-lg mb-2">{isAr ? 'سلتك فارغة' : 'Your cart is empty'}</p>
                                        <p className="text-sm opacity-80">{isAr ? 'أضف بعض المنتجات الشهية للبدء' : 'Add some delicious items to start'}</p>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-4">
                                        {cart.map((c, i) => (
                                            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border" style={{ borderColor }}>
                                                <div className="w-20 h-20 shrink-0 bg-slate-100 rounded-xl overflow-hidden">
                                                    <img src={c.item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200'} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-between" dir={isAr ? 'rtl' : 'ltr'}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-sm line-clamp-1">{itemName(c.item)}</h4>
                                                            {(c.sizeLabel || c.notes) && (
                                                                <p className="text-[11px] mt-1 space-y-0.5" style={{ color: textMuted }}>
                                                                    {c.sizeLabel && <span className="block">{c.sizeLabel}</span>}
                                                                    {c.notes && <span className="block italic flex gap-1"><AlertCircle className="w-3 h-3 inline" />{c.notes}</span>}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button onClick={() => updateQty(c.id, c.notes, -c.quantity)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="flex justify-between items-center mt-3">
                                                        <span className="font-black" style={{ color: primaryColor }}>{cur}{(c.price * c.quantity).toFixed?.(0)}</span>
                                                        <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-full h-8 px-1 border" style={{ borderColor }}>
                                                            <button onClick={() => updateQty(c.id, c.notes, -1)} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-primary-600"><Minus className="w-3 h-3" /></button>
                                                            <span className="w-6 text-center text-sm font-bold">{c.quantity}</span>
                                                            <button onClick={() => updateQty(c.id, c.notes, 1)} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-primary-600"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}


                                    </div>
                                )}
                            </div>

                            {/* Cart Footer */}
                            {cart.length > 0 && (
                                <div className="p-5 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] border-t z-20" style={{ backgroundColor: bgCard, borderColor }}>
                                    <div className="flex justify-between items-center mb-4 text-sm font-bold" style={{ color: textMain }}>
                                        <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                                        <span className="text-xl font-black" style={{ color: primaryColor }}>{cur}{cartTotal.toFixed?.(0)}</span>
                                    </div>
                                    <button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full flex justify-center items-center gap-2 h-14 rounded-full text-white font-bold text-lg transition-transform active:scale-95 shadow-lg"
                                        style={{ backgroundColor: '#10b981' }}>
                                        {isAr ? 'إتمام الطلب' : 'Proceed to Checkout'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                cartItems={cart.map(c => ({
                    id: c.id,
                    title: isAr ? c.item.title_ar : c.item.title_en || c.item.title_ar,
                    qty: c.quantity,
                    price: c.price,
                    size: c.sizeLabel,
                    category: c.catName,
                }))}
                subtotal={cartTotal}
                restaurantId={restaurantId}
                restaurantName={config.name}
                whatsappNumber={config.whatsapp_number || config.phone}
                currency={cur || 'ج.م'}
                language={isAr ? 'ar' : 'en'}
                onOrderSuccess={() => { setCart([]); setIsCartOpen(false); }}
            />
        </div>
    );
}
