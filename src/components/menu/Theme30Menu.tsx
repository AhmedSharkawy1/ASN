'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Plus, Minus, Trash2, X, Search, Share2, 
    Sparkles, Flame, Clock, MapPin, Phone, MessageCircle,
    Sun, Moon, Globe, ChevronRight, ChevronLeft, Check,
    LayoutGrid, LayoutList, AlignJustify, Maximize2, Tag,
    Utensils, Coffee, Bell, Heart, Info, ArrowUpRight, CreditCard
} from 'lucide-react';
import { FaWhatsapp, FaFacebookF, FaInstagram, FaTiktok, FaSnapchatGhost, FaYoutube } from 'react-icons/fa';
import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { getProxiedImageUrl } from '@/lib/imageProxy';
import { parseCurrency } from '@/lib/currency';
import ASNFooter from '@/components/menu/ASNFooter';
import CheckoutModal from '@/components/menu/CheckoutModal';
import SharedMarquee from '@/components/menu/SharedMarquee';
import { getStoreOpenStatus } from '@/lib/helpers/storeHours';
import { itemMatchesSmartSearch } from '@/lib/helpers/smartMenuSearch';

// Types
export type MenuItem = {
    id: string | number;
    title_ar: string;
    title_en?: string;
    description_ar?: string;
    description_en?: string;
    desc_ar?: string;
    desc_en?: string;
    ingredients?: string;
    ingredients_ar?: string;
    ingredients_en?: string;
    image?: string;
    image_url?: string;
    thumbnail_url?: string | null;
    prices: number[];
    size_labels?: string[];
    old_prices?: number[];
    extras?: { id?: number | string; name_ar: string; name_en?: string; price: number }[];
    is_available?: boolean;
    is_popular?: boolean;
    is_new?: boolean;
    calories?: number | string;
    tags?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

export interface CategoryWithItemsType {
    id: string | number;
    name_ar: string;
    name_en?: string;
    items?: MenuItem[];
    image_url?: string;
    image?: string;
    thumbnail_url?: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export interface RestaurantType {
    id: string;
    name: string;
    theme?: string;
    theme_colors?: any;
    currency?: string;
    default_language?: 'ar' | 'en';
    default_theme_mode?: 'light' | 'dark' | 'system';
    cover_images?: string[];
    cover_url?: string;
    logo_url?: string;
    slogan_ar?: string;
    slogan_en?: string;
    phone?: string;
    phone_numbers?: any[];
    payment_methods?: any[];
    marquee_enabled?: boolean;
    marquee_text_ar?: string;
    marquee_text_en?: string;
    orders_enabled?: boolean;
    order_channel?: 'whatsapp' | 'website' | 'both';
    whatsapp_number?: string;
    map_link?: string;
    location_link?: string;
    location_url?: string;
    address?: string;
    social_links?: Record<string, string>;
    facebook_url?: string;
    instagram_url?: string;
    tiktok_url?: string;
    snapchat_url?: string;
    youtube_url?: string;
    whatsapp_group_url?: string;
    show_asn_branding?: boolean;
    high_quality_images?: boolean;
    waiter_call_enabled?: boolean;
    time_open?: string;
    time_close?: string;
    working_hours?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface CartItem {
    cKey: string;
    id: string | number;
    item: MenuItem;
    sizeIdx: number;
    sizeLabel: string;
    price: number;
    quantity: number;
    notes: string;
    catName: string;
    extras?: { name: string; price: number; qty?: number }[];
}

interface Theme30MenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
    suppressInternalPopup?: boolean;
}

type ViewMode = 'grid' | 'list' | 'compact' | 'showcase';
type FilterTag = 'all' | 'popular' | 'new' | 'offers';

export default function Theme30Menu({ config, categories, restaurantId, suppressInternalPopup }: Theme30MenuProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Set default theme mode if configured
    useEffect(() => {
        if (config.default_theme_mode && config.default_theme_mode !== 'system') {
            setTheme(config.default_theme_mode);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [currentLang, setCurrentLang] = useState<'ar' | 'en'>(config.default_language === 'en' ? 'en' : 'ar');
    const isAr = currentLang === 'ar';
    const isDark = mounted && theme === 'dark';
    const cur = parseCurrency(config?.currency, isAr);
    const storeStatus = useMemo(() => getStoreOpenStatus(config), [config]);

    // Color resolution for Theme 30 (Default: Royal Sapphire Indigo #4f46e5)
    const getPrimaryColor = (themeName?: string, customPrimary?: string) => {
        if (customPrimary) return customPrimary;
        if (!themeName) return '#4f46e5'; // Royal Sapphire Indigo
        if (themeName.endsWith('-amber') || themeName.endsWith('-gold')) return '#d97706';
        if (themeName.endsWith('-rose') || themeName.endsWith('-red')) return '#e11d48';
        if (themeName.endsWith('-cyan')) return '#0284c7';
        if (themeName.endsWith('-violet') || themeName.endsWith('-purple')) return '#7c3aed';
        if (themeName.endsWith('-dark')) return '#0f172a';
        if (themeName.endsWith('-pink')) return '#ec4899';
        if (themeName.endsWith('-emerald') || themeName.endsWith('-green')) return '#059669';
        return '#4f46e5';
    };

    let tc = config?.theme_colors || {};
    if (typeof tc === 'string') {
        try {
            tc = JSON.parse(tc);
        } catch (_e) {
            tc = {};
        }
    }

    const primaryColor = getPrimaryColor(config?.theme, tc.primary || config?.theme_colors?.primary);

    // Background images
    const bgImageLight = tc.theme30_bg_light || tc.theme28_bg_light || tc.bg_image_light || tc.bg_light || '';
    const bgImageDark = tc.theme30_bg_dark || tc.theme28_bg_dark || tc.bg_image_dark || tc.bg_dark || '';
    const activeBgImage = (isDark ? (bgImageDark || bgImageLight) : (bgImageLight || bgImageDark))?.trim() || '';
    const hasBgImage = Boolean(activeBgImage.length > 0);

    // Config options
    const defaultView = (tc.theme30_default_view_mode || tc.theme28_default_view_mode || 'grid') as ViewMode;
    const [viewMode, setViewMode] = useState<ViewMode>(['grid', 'list', 'compact', 'showcase'].includes(defaultView) ? defaultView : 'grid');
    const showStoriesBar = tc.theme30_show_stories !== false && config?.theme30_show_stories !== false;

    // View state
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterTag>('all');
    const [favorites, setFavorites] = useState<Record<string, boolean>>({});

    // Modals
    const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; catName: string; categoryId: string | number } | null>(null);
    const [modalSizeIdx, setModalSizeIdx] = useState<number>(0);
    const [modalQty, setModalQty] = useState<number>(1);
    const [modalNotes, setModalNotes] = useState<string>('');
    const [modalExtras, setModalExtras] = useState<{ name: string; price: number; qty?: number }[]>([]);
    
    // Cart & Checkout
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showPromoPopup, setShowPromoPopup] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

    // Promo Popup Config
    const popupConfig: { enabled: boolean; title?: string; description?: string; image_url?: string; button_text?: string; target_category_id?: string } | null = 
        tc.theme30_popup || tc.theme28_popup || tc.theme27_popup || null;

    useEffect(() => {
        if (!suppressInternalPopup && popupConfig?.enabled) {
            const popupKey = `theme30_popup_${restaurantId || config?.id || 'dismissed'}`;
            const dismissed = typeof window !== 'undefined' ? sessionStorage.getItem(popupKey) : null;
            if (!dismissed) {
                const timer = setTimeout(() => setShowPromoPopup(true), 600);
                return () => clearTimeout(timer);
            }
        }
    }, [popupConfig, restaurantId, config?.id, suppressInternalPopup]);

    // Helpers
    const itemName = (item: MenuItem) => (isAr ? item.title_ar : (item.title_en || item.title_ar)) || '';
    const itemDesc = (item: MenuItem) => (isAr ? (item.description_ar || item.desc_ar || item.ingredients_ar || item.ingredients) : (item.description_en || item.desc_en || item.ingredients_en || item.description_ar || item.desc_ar)) || '';
    const catName = (cat: CategoryWithItemsType) => (isAr ? cat.name_ar : (cat.name_en || cat.name_ar)) || '';

    // Scroll spy for categories
    const categoryNavRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleScroll = () => {
            if (searchQuery || activeFilter !== 'all') return;
            const scrollPos = window.scrollY + 80;

            if (window.scrollY < 200) {
                if (activeCategory !== 'all') setActiveCategory('all');
                return;
            }

            for (let i = categories.length - 1; i >= 0; i--) {
                const el = document.getElementById(`cat-section-t30-${categories[i].id}`);
                if (el && el.offsetTop <= scrollPos) {
                    const catId = String(categories[i].id);
                    if (activeCategory !== catId) {
                        setActiveCategory(catId);
                        const navBtn = document.getElementById(`nav-cat-t30-${catId}`);
                        if (navBtn && categoryNavRef.current) {
                            navBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }
                    }
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeCategory, categories, searchQuery, activeFilter]);

    // Scroll to category
    const scrollToCategory = (catId: string) => {
        setActiveCategory(catId);
        setActiveFilter('all');
        setSearchQuery('');
        if (catId === 'all') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        const el = document.getElementById(`cat-section-t30-${catId}`);
        if (el) {
            const offset = 60;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    // Filter items based on active tags & smart search
    const processedCategories = useMemo(() => {
        return categories.map(cat => {
            const filteredItems = (cat.items || []).filter(item => {
                // Availability
                if (item.is_available === false) return false;

                // Smart Cross-Entity Search query match
                if (searchQuery.trim()) {
                    if (!itemMatchesSmartSearch(item, catName(cat), searchQuery, isAr)) {
                        return false;
                    }
                }

                // Filter tags
                if (activeFilter === 'popular' && !item.is_popular) return false;
                if (activeFilter === 'new' && !item.is_new) return false;
                if (activeFilter === 'offers') {
                    const hasDiscount = item.old_prices && item.old_prices.some((op, idx) => op > (item.prices?.[idx] || 0));
                    if (!hasDiscount) return false;
                }

                return true;
            });

            return {
                ...cat,
                items: filteredItems
            };
        }).filter(cat => cat.items.length > 0);
    }, [categories, searchQuery, activeFilter, isAr]);

    // All matching items count
    const totalMatchingItems = useMemo(() => {
        return processedCategories.reduce((acc, cat) => acc + (cat.items?.length || 0), 0);
    }, [processedCategories]);

    // Cart calculations
    const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
    const cartTotal = useMemo(() => {
        return cart.reduce((acc, c) => {
            const extrasTotal = (c.extras || []).reduce((sum, e) => sum + e.price * (e.qty || 1), 0);
            return acc + (c.price + extrasTotal) * c.quantity;
        }, 0);
    }, [cart]);

    // Get item quantity in cart
    const getItemCartQty = (itemId: string | number) => {
        return cart
            .filter(c => String(c.id) === String(itemId))
            .reduce((sum, c) => sum + c.quantity, 0);
    };

    // Get item size quantity in cart
    const getItemSizeCartQty = (itemId: string | number, sizeIdx: number) => {
        return cart
            .filter(c => String(c.id) === String(itemId) && c.sizeIdx === sizeIdx)
            .reduce((sum, c) => sum + c.quantity, 0);
    };

    // Quick add or open modal with optional initial size
    const handleItemClick = (item: MenuItem, catNameStr: string, catId: string | number, initialSizeIdx = 0) => {
        const hasSizes = (item.prices && item.prices.length > 1) || (item.size_labels && item.size_labels.length > 1);
        const hasExtras = item.extras && item.extras.length > 0;

        // If item has sizes, extras, or details, open rich modal
        if (hasSizes || hasExtras || itemDesc(item)) {
            setSelectedItem({ item, catName: catNameStr, categoryId: catId });
            setModalSizeIdx(initialSizeIdx);
            setModalQty(1);
            setModalNotes('');
            setModalExtras([]);
        } else {
            // Instant add to cart
            quickAddToCart(item, catNameStr, initialSizeIdx);
        }
    };

    // Quick direct add
    const quickAddToCart = (item: MenuItem, catNameStr: string, sizeIndex = 0) => {
        const p = item.prices?.[sizeIndex] || 0;
        const lbl = item.size_labels?.[sizeIndex] || (isAr ? 'عادي' : 'Regular');
        const uniqueKey = `${item.id}_${sizeIndex}_none`;

        setCart(prev => {
            const existIdx = prev.findIndex(c => c.cKey === uniqueKey);
            if (existIdx > -1) {
                const updated = [...prev];
                updated[existIdx].quantity += 1;
                return updated;
            }
            return [...prev, {
                cKey: uniqueKey,
                id: item.id,
                item,
                sizeIdx: sizeIndex,
                sizeLabel: lbl,
                price: p,
                quantity: 1,
                notes: '',
                catName: catNameStr,
                extras: []
            }];
        });
    };

    // Quick direct decrement from card
    const quickDecrementFromCart = (itemId: string | number) => {
        setCart(prev => {
            const matchIndex = prev.findIndex(c => String(c.id) === String(itemId));
            if (matchIndex === -1) return prev;
            if (prev[matchIndex].quantity > 1) {
                const updated = [...prev];
                updated[matchIndex].quantity -= 1;
                return updated;
            } else {
                return prev.filter((_, idx) => idx !== matchIndex);
            }
        });
    };

    // Modal Add To Cart
    const addModalToCart = () => {
        if (!selectedItem) return;
        const item = selectedItem.item;
        const p = item.prices?.[modalSizeIdx] || 0;
        const lbl = item.size_labels?.[modalSizeIdx] || (isAr ? 'عادي' : 'Regular');
        const extrasKey = modalExtras.map(e => `${e.name}:${e.price}`).sort().join('|');
        const uniqueKey = `${item.id}_${modalSizeIdx}_${extrasKey || 'none'}_${modalNotes.trim()}`;

        setCart(prev => {
            const existIdx = prev.findIndex(c => c.cKey === uniqueKey);
            if (existIdx > -1) {
                const updated = [...prev];
                updated[existIdx].quantity += modalQty;
                return updated;
            }
            return [...prev, {
                cKey: uniqueKey,
                id: item.id,
                item,
                sizeIdx: modalSizeIdx,
                sizeLabel: lbl,
                price: p,
                quantity: modalQty,
                notes: modalNotes.trim(),
                catName: selectedItem.catName,
                extras: modalExtras
            }];
        });

        setSelectedItem(null);
    };

    // Toggle Modal Extra
    const toggleModalExtra = (extraName: string, extraPrice: number) => {
        setModalExtras(prev => {
            const exists = prev.some(e => e.name === extraName);
            if (exists) {
                return prev.filter(e => e.name !== extraName);
            } else {
                return [...prev, { name: extraName, price: extraPrice, qty: 1 }];
            }
        });
    };

    // Modal unit & total prices
    const modalExtrasUnit = modalExtras.reduce((s, e) => s + e.price * (e.qty || 1), 0);
    const modalBasePrice = selectedItem?.item.prices?.[modalSizeIdx] || 0;
    const modalCalculatedTotal = (modalBasePrice + modalExtrasUnit) * modalQty;

    // Share Handler
    const handleShare = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: config.name,
                    text: isAr ? `تصفح منيو ${config.name} الإلكتروني` : `Explore ${config.name}'s menu`,
                    url: window.location.href,
                });
            } catch (_err) {
                // user canceled
            }
        } else if (typeof navigator !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            alert(isAr ? 'تم نسخ رابط المنيو بنجاح!' : 'Menu link copied!');
        }
    };

    const phoneList: string[] = (() => {
        const list: string[] = [];
        if (config?.phone) {
            config.phone.split(/[,/|\n]+/).forEach(p => {
                const clean = p.trim();
                if (clean && !list.includes(clean)) list.push(clean);
            });
        }
        if (Array.isArray(config?.phone_numbers)) {
            config.phone_numbers.forEach(p => {
                const num = typeof p === 'object' ? p?.number : p;
                if (num && typeof num === 'string' && !list.includes(num.trim())) {
                    list.push(num.trim());
                }
            });
        }
        return list;
    })();

    const primaryPhone = phoneList[0] || config?.whatsapp_number || '';
    const whatsappClean = (config?.whatsapp_number || '').replace(/[^0-9+]/g, '');

    const socialLinks = useMemo(() => {
        const sl = config?.social_links || {};
        const facebook = config?.facebook_url || sl.facebook || config?.facebook || '';
        const instagram = config?.instagram_url || sl.instagram || config?.instagram || '';
        const tiktok = config?.tiktok_url || sl.tiktok || config?.tiktok || '';
        const snapchat = config?.snapchat_url || sl.snapchat || config?.snapchat || '';
        const youtube = config?.youtube_url || sl.youtube || config?.youtube || '';
        return { facebook, instagram, tiktok, snapchat, youtube };
    }, [config]);

    const hasSocialLinks = Boolean(
        socialLinks.facebook || socialLinks.instagram || 
        socialLinks.tiktok || socialLinks.snapchat || socialLinks.youtube
    );

    const locationUrl = config?.location_url || config?.map_link || config?.location_link || '';

    if (!mounted) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div 
            className="min-w-0 w-full max-w-full min-h-screen font-cairo pb-36 relative transition-colors duration-300 selection:bg-indigo-500 selection:text-white"
            style={{ 
                backgroundColor: hasBgImage ? 'transparent' : (isDark ? '#0b0f19' : '#f8fafc'),
                color: isDark ? '#f8fafc' : '#0f172a'
            }}
            dir={isAr ? 'rtl' : 'ltr'}
        >
            {/* Custom Background Image Layer */}
            {hasBgImage && (
                <>
                    <div 
                        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
                        style={{ backgroundImage: `url("${getProxiedImageUrl(activeBgImage)}")` }}
                    />
                    <div 
                        className="fixed inset-0 pointer-events-none z-0 backdrop-blur-[2px]"
                        style={{ 
                            backgroundColor: isDark ? 'rgba(11, 15, 25, 0.82)' : 'rgba(248, 250, 252, 0.85)' 
                        }}
                    />
                </>
            )}

            <div className="relative z-10 w-full max-w-2xl mx-auto min-w-0">
                {/* 1. TOP MARQUEE */}
                {config.marquee_enabled && (
                    <div className="w-full max-w-full overflow-hidden shadow-sm" style={{ backgroundColor: primaryColor }}>
                        <SharedMarquee 
                            text={isAr ? (config.marquee_text_ar || '') : (config.marquee_text_en || config.marquee_text_ar || '')} 
                            bgColor={primaryColor}
                        />
                    </div>
                )}

                {/* 2. NEO-LUXE PILL-ISLAND HEADER */}
                <header className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3">
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-3.5 w-full min-w-0">
                        {/* Quick Control Pills */}
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            {/* Language Switch */}
                            <button
                                onClick={() => setCurrentLang(prev => prev === 'ar' ? 'en' : 'ar')}
                                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1 text-[11px] sm:text-xs font-bold transition-all bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-xs border border-black/5 dark:border-white/10 active:scale-95 shrink-0"
                                title={isAr ? 'Switch to English' : 'التحويل للعربية'}
                            >
                                <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{isAr ? 'EN' : 'عربي'}</span>
                            </button>

                            {/* Theme Mode Toggle */}
                            <button
                                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-xs border border-black/5 dark:border-white/10 active:scale-95 text-amber-500 dark:text-amber-300 shrink-0"
                                title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
                            >
                                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
                            </button>

                            {/* Payment Methods Button */}
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-xs border border-black/5 dark:border-white/10 active:scale-95 text-indigo-600 dark:text-indigo-400 shrink-0"
                                title={isAr ? 'وسائل الدفع المتاحة' : 'Payment Methods'}
                            >
                                <CreditCard className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Top Quick Actions (Call, WhatsApp, Share, Map) */}
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            {primaryPhone && (
                                <a
                                    href={`tel:${primaryPhone}`}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-emerald-600 dark:text-emerald-400 shadow-xs border border-black/5 dark:border-white/10 active:scale-95 shrink-0"
                                    title={isAr ? 'اتصال هاتفي' : 'Call'}
                                >
                                    <Phone className="w-3.5 h-3.5" />
                                </a>
                            )}

                            {whatsappClean && (
                                <a
                                    href={`https://wa.me/${whatsappClean}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-[#25D366] text-white shadow-xs active:scale-95 shrink-0"
                                    title="WhatsApp"
                                >
                                    <FaWhatsapp className="w-4 h-4" />
                                </a>
                            )}

                            {(config.address || locationUrl) && (
                                <a
                                    href={locationUrl || (config.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}` : '#')}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-rose-500 shadow-xs border border-black/5 dark:border-white/10 active:scale-95 shrink-0"
                                    title={isAr ? 'الموقع على الخريطة' : 'Map Location'}
                                >
                                    <MapPin className="w-3.5 h-3.5" />
                                </a>
                            )}

                            <button
                                onClick={handleShare}
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-slate-700 dark:text-zinc-200 shadow-xs border border-black/5 dark:border-white/10 active:scale-95 shrink-0"
                                title={isAr ? 'مشاركة المنيو' : 'Share Menu'}
                            >
                                <Share2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Brand Card with Neo-Luxe Border Glow */}
                    <div className="relative rounded-3xl bg-white/80 dark:bg-zinc-900/85 backdrop-blur-xl p-4 sm:p-5 shadow-lg border border-black/5 dark:border-white/10 transition-all overflow-hidden">
                        {/* Ambient gradient glow */}
                        <div 
                            className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-15 blur-2xl pointer-events-none"
                            style={{ backgroundColor: primaryColor }}
                        />

                        <div className="relative flex items-center gap-3.5 sm:gap-4">
                            {/* Logo */}
                            {config.logo_url ? (
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-md shrink-0 border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-800 p-1">
                                    <OptimizedMenuImage 
                                        src={config.logo_url} 
                                        alt={config.name} 
                                        className="w-full h-full object-contain rounded-xl"
                                        useOriginal={true}
                                    />
                                </div>
                            ) : (
                                <div 
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {config.name?.charAt(0) || 'M'}
                                </div>
                            )}

                            {/* Name & Slogan */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                                        {config.name}
                                    </h1>

                                    {/* Dynamic Store Status */}
                                    {storeStatus.isOpen ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {isAr ? 'مفتوح الآن' : 'Open Now'}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            {isAr ? 'مغلق الآن' : 'Closed Now'}
                                        </span>
                                    )}
                                </div>

                                {(config.slogan_ar || config.slogan_en) && (
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
                                        {isAr ? (config.slogan_ar || config.slogan_en) : (config.slogan_en || config.slogan_ar)}
                                    </p>
                                )}

                                {/* Meta details bar: Dining & Delivery / Fast Service */}
                                <div className="flex items-center gap-2.5 mt-2 text-[11px] text-slate-600 dark:text-zinc-300 font-semibold flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Utensils className="w-3.5 h-3.5 text-amber-500" />
                                        <span>{isAr ? 'صالة ودليفري' : 'Dine-in & Delivery'}</span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{isAr ? 'خدمة سريعة' : 'Fast Service'}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Location / Address Row */}
                        {(config.address || locationUrl) && (
                            <div className="mt-3.5 pt-3 border-t border-black/5 dark:border-white/5">
                                <a 
                                    href={locationUrl || (config.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}` : '#')}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-all group/loc cursor-pointer border border-black/5 dark:border-white/5"
                                    title={isAr ? 'اضغط لفتح الموقع على خرائط جوجل' : 'Click to open location in Google Maps'}
                                >
                                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                        <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 mt-0.5 group-hover/loc:bg-rose-500 group-hover/loc:text-white transition-colors">
                                            <MapPin className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="font-semibold text-xs text-slate-700 dark:text-zinc-200 group-hover/loc:text-rose-500 transition-colors leading-relaxed">
                                            {config.address || (isAr ? 'الموقع الجغرافي للمطعم' : 'Restaurant Location')}
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center self-start sm:self-auto gap-1 text-[11px] font-black text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-xl shrink-0 group-hover/loc:bg-rose-500 group-hover/loc:text-white transition-all">
                                        <span>{isAr ? 'عرض اللوكيشن' : 'Open Map'}</span>
                                        <ArrowUpRight className="w-3 h-3" />
                                    </span>
                                </a>
                            </div>
                        )}

                        {/* Contact Numbers (Phone & WhatsApp) */}
                        {(phoneList.length > 0 || whatsappClean) && (
                            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                                {phoneList.map((ph, idx) => (
                                    <a
                                        key={idx}
                                        href={`tel:${ph}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-[11px] font-bold text-slate-700 dark:text-zinc-200 transition-all border border-black/5 dark:border-white/5 shadow-2xs active:scale-95"
                                    >
                                        <Phone className="w-3 h-3 text-indigo-500" />
                                        <span dir="ltr">{ph}</span>
                                    </a>
                                ))}
                                {whatsappClean && (
                                    <a
                                        href={`https://wa.me/${whatsappClean}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] font-black text-emerald-600 dark:text-emerald-400 transition-all border border-emerald-500/20 shadow-2xs active:scale-95"
                                    >
                                        <FaWhatsapp className="w-3.5 h-3.5 text-emerald-500" />
                                        <span dir="ltr">{config.whatsapp_number}</span>
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Accepted Payment Methods Banner */}
                        <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 font-bold">
                                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{isAr ? 'طرق الدفع المتاحة:' : 'Accepted Payments:'}</span>
                            </div>
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-[11px] font-black text-indigo-600 dark:text-indigo-400 transition-all border border-indigo-500/20 shadow-2xs active:scale-95 cursor-pointer"
                            >
                                <span>{isAr ? 'كاش / انستا باي / محافظ' : 'Cash / InstaPay / Wallets'}</span>
                                {isAr ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                        </div>

                        {/* Social Links Row */}
                        {hasSocialLinks && (
                            <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                                    {isAr ? 'صفحات التواصل:' : 'Social Pages:'}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {socialLinks.facebook && (
                                        <a
                                            href={socialLinks.facebook}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-8 h-8 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white flex items-center justify-center transition-all shadow-2xs active:scale-90"
                                            title="Facebook"
                                        >
                                            <FaFacebookF className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {socialLinks.instagram && (
                                        <a
                                            href={socialLinks.instagram}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-8 h-8 rounded-xl bg-[#E4405F]/10 hover:bg-[#E4405F] text-[#E4405F] hover:text-white flex items-center justify-center transition-all shadow-2xs active:scale-90"
                                            title="Instagram"
                                        >
                                            <FaInstagram className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {socialLinks.tiktok && (
                                        <a
                                            href={socialLinks.tiktok}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-8 h-8 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black dark:hover:bg-white text-slate-800 dark:text-zinc-200 hover:text-white dark:hover:text-black flex items-center justify-center transition-all shadow-2xs active:scale-90"
                                            title="TikTok"
                                        >
                                            <FaTiktok className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {socialLinks.snapchat && (
                                        <a
                                            href={socialLinks.snapchat}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-8 h-8 rounded-xl bg-[#FFFC00]/20 hover:bg-[#FFFC00] text-amber-500 hover:text-black flex items-center justify-center transition-all shadow-2xs active:scale-90"
                                            title="Snapchat"
                                        >
                                            <FaSnapchatGhost className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {socialLinks.youtube && (
                                        <a
                                            href={socialLinks.youtube}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-8 h-8 rounded-xl bg-[#FF0000]/10 hover:bg-[#FF0000] text-[#FF0000] hover:text-white flex items-center justify-center transition-all shadow-2xs active:scale-90"
                                            title="YouTube"
                                        >
                                            <FaYoutube className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* 3. STORIES & HIGHLIGHTS BAR (Neo-Luxe Capsules) */}
                {showStoriesBar && (
                    <div className="px-4 py-2">
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                            {/* Story 1: All items */}
                            <button
                                onClick={() => { setActiveCategory('all'); setActiveFilter('all'); }}
                                className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                            >
                                <div 
                                    className={`w-14 h-14 rounded-2xl p-0.5 transition-all shadow-sm ${
                                        activeCategory === 'all' && activeFilter === 'all' 
                                            ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-zinc-950 scale-105' 
                                            : 'opacity-80 group-hover:opacity-100'
                                    }`}
                                    style={{
                                        background: activeCategory === 'all' && activeFilter === 'all'
                                            ? `linear-gradient(135deg, ${primaryColor}, #818cf8)`
                                            : 'rgba(150, 150, 150, 0.2)'
                                    }}
                                >
                                    <div className="w-full h-full rounded-[14px] bg-white dark:bg-zinc-900 flex items-center justify-center text-indigo-500">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold truncate max-w-[64px] text-center">
                                    {isAr ? 'الكل' : 'All'}
                                </span>
                            </button>

                            {/* Story 2: Best Seller */}
                            <button
                                onClick={() => { setActiveCategory('all'); setActiveFilter('popular'); }}
                                className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                            >
                                <div 
                                    className={`w-14 h-14 rounded-2xl p-0.5 transition-all shadow-sm ${
                                        activeFilter === 'popular' 
                                            ? 'ring-2 ring-offset-2 ring-amber-500 dark:ring-offset-zinc-950 scale-105' 
                                            : 'opacity-80 group-hover:opacity-100'
                                    }`}
                                    style={{
                                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)'
                                    }}
                                >
                                    <div className="w-full h-full rounded-[14px] bg-white dark:bg-zinc-900 flex items-center justify-center text-amber-500">
                                        <Flame className="w-6 h-6" />
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold truncate max-w-[64px] text-center">
                                    {isAr ? 'الأكثر طلباً' : 'Popular'}
                                </span>
                            </button>

                            {/* Story 3: Special Offers */}
                            <button
                                onClick={() => { setActiveCategory('all'); setActiveFilter('offers'); }}
                                className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                            >
                                <div 
                                    className={`w-14 h-14 rounded-2xl p-0.5 transition-all shadow-sm ${
                                        activeFilter === 'offers' 
                                            ? 'ring-2 ring-offset-2 ring-rose-500 dark:ring-offset-zinc-950 scale-105' 
                                            : 'opacity-80 group-hover:opacity-100'
                                    }`}
                                    style={{
                                        background: 'linear-gradient(135deg, #ec4899, #f43f5e)'
                                    }}
                                >
                                    <div className="w-full h-full rounded-[14px] bg-white dark:bg-zinc-900 flex items-center justify-center text-rose-500">
                                        <Tag className="w-6 h-6" />
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold truncate max-w-[64px] text-center">
                                    {isAr ? 'عروض حصرية' : 'Offers'}
                                </span>
                            </button>

                            {/* Story 4+: Categories with thumbnails */}
                            {categories.slice(0, 8).map(cat => {
                                const isCatActive = activeCategory === String(cat.id);
                                return (
                                    <button
                                        key={`story-t30-${cat.id}`}
                                        onClick={() => scrollToCategory(String(cat.id))}
                                        className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                                    >
                                        <div 
                                            className={`w-14 h-14 rounded-2xl p-0.5 transition-all shadow-sm ${
                                                isCatActive 
                                                    ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-zinc-950 scale-105' 
                                                    : 'opacity-85 group-hover:opacity-100'
                                            }`}
                                            style={{
                                                background: isCatActive 
                                                    ? `linear-gradient(135deg, ${primaryColor}, #a855f7)`
                                                    : 'rgba(150, 150, 150, 0.25)'
                                            }}
                                        >
                                            <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                                                {cat.image_url ? (
                                                    <OptimizedMenuImage 
                                                        originalSrc={cat.image_url}
                                                        thumbnailSrc={cat.thumbnail_url}
                                                        alt={catName(cat)}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Utensils className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold truncate max-w-[68px] text-center">
                                            {catName(cat)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 4. SMART SEARCH & VIEW MODE SWITCHER */}
                <div className="relative px-4 py-2 space-y-2">
                    {/* Search Input Bar */}
                    <div className="relative flex items-center">
                        <Search className="w-4 h-4 absolute inset-y-0 my-auto text-slate-400 pointer-events-none" style={isAr ? { right: 14 } : { left: 14 }} />
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isAr ? 'ابحث عن وجبة، مشروب، سندوتش...' : 'Search meals, drinks, sandwiches...'}
                            className={`w-full h-11 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-sm font-semibold border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/50 transition-all ${isAr ? 'pr-11 pl-10' : 'pl-11 pr-10'}`}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className={`absolute inset-y-0 my-auto ${isAr ? 'left-3' : 'right-3'} w-6 h-6 rounded-full bg-slate-300 dark:bg-zinc-700 flex items-center justify-center text-xs text-slate-600 dark:text-zinc-200`}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* View Modes & Quick Filter Pills */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 w-full min-w-0">
                        {/* Filter Tags */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
                            <button
                                onClick={() => setActiveFilter('all')}
                                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
                                    activeFilter === 'all'
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                        : 'bg-white/80 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-black/5 dark:border-white/5'
                                }`}
                            >
                                {isAr ? 'الكل' : 'All'}
                            </button>
                            <button
                                onClick={() => setActiveFilter('popular')}
                                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1 ${
                                    activeFilter === 'popular'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'bg-white/80 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-black/5 dark:border-white/5'
                                }`}
                            >
                                <Flame className="w-3 h-3 text-amber-300" />
                                {isAr ? 'الأكثر طلباً' : 'Popular'}
                            </button>
                            <button
                                onClick={() => setActiveFilter('offers')}
                                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1 ${
                                    activeFilter === 'offers'
                                        ? 'bg-rose-500 text-white shadow-sm'
                                        : 'bg-white/80 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-black/5 dark:border-white/5'
                                }`}
                            >
                                <Tag className="w-3 h-3 text-rose-300" />
                                {isAr ? 'عروض' : 'Offers'}
                            </button>
                        </div>

                        {/* View Switcher Controls (4 Modes) */}
                        <div className="flex items-center bg-white/80 dark:bg-zinc-900/80 border border-black/5 dark:border-white/10 p-0.5 rounded-xl shrink-0 backdrop-blur-md">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-zinc-800 text-indigo-500 shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
                                title={isAr ? 'عرض شبكي' : 'Grid View'}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 dark:bg-zinc-800 text-indigo-500 shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
                                title={isAr ? 'قائمة تفصيلية' : 'List View'}
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-slate-100 dark:bg-zinc-800 text-indigo-500 shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
                                title={isAr ? 'عرض مكثف سريع' : 'Compact Rows'}
                            >
                                <AlignJustify className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('showcase')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'showcase' ? 'bg-slate-100 dark:bg-zinc-800 text-indigo-500 shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
                                title={isAr ? 'عرض استعراضي فاخر' : 'Showcase Mode'}
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 5. STICKY CATEGORY NAVIGATION */}
                <div className="sticky top-0 z-30 px-4 py-2.5 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-y border-black/5 dark:border-white/10 shadow-xs">
                    <div 
                        ref={categoryNavRef}
                        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
                    >
                        <button
                            id="nav-cat-t30-all"
                            onClick={() => scrollToCategory('all')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                                activeCategory === 'all'
                                    ? 'text-white shadow-md'
                                    : 'bg-white/70 dark:bg-zinc-900/70 text-slate-700 dark:text-zinc-300 border border-black/5 dark:border-white/10 hover:bg-slate-100'
                            }`}
                            style={{
                                backgroundColor: activeCategory === 'all' ? primaryColor : undefined
                            }}
                        >
                            {isAr ? 'القائمة كاملة' : 'Full Menu'}
                        </button>

                        {categories.map(cat => {
                            const isCatActive = activeCategory === String(cat.id);
                            return (
                                <button
                                    key={`nav-t30-${cat.id}`}
                                    id={`nav-cat-t30-${cat.id}`}
                                    onClick={() => scrollToCategory(String(cat.id))}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                                        isCatActive
                                            ? 'text-white shadow-md'
                                            : 'bg-white/70 dark:bg-zinc-900/70 text-slate-700 dark:text-zinc-300 border border-black/5 dark:border-white/10 hover:bg-slate-100'
                                    }`}
                                    style={{
                                        backgroundColor: isCatActive ? primaryColor : undefined
                                    }}
                                >
                                    <span>{catName(cat)}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isCatActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-500'}`}>
                                        {cat.items?.length || 0}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 6. SEARCH RESULTS OR EMPTY STATE */}
                {searchQuery && (
                    <div className="px-4 pt-4">
                        <div className="flex items-center justify-between bg-white/70 dark:bg-zinc-900/70 p-3 rounded-2xl border border-black/5 dark:border-white/10">
                            <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                                {isAr ? `نتائج البحث الذكي عن: "${searchQuery}"` : `Smart Search Results for: "${searchQuery}"`}
                            </span>
                            <span className="text-xs font-black px-2 py-0.5 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                                {totalMatchingItems} {isAr ? 'صنف' : 'items'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {totalMatchingItems === 0 && (
                    <div className="text-center py-16 px-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <Utensils className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-base mb-1">
                            {isAr ? 'لم نتمكن من العثور على أي صنف' : 'No items found'}
                        </h3>
                        <p className="text-xs text-slate-400">
                            {isAr ? 'جرب البحث بكلمات أخرى أو اختر قسماً مختلفاً' : 'Try searching for other keywords'}
                        </p>
                    </div>
                )}

                {/* 7. MENU CATEGORIES & ITEMS LIST */}
                <div className="px-3 sm:px-4 py-4 space-y-7">
                    {processedCategories.map(cat => (
                        <section 
                            key={`section-t30-${cat.id}`}
                            id={`cat-section-t30-${cat.id}`}
                            className="scroll-mt-20"
                        >
                            {/* Category Title Header */}
                            <div className="flex items-center justify-between gap-3 mb-3.5 px-1">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-5 rounded-full" style={{ backgroundColor: primaryColor }} />
                                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                                        {catName(cat)}
                                    </h2>
                                    <span className="text-xs font-bold text-slate-400">
                                        ({cat.items?.length || 0})
                                    </span>
                                </div>
                            </div>

                            {/* Category Banner if provided */}
                            {cat.image_url && viewMode === 'showcase' && (
                                <div className="w-full h-32 sm:h-44 rounded-3xl overflow-hidden mb-3.5 relative shadow-md">
                                    <OptimizedMenuImage 
                                        originalSrc={cat.image_url}
                                        thumbnailSrc={cat.thumbnail_url}
                                        alt={catName(cat)}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                                        <h3 className="text-white font-black text-lg drop-shadow-md">
                                            {catName(cat)}
                                        </h3>
                                    </div>
                                </div>
                            )}

                            {/* Render Items by View Mode */}
                            {/* A. GRID MODE (2x2) */}
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                                    {cat.items?.map(item => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const hasMultipleSizes = Boolean(item.prices && item.prices.length > 1);
                                        const hasDiscount = item.old_prices && item.old_prices.some((op, idx) => op && op > (item.prices?.[idx] || 0));
                                        const discountPercent = hasDiscount && item.prices?.[0] && item.old_prices?.[0] && item.old_prices[0] > item.prices[0]
                                            ? Math.round(((item.old_prices[0] - item.prices[0]) / item.old_prices[0]) * 100) 
                                            : null;

                                        return (
                                            <div
                                                key={`grid-item-t30-${item.id}`}
                                                onClick={() => handleItemClick(item, catName(cat), cat.id, 0)}
                                                className="group relative bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md rounded-3xl p-2.5 sm:p-3 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                                            >
                                                {/* Image & Badges */}
                                                <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2 bg-slate-100 dark:bg-zinc-800">
                                                    {item.image_url || item.image ? (
                                                        <OptimizedMenuImage 
                                                            originalSrc={item.image_url || item.image || ''}
                                                            thumbnailSrc={item.thumbnail_url}
                                                            alt={itemName(item)}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                            <Utensils className="w-8 h-8" />
                                                        </div>
                                                    )}

                                                    {/* Discount badge */}
                                                    {discountPercent && (
                                                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs">
                                                            {discountPercent}%- {isAr ? 'خصم' : 'OFF'}
                                                        </span>
                                                    )}

                                                    {/* Favorite icon */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFavorites(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                                                        }}
                                                        className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-75 transition-all"
                                                    >
                                                        <Heart className={`w-3.5 h-3.5 ${favorites[item.id] ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                                                    </button>
                                                </div>

                                                {/* Text Info */}
                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-indigo-500 transition-colors">
                                                        {itemName(item)}
                                                    </h3>
                                                    {itemDesc(item) && (
                                                        <p className="text-[11px] text-slate-400 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                                            {itemDesc(item)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Price & Add Controls */}
                                                {hasMultipleSizes ? (
                                                    <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 space-y-1.5">
                                                        {/* Sizes Grid: 2 cols side-by-side like Theme 26; 3rd or odd-last size spans 2 cols underneath */}
                                                        <div className={`grid grid-cols-2 gap-1.5 w-full ${item.prices.length > 4 ? 'max-h-[160px] overflow-y-auto no-scrollbar' : ''}`}>
                                                            {item.prices.map((price, pIdx) => {
                                                                const label = item.size_labels?.[pIdx] || (isAr ? `حجم ${pIdx + 1}` : `Size ${pIdx + 1}`);
                                                                const oldPrice = item.old_prices?.[pIdx];
                                                                const hasDisc = Boolean(oldPrice && oldPrice > price);
                                                                const sizeDiscountPercent = hasDisc && oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
                                                                const sizeCartQty = getItemSizeCartQty(item.id, pIdx);
                                                                const isOddLast = (item.prices.length % 2 !== 0) && (pIdx === item.prices.length - 1);

                                                                return (
                                                                    <button
                                                                        key={pIdx}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleItemClick(item, catName(cat), cat.id, pIdx);
                                                                        }}
                                                                        className={`relative group/size flex flex-col items-center justify-between py-1.5 px-1.5 rounded-xl border transition-all text-center min-h-[52px] ${
                                                                            isOddLast ? 'col-span-2' : ''
                                                                        } ${
                                                                            sizeCartQty > 0
                                                                                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-2xs ring-1 ring-indigo-500/50'
                                                                                : hasDisc
                                                                                    ? 'border-rose-400/80 bg-rose-50/70 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 hover:border-rose-500 shadow-2xs'
                                                                                    : 'border-black/5 dark:border-white/10 bg-slate-50/80 dark:bg-zinc-800/80 hover:border-indigo-500/40 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200'
                                                                        }`}
                                                                    >
                                                                        {/* Offer Badge on Top of Pill */}
                                                                        {hasDisc && sizeDiscountPercent && (
                                                                            <span className="absolute -top-2 inset-x-0 mx-auto w-fit px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[8px] font-black shadow-2xs whitespace-nowrap leading-none flex items-center gap-0.5 z-10">
                                                                                <span>%{sizeDiscountPercent}</span>
                                                                                <span>{isAr ? 'خصم' : 'OFF'}</span>
                                                                            </span>
                                                                        )}

                                                                        {/* Cart Qty Badge */}
                                                                        {sizeCartQty > 0 && (
                                                                            <span 
                                                                                className="absolute -top-1.5 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-xs z-10"
                                                                                style={{ backgroundColor: primaryColor }}
                                                                            >
                                                                                {sizeCartQty}
                                                                            </span>
                                                                        )}

                                                                        {/* Size Label */}
                                                                        <span className={`text-[10.5px] font-bold truncate max-w-full leading-tight ${hasDisc ? 'text-rose-700 dark:text-rose-300 font-black' : 'text-slate-600 dark:text-zinc-400'}`}>
                                                                            {label}
                                                                        </span>

                                                                        {/* Price & Offer Display - Stacked Vertically */}
                                                                        <div className="w-full flex flex-col items-center justify-center leading-none mt-0.5">
                                                                            {hasDisc ? (
                                                                                <>
                                                                                    <span className="text-[9px] line-through text-rose-500/80 font-bold decoration-rose-500/80 leading-none mb-0.5">
                                                                                        {oldPrice}
                                                                                    </span>
                                                                                    <div className="flex items-baseline justify-center gap-0.5 leading-none">
                                                                                        <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                                                                                            {price}
                                                                                        </span>
                                                                                        <span className="text-[8px] font-bold text-slate-400">
                                                                                            {cur}
                                                                                        </span>
                                                                                    </div>
                                                                                </>
                                                                            ) : (
                                                                                <div className="flex items-baseline justify-center gap-0.5 leading-none">
                                                                                    <span className="text-xs font-black" style={{ color: primaryColor }}>
                                                                                        {price}
                                                                                    </span>
                                                                                    <span className="text-[8px] font-bold text-slate-400">
                                                                                        {cur}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Bottom row: Info & Action */}
                                                        <div className="flex items-center justify-between gap-1 pt-1 mt-1 border-t border-black/5 dark:border-white/5">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                {/* Always preserve written size count */}
                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 truncate">
                                                                    {item.prices.length} {isAr ? 'أحجام' : 'sizes'}
                                                                </span>
                                                                {hasDiscount && (
                                                                    <span className="text-[9.5px] font-black text-rose-500 flex items-center gap-0.5 shrink-0">
                                                                        <Flame className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                                                                        <span>{isAr ? 'عروض' : 'Offers'}</span>
                                                                    </span>
                                                                )}
                                                                {inCartQty > 0 && (
                                                                    <span className="text-[9.5px] font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                                                                        ({inCartQty})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleItemClick(item, catName(cat), cat.id, 0);
                                                                }}
                                                                className="px-3 py-1 rounded-xl text-white text-[11px] font-black flex items-center gap-1 shadow-xs active:scale-95 transition-all shrink-0"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                <span>{isAr ? 'طلب' : 'Order'}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Single price layout */
                                                    <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                                                        <div>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                                                    {item.prices?.[0] || 0}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    {cur}
                                                                </span>
                                                            </div>
                                                            {hasDiscount && item.old_prices?.[0] && (
                                                                <span className="text-[10px] text-slate-400 line-through">
                                                                    {item.old_prices[0]} {cur}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Qty Stepper or Plus Button */}
                                                        {inCartQty > 0 ? (
                                                            <div 
                                                                className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-1.5 py-1 rounded-xl shadow-xs"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <button
                                                                    onClick={() => quickDecrementFromCart(item.id)}
                                                                    className="w-5 h-5 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 active:scale-90"
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-xs font-black min-w-[14px] text-center">
                                                                    {inCartQty}
                                                                </span>
                                                                <button
                                                                    onClick={() => quickAddToCart(item, catName(cat), 0)}
                                                                    className="w-5 h-5 rounded-lg text-white flex items-center justify-center active:scale-90 shadow-2xs"
                                                                    style={{ backgroundColor: primaryColor }}
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleItemClick(item, catName(cat), cat.id, 0);
                                                                }}
                                                                className="w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-xs active:scale-90 transition-all"
                                                                style={{ backgroundColor: primaryColor }}
                                                                title={isAr ? 'أضف للسلة' : 'Add to cart'}
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* B. LIST MODE */}
                            {viewMode === 'list' && (
                                <div className="space-y-3">
                                    {cat.items?.map(item => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const hasMultipleSizes = Boolean(item.prices && item.prices.length > 1);
                                        const hasDiscount = item.old_prices && item.old_prices.some((op, idx) => op && op > (item.prices?.[idx] || 0));

                                        return (
                                            <div
                                                key={`list-item-t30-${item.id}`}
                                                onClick={() => handleItemClick(item, catName(cat), cat.id, 0)}
                                                className="group bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md rounded-3xl p-3 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-md transition-all flex items-center gap-3 cursor-pointer"
                                            >
                                                {/* Thumbnail */}
                                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0">
                                                    {item.image_url || item.image ? (
                                                        <OptimizedMenuImage 
                                                            originalSrc={item.image_url || item.image || ''}
                                                            thumbnailSrc={item.thumbnail_url}
                                                            alt={itemName(item)}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                            <Utensils className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-1">
                                                        <h3 className="font-bold text-sm sm:text-base line-clamp-1 group-hover:text-indigo-500 transition-colors">
                                                            {itemName(item)}
                                                        </h3>
                                                        {inCartQty > 0 && hasMultipleSizes && (
                                                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                                {inCartQty} {isAr ? 'بالسلة' : 'in cart'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {itemDesc(item) && (
                                                        <p className="text-xs text-slate-400 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                                                            {itemDesc(item)}
                                                        </p>
                                                    )}

                                                    {hasMultipleSizes ? (
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                            {item.prices.map((price, pIdx) => {
                                                                const label = item.size_labels?.[pIdx] || (isAr ? `حجم ${pIdx + 1}` : `Size ${pIdx + 1}`);
                                                                const oldPrice = item.old_prices?.[pIdx];
                                                                const hasDisc = Boolean(oldPrice && oldPrice > price);
                                                                const sizeCartQty = getItemSizeCartQty(item.id, pIdx);

                                                                return (
                                                                    <button
                                                                        key={pIdx}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleItemClick(item, catName(cat), cat.id, pIdx);
                                                                        }}
                                                                        className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all ${
                                                                            sizeCartQty > 0
                                                                                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                                                                : hasDisc
                                                                                    ? 'border-rose-400/80 bg-rose-50/70 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 shadow-2xs'
                                                                                    : 'border-black/5 dark:border-white/10 bg-slate-50/80 dark:bg-zinc-800/80 hover:border-indigo-500/40 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200'
                                                                        }`}
                                                                    >
                                                                        {hasDisc && oldPrice && (
                                                                            <span className="px-1 py-0.2 rounded-md bg-rose-500 text-white text-[8px] font-black shrink-0">
                                                                                %{Math.round(((oldPrice - price) / oldPrice) * 100)} {isAr ? 'خصم' : 'OFF'}
                                                                            </span>
                                                                        )}
                                                                        {sizeCartQty > 0 && (
                                                                            <span 
                                                                                className="min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-xs"
                                                                                style={{ backgroundColor: primaryColor }}
                                                                            >
                                                                                {sizeCartQty}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">{label}:</span>
                                                                        {hasDisc && <span className="text-[10px] text-rose-500/80 line-through decoration-rose-500/80 font-bold">{oldPrice}</span>}
                                                                        <span className="font-black" style={{ color: hasDisc ? '#e11d48' : primaryColor }}>{price}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400">{cur}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-baseline gap-1 mt-1">
                                                            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                                                {item.prices?.[0] || 0}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {cur}
                                                            </span>
                                                            {hasDiscount && item.old_prices?.[0] && (
                                                                <span className="text-[10px] text-slate-400 line-through mr-1">
                                                                    {item.old_prices[0]} {cur}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action */}
                                                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    {hasMultipleSizes ? (
                                                        <button
                                                            onClick={() => handleItemClick(item, catName(cat), cat.id, 0)}
                                                            className="px-3 py-2 rounded-xl text-white text-xs font-black shadow-xs active:scale-90 flex items-center gap-1 transition-all"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            <span>{isAr ? 'اختر الحجم' : 'Select Size'}</span>
                                                        </button>
                                                    ) : inCartQty > 0 ? (
                                                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-2 py-1.5 rounded-xl shadow-xs">
                                                            <button
                                                                onClick={() => quickDecrementFromCart(item.id)}
                                                                className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 active:scale-90"
                                                            >
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </button>
                                                            <span className="text-xs font-black min-w-[16px] text-center">
                                                                {inCartQty}
                                                            </span>
                                                            <button
                                                                onClick={() => quickAddToCart(item, catName(cat), 0)}
                                                                className="w-6 h-6 rounded-lg text-white flex items-center justify-center active:scale-90 shadow-2xs"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleItemClick(item, catName(cat), cat.id, 0)}
                                                            className="px-3.5 py-2 rounded-xl text-white text-xs font-black shadow-xs active:scale-90 flex items-center gap-1 transition-all"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            <span>{isAr ? 'أضف' : 'Add'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* C. COMPACT ROWS MODE */}
                            {viewMode === 'compact' && (
                                <div className="space-y-1.5">
                                    {cat.items?.map(item => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const hasMultipleSizes = Boolean(item.prices && item.prices.length > 1);

                                        return (
                                            <div
                                                key={`compact-item-t30-${item.id}`}
                                                onClick={() => handleItemClick(item, catName(cat), cat.id, 0)}
                                                className="group bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md rounded-2xl px-3 py-2.5 border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-all"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <h3 className="font-bold text-xs sm:text-sm truncate">
                                                            {itemName(item)}
                                                        </h3>
                                                        {inCartQty > 0 && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                                {inCartQty}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {itemDesc(item) && (
                                                        <p className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">
                                                            {itemDesc(item)}
                                                        </p>
                                                    )}
                                                    {/* Sizes Chips for Compact Mode */}
                                                    {hasMultipleSizes && (
                                                        <div className="flex flex-wrap items-center gap-1 mt-1">
                                                            {item.prices.map((price, pIdx) => {
                                                                const label = item.size_labels?.[pIdx] || (isAr ? `حجم ${pIdx + 1}` : `S${pIdx + 1}`);
                                                                const sizeCartQty = getItemSizeCartQty(item.id, pIdx);
                                                                return (
                                                                    <button
                                                                        key={pIdx}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleItemClick(item, catName(cat), cat.id, pIdx);
                                                                        }}
                                                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[10px] font-bold transition-all ${
                                                                            sizeCartQty > 0 
                                                                                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' 
                                                                                : 'border-black/5 dark:border-white/10 bg-slate-100/80 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:border-indigo-500/40'
                                                                        }`}
                                                                    >
                                                                        <span>{label}:</span>
                                                                        <span className="font-black" style={{ color: primaryColor }}>{price}</span>
                                                                        <span className="text-[8px] text-slate-400">{cur}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    {!hasMultipleSizes && (
                                                        <div className="text-left font-black text-xs sm:text-sm">
                                                            <span>{item.prices?.[0] || 0}</span>
                                                            <span className="text-[10px] font-normal text-slate-400 ml-0.5">{cur}</span>
                                                        </div>
                                                    )}

                                                    {hasMultipleSizes ? (
                                                        <button
                                                            onClick={() => handleItemClick(item, catName(cat), cat.id, 0)}
                                                            className="px-2.5 py-1.5 rounded-xl text-white text-[11px] font-black flex items-center gap-1 shadow-2xs active:scale-90 transition-all"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            <span>{isAr ? 'الأحجام' : 'Sizes'}</span>
                                                        </button>
                                                    ) : inCartQty > 0 ? (
                                                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                                                            <button
                                                                onClick={() => quickDecrementFromCart(item.id)}
                                                                className="w-5 h-5 rounded bg-white dark:bg-zinc-700 flex items-center justify-center active:scale-90"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="text-xs font-bold px-1">{inCartQty}</span>
                                                            <button
                                                                onClick={() => quickAddToCart(item, catName(cat), 0)}
                                                                className="w-5 h-5 rounded text-white flex items-center justify-center active:scale-90"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleItemClick(item, catName(cat), cat.id, 0)}
                                                            className="w-7 h-7 rounded-lg text-white flex items-center justify-center active:scale-90 shadow-2xs"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* D. SHOWCASE MODE */}
                            {viewMode === 'showcase' && (
                                <div className="space-y-4">
                                    {cat.items?.map(item => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const hasMultipleSizes = Boolean(item.prices && item.prices.length > 1);
                                        const hasDiscount = item.old_prices && item.old_prices.some((op, idx) => op && op > (item.prices?.[idx] || 0));

                                        return (
                                            <div
                                                key={`showcase-item-t30-${item.id}`}
                                                onClick={() => handleItemClick(item, catName(cat), cat.id, 0)}
                                                className="group bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md rounded-3xl overflow-hidden border border-black/5 dark:border-white/10 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                                            >
                                                <div className="relative w-full h-44 sm:h-52 bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                                                    {item.image_url || item.image ? (
                                                        <OptimizedMenuImage 
                                                            originalSrc={item.image_url || item.image || ''}
                                                            thumbnailSrc={item.thumbnail_url}
                                                            alt={itemName(item)}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                            <Utensils className="w-12 h-12" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                    <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between text-white">
                                                        <div>
                                                            <h3 className="font-black text-base sm:text-lg drop-shadow-md">
                                                                {itemName(item)}
                                                            </h3>
                                                            {itemDesc(item) && (
                                                                <p className="text-xs text-white/80 line-clamp-1 max-w-sm mt-0.5 drop-shadow-xs">
                                                                    {itemDesc(item)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            {hasMultipleSizes ? (
                                                                <div>
                                                                    <span className="text-[10px] text-white/80 block leading-tight">{isAr ? 'يبدأ من' : 'Starts from'}</span>
                                                                    <div className="text-base sm:text-lg font-black drop-shadow-md text-amber-300">
                                                                        {Math.min(...item.prices)} {cur}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <div className="text-base sm:text-lg font-black drop-shadow-md">
                                                                        {item.prices?.[0] || 0} {cur}
                                                                    </div>
                                                                    {hasDiscount && item.old_prices?.[0] && (
                                                                        <span className="text-xs text-white/60 line-through">
                                                                            {item.old_prices[0]} {cur}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex-1 min-w-0">
                                                        {hasMultipleSizes ? (
                                                            <div className="space-y-1.5">
                                                                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
                                                                    {isAr ? 'اختر الحجم مباشرة:' : 'Available Sizes:'}
                                                                </span>
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {item.prices.map((price, pIdx) => {
                                                                        const label = item.size_labels?.[pIdx] || (isAr ? `حجم ${pIdx + 1}` : `Size ${pIdx + 1}`);
                                                                        const oldPrice = item.old_prices?.[pIdx];
                                                                        const hasDisc = Boolean(oldPrice && oldPrice > price);
                                                                        const sizeCartQty = getItemSizeCartQty(item.id, pIdx);

                                                                        return (
                                                                            <button
                                                                                key={pIdx}
                                                                                type="button"
                                                                                onClick={() => handleItemClick(item, catName(cat), cat.id, pIdx)}
                                                                                className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                                                                    sizeCartQty > 0
                                                                                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                                                        : 'border-black/5 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 hover:border-indigo-500/40 text-slate-700 dark:text-zinc-200'
                                                                                }`}
                                                                            >
                                                                                {sizeCartQty > 0 && (
                                                                                    <span 
                                                                                        className="w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-xs"
                                                                                        style={{ backgroundColor: primaryColor }}
                                                                                    >
                                                                                        {sizeCartQty}
                                                                                    </span>
                                                                                )}
                                                                                <span className="text-slate-500 dark:text-zinc-400">{label}:</span>
                                                                                {hasDisc && <span className="text-[10px] text-slate-400 line-through">{oldPrice}</span>}
                                                                                <span className="font-black text-sm" style={{ color: primaryColor }}>{price}</span>
                                                                                <span className="text-[10px] font-bold text-slate-400">{cur}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-slate-500">
                                                                {catName(cat)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="shrink-0 flex items-center justify-end gap-2">
                                                        {hasMultipleSizes ? (
                                                            <button
                                                                onClick={() => handleItemClick(item, catName(cat), cat.id, 0)}
                                                                className="px-4 py-2 rounded-2xl text-white text-xs font-black shadow-xs active:scale-95 flex items-center gap-1.5 transition-all"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                                <span>{isAr ? 'عرض التفاصيل والطلب' : 'Select & Order'}</span>
                                                            </button>
                                                        ) : inCartQty > 0 ? (
                                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-2xl">
                                                                <button onClick={() => quickDecrementFromCart(item.id)} className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center active:scale-90">
                                                                    <Minus className="w-3.5 h-3.5" />
                                                                </button>
                                                                <span className="font-black text-sm px-1">{inCartQty}</span>
                                                                <button onClick={() => quickAddToCart(item, catName(cat), 0)} className="w-6 h-6 rounded-lg text-white flex items-center justify-center active:scale-90" style={{ backgroundColor: primaryColor }}>
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleItemClick(item, catName(cat), cat.id, 0)}
                                                                className="px-4 py-2 rounded-2xl text-white text-xs font-black shadow-xs active:scale-95 flex items-center gap-1.5"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <ShoppingCart className="w-3.5 h-3.5" />
                                                                <span>{isAr ? 'إضافة للسلة' : 'Add to Cart'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    ))}
                </div>

                {/* 8. FLOATING ULTRA-COMPACT CART DOCK */}
                {cartCount > 0 && !isCartOpen && (
                    <div className="fixed bottom-4 inset-x-0 z-40 px-4 flex justify-center pointer-events-none">
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="pointer-events-auto flex items-center justify-between gap-3 px-3 py-2 rounded-2xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-2xl backdrop-blur-xl border border-white/10 dark:border-black/10 w-full max-w-xs sm:max-w-sm"
                        >
                            <div className="flex items-center gap-2">
                                <div className="relative w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                                    <ShoppingCart className="w-4 h-4" />
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-slate-900 dark:border-white">
                                        {cartCount}
                                    </span>
                                </div>
                                <div className="leading-tight">
                                    <div className="text-[10px] opacity-75">{cartCount} {isAr ? 'أصناف' : 'items'}</div>
                                    <div className="text-xs font-black">{cartTotal} {cur}</div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="px-3.5 py-1.5 rounded-xl text-white font-black text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <span>{isAr ? 'عرض السلة' : 'View Cart'}</span>
                                {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                        </motion.div>
                    </div>
                )}

                {/* 9. CENTERED CART MODAL */}
                <AnimatePresence>
                    {isCartOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsCartOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ scale: 0.92, opacity: 0, y: 15 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.92, opacity: 0, y: 15 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-2xl z-10 max-h-[85vh] flex flex-col border border-black/5 dark:border-white/10 my-auto"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5 text-indigo-500" />
                                        <h3 className="font-black text-base sm:text-lg">
                                            {isAr ? 'سلة الطلبات' : 'Your Cart'} ({cartCount})
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {cart.length > 0 && (
                                            <button
                                                onClick={() => setCart([])}
                                                className="text-xs text-rose-500 font-bold hover:underline flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>{isAr ? 'تفريغ' : 'Clear'}</span>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setIsCartOpen(false)}
                                            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Items list */}
                                <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar">
                                    {cart.map((line, idx) => (
                                        <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm truncate">{itemName(line.item)}</h4>
                                                <div className="text-[11px] text-slate-400">
                                                    {line.sizeLabel} {line.extras && line.extras.length > 0 && `+ ${line.extras.map(e => e.name).join(', ')}`}
                                                </div>
                                                {line.notes && (
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate">
                                                        📝 {line.notes}
                                                    </p>
                                                )}
                                                <div className="font-black text-xs mt-1 text-slate-800 dark:text-zinc-100">
                                                    {line.price * line.quantity} {cur}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 bg-white dark:bg-zinc-700 px-2 py-1 rounded-xl shadow-2xs">
                                                <button 
                                                    onClick={() => {
                                                        setCart(prev => {
                                                            if (line.quantity > 1) {
                                                                const up = [...prev];
                                                                up[idx].quantity -= 1;
                                                                return up;
                                                            }
                                                            return prev.filter((_, i) => i !== idx);
                                                        });
                                                    }}
                                                    className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-zinc-200"
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="font-bold text-xs min-w-[16px] text-center">{line.quantity}</span>
                                                <button 
                                                    onClick={() => {
                                                        setCart(prev => {
                                                            const up = [...prev];
                                                            up[idx].quantity += 1;
                                                            return up;
                                                        });
                                                    }}
                                                    className="w-6 h-6 rounded text-white flex items-center justify-center"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer & Checkout */}
                                <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-3">
                                    <div className="flex items-center justify-between font-black text-base">
                                        <span>{isAr ? 'الإجمالي:' : 'Total:'}</span>
                                        <span className="text-lg" style={{ color: primaryColor }}>{cartTotal} {cur}</span>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            setShowCheckout(true);
                                        }}
                                        className="w-full h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        <span>{isAr ? 'متابعة تفاصيل الطلب' : 'Proceed to Checkout'}</span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 10. RICH ITEM DETAIL MODAL */}
                <AnimatePresence>
                    {selectedItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedItem(null)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl z-10 border border-black/5 dark:border-white/10 max-h-[90vh] flex flex-col my-auto"
                            >
                                {/* Modal Image */}
                                <div className="relative w-full h-48 sm:h-56 bg-slate-100 dark:bg-zinc-800 shrink-0">
                                    {selectedItem.item.image_url || selectedItem.item.image ? (
                                        <OptimizedMenuImage 
                                            originalSrc={selectedItem.item.image_url || selectedItem.item.image || ''}
                                            thumbnailSrc={selectedItem.item.thumbnail_url}
                                            alt={itemName(selectedItem.item)}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                            <Utensils className="w-12 h-12" />
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setSelectedItem(null)}
                                        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 no-scrollbar">
                                    <div>
                                        <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
                                            {selectedItem.catName}
                                        </span>
                                        <h3 className="text-lg sm:text-xl font-black mt-0.5">
                                            {itemName(selectedItem.item)}
                                        </h3>
                                        {itemDesc(selectedItem.item) && (
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                                {itemDesc(selectedItem.item)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Sizes Selector */}
                                    {selectedItem.item.prices && selectedItem.item.prices.length > 1 && (
                                        <div>
                                            <label className="text-xs font-black text-slate-700 dark:text-zinc-300 mb-1.5 block">
                                                {isAr ? 'اختر الحجم:' : 'Select Size:'}
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedItem.item.prices.map((p, idx) => {
                                                    const lbl = selectedItem.item.size_labels?.[idx] || (isAr ? `حجم ${idx + 1}` : `Size ${idx + 1}`);
                                                    const oldP = selectedItem.item.old_prices?.[idx];
                                                    const hasDisc = Boolean(oldP && oldP > p);
                                                    const discPct = hasDisc && oldP ? Math.round(((oldP - p) / oldP) * 100) : null;
                                                    const isSelected = modalSizeIdx === idx;
                                                    const isOddLast = (selectedItem.item.prices.length % 2 !== 0) && (idx === selectedItem.item.prices.length - 1);
                                                    return (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => setModalSizeIdx(idx)}
                                                            className={`relative p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                                                                isOddLast ? 'col-span-2' : ''
                                                            } ${
                                                                isSelected 
                                                                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-indigo-500/50' 
                                                                    : hasDisc
                                                                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-slate-700 dark:text-zinc-300 hover:border-rose-400'
                                                                        : 'border-black/5 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                {hasDisc && discPct && (
                                                                    <span className="px-1.5 py-0.2 rounded-md bg-rose-500 text-white text-[8px] font-black shrink-0">
                                                                        %{discPct}
                                                                    </span>
                                                                )}
                                                                <span className="truncate">{lbl}</span>
                                                            </div>
                                                            <div className="flex items-baseline gap-1 shrink-0">
                                                                {hasDisc && (
                                                                    <span className="text-[10px] text-slate-400 line-through">
                                                                        {oldP}
                                                                    </span>
                                                                )}
                                                                <span className="font-black" style={{ color: isSelected ? undefined : hasDisc ? '#e11d48' : undefined }}>
                                                                    {p} {cur}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Extras Selector */}
                                    {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                        <div>
                                            <label className="text-xs font-black text-slate-700 dark:text-zinc-300 mb-1.5 block">
                                                {isAr ? 'الإضافات المقترحة:' : 'Suggested Extras:'}
                                            </label>
                                            <div className="space-y-1.5">
                                                {selectedItem.item.extras.map((ex, idx) => {
                                                    const exName = isAr ? ex.name_ar : (ex.name_en || ex.name_ar);
                                                    const isChosen = modalExtras.some(e => e.name === exName);
                                                    return (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => toggleModalExtra(exName, ex.price)}
                                                            className={`w-full p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                                                                isChosen 
                                                                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                                                                    : 'border-black/5 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${isChosen ? 'bg-indigo-500 text-white border-indigo-500' : 'border-slate-300'}`}>
                                                                    {isChosen && '✓'}
                                                                </span>
                                                                <span>{exName}</span>
                                                            </span>
                                                            <span className="font-black">+{ex.price} {cur}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <div>
                                        <label className="text-xs font-black text-slate-700 dark:text-zinc-300 mb-1.5 block">
                                            {isAr ? 'ملاحظات خاصة للطلب:' : 'Special Instructions:'}
                                        </label>
                                        <textarea 
                                            value={modalNotes}
                                            onChange={(e) => setModalNotes(e.target.value)}
                                            placeholder={isAr ? 'مثال: بدون بصل، سكر زيادة...' : 'e.g. no onions, extra sauce...'}
                                            rows={2}
                                            className="w-full p-3 rounded-2xl text-xs bg-slate-50 dark:bg-zinc-800 border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Modal Footer (Two-Row Stacked Layout for 100% Price Visibility) */}
                                <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-zinc-800/80 border-t border-black/5 dark:border-white/10 space-y-2.5">
                                    {/* Row 1: Quantity selector */}
                                    <div className="flex items-center justify-between bg-white dark:bg-zinc-900 px-3.5 py-2 rounded-2xl border border-black/5 dark:border-white/5">
                                        <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                                            {isAr ? 'الكمية المطلوبة:' : 'Quantity:'}
                                        </span>
                                        <div className="flex items-center gap-2.5">
                                            <button 
                                                type="button"
                                                onClick={() => setModalQty(prev => Math.max(1, prev - 1))}
                                                className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 active:scale-90"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="font-black text-sm min-w-[20px] text-center">{modalQty}</span>
                                            <button 
                                                type="button"
                                                onClick={() => setModalQty(prev => prev + 1)}
                                                className="w-7 h-7 rounded-xl text-white flex items-center justify-center active:scale-90"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Row 2: Full-width Add to Cart button */}
                                    <button
                                        type="button"
                                        onClick={addModalToCart}
                                        className="w-full h-12 rounded-2xl text-white font-black text-xs sm:text-sm flex items-center justify-between px-4 shadow-lg active:scale-98 transition-all"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <ShoppingCart className="w-4 h-4 shrink-0" />
                                            <span>{isAr ? 'إضافة للسلة' : 'Add to Cart'}</span>
                                        </div>
                                        <span className="bg-black/20 dark:bg-white/20 px-3 py-1 rounded-xl text-xs sm:text-sm font-black tracking-wide shrink-0">
                                            {modalCalculatedTotal} {cur}
                                        </span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 10.5 PAYMENT METHODS MODAL */}
                <AnimatePresence>
                    {isPaymentModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-2xl z-10 border border-black/5 dark:border-white/10 max-h-[85vh] overflow-y-auto no-scrollbar my-auto"
                            >
                                {/* Modal Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                                    <div className="flex items-center gap-2.5">
                                        <div 
                                            className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <CreditCard className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-sm sm:text-base leading-tight">
                                                {isAr ? 'وسائل الدفع المتاحة' : 'Payment Methods'}
                                            </h3>
                                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
                                                {isAr ? 'طرق السداد المعتمدة لدى المطعم' : 'Accepted payment options'}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsPaymentModalOpen(false)}
                                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Payment Methods List */}
                                <div className="py-4 space-y-3">
                                    {config.payment_methods && config.payment_methods.length > 0 ? (
                                        config.payment_methods.map((pm: any, idx: number) => {
                                            const title = isAr ? pm.name_ar : (pm.name_en || pm.name_ar);
                                            const desc = isAr ? pm.desc_ar : (pm.desc_en || pm.desc_ar);
                                            return (
                                                <div 
                                                    key={pm.id || idx} 
                                                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-xs sm:text-sm text-slate-800 dark:text-zinc-100">
                                                            {title}
                                                        </span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                            {isAr ? 'متاح' : 'Available'}
                                                        </span>
                                                    </div>

                                                    {desc && (
                                                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                                                            {desc}
                                                        </p>
                                                    )}

                                                    {pm.number && (
                                                        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border border-black/5 dark:border-white/5">
                                                            <span className="font-mono font-black text-xs tracking-wider" dir="ltr">
                                                                {pm.number}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(pm.number);
                                                                    setCopiedNumber(pm.number);
                                                                    setTimeout(() => setCopiedNumber(null), 2500);
                                                                }}
                                                                className="text-[11px] font-black px-2.5 py-1 rounded-lg text-white transition-all active:scale-95 shadow-2xs"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                {copiedNumber === pm.number ? (isAr ? 'تم النسخ ✓' : 'Copied!') : (isAr ? 'نسخ الرقم' : 'Copy')}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {pm.link && (
                                                        <a 
                                                            href={pm.link} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-white text-xs font-black shadow-xs active:scale-95 transition-all mt-1"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <span>{isAr ? 'الدفع مباشرة عبر الرابط' : 'Pay via Link'}</span>
                                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <>
                                            {/* Default Fallback Payment Methods */}
                                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-xs sm:text-sm text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                                                        <span>💵</span>
                                                        <span>{isAr ? 'الدفع عند الاستلام (كاش)' : 'Cash on Delivery'}</span>
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                        {isAr ? 'متاح' : 'Active'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                                    {isAr ? 'الدفع المباشر كاش عند استلام الأوردر في الصالة أو مع مندوب الدليفري.' : 'Pay cash upon delivery or dine-in.'}
                                                </p>
                                            </div>

                                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-xs sm:text-sm text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                                                        <span>📱</span>
                                                        <span>{isAr ? 'انستا باي / محافظ إلكترونية' : 'InstaPay & E-Wallets'}</span>
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                        {isAr ? 'متاح' : 'Active'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                                    {isAr ? 'متاح التحويل اللحظي عبر انستا باي أو المحافظ الإلكترونية (فودافون كاش، اتصالات، أورنج).' : 'Instant transfer via InstaPay or Mobile Wallets.'}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Screenshot Confirmation Notice */}
                                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center gap-2.5 text-amber-800 dark:text-amber-300 shadow-2xs">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-base">
                                        📸
                                    </div>
                                    <p className="text-xs font-black leading-snug">
                                        {isAr ? 'برجاء إرسال سكرين شوت على رقم الواتساب للتأكيد' : 'Please send a screenshot to WhatsApp for confirmation'}
                                    </p>
                                </div>

                                {/* Footer WhatsApp Button */}
                                {whatsappClean && (
                                    <a
                                        href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent(isAr ? 'السلام عليكم، قمت بالتحويل وأود إرسال سكرين شوت لتأكيد الطلب' : 'Hello, I have completed the transfer and would like to send a screenshot to confirm my order')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full h-11 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all mt-1"
                                    >
                                        <FaWhatsapp className="w-4 h-4" />
                                        <span>{isAr ? 'تأكيد أو تحويل الدفع عبر واتساب' : 'Confirm Payment on WhatsApp'}</span>
                                    </a>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 11. CHECKOUT MODAL */}
                <CheckoutModal 
                    isOpen={showCheckout} 
                    onClose={() => setShowCheckout(false)} 
                    cartItems={cart.map(c => ({
                        id: String(c.id),
                        title: itemName(c.item),
                        qty: c.quantity,
                        price: c.price,
                        size: c.sizeLabel !== (isAr ? 'عادي' : 'Regular') ? c.sizeLabel : undefined,
                        category: c.catName,
                        notes: c.notes,
                        extras: (c.extras || []).map(e => ({ name: e.name, price: e.price, qty: e.qty || 1 })),
                        item: c.item
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

                {/* 12. ASN BRANDING FOOTER */}
                <ASNFooter show={config.show_asn_branding !== false} />
            </div>
        </div>
    );
}
