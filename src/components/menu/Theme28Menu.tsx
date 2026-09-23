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

interface Theme28MenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
    language?: string;
    suppressInternalPopup?: boolean;
}

type ViewMode = 'grid' | 'list' | 'compact' | 'showcase';
type FilterTag = 'all' | 'popular' | 'new' | 'offers';

export default function Theme28Menu({ config, categories, restaurantId, suppressInternalPopup = false }: Theme28MenuProps) {
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

    // Color resolution
    const getPrimaryColor = (themeName?: string, customPrimary?: string) => {
        if (customPrimary) return customPrimary;
        if (!themeName) return '#059669'; // Emerald luxury
        if (themeName.endsWith('-amber') || themeName.endsWith('-gold')) return '#d97706';
        if (themeName.endsWith('-red')) return '#dc2626';
        if (themeName.endsWith('-cyan')) return '#0891b2';
        if (themeName.endsWith('-purple')) return '#7c3aed';
        if (themeName.endsWith('-dark')) return '#0f172a';
        if (themeName.endsWith('-pink')) return '#ec4899';
        if (themeName.endsWith('-emerald')) return '#059669';
        return '#059669';
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
    const bgImageLight = tc.theme28_bg_light || tc.theme27_bg_light || tc.bg_image_light || tc.bg_light || '';
    const bgImageDark = tc.theme28_bg_dark || tc.theme27_bg_dark || tc.bg_image_dark || tc.bg_dark || '';
    const activeBgImage = (isDark ? (bgImageDark || bgImageLight) : (bgImageLight || bgImageDark))?.trim() || '';
    const hasBgImage = Boolean(activeBgImage.length > 0);

    // Config options
    const defaultView = (tc.theme28_default_view_mode || config?.theme28_default_view_mode || 'grid') as ViewMode;
    const [viewMode, setViewMode] = useState<ViewMode>(['grid', 'list', 'compact', 'showcase'].includes(defaultView) ? defaultView : 'grid');
    const showStoriesBar = tc.theme28_show_stories !== false && config?.theme28_show_stories !== false;

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
        tc.theme28_popup || tc.theme27_popup || null;

    useEffect(() => {
        if (!suppressInternalPopup && popupConfig?.enabled) {
            const popupKey = `theme28_popup_${restaurantId || config?.id || 'dismissed'}`;
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
                const el = document.getElementById(`cat-section-${categories[i].id}`);
                if (el && el.offsetTop <= scrollPos) {
                    const catId = String(categories[i].id);
                    if (activeCategory !== catId) {
                        setActiveCategory(catId);
                        const navBtn = document.getElementById(`nav-cat-${catId}`);
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
        const el = document.getElementById(`cat-section-${catId}`);
        if (el) {
            const offset = 60;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    // Filter items based on active tags & search
    const processedCategories = useMemo(() => {
        return categories.map(cat => {
            const filteredItems = (cat.items || []).filter(item => {
                // Availability
                if (item.is_available === false) return false;

                // Smart cross-entity search query match
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

    // Quick add or open modal
    const handleItemClick = (item: MenuItem, catNameStr: string, catId: string | number) => {
        const hasSizes = (item.prices && item.prices.length > 1) || (item.size_labels && item.size_labels.length > 1);
        const hasExtras = item.extras && item.extras.length > 0;

        // If item has sizes, extras, or details, open rich modal
        if (hasSizes || hasExtras || itemDesc(item)) {
            setSelectedItem({ item, catName: catNameStr, categoryId: catId });
            setModalSizeIdx(0);
            setModalQty(1);
            setModalNotes('');
            setModalExtras([]);
        } else {
            // Instant add to cart
            quickAddToCart(item, catNameStr, 0);
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
                // user canceled share
            }
        } else if (typeof navigator !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            alert(isAr ? 'تم نسخ رابط المنيو بنجاح!' : 'Menu link copied!');
        }
    };

    // Toggle Favorite
    const toggleFavorite = (itemId: string | number, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavorites(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    // Phone list
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
            <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div 
            className="min-w-0 w-full max-w-full min-h-screen font-cairo pb-36 relative transition-colors duration-300 selection:bg-emerald-500 selection:text-white"
            style={{ 
                backgroundColor: hasBgImage ? 'transparent' : (isDark ? '#090a0f' : '#f8fafc'),
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
                            backgroundColor: isDark ? 'rgba(9, 10, 15, 0.75)' : 'rgba(248, 250, 252, 0.82)' 
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

                {/* 2. BRAND HERO HEADER */}
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
                                <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
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
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-xs border border-black/5 dark:border-white/10 active:scale-95 text-amber-600 dark:text-amber-400 shrink-0"
                                title={isAr ? 'طرق الدفع المتاحة' : 'Payment Methods'}
                            >
                                <CreditCard className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Social & Contact Actions */}
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            {primaryPhone && (
                                <a 
                                    href={`tel:${primaryPhone}`}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-xs border border-black/5 dark:border-white/10 text-emerald-600 dark:text-emerald-400 active:scale-95 shrink-0"
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
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all bg-emerald-500 text-white shadow-xs active:scale-95 shadow-emerald-500/20 shrink-0"
                                    title={isAr ? 'محادثة واتساب' : 'WhatsApp'}
                                >
                                    <FaWhatsapp className="w-3.5 h-3.5" />
                                </a>
                            )}
                            {(config.location_url || config.map_link || config.location_link) && (
                                <a 
                                    href={config.location_url || config.map_link || config.location_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-xs border border-black/5 dark:border-white/10 text-rose-500 active:scale-95 shrink-0"
                                    title={isAr ? 'الموقع الجغرافي' : 'Location'}
                                >
                                    <MapPin className="w-3.5 h-3.5" />
                                </a>
                            )}
                            <button
                                onClick={handleShare}
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-xs border border-black/5 dark:border-white/10 active:scale-95 shrink-0"
                                title={isAr ? 'مشاركة المنيو' : 'Share'}
                            >
                                <Share2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Brand Card with Glass effect */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xl shadow-black/5 relative overflow-hidden">
                        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
                            {/* Logo */}
                            {config.logo_url ? (
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 shadow-md ring-2 ring-white/50 dark:ring-white/10">
                                    <OptimizedMenuImage 
                                        originalSrc={config.logo_url}
                                        thumbnailSrc={null}
                                        alt={config.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div 
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-md shrink-0"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {config.name.charAt(0)}
                                </div>
                            )}

                            {/* Name & Slogan */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                                        {config.name}
                                    </h1>
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
                                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>{isAr ? 'خدمة سريعة' : 'Fast Service'}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Location / Address Row (Clickable to open registered location or address in Google Maps) */}
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
                                        <Phone className="w-3 h-3 text-emerald-500" />
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

                        {/* Payment Methods Banner */}
                        <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 font-bold">
                                <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                                <span>{isAr ? 'طرق الدفع المتاحة:' : 'Accepted Payments:'}</span>
                            </div>
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-black text-amber-600 dark:text-amber-400 transition-all border border-amber-500/20 shadow-2xs active:scale-95"
                            >
                                <span>{isAr ? 'كاش / انستا باي / محافظ' : 'Cash / InstaPay / Wallets'}</span>
                                {isAr ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                        </div>

                        {/* Social Media Links */}
                        {hasSocialLinks && (
                            <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                                    {isAr ? 'صفحات التواصل:' : 'Social Pages:'}
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
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
                                            className="w-8 h-8 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black flex items-center justify-center transition-all shadow-2xs active:scale-90"
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
                                            className="w-8 h-8 rounded-xl bg-[#FFFC00]/20 hover:bg-[#FFFC00] text-amber-600 hover:text-black flex items-center justify-center transition-all shadow-2xs active:scale-90"
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

                {/* 3. STORIES & HIGHLIGHTS BAR (Instagram / TikTok Style) */}
                {showStoriesBar && (
                    <div className="px-4 py-2">
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                            {/* Story 1: All items */}
                            <button
                                onClick={() => { setActiveCategory('all'); setActiveFilter('all'); }}
                                className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                            >
                                <div 
                                    className={`w-14 h-14 rounded-full p-0.5 transition-all shadow-sm ${
                                        activeCategory === 'all' && activeFilter === 'all' 
                                            ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-zinc-950' 
                                            : 'opacity-80 group-hover:opacity-100'
                                    }`}
                                    style={{
                                        background: activeCategory === 'all' && activeFilter === 'all'
                                            ? `linear-gradient(135deg, ${primaryColor}, #10b981)`
                                            : 'rgba(150, 150, 150, 0.2)'
                                    }}
                                >
                                    <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-emerald-500">
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
                                    className={`w-14 h-14 rounded-full p-0.5 transition-all shadow-sm ${
                                        activeFilter === 'popular' 
                                            ? 'ring-2 ring-offset-2 ring-amber-500 dark:ring-offset-zinc-950' 
                                            : 'opacity-80 group-hover:opacity-100'
                                    }`}
                                    style={{
                                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)'
                                    }}
                                >
                                    <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-amber-500">
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
                                    className={`w-14 h-14 rounded-full p-0.5 transition-all shadow-sm ${
                                        activeFilter === 'offers' 
                                            ? 'ring-2 ring-offset-2 ring-rose-500 dark:ring-offset-zinc-950' 
                                            : 'opacity-80 group-hover:opacity-100'
                                    }`}
                                    style={{
                                        background: 'linear-gradient(135deg, #ec4899, #f43f5e)'
                                    }}
                                >
                                    <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-rose-500">
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
                                        key={`story-${cat.id}`}
                                        onClick={() => scrollToCategory(String(cat.id))}
                                        className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                                    >
                                        <div 
                                            className={`w-14 h-14 rounded-full p-0.5 transition-all shadow-sm ${
                                                isCatActive 
                                                    ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-zinc-950 scale-105' 
                                                    : 'opacity-85 group-hover:opacity-100'
                                            }`}
                                            style={{
                                                background: isCatActive 
                                                    ? `linear-gradient(135deg, ${primaryColor}, #3b82f6)`
                                                    : 'rgba(150, 150, 150, 0.25)'
                                            }}
                                        >
                                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
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

                {/* 4. SEARCH & VIEW MODE SWITCHER (Non-sticky, scrolls with content) */}
                <div className="relative px-4 py-2 space-y-2">
                    {/* Search Input Bar */}
                    <div className="relative flex items-center">
                        <Search className="w-4 h-4 absolute inset-y-0 my-auto text-slate-400 pointer-events-none" style={{ [isAr ? 'right' : 'left']: '14px' }} />
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isAr ? 'ابحث عن وجبة، مشروب، حلى...' : 'Search meals, drinks, dessert...'}
                            className={`w-full h-11 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-sm font-semibold border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-emerald-500/50 transition-all ${isAr ? 'pr-11 pl-10' : 'pl-11 pr-10'}`}
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
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-zinc-800 text-emerald-500 shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
                                title={isAr ? 'عرض شبكي' : 'Grid View'}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 dark:bg-zinc-800 text-emerald-500 shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
                                title={isAr ? 'قائمة تفصيلية' : 'List View'}
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-slate-100 dark:bg-zinc-800 text-emerald-500 shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
                                title={isAr ? 'عرض مكثف سريع' : 'Compact Rows'}
                            >
                                <AlignJustify className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('showcase')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'showcase' ? 'bg-slate-100 dark:bg-zinc-800 text-emerald-500 shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
                                title={isAr ? 'عرض استعراضي فاخر' : 'Showcase Mode'}
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 5. STICKY CATEGORY NAVIGATION (Only category bar sticks at top) */}
                <div className="sticky top-0 z-30 px-4 py-2.5 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-y border-black/5 dark:border-white/10 shadow-xs">
                    <div 
                        ref={categoryNavRef}
                        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
                    >
                        <button
                            id="nav-cat-all"
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
                                    key={`nav-${cat.id}`}
                                    id={`nav-cat-${cat.id}`}
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

                {/* 5. SEARCH RESULTS OR EMPTY STATE */}
                {searchQuery && (
                    <div className="px-4 pt-4">
                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                            <span>
                                {isAr ? `نتائج البحث عن "${searchQuery}"` : `Search results for "${searchQuery}"`}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px]">
                                {totalMatchingItems} {isAr ? 'صنف' : 'items'}
                            </span>
                        </div>
                    </div>
                )}

                {totalMatchingItems === 0 && (
                    <div className="px-4 py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <Search className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">
                            {isAr ? 'لم نعثر على أي أصناف مطابقة' : 'No matching items found'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {isAr ? 'جرب البحث بكلمات أخرى أو اختر قسماً مختلفاً' : 'Try searching for something else'}
                        </p>
                    </div>
                )}

                {/* 6. MAIN MENU CATEGORIES & ITEMS */}
                <main className="px-4 pt-3 pb-24 space-y-7">
                    {processedCategories.map((category) => (
                        <section 
                            key={`cat-section-${category.id}`} 
                            id={`cat-section-${category.id}`}
                            className="scroll-mt-36"
                        >
                            {/* Section Header */}
                            <div className="flex items-center justify-between mb-3 px-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                                        <span className="w-2 h-5 rounded-full" style={{ backgroundColor: primaryColor }} />
                                        {catName(category)}
                                    </h2>
                                    <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">
                                        ({category.items?.length || 0})
                                    </span>
                                </div>
                            </div>

                            {/* --- MODE 1: GRID (2 COLUMNS) --- */}
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {category.items?.map((item) => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const basePrice = item.prices?.[0] || 0;
                                        const oldPrice = item.old_prices?.[0];
                                        const hasDiscount = oldPrice && oldPrice > basePrice;

                                        return (
                                            <div 
                                                key={`grid-${item.id}`}
                                                onClick={() => handleItemClick(item, catName(category), category.id)}
                                                className="group rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-2.5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
                                            >
                                                {/* Image Container */}
                                                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 mb-2.5">
                                                    {item.image_url ? (
                                                        <OptimizedMenuImage 
                                                            originalSrc={item.image_url}
                                                            thumbnailSrc={item.thumbnail_url}
                                                            alt={itemName(item)}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                            <Utensils className="w-10 h-10" />
                                                        </div>
                                                    )}

                                                    {/* Discount Badge */}
                                                    {hasDiscount && (
                                                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-md">
                                                            %{Math.round(((oldPrice - basePrice) / oldPrice) * 100)} {isAr ? 'خصم' : 'OFF'}
                                                        </div>
                                                    )}

                                                    {/* Popular Badge */}
                                                    {item.is_popular && !hasDiscount && (
                                                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-md flex items-center gap-0.5">
                                                            <Flame className="w-3 h-3" />
                                                            {isAr ? 'مميز' : 'Hot'}
                                                        </div>
                                                    )}

                                                    {/* Favorite Heart */}
                                                    <button 
                                                        onClick={(e) => toggleFavorite(item.id, e)}
                                                        className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Heart className={`w-3.5 h-3.5 ${favorites[item.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                                                    </button>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 flex flex-col justify-between text-center pt-1">
                                                    <div>
                                                        <h3 className="font-bold text-sm leading-snug line-clamp-2 text-center">
                                                            {itemName(item)}
                                                        </h3>
                                                        {itemDesc(item) && (
                                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed text-center">
                                                                {itemDesc(item)}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Price & Add Stepper */}
                                                    <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex flex-col items-center gap-2">
                                                        {/* Centered Price */}
                                                        <div className="flex items-baseline justify-center gap-1">
                                                            <span className="font-extrabold text-base" style={{ color: primaryColor }}>
                                                                {basePrice}
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                                                                {cur}
                                                            </span>
                                                            {hasDiscount && (
                                                                <span className="text-[10px] text-slate-400 line-through mr-1">
                                                                    {oldPrice} {cur}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Stepper / Add button - Centered & Prominent */}
                                                        <div className="w-full">
                                                            {inCartQty > 0 ? (
                                                                <div 
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-full flex items-center justify-between text-white px-2 py-1.5 rounded-2xl shadow-sm text-xs font-black transition-all"
                                                                    style={{ backgroundColor: primaryColor }}
                                                                >
                                                                    <button 
                                                                        onClick={() => quickDecrementFromCart(item.id)}
                                                                        className="w-7 h-7 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition-transform"
                                                                    >
                                                                        <Minus className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <span className="text-xs font-black px-2 min-w-[20px] text-center">
                                                                        {inCartQty}
                                                                    </span>
                                                                    <button 
                                                                        onClick={() => quickAddToCart(item, catName(category), 0)}
                                                                        className="w-7 h-7 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition-transform"
                                                                    >
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleItemClick(item, catName(category), category.id);
                                                                    }}
                                                                    className="w-full py-2 px-3 rounded-2xl text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95"
                                                                    style={{ backgroundColor: primaryColor }}
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                    <span>{isAr ? 'أضف للسلة' : 'Add to Cart'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* --- MODE 2: LIST (HORIZONTAL CARD) --- */}
                            {viewMode === 'list' && (
                                <div className="space-y-3">
                                    {category.items?.map((item) => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const basePrice = item.prices?.[0] || 0;
                                        const oldPrice = item.old_prices?.[0];
                                        const hasDiscount = oldPrice && oldPrice > basePrice;

                                        return (
                                            <div 
                                                key={`list-${item.id}`}
                                                onClick={() => handleItemClick(item, catName(category), category.id)}
                                                className="group rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-3 flex gap-3.5 items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden active:scale-[0.99]"
                                            >
                                                {/* Details Left/Right */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-sm sm:text-base leading-snug line-clamp-1">
                                                            {itemName(item)}
                                                        </h3>
                                                        {item.is_popular && (
                                                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                                                🔥 {isAr ? 'مفضل' : 'Popular'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {itemDesc(item) && (
                                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                                            {itemDesc(item)}
                                                        </p>
                                                    )}

                                                    {/* Price & Action Row */}
                                                    <div className="flex items-center gap-3 mt-2.5">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="font-black text-sm sm:text-base" style={{ color: primaryColor }}>
                                                                {basePrice}
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                                                                {cur}
                                                            </span>
                                                            {hasDiscount && (
                                                                <span className="text-[11px] text-slate-400 line-through mr-1">
                                                                    {oldPrice} {cur}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {item.size_labels && item.size_labels.length > 1 && (
                                                            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                                                {item.size_labels.length} {isAr ? 'أحجام' : 'sizes'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Image and Stepper Box */}
                                                <div className="relative shrink-0 flex flex-col items-center">
                                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 relative">
                                                        {item.image_url ? (
                                                            <OptimizedMenuImage 
                                                                originalSrc={item.image_url}
                                                                thumbnailSrc={item.thumbnail_url}
                                                                alt={itemName(item)}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                                <Utensils className="w-7 h-7" />
                                                            </div>
                                                        )}

                                                        {hasDiscount && (
                                                            <div className="absolute top-1 right-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                                                                %{Math.round(((oldPrice - basePrice) / oldPrice) * 100)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Floating + / Stepper button over image bottom */}
                                                    <div className="-mt-3.5 z-10">
                                                        {inCartQty > 0 ? (
                                                            <div 
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex items-center gap-1.5 text-white px-2.5 py-1 rounded-full shadow-md text-xs font-black transition-all"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <button 
                                                                    onClick={() => quickDecrementFromCart(item.id)}
                                                                    className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center active:scale-90"
                                                                >
                                                                    <Minus className="w-2.5 h-2.5" />
                                                                </button>
                                                                <span className="min-w-[14px] text-center px-0.5">{inCartQty}</span>
                                                                <button 
                                                                    onClick={() => quickAddToCart(item, catName(category), 0)}
                                                                    className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center active:scale-90"
                                                                >
                                                                    <Plus className="w-2.5 h-2.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleItemClick(item, catName(category), category.id);
                                                                }}
                                                                className="px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1 shadow-md active:scale-90 transition-all"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                                <span>{isAr ? 'أضف' : 'Add'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* --- MODE 3: COMPACT (HIGH DENSITY ROWS) --- */}
                            {viewMode === 'compact' && (
                                <div className="divide-y divide-black/5 dark:divide-white/5 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                                    {category.items?.map((item) => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const basePrice = item.prices?.[0] || 0;
                                        const oldPrice = item.old_prices?.[0];
                                        const hasDiscount = oldPrice && oldPrice > basePrice;

                                        return (
                                            <div 
                                                key={`compact-${item.id}`}
                                                onClick={() => handleItemClick(item, catName(category), category.id)}
                                                className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                            >
                                                {/* Mini Thumbnail */}
                                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0">
                                                    {item.image_url ? (
                                                        <OptimizedMenuImage 
                                                            originalSrc={item.image_url}
                                                            thumbnailSrc={item.thumbnail_url}
                                                            alt={itemName(item)}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                            <Utensils className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Title & Desc */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-xs sm:text-sm truncate">
                                                        {itemName(item)}
                                                    </h3>
                                                    {itemDesc(item) && (
                                                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">
                                                            {itemDesc(item)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Price & Add */}
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right">
                                                        <div className="font-black text-xs sm:text-sm" style={{ color: primaryColor }}>
                                                            {basePrice} <span className="text-[10px] font-normal">{cur}</span>
                                                        </div>
                                                        {hasDiscount && (
                                                            <span className="text-[9px] text-slate-400 line-through">
                                                                {oldPrice}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {inCartQty > 0 ? (
                                                        <div 
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="flex items-center gap-1 text-white px-2 py-0.5 rounded-full text-xs font-black shadow-xs"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <button 
                                                                onClick={() => quickDecrementFromCart(item.id)}
                                                                className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center active:scale-90"
                                                            >
                                                                <Minus className="w-2.5 h-2.5" />
                                                            </button>
                                                            <span className="min-w-[12px] text-center">{inCartQty}</span>
                                                            <button 
                                                                onClick={() => quickAddToCart(item, catName(category), 0)}
                                                                className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center active:scale-90"
                                                            >
                                                                <Plus className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleItemClick(item, catName(category), category.id);
                                                            }}
                                                            className="w-7 h-7 rounded-full text-white flex items-center justify-center active:scale-90 shadow-xs"
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

                            {/* --- MODE 4: SHOWCASE (LARGE MAGAZINE CARDS) --- */}
                            {viewMode === 'showcase' && (
                                <div className="space-y-4">
                                    {category.items?.map((item) => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const basePrice = item.prices?.[0] || 0;
                                        const oldPrice = item.old_prices?.[0];
                                        const hasDiscount = oldPrice && oldPrice > basePrice;

                                        return (
                                            <div 
                                                key={`showcase-${item.id}`}
                                                onClick={() => handleItemClick(item, catName(category), category.id)}
                                                className="group rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer relative"
                                            >
                                                {/* Full width Hero Image */}
                                                <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                                                    {item.image_url ? (
                                                        <OptimizedMenuImage 
                                                            originalSrc={item.image_url}
                                                            thumbnailSrc={item.thumbnail_url}
                                                            alt={itemName(item)}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                            <Utensils className="w-12 h-12" />
                                                        </div>
                                                    )}

                                                    {/* Gradient overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                                                    {/* Overlay Badges */}
                                                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                                        {item.is_popular && (
                                                            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-black shadow-md flex items-center gap-1">
                                                                <Flame className="w-3 h-3" />
                                                                {isAr ? 'الأكثر طلباً' : 'Best Seller'}
                                                            </span>
                                                        )}
                                                        {hasDiscount && (
                                                            <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-black shadow-md">
                                                                %{Math.round(((oldPrice - basePrice) / oldPrice) * 100)} {isAr ? 'توفير' : 'OFF'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Bottom overlaid title and price */}
                                                    <div className="absolute bottom-3 inset-x-3 text-white flex items-end justify-between">
                                                        <div className="max-w-[75%]">
                                                            <h3 className="text-lg sm:text-xl font-black drop-shadow-md">
                                                                {itemName(item)}
                                                            </h3>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-lg sm:text-2xl font-black text-amber-300 drop-shadow-md">
                                                                {basePrice} {cur}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card body */}
                                                <div className="p-4 flex items-center justify-between gap-4">
                                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 line-clamp-2">
                                                        {itemDesc(item) || (isAr ? 'استمتع بطعم لا ينسى مع مكونات طازجة' : 'Enjoy fresh and delicious ingredients')}
                                                    </p>

                                                    {inCartQty > 0 ? (
                                                        <div 
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="flex items-center gap-2 text-white px-3 py-1.5 rounded-full text-xs font-black shrink-0 shadow-md"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <button 
                                                                onClick={() => quickDecrementFromCart(item.id)}
                                                                className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="px-1">{inCartQty}</span>
                                                            <button 
                                                                onClick={() => quickAddToCart(item, catName(category), 0)}
                                                                className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleItemClick(item, catName(category), category.id);
                                                            }}
                                                            className="px-4 py-2 rounded-2xl text-white text-xs font-black flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 transition-all"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            <span>{isAr ? 'طلب الآن' : 'Order Now'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    ))}
                </main>

                {/* 7. FLOATING ACTION DOCK / BOTTOM BAR (Ultra-compact & sleek) */}
                {cartCount > 0 && (
                    <div className="fixed bottom-3 inset-x-3 sm:inset-x-4 max-w-xs sm:max-w-sm mx-auto z-40 pointer-events-none">
                        <motion.div 
                            initial={{ y: 30, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            className="py-1.5 px-3 rounded-full bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-950 backdrop-blur-xl shadow-xl flex items-center justify-between gap-2.5 border border-white/10 dark:border-black/10 pointer-events-auto"
                        >
                            {/* Left: Cart badge & total */}
                            <div 
                                onClick={() => setIsCartOpen(true)}
                                className="flex items-center gap-2 cursor-pointer pl-1"
                            >
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center relative text-white shrink-0 shadow-sm"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-slate-900 dark:border-white">
                                        {cartCount}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold leading-none">
                                        {cartCount} {isAr ? 'أصناف' : 'items'}
                                    </span>
                                    <span className="text-xs font-black leading-tight text-white dark:text-slate-950 mt-0.5">
                                        {cartTotal} <span className="text-[10px] font-bold opacity-80">{cur}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Right: View Cart Button */}
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="px-3.5 py-1.5 rounded-full text-white text-[11px] font-black flex items-center gap-1 transition-all shadow-sm active:scale-95 shrink-0"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <span>{isAr ? 'عرض السلة' : 'View Cart'}</span>
                                {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                        </motion.div>
                    </div>
                )}

                {/* 8. RICH ITEM DETAIL MODAL */}
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
                                className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl max-h-[90vh] overflow-y-auto z-10 shadow-2xl no-scrollbar border border-black/5 dark:border-white/10 my-auto"
                            >
                                {/* Modal Image Header */}
                                <div className="relative w-full aspect-[16/10] bg-slate-100 dark:bg-zinc-800">
                                    {selectedItem.item.image_url ? (
                                        <OptimizedMenuImage 
                                            originalSrc={selectedItem.item.image_url}
                                            thumbnailSrc={selectedItem.item.thumbnail_url}
                                            alt={itemName(selectedItem.item)}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                            <Utensils className="w-14 h-14" />
                                        </div>
                                    )}

                                    {/* Close Button */}
                                    <button 
                                        onClick={() => setSelectedItem(null)}
                                        className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>

                                    {/* Category badge */}
                                    <div className="absolute bottom-3 right-4 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-bold">
                                        {selectedItem.catName}
                                    </div>
                                </div>

                                {/* Modal Content Body */}
                                <div className="p-5 space-y-5">
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <h2 className="text-xl font-black">
                                                {itemName(selectedItem.item)}
                                            </h2>
                                            <div className="text-lg font-black shrink-0" style={{ color: primaryColor }}>
                                                {modalBasePrice} {cur}
                                            </div>
                                        </div>

                                        {itemDesc(selectedItem.item) && (
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                                                {itemDesc(selectedItem.item)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Size Options (if multi-size) */}
                                    {selectedItem.item.prices && selectedItem.item.prices.length > 1 && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-700 dark:text-zinc-300">
                                                {isAr ? 'اختر الحجم' : 'Select Size'}
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {selectedItem.item.prices.map((p, idx) => {
                                                    const isSelected = modalSizeIdx === idx;
                                                    const lbl = selectedItem.item.size_labels?.[idx] || (
                                                        idx === 0 ? (isAr ? 'صغير' : 'Small') :
                                                        idx === 1 ? (isAr ? 'وسط' : 'Medium') : (isAr ? 'كبير' : 'Large')
                                                    );

                                                    return (
                                                        <button
                                                            key={`size-${idx}`}
                                                            onClick={() => setModalSizeIdx(idx)}
                                                            className={`p-2.5 rounded-2xl border text-center transition-all ${
                                                                isSelected 
                                                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black shadow-sm ring-1 ring-emerald-500'
                                                                    : 'border-black/5 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold'
                                                            }`}
                                                        >
                                                            <div className="text-xs">{lbl}</div>
                                                            <div className="text-xs font-black mt-0.5">{p} {cur}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Extras & Add-ons (if available) */}
                                    {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-700 dark:text-zinc-300">
                                                {isAr ? 'إضافات مقترحة' : 'Optional Extras'}
                                            </label>
                                            <div className="space-y-1.5">
                                                {selectedItem.item.extras.map((extra, idx) => {
                                                    const exName = isAr ? extra.name_ar : (extra.name_en || extra.name_ar);
                                                    const isChecked = modalExtras.some(e => e.name === exName);

                                                    return (
                                                        <div 
                                                            key={`extra-${idx}`}
                                                            onClick={() => toggleModalExtra(exName, extra.price)}
                                                            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                                                                isChecked
                                                                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                                                                    : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs transition-colors ${isChecked ? 'bg-emerald-500 text-white' : 'border border-slate-300 dark:border-zinc-700'}`}>
                                                                    {isChecked && <Check className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <span className="text-xs font-bold">{exName}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                                +{extra.price} {cur}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Special Notes Input */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-700 dark:text-zinc-300">
                                            {isAr ? 'ملاحظات خاصة على الطلب' : 'Special Instructions'}
                                        </label>
                                        <input 
                                            type="text"
                                            value={modalNotes}
                                            onChange={(e) => setModalNotes(e.target.value)}
                                            placeholder={isAr ? 'مثال: بدون بصل، سكر زيادة، صوص جانبي...' : 'e.g. No onions, extra sugar...'}
                                            className="w-full h-11 px-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-xs font-medium border-none focus:ring-2 focus:ring-emerald-500/50"
                                        />
                                    </div>

                                    {/* Quantity Stepper & Add Button */}
                                    <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-2.5">
                                        {/* Stepper row */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-700 dark:text-zinc-300">
                                                {isAr ? 'الكمية المطلوبة:' : 'Quantity:'}
                                            </span>
                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-black/5 dark:border-white/5">
                                                <button 
                                                    onClick={() => setModalQty(q => Math.max(1, q - 1))}
                                                    className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 active:scale-90 shadow-2xs transition-transform"
                                                    title={isAr ? 'تقليل الكمية' : 'Decrease'}
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="font-black text-sm w-7 text-center select-none">
                                                    {modalQty}
                                                </span>
                                                <button 
                                                    onClick={() => setModalQty(q => q + 1)}
                                                    className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 active:scale-90 shadow-2xs transition-transform"
                                                    title={isAr ? 'زيادة الكمية' : 'Increase'}
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Full-width Add to Cart Button */}
                                        <button 
                                            onClick={addModalToCart}
                                            className="w-full h-12 rounded-2xl text-white font-black text-sm flex items-center justify-between px-4 sm:px-5 shadow-lg active:scale-98 transition-all"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <span className="flex items-center gap-2">
                                                <ShoppingCart className="w-4 h-4 shrink-0" />
                                                <span className="whitespace-nowrap">{isAr ? 'إضافة للسلة' : 'Add to Cart'}</span>
                                            </span>
                                            <span className="font-extrabold text-sm px-3 py-1 rounded-xl bg-black/15 dark:bg-white/15 whitespace-nowrap">
                                                {modalCalculatedTotal} {cur}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 9. CART MODAL (Centered in Screen) */}
                <AnimatePresence>
                    {isCartOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsCartOpen(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />

                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-5 max-h-[85vh] flex flex-col z-10 shadow-2xl border border-black/5 dark:border-white/10"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                                    <div className="flex items-center gap-2.5">
                                        <div 
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-xs"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-black text-base">
                                            {isAr ? 'سلة الطلبات' : 'Your Order'}
                                        </h3>
                                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                                            {cartCount} {isAr ? 'صنف' : 'items'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setIsCartOpen(false)}
                                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Items List */}
                                <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar">
                                    {cart.map((cartItem) => {
                                        const extrasSum = (cartItem.extras || []).reduce((s, e) => s + e.price * (e.qty || 1), 0);
                                        const itemTotal = (cartItem.price + extrasSum) * cartItem.quantity;

                                        return (
                                            <div 
                                                key={cartItem.cKey}
                                                className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center justify-between gap-3"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-xs sm:text-sm truncate">
                                                        {itemName(cartItem.item)}
                                                    </h4>
                                                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                                        {cartItem.sizeLabel !== (isAr ? 'عادي' : 'Regular') && (
                                                            <span className="ml-1 font-semibold">{cartItem.sizeLabel} • </span>
                                                        )}
                                                        <span>{cartItem.price} {cur}</span>
                                                    </div>

                                                    {/* Extras in cart */}
                                                    {cartItem.extras && cartItem.extras.length > 0 && (
                                                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                                                            {cartItem.extras.map(e => e.name).join(', ')}
                                                        </div>
                                                    )}

                                                    {cartItem.notes && (
                                                        <div className="text-[10px] text-slate-400 italic mt-0.5">
                                                            &quot;{cartItem.notes}&quot;
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Stepper & Total */}
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-700 px-2 py-1 rounded-xl shadow-xs">
                                                        <button 
                                                            onClick={() => quickDecrementFromCart(cartItem.id)}
                                                            className="w-5 h-5 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-500"
                                                        >
                                                            {cartItem.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <span className="text-xs font-black min-w-[14px] text-center">
                                                            {cartItem.quantity}
                                                        </span>
                                                        <button 
                                                            onClick={() => quickAddToCart(cartItem.item, cartItem.catName, cartItem.sizeIdx)}
                                                            className="w-5 h-5 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-500"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <div className="text-right min-w-[50px]">
                                                        <span className="font-black text-xs sm:text-sm">
                                                            {itemTotal} {cur}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Cart Footer */}
                                <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-slate-500 dark:text-zinc-400">
                                            {isAr ? 'الإجمالي' : 'Subtotal'}
                                        </span>
                                        <span className="font-black text-lg" style={{ color: primaryColor }}>
                                            {cartTotal} {cur}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            setShowCheckout(true);
                                        }}
                                        className="w-full h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <span>{isAr ? 'متابعة إتمام الطلب' : 'Proceed to Checkout'}</span>
                                        {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 10. PROMOTIONAL POPUP */}
                <AnimatePresence>
                    {!suppressInternalPopup && showPromoPopup && popupConfig && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowPromoPopup(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden shadow-2xl z-10 border border-black/5 dark:border-white/10"
                            >
                                {/* Close / Exit Button */}
                                <button
                                    onClick={() => setShowPromoPopup(false)}
                                    className="absolute top-3 left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
                                    title={isAr ? 'إغلاق' : 'Close'}
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {popupConfig.image_url && (
                                    <div className="relative w-full aspect-video">
                                        <img 
                                            src={getProxiedImageUrl(popupConfig.image_url)} 
                                            alt={popupConfig.title || 'Special Offer'}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="p-5 text-center space-y-3">
                                    <h3 className="text-lg font-black">
                                        {popupConfig.title || (isAr ? 'عرض خاص لفترة محدودة!' : 'Special Offer!')}
                                    </h3>
                                    {popupConfig.description && (
                                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                                            {popupConfig.description}
                                        </p>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowPromoPopup(false);
                                            if (popupConfig.target_category_id) {
                                                scrollToCategory(String(popupConfig.target_category_id));
                                            }
                                        }}
                                        className="w-full h-11 rounded-2xl text-white text-xs font-black shadow-md active:scale-95 transition-all"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {popupConfig.button_text || (isAr ? 'تصفح العرض الآن' : 'View Offer')}
                                    </button>
                                    
                                    {/* Secondary Dismiss Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPromoPopup(false)}
                                        className="w-full py-1 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                                    >
                                        {isAr ? 'إغلاق ومتابعة التصفح' : 'Close and continue browsing'}
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
