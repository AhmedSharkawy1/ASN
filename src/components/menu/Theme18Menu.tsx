'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Moon, Sun, ShoppingCart, Plus, Minus, Trash2, X, FileText, MapPin as MapIcon, List, Globe, PhoneCall } from 'lucide-react';
import { FaWhatsapp, FaFacebookF, FaSnapchatGhost, FaInstagram , FaTiktok } from 'react-icons/fa';
import SharedMarquee from './SharedMarquee';
import CheckoutModal from './CheckoutModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import ASNFooter from '@/components/menu/ASNFooter';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

// ================= THEME 10 CONSTANTS =================
const T18_PRIMARY = '#ea580c'; // orange-600

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
        primary?: string;
        secondary?: string;
        background?: string;
        text?: string;
    };
    cover_images?: string[];
    marquee_enabled?: boolean;
    marquee_text_ar?: string;
    marquee_text_en?: string;
    orders_enabled?: boolean;
    order_channel?: 'whatsapp' | 'website' | 'both';
    show_asn_branding?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface Theme18MenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
}

export default function Theme18Menu({ config, categories, restaurantId }: Theme18MenuProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isPhoneMenuOpen, setIsPhoneMenuOpen] = useState(false);
    useEffect(() => setMounted(true), []);

    const isAr = config.default_language === 'ar' || true; // Defaulting to true for now since design is RTL primary
    const isDark = mounted && theme === 'dark';
    const cur = config.currency || (isAr ? "ج.م" : "EGP");

    // Theme Variables - matching HTML
    const bgBody = '#0d0f14'; // slate-900 / slate-50
    const bgCard = '#1a1d24'; // slate-800 / white
    const textMain = '#ededed'; // slate-100 / slate-900
    const textMuted = '#999999'; // slate-400 / slate-500
    const borderColor = '#333333'; // slate-700 / slate-200
    const primaryColor = config.theme_colors?.primary || T18_PRIMARY;

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
    const isManualScroll = useRef(false);
    const catNavRef = useRef<HTMLDivElement>(null);

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

    // Modals
    const openModal = (item: MenuItem, cName: string, cImg?: string) => {
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
        setIsCartOpen(true);
    };

    const updateQty = (id: string, itemNotes: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id === id && c.notes === itemNotes) {
                const n = c.quantity + delta;
                return n > 0 ? { ...c, quantity: n } : { ...c, quantity: 0 };
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

    // Filter Logic - Always show all categories for scroll-sync
    const activeCatList = categories;

    const scrollToSection = (id: string) => {
        if (id === 'all') {
            setActiveCategory('all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        isManualScroll.current = true;
        setActiveCategory(id);

        const el = document.getElementById(id);
        if (el) {
            const offset = 120;
            const pos = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: pos, behavior: 'smooth' });
        }

        setTimeout(() => {
            isManualScroll.current = false;
        }, 800);
    };

    // --- Intersection Observer to Sync Category Bar ---
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-100px 0px -50% 0px',
            threshold: 0
        };

        const handleIntersect = (entries: IntersectionObserverEntry[]) => {
            if (isManualScroll.current) return;

            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveCategory(entry.target.id);
                    
                    // Center the active tab
                    const container = catNavRef.current;
                    const activeBtn = container?.querySelector(`[data-cat-id="${entry.target.id}"]`) as HTMLElement;
                    if (container && activeBtn) {
                        const scrollLeft = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
                        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
                    }
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersect, observerOptions);
        categories.forEach((cat) => {
            const el = document.getElementById(cat.id.toString());
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [categories]);

    if (!mounted) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;

    return (
    <>
        <div className="min-h-screen font-cairo pb-24" style={{ backgroundColor: bgBody, color: textMain }} dir={isAr ? 'rtl' : 'ltr'}>
            {/* Header Marquee */}
            {config.marquee_enabled && (
                <div className="bg-[#f97316] font-cairo text-sm text-white">
                    <SharedMarquee text={isAr ? (config.marquee_text_ar || '') : (config.marquee_text_en || config.marquee_text_ar || '')} />
                </div>
            )}

            {/* Cart Button */}
            {config.orders_enabled !== false && (
                <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 right-6 z-50 w-14 h-14 flex items-center justify-center rounded-full text-white shadow-lg bg-[#f97316] transition-transform active:scale-95 hover:bg-orange-600">
                    <ShoppingCart className="w-6 h-6" />
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-xs font-bold flex items-center justify-center border-2 border-[#f97316] text-[#f97316]">
                            {cartCount}
                        </span>
                    )}
                </button>
            )}

            {/* Header Section */}
            <div className="text-center mb-8 pt-8">
                {config.logo_url && (
                    <img src={config.logo_url} alt={config.name} className="w-[100px] h-[100px] rounded-full object-cover mb-3 mx-auto" />
                )}
                <h1 className="text-[2em] font-black text-center">{config.name}</h1>
                <p className="text-[#999999] text-[0.9em] mt-1">
                    {(config.phone || config.phone_numbers?.[0]?.number || config.phone_numbers?.[0]) && `📞 ${config.phone || config.phone_numbers?.[0]?.number || config.phone_numbers?.[0]}`}
                    {config.address && ` • 📍 ${config.address}`}
                </p>
                <p className="text-[#999999] text-[0.9em] mt-1">
                    🚚 {isAr ? 'توصيل متاح' : 'Delivery Available'}
                     • 🍽️ {isAr ? 'داين إن متاح' : 'Dine-in Available'}
                </p>
            </div>

            <main className="max-w-[900px] mx-auto px-5 w-full">
                <p className="text-center mb-6">
                    {isAr ? `تصفح منيو ${config.name} الكامل بالأسعار والصور.` : `Browse ${config.name} full menu with prices and photos.`}
                </p>

                {categories.map((category) => {
                    const items = category.items || [];
                    if (items.length === 0) return null;

                    return (
                        <div key={category.id} id={category.id.toString()} className="mb-10">
                            <h2 className="text-[1.5em] font-bold text-[#f97316] mt-[2em] border-b-2 border-[#f97316] pb-2 mb-4">
                                {catName(category)}
                            </h2>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 mt-3">
                                {items.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="bg-[#1a1d24] border border-[#333333] rounded-[12px] p-4 overflow-hidden cursor-pointer hover:border-[#f97316] transition-colors"
                                        onClick={() => openModal(item, catName(category), category.image_url)}
                                    >
                                        <img 
                                            src={item.image_url || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                                            alt={itemName(item)} 
                                            loading="lazy"
                                            className="w-full h-[160px] object-cover rounded-[8px] mb-2" 
                                        />
                                        <h3 className="font-bold text-[1.1em] m-0 mb-1">{itemName(item)}</h3>
                                        {(item.description_ar || item.desc_ar) && (
                                            <p className="text-[#999999] text-sm mb-2 line-clamp-2">
                                                {isAr ? (item.description_ar || item.desc_ar) : (item.description_en || item.desc_en || item.description_ar || item.desc_ar)}
                                            </p>
                                        )}
                                        <p className="text-[#f97316] font-bold text-[1.1em]">
                                            {item.prices?.[0]} {cur}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                                })}
            </main>

            {/* Target Footer Replica */}
            <footer style={{ marginTop: '3em', paddingTop: '2em', borderTop: '1px solid #333', textAlign: 'center', color: '#666' }}>
                <p>منيو {config.name} على <a href="https://menumasr.com" style={{ color: '#f97316' }}>منيو مصر</a></p>
                <p className="mt-2 space-x-2 space-x-reverse">
                    <a href="https://menumasr.com/منيو-الكتروني" style={{ color: '#f97316' }}>منيو الكتروني</a> • 
                    <a href="https://menumasr.com/منيو-رقمي" style={{ color: '#f97316' }}>منيو رقمي</a> • 
                    <a href="https://menumasr.com/منيو-qr-code" style={{ color: '#f97316' }}>منيو QR Code</a>
                </p>
            </footer>
        </div>

            {/* Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 sm: backdrop-blur-md py-16 px-6 mb-safe"
                        onClick={closeModal}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-[85vw] max-w-[310px] max-h-[85vh] rounded-[24px] overflow-hidden flex flex-col shadow-2xl mx-auto"
                            style={{ backgroundColor: bgCard }}
                            onClick={e => e.stopPropagation()}>

                            {/* Close Button UI */}
                            <button onClick={closeModal} className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-colors">
                                <X className="w-5 h-5" />
                            </button>

                            {/* Modal Header Image */}
                            <div className="w-full h-[35vh] md:h-[40vh] shrink-0 relative bg-slate-100 dark:bg-slate-800">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                <img src={selectedItem.item.image_url || selectedItem.catImg || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600'}
                                    alt={itemName(selectedItem.item)} className="w-full h-full object-contain" />

                                <div className="absolute bottom-4 left-4 right-4 z-20" dir={isAr ? 'rtl' : 'ltr'}>
                                    <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md mb-1">{itemName(selectedItem.item)}</h2>
                                    {(selectedItem.item.desc_ar || selectedItem.item.desc_en || selectedItem.item.description_ar || selectedItem.item.description_en) && (
                                    <p className="text-white/90 text-sm sm:text-base font-bold drop-shadow-sm">
                                        {isAr ? (selectedItem.item.desc_ar || selectedItem.item.description_ar) : (selectedItem.item.desc_en || selectedItem.item.description_en || selectedItem.item.desc_ar || selectedItem.item.description_ar)}
                                    </p>
                                    )}
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-4 pb-20" style={{ color: textMain }}>

                                {/* Base Price */}
                                <div className="flex justify-between items-center bg-[#0d0f14] border p-4 rounded-xl mb-6" style={{ borderColor }}>
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
                                        <button onClick={addToCart} className="flex-1 min-h-[44px] py-2 px-3 rounded-full text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md hover:shadow-lg whitespace-nowrap overflow-hidden"
                                            style={{ backgroundColor: primaryColor }}>
                                            <ShoppingCart className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{isAr ? 'أضف للسلة' : 'Add'}</span>
                                            <span className="shrink-0">{cur}{(((selectedItem.item.prices[sizeIdx] || 0) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty).toFixed?.(0)}</span>
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
                        className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center py-16 px-6 mb-safe"
                        onClick={() => setIsCartOpen(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`relative w-[85vw] max-w-[310px] max-h-[85vh] overflow-hidden rounded-[2rem] mx-auto flex flex-col shadow-2xl`}
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
                                            <div key={i} className="flex gap-4 p-4 rounded-3xl bg-[#1a1d24] shadow-sm border" style={{ borderColor }}>
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
                                <div className="p-4 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] border-t z-20" style={{ backgroundColor: bgCard, borderColor }}>
                                    <div className="flex justify-between items-center mb-4 text-sm font-bold" style={{ color: textMain }}>
                                        <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                                        <span className="text-xl font-black" style={{ color: primaryColor }}>{cur}{cartTotal.toFixed?.(0)}</span>
                                    </div>
                                    <button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full flex justify-center items-center gap-2 h-11 rounded-full text-white font-bold text-base transition-transform active:scale-95 shadow-lg"
                                        style={{ backgroundColor: '#10b981' }}>
                                        {isAr ? 'إتمام الطلب' : 'Proceed to Checkout'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ASNFooter show={config.show_asn_branding !== false} />
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
                whatsappNumber={config.whatsapp_number || config.social_links?.whatsapp}
                currency={cur || 'ج.م'}
                language={isAr ? 'ar' : 'en'}
                orderChannel={config.order_channel}
                onOrderSuccess={() => { setCart([]); setIsCartOpen(false); }}
            />
        </>
    );
}
