'use client';

import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { getUsaDualColors } from '@/lib/usaDualVariants';
import { parseCurrency } from '@/lib/currency';
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2, X, Search, Share2, ArrowLeft, ArrowRight, LayoutList, Grid2X2, Square, Sun, Moon, ChevronRight, ChevronLeft, CreditCard, Globe } from 'lucide-react';
import ASNFooter from '@/components/menu/ASNFooter';
import UsaDualCheckoutModal from './UsaDualCheckoutModal';
import UsaDualLandingPage from './UsaDualLandingPage';
import SharedMarquee from './SharedMarquee';
import CustomerLeadPopup from './CustomerLeadPopup';
import { FaWhatsapp } from 'react-icons/fa';

type MenuItem = {
    id: string | number;
    title_ar: string;
    title_en?: string;
    description_ar?: string;
    description_en?: string;
    desc_ar?: string;
    desc_en?: string;
    image?: string;
    image_url?: string;
    prices: number[];
    size_labels?: string[];
    extras?: { id?: number | string; name_ar: string; name_en?: string; price: number }[];
    is_available?: boolean;
    is_popular?: boolean;
    [key: string]: any;
};

interface CategoryWithItemsType {
    id: string | number;
    name_ar: string;
    name_en?: string;
    items?: MenuItem[];
    image_url?: string;
    [key: string]: any;
}

interface RestaurantType {
    name: string;
    theme?: string;
    theme_colors?: {
        primary?: string;
        secondary?: string;
        background?: string;
        text?: string;
        [key: string]: any;
    };
    cover_images?: string[];
    marquee_enabled?: boolean;
    marquee_text_ar?: string;
    marquee_text_en?: string;
    orders_enabled?: boolean;
    order_channel?: 'whatsapp' | 'website' | 'both';
    show_asn_branding?: boolean;
    vicino_landing_enabled?: boolean;
    vicino_logo_url?: string;
    logo_url?: string;
    payment_methods?: any[];
    [key: string]: any;
}

interface ThemeUsaDualMenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
}

