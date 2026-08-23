'use client';
import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';

import { parseCurrency } from '@/lib/currency';
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2, X, FileText, Search, Share2, LogOut, ArrowRight, Tag, Home, ShoppingBag, User, Moon, Sun, ArrowLeft, LayoutGrid, LayoutList, CreditCard, Maximize2, ExternalLink } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import ASNFooter from '@/components/menu/ASNFooter';
import CheckoutModal from './CheckoutModal';
import SharedMarquee from './SharedMarquee';
import { FaWhatsapp, FaFacebookF, FaSnapchatGhost, FaInstagram, FaTiktok, FaMapMarkerAlt, FaPhoneAlt, FaYoutube } from 'react-icons/fa';

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
    theme_colors?: any;
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

interface LametZamanMenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
}

export default function LametZamanMenu({ config, categories, restaurantId }: LametZamanMenuProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Apply restaurant's default theme mode on first load
    useEffect(() => {
        if (config.default_theme_mode && config.default_theme_mode !== 'system') {
            setTheme(config.default_theme_mode);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [currentLang, setCurrentLang] = useState<'ar'|'en'>(config.default_language === 'en' ? 'en' : 'ar');
    const isAr = currentLang === 'ar';
    const isDark = mounted && theme === 'dark';
    const cur = parseCurrency(config?.currency, isAr);

    const getLametZamanPrimaryColor = (themeName?: string, customPrimary?: string) => {
        if (customPrimary) return customPrimary;
        if (!themeName) return '#f97316';
        if (themeName.endsWith('-red')) return '#ef4444';
        if (themeName.endsWith('-emerald')) return '#10b981';
        if (themeName.endsWith('-cyan')) return '#06b6d4';
        if (themeName.endsWith('-sky')) return '#0284c7';
        if (themeName.endsWith('-purple')) return '#8b5cf6';
        if (themeName.endsWith('-gold')) return '#d4af37';
        if (themeName.endsWith('-pink')) return '#ec4899';
        if (themeName.endsWith('-dark')) return '#1e293b';
        return '#f97316';
    };

    const primaryColor = getLametZamanPrimaryColor(config?.theme, config?.theme_colors?.primary);
    
    // Extract background images if present
    let tc = config?.theme_colors || {};
    if (typeof tc === 'string') {
        try {
            tc = JSON.parse(tc);
        } catch {
            tc = {};
        }
    }
    const bgImageLight = tc.lamet_zaman_bg_light || tc.bg_image_light || tc.bg_light || tc.aswan_bg_light || tc.background_image_light || config?.lamet_zaman_bg_light || config?.bg_image_light || config?.aswan_bg_light || '';
    const bgImageDark = tc.lamet_zaman_bg_dark || tc.bg_image_dark || tc.bg_dark || tc.aswan_bg_dark || tc.background_image_dark || config?.lamet_zaman_bg_dark || config?.bg_image_dark || config?.aswan_bg_dark || '';

    let activeBgImage = isDark ? (bgImageDark || bgImageLight) : (bgImageLight || bgImageDark);
    activeBgImage = (activeBgImage || '').trim();
    const hasBgImage = Boolean(activeBgImage && activeBgImage.length > 0);

    // Theme colors matching the screenshots
    const bgBody = isDark ? '#111111' : '#f9fafb';
    const bgCard = hasBgImage ? (isDark ? 'rgba(28, 28, 30, 0.90)' : 'rgba(255, 255, 255, 0.94)') : (isDark ? '#1c1c1e' : '#ffffff');
    const textMain = isDark ? '#ffffff' : '#000000';
    const textMuted = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#333333' : '#f3f4f6';

    const phoneList: { label: string; number: string }[] = (() => {
        const list: { label: string; number: string }[] = [];
        if (Array.isArray(config?.phone_numbers) && config.phone_numbers.length > 0) {
            config.phone_numbers.forEach((p: any, idx: number) => {
                if (typeof p === 'object' && p?.number) {
                    list.push({
                        label: p.label || (isAr ? (config.phone_numbers.length > 1 ? `رقم التواصل ${idx + 1}` : 'رقم الدليفري') : (config.phone_numbers.length > 1 ? `Contact ${idx + 1}` : 'Delivery Number')),
                        number: String(p.number).trim()
                    });
                } else if (typeof p === 'string' && p.trim()) {
                    list.push({
                        label: isAr ? (config.phone_numbers.length > 1 ? `رقم التواصل ${idx + 1}` : 'رقم الدليفري') : (config.phone_numbers.length > 1 ? `Contact ${idx + 1}` : 'Delivery Number'),
                        number: p.trim()
                    });
                }
            });
        }
        if (config?.phone && typeof config.phone === 'string') {
            const parts = config.phone.split(/[,/|\n]+/).map((s: string) => s.trim()).filter(Boolean);
            parts.forEach((num: string) => {
                if (!list.some(existing => existing.number === num)) {
                    list.push({
                        label: isAr ? (parts.length > 1 || list.length > 0 ? `رقم التواصل ${list.length + 1}` : 'رقم الدليفري') : (parts.length > 1 || list.length > 0 ? `Contact ${list.length + 1}` : 'Delivery Number'),
                        number: num
                    });
                }
            });
        }
        return list;
    })();

    // State
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [navTab, setNavTab] = useState('menu'); // menu, cart, contact
    const [viewMode, setViewMode] = useState<'grid'|'list'|'single'>('grid');

    // Scroll Spy
    useEffect(() => {
        const handleScroll = () => {
            if (searchQuery) return;
            const scrollPosition = window.scrollY + 120;
            
            if (window.scrollY < 200) {
                if (activeCategory !== 'all') {
                    setActiveCategory('all');
                    document.getElementById('nav-cat-all')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
                return;
            }

            let newActive = activeCategory;
            for (let i = categories.length - 1; i >= 0; i--) {
                const el = document.getElementById(categories[i].id.toString());
                if (el && el.offsetTop <= scrollPosition) {
                    newActive = categories[i].id.toString();
                    break;
                }
            }

            if (newActive !== activeCategory && newActive !== 'all') {
                setActiveCategory(newActive);
                document.getElementById(`nav-cat-${newActive}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [categories, activeCategory, searchQuery]);

    // Modals & Cart
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; catName: string; catImg?: string } | null>(null);
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [notes, setNotes] = useState('');
    const [selectedExtras, setSelectedExtras] = useState<{ id: number | string, name: string, price: number }[]>([]);
    
    const [cart, setCart] = useState<{ id: string, item: MenuItem, catName: string, price: number, sizeLabel: string, quantity: number, notes: string }[]>([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showMenuCategories, setShowMenuCategories] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const itemName = (item: MenuItem) => isAr ? item.title_ar : (item.title_en || item.title_ar);
    const catName = (cat: CategoryWithItemsType) => isAr ? cat.name_ar : (cat.name_en || cat.name_ar);

    const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
    const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

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

    const updateQty = (id: string, notes: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id === id && c.notes === notes) {
                const nq = c.quantity + delta;
                return { ...c, quantity: nq };
            }
            return c;
        }).filter(c => c.quantity > 0));
    };

    const handleShare = async () => {
        const shareData = {
            title: config.name,
            text: isAr ? `تصفح منيو ${config.name}` : `Check out ${config.name}'s menu`,
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
            alert(isAr ? 'تم نسخ الرابط!' : 'Link copied to clipboard!');
        }
    };

    const activeCatList = categories;

    // Flatten all items for search & featured
    // Annotated so the MenuItem index signature survives the spread — without it
    // TS narrows to a literal type and loses thumbnail_url / old_prices.
    const allItems: (MenuItem & { catName: string })[] = categories.flatMap(c => (c.items || []).map(i => ({...i, catName: catName(c)})));
    const featuredItems = allItems.filter(item => item.is_popular); 

    const searchedCategories = categories.map(cat => ({
        ...cat,
        items: (cat.items || []).filter(item => itemName(item).toLowerCase().includes(searchQuery.toLowerCase()))
    })).filter(cat => cat.items.length > 0);

    const displayCategories = searchQuery ? searchedCategories : activeCatList;

    if (!mounted) return <div className="min-h-screen" style={{ backgroundColor: bgBody }} />;

    return (
        <div 
            className="min-h-screen font-cairo pb-32 relative transition-colors duration-300 antialiased" 
            style={{ backgroundColor: hasBgImage ? 'transparent' : bgBody, color: textMain }} 
            dir={isAr ? 'rtl' : 'ltr'}
        >
            {/* Fixed Background Image Layer */}
            {hasBgImage && (
                <div 
                    className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
                    style={{
                        backgroundImage: `url("${activeBgImage}")`
                    }}
                />
            )}

            {/* Subtle Overlay for Text Contrast */}
            {hasBgImage && (
                <div 
                    className="fixed inset-0 pointer-events-none transition-opacity duration-300 z-0"
                    style={{
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.35)'
                    }}
                />
            )}

            <div className="relative z-10">
                {/* --- MARQUEE --- */}
                {config.marquee_enabled && (
                    <div className="text-sm text-white" style={{ backgroundColor: primaryColor }}>
                        <SharedMarquee text={isAr ? (config.marquee_text_ar || '') : (config.marquee_text_en || config.marquee_text_ar || '')} />
                    </div>
                )}

                {/* --- HEADER --- */}
                <div className="px-5 pt-8 pb-4" style={{ backgroundColor: hasBgImage ? 'transparent' : bgBody }}>
                <div className="flex justify-between items-center mb-6">
                    {/* Share button on the right side of the logo (left in LTR, right in RTL) */}
                    <button onClick={handleShare} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 transition-colors shadow-sm">
                        <Share2 className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        {config.logo_url && (
                            <OptimizedMenuImage src={config.logo_url} alt={config.name} className="h-16 w-16 rounded-full object-cover shadow-sm mb-2" useOriginal={true} />
                        )}
                        <h1 className="text-xl font-black text-center">{config.name}</h1>
                        {(config.slogan_ar || config.slogan_en) && (
                            <p className="text-xs font-bold mt-1 opacity-60 text-center">
                                {isAr ? (config.slogan_ar || config.slogan_en) : (config.slogan_en || config.slogan_ar)}
                            </p>
                        )}
                    </div>
                    {/* Payment methods icon */}
                    {config.payment_methods && config.payment_methods.length > 0 ? (
                        <button onClick={() => setShowPaymentModal(true)} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 transition-colors shadow-sm text-green-600 dark:text-green-500 hover:scale-110" title={isAr ? "طرق الدفع" : "Payment Methods"}>
                            <CreditCard className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="w-10 h-10"></div>
                    )}
                </div>

                {/* Language Toggle */}
                <div className="flex justify-center items-center gap-2 mb-6 bg-black/5 dark:bg-white/5 w-fit mx-auto rounded-full p-1" dir="ltr">
                    <button 
                        onClick={() => setCurrentLang('en')}
                        className="px-5 py-1.5 rounded-full font-bold text-sm transition-all"
                        style={{ backgroundColor: !isAr ? primaryColor : 'transparent', color: !isAr ? '#fff' : textMain, boxShadow: !isAr ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none' }}>
                        English
                    </button>
                    <button 
                        onClick={() => setCurrentLang('ar')}
                        className="px-5 py-1.5 rounded-full font-bold text-sm transition-all"
                        style={{ backgroundColor: isAr ? primaryColor : 'transparent', color: isAr ? '#fff' : textMain, boxShadow: isAr ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none' }}>
                        العربية
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <Search className="w-5 h-5" style={{ color: textMuted }} />
                    </div>
                    <input 
                        type="text" 
                        placeholder={isAr ? 'ابحث في المنيو...' : 'Search in menu...'} 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-12 rounded-full pr-12 pl-4 outline-none font-bold shadow-sm"
                        style={{ backgroundColor: bgCard, color: textMain, border: `1px solid ${borderColor}` }}
                    />
                </div>
            </div>

            {/* --- BANNER --- */}
            {config.cover_images && config.cover_images.length > 0 && !searchQuery && (
                <div className="px-5 mb-6 max-w-4xl mx-auto">
                    <Swiper key={isAr ? 'rtl' : 'ltr'} modules={[Autoplay]} autoplay={{ delay: 3500, disableOnInteraction: false }} className="w-full rounded-3xl overflow-hidden shadow-lg border" style={{ borderColor: borderColor }}>
                        {config.cover_images.map((img, i) => (
                            <SwiperSlide key={i}>
                                <OptimizedMenuImage src={img} alt="Offer" className="w-full h-[160px] md:h-[220px] object-cover" highQuality={Boolean((config as any)?.high_quality_images)} />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            )}

            {/* --- FEATURED OFFERS --- */}
            {!searchQuery && featuredItems.length > 0 && (
                <div className="mb-8">
                    <div className="px-5 flex items-center gap-2 mb-4">
                        <h2 className="text-xl font-bold">{isAr ? 'عروض مميزة' : 'Featured Offers'}</h2>
                        <Tag className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <div className="pr-5 overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
                        <Swiper key={isAr ? 'rtl' : 'ltr'} spaceBetween={15} slidesPerView={1.5} className="w-full" modules={[Autoplay]} autoplay={{ delay: 2500, disableOnInteraction: false }} loop={featuredItems.length > 2}>
                            {featuredItems.map((item, idx) => (
                                <SwiperSlide key={idx} className="pb-4">
                                    <div 
                                        className="rounded-3xl overflow-hidden shadow-sm cursor-pointer relative flex flex-col h-full"
                                        style={{ backgroundColor: bgCard }}
                                        onClick={() => openModal(item, item.catName || '')}
                                    >
                                        <div className="relative h-[160px]">
                                            <OptimizedMenuImage thumbnailSrc={item.thumbnail_url} originalSrc={item.image_url || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} alt={itemName(item)} className="w-full h-full object-cover" highQuality={Boolean((config as any)?.high_quality_images)} />
                                            {/* Offer Badge */}
                                            <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                <span>{isAr ? 'عرض خاص' : 'Special Offer'}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 flex flex-col justify-between flex-1 min-h-[100px]">
                                            <h3 className="font-bold text-lg mb-1 leading-tight line-clamp-3">{itemName(item)}</h3>
                                            <div className="text-left mt-auto w-full pt-2" dir="ltr">
                                                <div className="flex flex-col gap-1.5 w-full">
                                                    {item.prices?.map((price, pIdx) => (
                                                        <div key={pIdx} className="flex items-center justify-between w-full">
                                                            <div className="flex-1 min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
                                                                {item.size_labels?.[pIdx] && (
                                                                    <span className="text-xs font-bold opacity-70 truncate block">{item.size_labels[pIdx]}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                {item.old_prices?.[pIdx] ? (
                                                                    <span className="text-sm line-through opacity-50">{item.old_prices[pIdx]}</span>
                                                                ) : null}
                                                                <span className="font-black text-lg">{price} {cur}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            )}

            {/* --- CATEGORIES & ITEMS --- */}
            <div className="px-5">
                {!searchQuery && (
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">{isAr ? 'الأصناف' : 'Categories'}</h2>
                    </div>
                )}
                
                {/* Categories Bar */}
                {!searchQuery && (
                    <div className="sticky top-0 z-30 py-2 -mx-5 px-5 mb-3 backdrop-blur-md border-b border-black/5 dark:border-white/5" style={{ backgroundColor: hasBgImage ? (isDark ? 'rgba(17, 17, 17, 0.82)' : 'rgba(249, 250, 251, 0.82)') : bgBody }}>
                        <div className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar scrollbar-hide no-scrollbar px-1 py-1" dir={isAr ? 'rtl' : 'ltr'}>
                            <button 
                                id="nav-cat-all"
                                onClick={() => {
                                    setActiveCategory('all');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="flex flex-col items-center gap-1.5 shrink-0 group transition-all"
                            >
                                <div className="w-16 h-16 rounded-full flex items-center justify-center transition-all border-2"
                                     style={{ 
                                         backgroundColor: bgCard,
                                         borderColor: activeCategory === 'all' ? primaryColor : 'transparent',
                                         boxShadow: activeCategory === 'all' ? `0 4px 12px ${primaryColor}40` : 'none'
                                     }}>
                                     <LayoutGrid className="w-6 h-6" style={{ color: activeCategory === 'all' ? primaryColor : textMuted }} />
                                </div>
                                <span className="font-bold text-xs" style={{ color: isDark ? (activeCategory === 'all' ? primaryColor : textMain) : '#000000' }}>
                                    {isAr ? 'الكل' : 'All'}
                                </span>
                            </button>
                            {categories.map((cat) => (
                                <button 
                                    key={cat.id}
                                    id={`nav-cat-${cat.id}`}
                                    onClick={() => {
                                        setActiveCategory(cat.id.toString());
                                        const el = document.getElementById(cat.id.toString());
                                        if(el) {
                                            const y = el.getBoundingClientRect().top + window.scrollY - 88;
                                            window.scrollTo({ top: y, behavior: 'smooth' });
                                        }
                                    }}
                                    className="flex flex-col items-center gap-1.5 shrink-0 group transition-all"
                                >
                                    <div className="w-16 h-16 rounded-full overflow-hidden transition-all border-2 bg-white dark:bg-[#1c1c1e]"
                                         style={{ 
                                             borderColor: activeCategory === cat.id.toString() ? primaryColor : 'transparent',
                                             boxShadow: activeCategory === cat.id.toString() ? `0 4px 12px ${primaryColor}40` : 'none'
                                         }}>
                                        <img 
                                            src={cat.image_url || cat.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                                            alt={catName(cat)} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";
                                            }}
                                        />
                                    </div>
                                    <span className="font-bold text-xs whitespace-nowrap" style={{ color: isDark ? (activeCategory === cat.id.toString() ? primaryColor : textMain) : '#000000' }}>
                                        {catName(cat)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* View Mode Toggle */}
                {!searchQuery && (
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-xs font-bold opacity-75">
                            {isAr ? 'طريقة العرض:' : 'View Mode:'}
                        </span>
                        <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10">
                            <button
                                onClick={() => setViewMode('grid')}
                                title={isAr ? "صورتين (شبكة)" : "2 Columns (Grid)"}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    viewMode === 'grid' 
                                        ? 'bg-white dark:bg-zinc-800 shadow-sm' 
                                        : 'opacity-60 hover:opacity-100'
                                }`}
                                style={viewMode === 'grid' ? { color: primaryColor } : {}}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                <span className="text-[11px] font-semibold">{isAr ? "صورتين" : "Grid"}</span>
                            </button>

                            <button
                                onClick={() => setViewMode('list')}
                                title={isAr ? "قائمة بالعرض" : "Horizontal List"}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    viewMode === 'list' 
                                        ? 'bg-white dark:bg-zinc-800 shadow-sm' 
                                        : 'opacity-60 hover:opacity-100'
                                }`}
                                style={viewMode === 'list' ? { color: primaryColor } : {}}
                            >
                                <LayoutList className="w-4 h-4" />
                                <span className="text-[11px] font-semibold">{isAr ? "قائمة" : "List"}</span>
                            </button>

                            <button
                                onClick={() => setViewMode('single')}
                                title={isAr ? "صورة واحدة كبيرة" : "Single Large Image"}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    viewMode === 'single' 
                                        ? 'bg-white dark:bg-zinc-800 shadow-sm' 
                                        : 'opacity-60 hover:opacity-100'
                                }`}
                                style={viewMode === 'single' ? { color: primaryColor } : {}}
                            >
                                <Maximize2 className="w-4 h-4" />
                                <span className="text-[11px] font-semibold">{isAr ? "صورة كبيرة" : "Large"}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Items Grid/List/Single */}
                <div>
                    {displayCategories.map((category) => {
                        const items = category.items || [];
                        if (items.length === 0) return null;

                        return (
                            <div key={category.id} id={category.id.toString()} className="mb-8 pt-2">
                                <h3 className="font-black text-xl mb-4" style={{ color: isDark ? primaryColor : '#000000' }}>{catName(category)}</h3>
                                <div className={
                                    viewMode === 'single'
                                        ? "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
                                        : viewMode === 'grid'
                                        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
                                        : "flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"
                                }>
                                    {items.map((item) => (
                                        <div 
                                            key={item.id} 
                                            className={`rounded-3xl overflow-hidden border cursor-pointer relative flex transition-all active:scale-[0.99] ${
                                                viewMode === 'list' 
                                                    ? 'flex-row items-center p-2.5 gap-3 shadow-sm' 
                                                    : viewMode === 'single'
                                                    ? 'flex-col shadow-md hover:shadow-lg'
                                                    : 'flex-col shadow-sm'
                                            }`}
                                            style={{ backgroundColor: bgCard, borderColor }}
                                            onClick={() => openModal(item, catName(category), category.image_url)}
                                        >
                                            {/* Image container */}
                                            <div className={`relative shrink-0 ${
                                                viewMode === 'list' 
                                                    ? 'h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden' 
                                                    : viewMode === 'single' 
                                                    ? 'aspect-[16/9] sm:aspect-[16/10] w-full overflow-hidden' 
                                                    : 'aspect-[4/3] w-full overflow-hidden'
                                            }`}>
                                                <OptimizedMenuImage 
                                                    thumbnailSrc={item.thumbnail_url} 
                                                    originalSrc={item.image_url || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                                                    alt={itemName(item)} 
                                                    className={`w-full h-full object-cover ${viewMode === 'list' ? 'rounded-2xl' : 'rounded-t-3xl'}`} 
                                                    highQuality={Boolean((config as any)?.high_quality_images)}
                                                />
                                                {/* Special Offer Badge */}
                                                {item.is_popular && (
                                                    <div className={`absolute top-2 right-2 bg-red-600/90 backdrop-blur-sm text-white rounded-full font-bold ${
                                                        viewMode === 'single' ? 'px-3 py-1 text-xs shadow-md' : 'px-2 py-0.5 text-[10px]'
                                                    }`}>
                                                        {isAr ? 'عرض خاص' : 'Offer'}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Content */}
                                            <div className={`flex flex-col flex-1 ${
                                                viewMode === 'list' 
                                                    ? 'py-1 pr-1' 
                                                    : viewMode === 'single' 
                                                    ? 'p-4 sm:p-5' 
                                                    : 'p-3'
                                            }`}>
                                                <h3 className={`font-bold leading-tight ${
                                                    viewMode === 'single' ? 'text-lg sm:text-xl font-extrabold mb-1.5' : 'text-[0.95rem] mb-1 line-clamp-2'
                                                }`}>{itemName(item)}</h3>

                                                {(item.description_ar || item.desc_ar) && (
                                                    <p className={`${
                                                        viewMode === 'single' ? 'text-xs sm:text-sm mb-3 line-clamp-3' : 'text-[11px] mb-2 line-clamp-2'
                                                    }`} style={{ color: textMuted }}>
                                                        {isAr ? (item.description_ar || item.desc_ar) : (item.description_en || item.desc_en || item.description_ar || item.desc_ar)}
                                                    </p>
                                                )}

                                                <div className="mt-auto flex flex-col w-full gap-1 pt-2" dir="ltr">
                                                    {item.prices?.map((price, pIdx) => (
                                                        <div key={pIdx} className="flex items-center justify-between w-full">
                                                            <div className="flex-1 min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
                                                                {item.size_labels?.[pIdx] && (
                                                                    <span className={`${viewMode === 'single' ? 'text-xs font-bold' : 'text-[10px] font-bold'} opacity-70 truncate block`}>
                                                                        {item.size_labels[pIdx]}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                {item.old_prices?.[pIdx] ? (
                                                                    <span className={`${viewMode === 'single' ? 'text-xs' : 'text-[10px]'} line-through`} style={{ color: textMuted }}>
                                                                        {item.old_prices[pIdx]}
                                                                    </span>
                                                                ) : null}
                                                                <span className={`font-black ${viewMode === 'single' ? 'text-xl sm:text-2xl' : 'text-[1.05rem]'}`} style={{ color: primaryColor }}>
                                                                    {price} {cur}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Add to Cart Button */}
                                                {config.orders_enabled !== false && (
                                                    <button
                                                        className={`mt-3 w-full rounded-2xl font-bold flex items-center justify-center gap-1.5 text-white transition-all active:scale-95 shadow-sm hover:opacity-90 ${
                                                            viewMode === 'single' ? 'py-2.5 px-4 text-sm font-extrabold shadow-md' : 'py-2 px-3 text-xs'
                                                        }`}
                                                        style={{ backgroundColor: primaryColor }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openModal(item, catName(category), category.image_url);
                                                        }}
                                                    >
                                                        <ShoppingCart className={viewMode === 'single' ? "w-4 h-4" : "w-3.5 h-3.5"} />
                                                        <span>{isAr ? 'إضافة إلى السلة' : 'Add To Cart'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- FLOATING BOTTOM NAV --- */}
            <div className="fixed bottom-6 left-0 right-0 z-40 px-5 pointer-events-none">
                <div className="max-w-[400px] mx-auto bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border dark:border-zinc-800 p-1 flex justify-between items-center pointer-events-auto" dir={isAr ? 'rtl' : 'ltr'}>
                    <button 
                        onClick={() => { setNavTab('menu'); setIsCartOpen(false); setShowCheckout(false); setShowMenuCategories(true); }}
                        className="flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all"
                        style={{ color: navTab === 'menu' && !isCartOpen ? primaryColor : textMuted, backgroundColor: navTab === 'menu' && !isCartOpen ? `${primaryColor}15` : 'transparent' }}
                    >
                        <Home className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">{isAr ? 'المنيو' : 'Menu'}</span>
                    </button>
                    
                    <button 
                        onClick={() => { setNavTab('cart'); setIsCartOpen(true); }}
                        className="flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all relative"
                        style={{ color: isCartOpen ? primaryColor : textMuted, backgroundColor: isCartOpen ? `${primaryColor}15` : 'transparent' }}
                    >
                        <ShoppingBag className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">{isAr ? 'السلة' : 'Cart'}</span>
                        {cartCount > 0 && (
                            <span className="absolute top-1 right-1/4 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                                {cartCount}
                            </span>
                        )}
                    </button>

                    <button 
                        onClick={() => { setNavTab('contact'); setShowContactModal(true); setIsCartOpen(false); setShowCheckout(false); }}
                        className="flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all"
                        style={{ color: navTab === 'contact' && !isCartOpen ? primaryColor : textMuted, backgroundColor: navTab === 'contact' && !isCartOpen ? `${primaryColor}15` : 'transparent' }}
                    >
                        <User className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">{isAr ? 'تواصل' : 'Contact'}</span>
                    </button>

                    <button 
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all"
                        style={{ color: textMuted }}
                    >
                        {isDark ? <Sun className="w-5 h-5 mb-1" /> : <Moon className="w-5 h-5 mb-1" />}
                        <span className="text-[10px] font-bold">{isDark ? (isAr ? 'مضيء' : 'Light') : (isAr ? 'مظلم' : 'Dark')}</span>
                    </button>
                </div>
            </div>

            {/* --- ITEM DETAIL MODAL --- */}
            <AnimatePresence>
                {selectedItem && !isCartOpen && !showCheckout && (
                    <motion.div 
                        initial={{ opacity: 0, y: '100%' }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:bg-black/60 md:backdrop-blur-sm"
                        style={{ backgroundColor: typeof window !== 'undefined' && window.innerWidth < 768 ? bgBody : undefined }}
                    >
                        <div className="flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-3xl overflow-hidden shadow-2xl relative" style={{ backgroundColor: bgBody }}>
                        {/* Header actions */}
                        <div className="absolute top-6 left-5 right-5 z-10 flex justify-between items-center pointer-events-none" dir={isAr ? 'rtl' : 'ltr'}>
                            <div className="flex gap-3 pointer-events-auto">
                                <button onClick={() => setIsCartOpen(true)} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm text-white relative">
                                    <ShoppingCart className="w-5 h-5" />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                            {cartCount}
                                        </span>
                                    )}
                                </button>
                                <button onClick={handleShare} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm text-white">
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>
                            <button onClick={closeModal} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm text-white pointer-events-auto">
                                {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {/* Image */}
                            <div className="w-full aspect-square shrink-0 relative">
                                <OptimizedMenuImage thumbnailSrc={selectedItem.item.thumbnail_url || selectedItem.item.image_url || selectedItem.item.image || selectedItem.catImg} originalSrc={selectedItem.item.image_url || selectedItem.item.thumbnail_url || selectedItem.item.image || selectedItem.catImg || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} alt="" className="w-full h-full object-cover" highQuality={Boolean((config as any)?.high_quality_images)} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            </div>

                            <div className="p-6 -mt-8 relative rounded-t-[2rem]" style={{ backgroundColor: bgBody }}>
                                {/* Title & Price Row */}
                                <div className="flex flex-col mb-4">
                                    <h2 className="text-3xl font-black mb-2 leading-tight">{itemName(selectedItem.item)}</h2>
                                    {(selectedItem.item.description_ar || selectedItem.item.desc_ar) && (
                                        <p className="text-sm leading-relaxed mb-6" style={{ color: textMuted }}>
                                            {isAr ? (selectedItem.item.description_ar || selectedItem.item.desc_ar) : (selectedItem.item.description_en || selectedItem.item.desc_en || selectedItem.item.description_ar || selectedItem.item.desc_ar)}
                                        </p>
                                    )}
                                    <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
                                        <span className="font-bold">{isAr ? 'السعر' : 'Price'}</span>
                                        <div className="flex gap-2 items-center" dir="ltr">
                                            <span className="text-3xl font-black" style={{ color: primaryColor }}>{selectedItem.item.prices?.[sizeIdx]} {cur}</span>
                                            {selectedItem.item.old_prices?.[sizeIdx] ? <span className="text-lg line-through" style={{ color: textMuted }}>{selectedItem.item.old_prices[sizeIdx]} {cur}</span> : null}
                                        </div>
                                    </div>
                                </div>

                                {/* Size Selection */}
                                {selectedItem.item.prices && selectedItem.item.prices.length > 1 && (
                                    <div className="mb-6">
                                        <label className="text-sm font-bold mb-3 block">{isAr ? 'اختر الحجم' : 'Choose Size'}</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                                            {selectedItem.item.prices.map((p, idx) => {
                                                const label = selectedItem.item.size_labels?.[idx] || (isAr ? `حجم ${idx + 1}` : `Size ${idx + 1}`);
                                                const isSelected = sizeIdx === idx;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSizeIdx(idx)}
                                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${isSelected ? 'shadow-md scale-[1.02]' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                                        style={{
                                                            borderColor: isSelected ? primaryColor : 'transparent',
                                                            backgroundColor: isSelected ? `${primaryColor}15` : 'var(--glass-dark)'
                                                        }}
                                                    >
                                                        <span className="font-bold text-sm mb-1">{label}</span>
                                                        <span className="text-xs font-black" style={{ color: primaryColor }}>{p} {cur}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Quantity Selection */}
                                {config.orders_enabled !== false && (
                                    <div className="mb-8 flex items-center justify-between bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
                                        <span className="font-bold">{isAr ? 'الكمية' : 'Quantity'}</span>
                                        <div className="flex items-center gap-4 bg-white dark:bg-black/40 rounded-xl px-2 py-1 shadow-sm border border-glass-border">
                                            <button 
                                                onClick={() => setQty(Math.max(1, qty - 1))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                                style={{ color: textMain }}
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="font-bold w-6 text-center">{qty}</span>
                                            <button 
                                                onClick={() => setQty(qty + 1)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                                style={{ color: primaryColor }}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Add to Cart Huge Button */}
                                {config.orders_enabled !== false && (
                                    <button 
                                        onClick={addToCart} 
                                        className="w-full h-[64px] rounded-2xl flex items-center justify-between px-2 shadow-lg transition-transform active:scale-95 mb-8"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <div className="flex-1 text-center font-bold text-xl text-white">
                                            {isAr ? 'أضف للسلة' : 'Add to Cart'}
                                        </div>
                                        <div className="h-[48px] px-4 rounded-xl flex items-center justify-center bg-black/10 text-white font-bold" dir="ltr">
                                            {((selectedItem.item.prices?.[sizeIdx] || 0) * qty)} {cur}
                                        </div>
                                    </button>
                                )}

                                {/* You might also like */}
                                {featuredItems.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <h3 className="font-bold text-lg">{isAr ? 'قد يعجبك أيضاً' : 'You might also like'}</h3>
                                        </div>
                                        <div className="overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
                                            <Swiper key={isAr ? 'rtl' : 'ltr'} spaceBetween={15} slidesPerView={2.2} className="w-full pb-4">
                                                {featuredItems.map((item, idx) => (
                                                    <SwiperSlide key={idx}>
                                                        <div 
                                                            className="rounded-3xl overflow-hidden border cursor-pointer relative"
                                                            style={{ backgroundColor: bgCard, borderColor }}
                                                            onClick={() => openModal(item, item.catName || '')}
                                                        >
                                                            <div className="relative h-[120px]">
                                                                <OptimizedMenuImage thumbnailSrc={item.thumbnail_url} originalSrc={item.image_url || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} alt={itemName(item)} className="w-full h-full object-cover" highQuality={Boolean((config as any)?.high_quality_images)} />
                                                                {item.is_popular && (
                                                                    <div className="absolute top-2 left-2 bg-red-600/90 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                                                                        {isAr ? 'عرض خاص' : 'Offer'}
                                                                    </div>
                                                                )}
                                                                <div className="absolute bottom-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                                                                    <Plus className="w-4 h-4" />
                                                                </div>
                                                            </div>
                                                            <div className="p-3 text-center">
                                                                <h4 className="font-bold text-[11px] mb-1 line-clamp-2">{itemName(item)}</h4>
                                                                <div className="flex flex-col gap-1 mt-auto w-full pt-1" dir="ltr">
                                                                    {item.prices?.map((price, pIdx) => (
                                                                        <div key={pIdx} className="flex items-center justify-between w-full">
                                                                            <div className="flex-1 min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
                                                                                {item.size_labels?.[pIdx] && (
                                                                                    <span className="text-[9px] font-bold opacity-70 truncate block">{item.size_labels[pIdx]}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                                                                {item.old_prices?.[pIdx] ? (
                                                                                    <span className="text-[9px] line-through" style={{ color: textMuted }}>{item.old_prices[pIdx]}</span>
                                                                                ) : null}
                                                                                <span className="font-black text-[12px]" style={{ color: primaryColor }}>{price}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </SwiperSlide>
                                                ))}
                                            </Swiper>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* --- CART DRAWER --- */}
            <AnimatePresence>
                {isCartOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 mb-safe overflow-hidden"
                        onClick={() => setIsCartOpen(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-[400px] max-h-[85vh] overflow-hidden rounded-[2.5rem] flex flex-col shadow-2xl border border-black/5 dark:border-white/10"
                            style={{ backgroundColor: bgCard }}
                            onClick={e => e.stopPropagation()}>
                            <div className="p-4 sm:p-5 flex justify-between items-center text-white shadow-md z-10 shrink-0" style={{ backgroundColor: primaryColor }} dir={isAr ? 'rtl' : 'ltr'}>
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg leading-none mb-1">{isAr ? 'عربة التسوق' : 'Shopping Cart'}</span>
                                    <span className="text-xs opacity-90">{cartCount} {isAr ? 'عناصر' : 'items'}</span>
                                </div>
                                <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin" style={{ backgroundColor: bgBody }} dir={isAr ? 'rtl' : 'ltr'}>
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4" style={{ color: textMuted }}>
                                        <ShoppingCart className="w-10 h-10 opacity-40 mb-4" />
                                        <p className="font-bold text-lg mb-2">{isAr ? 'سلتك فارغة' : 'Your cart is empty'}</p>
                                    </div>
                                ) : (
                                    <div className="p-3.5 sm:p-4 space-y-3">
                                        {cart.map((c, i) => (
                                            <div key={i} className="flex gap-3 p-3.5 rounded-2xl shadow-sm border overflow-hidden" style={{ backgroundColor: bgCard, borderColor }}>
                                                <OptimizedMenuImage src={c.item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200'} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0" highQuality={Boolean((config as any)?.high_quality_images)} />
                                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="font-bold text-sm line-clamp-2 leading-snug">{itemName(c.item)}</h4>
                                                        <button onClick={() => updateQty(c.id, c.notes, -c.quantity)} className="text-red-500 hover:text-red-600 p-1 shrink-0 active:scale-90 transition-transform"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-2 mt-2 flex-wrap">
                                                        <span className="font-black text-sm sm:text-base shrink-0" style={{ color: primaryColor }}>{(c.price * c.quantity).toFixed?.(0)} {cur}</span>
                                                        <div className="flex items-center rounded-full h-7 px-1 border shrink-0 bg-black/5 dark:bg-white/5" style={{ borderColor }} dir="ltr">
                                                            <button onClick={() => updateQty(c.id, c.notes, -1)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-all"><Minus className="w-3 h-3" /></button>
                                                            <span className="w-5 text-center text-xs font-bold">{c.quantity}</span>
                                                            <button onClick={() => updateQty(c.id, c.notes, 1)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-all"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {cart.length > 0 && (
                                <div className="p-4 sm:p-5 border-t z-20 shrink-0 shadow-lg" style={{ backgroundColor: bgCard, borderColor }} dir={isAr ? 'rtl' : 'ltr'}>
                                    <div className="flex justify-between items-center mb-3 text-sm font-bold">
                                        <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                                        <span className="text-xl sm:text-2xl font-black" style={{ color: primaryColor }}>{cartTotal.toFixed?.(0)} {cur}</span>
                                    </div>
                                    <button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full h-12 sm:h-14 rounded-2xl text-white font-bold text-base sm:text-lg bg-[#10b981] hover:bg-[#059669] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2">
                                        <span>{isAr ? 'إتمام الطلب' : 'Checkout'}</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Contact Modal */}
            <AnimatePresence>
                {showContactModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 mb-safe overflow-hidden"
                        onClick={() => setShowContactModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-[400px] max-h-[85vh] rounded-[2.5rem] flex flex-col shadow-2xl p-5 border border-black/5 dark:border-white/10 overflow-hidden"
                            style={{ backgroundColor: bgCard }}
                            onClick={e => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
                            <div className="flex justify-between items-center pb-3 border-b border-black/5 dark:border-white/10 shrink-0 mb-3">
                                <h2 className="text-xl font-bold">{isAr ? 'تواصل معنا' : 'Contact Us'}</h2>
                                <button onClick={() => setShowContactModal(false)} className="w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                            
                            <div className="space-y-3 overflow-y-auto pr-1 flex-1 scrollbar-thin">
                                {phoneList.map((ph, idx) => (
                                    <a key={idx} href={`tel:${ph.number}`} className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: primaryColor }}><FaPhoneAlt className="text-sm" /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold opacity-70 mb-0.5">{ph.label}</p>
                                            <span className="font-bold block text-sm" dir="ltr">{ph.number}</span>
                                        </div>
                                    </a>
                                ))}
                                
                                {(config.map_link || config.location_link || config.location_url || config.address) && (
                                    <a 
                                        href={config.map_link || config.location_link || config.location_url || (config.address ? `https://maps.google.com/?q=${encodeURIComponent(config.address)}` : '#')} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-all border border-black/5 dark:border-white/10 group"
                                    >
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md transition-transform group-hover:scale-110" style={{ backgroundColor: primaryColor }}>
                                            <FaMapMarkerAlt className="text-base" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold opacity-75 mb-0.5">{isAr ? 'موقع المطعم على الخريطة' : 'Location on Map'}</p>
                                            <p className="font-extrabold text-xs sm:text-sm line-clamp-2" style={{ color: textMain }}>
                                                {config.address || (isAr ? 'انقر هنا لفتح الموقع على الخريطة 🗺️' : 'Click to open location on map 🗺️')}
                                            </p>
                                        </div>
                                        <ExternalLink className="w-4 h-4 opacity-60 shrink-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}

                                {((config.social_links && Object.keys(config.social_links).length > 0) || config.facebook_url || config.instagram_url || config.tiktok_url || config.whatsapp_number || config.youtube_url || config.whatsapp_group_url) && (
                                    <div className="pt-3 border-t border-black/10 dark:border-white/10 shrink-0">
                                        <p className="text-center font-bold text-xs mb-3">{isAr ? 'تابعنا على' : 'Follow Us'}</p>
                                        <div className="flex justify-center gap-3 flex-wrap">
                                            {(config.social_links?.facebook || config.facebook_url) && (
                                                <a href={config.social_links?.facebook || config.facebook_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-[#1877F2] transition-transform hover:scale-110"><FaFacebookF /></a>
                                            )}
                                            {(config.social_links?.instagram || config.instagram_url) && (
                                                <a href={config.social_links?.instagram || config.instagram_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] transition-transform hover:scale-110"><FaInstagram /></a>
                                            )}
                                            {(config.social_links?.snapchat || config.snapchat_url) && (
                                                <a href={config.social_links?.snapchat || config.snapchat_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-black text-lg bg-[#FFFC00] transition-transform hover:scale-110"><FaSnapchatGhost /></a>
                                            )}
                                            {(config.social_links?.tiktok || config.tiktok_url) && (
                                                <a href={config.social_links?.tiktok || config.tiktok_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-[#000000] dark:border dark:border-zinc-700 transition-transform hover:scale-110"><FaTiktok /></a>
                                            )}
                                            {(config.social_links?.whatsapp || config.whatsapp_number) && (
                                                <a href={`https://wa.me/${(config.social_links?.whatsapp || config.whatsapp_number || '').replace('+', '')}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-[#25D366] transition-transform hover:scale-110"><FaWhatsapp /></a>
                                            )}
                                            {(config.youtube_url) && (
                                                <a href={config.youtube_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-[#FF0000] transition-transform hover:scale-110"><FaYoutube /></a>
                                            )}
                                            {(config.whatsapp_group_url) && (
                                                <a href={config.whatsapp_group_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-[#25D366] transition-transform hover:scale-110" title={isAr ? 'جروب الواتساب' : 'WhatsApp Group'}><FaWhatsapp /><span className="text-[8px] absolute -bottom-1">G</span></a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Payment Info Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[400] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowPaymentModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto"
                            style={{ backgroundColor: bgCard, color: textMain }}
                            onClick={e => e.stopPropagation()}
                            dir={isAr ? 'rtl' : 'ltr'}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black">{isAr ? 'الدفع الإلكتروني' : 'Online Payment'}</h3>
                                <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center text-center mb-6">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                                    <CreditCard className="w-8 h-8" />
                                </div>
                                <p className="font-black text-[1.1rem] mb-2 leading-relaxed">
                                    {isAr ? (
                                        <>
                                            يجب إرسال سكرين شوت
                                            <br />
                                            <span className="block mt-1 font-extrabold text-base">بعد التحويل</span>
                                        </>
                                    ) : (
                                        <>
                                            A screenshot must be sent
                                            <br />
                                            <span className="block mt-1 font-extrabold text-base">after the transfer</span>
                                        </>
                                    )}
                                </p>
                                <p className="text-sm opacity-70 font-medium">
                                    {isAr ? 'يرجى إرسال صورة إيصال التحويل على رقم الواتساب الخاص بالمطعم لتأكيد الدفع.' : 'Please send the transfer receipt screenshot to the restaurant\'s WhatsApp number to confirm your payment.'}
                                </p>
                            </div>

                            {/* Render Payment Methods */}
                            {config.payment_methods && config.payment_methods.length > 0 && (
                                <div className="flex flex-col gap-3 mb-6">
                                    {config.payment_methods.map((pm: any) => (
                                        <div key={pm.id} className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-4 text-start flex flex-col transition-all">
                                            <h4 className="font-bold text-lg mb-1">{isAr ? pm.name_ar : pm.name_en || pm.name_ar}</h4>
                                            {(pm.desc_ar || pm.desc_en) && (
                                                <p className="text-xs font-medium opacity-70 mb-3">{isAr ? pm.desc_ar : pm.desc_en || pm.desc_ar}</p>
                                            )}
                                            {pm.number && (
                                                <div className="flex items-center justify-between bg-white dark:bg-black/40 px-3 py-2 rounded-xl border border-black/5 dark:border-white/5 mb-3">
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(pm.number!);
                                                            alert(isAr ? "تم نسخ الرقم!" : "Number copied!");
                                                        }}
                                                        className="text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-colors"
                                                        style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                                                    >
                                                        {isAr ? "نسخ" : "Copy"}
                                                    </button>
                                                    <span className="font-bold tabular-nums text-sm tracking-widest" dir="ltr">{pm.number}</span>
                                                </div>
                                            )}
                                            {pm.link && (
                                                <a href={pm.link} target="_blank" rel="noopener noreferrer" className="block text-center w-full text-white font-bold text-xs py-3 rounded-xl mt-1 active:scale-95 transition-transform" style={{ backgroundColor: primaryColor }}>
                                                    {isAr 
                                                        ? (pm.name_ar ? `رابط الدفع / ${pm.name_ar}` : "رابط الدفع")
                                                        : (pm.name_en ? `Payment Link / ${pm.name_en}` : (pm.name_ar ? `Payment Link / ${pm.name_ar}` : "Payment Link"))
                                                    }
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                                
                            {config.whatsapp_number ? (
                                <a
                                    href={`https://wa.me/${config.whatsapp_number.replace('+', '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-white font-bold text-lg shadow-md transition-transform hover:scale-[1.02]"
                                    style={{ backgroundColor: '#25D366' }}
                                >
                                    <FaWhatsapp className="w-6 h-6" />
                                    <span dir="ltr" className="tracking-wider">{config.whatsapp_number}</span>
                                </a>
                            ) : (
                                <p className="text-xs text-red-500 font-bold text-center">{isAr ? 'رقم الواتساب غير متوفر' : 'WhatsApp number is not available'}</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Menu Categories Modal/Drawer */}
            <AnimatePresence>
                {showMenuCategories && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 mb-safe"
                        onClick={() => setShowMenuCategories(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-[500px] sm:max-w-[560px] max-h-[85vh] overflow-hidden rounded-[2.5rem] mx-auto flex flex-col shadow-2xl border border-white/10"
                            style={{ backgroundColor: bgCard }}
                            onClick={e => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
                            <div className="p-5 sm:p-6 flex justify-between items-center text-white shadow-md z-10 sticky top-0" style={{ backgroundColor: primaryColor }}>
                                <span className="font-black text-xl sm:text-2xl flex items-center gap-2">{isAr ? 'أقسام المنيو' : 'Menu Categories'}</span>
                                <button onClick={() => setShowMenuCategories(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-all active:scale-95"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                                {/* All Categories Button */}
                                <button
                                    onClick={() => {
                                        setActiveCategory('all');
                                        setShowMenuCategories(false);
                                        setTimeout(() => {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }, 60);
                                    }}
                                    className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl font-black text-base sm:text-lg transition-all border shadow-sm active:scale-[0.98]"
                                    style={{ 
                                        backgroundColor: activeCategory === 'all' ? `${primaryColor}15` : 'rgba(0,0,0,0.03)', 
                                        borderColor: activeCategory === 'all' ? primaryColor : borderColor,
                                        color: activeCategory === 'all' ? primaryColor : textMain 
                                    }}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border-2 shrink-0 shadow-sm"
                                            style={{ 
                                                backgroundColor: bgCard,
                                                borderColor: activeCategory === 'all' ? primaryColor : 'transparent'
                                            }}>
                                            <LayoutGrid className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: activeCategory === 'all' ? primaryColor : textMuted }} />
                                        </div>
                                        <span className="font-extrabold text-base sm:text-lg">{isAr ? 'جميع الأقسام' : 'All Categories'}</span>
                                    </div>
                                    <span className="text-xs px-2.5 py-1 rounded-full font-bold opacity-75 bg-black/5 dark:bg-white/10">
                                        {allItems.length} {isAr ? 'صنف' : 'items'}
                                    </span>
                                </button>

                                {/* Individual Categories */}
                                {categories.map(cat => {
                                    const catIdStr = cat.id.toString();
                                    const isActive = activeCategory === catIdStr;
                                    const itemCount = (cat.items || []).length;
                                    const catImg = cat.image_url || cat.image;

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setActiveCategory(catIdStr);
                                                setShowMenuCategories(false);
                                                setTimeout(() => {
                                                    const el = document.getElementById(catIdStr);
                                                    if (el) {
                                                        const y = el.getBoundingClientRect().top + window.scrollY - 100;
                                                        window.scrollTo({ top: y, behavior: 'smooth' });
                                                    }
                                                    const navEl = document.getElementById(`nav-cat-${catIdStr}`);
                                                    if (navEl) {
                                                        navEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                                    }
                                                }, 80);
                                            }}
                                            className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl font-black text-base sm:text-lg transition-all border shadow-sm active:scale-[0.98]"
                                            style={{ 
                                                backgroundColor: isActive ? `${primaryColor}15` : 'rgba(0,0,0,0.03)', 
                                                borderColor: isActive ? primaryColor : borderColor,
                                                color: isActive ? primaryColor : textMain 
                                            }}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 shrink-0 shadow-sm bg-white dark:bg-[#1c1c1e]"
                                                    style={{ 
                                                        borderColor: isActive ? primaryColor : 'transparent'
                                                    }}>
                                                    {catImg ? (
                                                        <img 
                                                            src={catImg} 
                                                            alt={catName(cat)} 
                                                            className="w-full h-full object-cover" 
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-xs" style={{ color: primaryColor }}>
                                                            {catName(cat).slice(0, 2)}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-extrabold text-base sm:text-lg truncate">{catName(cat)}</span>
                                            </div>
                                            <span className="text-xs px-2.5 py-1 rounded-full font-bold opacity-75 bg-black/5 dark:bg-white/10 shrink-0 ml-2">
                                                {itemCount} {isAr ? 'صنف' : 'items'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CheckoutModal 
                isOpen={showCheckout} 
                onClose={() => setShowCheckout(false)} 
                cartItems={cart.map(c => ({
                    id: c.id,
                    title: itemName(c.item),
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
                language={currentLang} 
                orderChannel={config.order_channel}
                onOrderSuccess={() => { setCart([]); setIsCartOpen(false); }}
            />

            {/* Hidden Footer from Theme config if any */}
            <ASNFooter show={config.show_asn_branding !== false} />
            </div>
        </div>
    );
}
