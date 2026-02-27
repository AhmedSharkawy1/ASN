"use client";
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, MapPin, Phone, Bell, List, ChevronDown, Rocket, LogIn,
    Moon, Sun, ShoppingCart, Plus, Minus, Trash2, X,
    ChevronUp, Home, UtensilsCrossed, Settings
} from 'lucide-react';
import { FaWhatsapp, FaFacebook, FaTiktok, FaInstagram } from 'react-icons/fa';

/* ───── THEME 8 CONSTANTS ───── */
const T8_ORANGE = '#f97316';
const T8_DARK_BG = '#1a2332';
const T8_DARK_CARD = '#243447';
const T8_DARK_BORDER = '#2d3f52';

export default function Theme8Menu({ config, categories }: { config: any; categories: any[] }) {
    const { setTheme } = useTheme();
    const isAr = (config.language || 'ar') === 'ar';
    const cur = config.currency || 'ج.م';

    /* ─── STATE ─── */
    const [activeCategory, setActiveCategory] = useState('all');
    const [cart, setCart] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<{ item: any; catName: string } | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [activeBottomNav, setActiveBottomNav] = useState('home');

    // item modal
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [notes, setNotes] = useState('');
    const [selectedExtras, setSelectedExtras] = useState<any[]>([]);

    // checkout
    const [cust, setCust] = useState({ name: '', phone: '', address: '' });

    const catScrollRef = useRef<HTMLDivElement>(null);

    /* ─── PERSIST CART ─── */
    useEffect(() => {
        try { const s = localStorage.getItem(`cart8_${config.id}`); if (s) setCart(JSON.parse(s)); } catch { /* noop */ }
    }, [config.id]);
    useEffect(() => {
        localStorage.setItem(`cart8_${config.id}`, JSON.stringify(cart));
    }, [cart, config.id]);

    /* ─── SCROLL TOP BUTTON ─── */
    useEffect(() => {
        const fn = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);

    /* ─── HELPERS ─── */
    const itemName = (item: any) => isAr ? item.title_ar : (item.title_en || item.title_ar);

    const filteredCategories = React.useMemo(() => {
        if (activeCategory === 'all') return categories;
        return categories.filter(c => c.id === activeCategory);
    }, [categories, activeCategory]);

    const mostOrderedItems = React.useMemo(() => {
        const all = categories.flatMap(c => c.items || []).filter(i => i.is_available !== false);
        return all.slice(0, 3);
    }, [categories]);

    const searchFilteredCategories = React.useMemo(() => {
        if (!searchQuery.trim()) return filteredCategories;
        const q = searchQuery.toLowerCase();
        return filteredCategories.map(c => ({
            ...c,
            items: c.items.filter((item: any) =>
                item.title_ar?.toLowerCase().includes(q) ||
                item.title_en?.toLowerCase().includes(q) ||
                item.desc_ar?.toLowerCase().includes(q)
            ),
        })).filter(c => c.items.length > 0);
    }, [filteredCategories, searchQuery]);

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

    const addToCartDirect = (item: any, catName: string) => {
        const price = item.prices[0] || 0;
        const label = item.size_labels?.[0] || '';
        const ci = {
            id: `${item.id}-0-`,
            item,
            catName,
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
        setCart(p => p.map(c => (c.id === id && c.notes === n) ? { ...c, quantity: Math.max(0, c.quantity + d) } : c).filter(c => c.quantity > 0));
    };
    const removeCI = (id: string, n: string) => setCart(p => p.filter(c => !(c.id === id && c.notes === n)));

    const sendOrder = (method: string) => {
        if (!config.whatsapp_number) return;
        let msg = `*طلب جديد من ${config.name}*\n\n`;
        msg += `*العميل:* ${cust.name || '-'}\n*الموبايل:* ${cust.phone || '-'}\n*العنوان:* ${cust.address || '-'}\n*الدفع:* ${method}\n\n*التفاصيل:*\n`;
        cart.forEach(i => {
            msg += `- ${i.quantity}x ${itemName(i.item)}`;
            if (i.sizeLabel) msg += ` (${i.sizeLabel})`;
            msg += ` — ${i.price * i.quantity} ${cur}\n`;
            if (i.notes) msg += `  _ملاحظة: ${i.notes}_\n`;
        });
        msg += `\n*الإجمالي:* ${cartTotal} ${cur}`;
        window.open(`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const toggleDark = () => { const n = !isDark; setIsDark(n); setTheme(n ? 'dark' : 'light'); };

    // colors
    const bg = isDark ? T8_DARK_BG : '#e8eaf0';
    const cardBg = isDark ? T8_DARK_CARD : '#ffffff';
    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? T8_DARK_BORDER : '#e2e8f0';

    /* ═══════════ RENDER ═══════════ */
    return (
        <div className="min-h-screen pb-20" dir="rtl" style={{ background: bg, fontFamily: "'Cairo', sans-serif", color: textPrimary }}>

            {/* ─── FLOATING SOCIAL SIDEBAR ─── */}
            <div className="fixed top-20 left-2 z-[90] flex flex-col gap-2">
                {config.facebook_url && (
                    <a href={config.facebook_url} target="_blank" className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg text-sm">
                        <FaFacebook className="w-4 h-4" />
                    </a>
                )}
                <button className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg text-sm">
                    <FaInstagram className="w-4 h-4" />
                </button>
                {config.whatsapp_number && (
                    <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}`} target="_blank" className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg text-sm">
                        <FaWhatsapp className="w-4 h-4" />
                    </a>
                )}
                <button className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-lg text-sm">
                    <FaTiktok className="w-4 h-4" />
                </button>
            </div>

            {/* ─── HERO SECTION ─── */}
            <div className="relative w-full overflow-hidden" style={{ minHeight: 280 }}>
                <img src={config.cover_url || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&auto=format&fit=crop'}
                    alt="cover" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30" />

                <div className="relative z-10 flex flex-col items-center justify-center py-8 px-4">
                    {/* Logo */}
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-white shadow-xl border-4"
                        style={{ borderColor: T8_ORANGE }}>
                        <img src={config.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=200'}
                            alt="logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="mt-3 text-2xl font-bold text-white text-center drop-shadow-lg">{config.name}</h1>

                    {/* CTA button */}
                    <button className="mt-3 px-6 py-2.5 rounded-lg text-white font-bold text-sm shadow-lg active:scale-95 transition-transform"
                        style={{ background: T8_ORANGE }}>
                        {isAr ? 'احجز الآن' : 'Book Now'}
                    </button>
                </div>

                {/* Features bar */}
                <div className="relative z-10 flex items-center justify-around py-4 px-4 bg-black/20 backdrop-blur-sm text-white text-xs">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">🍽️</span>
                        <span className="font-bold">{isAr ? 'مذاق أصيل' : 'Authentic Taste'}</span>
                    </div>
                    <div className="w-px h-8 bg-white/30" />
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">🚚</span>
                        <span className="font-bold">{isAr ? 'توصيل سريع' : 'Fast Delivery'}</span>
                    </div>
                    <div className="w-px h-8 bg-white/30" />
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">🕐</span>
                        <span className="font-bold">{isAr ? 'مفتوح 24/7' : 'Open 24/7'}</span>
                    </div>
                </div>
            </div>

            {/* ─── SEARCH BAR ─── */}
            <div className="px-4 mt-6 mb-4">
                <div className="flex items-center rounded-xl px-4 py-3 shadow-sm"
                    style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <Search className="w-5 h-5 shrink-0" style={{ color: T8_ORANGE }} />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder={isAr ? 'بحث عن المنتجات' : 'Search products'}
                        className="flex-1 bg-transparent outline-none text-sm mr-3 text-right"
                        style={{ color: textPrimary }} />
                </div>
            </div>

            {/* ─── PROMO BANNERS ─── */}
            <div className="px-4 mb-6 flex overflow-x-auto gap-3 pb-2" style={{ scrollbarWidth: 'none' }}>
                <div className="min-w-[280px] h-36 rounded-2xl overflow-hidden relative shrink-0 shadow-sm" style={{ background: isDark ? '#1e293b' : '#f8fafc' }}>
                    <img src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600" alt="Promo 1" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-3 right-4 text-right">
                        <h3 className="text-white font-bold text-lg mb-1">{isAr ? 'لمتنا تحلى' : 'Family Gathering'}</h3>
                        <p className="text-white/80 text-xs">{isAr ? 'اللمة العائلية' : 'Enjoy together'}</p>
                    </div>
                </div>
                <div className="min-w-[280px] h-36 rounded-2xl overflow-hidden relative shrink-0 shadow-sm" style={{ background: isDark ? '#1e293b' : '#f8fafc' }}>
                    <img src="https://images.unsplash.com/photo-1561758033-d89a9ad46330?q=80&w=600" alt="Promo 2" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-3 right-4 text-right">
                        <h3 className="text-white font-bold text-lg mb-1">{isAr ? 'ساندوتشات' : 'Fresh Sandwiches'}</h3>
                        <p className="text-white/80 text-xs">{isAr ? 'الطازجة في إنتظارك' : 'Waiting for you'}</p>
                    </div>
                </div>
            </div>

            {/* ─── MOST ORDERED (الأكثر طلباً) ─── */}
            {mostOrderedItems.length > 0 && !searchQuery.trim() && (
                <div className="px-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <button className="text-sm font-bold flex items-center gap-1" style={{ color: T8_ORANGE }}>
                            {isAr ? 'مشاهدة المزيد' : 'View More'} »
                        </button>
                        <h2 className="text-lg font-bold text-right">{isAr ? 'الأكثر طلباً' : 'Most Ordered'}</h2>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
                        {mostOrderedItems.map((item: any) => (
                            <div key={`mo-${item.id}`}
                                className="min-w-[140px] rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md cursor-pointer shrink-0 flex flex-col"
                                style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                                <div className="relative w-full aspect-square overflow-hidden"
                                    onClick={() => setSelectedItem({ item, catName: isAr ? 'الأكثر طلباً' : 'Most Ordered' })}>
                                    <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500'} alt={item.title_ar}
                                        className="w-full h-full object-cover transition-transform hover:scale-105" loading="lazy" />
                                </div>
                                <div className="p-3 text-center flex-1 flex flex-col justify-between items-center">
                                    <h3 className="font-bold text-sm mb-1 line-clamp-1"
                                        onClick={() => setSelectedItem({ item, catName: isAr ? 'الأكثر طلباً' : 'Most Ordered' })}>
                                        {itemName(item)}
                                    </h3>
                                    <span className="font-bold text-sm mb-3" style={{ color: T8_ORANGE }}>
                                        {item.prices[0]?.toFixed?.(0) || item.prices[0]} {cur}
                                    </span>
                                    <div className="w-full mt-auto">
                                        <button onClick={(e) => { e.stopPropagation(); addToCartDirect(item, isAr ? 'الأكثر طلباً' : 'Most Ordered'); }}
                                            className="w-full py-2 rounded-lg flex items-center justify-center active:scale-95 transition-transform"
                                            style={{ color: T8_ORANGE, backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed' }}>
                                            <ShoppingCart className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── CATEGORIES SECTION ─── */}
            <div className="px-4 mb-6">
                <h2 className="text-lg font-bold mb-2 text-center">{isAr ? 'الأقسام الرئيسية' : 'Main Categories'}</h2>
                <p className="text-xs mb-4 text-center" style={{ color: textSecondary }}>
                    {isAr ? 'اكتشف تشكيلتنا المتنوعة من الأطباق المختارة.' : 'Discover our diverse selection of dishes.'}
                </p>
                <div ref={catScrollRef}
                    className="flex items-center gap-3 overflow-x-auto pb-3"
                    style={{ scrollbarWidth: 'none' }}>
                    {/* All button */}
                    <button onClick={() => setActiveCategory('all')}
                        className="flex items-center gap-2 shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                        style={{
                            background: activeCategory === 'all' ? T8_ORANGE : cardBg,
                            color: activeCategory === 'all' ? '#fff' : textPrimary,
                            border: `1px solid ${activeCategory === 'all' ? T8_ORANGE : borderColor}`,
                        }}>
                        <List className="w-4 h-4" />
                        {isAr ? 'الكل' : 'All'}
                    </button>
                    {categories.map((cat: any) => {
                        const active = activeCategory === cat.id;
                        return (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                className="flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all"
                                style={{
                                    background: active ? T8_ORANGE : cardBg,
                                    color: active ? '#fff' : textPrimary,
                                    border: `1px solid ${active ? T8_ORANGE : borderColor}`,
                                }}>
                                {cat.image_url ? (
                                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                                        <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                ) : <span>{cat.emoji || '🍽️'}</span>}
                                <span className="whitespace-nowrap">{isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── MENU SECTIONS ─── */}
            <main className="px-4 space-y-8">
                {searchFilteredCategories.filter((c: any) => c.items?.length > 0).map((section: any) => (
                    <section key={section.id}>
                        {/* Section header */}
                        <div className="flex items-center justify-between mb-4">
                            <button className="text-sm font-bold flex items-center gap-1" style={{ color: T8_ORANGE }}>
                                {isAr ? 'مشاهدة المزيد' : 'View More'} »
                            </button>
                            <h2 className="text-xl font-bold">{isAr ? section.name_ar : (section.name_en || section.name_ar)}</h2>
                        </div>

                        {/* Grid of items — 2 columns on mobile, 3 on md */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {section.items.filter((i: any) => i.is_available !== false).map((item: any) => (
                                <div key={item.id}
                                    className="rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md cursor-pointer"
                                    style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                                    {/* Item image */}
                                    <div className="relative w-full aspect-square overflow-hidden"
                                        onClick={() => setSelectedItem({ item, catName: isAr ? section.name_ar : (section.name_en || section.name_ar) })}>
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.title_ar}
                                                className="w-full h-full object-cover transition-transform hover:scale-105"
                                                loading="lazy"
                                                onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500'; }} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl"
                                                style={{ background: isDark ? '#1e293b' : '#f8fafc' }}>{section.emoji || '🍽️'}</div>
                                        )}
                                    </div>

                                    {/* Item info */}
                                    <div className="p-3 text-center flex flex-col items-center">
                                        <h3 className="font-bold text-sm mb-1 line-clamp-1"
                                            onClick={() => setSelectedItem({ item, catName: isAr ? section.name_ar : (section.name_en || section.name_ar) })}>
                                            {itemName(item)}
                                        </h3>
                                        {item.desc_ar && (
                                            <p className="text-[11px] mb-2 line-clamp-1" style={{ color: textSecondary }}>
                                                {isAr ? item.desc_ar : (item.desc_en || '')}
                                            </p>
                                        )}
                                        <span className="font-bold text-sm mb-3" style={{ color: T8_ORANGE }}>
                                            {item.prices[0]?.toFixed?.(0) || item.prices[0]} {cur}
                                        </span>
                                        <div className="w-full">
                                            <button onClick={(e) => { e.stopPropagation(); addToCartDirect(item, isAr ? section.name_ar : (section.name_en || section.name_ar)); }}
                                                className="w-full py-2 rounded-lg flex items-center justify-center active:scale-95 transition-transform"
                                                style={{ color: T8_ORANGE, backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed' }}>
                                                <ShoppingCart className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* ─── FOOTER ─── */}
            <div className="mt-12 px-4 pb-6">
                <div className="rounded-2xl p-6 text-center space-y-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <h3 className="text-lg font-bold">{config.name}</h3>
                    {config.phone && (
                        <a href={`tel:${config.phone}`} className="flex items-center justify-center gap-2 text-sm" style={{ color: T8_ORANGE }}>
                            <Phone className="w-4 h-4" /> {config.phone}
                        </a>
                    )}
                    {config.map_link && (
                        <a href={config.map_link} target="_blank" className="flex items-center justify-center gap-2 text-sm" style={{ color: textSecondary }}>
                            <MapPin className="w-4 h-4" />
                            {isAr ? 'عرض على الخريطة' : 'View on Map'}
                        </a>
                    )}
                    <div className="flex justify-center gap-3 mt-3">
                        {config.facebook_url && <a href={config.facebook_url} target="_blank" className="p-2 rounded-full" style={{ color: textSecondary }}><FaFacebook className="w-5 h-5" /></a>}
                        <button className="p-2 rounded-full" style={{ color: textSecondary }}><FaInstagram className="w-5 h-5" /></button>
                        {config.whatsapp_number && <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}`} target="_blank" className="p-2 rounded-full" style={{ color: textSecondary }}><FaWhatsapp className="w-5 h-5" /></a>}
                        <button className="p-2 rounded-full" style={{ color: textSecondary }}><FaTiktok className="w-5 h-5" /></button>
                    </div>
                    <p className="text-xs" style={{ color: textSecondary }}>
                        {isAr ? 'جميع الأسعار تشمل الخدمة' : 'All prices include service'}
                    </p>
                </div>
            </div>

            {/* ─── SCROLL TOP ─── */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .8 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-24 left-4 w-10 h-10 rounded-full shadow-lg flex items-center justify-center z-[110] text-white"
                        style={{ background: T8_ORANGE }}>
                        <ChevronUp className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ─── BOTTOM NAV BAR ─── */}
            <div className="fixed bottom-0 left-0 right-0 z-[120] flex items-center justify-around py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]"
                style={{ background: cardBg, borderTop: `1px solid ${borderColor}` }}>
                {/* Home */}
                <button onClick={() => { setActiveBottomNav('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex flex-col items-center gap-0.5 p-1 min-w-[50px]"
                    style={{ color: activeBottomNav === 'home' ? T8_ORANGE : textSecondary }}>
                    <Home className="w-5 h-5" />
                </button>

                {/* Menu */}
                <button onClick={() => { setActiveBottomNav('menu'); const el = document.querySelector('main'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="flex flex-col items-center gap-0.5 p-1 min-w-[50px]"
                    style={{ color: activeBottomNav === 'menu' ? T8_ORANGE : textSecondary }}>
                    <UtensilsCrossed className="w-5 h-5" />
                </button>

                {/* Settings gear (center) */}
                <button onClick={() => setDrawerOpen(true)}
                    className="w-14 h-14 -mt-6 rounded-full flex items-center justify-center shadow-lg text-white"
                    style={{ background: `linear-gradient(135deg, ${T8_ORANGE}, #ea580c)` }}>
                    <Settings className="w-6 h-6" />
                </button>

                {/* Reservation -> Call Waiter */}
                <button onClick={() => setActiveBottomNav('waiter')}
                    className="flex flex-col items-center gap-0.5 p-1 min-w-[50px]"
                    style={{ color: activeBottomNav === 'waiter' ? T8_ORANGE : textSecondary }}>
                    <Bell className="w-5 h-5" />
                </button>

                {/* Cart */}
                <button onClick={() => { setActiveBottomNav('cart'); setIsCartOpen(true); }}
                    className="relative flex flex-col items-center gap-0.5 p-1 min-w-[50px]"
                    style={{ color: activeBottomNav === 'cart' ? T8_ORANGE : textSecondary }}>
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                            style={{ background: T8_ORANGE }}>{cartCount}</span>
                    )}
                </button>
            </div>

            {/* ═══════ MODALS & DRAWERS ═══════ */}
            <AnimatePresence>

                {/* ── SIDE DRAWER ── */}
                {drawerOpen && (
                    <div className="fixed inset-0 z-[500] flex" onClick={() => setDrawerOpen(false)}>
                        <div className="flex-1 bg-black/40" />
                        <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
                            transition={{ type: 'tween', duration: 0.25 }}
                            className="w-72 h-full flex flex-col shadow-2xl"
                            style={{ background: cardBg }}
                            onClick={e => e.stopPropagation()}>
                            <div className="p-4 flex items-center justify-between border-b" style={{ borderColor }}>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => setDrawerOpen(false)}><X className="w-5 h-5" /></button>
                                    <button onClick={toggleDark} className="p-1 rounded-md" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: textPrimary }}>
                                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    </button>
                                </div>
                                <img src={config.logo_url} alt="" className="w-8 h-8 rounded-full" />
                            </div>
                            <nav className="flex-1 p-4 space-y-1 text-right">
                                {[
                                    { label: isAr ? 'الصفحة الرئيسية' : 'Home', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
                                    { label: isAr ? 'المنيو' : 'Menu', action: () => document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' }), active: true },
                                    { label: isAr ? 'وجبات مميزة' : 'Featured Meals', action: () => { } },
                                    { label: isAr ? 'عروض مميزة' : 'Special Offers', action: () => { } },
                                    { label: isAr ? 'الحجوزات' : 'Reservations', action: () => { } },
                                    { label: isAr ? 'المزيد' : 'More', action: () => { }, hasIcon: true },
                                ].map(item => (
                                    <button key={item.label} onClick={() => { item.action(); setDrawerOpen(false); }}
                                        className="w-full flex justify-between items-center text-right font-bold text-sm py-3 transition-colors hover:opacity-70"
                                        style={{ color: item.active ? T8_ORANGE : textPrimary }}>
                                        {item.hasIcon ? <ChevronDown className="w-4 h-4 opacity-50" /> : <div className="w-4" />}
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                            <div className="p-4 border-t flex items-center justify-between text-sm" style={{ borderColor }}>
                                <button className="flex items-center gap-2 text-xs font-bold" style={{ color: textSecondary }}>
                                    <Rocket className="w-4 h-4" />
                                    {isAr ? 'مناداة الوتر' : 'Call Waiter'}
                                </button>
                                <button className="flex items-center gap-2 text-xs font-bold" style={{ color: textSecondary }}>
                                    <LogIn className="w-4 h-4" />
                                    {isAr ? 'تسجيل الدخول' : 'Login'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ── ITEM DETAIL MODAL ── */}
                {selectedItem && (
                    <div className="fixed inset-0 z-[400] flex flex-col" style={{ background: isDark ? T8_DARK_BG : '#f8fafc' }}
                        onClick={closeModal}>
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                            className="flex-1 flex flex-col overflow-y-auto rounded-t-3xl shadow-2xl"
                            style={{ background: cardBg }}
                            onClick={e => e.stopPropagation()}>
                            {/* Close */}
                            <button onClick={closeModal} className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
                                style={{ background: cardBg, color: T8_ORANGE }}>
                                <X className="w-5 h-5" />
                            </button>

                            {/* Image */}
                            <div className="w-full h-64 md:h-80 shrink-0 overflow-hidden" style={{ background: isDark ? '#1e293b' : '#e2e8f0' }}>
                                <img src={selectedItem.item.image_url || config.cover_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800'}
                                    alt="" className="w-full h-full object-cover" />
                            </div>

                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col gap-4 text-right" dir="rtl">
                                <h2 className="text-xl font-bold">{itemName(selectedItem.item)}</h2>

                                {/* Price + Size tabs */}
                                <div className="flex items-center gap-3 flex-wrap justify-end">
                                    <span className="font-bold" style={{ color: T8_ORANGE }}>
                                        {(selectedItem.item.prices[sizeIdx] || 0).toFixed?.(0)} {cur}
                                    </span>
                                    {selectedItem.item.prices.length > 1 && (
                                        <span className="text-xs" style={{ color: textSecondary }}>{isAr ? 'اختر الوزن' : 'Choose size'}</span>
                                    )}
                                </div>

                                {/* Size options as tabs */}
                                {selectedItem.item.prices.length > 1 && (
                                    <div className="flex items-center gap-2 justify-end">
                                        {selectedItem.item.prices.map((_p: number, idx: number) => {
                                            const label = selectedItem.item.size_labels?.[idx] || (isAr ? `خيار ${idx + 1}` : `Option ${idx + 1}`);
                                            const sel = sizeIdx === idx;
                                            return (
                                                <button key={idx} onClick={() => setSizeIdx(idx)}
                                                    className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                                                    style={{
                                                        background: sel ? (isDark ? '#fff' : '#000') : (isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc'),
                                                        color: sel ? (isDark ? '#000' : '#fff') : textPrimary,
                                                        border: `1px solid ${sel ? (isDark ? '#fff' : '#000') : borderColor}`,
                                                    }}>
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Calories */}
                                {selectedItem.item.calories && (
                                    <div className="flex items-center gap-2 justify-end text-sm" style={{ color: textSecondary }}>
                                        <span>{isAr ? 'السعرات الحرارية:' : 'Calories:'} {selectedItem.item.calories} {isAr ? 'كالوري' : 'Cal'}</span>
                                        <span>⚖️</span>
                                    </div>
                                )}

                                {/* Description */}
                                {selectedItem.item.desc_ar && (
                                    <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>
                                        {isAr ? selectedItem.item.desc_ar : (selectedItem.item.desc_en || selectedItem.item.desc_ar || '')}
                                    </p>
                                )}

                                {/* Extras */}
                                {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                    <div className="mt-2 text-right">
                                        <div className="flex items-center justify-end gap-2 mb-3">
                                            <span className="text-xs" style={{ color: textSecondary }}>({isAr ? 'اختياري' : 'Optional'})</span>
                                            <h3 className="font-bold">{isAr ? 'إضافات' : 'Extras'}</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {selectedItem.item.extras.map((ext: any, idx: number) => {
                                                const isSel = selectedExtras.some(e => e.id === (ext.id || idx));
                                                return (
                                                    <label key={idx} className="flex items-center justify-between cursor-pointer">
                                                        <span className="text-sm font-bold" style={{ color: textSecondary }}>
                                                            {ext.price > 0 ? `+${ext.price} ${cur}` : (isAr ? 'مجاناً' : 'Free')}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm">{isAr ? ext.name_ar : (ext.name_en || ext.name_ar)}</span>
                                                            <div className="w-5 h-5 rounded border flex items-center justify-center"
                                                                style={{ borderColor: isSel ? T8_ORANGE : borderColor, background: isSel ? T8_ORANGE : 'transparent' }}>
                                                                {isSel && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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

                                {/* Notes */}
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder={isAr ? 'ملاحظات خاصة (اختياري)' : 'Special notes (optional)'}
                                    className="w-full rounded-xl p-3 text-sm text-right outline-none resize-none h-20 mt-2"
                                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${borderColor}`, color: textPrimary }} />
                            </div>

                            {/* Add to cart bar */}
                            <div className="p-4 flex items-center gap-4 shrink-0 border-t" style={{ borderColor, background: cardBg }}>
                                {/* Qty */}
                                <div className="flex items-center gap-1 rounded-xl overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
                                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center"
                                        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}>
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-sm">{qty}</span>
                                    <button onClick={() => setQty(qty + 1)} className="w-9 h-9 flex items-center justify-center"
                                        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}>
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                {/* Add button */}
                                <button onClick={addToCart} className="flex-1 text-white rounded-xl py-3 px-4 font-bold text-sm active:scale-95 transition-transform"
                                    style={{ background: T8_ORANGE }}>
                                    {isAr ? 'أضف للسلة' : 'Add to Cart'} {(((selectedItem.item.prices[sizeIdx] || 0) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty).toFixed?.(0)} {cur}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ── CART MODAL ── */}
                {isCartOpen && (
                    <div className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsCartOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .95 }}
                            className="w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            style={{ background: cardBg }}
                            onClick={e => e.stopPropagation()}>
                            {/* header */}
                            <div className="p-4 flex items-center justify-between shrink-0 border-b" style={{ borderColor }}>
                                <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-full" style={{ color: textSecondary }}>
                                    <X className="w-5 h-5" />
                                </button>
                                <h2 className="text-lg font-bold">{isAr ? 'السلة' : 'Cart'}</h2>
                                <div className="w-9" />
                            </div>

                            {/* items */}
                            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4 text-right" dir="rtl">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12" style={{ color: textSecondary }}>
                                        <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
                                        <p>{isAr ? 'السلة فارغة' : 'Cart is empty'}</p>
                                    </div>
                                ) : cart.map(ci => (
                                    <div key={`${ci.id}-${ci.notes}`} className="flex items-start gap-3 p-3 rounded-2xl"
                                        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: `1px solid ${borderColor}` }}>
                                        <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden" style={{ background: isDark ? '#1e293b' : '#e2e8f0' }}>
                                            <img src={ci.item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200'} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col gap-1">
                                            <div className="flex justify-between items-start">
                                                <button onClick={() => removeCI(ci.id, ci.notes)} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                                <h3 className="font-bold text-sm">{itemName(ci.item)}</h3>
                                            </div>
                                            {ci.notes && <p className="text-[10px] italic" style={{ color: textSecondary }}>{ci.notes}</p>}
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-1 rounded-lg overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
                                                    <button onClick={() => updateQty(ci.id, ci.notes, -1)} className="w-6 h-6 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                                                    <span className="font-bold text-xs w-6 text-center">{ci.quantity}</span>
                                                    <button onClick={() => updateQty(ci.id, ci.notes, 1)} className="w-6 h-6 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                                                </div>
                                                <span className="font-bold text-sm" style={{ color: T8_ORANGE }}>{(ci.price * ci.quantity).toFixed?.(0)} {cur}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* checkout */}
                            {cart.length > 0 && (
                                <div className="p-4 shrink-0 border-t" style={{ borderColor }}>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold text-lg" style={{ color: T8_ORANGE }}>{cartTotal.toFixed?.(0)} {cur}</span>
                                        <span className="text-sm" style={{ color: textSecondary }}>{isAr ? 'الإجمالي' : 'Total'}</span>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        <input type="text" placeholder={isAr ? 'الاسم' : 'Name'} value={cust.name} onChange={e => setCust(p => ({ ...p, name: e.target.value }))}
                                            className="w-full rounded-xl px-4 py-3 text-right outline-none text-sm"
                                            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${borderColor}`, color: textPrimary }} />
                                        <input type="tel" placeholder={isAr ? 'رقم الموبايل' : 'Phone'} value={cust.phone} onChange={e => setCust(p => ({ ...p, phone: e.target.value }))}
                                            className="w-full rounded-xl px-4 py-3 text-right outline-none text-sm"
                                            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${borderColor}`, color: textPrimary }} />
                                        <textarea placeholder={isAr ? 'العنوان' : 'Address'} value={cust.address} onChange={e => setCust(p => ({ ...p, address: e.target.value }))}
                                            className="w-full rounded-xl px-4 py-3 text-right outline-none h-16 resize-none text-sm"
                                            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${borderColor}`, color: textPrimary }} />
                                    </div>
                                    <button onClick={() => sendOrder(isAr ? 'كاش عند الاستلام' : 'Cash on Delivery')}
                                        className="w-full text-white rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                        style={{ background: T8_ORANGE }}>
                                        <FaWhatsapp className="w-5 h-5" />
                                        {isAr ? 'اكمال الطلب عبر واتساب' : 'Complete Order via WhatsApp'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
