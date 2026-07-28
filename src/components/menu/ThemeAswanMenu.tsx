'use client';

import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { getAswanColors } from '@/lib/aswanVariants';
import { parseCurrency } from '@/lib/currency';
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2, X, Search, Share2, Home, Tag, Moon, Sun, LayoutGrid, LayoutList, CreditCard, ArrowRight, Check, Phone, MapPin, Clock } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import ASNFooter from '@/components/menu/ASNFooter';
import CheckoutModal from './CheckoutModal';
import SharedMarquee from './SharedMarquee';
import AswanLandingPage from './AswanLandingPage';
import { FaWhatsapp } from 'react-icons/fa';

type MenuItem = {
    id: string | number;
    title_ar?: string;
    title_en?: string;
    description_ar?: string;
    description_en?: string;
    desc_ar?: string;
    desc_en?: string;
    image?: string;
    image_url?: string;
    prices: number[];
    size_labels?: string[];
    extras?: { id?: number | string; name_ar?: string; name_en?: string; price: number }[];
    is_available?: boolean;
    is_popular?: boolean;
    [key: string]: any;
};

interface CategoryWithItemsType {
    id: string | number;
    name_ar?: string;
    name_en?: string;
    items?: MenuItem[];
    image_url?: string;
    [key: string]: any;
}

interface RestaurantType {
    name: string;
    theme?: string;
    slogan_en?: string;
    slogan_ar?: string;
    logo_url?: string;
    cover_images?: string[];
    marquee_enabled?: boolean;
    marquee_text_en?: string;
    marquee_text_ar?: string;
    orders_enabled?: boolean;
    order_channel?: 'whatsapp' | 'website' | 'both';
    show_asn_branding?: boolean;
    theme_colors?: any;
    default_theme_mode?: 'light' | 'dark' | 'system';
    aswan_landing_enabled?: boolean;
    vicino_landing_enabled?: boolean;
    phone?: string;
    phone_numbers?: { label?: string; number: string }[];
    address?: string;
    map_link?: string;
    working_hours?: string;
    whatsapp_number?: string;
    [key: string]: any;
}

interface ThemeAswanMenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
}

