/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, AlertCircle, ShoppingCart, Plus, Minus, Trash2, X, FileText, MapPin as MapIcon, PhoneCall, Link as LinkIcon, Star, Share2 } from 'lucide-react';
import { FaWhatsapp, FaFacebookF, FaInstagram, FaSnapchatGhost } from 'react-icons/fa';
import SharedMarquee from './SharedMarquee';
import CheckoutModal from './CheckoutModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
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

// ================= THEME 13 CONSTANTS =================
// The template uses #86ac70 as the primary color.
const T13_PRIMARY = '#86ac70';
const T13_PRIMARY_LIGHT = '#9ebd8d';
const T13_ACCENT = '#FF6B6B';

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
    logo_url?: string;
    cover_url?: string;
    marquee_enabled?: boolean;
    marquee_text_ar?: string;
    marquee_text_en?: string;
    orders_enabled?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface Theme13MenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
}

export default function Theme13Menu({ config, categories, restaurantId }: Theme13MenuProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const isAr = config.default_language === 'ar' || true; // Defaulting to true for now since design is RTL primary
    const isDark = mounted && theme === 'dark';
    const cur = config.currency || 'ج.م';

    // Theme Variables - matching Theme 13 CSS
    const primaryColor = config.theme_colors?.main_color || T13_PRIMARY;
    const bgBody = isDark ? '#121212' : '#f8f9fa';
    const bgCard = isDark ? '#1e1e1e' : '#ffffff';
    const textMain = isDark ? '#f1f1f1' : '#333333';
    const textMuted = isDark ? '#aaaaaa' : '#666666';
    const borderColor = isDark ? '#333333' : '#e0e0e0';

    // State
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPhoneMenuOpen, setIsPhoneMenuOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; catName: string; catImg?: string } | null>(null);

    // Item Detail Modal
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [notes, setNotes] = useState('');
    const [selectedExtras, setSelectedExtras] = useState<{ id: number | string, name: string, price: number }[]>([]);

    // Checkout
    const [showCheckout, setShowCheckout] = useState(false);
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
    const [cart, setCart] = useState<{ id: string, item: MenuItem, catName: string, price: number, sizeLabel: string, quantity: number, notes: string }[]>([]);

    // Notification toast
    const [toastMsg, setToastMsg] = useState('');

    const itemName = (item: MenuItem) => isAr ? item.title_ar : (item.title_en || item.title_ar);
    const catName = (cat: CategoryWithItemsType) => isAr ? cat.name_ar : (cat.name_en || cat.name_ar);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 2500);
    };

    // Derived cart values
    const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
    const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    // Modals
    const openItemSelect = (item: MenuItem, cName: string, cImg?: string) => {
        if (config.orders_enabled === false) return;
        setSelectedItem({ item, catName: cName, catImg: cImg });
        setQty(1);
        setSizeIdx(0);
        setSelectedExtras([]);
        setNotes('');
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
        showToast(isAr ? 'تمت الإضافة إلى السلة بنجاح' : 'Added to cart successfully');
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
        : categories.filter(c => c.id.toString() === activeCategory);

    // Get all featured items (assuming items with is_featured flag or just taking the first 4 from all categories)
    const featuredItems = categories.flatMap(c => c.items || []).slice(0, 6);

    if (!mounted) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;

    return (
        <div className="min-h-screen font-cairo pb-24 overflow-x-hidden" style={{ backgroundColor: bgBody, color: textMain }} dir={isAr ? 'rtl' : 'ltr'}>

            {/* Header Marquee */}
            {config.marquee_enabled && (
                <div className="font-cairo text-sm text-white" style={{ backgroundColor: primaryColor }}>
                    <SharedMarquee
                        text={isAr ? (config.marquee_text_ar || '') : (config.marquee_text_en || config.marquee_text_ar || '')}
                    />
                </div>
            )}

            {/* Modern Header - Theme 13 specific */}
            <div className="relative h-[160px] md:h-[200px] mb-[15px] rounded-b-2xl md:rounded-b-3xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 hover:scale-105"
                    style={{ backgroundImage: `url(${config.cover_url || config.cover_images?.[0] || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000'})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Social and Contact Links Top Right */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-20" dir="ltr">
                    {config.map_link && (
                        <a href={config.map_link} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors border border-white/30">
                            <MapIcon className="w-4 h-4" />
                        </a>
                    )}
                    {(config.social_links?.facebook || config.facebook_url) && (
                        <a href={config.social_links?.facebook || config.facebook_url} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-[#1877f2] transition-colors border border-white/30">
                            <FaFacebookF className="text-sm md:text-base" />
                        </a>
                    )}
                    {(config.social_links?.instagram || config.instagram_url) && (
                        <a href={config.social_links?.instagram || config.instagram_url} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-[#E1306C] transition-colors border border-white/30">
                            <FaInstagram className="text-sm md:text-base" />
                        </a>
                    )}
                    {(config.social_links?.snapchat) && (
                        <a href={config.social_links?.snapchat} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-[#fffc00] hover:text-black transition-colors border border-white/30">
                            <FaSnapchatGhost className="text-sm md:text-base" />
                        </a>
                    )}
                    {(config.social_links?.whatsapp || config.whatsapp_number) && (
                        <a href={`https://wa.me/${(config.social_links?.whatsapp || config.whatsapp_number || '').replace(/\+/g, '')}`} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-[#25D366] transition-colors border border-white/30">
                            <FaWhatsapp className="text-sm md:text-base" />
                        </a>
                    )}
                    {(config.phone || (config.phones && config.phones.length > 0)) && (
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setIsPhoneMenuOpen(!isPhoneMenuOpen)}
                                className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors border border-white/30"
                            >
                                <PhoneCall className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                                {isPhoneMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-auto md:right-0 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-[0_5px_20px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-slate-700 py-2 z-[110] overflow-hidden"
                                    >
                                        <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 text-xs font-bold text-gray-500 uppercase text-center" dir={isAr ? 'rtl' : 'ltr'}>
                                            {isAr ? 'أرقام الديلفري' : 'Delivery Numbers'}
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

                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] rounded-full border-[3px] border-white shadow-[0_3px_12px_rgba(0,0,0,0.2)] overflow-hidden shrink-0 bg-white hover:scale-110 hover:rotate-[5deg] transition-all duration-300">
                            <img
                                src={config.logo_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200'}
                                alt={config.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h2 className="text-white text-2xl md:text-3xl font-bold drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)] m-0 leading-tight">
                            {config.name}
                        </h2>
                    </div>
                </div>
            </div>

            <main className="max-w-[1200px] mx-auto w-full">

                {/* Category Filter - Circular Design */}
                <div className="px-4 mb-6">
                    <Swiper
                        modules={[FreeMode]}
                        slidesPerView="auto"
                        spaceBetween={15}
                        freeMode={true}
                        dir={isAr ? 'rtl' : 'ltr'}
                        className="w-full py-2"
                    >
                        <SwiperSlide style={{ width: 'auto' }}>
                            <div
                                onClick={() => setActiveCategory('all')}
                                className={`flex flex-col items-center cursor-pointer transition-all duration-300 w-[80px] md:w-[100px] ${activeCategory === 'all' ? '-translate-y-1' : ''}`}
                            >
                                <div className="relative w-[65px] h-[65px] md:w-[80px] md:h-[80px] rounded-full overflow-hidden mb-2 mx-auto">
                                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                        <UtensilsCrossed className="w-8 h-8 md:w-10 md:h-10 opacity-50" />
                                    </div>
                                    <div
                                        className={`absolute inset-0 border-[3px] rounded-full transition-opacity duration-300 ${activeCategory === 'all' ? 'opacity-100 shadow-[0_5px_15px_rgba(0,0,0,0.15)]' : 'opacity-0'}`}
                                        style={{ borderColor: primaryColor }}
                                    />
                                </div>
                                <span className={`text-xs md:text-sm font-semibold truncate w-full text-center ${activeCategory === 'all' ? 'text-primary' : ''}`} style={{ color: activeCategory === 'all' ? primaryColor : textMain }}>
                                    {isAr ? 'الكل' : 'All'}
                                </span>
                            </div>
                        </SwiperSlide>

                        {categories.map((cat) => (
                            <SwiperSlide key={cat.id} style={{ width: 'auto' }}>
                                <div
                                    onClick={() => setActiveCategory(cat.id.toString())}
                                    className={`flex flex-col items-center cursor-pointer transition-all duration-300 w-[80px] md:w-[100px] ${activeCategory === cat.id.toString() ? '-translate-y-1' : ''}`}
                                >
                                    <div className="relative w-[65px] h-[65px] md:w-[80px] md:h-[80px] rounded-full overflow-hidden mb-2 mx-auto">
                                        <img
                                            src={cat.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200'}
                                            alt={catName(cat)}
                                            className="w-full h-full object-cover"
                                        />
                                        <div
                                            className={`absolute inset-0 border-[3px] rounded-full transition-opacity duration-300 ${activeCategory === cat.id.toString() ? 'opacity-100 shadow-[0_5px_15px_rgba(0,0,0,0.15)]' : 'opacity-0'}`}
                                            style={{ borderColor: primaryColor }}
                                        />
                                    </div>
                                    <span className="text-xs md:text-sm font-semibold truncate w-full text-center" style={{ color: activeCategory === cat.id.toString() ? primaryColor : textMain }}>
                                        {catName(cat)}
                                    </span>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>

                {/* Featured Items Section - Only show when "All" is selected */}
                {activeCategory === 'all' && featuredItems.length > 0 && (
                    <div className="px-4 mb-8">
                        <div className="flex items-center gap-2 mb-4 relative pb-2 border-b-[3px] border-b-transparent after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-[50px] after:h-[3px] after:rounded-full after:bg-[--section-color]" style={{ '--section-color': primaryColor } as React.CSSProperties}>
                            <Star className="w-5 h-5" style={{ color: primaryColor }} />
                            <span className="text-lg md:text-xl font-bold" style={{ color: textMain }}>
                                {isAr ? 'منتجات مميزة' : 'Featured Items'}
                            </span>
                        </div>

                        <Swiper
                            modules={[FreeMode]}
                            slidesPerView={1.5}
                            breakpoints={{ 640: { slidesPerView: 2.5 }, 1024: { slidesPerView: 3.5 } }}
                            spaceBetween={15}
                            freeMode={true}
                            dir={isAr ? 'rtl' : 'ltr'}
                            className="w-full pb-4"
                        >
                            {featuredItems.map((item, idx) => (
                                <SwiperSlide key={`featured-${item.id || idx}`}>
                                    <div
                                        onClick={() => openItemSelect(item, "Featured")}
                                        className="bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.08)] transition-all duration-300 border hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.12)] cursor-pointer flex flex-col h-[250px] md:h-[280px]"
                                        style={{ borderColor }}
                                    >
                                        <div className="w-full h-[140px] md:h-[160px] relative overflow-hidden shrink-0">
                                            <img
                                                src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400"}
                                                alt={itemName(item)}
                                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                            />
                                        </div>
                                        <div className="p-3 flex flex-col justify-between flex-1">
                                            <div>
                                                <h3 className="font-semibold text-sm md:text-base line-clamp-1 mb-1" style={{ color: textMain }}>
                                                    {itemName(item)}
                                                </h3>
                                                <p className="text-xs md:text-sm line-clamp-2 leading-tight" style={{ color: textMuted }}>
                                                    {isAr ? item.description_ar : (item.description_en || item.description_ar)}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-end mt-2">
                                                <div className="flex justify-between items-center mt-auto" dir="ltr">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-extrabold text-sm md:text-base leading-none" style={{ color: primaryColor }}>
                                                            {cur} {item.prices[0]?.toFixed?.(0) || item.prices[0]}
                                                        </span>
                                                        {item.prices.length > 1 && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded-sm font-semibold tracking-wide" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                                                                {isAr ? 'متعدد الأحجام' : 'Multi-size'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {config.orders_enabled !== false && (
                                                        <button onClick={(e) => { e.stopPropagation(); openItemSelect(item, "Featured"); }}
                                                            className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white shadow-md active:scale-95 hover:scale-105 transition-all"
                                                            style={{ backgroundColor: primaryColor }}>
                                                            <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                )}

                {/* Main Menu Grid */}
                <div className="px-4 space-y-10 min-h-[50vh]">
                    {activeCatList.map((cat) => (
                        <div key={cat.id}>
                            <div className="flex items-center gap-2 mb-4 relative pb-2 border-b-[3px] border-b-transparent after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-[50px] after:h-[3px] after:rounded-full after:bg-[--section-color]" style={{ '--section-color': primaryColor } as React.CSSProperties}>
                                <span className="text-lg md:text-xl font-bold" style={{ color: textMain }}>
                                    {catName(cat)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                {cat.items?.map((item: MenuItem, idx: number) => (
                                    <div
                                        key={item.id || idx}
                                        onClick={() => openItemSelect(item, catName(cat), cat.image_url)}
                                        className="bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.08)] transition-all duration-300 border hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.12)] cursor-pointer flex flex-col min-h-[250px] md:min-h-[290px] animate-fade-in-up"
                                        style={{ borderColor }}
                                    >
                                        <div className="w-full h-[130px] md:h-[150px] relative overflow-hidden shrink-0">
                                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent z-10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                                            <img
                                                src={item.image_url || cat.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400"}
                                                alt={itemName(item)}
                                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                            />
                                            {/* Action Buttons Overlay */}
                                            <div className="absolute top-2 left-2 z-20 flex gap-2">
                                                <button
                                                    className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center text-xs hover:scale-110 transition-transform shadow-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(window.location.href);
                                                        showToast(isAr ? 'تم نسخ الرابط' : 'Link copied');
                                                    }}
                                                >
                                                    <LinkIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3 flex flex-col justify-between flex-1">
                                            <div>
                                                <h3 className="font-semibold text-xs md:text-sm line-clamp-2 mb-1" style={{ color: textMain }}>
                                                    {itemName(item)}
                                                </h3>
                                                {(item.description_ar || item.description_en) && (
                                                    <p className="text-[10px] md:text-xs line-clamp-1 md:line-clamp-2 leading-tight" style={{ color: textMuted }}>
                                                        {isAr ? item.description_ar : (item.description_en || item.description_ar)}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-end mt-2 pt-2 border-t" style={{ borderColor }}>
                                                <div className="flex flex-col gap-1 w-full max-h-[70px] overflow-y-auto pr-1 custom-scrollbar">
                                                    {item.prices.map((p, pIdx) => (
                                                        <div key={pIdx} className="flex items-center gap-2">
                                                            <span className="font-bold text-sm md:text-base whitespace-nowrap" style={{ color: primaryColor }}>
                                                                {cur} {p?.toFixed?.(0) || p}
                                                            </span>
                                                            {item.size_labels?.[pIdx] && (
                                                                <span className="text-[10px] md:text-xs opacity-70 line-clamp-1" style={{ color: textMuted }}>
                                                                    ({item.size_labels[pIdx]})
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                {config.orders_enabled !== false && (
                                                    <button
                                                        className="rounded-full px-2.5 py-1 text-[10px] md:text-xs font-semibold text-white transition-all hover:-translate-y-0.5 flex items-center gap-1 shrink-0"
                                                        style={{ backgroundColor: primaryColor }}
                                                        onClick={(e) => { e.stopPropagation(); openItemSelect(item, catName(cat), cat.image_url); }}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        <span className="hidden sm:inline">{isAr ? 'أضف' : 'Add'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {(!cat.items || cat.items.length === 0) && (
                                <div className="text-center py-10 opacity-50 font-bold text-lg bg-white/50 dark:bg-black/10 rounded-xl border border-dashed" style={{ borderColor }}>
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    {isAr ? 'لا توجد منتجات في هذا القسم' : 'No products in this category'}
                                </div>
                            )}
                        </div>
                    ))}

                    {activeCatList.length === 0 && (
                        <div className="text-center py-20 opacity-50 font-bold text-xl">
                            {isAr ? 'لا توجد منتجات' : 'No products found'}
                        </div>
                    )}
                </div>
            </main>

            {/* Floating WhatsApp Share FAB */}
            {(config.social_links?.whatsapp || config.whatsapp_number || config.phone) && (
                <a
                    href={`https://wa.me/${(config.social_links?.whatsapp || config.whatsapp_number || config.phone).replace(/\+/g, '')}?text=${encodeURIComponent(isAr ? 'شاهد قائمة الطعام من ' + config.name + ' - ' + window.location.href : 'Check out the menu from ' + config.name + ' - ' + window.location.href)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="fixed bottom-[90px] right-4 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:scale-110 transition-transform z-[90]"
                    style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                >
                    <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                </a>
            )}

            {/* Bottom Dock Navigation */}
            <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-[#1e1e1e] shadow-[0_-2px_15px_rgba(0,0,0,0.1)] border-t z-[100] flex justify-around py-2.5 md:py-3 px-2 transition-transform duration-500" style={{ borderColor }}>
                <a href="#" className="flex flex-col items-center gap-1 px-4 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: primaryColor }}>
                    <UtensilsCrossed className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-[10px] md:text-xs font-semibold">{isAr ? 'القائمة' : 'Menu'}</span>
                </a>
                {config.orders_enabled !== false && (
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="flex flex-col items-center gap-1 px-4 py-1 rounded-lg relative hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        style={{ color: textMuted }}
                    >
                        <div className="relative">
                            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                            {cartCount > 0 && (
                                <span
                                    className="absolute -top-1.5 -right-2 text-white rounded-full w-4 h-4 md:w-5 md:h-5 text-[9px] md:text-[10px] font-bold flex items-center justify-center shadow-sm"
                                    style={{ backgroundColor: T13_ACCENT }}
                                >
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] md:text-xs font-semibold">{isAr ? 'السلة' : 'Cart'}</span>
                    </button>
                )}
                <a
                    href={`tel:${config.phone}`}
                    className="flex flex-col items-center gap-1 px-4 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ color: textMuted }}
                >
                    <PhoneCall className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-[10px] md:text-xs font-semibold">{isAr ? 'اتصل' : 'Call'}</span>
                </a>
            </div>

            {/* Item Details Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4"
                        onClick={closeModal}>
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full md:max-w-[500px] h-[95vh] md:h-auto md:max-h-[95vh] rounded-t-2xl md:rounded-[24px] overflow-hidden flex flex-col shadow-2xl"
                            style={{ backgroundColor: bgCard }}
                            onClick={e => e.stopPropagation()}>

                            {/* Mobile DRAG Handle */}
                            <div className="w-full flex justify-center pt-3 pb-1 md:hidden absolute top-0 z-30" onClick={closeModal}>
                                <div className="w-12 h-1.5 rounded-full bg-white/50 backdrop-blur-md" />
                            </div>

                            <button onClick={closeModal} className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-colors">
                                <X className="w-4 h-4" />
                            </button>

                            <div className="w-full h-[35vh] md:h-[250px] shrink-0 relative bg-slate-100 dark:bg-slate-800">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                <img src={selectedItem.item.image_url || selectedItem.catImg || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600'}
                                    alt={itemName(selectedItem.item)} className="w-full h-full object-cover" />

                                <div className="absolute bottom-4 left-4 right-4 z-20" dir={isAr ? 'rtl' : 'ltr'}>
                                    <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-md mb-1 leading-tight">{itemName(selectedItem.item)}</h2>
                                    <p className="text-white/80 text-xs md:text-sm font-medium drop-shadow-sm line-clamp-2">
                                        {isAr ? selectedItem.item.description_ar : (selectedItem.item.description_en || selectedItem.item.description_ar)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-5 pb-24 space-y-5" style={{ color: textMain }}>

                                {/* Header / Price */}
                                <div className="flex justify-between items-center pb-4 border-b border-dashed" style={{ borderColor }}>
                                    <span className="font-semibold text-sm md:text-base">{isAr ? 'السعر الأساسي' : 'Base Price'}</span>
                                    <span className="text-lg md:text-xl font-bold" style={{ color: primaryColor }}>{cur} {selectedItem.item.prices[sizeIdx]?.toFixed?.(0)}</span>
                                </div>

                                {/* Sizes */}
                                {selectedItem.item.prices.length > 1 && (
                                    <div>
                                        <h3 className="font-bold text-sm mb-3 text-[--text-muted]" style={{ '--text-muted': textMuted } as React.CSSProperties}>{isAr ? 'اختر الحجم' : 'Select Size'}</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedItem.item.prices.map((p, idx) => {
                                                const label = selectedItem.item.size_labels?.[idx] || (isAr ? `حجم ${idx + 1}` : `Size ${idx + 1}`);
                                                return (
                                                    <label key={idx} className="flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-center relative overflow-hidden"
                                                        style={{ borderColor: sizeIdx === idx ? primaryColor : borderColor, backgroundColor: sizeIdx === idx ? `${primaryColor}10` : 'transparent' }}
                                                        onClick={() => setSizeIdx(idx)}>
                                                        {sizeIdx === idx && (
                                                            <div className="absolute top-0 right-0 w-0 h-0 border-[15px] border-r-[--primary] border-t-[--primary] border-l-transparent border-b-transparent" style={{ '--primary': primaryColor } as React.CSSProperties} />
                                                        )}
                                                        <span className="font-bold text-sm mb-1">{label}</span>
                                                        <span className="text-xs font-medium" style={{ color: primaryColor }}>{cur} {p}</span>
                                                        <input type="radio" checked={sizeIdx === idx} readOnly className="hidden" />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Extras */}
                                {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-sm mb-3 text-[--text-muted]" style={{ '--text-muted': textMuted } as React.CSSProperties}>{isAr ? 'إضافات (اختياري)' : 'Extras (Optional)'}</h3>
                                        <div className="space-y-2">
                                            {selectedItem.item.extras.map((ext, idx) => {
                                                const id = ext.id || idx;
                                                const isSel = selectedExtras.some(e => e.id === id);
                                                return (
                                                    <label key={idx} className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors"
                                                        style={{ borderColor, backgroundColor: isSel ? `${primaryColor}05` : 'transparent' }}>
                                                        <input type="checkbox" className="hidden" checked={isSel}
                                                            onChange={() => {
                                                                if (isSel) setSelectedExtras(p => p.filter(e => e.id !== id));
                                                                else setSelectedExtras(p => [...p, { id, name: isAr ? ext.name_ar : (ext.name_en || ext.name_ar), price: ext.price }]);
                                                            }} />
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                                                                style={{ borderColor: isSel ? primaryColor : borderColor, backgroundColor: isSel ? primaryColor : 'transparent' }}>
                                                                {isSel && <Plus className="w-3 h-3 text-white" style={{ transform: 'rotate(45deg)' }} />}
                                                            </div>
                                                            <span className="text-sm font-semibold">{isAr ? ext.name_ar : (ext.name_en || ext.name_ar)}</span>
                                                        </div>
                                                        <span className="text-xs font-bold" style={{ color: primaryColor }}>{ext.price > 0 ? `+${cur} ${ext.price}` : (isAr ? 'مجاناً' : 'Free')}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                <div>
                                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-[--text-muted]" style={{ '--text-muted': textMuted } as React.CSSProperties}>
                                        <FileText className="w-4 h-4" />
                                        {isAr ? 'ملاحظات إضافية' : 'Special Instructions'}
                                    </h3>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                        placeholder={isAr ? 'مثال: بدون بصل، زيادة صوص...' : 'e.g., no onions, extra sauce...'}
                                        className="w-full rounded-xl p-3 outline-none resize-none h-24 text-sm border focus:border-[--primary] transition-all"
                                        style={{ backgroundColor: bgBody, color: textMain, borderColor, '--primary': primaryColor } as React.CSSProperties} />
                                </div>
                            </div>

                            {/* Sticky Modal Footer */}
                            {config.orders_enabled !== false && (
                                <div className="absolute bottom-0 w-full p-4 border-t bg-white dark:bg-[#1e1e1e] shadow-[0_-5px_15px_rgba(0,0,0,0.05)]" style={{ borderColor }}>
                                    <div className="flex gap-3 md:gap-4 items-center">
                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg h-12 px-2 border" style={{ borderColor }}>
                                            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-slate-500 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-colors">
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="w-8 text-center font-bold text-sm md:text-base">{qty}</span>
                                            <button onClick={() => setQty(qty + 1)} className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-slate-500 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-colors">
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <button onClick={addToCart} className="flex-1 h-12 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md hover:shadow-lg"
                                            style={{ backgroundColor: primaryColor }}>
                                            <ShoppingCart className="w-4 h-4" />
                                            <span>{isAr ? 'أضف' : 'Add'}</span>
                                            <span className="opacity-50">|</span>
                                            <span>{cur} {(((selectedItem.item.prices[sizeIdx] || 0) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty).toFixed?.(0)}</span>
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
                        className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex justify-end"
                        onClick={() => setIsCartOpen(false)}>
                        <motion.div initial={{ x: isAr ? '100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isAr ? '100%' : '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`w-full max-w-[420px] h-full flex flex-col shadow-2xl relative bg-white dark:bg-[#1e1e1e]`}
                            onClick={e => e.stopPropagation()}>

                            {/* Cart Header */}
                            <div className="p-4 md:p-5 flex justify-between items-center text-white shadow-md z-10" style={{ backgroundColor: primaryColor }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-lg leading-tight m-0">{isAr ? 'عربة التسوق' : 'Shopping Cart'}</h2>
                                        <p className="text-xs opacity-90 m-0">{cartCount} {isAr ? 'منتجات' : 'items'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Cart Body */}
                            <div className="flex-1 overflow-y-auto" style={{ backgroundColor: bgBody }}>
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-6" style={{ color: textMuted }}>
                                        <div className="w-24 h-24 mb-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                            <ShoppingCart className="w-10 h-10 opacity-40" />
                                        </div>
                                        <h3 className="font-bold text-xl mb-2 text-[--text-main]" style={{ '--text-main': textMain } as React.CSSProperties}>{isAr ? 'السلة فارغة!' : 'Cart is Empty!'}</h3>
                                        <p className="text-sm opacity-80 mb-6">{isAr ? 'تبدو سلتك فارغة، استكشف قائمتنا وأضف بعض المنتجات الشهية.' : 'Looks like your cart is empty, explore our menu and add some delicious items.'}</p>
                                        <button
                                            onClick={() => setIsCartOpen(false)}
                                            className="px-6 py-3 rounded-full font-bold text-white text-sm"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {isAr ? 'تصفح القائمة' : 'Browse Menu'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-4">
                                        {/* Items */}
                                        <div className="space-y-3">
                                            {cart.map((c, i) => (
                                                <div key={i} className="flex gap-3 p-3 rounded-xl bg-white dark:bg-[#1e1e1e] border shadow-sm" style={{ borderColor }}>
                                                    <div className="w-[70px] h-[70px] shrink-0 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                                                        <img src={c.item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200'} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-between pt-1">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div>
                                                                <h4 className="font-semibold text-sm line-clamp-1" style={{ color: textMain }}>{itemName(c.item)}</h4>
                                                                {(c.sizeLabel || c.notes) && (
                                                                    <p className="text-[10px] mt-1 space-y-0.5 leading-tight" style={{ color: textMuted }}>
                                                                        {c.sizeLabel && <span className="block">{c.sizeLabel}</span>}
                                                                        {c.notes && <span className="block italic">📝 {c.notes}</span>}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <button onClick={() => updateQty(c.id, c.notes, -c.quantity)} className="text-red-400 hover:text-red-600 transition-colors p-1 shrink-0">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        <div className="flex justify-between items-center mt-2">
                                                            <span className="font-bold text-sm" style={{ color: primaryColor }}>{cur} {(c.price * c.quantity).toFixed?.(0)}</span>
                                                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 border" style={{ borderColor }}>
                                                                <button onClick={() => updateQty(c.id, c.notes, -1)} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-500 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors"><Minus className="w-3 h-3" /></button>
                                                                <span className="w-6 text-center text-xs font-bold" style={{ color: textMain }}>{c.quantity}</span>
                                                                <button onClick={() => updateQty(c.id, c.notes, 1)} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-[--primary] rounded hover:bg-white dark:hover:bg-slate-700 transition-colors" style={{ '--primary': primaryColor } as React.CSSProperties}><Plus className="w-3 h-3" /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>


                                    </div>
                                )}
                            </div>

                            {/* Cart Footer Total/Checkout */}
                            {cart.length > 0 && (
                                <div className="p-4 md:p-5 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] border-t z-20 bg-white dark:bg-[#1e1e1e]" style={{ borderColor }}>
                                    <div className="flex justify-between items-center mb-4 text-sm font-bold" style={{ color: textMain }}>
                                        <span>{isAr ? 'المجموع الكلي' : 'Total Amount'}</span>
                                        <span className="text-xl md:text-2xl font-black" style={{ color: primaryColor }}>{cur} {cartTotal.toFixed?.(0)}</span>
                                    </div>
                                    <button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full flex justify-center items-center gap-2 h-12 md:h-14 rounded-xl text-white font-bold text-base transition-transform active:scale-95 shadow-md hover:shadow-lg"
                                        style={{ backgroundColor: '#10b981' }}>
                                        {isAr ? 'إتمام الطلب' : 'Proceed to Checkout'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast Notification Layer */}
            <AnimatePresence>
                {toastMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className="fixed bottom-[100px] left-1/2 z-[400] bg-black/80 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-xs md:text-sm font-bold shadow-xl whitespace-nowrap border border-white/10"
                    >
                        {toastMsg}
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
