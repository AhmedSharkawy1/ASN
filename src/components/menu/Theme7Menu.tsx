"use client";
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, MapPin, Phone, Link as LinkIcon,
    Moon, Sun, ShoppingCart, Plus, Minus, Trash2, X, Share2, ArrowRight
} from 'lucide-react';
import { FaWhatsapp, FaFacebook, FaTiktok, FaSnapchat, FaInstagram } from 'react-icons/fa';

/* ───── THEME 7 CONSTANTS ───── */
const T7_BG = '#0b1120';       // dark navy
const T7_BG2 = '#111827';      // slightly lighter navy
const T7_GOLD = '#c9a84c';     // golden accent
const T7_CARD = '#ffffff';     // white card bg
const T7_BORDER = '#1e293b';   // subtle border

/* ───── COMPONENT ───── */
export default function Theme7Menu({ config, categories }: { config: any; categories: any[] }) {
    const { setTheme } = useTheme();
    const isAr = (config.language || 'ar') === 'ar';
    const cur = config.currency || 'EGP';

    /* state */

    const [activeSubCat, setActiveSubCat] = useState(categories[0]?.id || '');
    const [cart, setCart] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<{ item: any; catName: string } | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);

    // item modal
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [notes, setNotes] = useState('');

    // checkout
    const [cust, setCust] = useState({ name: '', phone: '', address: '' });

    const catNavRef = useRef<HTMLDivElement>(null);
    const subCatRef = useRef<HTMLDivElement>(null);



    /* persist cart */
    useEffect(() => {
        try { const s = localStorage.getItem(`cart7_${config.id}`); if (s) setCart(JSON.parse(s)); } catch { /* noop */ }
    }, [config.id]);
    useEffect(() => {
        localStorage.setItem(`cart7_${config.id}`, JSON.stringify(cart));
    }, [cart, config.id]);

    /* intersection observer */
    useEffect(() => {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    setActiveSubCat(e.target.id);
                    const btn = subCatRef.current?.querySelector(`[data-id="${e.target.id}"]`);
                    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }, { rootMargin: '-200px 0px -60% 0px', threshold: 0 });
        categories.forEach(c => { const el = document.getElementById(c.id); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, [categories]);

    /* helpers */

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
        closeModal();
    };

    const closeModal = () => { setSelectedItem(null); setQty(1); setSizeIdx(0); setNotes(''); };
    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
    const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const updateQty = (id: string, n: string, d: number) => {
        setCart(p => p.map(c => (c.id === id && c.notes === n) ? { ...c, quantity: Math.max(0, c.quantity + d) } : c).filter(c => c.quantity > 0));
    };
    const removeCI = (id: string, n: string) => setCart(p => p.filter(c => !(c.id === id && c.notes === n)));
    const itemName = (item: any) => isAr ? item.title_ar : (item.title_en || item.title_ar);

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

    const toggleDark = () => {
        const next = !isDarkMode;
        setIsDarkMode(next);
        setTheme(next ? 'dark' : 'light');
    };

    /* ═══════════ RENDER ═══════════ */
    return (
        <div className="min-h-screen pb-20" dir="rtl"
            style={{ background: isDarkMode ? `linear-gradient(180deg, ${T7_BG} 0%, ${T7_BG2} 100%)` : '#f8fafc', fontFamily: "'Cairo', 'STC', sans-serif", color: isDarkMode ? '#fff' : '#1e293b' }}>

            {/* ─── HERO COVER ─── */}
            <div className="relative h-56 md:h-72 w-full">
                <img src={config.cover_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop'}
                    alt="cover" className="w-full h-full object-cover" />
                {/* dark/light toggle */}
                <button onClick={toggleDark}
                    className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform z-20">
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>

            {/* ─── LOGO + NAME ─── */}
            <div className="relative flex flex-col items-center -mt-16 z-10 px-4">
                <div className="w-32 h-32 rounded-full border-4 overflow-hidden bg-white shadow-xl"
                    style={{ borderColor: isDarkMode ? T7_BG : '#e2e8f0' }}>
                    <img src={config.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=200&auto=format&fit=crop'}
                        alt="logo" className="w-full h-full object-cover" />
                </div>
                <h1 className="mt-3 text-2xl md:text-3xl font-bold text-center" style={{ color: T7_GOLD }}>
                    {config.name}
                </h1>
            </div>

            {/* ─── SOCIAL ICONS ROW ─── */}
            <div className="flex justify-center items-center gap-3 mt-4 flex-wrap px-4">
                <button className="p-2 rounded-full transition-colors" style={{ color: isDarkMode ? '#fff' : '#475569' }}>
                    <Star className="w-5 h-5" />
                </button>
                {config.map_link && (
                    <a href={config.map_link} target="_blank" className="p-2 rounded-full transition-colors" style={{ color: isDarkMode ? '#fff' : '#475569' }}>
                        <MapPin className="w-5 h-5" />
                    </a>
                )}
                {config.facebook_url && (
                    <a href={config.facebook_url} target="_blank" className="p-2 rounded-full transition-colors" style={{ color: isDarkMode ? '#fff' : '#475569' }}>
                        <FaFacebook className="w-5 h-5" />
                    </a>
                )}
                {config.whatsapp_number && (
                    <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}`} target="_blank" className="p-2 rounded-full transition-colors" style={{ color: isDarkMode ? '#fff' : '#475569' }}>
                        <FaWhatsapp className="w-5 h-5" />
                    </a>
                )}
                <button className="p-2 rounded-full transition-colors" style={{ color: isDarkMode ? '#fff' : '#475569' }}>
                    <FaInstagram className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full transition-colors" style={{ color: isDarkMode ? '#fff' : '#475569' }}>
                    <FaSnapchat className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full transition-colors" style={{ color: isDarkMode ? '#fff' : '#475569' }}>
                    <FaTiktok className="w-5 h-5" />
                </button>
                {config.phone && (
                    <a href={`tel:${config.phone}`} className="p-2 rounded-full transition-colors" style={{ color: isDarkMode ? '#fff' : '#475569' }}>
                        <Phone className="w-5 h-5" />
                    </a>
                )}
                <button onClick={() => { if (navigator.share) navigator.share({ title: config.name, url: location.href }); else { navigator.clipboard.writeText(location.href); } }}
                    className="p-2 rounded-full transition-colors" style={{ color: isDarkMode ? '#fff' : '#475569' }}>
                    <LinkIcon className="w-5 h-5" />
                </button>
            </div>

            {/* ─── STICKY NAV: TEXT TABS + CIRCULAR SUB-CATS ─── */}
            <div className="sticky top-0 z-[100] mt-6" style={{ backgroundColor: isDarkMode ? T7_BG : '#f8fafc' }}>
                {/* Text tab categories */}
                <div ref={catNavRef}
                    className="flex items-center overflow-x-auto px-4 gap-6 py-3 border-b"
                    style={{ scrollbarWidth: 'none', borderColor: isDarkMode ? T7_BORDER : '#e2e8f0' }}>
                    {categories.map((cat: any) => {
                        const isActive = activeSubCat === cat.id;
                        return (
                            <button key={cat.id}
                                onClick={() => document.getElementById(cat.id)?.scrollIntoView({ behavior: 'smooth' })}
                                className="shrink-0 text-base font-bold pb-1 transition-all whitespace-nowrap"
                                style={{
                                    color: isActive ? T7_GOLD : (isDarkMode ? '#94a3b8' : '#64748b'),
                                    borderBottom: isActive ? `2px solid ${T7_GOLD}` : '2px solid transparent',
                                }}>
                                {isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}
                            </button>
                        );
                    })}
                </div>

                {/* Circular sub-category images */}
                <div ref={subCatRef}
                    className="flex items-start overflow-x-auto px-4 gap-5 py-4"
                    style={{ scrollbarWidth: 'none' }}>
                    {categories.map((cat: any) => {
                        const isActive = activeSubCat === cat.id;
                        return (
                            <button key={cat.id} data-id={cat.id}
                                onClick={() => document.getElementById(cat.id)?.scrollIntoView({ behavior: 'smooth' })}
                                className="flex flex-col items-center gap-2 shrink-0 min-w-[80px]">
                                <div className={`w-20 h-20 rounded-full overflow-hidden border-2 transition-all shadow-md
                                    ${isActive ? 'border-amber-500 scale-105' : (isDarkMode ? 'border-zinc-700' : 'border-zinc-200')}`}>
                                    {cat.image_url
                                        ? <img src={cat.image_url} alt={cat.name_ar} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-2xl"
                                            style={{ background: isDarkMode ? '#1e293b' : '#f1f5f9' }}>{cat.emoji || '🍽️'}</div>
                                    }
                                </div>
                                <span className="text-xs font-bold text-center leading-tight"
                                    style={{ color: isActive ? T7_GOLD : (isDarkMode ? '#94a3b8' : '#64748b') }}>
                                    {isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── MENU SECTIONS ─── */}
            <main className="mt-2 space-y-10 px-4 md:px-6">
                {categories.filter((c: any) => c.items?.length > 0).map((section: any) => (
                    <section key={section.id} id={section.id}>
                        {/* Section title */}
                        <h2 className="text-2xl font-bold mb-6 text-right" style={{ color: isDarkMode ? '#fff' : '#0f172a' }}>
                            {isAr ? section.name_ar : (section.name_en || section.name_ar)}
                        </h2>

                        {/* Item cards */}
                        <div className="flex flex-col gap-5">
                            {section.items.filter((i: any) => i.is_available !== false).map((item: any) => (
                                <div key={item.id}
                                    onClick={() => setSelectedItem({ item, catName: isAr ? section.name_ar : (section.name_en || section.name_ar) })}
                                    className="flex items-start gap-4 cursor-pointer rounded-2xl p-3 transition-all active:scale-[0.98]"
                                    style={{
                                        background: isDarkMode ? 'rgba(255,255,255,0.03)' : T7_CARD,
                                        border: `1px solid ${isDarkMode ? T7_BORDER : '#e2e8f0'}`,
                                    }}>

                                    {/* IMAGE — LEFT side (second child in RTL flex = visually LEFT) */}
                                    <div className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden order-last"
                                        style={{ background: isDarkMode ? '#1e293b' : '#f1f5f9' }}>
                                        {item.image_url
                                            ? <img src={item.image_url} alt={item.title_ar} className="w-full h-full object-cover" loading="lazy"
                                                onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop'; }} />
                                            : <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">{section.emoji || '🍽️'}</div>
                                        }
                                    </div>

                                    {/* TEXT — RIGHT side (first child in RTL flex = visually RIGHT) */}
                                    <div className="flex-1 flex flex-col text-right min-h-[100px] justify-between">
                                        <div>
                                            <h3 className="text-base font-bold mb-1" style={{ color: isDarkMode ? '#fff' : '#0f172a' }}>
                                                {itemName(item)}
                                            </h3>
                                            {item.desc_ar && (
                                                <p className="text-sm leading-relaxed mb-2" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                                                    {isAr ? item.desc_ar : (item.desc_en || '')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Price badge(s) — white bg, rounded, border */}
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            {item.prices.map((price: number, pIdx: number) => {
                                                const lbl = item.size_labels?.[pIdx];
                                                return (
                                                    <div key={pIdx}
                                                        className="px-3 py-1 rounded-lg text-sm font-bold shadow-sm"
                                                        style={{
                                                            background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#fff',
                                                            color: isDarkMode ? '#fff' : '#0f172a',
                                                            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}`,
                                                        }}>
                                                        {cur} {price.toFixed(2)}{lbl ? ` (${lbl})` : ''}
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

            {/* ─── FOOTER ─── */}
            <div className="mt-16 px-6 pb-8 text-center space-y-4">
                <div className="border-t pt-6 space-y-2" style={{ borderColor: isDarkMode ? T7_BORDER : '#e2e8f0' }}>
                    <p className="text-sm font-bold" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                        {isAr ? 'جميع الأسعار تشمل الخدمة' : 'All prices include service'}
                    </p>
                    <p className="text-xs" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                        {isAr ? `نشكركم على اختياركم ${config.name}` : `Thank you for choosing ${config.name}`}
                    </p>
                </div>
                <button className="px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                    style={{
                        background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#fff',
                        color: isDarkMode ? '#fff' : '#0f172a',
                        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}`,
                    }}>
                    {isAr ? 'الملاحظات والتقييم' : 'Feedback & Rating'}
                </button>
            </div>

            {/* ─── FLOATING WHATSAPP ─── */}
            {config.whatsapp_number && (
                <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}`} target="_blank"
                    className="fixed bottom-24 right-5 bg-[#25D366] w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 z-[120] transition-transform">
                    <FaWhatsapp className="w-7 h-7" />
                </a>
            )}

            {/* ─── CART BAR ─── */}
            <AnimatePresence>
                {cartCount > 0 && !isCartOpen && (
                    <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                        className="fixed bottom-4 left-4 right-4 z-[150]">
                        <button onClick={() => setIsCartOpen(true)}
                            className="w-full text-white rounded-xl py-3 px-4 flex items-center justify-between font-bold shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${T7_GOLD}, #b8942e)` }}>
                            <div className="flex items-center gap-2">
                                <div className="bg-white/20 px-2 py-0.5 rounded-md text-xs">{cartCount} {isAr ? 'صنف' : 'items'}</div>
                                <div className="flex items-center gap-1">
                                    <span>{cartTotal.toFixed(2)}</span>
                                    <span className="text-xs">{cur}</span>
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

            {/* ═══════ MODALS ═══════ */}
            <AnimatePresence>

                {/* ── ITEM DETAIL MODAL ── */}
                {selectedItem && (
                    <div className="fixed inset-0 z-[400] flex flex-col" style={{ background: isDarkMode ? T7_BG : '#f8fafc' }}
                        onClick={closeModal}>
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                            className="flex-1 flex flex-col overflow-y-auto"
                            onClick={e => e.stopPropagation()}>
                            {/* big image */}
                            <div className="relative w-full h-72 md:h-96 shrink-0" style={{ background: isDarkMode ? '#1e293b' : '#e2e8f0' }}>
                                <img src={selectedItem.item.image_url || config.cover_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800'}
                                    alt="" className="w-full h-full object-cover" />
                                <button onClick={closeModal}
                                    className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm text-white shadow-md active:scale-90 z-10">
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                                <button onClick={() => { if (navigator.share) navigator.share({ title: itemName(selectedItem.item), url: location.href }); }}
                                    className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm text-white shadow-md active:scale-90 z-10">
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* content */}
                            <div className="p-5 flex-1 flex flex-col gap-5 text-right" dir="rtl">
                                <div>
                                    <h2 className="text-xl font-bold mb-2" style={{ color: isDarkMode ? '#fff' : '#0f172a' }}>
                                        {itemName(selectedItem.item)}
                                    </h2>
                                    <p className="text-sm leading-relaxed" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                                        {isAr ? selectedItem.item.desc_ar : (selectedItem.item.desc_en || selectedItem.item.desc_ar || '')}
                                    </p>
                                </div>

                                {/* Price display */}
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {selectedItem.item.prices.map((price: number, idx: number) => {
                                        const lbl = selectedItem.item.size_labels?.[idx];
                                        return (
                                            <div key={idx} className="px-4 py-2 rounded-lg text-base font-bold"
                                                style={{
                                                    background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#fff',
                                                    color: isDarkMode ? '#fff' : '#0f172a',
                                                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}`,
                                                }}>
                                                {cur} {price.toFixed(2)}{lbl ? ` (${lbl})` : ''}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Size options */}
                                {selectedItem.item.prices.length > 1 && (
                                    <div className="flex flex-col gap-2">
                                        <h3 className="font-bold text-sm" style={{ color: T7_GOLD }}>
                                            {isAr ? 'اختر الحجم' : 'Choose Size'}
                                        </h3>
                                        {selectedItem.item.prices.map((price: number, idx: number) => {
                                            const label = selectedItem.item.size_labels?.[idx] || (isAr ? `خيار ${idx + 1}` : `Option ${idx + 1}`);
                                            const sel = sizeIdx === idx;
                                            return (
                                                <label key={idx}
                                                    className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all"
                                                    style={{
                                                        borderColor: sel ? T7_GOLD : (isDarkMode ? T7_BORDER : '#e2e8f0'),
                                                        background: sel ? (isDarkMode ? 'rgba(201,168,76,0.1)' : '#fffbeb') : 'transparent',
                                                    }}>
                                                    <span className="text-sm font-bold">{price.toFixed(2)} {cur}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold">{label}</span>
                                                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                                                            style={{ borderColor: sel ? T7_GOLD : (isDarkMode ? '#475569' : '#94a3b8') }}>
                                                            {sel && <div className="w-2.5 h-2.5 rounded-full" style={{ background: T7_GOLD }} />}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Notes */}
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder={isAr ? 'ملاحظات خاصة (اختياري)' : 'Special notes (optional)'}
                                    className="w-full rounded-xl p-3 text-sm text-right outline-none resize-none h-20"
                                    style={{
                                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                                        border: `1px solid ${isDarkMode ? T7_BORDER : '#e2e8f0'}`,
                                        color: isDarkMode ? '#fff' : '#0f172a',
                                    }} />
                            </div>

                            {/* Add to cart bar */}
                            <div className="p-4 flex items-center gap-4 shrink-0 border-t"
                                style={{ borderColor: isDarkMode ? T7_BORDER : '#e2e8f0', background: isDarkMode ? T7_BG : '#fff' }}>
                                <div className="flex items-center justify-between rounded-xl p-1 w-32 shrink-0"
                                    style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9' }}>
                                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg"
                                        style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#fff' }}>
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="font-bold text-sm">{qty}</span>
                                    <button onClick={() => setQty(qty + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg"
                                        style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#fff' }}>
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <button onClick={addToCart} className="flex-1 text-white rounded-xl py-3 px-4 flex items-center justify-between font-bold active:scale-95 transition-transform"
                                    style={{ background: `linear-gradient(135deg, ${T7_GOLD}, #b8942e)` }}>
                                    <div className="flex items-center gap-1">
                                        <span>{((selectedItem.item.prices[sizeIdx] || 0) * qty).toFixed(2)}</span>
                                        <span className="text-xs">{cur}</span>
                                    </div>
                                    <span>{isAr ? 'أضف للسلة' : 'Add to Cart'}</span>
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
                            style={{ background: isDarkMode ? T7_BG2 : '#fff' }}
                            onClick={e => e.stopPropagation()}>
                            {/* header */}
                            <div className="p-4 flex items-center justify-between shrink-0 border-b" style={{ borderColor: isDarkMode ? T7_BORDER : '#e2e8f0' }}>
                                <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-full" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                                    <X className="w-5 h-5" />
                                </button>
                                <h2 className="text-lg font-bold">{isAr ? 'السلة' : 'Cart'}</h2>
                                <div className="w-9" />
                            </div>

                            {/* items */}
                            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4 text-right" dir="rtl">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12" style={{ color: isDarkMode ? '#475569' : '#94a3b8' }}>
                                        <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
                                        <p>{isAr ? 'السلة فارغة' : 'Cart is empty'}</p>
                                    </div>
                                ) : cart.map(ci => (
                                    <div key={`${ci.id}-${ci.notes}`} className="flex items-start gap-3 p-3 rounded-2xl"
                                        style={{ background: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: `1px solid ${isDarkMode ? T7_BORDER : '#e2e8f0'}` }}>
                                        <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden" style={{ background: isDarkMode ? '#1e293b' : '#e2e8f0' }}>
                                            <img src={ci.item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200'} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col gap-1">
                                            <div className="flex justify-between items-start">
                                                <button onClick={() => removeCI(ci.id, ci.notes)} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                                <h3 className="font-bold text-sm">{itemName(ci.item)}</h3>
                                            </div>
                                            {ci.notes && <p className="text-[10px] italic" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>{ci.notes}</p>}
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center justify-between rounded-lg p-1 w-24"
                                                    style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9', border: `1px solid ${isDarkMode ? T7_BORDER : '#e2e8f0'}` }}>
                                                    <button onClick={() => updateQty(ci.id, ci.notes, -1)} className="w-6 h-6 flex items-center justify-center rounded"><Minus className="w-3 h-3" /></button>
                                                    <span className="font-bold text-xs">{ci.quantity}</span>
                                                    <button onClick={() => updateQty(ci.id, ci.notes, 1)} className="w-6 h-6 flex items-center justify-center rounded"><Plus className="w-3 h-3" /></button>
                                                </div>
                                                <span className="font-bold text-sm" style={{ color: T7_GOLD }}>{(ci.price * ci.quantity).toFixed(2)} {cur}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* checkout */}
                            {cart.length > 0 && (
                                <div className="p-4 shrink-0 border-t" style={{ borderColor: isDarkMode ? T7_BORDER : '#e2e8f0' }}>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold text-lg" style={{ color: T7_GOLD }}>{cartTotal.toFixed(2)} {cur}</span>
                                        <span className="text-sm" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>{isAr ? 'الاجمالي' : 'Total'}</span>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        <input type="text" placeholder={isAr ? 'الاسم' : 'Name'} value={cust.name} onChange={e => setCust(p => ({ ...p, name: e.target.value }))}
                                            className="w-full rounded-xl px-4 py-3 text-right outline-none text-sm"
                                            style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${isDarkMode ? T7_BORDER : '#e2e8f0'}`, color: isDarkMode ? '#fff' : '#0f172a' }} />
                                        <input type="tel" placeholder={isAr ? 'رقم الموبايل' : 'Phone'} value={cust.phone} onChange={e => setCust(p => ({ ...p, phone: e.target.value }))}
                                            className="w-full rounded-xl px-4 py-3 text-right outline-none text-sm"
                                            style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${isDarkMode ? T7_BORDER : '#e2e8f0'}`, color: isDarkMode ? '#fff' : '#0f172a' }} />
                                        <textarea placeholder={isAr ? 'العنوان' : 'Address'} value={cust.address} onChange={e => setCust(p => ({ ...p, address: e.target.value }))}
                                            className="w-full rounded-xl px-4 py-3 text-right outline-none h-16 resize-none text-sm"
                                            style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${isDarkMode ? T7_BORDER : '#e2e8f0'}`, color: isDarkMode ? '#fff' : '#0f172a' }} />
                                    </div>
                                    <button onClick={() => sendOrder(isAr ? 'كاش عند الاستلام' : 'Cash on Delivery')}
                                        className="w-full text-white rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                        style={{ background: `linear-gradient(135deg, ${T7_GOLD}, #b8942e)` }}>
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
