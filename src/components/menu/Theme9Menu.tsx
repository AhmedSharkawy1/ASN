'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, MapPin, Phone, List,
    Moon, Sun, ShoppingCart, Plus, Minus, Trash2, X,
    Home, UtensilsCrossed, User
} from 'lucide-react';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';

// Import necessary types directly from where they are defined, or define locally
type MenuItem = {
    id: string | number;
    title_ar: string;
    title_en?: string;
    description_ar?: string;
    description_en?: string;
    image?: string;
    prices: number[];
    size_labels?: string[];
    extras?: { id?: number | string; name_ar: string; name_en?: string; price: number }[];
    is_available?: boolean;
    [key: string]: any;
};

// ================= THEME 9 (DIABLO) CONSTANTS =================
// The main accent color from Diablo
const T9_RED = '#e74c3c';

interface CategoryWithItemsType {
    id: string | number;
    name_ar: string;
    name_en?: string;
    items?: MenuItem[];
    [key: string]: any;
}

interface RestaurantType {
    id: string | number;
    name_ar: string;
    name_en?: string;
    theme?: string;
    theme_colors?: {
        main_color?: string;
        bg_color?: string;
        text_color?: string;
    };
    [key: string]: any;
}

interface Theme9MenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
}

export default function Theme9Menu({ config, categories }: Theme9MenuProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const isAr = config.default_language === 'ar';
    const isDark = mounted && theme === 'dark';
    const cur = isAr ? 'ر.س' : 'SAR'; // Assuming SAR by default or config

    // Theme Variables
    const bgBody = isDark ? '#0f172a' : '#fafafa';
    const bgWhite = isDark ? '#1e293b' : '#ffffff';
    const textDark = isDark ? '#f8fafc' : '#333333';
    const textMuted = isDark ? '#94a3b8' : '#999999';
    const borderColor = isDark ? '#334155' : '#eeeeee';

    // State
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Drawers & Modals
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; catName: string } | null>(null);

    // Item Detail Modal
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [notes, setNotes] = useState('');
    const [selectedExtras, setSelectedExtras] = useState<{ id: number | string, name: string, price: number }[]>([]);

    const [cart, setCart] = useState<{ id: string, item: MenuItem, catName: string, price: number, sizeLabel: string, quantity: number, notes: string }[]>([]);

    // Category refs for scroll spy
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const catScrollRef = useRef<HTMLDivElement>(null);

    // Derived
    const filteredCategories = React.useMemo(() => {
        if (!searchQuery) return categories;
        const q = searchQuery.toLowerCase();
        return categories.map((c: any) => ({
            ...c,
            items: c.items?.filter((i: any) =>
                (i.title_ar || '').toLowerCase().includes(q) ||
                (i.title_en || '').toLowerCase().includes(q)
            ) || []
        })).filter((c: any) => c.items && c.items.length > 0);
    }, [categories, searchQuery]);

    const activeCatList = (activeCategory === 'all' || searchQuery)
        ? filteredCategories
        : filteredCategories.filter(c => c.id === activeCategory);

    const itemName = (item: MenuItem) => isAr ? item.title_ar : (item.title_en || item.title_ar);
    const catName = (cat: CategoryWithItemsType) => isAr ? cat.name_ar : (cat.name_en || cat.name_ar);

    // Sync scroll
    useEffect(() => {
        if (searchQuery || activeCategory !== 'all') return;
        const handleScroll = () => {
            const scrollPos = window.scrollY + 200;
            let currentSection = sectionRefs.current[0]?.id.replace('cat-', '') || 'all';
            for (const section of sectionRefs.current) {
                if (section && section.offsetTop <= scrollPos) {
                    currentSection = section.id.replace('cat-', '');
                }
            }
            // Auto scroll nav
            if (currentSection !== activeCategory) {
                setActiveCategory(currentSection);
                const activeTab = catScrollRef.current?.querySelector(`[data-cat="${currentSection}"]`);
                if (activeTab && catScrollRef.current) {
                    const navRect = catScrollRef.current.getBoundingClientRect();
                    const tabRect = activeTab.getBoundingClientRect();
                    if (tabRect.left < navRect.left || tabRect.right > navRect.right) {
                        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                }
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeCategory, searchQuery]);

    const scrollToSection = (id: string) => {
        setActiveCategory(id);
        if (id === 'all') {
            window.scrollTo({ top: 300, behavior: 'smooth' });
            return;
        }
        const el = document.getElementById(`cat-${id}`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    // Cart Logic
    const addToCart = () => {
        if (!selectedItem) return;
        const basePrice = selectedItem.item.prices[sizeIdx] || 0;
        const extrasTotal = selectedExtras.reduce((sum, ext) => sum + ext.price, 0);
        const finalPrice = basePrice + extrasTotal;
        const label = selectedItem.item.size_labels?.[sizeIdx] || '';

        let finalNotes = notes;
        if (selectedExtras.length > 0) {
            finalNotes += (finalNotes ? '\n' : '') + 'إضافات: ' + selectedExtras.map(e => e.name).join('، ');
        }

        const ci = {
            id: `${selectedItem.item.id}-${sizeIdx}-${selectedExtras.map(e => e.id).join('-')}`,
            item: selectedItem.item,
            catName: selectedItem.catName,
            price: finalPrice, sizeLabel: label, quantity: qty, notes: finalNotes,
        };
        setCart(prev => {
            const ex = prev.find(i => i.id === ci.id && i.notes === ci.notes);
            if (ex) return prev.map(i => i === ex ? { ...i, quantity: i.quantity + ci.quantity } : i);
            return [...prev, ci];
        });
        closeModal();
    };

    const addToCartDirect = (item: MenuItem, catNameStr: string) => {
        const price = item.prices[0] || 0;
        const label = item.size_labels?.[0] || '';
        const ci = {
            id: `${item.id}-0-`,
            item,
            catName: catNameStr,
            price, sizeLabel: label, quantity: 1, notes: '',
        };
        setCart(prev => {
            const ex = prev.find(i => i.id === ci.id && i.notes === '');
            if (ex) return prev.map(i => i === ex ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, ci];
        });
    };

    const closeModal = () => { setSelectedItem(null); setQty(1); setSizeIdx(0); setNotes(''); setSelectedExtras([]); };
    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
    const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const updateQty = (id: string, n: string, d: number) => {
        setCart(prev => prev.map(i => {
            if (i.id === id && i.notes === n) {
                const nq = i.quantity + d;
                return nq > 0 ? { ...i, quantity: nq } : i;
            }
            return i;
        }).filter(i => i.quantity > 0));
    };

    // Body style
    useEffect(() => {
        document.body.style.backgroundColor = bgBody;
        document.body.style.direction = isAr ? 'rtl' : 'ltr';
        return () => {
            document.body.style.backgroundColor = '';
            document.body.style.direction = '';
        };
    }, [bgBody, isAr]);

    return (
        <div className={`min-h-screen pb-24 font-cairo ${isDark ? 'dark' : ''}`} style={{ backgroundColor: bgBody, color: textDark }}>

            {/* ─── COVER BANNER ─── */}
            <div className="relative w-full h-[220px] md:h-[450px] overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                <img src={config.cover_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000'}
                    alt={config.name}
                    className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-6 md:p-12">
                    <div className="flex items-center gap-6 w-full max-w-6xl mx-auto">
                        <img src={config.logo_url} alt="Logo" className="w-20 h-20 md:w-32 md:h-32 rounded-full border-4 shadow-xl flex-shrink-0" style={{ borderColor: T9_RED }} />
                        <div>
                            <h1 className="text-white text-3xl md:text-5xl font-black drop-shadow-md mb-2 tracking-tight">
                                {config.name}
                            </h1>
                            <p className="text-white/90 text-sm md:text-lg font-medium drop-shadow-sm line-clamp-2 max-w-2xl">
                                {config.description}
                            </p>
                            {/* Desktop Socials */}
                            <div className="hidden md:flex gap-3 mt-4">
                                {config.social_links?.whatsapp && <a href={`https://wa.me/${config.social_links.whatsapp}`} className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white transition-colors"><FaWhatsapp className="w-5 h-5" /></a>}
                                {config.social_links?.instagram && <a href={`https://instagram.com/${config.social_links.instagram}`} className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white transition-colors"><FaInstagram className="w-5 h-5" /></a>}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Mobile Menu Bars Toggle */}
                <button onClick={() => setIsDrawerOpen(true)} className="absolute top-4 right-4 z-50 md:hidden bg-white/20 backdrop-blur-md p-2 rounded-full text-white shadow-lg">
                    <List className="w-6 h-6" />
                </button>
            </div>

            {/* ─── CATEGORY NAVIGATION (STICKY) ─── */}
            <nav className="sticky top-0 z-40 shadow-sm" style={{ background: bgWhite, borderBottom: `1px solid ${borderColor}` }}>
                <div className="max-w-6xl mx-auto flex items-center">
                    <div className="flex-1 overflow-x-auto flex items-center gap-2 px-4 py-2" style={{ scrollbarWidth: 'none' }} ref={catScrollRef}>
                        <button onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className="p-2 shrink-0 rounded-full transition-colors"
                            style={{ color: isSearchOpen ? T9_RED : textMuted, background: isSearchOpen ? (isDark ? 'rgba(231, 76, 60, 0.15)' : '#fceceb') : 'transparent' }}>
                            <Search className="w-5 h-5" />
                        </button>
                        <button data-cat="all" onClick={() => scrollToSection('all')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 whitespace-nowrap transition-all"
                            style={{
                                background: activeCategory === 'all' ? T9_RED : 'transparent',
                                color: activeCategory === 'all' ? '#fff' : textDark
                            }}>
                            {isAr ? 'الكل' : 'All'}
                        </button>
                        {categories.filter(c => c.items && c.items.length > 0).map(cat => {
                            const active = activeCategory === cat.id;
                            return (
                                <button key={cat.id} data-cat={cat.id} onClick={() => scrollToSection(cat.id)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 whitespace-nowrap transition-all"
                                    style={{
                                        background: active ? T9_RED : 'transparent',
                                        color: active ? '#fff' : textDark
                                    }}>
                                    {isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* ─── SEARCH SECTION ─── */}
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-b" style={{ background: bgWhite, borderColor }}>
                        <div className="max-w-6xl mx-auto p-4">
                            <div className="relative">
                                <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={isAr ? 'ابحث عن صنف...' : 'Search items...'}
                                    className="w-full py-3 pr-12 pl-4 rounded-full text-sm outline-none transition-colors border"
                                    style={{ background: bgBody, color: textDark, borderColor: searchQuery ? T9_RED : borderColor }} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── MAIN CONTENT ─── */}
            <main className="max-w-6xl mx-auto px-4 py-8 flex gap-8">

                {/* ITEMS GRID (Mobile: 2 cols, Desktop: 3-4 cols) */}
                <div className="flex-1 w-full min-w-0">
                    {searchQuery && filteredCategories.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <UtensilsCrossed className="w-16 h-16 mb-4" />
                            <p className="font-bold">{isAr ? 'لا يوجد نتائج' : 'No results found'}</p>
                        </div>
                    )}

                    {activeCatList.map((cat, catIdx) => (
                        <div key={cat.id} id={`cat-${cat.id}`} ref={el => { sectionRefs.current[catIdx] = el; }} className="mb-10 scroll-m-24">
                            {/* Category Header */}
                            <div className="flex items-center gap-3 mb-6 px-1">
                                <h2 className="text-xl md:text-2xl font-black flex items-center gap-2" style={{ color: T9_RED }}>
                                    {catName(cat)}
                                </h2>
                                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: bgWhite, color: textMuted, border: `1px solid ${borderColor}` }}>
                                    {cat.items?.length || 0}
                                </span>
                                <div className="flex-1 h-px" style={{ background: borderColor }} />
                            </div>

                            {/* Diablo Style Item Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                                {cat.items?.filter((i: any) => i.is_available !== false).map((item: any) => (
                                    <div key={item.id} onClick={() => setSelectedItem({ item, catName: catName(cat) })}
                                        className="relative rounded-[14px] md:rounded-[20px] overflow-hidden cursor-pointer group flex flex-col transition-all duration-300 transform hover:-translate-y-1"
                                        style={{ background: bgWhite, boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${borderColor}` }}>

                                        {/* Top Image Box */}
                                        <div className="w-full h-32 md:h-48 overflow-hidden bg-gray-100 relative">
                                            <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500'}
                                                alt={itemName(item)}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                            {/* Price Badge over image on mobile/small screens (optional) */}
                                            {item.calories && (
                                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-bold">
                                                    {item.calories} {isAr ? 'كالوري' : 'Cal'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Body */}
                                        <div className="p-3 md:p-5 flex-1 flex flex-col text-center">
                                            <h3 className="font-extrabold text-[13px] md:text-base mb-1 md:mb-2 line-clamp-1 leading-tight" style={{ color: textDark }}>
                                                {itemName(item)}
                                            </h3>
                                            {item.desc_ar && (
                                                <p className="text-[10px] md:text-xs line-clamp-2 md:line-clamp-3 mb-3 md:mb-4 min-h-[1.5rem] md:min-h-[2.5rem]" style={{ color: textMuted, lineHeight: 1.4 }}>
                                                    {isAr ? item.desc_ar : (item.desc_en || item.desc_ar)}
                                                </p>
                                            )}

                                            {/* Footer area */}
                                            <div className="mt-auto flex items-center justify-between w-full" dir={isAr ? 'rtl' : 'ltr'}>
                                                <button onClick={(e) => { e.stopPropagation(); addToCartDirect(item, catName(cat)); }}
                                                    className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl text-[11px] md:text-sm font-bold text-white transition-colors active:scale-95"
                                                    style={{ background: T9_RED }}>
                                                    {isAr ? 'عرض' : 'View'}
                                                </button>
                                                <span className="font-black text-[13px] md:text-[17px] tracking-tight" style={{ color: T9_RED }}>
                                                    {cur}{(item.prices[0]?.toFixed?.(0) || item.prices[0])}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Customer Review Notice (simulated from Diablo logic) */}
                    <div className="mt-12 text-center p-6 border-t" style={{ borderColor }}>
                        <h4 className="font-bold text-lg mb-2">{isAr ? 'شاركنا تقييمك' : 'Share your feedback'}</h4>
                        <button className="px-6 py-2 rounded-full font-bold text-sm text-white transition-transform hover:scale-105"
                            style={{ background: T9_RED }}>
                            {isAr ? 'تقييم المطعم' : 'Rate us'}
                        </button>
                    </div>

                    {/* Footer Inside Main Layout */}
                    <footer className="mt-8 text-center" style={{ color: textMuted }}>
                        <p className="text-sm font-bold">{config.name} © 2024</p>
                        <p className="text-xs mt-1">Powered by ASN</p>
                    </footer>
                </div>

                {/* SIDEBAR (Desktop Only) */}
                <div className="hidden lg:block w-[300px] shrink-0">
                    {/* About Card */}
                    <div className="rounded-2xl overflow-hidden shadow-sm mb-6 border" style={{ background: bgWhite, borderColor }}>
                        <div className="py-3 px-4 font-black text-center border-b" style={{ color: T9_RED, borderColor }}>
                            {isAr ? 'عن المطعم' : 'About us'}
                        </div>
                        <div className="p-4 space-y-3 text-sm" style={{ color: textDark }}>
                            {(config.social_links?.phone || config.phone) && (
                                <div className="flex gap-3">
                                    <Phone className="w-4 h-4 shrink-0 mt-0.5" style={{ color: T9_RED }} />
                                    <span>{config.social_links?.phone || config.phone}</span>
                                </div>
                            )}
                            {(config.social_links?.location_url || config.address) && (
                                <div className="flex gap-3">
                                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: T9_RED }} />
                                    <span className="line-clamp-2">{config.address || 'Location link'}</span>
                                </div>
                            )}
                            {config.time_open && (
                                <div className="flex gap-3">
                                    <List className="w-4 h-4 shrink-0 mt-0.5" style={{ color: T9_RED }} />
                                    <span>{config.time_open} - {config.time_close}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* ─── ITEM DETAIL MODAL ─── */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={closeModal}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="relative w-full max-w-[500px] max-h-[85vh] rounded-[24px] overflow-hidden flex flex-col shadow-2xl"
                            style={{ background: bgWhite }}
                            onClick={e => e.stopPropagation()}>

                            {/* Close Button */}
                            <button onClick={closeModal} className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition-colors">
                                <X className="w-5 h-5" />
                            </button>

                            {/* Image Box */}
                            <div className="w-full h-[250px] shrink-0 relative">
                                <img src={selectedItem.item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600'}
                                    alt={itemName(selectedItem.item)}
                                    className="w-full h-full object-cover" />
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-6 overflow-y-auto" style={{ color: textDark }}>
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-black mb-2 leading-tight">{itemName(selectedItem.item)}</h2>
                                    {selectedItem.item.desc_ar && (
                                        <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                                            {isAr ? selectedItem.item.desc_ar : (selectedItem.item.desc_en || selectedItem.item.desc_ar)}
                                        </p>
                                    )}
                                    <div className="text-2xl font-black mt-3" style={{ color: T9_RED }}>
                                        {cur}{(selectedItem.item.prices[sizeIdx] || 0)}
                                    </div>
                                </div>

                                {/* Size Options */}
                                {selectedItem.item.prices.length > 1 && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-bold mb-3 pb-2 border-b" style={{ borderColor, color: textDark }}>{isAr ? 'الحجم' : 'Size'}</h3>
                                        <div className="space-y-2">
                                            {selectedItem.item.prices.map((_p: number, idx: number) => {
                                                const label = selectedItem.item.size_labels?.[idx] || (isAr ? `حجم ${idx + 1}` : `Size ${idx + 1}`);
                                                return (
                                                    <label key={idx} className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors"
                                                        style={{ borderColor: sizeIdx === idx ? T9_RED : borderColor, background: sizeIdx === idx ? (isDark ? 'rgba(231,76,60,0.1)' : '#fceceb') : 'transparent' }}
                                                        onClick={() => setSizeIdx(idx)}>
                                                        <span className="font-bold flex items-center gap-2 text-sm">{label}</span>
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
                                        <div className="flex justify-between items-center mb-3 pb-2 border-b" style={{ borderColor }}>
                                            <span className="text-xs" style={{ color: textMuted }}>{isAr ? '(اختياري)' : '(Optional)'}</span>
                                            <h3 className="text-sm font-bold" style={{ color: textDark }}>{isAr ? 'الإضافات' : 'Extras'}</h3>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedItem.item.extras.map((ext: { id?: number | string, name_ar: string, name_en?: string, price: number }, idx: number) => {
                                                const isSel = selectedExtras.some(e => e.id === (ext.id || idx));
                                                return (
                                                    <label key={idx} className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors"
                                                        style={{ borderColor: isSel ? T9_RED : borderColor, background: isSel ? (isDark ? 'rgba(231,76,60,0.1)' : '#fceceb') : 'transparent' }}>
                                                        <span className="font-bold text-sm text-center w-20 shrink-0" style={{ color: T9_RED }}>
                                                            {ext.price > 0 ? `+${cur}${ext.price}` : 'مجاناً'}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-bold">{isAr ? ext.name_ar : (ext.name_en || ext.name_ar)}</span>
                                                            <div className="w-5 h-5 rounded border flex items-center justify-center"
                                                                style={{ borderColor: isSel ? T9_RED : textMuted, background: isSel ? T9_RED : 'transparent' }}>
                                                                {isSel && <X className="w-3 h-3 text-white rotate-45 transform" style={{ transform: 'rotate(0deg)' }} />}
                                                            </div>
                                                        </div>
                                                        <input type="checkbox" className="hidden" checked={isSel}
                                                            onChange={() => {
                                                                if (isSel) setSelectedExtras(p => p.filter(e => e.id !== (ext.id || idx)));
                                                                else setSelectedExtras(p => [...p, { id: ext.id || idx, name: isAr ? ext.name_ar : (ext.name_en || ext.name_ar), price: ext.price }]);
                                                            }} />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Note */}
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder={isAr ? 'ملاحظات خاصة...' : 'Special instructions...'}
                                    className="w-full rounded-xl p-3 outline-none resize-none h-24 text-sm border"
                                    style={{ background: bgBody, color: textDark, borderColor }} />

                                {/* Qty Row */}
                                <div className="flex items-center justify-center gap-6 my-6">
                                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center transition-colors hover:text-red-500 hover:border-red-500"
                                        style={{ borderColor, color: textDark }}>
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="text-3xl font-black min-w-[40px] text-center">{qty}</span>
                                    <button onClick={() => setQty(qty + 1)} className="w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center transition-colors hover:text-red-500 hover:border-red-500"
                                        style={{ borderColor, color: textDark }}>
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Add Button */}
                                <button onClick={addToCart} className="w-full py-4 rounded-xl text-white font-black text-lg transition-colors active:scale-95"
                                    style={{ background: T9_RED }}>
                                    {isAr ? 'أضف للسلة' : 'Add to Cart'} — {cur}{(((selectedItem.item.prices[sizeIdx] || 0) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty).toFixed?.(0)}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── CART SLIDE-IN DRAWER (Diablo style, slides from left in RTL) ─── */}
            <AnimatePresence>
                {isCartOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9991] bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsCartOpen(false)}>
                        <motion.div initial={{ x: isAr ? '-100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isAr ? '-100%' : '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} w-full max-w-[350px] h-full flex flex-col shadow-2xl`}
                            style={{ background: bgWhite }}
                            onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div className="p-5 text-white flex justify-between items-center font-bold text-lg shadow-md z-10" style={{ background: T9_RED }}>
                                <span>{isAr ? 'عربة التسوق' : 'Shopping Cart'} ({cartCount})</span>
                                <button onClick={() => setIsCartOpen(false)}><X className="w-6 h-6" /></button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-5 pb-24">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: textMuted }}>
                                        <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
                                        <p className="font-bold text-lg">{isAr ? 'السلة فارغة' : 'Cart is empty'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cart.map((c, i) => (
                                            <div key={i} className="flex gap-3 pb-4 border-b relative" style={{ borderColor }}>
                                                <img src={c.item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200'}
                                                    alt={itemName(c.item)} className="w-16 h-16 rounded-xl object-cover shrink-0 border" style={{ borderColor }} />
                                                <div className="flex-1 min-w-0 flex flex-col">
                                                    <h4 className="font-bold text-sm mb-1 line-clamp-1" style={{ color: textDark }}>{itemName(c.item)}</h4>
                                                    {(c.sizeLabel || c.notes) && (
                                                        <p className="text-[11px] mb-2 line-clamp-2 leading-tight" style={{ color: textMuted }}>
                                                            {c.sizeLabel && <span>{c.sizeLabel} </span>}
                                                            {c.notes && <span>{c.notes}</span>}
                                                        </p>
                                                    )}
                                                    <div className="mt-auto flex justify-between items-center w-full" dir={isAr ? 'rtl' : 'ltr'}>
                                                        {/* Qty Controls */}
                                                        <div className="flex items-center gap-3">
                                                            <button onClick={() => updateQty(c.id, c.notes, 1)} className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold border hover:bg-red-50 hover:text-red-500 hover:border-red-500" style={{ borderColor, color: textDark }}><Plus className="w-3 h-3" /></button>
                                                            <span className="font-bold text-sm" style={{ color: textDark }}>{c.quantity}</span>
                                                            <button onClick={() => updateQty(c.id, c.notes, -1)} className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold border hover:bg-red-50 hover:text-red-500 hover:border-red-500" style={{ borderColor, color: textDark }}><Minus className="w-3 h-3" /></button>
                                                        </div>
                                                        {/* Price */}
                                                        <span className="font-black text-sm" style={{ color: T9_RED }}>{cur}{(c.price * c.quantity).toFixed?.(0)}</span>
                                                    </div>
                                                </div>
                                                {/* Remove */}
                                                <button onClick={() => updateQty(c.id, c.notes, -c.quantity)} className="absolute top-0 left-0 p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {cart.length > 0 && (
                                <div className="absolute bottom-0 w-full p-5 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] border-t" style={{ background: bgBody, borderColor }}>
                                    <div className="flex justify-between items-center mb-4 text-sm font-black" style={{ color: textDark }}>
                                        <span>{isAr ? 'المجموع' : 'Total'}</span>
                                        <span className="text-xl" style={{ color: T9_RED }}>{cur}{cartTotal.toFixed?.(0)}</span>
                                    </div>
                                    <button className="w-full py-4 rounded-xl text-white font-black text-lg transition-colors active:scale-95"
                                        style={{ background: T9_RED }}>
                                        {isAr ? 'الدفع' : 'Checkout'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── MOBILE DRAWER (Slides from right in RTL) ─── */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm md:hidden"
                        onClick={() => setIsDrawerOpen(false)}>
                        <motion.div initial={{ x: isAr ? '100%' : '-100%' }} animate={{ x: 0 }} exit={{ x: isAr ? '100%' : '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`absolute top-0 ${isAr ? 'right-0' : 'left-0'} w-[85%] max-w-[320px] h-full flex flex-col shadow-2xl`}
                            style={{ background: bgWhite }}
                            onClick={e => e.stopPropagation()}>

                            {/* Drawer Header (Red with overlapping logo) */}
                            <div className="pt-10 pb-8 px-5 flex flex-col items-center relative text-center text-white" style={{ background: T9_RED }}>
                                <button onClick={() => setIsDrawerOpen(false)} className="absolute top-4 left-4 p-1 opacity-80 hover:opacity-100"><X className="w-6 h-6" /></button>
                                <div className="w-20 h-20 bg-white rounded-full p-1 shadow-lg mb-3">
                                    <img src={config.logo_url} alt="Logo" className="w-full h-full object-cover rounded-full" />
                                </div>
                                <h3 className="font-black text-lg drop-shadow-md">{config.name}</h3>
                            </div>

                            {/* Links */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
                                {[
                                    { label: isAr ? 'الرئيسية' : 'Home', icon: <Home className="w-5 h-5" />, action: () => { window.scrollTo(0, 0); setIsDrawerOpen(false); } },
                                    { label: isAr ? 'المنيو' : 'Menu', icon: <UtensilsCrossed className="w-5 h-5" />, action: () => { document.querySelector('nav')?.scrollIntoView(); setIsDrawerOpen(false); } },
                                    { label: isAr ? 'تسجيل الدخول' : 'Login', icon: <User className="w-5 h-5" />, action: () => { } },
                                    {
                                        label: isDark ? (isAr ? 'الوضع الفاتح' : 'Light Mode') : (isAr ? 'الوضع الداكن' : 'Dark Mode'),
                                        icon: isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />,
                                        action: () => setTheme(isDark ? 'light' : 'dark')
                                    }
                                ].map((lnk, i) => (
                                    <button key={i} onClick={lnk.action}
                                        className="w-full flex items-center gap-4 py-4 border-b transition-colors font-bold text-sm"
                                        style={{ borderColor, color: textDark }}>
                                        <div style={{ color: T9_RED }}>{lnk.icon}</div>
                                        <span>{lnk.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── FLOATING CART FAB ─── */}
            <button onClick={() => setIsCartOpen(true)}
                className={`fixed bottom-6 left-6 z-[80] w-14 h-14 rounded-full flex flex-col items-center justify-center text-white shadow-[0_4px_20px_rgba(231,76,60,0.4)] transition-transform duration-300 hover:scale-110 active:scale-95 ${cartCount > 0 ? 'scale-100' : 'scale-0'}`}
                style={{ background: T9_RED }}>
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-yellow-400 text-black font-black text-[11px] flex items-center justify-center border-2 border-white">
                    {cartCount}
                </span>
            </button>

        </div>
    );
}
