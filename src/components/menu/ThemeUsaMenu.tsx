'use client';

import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { getUsaColors } from '@/lib/usaVariants';
import { parseCurrency } from '@/lib/currency';
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2, X, Search, Share2, ArrowLeft, LayoutList, Grid2X2, Square, Sun, Moon, ChevronRight } from 'lucide-react';
import ASNFooter from '@/components/menu/ASNFooter';
import UsaCheckoutModal from './UsaCheckoutModal';
import UsaLandingPage from './UsaLandingPage';
import SharedMarquee from './SharedMarquee';

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
    [key: string]: any;
}

interface ThemeUsaMenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
}

export default function ThemeUsaMenu({ config, categories, restaurantId }: ThemeUsaMenuProps) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Theme mode init
    useEffect(() => {
        if (config.default_theme_mode && config.default_theme_mode !== 'system') {
            setTheme(config.default_theme_mode);
        }
    }, [config.default_theme_mode, setTheme]);

    const isDark = mounted && resolvedTheme === 'dark';
    const currency = parseCurrency(config?.currency, false);
    const { primaryColor, bgBody, bgCard, textMain, borderColor } = getUsaColors(config, isDark);

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

    // Menu States
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    // viewMode: 'grid-2' (2 items per row), 'grid-1' (1 item full width), 'list' (compact row)
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

    // Helper functions for English text
    const itemName = (item: MenuItem) => item.title_en || item.title_ar || 'Item';
    const itemDesc = (item: MenuItem) => item.desc_en || item.description_en || item.desc_ar || item.description_ar || '';
    const catName = (cat: CategoryWithItemsType) => cat.name_en || cat.name_ar || 'Category';

    const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
    const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    // Auto-scroll & Category Spy
    useEffect(() => {
        const handleScroll = () => {
            if (searchQuery || activeCategory === 'all') return;
            const scrollPos = window.scrollY + 100;
            for (const cat of categories) {
                const el = document.getElementById(`category-${cat.id}`);
                if (el) {
                    const top = el.offsetTop;
                    const height = el.offsetHeight;
                    if (scrollPos >= top && scrollPos < top + height) {
                        setActiveCategory(String(cat.id));
                        break;
                    }
                }
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [categories, searchQuery, activeCategory]);

    const scrollToCategory = (catId: string) => {
        setActiveCategory(catId);
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
            alert('Link copied to clipboard!');
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
        return <UsaLandingPage config={config} onContinue={() => setShowLanding(false)} />;
    }

    return (
        <div className="min-h-screen font-sans flex flex-col ltr text-left selection:bg-rose-500/20" style={{ backgroundColor: bgBody, color: textMain }}>
            
            {/* Announcement Marquee */}
            {config.marquee_enabled && (config.marquee_text_en || config.marquee_text_ar) && (
                <SharedMarquee
                    text={config.marquee_text_en || config.marquee_text_ar || ''}
                    bgColor={primaryColor}
                />
            )}

            {/* Static Top Header (Not Sticky) */}
            <header className="w-full bg-slate-950/90 border-b border-slate-800/80">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    
                    {/* Left: Back, Logo & Title */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {config.vicino_landing_enabled && (
                            <button
                                onClick={() => setShowLanding(true)}
                                className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white transition-colors flex-shrink-0"
                                title="Back to Home"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}

                        {/* Logo Image */}
                        {finalLogoSrc && (
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700/60 bg-white p-0.5 flex-shrink-0 shadow-sm">
                                <OptimizedMenuImage src={finalLogoSrc} alt="Logo" className="w-full h-full object-contain" useOriginal={true} />
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            <h1 className="font-extrabold text-base md:text-lg text-slate-100 leading-tight truncate">{config.name}</h1>
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block leading-none">USA Theme Menu</span>
                        </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            onClick={handleShare}
                            className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
                            title="Share"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
                            title="Toggle Mode"
                        >
                            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                        </button>

                        {/* Cart Button */}
                        {config.orders_enabled !== false && (
                            <button
                                onClick={() => setIsCartDrawerOpen(true)}
                                className="relative p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md flex items-center gap-1.5"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                {cartCount > 0 && (
                                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-white text-rose-600 font-black">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                </div>
            </header>

            {/* Search Bar & View Mode Switcher */}
            <div className="max-w-5xl mx-auto w-full px-4 pt-4 pb-2 space-y-3">
                
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search menu items..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500 text-xs md:text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* View Switcher: 2-Cols, 1-Col, List */}
                    <div className="flex items-center bg-slate-800/70 border border-slate-700/60 rounded-2xl p-1 gap-0.5">
                        <button
                            onClick={() => setViewMode('grid-2')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid-2' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            title="2-Column Grid (Compact)"
                        >
                            <Grid2X2 className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setViewMode('grid-1')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid-1' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            title="1-Column Cards (Full)"
                        >
                            <Square className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            title="List View"
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>

            {/* ONLY Categories Bar is Sticky */}
            <div className="sticky top-0 z-30 backdrop-blur-md bg-slate-950/95 border-b border-slate-800 py-2.5 px-4 shadow-lg">
                <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => scrollToCategory('all')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                            activeCategory === 'all'
                                ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                                : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                        }`}
                    >
                        All Categories ({allItems.length})
                    </button>

                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => scrollToCategory(String(cat.id))}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                activeCategory === String(cat.id)
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                                    : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                            }`}
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
                        <h3 className="font-bold text-lg text-slate-200">No items found</h3>
                        <p className="text-xs text-slate-400">Try searching for something else or browse categories above.</p>
                    </div>
                ) : (
                    filteredCategories.map(category => (
                        <section key={category.id} id={`category-${category.id}`} className="space-y-4 scroll-mt-24">
                            
                            {/* Left-Aligned Category Header */}
                            <div className="flex items-center gap-3 border-b pb-3 border-slate-800/80 text-left">
                                {category.image_url && (
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
                                        <OptimizedMenuImage src={category.image_url} alt={catName(category)} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="text-left">
                                    <h2 className="font-extrabold text-xl text-slate-100 tracking-tight text-left">{catName(category)}</h2>
                                    <p className="text-xs text-slate-400 text-left">{category.items?.length || 0} delicious items available</p>
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
                                                viewMode === 'list'
                                                    ? 'flex-row items-center p-3 gap-3'
                                                    : 'flex-col justify-between'
                                            }`}
                                            style={{ backgroundColor: bgCard, borderColor }}
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
                                                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] uppercase tracking-wider shadow-md">
                                                            Popular
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Item Info */}
                                            <div className={`p-3.5 md:p-4 flex-1 flex flex-col justify-between ${viewMode === 'list' ? 'p-0' : ''}`}>
                                                <div className="space-y-1 text-left">
                                                    <h3 className="font-bold text-sm md:text-base text-slate-100 group-hover:text-rose-400 transition-colors line-clamp-1 text-left">
                                                        {itemName(item)}
                                                    </h3>

                                                    {itemDesc(item) && (
                                                        <p className="text-[11px] md:text-xs text-slate-400 line-clamp-2 leading-relaxed text-left">
                                                            {itemDesc(item)}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800/60">
                                                    <div className="font-black text-rose-400 text-sm md:text-base">
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
                                                            className="p-2 px-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            <span className="hidden sm:inline">Add</span>
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
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto ltr text-left">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden my-8"
                        >
                            {/* Modal Image */}
                            {selectedItem.item.image_url && (
                                <div className="relative w-full h-56 bg-slate-950">
                                    <OptimizedMenuImage src={selectedItem.item.image_url} alt={itemName(selectedItem.item)} className="w-full h-full object-cover" />
                                    <button
                                        onClick={closeItemModal}
                                        className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {!selectedItem.item.image_url && (
                                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Item Customization</span>
                                    <button onClick={closeItemModal} className="text-slate-400 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                
                                {/* Centered Item Title & Description */}
                                <div className="text-center space-y-1.5 px-2">
                                    <h3 className="text-xl md:text-2xl font-extrabold text-slate-100 text-center">{itemName(selectedItem.item)}</h3>
                                    {itemDesc(selectedItem.item) && (
                                        <p className="text-xs md:text-sm text-slate-400 leading-relaxed text-center">{itemDesc(selectedItem.item)}</p>
                                    )}
                                </div>

                                {/* Sizes Selector */}
                                {selectedItem.item.prices && selectedItem.item.prices.length > 0 && (
                                    <div className="space-y-2 text-center">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block text-center">
                                            {selectedItem.item.prices.length > 1 ? "Select Size" : "Price"}
                                        </label>

                                        {selectedItem.item.prices.length === 1 ? (
                                            /* Single Size / Price Centered */
                                            <div className="flex justify-center">
                                                <button
                                                    type="button"
                                                    className="px-6 py-3 rounded-2xl bg-rose-600 text-white font-black text-sm shadow-md border border-rose-500 flex items-center justify-center gap-2"
                                                >
                                                    {selectedItem.item.size_labels?.[0] && <span>{selectedItem.item.size_labels[0]}</span>}
                                                    <span>{selectedItem.item.prices[0]} {currency}</span>
                                                </button>
                                            </div>
                                        ) : (
                                            /* Multiple Sizes Grid */
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                {selectedItem.item.size_labels?.map((lbl, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setSizeIdx(idx)}
                                                        className={`p-3 rounded-2xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                                                            sizeIdx === idx
                                                                ? 'bg-rose-600 text-white border-rose-500 shadow-md scale-[1.02]'
                                                                : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        <span>{lbl}</span>
                                                        <span className="text-rose-300 font-extrabold">{selectedItem.item.prices[idx]} {currency}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Extras / Addons Selector */}
                                {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block text-center">
                                            Optional Addons
                                        </label>
                                        <div className="space-y-2">
                                            {selectedItem.item.extras.map((ext, idx) => {
                                                const extName = ext.name_en || ext.name_ar;
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
                                                                ? 'bg-rose-600/10 border-rose-500 text-rose-300'
                                                                : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                                                        }`}
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
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                                        Special Instructions
                                    </label>
                                    <input
                                        type="text"
                                        value={itemNotes}
                                        onChange={(e) => setItemNotes(e.target.value)}
                                        placeholder="e.g. No sauce, extra crispy..."
                                        className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm"
                                    />
                                </div>

                                {/* Quantity Adjuster & Total Price */}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                    <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-2xl p-1.5">
                                        <button
                                            onClick={() => setQty(Math.max(1, qty - 1))}
                                            className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-slate-200 hover:bg-slate-600"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="font-bold text-sm px-2 text-slate-100">{qty}</span>
                                        <button
                                            onClick={() => setQty(qty + 1)}
                                            className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-slate-200 hover:bg-slate-600"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[10px] uppercase text-slate-400 block font-semibold">Total Price</span>
                                        <span className="text-lg font-black text-rose-400">
                                            {(((selectedItem.item.prices[sizeIdx] || 0) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty).toFixed(2)} {currency}
                                        </span>
                                    </div>
                                </div>

                            </div>

                            {/* Add to Cart Footer */}
                            <div className="p-5 border-t border-slate-800 bg-slate-950/80">
                                <button
                                    onClick={addToCart}
                                    className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    <span>Add to Order Cart</span>
                                </button>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Cart Drawer */}
            <AnimatePresence>
                {isCartDrawerOpen && (
                    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/70 backdrop-blur-sm ltr text-left">
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between text-slate-100 shadow-2xl"
                        >
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                                <div className="flex items-center gap-2.5">
                                    <ShoppingCart className="w-5 h-5 text-rose-500" />
                                    <h3 className="font-bold text-lg">Your Order Cart</h3>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                                        {cartCount}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsCartDrawerOpen(false)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Items List */}
                            <div className="p-5 flex-1 overflow-y-auto space-y-4">
                                {cart.length === 0 ? (
                                    <div className="text-center py-20 space-y-3 text-slate-400">
                                        <ShoppingCart className="w-12 h-12 mx-auto text-slate-600 stroke-[1.5]" />
                                        <p className="text-sm font-semibold">Your cart is currently empty.</p>
                                        <p className="text-xs text-slate-500">Explore our delicious menu items and add them here!</p>
                                    </div>
                                ) : (
                                    cart.map(c => (
                                        <div key={c.id + c.notes} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-100">{itemName(c.item)}</h4>
                                                    {c.sizeLabel && (
                                                        <span className="text-xs text-slate-400 block">{c.sizeLabel}</span>
                                                    )}
                                                    {c.notes && (
                                                        <span className="text-xs text-rose-300 italic block mt-1">Note: "{c.notes}"</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => updateCartQty(c.id, c.notes, -c.quantity)}
                                                    className="text-slate-500 hover:text-rose-400 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                                <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-1 border border-slate-700">
                                                    <button
                                                        onClick={() => updateCartQty(c.id, c.notes, -1)}
                                                        className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="font-bold text-xs px-2">{c.quantity}</span>
                                                    <button
                                                        onClick={() => updateCartQty(c.id, c.notes, 1)}
                                                        className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <span className="font-black text-rose-400 text-sm">
                                                    {(c.price * c.quantity).toFixed(2)} {currency}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Drawer Footer */}
                            {cart.length > 0 && (
                                <div className="p-5 border-t border-slate-800 bg-slate-950/80 space-y-4">
                                    <div className="flex justify-between items-center text-base font-extrabold">
                                        <span>Subtotal</span>
                                        <span className="text-rose-400">{cartTotal.toFixed(2)} {currency}</span>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <button
                                            onClick={clearCart}
                                            className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsCartDrawerOpen(false);
                                                setShowCheckout(true);
                                            }}
                                            className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span>Proceed to Checkout</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Clean Bottom Floating Cart Bar */}
            {config.orders_enabled !== false && cartCount > 0 && !isCartDrawerOpen && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        onClick={() => setIsCartDrawerOpen(true)}
                        className="bg-rose-600 hover:bg-rose-500 text-white p-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer border border-rose-400/30 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white text-rose-600 flex items-center justify-center font-black text-sm shadow-sm">
                                {cartCount}
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[11px] uppercase font-extrabold tracking-wider opacity-90 leading-tight">View Your Cart</span>
                                <span className="text-sm font-black leading-tight">{cartTotal.toFixed(2)} {currency}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors">
                            <span>Checkout</span>
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Dedicated English Checkout Modal */}
            <UsaCheckoutModal
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

            {/* Footer */}
            {config.show_asn_branding !== false && (
                <ASNFooter />
            )}

        </div>
    );
}
