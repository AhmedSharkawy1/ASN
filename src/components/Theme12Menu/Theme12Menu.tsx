/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, Globe, ChevronLeft, Search, X, MonitorSmartphone, Facebook, Instagram, X as LucideX, Plus, Minus, AlertCircle, FileText, Moon, Sun, MapPin, PhoneCall } from 'lucide-react';
import SharedMarquee from '../menu/SharedMarquee';
import CheckoutModal from '../menu/CheckoutModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface Theme12MenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
}

export default function Theme12Menu({ config, categories, restaurantId }: Theme12MenuProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isPhoneMenuOpen, setIsPhoneMenuOpen] = useState(false);
    useEffect(() => setMounted(true), []);

    const isAr = config.default_language === 'ar' || true; // Defaulting to true for now since design is RTL primary
    const isDark = mounted && theme === 'dark';
    const cur = '';
    const bgBody = isDark ? '#1a1a2e' : '#f5f6fa';
    const textMain = isDark ? '#f5f6fa' : '#2d3436';
    const primaryColor = config.theme_colors?.main_color || '#6c63ff';

    const getPrimaryColor = () => primaryColor;
    const getLogo = () => config.logo_url || '/asn-logo.png';
    const getRestaurantName = () => isAr ? config.name : (config.name_en || config.name);
    const coverImages = config.cover_images || [];
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [sliderLoaded] = useState(true);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCheckout, setShowCheckout] = useState(false);

    // Cart state 
    const [cart, setCart] = useState<{ id: string, item: MenuItem, catName: string, price: number, sizeLabel: string, quantity: number, notes: string, catImg?: string }[]>([]);
    const cartItemCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
    const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    // Modal state
    const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; catName: string; catImg?: string } | null>(null);
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [notes, setNotes] = useState('');
    const [selectedExtras, setSelectedExtras] = useState<{ id: number | string, name: string, price: number }[]>([]);

    const openModal = (item: MenuItem, cName: string, cImg?: string) => {
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

    const addToCart = () => {
        if (!selectedItem) return;
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
                notes,
                catImg: selectedItem.catImg
            }];
        });
        closeModal();
        setIsCartOpen(true);
    };

    const itemName = (item: MenuItem) => isAr ? item.title_ar : (item.title_en || item.title_ar);
    const catName = (cat: CategoryWithItemsType) => isAr ? cat.name_ar : (cat.name_en || cat.name_ar);

    const headerRef = useRef<HTMLElement>(null);
    const currentLang = isAr ? 'ar' : 'en';

    // Handle scroll for header
    useEffect(() => {
        const handleScroll = () => {
            if (headerRef.current) {
                if (window.scrollY > 50) {
                    headerRef.current.classList.add('scrolled');
                } else {
                    headerRef.current.classList.remove('scrolled');
                }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    const handleLanguageChange = (lang: string) => {
        document.cookie = `NEXT_LOCALE=${lang}; path=/`;
        window.location.reload();
    };

    const scrollToCategory = (categoryId: string) => {
        const element = document.getElementById(`category-${categoryId}`);
        if (element) {
            const headerOffset = 180; // Header + Banner
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setIsMobileMenuOpen(false);
        }
    };

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300`} style={{ backgroundColor: bgBody, color: textMain, '--primary-color': getPrimaryColor() } as React.CSSProperties} dir={isAr ? 'rtl' : 'ltr'}>

            {/* Global Theme 12 Styles are in theme12.css */}

            {/* Marquee Header */}
            {config.marquee_enabled && (
                <div className="bg-[#6c63ff] font-tajawal text-sm text-white">
                    <SharedMarquee
                        text={isAr ? (config.marquee_text_ar || '') : (config.marquee_text_en || config.marquee_text_ar || '')}
                    />
                </div>
            )}

            {/* Header */}
            <header ref={headerRef} className="sticky top-0 z-50 transition-all duration-300 bg-white/90 dark:bg-[#1a1a2e]/90 backdrop-blur-md border-b border-[#dfe6e9] dark:border-white/5 py-3">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">

                        {/* Left: Mobile Menu & Actions */}
                        <div className="flex items-center gap-2 lg:gap-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200"
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>

                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200 hover:-translate-y-1 transition-transform"
                            >
                                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            <div className="flex items-center gap-2">
                                {/* Social & Contact Icons */}
                                {config.whatsapp_number && (
                                    <a
                                        href={`https://wa.me/${config.whatsapp_number}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    </a>
                                )}
                                {/* Phone Icon with Dropdown for Delivery Numbers */}
                                {(config.phone || (config.phones && config.phones.length > 0)) && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsPhoneMenuOpen(!isPhoneMenuOpen)}
                                            className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                                        >
                                            <PhoneCall size={20} />
                                        </button>

                                        <AnimatePresence>
                                            {isPhoneMenuOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-[#16213e] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 py-2 z-50 overflow-hidden"
                                                >
                                                    <div className="px-4 py-2 border-b border-gray-100 dark:border-white/10 text-xs font-bold text-gray-500 uppercase text-center">
                                                        أرقام الديلفري
                                                    </div>
                                                    {config.phones && config.phones.length > 0 ? (
                                                        config.phones.map((phoneNum: string, idx: number) => (
                                                            <a
                                                                key={idx}
                                                                href={`tel:${phoneNum}`}
                                                                className="block px-4 py-2.5 text-center text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                                            >
                                                                {phoneNum}
                                                            </a>
                                                        ))
                                                    ) : (
                                                        <a
                                                            href={`tel:${config.phone}`}
                                                            className="block px-4 py-2.5 text-center text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                                        >
                                                            {config.phone}
                                                        </a>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                                {config.map_link ? (
                                    <a
                                        href={config.map_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <MapPin size={20} />
                                    </a>
                                ) : (config.latitude && config.longitude && (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${config.latitude},${config.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <MapPin size={20} />
                                    </a>
                                ))}
                                {config.facebook_url && (
                                    <a
                                        href={config.facebook_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-full bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-colors"
                                    >
                                        <Facebook size={20} />
                                    </a>
                                )}
                                {config.website_url && (
                                    <a
                                        href={config.website_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-full bg-gray-500/10 text-gray-500 flex items-center justify-center hover:bg-gray-500 hover:text-white transition-colors dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white dark:hover:text-[#1a1a2e]"
                                    >
                                        <Globe size={20} />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Center: Logo */}
                        <div className="absolute left-1/2 -translate-x-1/2 lg:relative lg:left-0 lg:translate-x-0">
                            <a href="#" className="flex items-center gap-2">
                                <div className="w-12 h-12 lg:w-14 lg:h-14 relative rounded-full overflow-hidden border-2 border-[#6c63ff] p-0.5 bg-white">
                                    <img src={getLogo()} alt={getRestaurantName()} className="w-full h-full object-cover rounded-full" />
                                </div>
                                <span className="hidden lg:block text-xl font-extrabold text-[#6c63ff] uppercase tracking-wider">{getRestaurantName()}</span>
                            </a>
                        </div>

                        {/* Right: Cart */}
                        <div className="flex items-center gap-4 lg:gap-6">
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="relative p-2.5 lg:p-3 lg:px-5 rounded-xl lg:rounded-[20px] bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:-translate-y-1 transition-all flex items-center gap-3"
                            >
                                <div className="relative">
                                    <ShoppingCart size={20} />
                                    {cartItemCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-[#ff4757] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-[#1a1a2e]">
                                            {cartItemCount}
                                        </span>
                                    )}
                                </div>
                                <span className="hidden lg:block font-bold">السلة</span>
                            </button>
                        </div>

                    </div>
                </div>

                {/* Mobile Navigation Dropdown */}
                <div className={`lg:hidden absolute top-full left-0 w-full bg-white dark:bg-[#16213e] border-b border-gray-100 dark:border-white/5 shadow-lg transition-all duration-300 ${isMobileMenuOpen ? 'max-h-[400px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'} `}>
                    <div className="p-4 flex flex-col gap-2">
                        {config.whatsapp_number && (
                            <a href={`https://wa.me/${config.whatsapp_number}`} className="px-4 py-3 text-gray-800 dark:text-gray-200 font-semibold rounded-xl text-center hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-center gap-2">
                                واتس اب
                            </a>
                        )}
                        {config.phone && (
                            <a href={`tel:${config.phone}`} className="px-4 py-3 text-gray-800 dark:text-gray-200 font-semibold rounded-xl text-center hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-center gap-2">
                                <PhoneCall size={18} /> اتصال
                            </a>
                        )}
                        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-white/5 flex justify-center gap-4">
                            {config.facebook_url && <a href={config.facebook_url} target="_blank" className="w-10 h-10 rounded-full bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center"><Facebook size={20} /></a>}
                            {config.website_url && <a href={config.website_url} target="_blank" className="w-10 h-10 rounded-full bg-gray-500/10 text-gray-500 flex items-center justify-center"><Globe size={20} /></a>}
                        </div>
                    </div>
                </div>
            </header >

            {/* Main Content */}
            < main className="pb-24" >

                {/* Banner Carousel */}
                {
                    coverImages.length > 0 && sliderLoaded && (
                        <div className="relative w-full h-[60vw] max-h-[450px] min-h-[200px] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <Swiper
                                modules={[Autoplay, Pagination]}
                                pagination={{ clickable: true }}
                                autoplay={{ delay: 5000, disableOnInteraction: false }}
                                loop={coverImages.length > 1}
                                className="w-full h-full"
                            >
                                {coverImages.map((src, i) => (
                                    <SwiperSlide key={i} className="w-full h-full">
                                        <div className="relative w-full h-full">
                                            <img src={src} alt={`Banner ${i + 1} `} className="w-full h-full object-cover" />
                                            {/* Optional overlay gradient for better text readability if titles exist */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    )
                }

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">

                    {/* Categories Section */}
                    <div className="bg-white dark:bg-[#16213e] rounded-[24px] shadow-[0_15px_35px_rgba(0,0,0,0.08)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.3)] p-4 sm:p-6 mb-10 overflow-hidden">
                        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => scrollToCategory(String(cat.id))}
                                    className="snap-start flex flex-col items-center gap-3 min-w-[90px] group flex-shrink-0"
                                >
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-[#6c63ff] to-[#00b894] shadow-[0_8px_15px_rgba(108,99,255,0.25)] group-hover:-translate-y-2 group-hover:shadow-[0_12px_20px_rgba(108,99,255,0.4)] transition-all duration-300">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-gray-800 border-[3px] border-white dark:border-[#16213e] relative">
                                            <img src={cat.image_url || '/default-category.png'} alt={cat.name_en || cat.name_ar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                    </div>
                                    <span className="font-bold text-sm text-center text-gray-800 dark:text-gray-200 group-hover:text-[#6c63ff] bg-gray-50 dark:bg-white/5 px-4 py-1.5 rounded-full transition-colors whitespace-nowrap">
                                        {catName(cat)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="mb-10 relative max-w-2xl mx-auto">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder={isAr ? "البحث..." : "Search..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchOpen(true)}
                                className="w-full h-14 pl-14 pr-6 rounded-full bg-white dark:bg-[#16213e] border-2 border-transparent focus:border-[#6c63ff] shadow-[0_8px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.2)] text-gray-800 dark:text-white font-medium outline-none transition-all placeholder:text-gray-400 group-hover:shadow-[0_12px_25px_rgba(108,99,255,0.15)] focus:shadow-[0_0_0_4px_rgba(108,99,255,0.15)]"
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#6c63ff] transition-colors" size={24} />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false) }} className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors">
                                    <LucideX size={16} />
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {isSearchOpen && searchQuery && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-[#16213e] rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/5 overflow-hidden z-40 max-h-[400px] overflow-y-auto">
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                                    <Search size={40} className="opacity-30" />
                                    <p>لم يتم العثور على نتائج</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-12">
                        {categories.map(category => {
                            const categoryItems = categories.find(c => c.id === category.id)?.items || [];
                            if (categoryItems.length === 0) return null;

                            return (
                                <div key={category.id} id={`category-${category.id}`} className="scroll-mt-32">
                                    <h2 className="text-2xl md:text-3xl font-black mb-8 text-[#2d3436] dark:text-[#f5f6fa] relative inline-block">
                                        <span className="relative z-10">{catName(category)}</span>
                                        <span className="absolute bottom-1 left-0 w-full h-3 bg-[#6c63ff]/20 -rotate-1 rounded-sm -z-0"></span>
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {categoryItems.map(item => (
                                            <div key={item.id} id={`item-${item.id}`} className="bg-white dark:bg-[#16213e] rounded-2xl overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(108,99,255,0.2)] transition-all duration-300 group flex flex-col">
                                                <div className="relative aspect-[4/3] w-full overflow-hidden">
                                                    <img
                                                        src={item.image_url || category.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'}
                                                        alt={itemName(item)}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                    {/* Badges styling from theme 12 */}
                                                </div>
                                                <div className="p-5 flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2 leading-tight group-hover:text-[#6c63ff] transition-colors">{itemName(item)}</h3>
                                                        {(item.desc_ar || item.desc_en) && (
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">{isAr ? item.desc_ar : (item.desc_en || item.desc_ar)}</p>
                                                        )}
                                                        {item.size_labels && item.size_labels.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mb-4">
                                                                {item.size_labels.map((label, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-2.5 py-1 rounded-lg">
                                                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
                                                                        <span className="text-xs font-bold text-[#6c63ff]">{cur}{item.prices[idx]}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-white/10">
                                                        <div className="font-black text-lg text-[#6c63ff]">
                                                            {item.prices?.[0] || 0} <span className="text-sm font-semibold">EGP</span>
                                                        </div>
                                                        <button
                                                            onClick={() => openModal(item, catName(category), category.image_url)}
                                                            className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#6c63ff] flex items-center justify-center hover:bg-[#6c63ff] hover:text-white hover:border-transparent transition-all group-hover:rgb-btn"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
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
            </main >
            {/* Modal */}
            <AnimatePresence>
                {
                    selectedItem && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
                            onClick={closeModal}>
                            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="relative w-full sm:max-w-[500px] h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-[24px] overflow-hidden flex flex-col shadow-2xl bg-white dark:bg-[#1a1a2e]"
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
                                <div className="flex-1 overflow-y-auto p-5 pb-24 text-gray-800 dark:text-[#f5f6fa]">

                                    {/* Base Price */}
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-[#16213e] border border-gray-100 dark:border-white/10 p-4 rounded-xl mb-6">
                                        <span className="font-bold">{isAr ? 'السعر' : 'Price'}</span>
                                        <span className="text-xl font-black text-[#6c63ff]">{cur}{selectedItem.item.prices[sizeIdx]?.toFixed?.(0)}</span>
                                    </div>

                                    {/* Sizes */}
                                    {selectedItem.item.prices.length > 1 && (
                                        <div className="mb-6">
                                            <h3 className="font-bold mb-3 flex items-center gap-2">
                                                {isAr ? 'اختر الحجم' : 'Select Size'}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {selectedItem.item.prices.map((p, idx) => {
                                                    const label = selectedItem.item.size_labels?.[idx] || (isAr ? `حجم ${idx + 1}` : `Size ${idx + 1}`);
                                                    return (
                                                        <label key={idx} className="flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-center"
                                                            style={{ borderColor: sizeIdx === idx ? '#6c63ff' : 'transparent', backgroundColor: sizeIdx === idx ? `#6c63ff15` : 'rgba(108, 99, 255, 0.05)' }}
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
                                                            style={{ borderColor: isSel ? '#6c63ff' : 'rgba(255,255,255,0.1)', backgroundColor: isSel ? `#6c63ff05` : 'transparent' }}>
                                                            <input type="checkbox" className="hidden" checked={isSel}
                                                                onChange={() => {
                                                                    if (isSel) setSelectedExtras(p => p.filter(e => e.id !== id));
                                                                    else setSelectedExtras(p => [...p, { id, name: isAr ? ext.name_ar : (ext.name_en || ext.name_ar), price: ext.price }]);
                                                                }} />
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                                                                    style={{ borderColor: isSel ? '#6c63ff' : 'gray', backgroundColor: isSel ? '#6c63ff' : 'transparent' }}>
                                                                    {isSel && <X className="w-3 h-3 text-white" style={{ transform: 'rotate(45deg)' }} />}
                                                                </div>
                                                                <span className="text-sm font-semibold">{isAr ? ext.name_ar : (ext.name_en || ext.name_ar)}</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-[#6c63ff]">{ext.price > 0 ? `+${cur}${ext.price}` : (isAr ? 'مجاناً' : 'Free')}</span>
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
                                            className="w-full rounded-xl p-3 outline-none resize-none h-24 text-sm border focus:ring-1 transition-all bg-gray-50 dark:bg-[#16213e] border-gray-100 dark:border-white/10"
                                            style={{ '--tw-ring-color': '#6c63ff' } as React.CSSProperties} />
                                    </div>
                                </div>

                                {/* Sticky Bottom Actions */}
                                <div className="absolute bottom-0 w-full p-4 border-t shadow-[0_-10px_20px_rgba(0,0,0,0.05)] bg-white dark:bg-[#1a1a2e] border-gray-100 dark:border-white/10">
                                    <div className="flex gap-4 items-center">
                                        <div className="flex items-center bg-gray-50 dark:bg-[#16213e] rounded-full h-12 px-2 border border-gray-100 dark:border-white/10">
                                            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded-full flex flex-col items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center font-bold text-lg">{qty}</span>
                                            <button onClick={() => setQty(qty + 1)} className="w-8 h-8 rounded-full flex flex-col items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button onClick={addToCart} className="flex-1 h-12 rounded-full text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md hover:shadow-lg bg-[#6c63ff]">
                                            <ShoppingCart className="w-5 h-5" />
                                            {isAr ? 'إضافة إلى السلة' : 'Add to Cart'} — {cur}{(((selectedItem.item.prices[sizeIdx] || 0) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty).toFixed?.(0)}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Cart Overlay */}
            < div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] transition-opacity duration-300 flex justify-end ${isCartOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`
            }>
                <div className={`w-full max-w-md h-full bg-white dark:bg-[#1a1a2e] flex flex-col shadow-[-4px_0_30px_rgba(0,0,0,0.2)] dark:shadow-[-4px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-400 ease-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    {/* Cart Header */}
                    <div className="bg-gradient-to-br from-[#6366f1] to-[#4f46e5] dark:from-[#4f46e5] dark:to-[#4338ca] text-white p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShoppingCart size={24} />
                            <div>
                                <h2 className="text-xl font-bold m-0">السلة</h2>
                                <span className="text-sm opacity-90">{cartItemCount} عنصر</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCartOpen(false)}
                            className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all hover:rotate-90"
                        >
                            <LucideX size={20} />
                        </button>
                    </div>

                    {/* Cart Body */}
                    <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-[#16213e]">
                        {cartItemCount === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <div className="w-32 h-32 bg-gradient-to-br from-[#e0e7ff] to-[#c7d2fe] dark:from-[#16213e] dark:to-[#0f3460] rounded-full flex items-center justify-center mb-6">
                                    <ShoppingCart size={50} className="text-[#6366f1] dark:text-[#818cf8]" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-[#f5f6fa] mb-2">السلة فارغة</h3>
                                <p className="text-gray-500 dark:text-[#a4b0be] mb-8">ابدأ بإضافة المنتجات المفضلة لديك</p>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:-translate-y-1 hover:shadow-lg transition-all"
                                >
                                    تصفح المنيو
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {cart.map((c) => (
                                    <div key={c.id} className="bg-white dark:bg-[#1a1a2e] border border-gray-100 dark:border-white/10 p-4 rounded-xl flex gap-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-100 dark:border-white/10">
                                            <img src={c.item.image_url || c.catImg || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200'} alt={itemName(c.item)} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className="font-bold text-gray-800 dark:text-[#f5f6fa] text-sm line-clamp-2">{itemName(c.item)}</h4>
                                                <button
                                                    onClick={() => setCart(cart.filter(cartItem => cartItem.id !== c.id))}
                                                    className="text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            {(c.sizeLabel) && (
                                                <div className="text-xs text-[#6c63ff] font-medium mt-1">
                                                    {c.sizeLabel}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                                                <div className="font-bold text-[#6366f1] dark:text-[#818cf8] text-sm whitespace-nowrap">
                                                    {c.price * c.quantity} EGP
                                                </div>
                                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg p-1">
                                                    <button
                                                        onClick={() => setCart(cart.map(cartItem => cartItem.id === c.id ? { ...cartItem, quantity: Math.max(1, cartItem.quantity - 1) } : cartItem))}
                                                        className="w-7 h-7 rounded flex items-center justify-center bg-white dark:bg-white/10 shadow-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                        disabled={c.quantity <= 1}
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-6 text-center font-bold text-gray-800 dark:text-[#f5f6fa] text-sm">{c.quantity}</span>
                                                    <button
                                                        onClick={() => setCart(cart.map(cartItem => cartItem.id === c.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem))}
                                                        className="w-7 h-7 rounded flex items-center justify-center bg-white dark:bg-white/10 shadow-sm text-green-500 hover:bg-green-500 hover:text-white transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cart Footer */}
                    {cartItemCount > 0 && (
                        <div className="bg-white dark:bg-[#16213e] p-5 border-t-2 border-gray-100 dark:border-white/10 flex flex-col gap-4">
                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl space-y-3">
                                <div className="flex justify-between text-sm text-gray-600 dark:text-[#a4b0be]">
                                    <span>المجموع الفرعي</span>
                                    <span className="font-bold text-gray-800 dark:text-[#f5f6fa]">{cartTotal} EGP</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600 dark:text-[#a4b0be]">
                                    <span>رسوم التوصيل</span>
                                    <span className="font-bold text-gray-800 dark:text-[#f5f6fa]">0.00 EGP</span>
                                </div>
                                <div className="h-px w-full bg-gray-200 dark:bg-white/10"></div>
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-bold text-gray-800 dark:text-[#f5f6fa]">الإجمالي</span>
                                    <span className="font-black text-[#6366f1] dark:text-[#818cf8] text-xl">{cartTotal} EGP</span>
                                </div>
                            </div>
                            <button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(99,102,241,0.3)] transition-all">
                                <span>إتمام الطلب</span>
                                <ChevronLeft size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div >

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

            {/* Temporarily hidden */}
        </div >
    );
};
