// @ts-nocheck
"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Globe, Star, MapPin, Instagram, Phone, Link as LinkIcon,
    Moon, Sun, ShoppingCart, Plus, Minus, Trash2, X, Share2, LogIn
} from 'lucide-react';
import { FaWhatsapp, FaFacebook } from 'react-icons/fa';

/* ───────────────────── THEME 6 CONSTANTS ───────────────────── */
const T6 = '#40a798';        // brand-primary teal
const T6_LIGHT = '#e6f2fa';  // brand-light active bg
const T6_GREEN = '#059669';  // open status

/* ───────────────────── COMPONENT ───────────────────── */
export default function Theme6Menu({ config, categories }: { config: any; categories: any[] }) {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const isAr = (config.language || 'ar') === 'ar';
    const cur = config.currency || 'EGP';

    /* ── state ── */
    const [activeSection, setActiveSection] = useState('');
    const [cart, setCart] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<{ item: any; catName: string } | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showCallMenu, setShowCallMenu] = useState(false);
    const [showPayMenu, setShowPayMenu] = useState(false);

    // item-modal sub-state
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [notes, setNotes] = useState('');

    // checkout form
    const [cust, setCust] = useState({ name: '', phone: '', address: '' });

    const catNavRef = useRef<HTMLDivElement>(null);

    /* ── persist cart ── */
    useEffect(() => {
        try { const s = localStorage.getItem(`cart_${config.id}`); if (s) setCart(JSON.parse(s)); } catch { }
    }, [config.id]);
    useEffect(() => {
        localStorage.setItem(`cart_${config.id}`, JSON.stringify(cart));
    }, [cart, config.id]);

    /* ── intersection observer for active section ── */
    useEffect(() => {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    setActiveSection(e.target.id);
                    const btn = catNavRef.current?.querySelector(`[data-id="${e.target.id}"]`);
                    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }, { rootMargin: '-140px 0px -75% 0px', threshold: 0 });
        categories.forEach(c => { const el = document.getElementById(c.id); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, [categories]);

    /* ── helpers ── */
    const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveSection(''); };

    const addToCart = () => {
        if (!selectedItem) return;
        const price = selectedItem.item.prices[sizeIdx] || 0;
        const label = selectedItem.item.size_labels?.[sizeIdx] || '';
        const ci = {
            id: `${selectedItem.item.id}-${sizeIdx}`,
            item: selectedItem.item,
            catName: selectedItem.catName,
            price, sizeLabel: label, quantity: qty, notes,
        };
        setCart(prev => {
            const ex = prev.find(i => i.id === ci.id && i.notes === ci.notes);
            if (ex) return prev.map(i => i === ex ? { ...i, quantity: i.quantity + ci.quantity } : i);
            return [...prev, ci];
        });
        closeItemModal();
    };

    const closeItemModal = () => { setSelectedItem(null); setQty(1); setSizeIdx(0); setNotes(''); };

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
            msg += `- ${i.quantity}x ${isAr ? i.item.title_ar : i.item.title_en || i.item.title_ar}`;
            if (i.sizeLabel) msg += ` (${i.sizeLabel})`;
            msg += ` — ${i.price * i.quantity} ${cur}\n`;
            if (i.notes) msg += `  _ملاحظة: ${i.notes}_\n`;
        });
        msg += `\n*الإجمالي:* ${cartTotal} ${cur}`;
        window.open(`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const itemName = (item: any) => isAr ? item.title_ar : (item.title_en || item.title_ar);

    /* ═══════════════════════════ RENDER ═══════════════════════════ */
    return (
        <div className="min-h-screen pb-40 bg-white dark:bg-zinc-950 transition-colors duration-500" dir="rtl"
            style={{ fontFamily: "'Cairo', sans-serif" }}>

            {/* ─────────── HEADER ─────────── */}
            <div className="flex flex-col bg-white dark:bg-zinc-900 pb-6">
                {/* Cover */}
                <div className="h-48 md:h-64 w-full relative">
                    <img src={config.cover_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000&auto=format&fit=crop'}
                        alt="cover" className="w-full h-full object-cover" />
                </div>

                {/* Logo + Language */}
                <div className="relative flex justify-center px-4">
                    {/* dark/light mode toggle */}
                    <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className="absolute left-4 top-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        style={{ color: T6 }}>
                        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    {/* logo circle overlapping banner */}
                    <div className="absolute -top-16 w-32 h-32 rounded-full border-4 border-white dark:border-zinc-900 overflow-hidden bg-white shadow-sm z-10">
                        <img src={config.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=200&auto=format&fit=crop'}
                            alt="logo" className="w-full h-full object-cover" />
                    </div>
                </div>
                <div className="h-16" /> {/* spacer for logo */}

                {/* Restaurant name */}
                <div className="text-center mt-2">
                    <h1 className="text-3xl font-bold" style={{ color: T6 }}>{config.name}</h1>
                </div>

                {/* Action icons row */}
                <div className="flex justify-center items-center gap-4 mt-4" style={{ color: T6 }}>
                    <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <Star className="w-6 h-6" />
                    </button>
                    {config.map_link && (
                        <a href={config.map_link} target="_blank" className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <MapPin className="w-6 h-6" />
                        </a>
                    )}
                    {config.facebook_url && (
                        <a href={config.facebook_url} target="_blank" className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <FaFacebook className="w-6 h-6" />
                        </a>
                    )}
                    {config.whatsapp_number && (
                        <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}`} target="_blank" className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <FaWhatsapp className="w-6 h-6" />
                        </a>
                    )}
                    {config.phone && (
                        <a href={`tel:${config.phone}`} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <Phone className="w-6 h-6" />
                        </a>
                    )}
                    <button onClick={() => { if (navigator.share) navigator.share({ title: config.name, url: location.href }); else { navigator.clipboard.writeText(location.href); alert('تم نسخ الرابط'); } }}
                        className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <LinkIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* ─────────── STICKY CATEGORY BAR ─────────── */}
            <div className="sticky top-0 z-[100] bg-white/95 dark:bg-black/95 backdrop-blur-md py-4 border-b border-zinc-100 dark:border-white/5 shadow-sm">
                <div ref={catNavRef}
                    className="flex items-start overflow-x-auto px-4 gap-6 scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {/* "الكل" home button */}
                    <button onClick={scrollToTop} data-id="top"
                        className="flex flex-col items-center gap-2 shrink-0 min-w-[70px]">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl shadow-sm border-2 transition-colors
                            ${activeSection === '' ? 'border-[#40a798] bg-[#e6f2fa]' : 'border-transparent bg-zinc-100 dark:bg-zinc-800'}`}>
                            🏠
                        </div>
                        <span className={`text-sm font-bold transition-colors ${activeSection === '' ? 'text-[#40a798]' : 'text-zinc-600 dark:text-zinc-400'}`}>
                            {isAr ? 'الكل' : 'All'}
                        </span>
                    </button>

                    {categories.map((s: any) => (
                        <button key={s.id} data-id={s.id}
                            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
                            className="flex flex-col items-center gap-2 shrink-0 min-w-[70px]">
                            <div className={`w-16 h-16 rounded-full overflow-hidden shadow-sm border-2 transition-colors
                                ${activeSection === s.id ? 'border-[#40a798]' : 'border-transparent'}`}>
                                {s.image_url
                                    ? <img src={s.image_url} alt={s.name_ar} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl">{s.emoji || '🍽️'}</div>
                                }
                            </div>
                            <span className={`text-sm font-bold transition-colors ${activeSection === s.id ? 'text-[#40a798]' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                {isAr ? s.name_ar : (s.name_en || s.name_ar)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ─────────── MENU SECTIONS + ITEMS ─────────── */}
            <main className="mt-8 space-y-12">
                {categories.filter((c: any) => c.items?.length > 0).map((section: any) => (
                    <section key={section.id} id={section.id} className="px-4 md:px-6 mt-8">
                        {/* Section title */}
                        <div className="flex items-center justify-end gap-2.5 mb-6">
                            <h3 className="text-xl font-bold tracking-tight" style={{ color: T6 }}>
                                {isAr ? section.name_ar : (section.name_en || section.name_ar)}
                            </h3>
                        </div>

                        {/* Item cards  — exact Theme 6 layout:
                             flex container (RTL dir), image is FIRST child → appears on RIGHT.
                             image: w-24 h-24 rounded-xl
                             text+prices on the left side. */}
                        <div className="flex flex-col gap-6">
                            {section.items.filter((i: any) => i.is_available !== false).map((item: any) => (
                                <div key={item.id}
                                    onClick={() => setSelectedItem({ item, catName: isAr ? section.name_ar : (section.name_en || section.name_ar) })}
                                    className="flex items-start gap-4 cursor-pointer border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0 last:pb-0"
                                    style={{ transition: 'transform .2s ease' }}
                                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                                    onMouseUp={e => (e.currentTarget.style.transform = '')}
                                    onMouseLeave={e => (e.currentTarget.style.transform = '')}>

                                    {/* IMAGE — first child, appears on the RIGHT in RTL */}
                                    <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                        {item.image_url
                                            ? <img src={item.image_url} alt={item.title_ar} className="w-full h-full object-cover" loading="lazy"
                                                onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop'; }} />
                                            : <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">{section.emoji || '🍽️'}</div>
                                        }
                                        {item.is_popular && (
                                            <div className="absolute top-1 right-1 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10" style={{ backgroundColor: T6 }}>
                                                {isAr ? 'شائع' : 'Popular'}
                                            </div>
                                        )}
                                    </div>

                                    {/* CONTENT — second child, appears on the LEFT in RTL */}
                                    <div className="flex-1 flex flex-col items-end text-right">
                                        <h3 className="text-lg font-bold text-zinc-800 dark:text-white mb-1">
                                            {itemName(item)}
                                        </h3>

                                        {item.desc_ar && (
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-tight mb-2">
                                                {isAr ? item.desc_ar : (item.desc_en || '')}
                                            </p>
                                        )}

                                        {/* Price tags — rounded-md pills */}
                                        <div className="mt-auto flex flex-wrap gap-2 justify-end">
                                            {item.prices.map((price: number, pIdx: number) => {
                                                const lbl = item.size_labels?.[pIdx];
                                                return (
                                                    <div key={pIdx} className="text-white px-3 py-1 rounded-md flex items-center gap-1 shadow-sm" style={{ backgroundColor: T6 }}>
                                                        <span className="text-sm font-bold">{cur} {price}</span>
                                                        {lbl && <span className="text-xs opacity-90">({lbl})</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* ─────────── BOTTOM NAV ─────────── */}
            <nav className="fixed bottom-0 left-0 right-0 z-[130] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-2 py-4 flex items-center justify-around rounded-t-[2rem] border-t border-zinc-100 dark:border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
                {config.facebook_url && (
                    <a href={config.facebook_url} target="_blank" className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-10 h-10 flex items-center justify-center bg-[#1877F2]/10 text-[#1877F2] rounded-xl active:scale-90 transition-transform">
                            <FaFacebook className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black text-zinc-500">{isAr ? 'فيسبوك' : 'Facebook'}</span>
                    </a>
                )}

                <div onClick={() => setShowCallMenu(true)} className="flex flex-col items-center gap-1 flex-1 cursor-pointer">
                    <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl active:scale-90 transition-transform">
                        <span className="text-lg">📞</span>
                    </div>
                    <span className="text-[9px] font-black text-zinc-500">{isAr ? 'دليفري' : 'Call'}</span>
                </div>

                <div onClick={scrollToTop} className="flex flex-col items-center gap-1 flex-1 -mt-8 cursor-pointer">
                    <div className="w-14 h-14 flex items-center justify-center text-white rounded-full shadow-lg border-[4px] border-[#f8f9fa] dark:border-[#121212] active:scale-90 transition-transform"
                        style={{ backgroundColor: T6 }}>
                        <span className="text-xl font-black">↑</span>
                    </div>
                    <span className="text-[9px] font-black mt-1" style={{ color: T6 }}>{isAr ? 'للأعلى' : 'Top'}</span>
                </div>

                <div onClick={() => setShowPayMenu(true)} className="flex flex-col items-center gap-1 flex-1 cursor-pointer">
                    <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl active:scale-90 transition-transform">
                        <span className="text-lg">💳</span>
                    </div>
                    <span className="text-[9px] font-black text-zinc-500">{isAr ? 'الدفع' : 'Pay'}</span>
                </div>

                {config.map_link && (
                    <a href={config.map_link} target="_blank" className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl active:scale-90 transition-transform">
                            <span className="text-lg">📍</span>
                        </div>
                        <span className="text-[9px] font-black text-zinc-500">{isAr ? 'موقعنا' : 'Location'}</span>
                    </a>
                )}
            </nav>

            {/* ─────────── FLOATING WHATSAPP ─────────── */}
            {config.whatsapp_number && (
                <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}`} target="_blank"
                    className="fixed bottom-28 right-5 bg-[#25D366] w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 z-[120] transition-transform">
                    <FaWhatsapp className="w-7 h-7" />
                </a>
            )}

            {/* ─────────── CART BAR (floating above bottom nav) ─────────── */}
            <AnimatePresence>
                {cartCount > 0 && !isCartOpen && (
                    <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                        className="fixed bottom-4 left-4 right-4 z-[150]">
                        <button onClick={() => setIsCartOpen(true)}
                            className="w-full text-white rounded-xl py-3 px-4 flex items-center justify-between font-bold shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
                            style={{ backgroundColor: T6 }}>
                            <div className="flex items-center gap-2">
                                <div className="bg-white/20 px-2 py-0.5 rounded-md text-xs">{cartCount} {isAr ? 'صنف' : 'items'}</div>
                                <div className="flex items-center gap-1">
                                    <span>{cartTotal}</span>
                                    <span className="text-xs">ج.م</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>{isAr ? 'عرض السلة' : 'View Cart'}</span>
                                <ShoppingCart className="w-5 h-5" />
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════ MODALS ═══════════════ */}
            <AnimatePresence>

                {/* ── ITEM MODAL ── */}
                {selectedItem && (
                    <div className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeItemModal}>
                        <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .95 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}>
                            {/* image header */}
                            <div className="relative h-64 w-full bg-zinc-100 dark:bg-zinc-800 shrink-0">
                                <img src={selectedItem.item.image_url || config.cover_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500'}
                                    alt="" className="w-full h-full object-cover" />
                                <button onClick={closeItemModal}
                                    className="absolute top-4 right-4 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-zinc-800 shadow-sm active:scale-90">
                                    <X className="w-5 h-5" />
                                </button>
                                <button onClick={() => { if (navigator.share) navigator.share({ title: itemName(selectedItem.item), url: location.href }); }}
                                    className="absolute top-4 left-4 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-zinc-800 shadow-sm active:scale-90">
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* scrollable content */}
                            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6 text-right">
                                {/* title + desc */}
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <button onClick={() => { if (navigator.share) navigator.share({ title: itemName(selectedItem.item), url: location.href }); }}
                                            className="text-sm font-bold flex items-center gap-1 hover:opacity-80" style={{ color: T6 }}>
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{itemName(selectedItem.item)}</h2>
                                    </div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {isAr ? selectedItem.item.desc_ar : (selectedItem.item.desc_en || selectedItem.item.desc_ar || itemName(selectedItem.item))}
                                    </p>
                                </div>

                                {/* size options */}
                                {selectedItem.item.prices.length > 1 && (
                                    <div className="flex flex-col gap-3">
                                        <h3 className="font-bold text-sm flex items-center gap-1 justify-end" style={{ color: T6 }}>
                                            {isAr ? 'اختر' : 'Choose'} <span className="text-lg">👇</span>
                                        </h3>
                                        <div className="flex flex-col gap-2">
                                            {selectedItem.item.prices.map((price: number, idx: number) => {
                                                const label = selectedItem.item.size_labels?.[idx] || (isAr ? `خيار ${idx + 1}` : `Option ${idx + 1}`);
                                                const sel = sizeIdx === idx;
                                                return (
                                                    <label key={idx}
                                                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors
                                                               ${sel ? 'border-[#40a798] bg-[#e6f2fa]/50' : 'border-zinc-200 dark:border-zinc-700'}`}>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{price}</span>
                                                            <span className="text-xs text-zinc-500">ج.م</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{label}</span>
                                                            <input type="radio" name="item-option" checked={sel} onChange={() => setSizeIdx(idx)}
                                                                className="w-[1.15em] h-[1.15em] rounded-full border-2 border-zinc-300 appearance-none"
                                                                style={sel ? { borderColor: T6, boxShadow: `inset 0 0 0 3px ${T6}` } : {}} />
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* notes */}
                                <div>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                        placeholder={isAr ? 'ملاحظات خاصة (اختياري)' : 'Special notes (optional)'}
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm text-right outline-none transition-colors resize-none h-24"
                                        style={{ '--tw-ring-color': T6 } as any} />
                                </div>
                            </div>

                            {/* bottom add-to-cart bar */}
                            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-4 shrink-0">
                                <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-32 shrink-0">
                                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-700 rounded-lg shadow-sm text-zinc-600 dark:text-zinc-300">
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="font-bold text-sm">{qty}</span>
                                    <button onClick={() => setQty(qty + 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-700 rounded-lg shadow-sm text-zinc-600 dark:text-zinc-300">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <button onClick={addToCart} className="flex-1 text-white rounded-xl py-3 px-4 flex items-center justify-between font-bold"
                                    style={{ backgroundColor: T6 }}>
                                    <div className="flex items-center gap-1">
                                        <span>{(selectedItem.item.prices[sizeIdx] || 0) * qty}</span>
                                        <span className="text-xs">ج.م</span>
                                    </div>
                                    <span>{isAr ? 'اضف الى السلة' : 'Add to Cart'}</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ── CART MODAL ── */}
                {isCartOpen && (
                    <div className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsCartOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .95 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}>
                            {/* header */}
                            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                                <button onClick={() => setIsCartOpen(false)} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{isAr ? 'السلة' : 'Cart'}</h2>
                                <div className="w-9" />
                            </div>

                            {/* items list */}
                            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4 text-right">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                                        <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
                                        <p>{isAr ? 'السلة فارغة' : 'Cart is empty'}</p>
                                    </div>
                                ) : cart.map(ci => (
                                    <div key={`${ci.id}-${ci.notes}`} className="flex items-start gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                        <div className="w-16 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-700 shrink-0 overflow-hidden">
                                            <img src={ci.item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&auto=format&fit=crop'}
                                                alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col gap-1">
                                            <div className="flex justify-between items-start">
                                                <button onClick={() => removeCI(ci.id, ci.notes)} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{itemName(ci.item)}</h3>
                                            </div>
                                            {ci.notes && <p className="text-[10px] text-zinc-400 italic">{ci.notes}</p>}
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-1 w-24 border border-zinc-200 dark:border-zinc-700">
                                                    <button onClick={() => updateQty(ci.id, ci.notes, -1)} className="w-6 h-6 flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 rounded shadow-sm text-zinc-600">
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="font-bold text-xs">{ci.quantity}</span>
                                                    <button onClick={() => updateQty(ci.id, ci.notes, 1)} className="w-6 h-6 flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 rounded shadow-sm text-zinc-600">
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs text-zinc-500">{ci.sizeLabel} {ci.price} ج.م</span>
                                                    <span className="font-bold text-sm" style={{ color: T6 }}>{ci.price * ci.quantity} ج.م</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* footer checkout */}
                            {cart.length > 0 && (
                                <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold text-lg text-zinc-900 dark:text-white">{cartTotal} ج.م</span>
                                        <span className="text-sm text-zinc-500">{isAr ? 'الاجمالي' : 'Total'}</span>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        <input type="text" placeholder={isAr ? 'الاسم' : 'Name'} value={cust.name} onChange={e => setCust(p => ({ ...p, name: e.target.value }))}
                                            className="w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 bg-white dark:bg-zinc-800 text-right outline-none text-sm" />
                                        <input type="tel" placeholder={isAr ? 'رقم الموبايل' : 'Phone'} value={cust.phone} onChange={e => setCust(p => ({ ...p, phone: e.target.value }))}
                                            className="w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 bg-white dark:bg-zinc-800 text-right outline-none text-sm" />
                                        <textarea placeholder={isAr ? 'العنوان' : 'Address'} value={cust.address} onChange={e => setCust(p => ({ ...p, address: e.target.value }))}
                                            className="w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 bg-white dark:bg-zinc-800 text-right outline-none h-16 resize-none text-sm" />
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => sendOrder(isAr ? 'كاش عند الاستلام' : 'Cash on Delivery')}
                                            className="flex-1 text-white rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2"
                                            style={{ backgroundColor: T6 }}>
                                            <FaWhatsapp className="w-5 h-5" />
                                            {isAr ? 'اكمال الطلب' : 'Complete Order'}
                                        </button>
                                        <button onClick={() => setIsCartOpen(false)}
                                            className="flex-1 text-white rounded-xl py-3 font-bold text-sm"
                                            style={{ backgroundColor: T6 }}>
                                            {isAr ? 'اضف المزيد' : 'Add More'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}

                {/* ── DELIVERY MODAL ── */}
                {showCallMenu && (
                    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowCallMenu(false)}>
                        <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .95, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[85vh]"
                            onClick={e => e.stopPropagation()}>
                            <div className="p-5 text-center shrink-0" style={{ backgroundColor: T6 }}>
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-md">
                                    <span className="text-xl">📞</span>
                                </div>
                                <h3 className="text-white text-base font-black uppercase">{isAr ? 'أرقام التوصيل' : 'Delivery Numbers'}</h3>
                            </div>
                            <div className="p-3 space-y-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                {config.phone && (
                                    <a href={`tel:${config.phone}`} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 active:scale-95 transition-transform">
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-zinc-800 dark:text-white tabular-nums">{config.phone}</span>
                                            <span className="text-[9px] text-zinc-400 font-bold">{isAr ? 'الرقم الرئيسي' : 'Main'}</span>
                                        </div>
                                        <div className="w-9 h-9 bg-white dark:bg-zinc-700 rounded-xl flex items-center justify-center" style={{ color: T6 }}>☏</div>
                                    </a>
                                )}
                                {config.phone_numbers?.map((num: any, i: number) => (
                                    <a key={i} href={`tel:${num.number}`} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 active:scale-95 transition-transform">
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-zinc-800 dark:text-white tabular-nums">{num.number}</span>
                                            <span className="text-[9px] text-zinc-400 font-bold">{num.label}</span>
                                        </div>
                                        <div className="w-9 h-9 bg-white dark:bg-zinc-700 rounded-xl flex items-center justify-center" style={{ color: T6 }}>☏</div>
                                    </a>
                                ))}
                            </div>
                            <div className="p-4 pt-0 shrink-0">
                                <button onClick={() => setShowCallMenu(false)} className="w-full py-3 text-zinc-400 font-bold text-[10px] uppercase">{isAr ? 'إغلاق القائمة' : 'Close'}</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ── PAYMENT MODAL ── */}
                {showPayMenu && (
                    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowPayMenu(false)}>
                        <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .95, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}>
                            <div className="p-6 pb-2 text-center shrink-0">
                                <div className="w-12 h-12 bg-zinc-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">💳</div>
                                <h3 className="text-xl font-black text-zinc-900 dark:text-white">{isAr ? 'وسائل الدفع' : 'Payment Methods'}</h3>
                            </div>
                            <div className="px-5 py-3 space-y-3 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                {config.payment_methods?.length > 0 ? config.payment_methods.map((pm: any) => (
                                    <div key={pm.id} className="block p-5 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 text-right">
                                        <span className="text-sm font-black text-zinc-800 dark:text-white block mb-1">{isAr ? pm.name_ar : (pm.name_en || pm.name_ar)}</span>
                                        {(pm.desc_ar || pm.desc_en) && <p className="text-[10px] text-zinc-400 leading-tight mb-2">{isAr ? pm.desc_ar : (pm.desc_en || pm.desc_ar)}</p>}
                                        {pm.number && (
                                            <div onClick={() => { navigator.clipboard.writeText(pm.number); alert(isAr ? 'تم نسخ الرقم!' : 'Number copied!'); }}
                                                className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl text-center cursor-pointer active:bg-zinc-100 transition-colors mt-2 border border-zinc-100 dark:border-zinc-700">
                                                <p className="text-[8px] font-black uppercase mb-1 flex items-center justify-center gap-1" style={{ color: T6 }}>
                                                    {isAr ? 'اضغط للنسخ' : 'Tap to copy'} <span className="text-[10px]">📋</span>
                                                </p>
                                                <span className="text-lg font-black dark:text-white tabular-nums tracking-wider">{pm.number}</span>
                                            </div>
                                        )}
                                        {pm.link && (
                                            <a href={pm.link} target="_blank" className="block mt-2 p-3 text-center rounded-xl border border-zinc-100 dark:border-white/5 active:scale-95 transition-all text-sm font-bold" style={{ color: T6 }}>
                                                {isAr ? 'فتح رابط الدفع' : 'Open Payment Link'} ↗
                                            </a>
                                        )}
                                        {cart.length > 0 && (
                                            <button onClick={() => sendOrder(isAr ? pm.name_ar : (pm.name_en || pm.name_ar))}
                                                className="w-full text-white font-bold py-3 rounded-xl active:scale-95 transition-transform mt-3 flex items-center justify-center gap-2 text-sm"
                                                style={{ backgroundColor: T6 }}>
                                                <FaWhatsapp className="w-4 h-4" />
                                                {isAr ? 'اعتماد الطلب' : 'Confirm Order'}
                                            </button>
                                        )}
                                    </div>
                                )) : (
                                    <div className="block p-5 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-white/5 text-right">
                                        <span className="text-sm font-black text-zinc-800 dark:text-white block mb-1">{isAr ? 'كاش عند الاستلام' : 'Cash on Delivery'}</span>
                                        <p className="text-[10px] text-zinc-400 leading-tight">{isAr ? 'الدفع المباشر كاش للمندوب عند وصول الطلب' : 'Pay cash to the delivery agent'}</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 shrink-0">
                                <button onClick={() => setShowPayMenu(false)}
                                    className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-black text-[11px] active:scale-95 transition-all">
                                    {isAr ? 'إغلاق' : 'Close'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

            </AnimatePresence>

            {/* ─────────── FOOTER ─────────── */}
            <div className="px-6 mt-16 mb-12 text-center">
                <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    className="mb-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 inline-flex items-center gap-2">
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {isDark ? (isAr ? 'الوضع الفاتح' : 'Light Mode') : (isAr ? 'الوضع الداكن' : 'Dark Mode')}
                </button>
            </div>

            {/* ── hide scrollbar CSS ── */}
            <style>{`
                .t6-no-scrollbar::-webkit-scrollbar { display: none; }
                .t6-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                div[style*="scrollbar"] { scrollbar-width: none; }
                div[style*="scrollbar"]::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}