export default function ThemeAswanMenu({ config, categories, restaurantId }: ThemeAswanMenuProps) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [localMode, setLocalMode] = useState<'light' | 'dark' | null>(null);

    useEffect(() => {
        setMounted(true);
        if (config.default_theme_mode && config.default_theme_mode !== 'system') {
            setTheme(config.default_theme_mode);
        }
    }, [config.default_theme_mode, setTheme]);

    const isDark = mounted && (localMode ? localMode === 'dark' : (resolvedTheme === 'dark' || theme === 'dark'));

    const toggleTheme = () => {
        const nextMode = isDark ? 'light' : 'dark';
        setLocalMode(nextMode);
        setTheme(nextMode);
    };

    const cur = parseCurrency(config?.currency, false); // Force English currency string

    const { primaryColor, bgBody, bgCard, textMain, textMuted, borderColor, activeBgImage, hasBgImage } = getAswanColors(config, isDark);

    // Landing Page state
    const landingEnabled = config.aswan_landing_enabled ?? config.vicino_landing_enabled ?? false;
    const [inMenu, setInMenu] = useState(!landingEnabled);

    // Filter, view & search state
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modals & Cart state
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; catName: string } | null>(null);
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [notes, setNotes] = useState('');
    const [selectedExtras, setSelectedExtras] = useState<{ id: number | string; name: string; price: number }[]>([]);
    
    const [cart, setCart] = useState<{ id: string; item: MenuItem; catName: string; price: number; sizeLabel: string; quantity: number; notes: string }[]>([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);

    // Refs for Scroll Spy Category Navigation
    const categoryNavRef = useRef<HTMLDivElement>(null);
    const categoryBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const isManualClickRef = useRef(false);

    // English name fallbacks
    const getItemName = (item: MenuItem) => item.title_en || item.title_ar || 'Unnamed Item';
    const getItemDesc = (item: MenuItem) => item.description_en || item.desc_en || item.description_ar || item.desc_ar || '';
    const getCatName = (cat: CategoryWithItemsType) => cat.name_en || cat.name_ar || 'Category';

    const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
    const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    const displayNumbers = (config.phone_numbers && config.phone_numbers.length > 0)
        ? config.phone_numbers
        : (config.phone ? [{ label: 'Contact Number', number: config.phone }] : []);

    // Scroll Spy Effect: highlight active category and auto-scroll horizontal pill bar
    useEffect(() => {
        if (!inMenu || searchQuery) return;

        const handleScroll = () => {
            if (isManualClickRef.current) return;

            const categoryElements = categories.map(c => document.getElementById(`cat-sec-${c.id}`)).filter(Boolean) as HTMLElement[];
            if (categoryElements.length === 0) return;

            const scrollPosition = window.scrollY + 140; // Navbar offset

            let currentCatId = 'all';
            for (let i = 0; i < categoryElements.length; i++) {
                const el = categoryElements[i];
                const top = el.offsetTop;
                const height = el.offsetHeight;

                if (scrollPosition >= top && scrollPosition < top + height) {
                    const rawId = el.id.replace('cat-sec-', '');
                    currentCatId = rawId;
                    break;
                }
            }

            if (currentCatId !== activeCategory) {
                setActiveCategory(currentCatId);
                const btn = categoryBtnRefs.current[currentCatId];
                if (btn && categoryNavRef.current) {
                    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [inMenu, searchQuery, categories, activeCategory]);

    const handleCategoryClick = (catId: string) => {
        setActiveCategory(catId);
        isManualClickRef.current = true;

        if (catId === 'all') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const el = document.getElementById(`cat-sec-${catId}`);
            if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 100;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }

        const btn = categoryBtnRefs.current[catId];
        if (btn) {
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        setTimeout(() => {
            isManualClickRef.current = false;
        }, 800);
    };

    const openModal = (item: MenuItem, cName: string) => {
        if (config.orders_enabled === false) return;
        setSelectedItem({ item, catName: cName });
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
            return [...prev, { id: cId, item: selectedItem.item, catName: selectedItem.catName, price: finalPrice, sizeLabel: sizeLbl, quantity: qty, notes }];
        });
        closeModal();
    };

    const updateQty = (id: string, itemNotes: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id === id && c.notes === itemNotes) {
                const nq = c.quantity + delta;
                return { ...c, quantity: nq };
            }
            return c;
        }).filter(c => c.quantity > 0));
    };

    const handleShare = async () => {
        const shareData = {
            title: config.name,
            text: `Check out ${config.name}'s menu`,
            url: window.location.href,
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error("Share failed:", err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Menu link copied to clipboard!');
        }
    };

    const allItems: (MenuItem & { catName: string })[] = categories.flatMap(c => (c.items || []).map(i => ({ ...i, catName: getCatName(c) })));
    const featuredItems = allItems.filter(item => item.is_popular);

    const searchedCategories = categories.map(cat => ({
        ...cat,
        items: (cat.items || []).filter(item => getItemName(item).toLowerCase().includes(searchQuery.toLowerCase()))
    })).filter(cat => cat.items.length > 0);

    const displayCategories = searchQuery ? searchedCategories : categories;

    if (!mounted) return <div className="min-h-screen" style={{ backgroundColor: bgBody }} />;

    if (!inMenu && landingEnabled) {
        return <AswanLandingPage config={config} onContinue={() => setInMenu(true)} />;
    }

    return (
        <div 
            className="min-h-screen font-sans pb-32 relative transition-colors duration-300 antialiased"
            style={{ 
                backgroundColor: bgBody, 
                color: textMain,
                backgroundImage: hasBgImage ? `url("${activeBgImage}")` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                backgroundRepeat: 'no-repeat'
            }} 
            dir="ltr"
        >
            {/* Background Overlay for text legibility */}
            {hasBgImage && (
                <div 
                    className="fixed inset-0 pointer-events-none transition-opacity duration-300 z-0"
                    style={{
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.90)',
                        backdropFilter: 'blur(8px)'
                    }}
                />
            )}

            <div className="relative z-10">
                {/* --- MARQUEE OFFER BAR --- */}
                {config.marquee_enabled && (
                    <div className="text-xs md:text-sm text-white py-1.5 font-semibold tracking-normal" style={{ backgroundColor: primaryColor }}>
                        <SharedMarquee text={config.marquee_text_en || config.marquee_text_ar || 'Welcome to our restaurant! Enjoy our delicious menu.'} />
                    </div>
                )}

                {/* --- HEADER & TOP ACTION BAR --- */}
                <div className="px-5 pt-6 pb-4 max-w-4xl mx-auto">
                    {/* Top Action Utility Row */}
                    <div className="flex justify-between items-center mb-6">
                        {/* Left Action Buttons (Home, Share, Direct Call Icon) */}
                        <div className="flex items-center gap-2">
                            {landingEnabled && (
                                <button 
                                    onClick={() => setInMenu(false)} 
                                    className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-transform active:scale-95"
                                    style={{ backgroundColor: bgCard, borderColor: borderColor, color: primaryColor }}
                                    title="Back to Home Page"
                                >
                                    <Home className="w-5 h-5" />
                                </button>
                            )}
                            <button 
                                onClick={handleShare} 
                                className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-transform active:scale-95"
                                style={{ backgroundColor: bgCard, borderColor: borderColor }}
                                title="Share Menu"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>

                            {/* Direct Phone Call Icon Button */}
                            {displayNumbers.length > 0 && (
                                <button
                                    onClick={() => setShowContactModal(true)}
                                    className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm text-emerald-500 transition-transform active:scale-95"
                                    style={{ backgroundColor: bgCard, borderColor: borderColor }}
                                    title="Call Us / Contact"
                                >
                                    <Phone className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Right Action Buttons (Theme Switcher & Payment Methods) */}
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={toggleTheme}
                                className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-transform active:scale-95"
                                style={{ backgroundColor: bgCard, borderColor: borderColor }}
                                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
                            </button>

                            {config.payment_methods && config.payment_methods.length > 0 && (
                                <button 
                                    onClick={() => setShowPaymentModal(true)} 
                                    className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm text-amber-500 transition-transform active:scale-95"
                                    style={{ backgroundColor: bgCard, borderColor: borderColor }}
                                    title="Payment Methods"
                                >
                                    <CreditCard className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Centered Brand Header (Prominent Logo & Full Width Text) */}
                    <div className="flex flex-col items-center text-center max-w-xl mx-auto mb-6">
                        {(() => {
                            let parsedLogos = { light: config.aswan_logo_url || config.vicino_logo_url, dark: config.aswan_logo_url || config.vicino_logo_url };
                            const logoField = config.aswan_logo_url || config.vicino_logo_url;
                            if (logoField && logoField.startsWith('{')) {
                                try { parsedLogos = JSON.parse(logoField); } catch {}
                            }
                            const currentLogo = isDark ? (parsedLogos.dark || parsedLogos.light) : (parsedLogos.light || parsedLogos.dark);
                            const finalLogoSrc = currentLogo || config.logo_url;
                            if (!finalLogoSrc) return null;
                            return (
                                <div className="relative mb-3 group">
                                    <div className="absolute inset-0 rounded-full blur-xl opacity-35" style={{ backgroundColor: primaryColor }} />
                                    <div 
                                        className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 shadow-xl flex items-center justify-center p-2 bg-white" 
                                        style={{ borderColor: primaryColor }}
                                    >
                                        <OptimizedMenuImage src={finalLogoSrc} alt={config.name} className="w-full h-full object-contain rounded-full" useOriginal={true} />
                                    </div>
                                </div>
                            );
                        })()}

                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-normal leading-tight text-center" style={{ color: textMain }}>
                            {config.name}
                        </h1>

                        {(config.slogan_en || config.slogan_ar) && (
                            <p className="text-xs md:text-sm font-medium opacity-80 mt-2 max-w-md mx-auto text-center leading-relaxed" style={{ color: textMuted }}>
                                {config.slogan_en || config.slogan_ar}
                            </p>
                        )}
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-4xl mx-auto mt-2">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5" style={{ color: textMuted }} />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search in menu..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-12 rounded-2xl pl-12 pr-4 outline-none font-medium text-sm shadow-md border transition-all focus:ring-2"
                            style={{ backgroundColor: bgCard, color: textMain, borderColor: borderColor }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-4 flex items-center">
                                <X className="w-4 h-4 opacity-60 hover:opacity-100" />
                            </button>
                        )}
                    </div>
                </div>

                {/* --- COVER BANNER SLIDER --- */}
                {config.cover_images && config.cover_images.length > 0 && !searchQuery && (
                    <div className="px-5 mb-6 max-w-4xl mx-auto">
                        <Swiper modules={[Autoplay]} autoplay={{ delay: 3500, disableOnInteraction: false }} className="w-full rounded-3xl overflow-hidden shadow-lg border" style={{ borderColor: borderColor }}>
                            {config.cover_images.map((img, i) => (
                                <SwiperSlide key={i}>
                                    <OptimizedMenuImage src={img} alt="Offer" className="w-full h-[160px] md:h-[220px] object-cover" />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                )}

                {/* --- FEATURED OFFERS SLIDER --- */}
                {!searchQuery && featuredItems.length > 0 && (
                    <div className="mb-8 max-w-4xl mx-auto">
                        <div className="px-5 flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Tag className="w-5 h-5" style={{ color: primaryColor }} />
                                <h2 className="text-lg font-bold">Featured Offers</h2>
                            </div>
                        </div>
                        <div className="pl-5 pr-2">
                            <Swiper spaceBetween={14} slidesPerView={1.3} breakpoints={{ 640: { slidesPerView: 2.3 } }} modules={[Autoplay]} autoplay={{ delay: 3000, disableOnInteraction: false }} loop={featuredItems.length > 2}>
                                {featuredItems.map((item, idx) => (
                                    <SwiperSlide key={idx} className="pb-3">
                                        <div 
                                            className="rounded-3xl overflow-hidden shadow-md cursor-pointer border flex flex-col h-full transition-transform hover:scale-[1.02]"
                                            style={{ backgroundColor: bgCard, borderColor: borderColor }}
                                            onClick={() => openModal(item, item.catName)}
                                        >
                                            <div className="relative h-[140px]">
                                                <OptimizedMenuImage thumbnailSrc={item.thumbnail_url} originalSrc={item.image_url || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} alt={getItemName(item)} className="w-full h-full object-cover" />
                                                <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                                                    Special Offer
                                                </div>
                                            </div>
                                            <div className="p-4 flex flex-col justify-between flex-1">
                                                <h3 className="font-bold text-base mb-1 line-clamp-2">{getItemName(item)}</h3>
                                                <div className="mt-3 flex items-center justify-between">
                                                    <span className="font-extrabold text-base whitespace-nowrap" style={{ color: primaryColor }}>
                                                        {item.prices?.[0] || 0} {cur}
                                                    </span>
                                                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl text-white shadow-sm whitespace-nowrap" style={{ backgroundColor: primaryColor }}>
                                                        Add +
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>
                )}

                {/* --- STICKY CATEGORIES & VIEW MODE BAR --- */}
                <div className="sticky top-0 z-30 px-5 py-3 backdrop-blur-xl border-y transition-colors shadow-sm" style={{ backgroundColor: `${bgCard}f0`, borderColor: borderColor }}>
                    <div className="max-w-4xl mx-auto flex items-center gap-3">
                        {/* Horizontal Pill Bar */}
                        <div ref={categoryNavRef} className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 py-0.5">
                            <button
                                ref={el => { categoryBtnRefs.current['all'] = el; }}
                                onClick={() => handleCategoryClick('all')}
                                className="px-4 py-2 rounded-2xl font-semibold text-xs md:text-sm whitespace-nowrap transition-all shadow-sm border shrink-0"
                                style={{
                                    backgroundColor: activeCategory === 'all' ? primaryColor : 'transparent',
                                    color: activeCategory === 'all' ? '#ffffff' : textMain,
                                    borderColor: activeCategory === 'all' ? primaryColor : borderColor
                                }}
                            >
                                All Items
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    ref={el => { categoryBtnRefs.current[cat.id.toString()] = el; }}
                                    onClick={() => handleCategoryClick(cat.id.toString())}
                                    className="px-4 py-2 rounded-2xl font-semibold text-xs md:text-sm whitespace-nowrap transition-all shadow-sm border shrink-0"
                                    style={{
                                        backgroundColor: activeCategory === cat.id.toString() ? primaryColor : 'transparent',
                                        color: activeCategory === cat.id.toString() ? '#ffffff' : textMain,
                                        borderColor: activeCategory === cat.id.toString() ? primaryColor : borderColor
                                    }}
                                >
                                    {getCatName(cat)}
                                </button>
                            ))}
                        </div>

                        {/* Grid / List View Mode Toggle */}
                        <div className="flex items-center gap-1 border p-1 rounded-2xl shrink-0" style={{ borderColor: borderColor }}>
                            <button 
                                onClick={() => setViewMode('grid')}
                                className="p-2 rounded-xl transition-colors"
                                style={{ backgroundColor: viewMode === 'grid' ? `${primaryColor}20` : 'transparent', color: viewMode === 'grid' ? primaryColor : textMuted }}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className="p-2 rounded-xl transition-colors"
                                style={{ backgroundColor: viewMode === 'list' ? `${primaryColor}20` : 'transparent', color: viewMode === 'list' ? primaryColor : textMuted }}
                                title="List View"
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- MENU ITEMS CONTENT --- */}
                <div className="px-5 py-6 max-w-4xl mx-auto space-y-10">
                    {displayCategories.map(cat => {
                        const items = cat.items || [];
                        if (items.length === 0) return null;

                        return (
                            <div key={cat.id} id={`cat-sec-${cat.id}`} className="space-y-4 pt-2">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold tracking-normal" style={{ color: textMain }}>
                                        {getCatName(cat)}
                                    </h2>
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border opacity-70" style={{ borderColor: borderColor }}>
                                        {items.length} items
                                    </span>
                                </div>

                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {items.map(item => (
                                            <motion.div
                                                key={item.id}
                                                whileHover={{ y: -3 }}
                                                className="rounded-3xl overflow-hidden border shadow-md flex flex-col justify-between cursor-pointer transition-shadow hover:shadow-xl"
                                                style={{ backgroundColor: bgCard, borderColor: borderColor }}
                                                onClick={() => openModal(item, getCatName(cat))}
                                            >
                                                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                    <OptimizedMenuImage 
                                                        thumbnailSrc={item.thumbnail_url} 
                                                        originalSrc={item.image_url || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                                                        alt={getItemName(item)} 
                                                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                                                    />
                                                    {item.is_popular && (
                                                        <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shadow-md">
                                                            Popular
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-3.5 flex flex-col justify-between flex-1">
                                                    <div>
                                                        <h3 className="font-bold text-sm md:text-base leading-snug line-clamp-2" style={{ color: textMain }}>
                                                            {getItemName(item)}
                                                        </h3>
                                                        {getItemDesc(item) && (
                                                            <p className="text-xs opacity-70 line-clamp-2 mt-1 font-normal leading-relaxed" style={{ color: textMuted }}>
                                                                {getItemDesc(item)}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="mt-3 flex items-center justify-between">
                                                        <div className="font-extrabold text-sm md:text-base whitespace-nowrap" style={{ color: primaryColor }}>
                                                            {item.prices?.[0] || 0} <span className="text-xs font-semibold">{cur}</span>
                                                        </div>
                                                        <button 
                                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md transition-transform active:scale-95 shrink-0"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    /* List View */
                                    <div className="space-y-3">
                                        {items.map(item => (
                                            <motion.div
                                                key={item.id}
                                                whileHover={{ x: 3 }}
                                                className="p-3 md:p-4 rounded-3xl border shadow-sm flex items-center gap-4 cursor-pointer transition-all hover:shadow-md"
                                                style={{ backgroundColor: bgCard, borderColor: borderColor }}
                                                onClick={() => openModal(item, getCatName(cat))}
                                            >
                                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                                                    <OptimizedMenuImage 
                                                        thumbnailSrc={item.thumbnail_url} 
                                                        originalSrc={item.image_url || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                                                        alt={getItemName(item)} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-base truncate" style={{ color: textMain }}>
                                                        {getItemName(item)}
                                                    </h3>
                                                    {getItemDesc(item) && (
                                                        <p className="text-xs opacity-70 line-clamp-2 mt-0.5 font-normal" style={{ color: textMuted }}>
                                                            {getItemDesc(item)}
                                                        </p>
                                                    )}
                                                    <div className="mt-2 font-extrabold text-base" style={{ color: primaryColor }}>
                                                        {item.prices?.[0] || 0} {cur}
                                                    </div>
                                                </div>
                                                <button 
                                                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform active:scale-95"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* --- ITEM DETAIL MODAL (Centered Dead Center & No Text Wrap) --- */}
                <AnimatePresence>
                    {selectedItem && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 min-h-screen"
                            onClick={closeModal}
                        >
                            <motion.div 
                                initial={{ scale: 0.92, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.92, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                onClick={e => e.stopPropagation()}
                                className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border flex flex-col max-h-[85vh] my-auto"
                                style={{ backgroundColor: bgCard, borderColor: borderColor }}
                            >
                                {/* Header Image */}
                                <div className="relative h-48 md:h-56 w-full bg-slate-900 shrink-0">
                                    <OptimizedMenuImage 
                                        thumbnailSrc={selectedItem.item.thumbnail_url} 
                                        originalSrc={selectedItem.item.image_url || selectedItem.item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                                        alt={getItemName(selectedItem.item)} 
                                        className="w-full h-full object-cover" 
                                    />
                                    <button 
                                        onClick={closeModal}
                                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 shadow-md"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Body Info */}
                                <div className="p-5 overflow-y-auto space-y-5 flex-1">
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-sky-500 block mb-1">
                                            {selectedItem.catName}
                                        </span>
                                        <h2 className="text-xl font-bold tracking-normal" style={{ color: textMain }}>
                                            {getItemName(selectedItem.item)}
                                        </h2>
                                        {getItemDesc(selectedItem.item) && (
                                            <p className="text-xs md:text-sm opacity-80 mt-1.5 leading-relaxed font-normal" style={{ color: textMuted }}>
                                                {getItemDesc(selectedItem.item)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Size Options */}
                                    {selectedItem.item.prices && selectedItem.item.prices.length > 1 && (
                                        <div className="space-y-2.5">
                                            <label className="font-bold text-xs uppercase tracking-wider block opacity-70">Choose Size</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedItem.item.prices.map((p, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSizeIdx(idx)}
                                                        className="p-3 rounded-2xl border font-semibold text-xs flex justify-between items-center transition-all"
                                                        style={{
                                                            borderColor: sizeIdx === idx ? primaryColor : borderColor,
                                                            backgroundColor: sizeIdx === idx ? `${primaryColor}15` : 'transparent',
                                                            color: sizeIdx === idx ? primaryColor : textMain
                                                        }}
                                                    >
                                                        <span>{selectedItem.item.size_labels?.[idx] || `Option ${idx + 1}`}</span>
                                                        <span className="font-bold">{p} {cur}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Extras */}
                                    {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                        <div className="space-y-2.5">
                                            <label className="font-bold text-xs uppercase tracking-wider block opacity-70">Extras & Addons</label>
                                            <div className="space-y-2">
                                                {selectedItem.item.extras.map((ext, idx) => {
                                                    const extName = ext.name_en || ext.name_ar || 'Extra';
                                                    const isChecked = selectedExtras.some(e => e.name === extName);
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                if (isChecked) {
                                                                    setSelectedExtras(prev => prev.filter(e => e.name !== extName));
                                                                } else {
                                                                    setSelectedExtras(prev => [...prev, { id: ext.id || idx, name: extName, price: ext.price }]);
                                                                }
                                                            }}
                                                            className="w-full p-3 rounded-2xl border font-semibold text-xs flex justify-between items-center transition-all"
                                                            style={{
                                                                borderColor: isChecked ? primaryColor : borderColor,
                                                                backgroundColor: isChecked ? `${primaryColor}15` : 'transparent'
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-4 h-4 rounded-md border flex items-center justify-center" style={{ borderColor: isChecked ? primaryColor : borderColor, backgroundColor: isChecked ? primaryColor : 'transparent' }}>
                                                                    {isChecked && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <span>{extName}</span>
                                                            </div>
                                                            <span className="font-bold">+{ext.price} {cur}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Instructions */}
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-xs uppercase tracking-wider block opacity-70">Special Instructions</label>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder="Any specific requests or allergies?"
                                            className="w-full p-3 rounded-2xl border outline-none font-normal text-xs resize-none h-16"
                                            style={{ backgroundColor: bgBody, borderColor: borderColor, color: textMain }}
                                        />
                                    </div>
                                </div>

                                {/* Modal Footer (Single row Add to Cart button - No line wrapping) */}
                                <div className="p-4 border-t flex items-center gap-3 shrink-0" style={{ borderColor: borderColor }}>
                                    <div className="flex items-center border rounded-2xl p-1 shrink-0" style={{ borderColor: borderColor }}>
                                        <button 
                                            onClick={() => setQty(Math.max(1, qty - 1))}
                                            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="w-7 text-center font-bold text-xs">{qty}</span>
                                        <button 
                                            onClick={() => setQty(qty + 1)}
                                            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={addToCart}
                                        className="flex-1 py-3.5 px-3 md:px-5 rounded-2xl font-bold text-white shadow-xl flex items-center justify-between whitespace-nowrap text-xs sm:text-sm md:text-base transition-transform active:scale-95 shrink-0"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <span className="whitespace-nowrap">Add to Cart</span>
                                        <span className="font-extrabold whitespace-nowrap ml-1.5">
                                            {((selectedItem.item.prices?.[sizeIdx] || 0) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty} {cur}
                                        </span>
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- FLOATING CART BUTTON --- */}
                {cartCount > 0 && (
                    <div className="fixed bottom-6 inset-x-5 max-w-md mx-auto z-40">
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-full py-4 px-6 rounded-3xl font-bold text-white shadow-2xl flex items-center justify-between transition-transform hover:scale-[1.02] active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-extrabold">
                                    {cartCount}
                                </div>
                                <span className="font-extrabold text-lg">View Cart</span>
                            </div>
                            <span className="font-extrabold text-lg">{cartTotal} {cur}</span>
                        </button>
                    </div>
                )}

                {/* --- YOUR ORDER CART MODAL (Centered Dead Center) --- */}
                <AnimatePresence>
                    {isCartOpen && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 min-h-screen"
                            onClick={() => setIsCartOpen(false)}
                        >
                            <motion.div 
                                initial={{ scale: 0.92, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.92, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                onClick={e => e.stopPropagation()}
                                className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border flex flex-col max-h-[80vh] my-auto"
                                style={{ backgroundColor: bgCard, borderColor: borderColor }}
                            >
                                <div className="p-4 border-b flex justify-between items-center shrink-0" style={{ borderColor: borderColor }}>
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5" style={{ color: primaryColor }} />
                                        <h3 className="font-bold text-lg">Your Order Cart ({cartCount})</h3>
                                    </div>
                                    <button onClick={() => setIsCartOpen(false)} className="p-1 rounded-full hover:bg-slate-500/10">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-4 overflow-y-auto space-y-3 flex-1">
                                    {cart.map((cItem, i) => (
                                        <div key={i} className="p-3.5 rounded-2xl border flex justify-between items-start gap-3" style={{ borderColor: borderColor }}>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm truncate">{getItemName(cItem.item)}</h4>
                                                {cItem.sizeLabel && <p className="text-xs font-semibold text-sky-500 mt-0.5">{cItem.sizeLabel}</p>}
                                                {cItem.notes && <p className="text-xs opacity-70 italic mt-0.5 font-normal">"{cItem.notes}"</p>}
                                                <div className="font-extrabold text-sm mt-1.5" style={{ color: primaryColor }}>
                                                    {cItem.price * cItem.quantity} {cur}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex items-center border rounded-xl" style={{ borderColor: borderColor }}>
                                                    <button onClick={() => updateQty(cItem.id, cItem.notes, -1)} className="p-1.5"><Minus className="w-3.5 h-3.5" /></button>
                                                    <span className="px-2 font-bold text-xs">{cItem.quantity}</span>
                                                    <button onClick={() => updateQty(cItem.id, cItem.notes, 1)} className="p-1.5"><Plus className="w-3.5 h-3.5" /></button>
                                                </div>
                                                <button onClick={() => updateQty(cItem.id, cItem.notes, -cItem.quantity)} className="text-red-500 p-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 border-t space-y-3 shrink-0" style={{ borderColor: borderColor }}>
                                    <div className="flex justify-between items-center font-extrabold text-lg">
                                        <span>Total:</span>
                                        <span style={{ color: primaryColor }}>{cartTotal} {cur}</span>
                                    </div>
                                    <button
                                        onClick={() => { setIsCartOpen(false); setShowCheckout(true); }}
                                        className="w-full py-3.5 rounded-2xl font-bold text-white text-base shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <span>Checkout Order</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- CONTACT & DIRECT CALL MODAL --- */}
                <AnimatePresence>
                    {showContactModal && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 min-h-screen"
                            onClick={() => setShowContactModal(false)}
                        >
                            <motion.div 
                                initial={{ scale: 0.92, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.92, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                                className="w-full max-w-md rounded-3xl p-5 shadow-2xl border relative max-h-[80vh] overflow-y-auto my-auto"
                                style={{ backgroundColor: bgCard, borderColor: borderColor }}
                            >
                                <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: borderColor }}>
                                    <h3 className="font-bold text-base flex items-center gap-2">
                                        <Phone className="w-5 h-5" style={{ color: primaryColor }} />
                                        <span>Contact Us & Direct Call</span>
                                    </h3>
                                    <button onClick={() => setShowContactModal(false)} className="p-1 rounded-full hover:bg-slate-500/10">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Direct Phone Numbers */}
                                    {displayNumbers.length > 0 && (
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold uppercase tracking-wider block opacity-70">Direct Call Numbers</span>
                                            <div className="space-y-2">
                                                {displayNumbers.map((num: any, idx: number) => (
                                                    <a
                                                        key={idx}
                                                        href={`tel:${num.number}`}
                                                        className="flex items-center justify-between p-3.5 rounded-2xl border transition-colors hover:bg-slate-500/10"
                                                        style={{ borderColor: borderColor, backgroundColor: bgBody }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Phone className="w-4 h-4" style={{ color: primaryColor }} />
                                                            <div>
                                                                <div className="font-bold text-xs">{num.label || 'Phone Number'}</div>
                                                                <div className="text-xs font-semibold opacity-80" dir="ltr">{num.number}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-white px-3 py-1.5 rounded-xl shadow-sm" style={{ backgroundColor: primaryColor }}>
                                                            Call Now
                                                        </span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* WhatsApp Direct */}
                                    {config.whatsapp_number && (
                                        <a
                                            href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm shadow-md"
                                            style={{ backgroundColor: '#25D366' }}
                                        >
                                            <FaWhatsapp className="w-5 h-5" />
                                            <span>Chat on WhatsApp ({config.whatsapp_number})</span>
                                        </a>
                                    )}

                                    {/* Address & Google Maps */}
                                    {config.address && (
                                        <div className="p-3.5 rounded-2xl border flex items-start gap-3" style={{ borderColor: borderColor, backgroundColor: bgBody }}>
                                            <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                                            <div>
                                                <h4 className="font-bold text-xs uppercase opacity-70">Location Address</h4>
                                                <p className="text-xs font-semibold mt-0.5">{config.address}</p>
                                                {config.map_link && (
                                                    <a href={config.map_link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-sky-500 hover:underline mt-1 block">
                                                        Open in Google Maps →
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Working Hours */}
                                    {config.working_hours && (
                                        <div className="p-3.5 rounded-2xl border flex items-start gap-3" style={{ borderColor: borderColor, backgroundColor: bgBody }}>
                                            <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                                            <div>
                                                <h4 className="font-bold text-xs uppercase opacity-70">Opening Hours</h4>
                                                <p className="text-xs font-semibold whitespace-pre-line mt-0.5">{config.working_hours}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- PAYMENT METHODS MODAL (Centered) --- */}
                <AnimatePresence>
                    {showPaymentModal && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 min-h-screen"
                            onClick={() => setShowPaymentModal(false)}
                        >
                            <motion.div 
                                initial={{ scale: 0.92, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.92, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                                className="w-full max-w-md rounded-3xl p-5 shadow-2xl border relative max-h-[80vh] overflow-y-auto my-auto"
                                style={{ backgroundColor: bgCard, borderColor: borderColor }}
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-base flex items-center gap-2">
                                        <CreditCard className="w-5 h-5" style={{ color: primaryColor }} />
                                        <span>Payment Options</span>
                                    </h3>
                                    <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-full hover:bg-slate-500/10">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <p className="text-xs opacity-70 mb-4 font-normal">
                                    Please send a payment transfer receipt screenshot to our WhatsApp after payment.
                                </p>

                                <div className="space-y-3">
                                    {config.payment_methods?.map((pm: any, idx: number) => (
                                        <div key={idx} className="p-3.5 rounded-2xl border space-y-2" style={{ borderColor: borderColor, backgroundColor: bgBody }}>
                                            <h4 className="font-bold text-sm">{pm.name_en || pm.name_ar}</h4>
                                            {(pm.desc_en || pm.desc_ar) && <p className="text-xs opacity-70 font-normal">{pm.desc_en || pm.desc_ar}</p>}
                                            {pm.number && (
                                                <div className="flex justify-between items-center p-2 rounded-xl border bg-white dark:bg-black/40" style={{ borderColor: borderColor }}>
                                                    <span className="font-mono text-xs font-bold" dir="ltr">{pm.number}</span>
                                                    <button 
                                                        onClick={() => { navigator.clipboard.writeText(pm.number); alert('Number copied!'); }}
                                                        className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                                                        style={{ backgroundColor: primaryColor }}
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                            )}
                                            {pm.link && (
                                                <a href={pm.link} target="_blank" rel="noopener noreferrer" className="block text-center w-full text-white font-bold text-xs py-2 rounded-xl shadow-sm" style={{ backgroundColor: primaryColor }}>
                                                    InstaPay / Payment Link
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- CHECKOUT MODAL (Forced English) --- */}
                <CheckoutModal 
                    isOpen={showCheckout} 
                    onClose={() => setShowCheckout(false)} 
                    cartItems={cart.map(c => ({
                        id: c.id,
                        title: getItemName(c.item),
                        qty: c.quantity,
                        price: c.price,
                        size: c.sizeLabel,
                        category: c.catName,
                        notes: c.notes,
                        extras: []
                    }))}
                    subtotal={cartTotal}
                    restaurantId={restaurantId}
                    restaurantName={config.name}
                    whatsappNumber={config.whatsapp_number}
                    currency={cur} 
                    language="en"
                    orderChannel={config.order_channel}
                    onOrderSuccess={() => { setCart([]); setIsCartOpen(false); }}
                />
            </div>

            {/* Footer */}
            <ASNFooter show={config.show_asn_branding !== false} />
        </div>
    );
}