export default function ThemeUsaDualMenu({ config, categories, restaurantId }: ThemeUsaDualMenuProps) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [forcedMode, setForcedMode] = useState<'light' | 'dark' | null>(null);

    // Language switch state (EN / AR)
    const [lang, setLang] = useState<'en' | 'ar'>('en');
    const isAr = lang === 'ar';

    useEffect(() => setMounted(true), []);

    // Theme mode init
    useEffect(() => {
        if (config.default_theme_mode && config.default_theme_mode !== 'system') {
            setTheme(config.default_theme_mode);
        }
    }, [config.default_theme_mode, setTheme]);

    const isDark = forcedMode !== null 
        ? forcedMode === 'dark' 
        : (mounted && (resolvedTheme === 'dark' || theme === 'dark'));

    const toggleThemeMode = () => {
        const nextMode = isDark ? 'light' : 'dark';
        setForcedMode(nextMode);
        setTheme(nextMode);
    };

    const currency = parseCurrency(config?.currency, isAr);
    const { primaryColor, bgBody, bgCard, textMain, borderColor, hasBgImage, activeBgImage } = getUsaDualColors(config, isDark);

    // Determine Logo
    let parsedLogos = { light: config.vicino_logo_url, dark: config.vicino_logo_url };
    if (config.vicino_logo_url?.startsWith('{')) {
        try { parsedLogos = JSON.parse(config.vicino_logo_url); } catch {}
    }
    const currentLogo = isDark ? (parsedLogos.dark || parsedLogos.light) : (parsedLogos.light || parsedLogos.dark);
    const finalLogoSrc = currentLogo || config.logo_url;

    // State for Landing Page vs Main Menu
    const [showLanding, setShowLanding] = useState<boolean>(() => {
        return !!config.vicino_landing_enabled;
    });

    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Menu States
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid-2' | 'grid-1' | 'list'>('grid-2');

    // Modals & Cart State
    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; catName: string } | null>(null);
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [itemNotes, setItemNotes] = useState('');
    const [selectedExtras, setSelectedExtras] = useState<{ id: number | string; name: string; price: number }[]>([]);
    
    const [cart, setCart] = useState<{
        id: string;
        item: MenuItem;
        catName: string;
        price: number;
        sizeLabel: string;
        quantity: number;
        notes: string;
    }[]>([]);
    
    const [showCheckout, setShowCheckout] = useState(false);

    const [showLeadPopup, setShowLeadPopup] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        const isEnabled = config?.theme_colors?.customer_lead_collection_enabled ?? config?.theme_colors?.lead_popup_enabled ?? config?.customer_lead_collection_enabled ?? config?.lead_popup_enabled ?? false;
        if (!isEnabled) return false;
        const isCaptured = localStorage.getItem(`lead_captured_${config.id}`);
        return !isCaptured;
    });

    const categoryBtnRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const isManualClickRef = useRef(false);

    // Dynamic Bilingual Text Resolution
    const itemName = (item: MenuItem) => {
        if (isAr) return item.title_ar || item.title_en || 'صنف';
        return item.title_en || item.title_ar || 'Item';
    };

    const itemDesc = (item: MenuItem) => {
        if (isAr) return item.desc_ar || item.description_ar || item.details_ar || item.description || item.desc || item.desc_en || item.description_en || '';
        return item.desc_en || item.description_en || item.details_en || item.description || item.desc || item.desc_ar || item.description_ar || '';
    };

    const catName = (cat: CategoryWithItemsType) => {
        if (isAr) return cat.name_ar || cat.name_en || 'قسم';
        return cat.name_en || cat.name_ar || 'Category';
    };

    const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
    const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    // Auto-scroll & Category Spy with Horizontal Bar Synchronization
    useEffect(() => {
        const handleScroll = () => {
            if (searchQuery || isManualClickRef.current) return;
            const scrollPos = window.scrollY + 140;
            for (const cat of categories) {
                const el = document.getElementById(`category-${cat.id}`);
                if (el) {
                    const top = el.offsetTop;
                    const height = el.offsetHeight;
                    if (scrollPos >= top && scrollPos < top + height) {
                        const catIdStr = String(cat.id);
                        setActiveCategory(prev => {
                            if (prev !== catIdStr) {
                                const btn = categoryBtnRefs.current[catIdStr];
                                if (btn) {
                                    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                }
                                return catIdStr;
                            }
                            return prev;
                        });
                        break;
                    }
                }
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [categories, searchQuery]);

    const scrollToCategory = (catId: string) => {
        setActiveCategory(catId);
        isManualClickRef.current = true;
        
        if (catId === 'all') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const el = document.getElementById(`category-${catId}`);
            if (el) {
                const yOffset = -70;
                const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
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

    const openItemModal = (item: MenuItem, cName: string) => {
        if (config.orders_enabled === false) return;
        setSelectedItem({ item, catName: cName });
        setQty(1);
        setSizeIdx(0);
        setSelectedExtras([]);
        setItemNotes('');
        document.body.style.overflow = 'hidden';
    };

    const closeItemModal = () => {
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
            const existing = prev.find(c => c.id === cId && c.notes === itemNotes);
            if (existing) {
                return prev.map(c => c.id === cId && c.notes === itemNotes ? { ...c, quantity: c.quantity + qty } : c);
            }
            return [...prev, {
                id: cId,
                item: selectedItem.item,
                catName: selectedItem.catName,
                price: finalPrice,
                sizeLabel: sizeLbl,
                quantity: qty,
                notes: itemNotes
            }];
        });
        closeItemModal();
    };

    const updateCartQty = (id: string, notes: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id === id && c.notes === notes) {
                const nq = c.quantity + delta;
                return { ...c, quantity: nq };
            }
            return c;
        }).filter(c => c.quantity > 0));
    };

    const clearCart = () => {
        setCart([]);
    };

    const handleShare = async () => {
        const shareData = {
            title: config.name,
            text: isAr ? `تصفح قائمة طعام ${config.name}` : `Check out ${config.name}'s menu`,
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
            alert(isAr ? 'تم نسخ الرابط للحافظة!' : 'Link copied to clipboard!');
        }
    };

    // Flatten all items for count
    const allItems: (MenuItem & { catName: string })[] = categories.flatMap(c => (c.items || []).map(i => ({ ...i, catName: catName(c) })));

    const filteredCategories = categories.map(cat => ({
        ...cat,
        items: (cat.items || []).filter(item => itemName(item).toLowerCase().includes(searchQuery.toLowerCase()))
    })).filter(cat => (activeCategory === 'all' || String(cat.id) === activeCategory) && (cat.items && cat.items.length > 0));

    // Render Landing Page if toggled
    if (showLanding) {
        return <UsaDualLandingPage config={config} onContinue={() => setShowLanding(false)} />;
    }

    const subtitleText = isAr 
        ? (config.theme_colors?.usa_dual_subtitle_ar || config.usa_dual_subtitle_ar || "طعم أصيل ومذاق رفيع")
        : (config.theme_colors?.usa_dual_subtitle_en || config.usa_dual_subtitle_en || "Authentic Taste");

    return (
        <div 
            className="min-h-screen font-sans flex flex-col selection:bg-rose-500/20 transition-colors duration-300 relative" 
            dir={isAr ? 'rtl' : 'ltr'}
            style={{ 
                backgroundColor: hasBgImage ? 'transparent' : bgBody, 
                color: textMain,
                ...(hasBgImage ? {
                    backgroundImage: `url(${activeBgImage})`,
                    backgroundSize: 'cover',
                    backgroundAttachment: 'fixed',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                } : {})
            }}
        >
            
            {/* Announcement Marquee */}
            {config.marquee_enabled && (config.marquee_text_en || config.marquee_text_ar) && (
                <SharedMarquee
                    text={isAr ? (config.marquee_text_ar || config.marquee_text_en || '') : (config.marquee_text_en || config.marquee_text_ar || '')}
                    bgColor={primaryColor}
                    direction={isAr ? "rtl" : "ltr"}
                />
            )}

            {/* Static Top Header with Utility Icons */}
            <header className={`w-full border-b transition-colors shadow-md ${
                hasBgImage
                    ? 'bg-slate-950/40 backdrop-blur-md border-slate-800/40 text-white'
                    : isDark
                        ? 'bg-slate-950/95 border-slate-800/80 text-white'
                        : 'bg-white/95 border-slate-200 text-slate-900'
            }`}>
                <div className="max-w-5xl mx-auto px-4 py-3 space-y-4">
                    
                    {/* Top Row: Action & Utility Icons */}
                    <div className="flex items-center justify-between w-full gap-1.5 sm:gap-2 max-w-full overflow-x-auto no-scrollbar py-0.5">
                        
                        {/* Language Switcher & Home Icons */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            {/* Language Switch Toggle */}
                            <button
                                onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
                                className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-800/80 border border-slate-700/60 text-white font-extrabold text-xs transition-all shadow-sm flex items-center gap-1 hover:bg-slate-700 flex-shrink-0"
                                title="Switch Language"
                            >
                                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: primaryColor }} />
                                <span>{lang === 'en' ? 'عربي' : 'EN'}</span>
                            </button>

                            {config.vicino_landing_enabled && (
                                <button
                                    onClick={() => setShowLanding(true)}
                                    className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:text-white transition-colors flex-shrink-0 shadow-sm"
                                    title={isAr ? "الرئيسية" : "Home"}
                                >
                                    {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                                </button>
                            )}

                            <button
                                onClick={handleShare}
                                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0"
                                title={isAr ? "مشاركة" : "Share"}
                            >
                                <Share2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Right Icons (Payment Options, Light/Dark Toggle, Cart Button) */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            {config.payment_methods && config.payment_methods.length > 0 && (
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-800/80 border border-slate-700/60 text-amber-400 hover:text-amber-300 transition-all shadow-sm flex-shrink-0"
                                    title="Payment Methods"
                                >
                                    <CreditCard className="w-4 h-4" />
                                </button>
                            )}

                            <button
                                onClick={toggleThemeMode}
                                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0"
                                title="Light/Dark Mode"
                            >
                                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
                            </button>

                            {/* Dynamic Cart Button */}
                            {config.orders_enabled !== false && (
                                <button
                                    onClick={() => setIsCartDrawerOpen(true)}
                                    className="relative p-2 sm:p-2.5 px-3 sm:px-3.5 rounded-xl sm:rounded-2xl text-white font-bold transition-all shadow-md flex items-center gap-1.5 flex-shrink-0"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    {cartCount > 0 && (
                                        <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-white font-black" style={{ color: primaryColor }}>
                                            {cartCount}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Centered Brand Header */}
                    <div className="flex flex-col items-center text-center max-w-xl mx-auto pt-1 pb-2">
                        {finalLogoSrc && (
                            <div className="relative mb-3 group">
                                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 shadow-2xl flex items-center justify-center p-1 bg-transparent" style={{ borderColor: primaryColor }}>
                                    <OptimizedMenuImage src={finalLogoSrc} alt={config.name} className="w-full h-full object-contain rounded-full bg-transparent" useOriginal={true} />
                                </div>
                            </div>
                        )}

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-center">{config.name}</h1>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <span className="text-xs font-extrabold uppercase tracking-widest block leading-none" style={{ color: primaryColor }}>
                                {subtitleText}
                            </span>
                        </div>
                    </div>

                </div>
            </header>

            {/* Search Bar & View Mode Switcher */}
            <div className="max-w-5xl mx-auto w-full px-4 pt-4 pb-2 space-y-3">
                
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isAr ? 'ابحث عن أصناف الطعام...' : 'Search menu items...'}
                            className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-2xl border text-xs md:text-sm focus:outline-none transition-colors ${
                                isDark
                                    ? 'bg-slate-900/90 border-slate-700/80 text-slate-100 placeholder-slate-400'
                                    : 'bg-white/90 border-slate-300 text-slate-900 placeholder-slate-500 shadow-sm'
                            }`}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200`}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* View Switcher */}
                    <div className={`flex items-center border rounded-2xl p-1 gap-0.5 ${
                        isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white/90 border-slate-300 shadow-sm'
                    }`}>
                        <button
                            onClick={() => setViewMode('grid-2')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid-2' ? 'text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            style={viewMode === 'grid-2' ? { backgroundColor: primaryColor } : {}}
                            title="2-Column Grid"
                        >
                            <Grid2X2 className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setViewMode('grid-1')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid-1' ? 'text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            style={viewMode === 'grid-1' ? { backgroundColor: primaryColor } : {}}
                            title="1-Column Full"
                        >
                            <Square className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            style={viewMode === 'list' ? { backgroundColor: primaryColor } : {}}
                            title="List View"
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>

            {/* Sticky Categories Bar */}
            <div className={`sticky top-0 z-30 backdrop-blur-md border-b py-2.5 px-4 shadow-lg transition-colors ${
                isDark ? 'bg-slate-950/95 border-slate-800/80' : 'bg-white/95 border-slate-200/90'
            }`}>
                <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                        ref={el => { categoryBtnRefs.current['all'] = el; }}
                        onClick={() => scrollToCategory('all')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                            activeCategory === 'all'
                                ? 'text-white shadow-md scale-[1.03]'
                                : isDark 
                                    ? 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                        style={activeCategory === 'all' ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                    >
                        {isAr ? `كل الأقسام (${allItems.length})` : `All Categories (${allItems.length})`}
                    </button>

                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            ref={el => { categoryBtnRefs.current[String(cat.id)] = el; }}
                            onClick={() => scrollToCategory(String(cat.id))}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                activeCategory === String(cat.id)
                                    ? 'text-white shadow-md scale-[1.03]'
                                    : isDark
                                        ? 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                            style={activeCategory === String(cat.id) ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                        >
                            {catName(cat)} ({cat.items?.length || 0})
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Items Container */}
            <main className="max-w-5xl mx-auto w-full px-4 py-6 flex-1 space-y-12">

                {filteredCategories.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                            <Search className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-200">{isAr ? 'لم يتم العثور على أصناف' : 'No items found'}</h3>
                        <p className="text-xs text-slate-400">{isAr ? 'جرب البحث بكلمات أخرى أو اختر قسماً آخر' : 'Try searching for something else or browse categories above.'}</p>
                    </div>
                ) : (
                    filteredCategories.map(category => (
                        <section key={category.id} id={`category-${category.id}`} className="space-y-4 scroll-mt-24">
                            
                            {/* Category Header */}
                            <div className="flex items-center justify-start gap-3 border-b pb-3 border-slate-800/60">
                                <div className="w-1.5 h-8 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: primaryColor }} />
                                
                                {category.image_url && (
                                    <div className="w-11 h-11 rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 flex-shrink-0 shadow-md">
                                        <OptimizedMenuImage src={category.image_url} alt={catName(category)} className="w-full h-full object-cover" />
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <h2 className="font-black text-xl md:text-2xl tracking-tight leading-tight">
                                        {catName(category)}
                                    </h2>
                                    <p className="text-xs font-medium opacity-75 mt-0.5">
                                        {isAr ? `${category.items?.length || 0} صنف متوفر` : `${category.items?.length || 0} items available`}
                                    </p>
                                </div>
                            </div>

                            {/* Items Grid/List Renderer */}
                            <div className={
                                viewMode === 'grid-2'
                                    ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4'
                                    : viewMode === 'grid-1'
                                        ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                                        : 'space-y-3'
                            }>
                                {category.items?.map(item => {
                                    const minPrice = Math.min(...(item.prices || [0]));
                                    const maxPrice = Math.max(...(item.prices || [0]));
                                    const hasMultiplePrices = item.prices && item.prices.length > 1;

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => openItemModal(item, catName(category))}
                                            className={`group rounded-3xl border transition-all duration-300 hover:shadow-xl cursor-pointer overflow-hidden flex ${
                                                hasBgImage 
                                                    ? (isDark ? 'bg-slate-900/90 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md shadow-md')
                                                    : ''
                                            } ${
                                                viewMode === 'list'
                                                    ? 'flex-row items-center p-3 gap-3'
                                                    : 'flex-col justify-between'
                                            }`}
                                            style={{ 
                                                backgroundColor: hasBgImage ? undefined : bgCard, 
                                                borderColor 
                                            }}
                                        >
                                            {/* Item Image */}
                                            {item.image_url && (
                                                <div className={`relative overflow-hidden bg-slate-800 ${
                                                    viewMode === 'list'
                                                        ? 'w-20 h-20 rounded-2xl flex-shrink-0'
                                                        : viewMode === 'grid-2'
                                                            ? 'w-full h-36 md:h-48'
                                                            : 'w-full h-52'
                                                }`}>
                                                    <OptimizedMenuImage
                                                        src={item.image_url}
                                                        alt={itemName(item)}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                    {item.is_popular && (
                                                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-white font-extrabold text-[9px] uppercase tracking-wider shadow-md" style={{ backgroundColor: primaryColor }}>
                                                            {isAr ? 'الأكثر طلباً' : 'Popular'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Item Info */}
                                            <div className={`p-3.5 md:p-4 flex-1 flex flex-col justify-between ${viewMode === 'list' ? 'p-0' : ''}`}>
                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-sm md:text-base transition-colors line-clamp-1">
                                                        {itemName(item)}
                                                    </h3>

                                                    {itemDesc(item) && (
                                                        <p className="text-[11px] md:text-xs opacity-80 line-clamp-2 leading-relaxed">
                                                            {itemDesc(item)}
                                                        </p>
                                                    )}

                                                    {item.size_labels && item.size_labels.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {item.size_labels.map((lbl: string, idx: number) => {
                                                                if (!lbl) return null;
                                                                const p = item.prices?.[idx];
                                                                return (
                                                                    <span 
                                                                        key={idx} 
                                                                        className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border"
                                                                        style={{ borderColor, color: primaryColor, backgroundColor: `${primaryColor}12` }}
                                                                    >
                                                                        <span>{lbl}</span>
                                                                        {p !== undefined && p > 0 && (
                                                                            <span className="font-extrabold opacity-90">{p} {currency}</span>
                                                                        )}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {item.sell_by_weight && item.weight_unit && (
                                                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 mt-1 rounded-md border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                                            ⚖️ {item.weight_unit}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-700/40">
                                                    <div className="font-black text-sm md:text-base" style={{ color: primaryColor }}>
                                                        {hasMultiplePrices ? (
                                                            <span>{minPrice} - {maxPrice} {currency}</span>
                                                        ) : (
                                                            <span>{minPrice} {currency}</span>
                                                        )}
                                                    </div>

                                                    {config.orders_enabled !== false && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openItemModal(item, catName(category));
                                                            }}
                                                            className="p-2 px-3 rounded-2xl text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all hover:opacity-90"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            <span className="hidden sm:inline">{isAr ? 'إضافة' : 'Add'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>

                        </section>
                    ))
                )}

            </main>

            {/* Item Customization Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden my-8 ${
                                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                        >
                            {/* Modal Image */}
                            {selectedItem.item.image_url && (
                                <div className="relative w-full h-56 bg-slate-950">
                                    <OptimizedMenuImage src={selectedItem.item.image_url} alt={itemName(selectedItem.item)} className="w-full h-full object-cover" />
                                    <button
                                        onClick={closeItemModal}
                                        className="absolute top-4 left-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {!selectedItem.item.image_url && (
                                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700/40">
                                    <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{isAr ? 'تخصيص الطلب' : 'Item Customization'}</span>
                                    <button onClick={closeItemModal} className="opacity-70 hover:opacity-100">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                
                                {/* Centered Item Title & Description */}
                                <div className="text-center space-y-1.5 px-2">
                                    <h3 className="text-xl md:text-2xl font-extrabold text-center">{itemName(selectedItem.item)}</h3>
                                    {itemDesc(selectedItem.item) && (
                                        <p className="text-xs md:text-sm opacity-80 leading-relaxed text-center">{itemDesc(selectedItem.item)}</p>
                                    )}
                                </div>

                                {/* Sizes Selector */}
                                {selectedItem.item.prices && selectedItem.item.prices.length > 0 && (
                                    <div className="space-y-2 text-center">
                                        <label className="text-xs font-semibold uppercase tracking-wider block text-center opacity-70">
                                            {selectedItem.item.prices.length > 1 ? (isAr ? "اختر الحجم" : "Select Size") : (isAr ? "السعر" : "Price")}
                                        </label>

                                        {selectedItem.item.prices.length === 1 ? (
                                            <div className="flex justify-center">
                                                <button
                                                    type="button"
                                                    className="px-6 py-3 rounded-2xl text-white font-black text-sm shadow-md border flex items-center justify-center gap-2"
                                                    style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                                                >
                                                    {selectedItem.item.size_labels?.[0] && <span>{selectedItem.item.size_labels[0]}</span>}
                                                    <span>{selectedItem.item.prices[0]} {currency}</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                {selectedItem.item.size_labels?.map((lbl, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setSizeIdx(idx)}
                                                        className={`p-3 rounded-2xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                                                            sizeIdx === idx
                                                                ? 'text-white shadow-md scale-[1.02]'
                                                                : isDark
                                                                    ? 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                                                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                                        }`}
                                                        style={sizeIdx === idx ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                                                    >
                                                        <span>{lbl}</span>
                                                        <span className="font-extrabold" style={{ color: sizeIdx === idx ? '#fff' : primaryColor }}>{selectedItem.item.prices[idx]} {currency}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Extras Selector */}
                                {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider block text-center opacity-70">
                                            {isAr ? 'الإضافات المتاحة' : 'Optional Addons'}
                                        </label>
                                        <div className="space-y-2">
                                            {selectedItem.item.extras.map((ext, idx) => {
                                                const extName = isAr ? (ext.name_ar || ext.name_en || '') : (ext.name_en || ext.name_ar || '');
                                                const isSelected = selectedExtras.some(e => e.id === (ext.id || idx));

                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSelectedExtras(prev => prev.filter(e => e.id !== (ext.id || idx)));
                                                            } else {
                                                                setSelectedExtras(prev => [...prev, { id: ext.id || idx, name: extName, price: ext.price }]);
                                                            }
                                                        }}
                                                        className={`w-full p-3.5 rounded-2xl text-xs font-semibold border flex items-center justify-between transition-all ${
                                                            isSelected
                                                                ? 'bg-slate-800/80 shadow-sm'
                                                                : isDark
                                                                    ? 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                        style={isSelected ? { borderColor: primaryColor, color: primaryColor } : {}}
                                                    >
                                                        <span>{extName}</span>
                                                        <span className="font-bold">+{ext.price} {currency}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Special Instructions */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider block opacity-70">
                                        {isAr ? 'ملاحظات خاصة' : 'Special Instructions'}
                                    </label>
                                    <input
                                        type="text"
                                        value={itemNotes}
                                        onChange={(e) => setItemNotes(e.target.value)}
                                        placeholder={isAr ? 'مثال: بدون صوص، تسوية خاصة...' : 'e.g. No sauce, extra crispy...'}
                                        className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none ${
                                            isDark 
                                                ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-500'
                                                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                                        }`}
                                    />
                                </div>

                                {/* Quantity Adjuster & Total Price */}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-700/40">
                                    <div className={`flex items-center gap-3 border rounded-2xl p-1.5 ${
                                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                                    }`}>
                                        <button
                                            onClick={() => setQty(Math.max(1, qty - 1))}
                                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
                                            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="font-bold text-sm px-2">{qty}</span>
                                        <button
                                            onClick={() => setQty(qty + 1)}
                                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
                                            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[10px] uppercase block font-semibold opacity-70">{isAr ? 'الإجمالي' : 'Total Price'}</span>
                                        <span className="text-lg font-black" style={{ color: primaryColor }}>
                                            {(((selectedItem.item.prices[sizeIdx] || 0) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty).toFixed(2)} {currency}
                                        </span>
                                    </div>
                                </div>

                            </div>

                            {/* Add to Cart Footer */}
                            <div className="p-5 border-t border-slate-700/40 bg-slate-950/20">
                                <button
                                    onClick={addToCart}
                                    className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-90"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    <span>{isAr ? 'إضافة إلى سلة الطلبات' : 'Add to Order Cart'}</span>
                                </button>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Cart Drawer */}
            <AnimatePresence>
                {isCartDrawerOpen && (
                    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ x: isAr ? '-100%' : '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: isAr ? '-100%' : '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`w-full max-w-md border-l h-full flex flex-col justify-between shadow-2xl ${
                                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                        >
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-slate-700/40 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <ShoppingCart className="w-5 h-5" style={{ color: primaryColor }} />
                                    <h3 className="font-bold text-lg">{isAr ? 'سلة الطلبات' : 'Your Order Cart'}</h3>
                                    <span className="text-xs px-2 py-0.5 rounded-full text-white font-bold" style={{ backgroundColor: primaryColor }}>
                                        {cartCount}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsCartDrawerOpen(false)}
                                    className="p-2 rounded-xl opacity-70 hover:opacity-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Items List */}
                            <div className="p-5 flex-1 overflow-y-auto space-y-4">
                                {cart.length === 0 ? (
                                    <div className="text-center py-20 space-y-3 opacity-60">
                                        <ShoppingCart className="w-12 h-12 mx-auto stroke-[1.5]" />
                                        <p className="text-sm font-semibold">{isAr ? 'السلة فارغة حالياً' : 'Your cart is currently empty.'}</p>
                                        <p className="text-xs opacity-75">{isAr ? 'تصفح المنيو وأضف أصنافك المفضلة هنا!' : 'Explore our menu items and add them here!'}</p>
                                    </div>
                                ) : (
                                    cart.map(c => (
                                        <div key={c.id + c.notes} className={`p-4 rounded-2xl border space-y-3 ${
                                            isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h4 className="font-bold text-sm">{itemName(c.item)}</h4>
                                                    {c.sizeLabel && (
                                                        <span className="text-xs opacity-75 block">{c.sizeLabel}</span>
                                                    )}
                                                    {c.notes && (
                                                        <span className="text-xs italic block mt-1" style={{ color: primaryColor }}>{isAr ? `ملاحظة: "${c.notes}"` : `Note: "${c.notes}"`}</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => updateCartQty(c.id, c.notes, -c.quantity)}
                                                    className="opacity-60 hover:opacity-100 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
                                                <div className="flex items-center gap-2 rounded-xl p-1 border">
                                                    <button
                                                        onClick={() => updateCartQty(c.id, c.notes, -1)}
                                                        className="w-6 h-6 rounded-lg flex items-center justify-center font-bold"
                                                        style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="font-bold text-xs px-2">{c.quantity}</span>
                                                    <button
                                                        onClick={() => updateCartQty(c.id, c.notes, 1)}
                                                        className="w-6 h-6 rounded-lg flex items-center justify-center font-bold"
                                                        style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <span className="font-black text-sm" style={{ color: primaryColor }}>
                                                    {(c.price * c.quantity).toFixed(2)} {currency}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Drawer Footer */}
                            {cart.length > 0 && (
                                <div className="p-5 border-t border-slate-700/40 space-y-4">
                                    <div className="flex justify-between items-center text-base font-extrabold">
                                        <span>{isAr ? 'الإجمالي' : 'Subtotal'}</span>
                                        <span style={{ color: primaryColor }}>{cartTotal.toFixed(2)} {currency}</span>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <button
                                            onClick={clearCart}
                                            className="py-3 px-4 rounded-2xl border font-semibold text-xs transition-colors"
                                        >
                                            {isAr ? 'محي السلة' : 'Clear'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsCartDrawerOpen(false);
                                                setShowCheckout(true);
                                            }}
                                            className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-90"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <span>{isAr ? 'متابعة لإتمام الطلب' : 'Proceed to Checkout'}</span>
                                            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bottom Floating Cart Bar */}
            {config.orders_enabled !== false && cartCount > 0 && !isCartDrawerOpen && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        onClick={() => setIsCartDrawerOpen(true)}
                        className="text-white p-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer border border-white/20 transition-all hover:opacity-95"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center font-black text-sm shadow-sm" style={{ color: primaryColor }}>
                                {cartCount}
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[11px] uppercase font-extrabold tracking-wider opacity-90 leading-tight">{isAr ? 'عرض سلة الطلبات' : 'View Your Cart'}</span>
                                <span className="text-sm font-black leading-tight">{cartTotal.toFixed(2)} {currency}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors">
                            <span>{isAr ? 'إتمام الطلب' : 'Checkout'}</span>
                            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Bilingual Checkout Modal */}
            <UsaDualCheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                cartItems={cart.map(c => ({
                    id: c.id,
                    title: itemName(c.item),
                    qty: c.quantity,
                    price: c.price,
                    size: c.sizeLabel,
                    notes: c.notes
                }))}
                subtotal={cartTotal}
                restaurantId={restaurantId}
                restaurantName={config.name}
                whatsappNumber={config.whatsapp_number}
                currency={config.currency}
                orderChannel={config.order_channel}
                onOrderSuccess={() => {
                    setCart([]);
                }}
                branches={config.branches || []}
            />

            {/* Payment Options Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div 
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 min-h-screen"
                        onClick={() => setShowPaymentModal(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-800 bg-slate-900 text-slate-100 relative max-h-[80vh] overflow-y-auto my-auto"
                        >
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-base flex items-center gap-2" style={{ color: primaryColor }}>
                                    <CreditCard className="w-5 h-5" />
                                    <span>{isAr ? 'خيارات وطرق الدفع المتاحة' : 'Payment Options'}</span>
                                </h3>
                                <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-xs opacity-70 mb-3 font-normal text-slate-300">
                                {isAr ? 'يرجى إرسال صورة إيصال التحويل على الواتساب بعد إتمام عملية الدفع.' : 'Please send a payment transfer receipt screenshot to our WhatsApp after payment.'}
                            </p>

                            {config.whatsapp_number && (
                                <a
                                    href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}?text=${encodeURIComponent(isAr ? 'مرحباً، لقد قمت بإتمام التحويل. إليكم صورة الإيصال:' : 'Hello, I have completed the payment transfer. Here is my payment receipt screenshot:')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-xs sm:text-sm shadow-md mb-4 transition-transform active:scale-95 hover:opacity-90"
                                    style={{ backgroundColor: '#25D366' }}
                                >
                                    <FaWhatsapp className="w-5 h-5" />
                                    <span>{isAr ? 'إرسال الإيصال عبر الواتساب' : 'Send Receipt via WhatsApp'}</span>
                                </a>
                            )}

                            <div className="space-y-3">
                                {config.payment_methods?.map((pm: any, idx: number) => (
                                    <div key={idx} className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-2">
                                        <h4 className="font-bold text-sm text-slate-200">{isAr ? (pm.name_ar || pm.name_en) : (pm.name_en || pm.name_ar)}</h4>
                                        {(pm.desc_ar || pm.desc_en) && <p className="text-xs opacity-70 font-normal text-slate-400">{isAr ? (pm.desc_ar || pm.desc_en) : (pm.desc_en || pm.desc_ar)}</p>}
                                        {pm.number && (
                                            <div className="flex justify-between items-center p-2 rounded-xl border border-slate-800 bg-black/40">
                                                <span className="font-mono text-xs font-bold text-slate-200" dir="ltr">{pm.number}</span>
                                                <button 
                                                    onClick={() => { navigator.clipboard.writeText(pm.number); alert(isAr ? 'تم نسخ الرقم!' : 'Number copied!'); }}
                                                    className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm hover:opacity-90"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    {isAr ? 'نسخ' : 'Copy'}
                                                </button>
                                            </div>
                                        )}
                                        {pm.link && (
                                            <a href={pm.link} target="_blank" rel="noopener noreferrer" className="block text-center w-full text-white font-bold text-xs py-2 rounded-xl shadow-sm hover:opacity-90" style={{ backgroundColor: primaryColor }}>
                                                {isAr ? 'رابط الدفع المباشر / InstaPay' : 'InstaPay / Payment Link'}
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Customer Lead Capture Popup */}
            {showLeadPopup && (
                <CustomerLeadPopup 
                    config={config} 
                    isAr={isAr} 
                    isDark={isDark} 
                    primaryColor={primaryColor} 
                    bgBody={bgBody} 
                    textMain={textMain} 
                    textMuted={isDark ? '#94a3b8' : '#64748b'} 
                    onComplete={() => setShowLeadPopup(false)} 
                />
            )}

            {/* Footer */}
            {config.show_asn_branding !== false && (
                <ASNFooter />
            )}

        </div>
    );
}
