'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Plus, Minus, Trash2, X, Search, Share2, 
    Sparkles, Flame, Clock, MapPin, Phone, 
    Sun, Moon, Globe, ChevronRight, ChevronLeft, Check,
    LayoutGrid, LayoutList, AlignJustify, Maximize2, Tag,
    Utensils, Coffee, Bell, Heart, Info, ArrowUpRight, CreditCard,
    Copy, ExternalLink, ArrowUpDown, Eye, Play, Star, AlertCircle
} from 'lucide-react';
import { FaWhatsapp, FaFacebookF, FaInstagram, FaTiktok, FaSnapchatGhost, FaYoutube } from 'react-icons/fa';
import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { getProxiedImageUrl } from '@/lib/imageProxy';
import { parseCurrency } from '@/lib/currency';
import ASNFooter from '@/components/menu/ASNFooter';
import CheckoutModal from '@/components/menu/CheckoutModal';
import SharedMarquee from '@/components/menu/SharedMarquee';
import { useStoreHours } from '@/lib/helpers/storeHours';
import { itemMatchesSmartSearch } from '@/lib/helpers/smartMenuSearch';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

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
    is_popular?: boolean;
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

interface Theme31MenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
    suppressInternalPopup?: boolean;
}

type ViewMode = 'grid' | 'list' | 'compact' | 'showcase';
type FilterTag = 'all' | 'popular' | 'new' | 'offers' | 'favorites';
type SortOrder = 'default' | 'price-asc' | 'price-desc';

export default function Theme31Menu({ config, categories, restaurantId, suppressInternalPopup }: Theme31MenuProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Default theme mode
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
    const storeStatus = useStoreHours(config);

    // Color resolution for Theme 31 (Default: Aura Cyber Indigo #6366f1)
    const getPrimaryColor = (themeName?: string, customPrimary?: string) => {
        if (customPrimary) return customPrimary;
        if (!themeName) return '#6366f1';
        const t = themeName.toLowerCase();
        if (t.includes('emerald') || t.includes('green')) return '#10b981';
        if (t.includes('amber') || t.includes('gold')) return '#f59e0b';
        if (t.includes('rose') || t.includes('red')) return '#f43f5e';
        if (t.includes('cyan') || t.includes('sky')) return '#06b6d4';
        if (t.includes('sunset') || t.includes('orange')) return '#f97316';
        if (t.includes('dark')) return '#0f172a';
        return '#6366f1';
    };

    const getSecondaryGlow = (themeName?: string, customSecondary?: string, resolvedPrimary?: string) => {
        if (customSecondary) return customSecondary;
        if (resolvedPrimary) {
            if (resolvedPrimary === '#10b981') return '#06b6d4';
            if (resolvedPrimary === '#f59e0b') return '#ef4444';
            if (resolvedPrimary === '#f43f5e') return '#ec4899';
            if (resolvedPrimary === '#06b6d4') return '#3b82f6';
            if (resolvedPrimary === '#f97316') return '#fbbf24';
            if (resolvedPrimary === '#0f172a' || resolvedPrimary === '#1e1b4b') return '#6366f1';
        }
        if (!themeName) return '#a855f7';
        const t = themeName.toLowerCase();
        if (t.includes('emerald') || t.includes('green')) return '#06b6d4';
        if (t.includes('amber') || t.includes('gold')) return '#ef4444';
        if (t.includes('rose') || t.includes('red')) return '#ec4899';
        if (t.includes('cyan') || t.includes('sky')) return '#3b82f6';
        if (t.includes('sunset') || t.includes('orange')) return '#fbbf24';
        if (t.includes('dark')) return '#6366f1';
        return '#a855f7';
    };

    let tc = config?.theme_colors || {};
    if (typeof tc === 'string') {
        try {
            tc = JSON.parse(tc);
        } catch (_e) {
            tc = {};
        }
    }

    const primaryColor = getPrimaryColor(config?.theme, tc.primary || config?.theme_colors?.primary || config?.primary_color);
    const secondaryGlow = getSecondaryGlow(config?.theme, tc.secondary || config?.theme_colors?.secondary || config?.secondary_color, primaryColor);

    // Custom background images
    const bgImageLight = tc.theme31_bg_light || tc.theme30_bg_light || tc.theme28_bg_light || tc.bg_image_light || tc.bg_light || '';
    const bgImageDark = tc.theme31_bg_dark || tc.theme30_bg_dark || tc.theme28_bg_dark || tc.bg_image_dark || tc.bg_dark || '';
    const activeBgImage = (isDark ? (bgImageDark || bgImageLight) : (bgImageLight || bgImageDark))?.trim() || '';
    const hasBgImage = Boolean(activeBgImage.length > 0);

    // View mode config
    const defaultView = (tc.theme31_default_view_mode || tc.theme30_default_view_mode || tc.theme28_default_view_mode || 'grid') as ViewMode;
    const [viewMode, setViewMode] = useState<ViewMode>(['grid', 'list', 'compact', 'showcase'].includes(defaultView) ? defaultView : 'grid');
    const showStoriesBar = tc.theme31_show_stories !== false && tc.theme30_show_stories !== false && config?.theme31_show_stories !== false;

    // View state
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterTag>('all');
    const [sortOrder, setSortOrder] = useState<SortOrder>('default');
    const [favorites, setFavorites] = useState<Record<string, boolean>>({});
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Load favorites from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`asn_favs_${restaurantId || config.id || 'default'}`);
            if (saved) {
                setFavorites(JSON.parse(saved));
            }
        } catch (_e) {
            // ignore
        }
    }, [restaurantId, config.id]);

    const toggleFavorite = (itemId: string | number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setFavorites(prev => {
            const next = { ...prev, [String(itemId)]: !prev[String(itemId)] };
            try {
                localStorage.setItem(`asn_favs_${restaurantId || config.id || 'default'}`, JSON.stringify(next));
            } catch (_err) {
                // ignore
            }
            return next;
        });
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    // Cover images extracted from settings
    const coverImagesList = useMemo(() => {
        const list: string[] = [];
        if (Array.isArray(config.cover_images)) {
            config.cover_images.forEach(img => {
                if (typeof img === 'string' && img.trim()) {
                    list.push(img.trim());
                }
            });
        }
        if (list.length === 0 && config.cover_url && typeof config.cover_url === 'string' && config.cover_url.trim()) {
            list.push(config.cover_url.trim());
        }
        return list;
    }, [config.cover_images, config.cover_url]);

    // Modals
    const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; catName: string; categoryId: string | number } | null>(null);
    const [modalSizeIdx, setModalSizeIdx] = useState<number>(0);
    const [modalQty, setModalQty] = useState<number>(1);
    const [modalNotes, setModalNotes] = useState<string>('');
    const [modalExtras, setModalExtras] = useState<{ name: string; price: number; qty?: number }[]>([]);
    
    // VIP Story Reel Modal
    const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null);
    const [storyProgress, setStoryProgress] = useState(0);

    // Cart & Checkout
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showPromoPopup, setShowPromoPopup] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isWaiterCallOpen, setIsWaiterCallOpen] = useState(false);
    const [waiterTableNum, setWaiterTableNum] = useState('');
    const [waiterCallType, setWaiterCallType] = useState<string>('waiter');
    const [waiterCallSent, setWaiterCallSent] = useState(false);
    const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
    const [showHoursModal, setShowHoursModal] = useState(false);

    // Direct card quick size index tracker
    const [cardSelectedSizes, setCardSelectedSizes] = useState<Record<string, number>>({});

    // Promo Popup Config
    const popupConfig: { enabled: boolean; title?: string; description?: string; image_url?: string; button_text?: string; target_category_id?: string } | null = 
        tc.theme31_popup || tc.theme30_popup || tc.theme28_popup || tc.theme27_popup || null;

    useEffect(() => {
        if (!suppressInternalPopup && popupConfig?.enabled) {
            const popupKey = `theme31_popup_${restaurantId || config?.id || 'dismissed'}`;
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
            const scrollPos = window.scrollY + 100;

            if (window.scrollY < 240) {
                if (activeCategory !== 'all') setActiveCategory('all');
                return;
            }

            for (let i = categories.length - 1; i >= 0; i--) {
                const el = document.getElementById(`cat-section-t31-${categories[i].id}`);
                if (el && el.offsetTop <= scrollPos) {
                    const catId = String(categories[i].id);
                    if (activeCategory !== catId) {
                        setActiveCategory(catId);
                        const navBtn = document.getElementById(`nav-cat-t31-${catId}`);
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
        const el = document.getElementById(`cat-section-t31-${catId}`);
        if (el) {
            const offset = 70;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    // Filter items based on active tags & smart search & sort
    const processedCategories = useMemo(() => {
        return categories.map(cat => {
            const isCatFeatured = Boolean(cat.is_popular || (cat.items && cat.items.length > 0 && cat.items.every(it => it.is_popular)));
            const filteredItems = (cat.items || []).filter(item => {
                if (item.is_available === false) return false;

                // Smart Cross-Entity Search query match
                if (searchQuery.trim()) {
                    if (!itemMatchesSmartSearch(item, catName(cat), searchQuery, isAr)) {
                        return false;
                    }
                }

                // Filter tags: if the section is marked featured, include all its items under 'popular'
                if (activeFilter === 'popular' && !item.is_popular && !isCatFeatured) return false;
                if (activeFilter === 'new' && !item.is_new) return false;
                if (activeFilter === 'offers') {
                    const hasDiscount = item.old_prices && item.old_prices.some((op, idx) => op > (item.prices?.[idx] || 0));
                    if (!hasDiscount) return false;
                }
                if (activeFilter === 'favorites' && !favorites[String(item.id)]) return false;

                return true;
            });

            // Sorting
            let sorted = [...filteredItems];
            if (sortOrder === 'price-asc') {
                sorted.sort((a, b) => (a.prices?.[0] || 0) - (b.prices?.[0] || 0));
            } else if (sortOrder === 'price-desc') {
                sorted.sort((a, b) => (b.prices?.[0] || 0) - (a.prices?.[0] || 0));
            }

            return {
                ...cat,
                is_popular: isCatFeatured,
                items: sorted
            };
        }).filter(cat => cat.items.length > 0);
    }, [categories, searchQuery, activeFilter, sortOrder, favorites, isAr]);

    // All matching items count
    const totalMatchingItems = useMemo(() => {
        return processedCategories.reduce((acc, cat) => acc + (cat.items?.length || 0), 0);
    }, [processedCategories]);

    // VIP Stories Highlights list: categories with featured dishes
    const storyHighlights = useMemo(() => {
        const stories: { id: string | number; title: string; image: string; item?: MenuItem; catId: string | number; isFeatured?: boolean }[] = [];
        categories.forEach(cat => {
            const isFeatured = Boolean(cat.is_popular || (cat.items && cat.items.length > 0 && cat.items.every(it => it.is_popular)));
            const popularItem = (cat.items || []).find(it => it.is_popular && (it.image_url || it.image));
            const firstItemWithImg = (cat.items || []).find(it => it.image_url || it.image);
            const targetItem = popularItem || firstItemWithImg;
            const img = targetItem?.image_url || targetItem?.image || cat.image_url || cat.image;
            if (img) {
                stories.push({
                    id: cat.id,
                    title: catName(cat),
                    image: img,
                    item: targetItem,
                    catId: cat.id,
                    isFeatured
                });
            }
        });
        stories.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        return stories.slice(0, 10);
    }, [categories, isAr]);

    // Story Reel Timer
    useEffect(() => {
        if (activeStoryIdx === null) {
            setStoryProgress(0);
            return;
        }

        const interval = 50; // update every 50ms
        const totalDuration = 5000;
        const step = (interval / totalDuration) * 100;

        const timer = setInterval(() => {
            setStoryProgress(prev => {
                if (prev >= 100) {
                    if (activeStoryIdx < storyHighlights.length - 1) {
                        setActiveStoryIdx(activeStoryIdx + 1);
                        return 0;
                    } else {
                        setActiveStoryIdx(null);
                        return 0;
                    }
                }
                return prev + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [activeStoryIdx, storyHighlights.length]);

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

    // Quick direct add from card
    const quickAddToCart = (item: MenuItem, catNameStr: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const sizeIndex = cardSelectedSizes[String(item.id)] ?? 0;
        const p = item.prices?.[sizeIndex] || item.prices?.[0] || 0;
        const lbl = item.size_labels?.[sizeIndex] || (isAr ? 'عادي' : 'Regular');
        const uniqueKey = `${item.id}_${sizeIndex}_none_`;

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
        showToast(isAr ? `تمت إضافة "${itemName(item)}" إلى السلة` : `Added "${itemName(item)}" to cart`);
    };

    // Quick direct decrement from card
    const quickDecrementFromCart = (itemId: string | number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
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

        showToast(isAr ? `تمت إضافة "${itemName(item)}" بنجاح` : `Added "${itemName(item)}" successfully`);
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

    // Update Modal Extra Quantity
    const updateModalExtraQty = (extraName: string, delta: number) => {
        setModalExtras(prev => {
            return prev.map(e => {
                if (e.name === extraName) {
                    const newQty = (e.qty || 1) + delta;
                    return newQty > 0 ? { ...e, qty: newQty } : e;
                }
                return e;
            });
        });
    };

    // Open detail modal
    const openItemDetails = (item: MenuItem, catNameStr: string, catId: string | number) => {
        const defaultSize = cardSelectedSizes[String(item.id)] ?? 0;
        setSelectedItem({ item, catName: catNameStr, categoryId: catId });
        setModalSizeIdx(defaultSize);
        setModalQty(1);
        setModalNotes('');
        setModalExtras([]);
    };

    // Native Share or Clipboard
    const handleShare = async () => {
        const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
        const shareData = {
            title: config.name,
            text: isAr ? `تصفح منيو ${config.name} الفاخر عبر الإنترنت:` : `Explore ${config.name} luxury menu online:`,
            url: shareUrl
        };

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (_err) {
                // fallback to copy
            }
        }
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl);
            showToast(isAr ? 'تم نسخ رابط المنيو إلى الحافظة! ✨' : 'Menu link copied to clipboard! ✨');
        }
    };

    // Waiter Call Submit
    const handleWaiterCall = () => {
        if (!waiterTableNum.trim()) return;
        setWaiterCallSent(true);
        setTimeout(() => {
            setWaiterCallSent(false);
            setIsWaiterCallOpen(false);
            setWaiterTableNum('');
            showToast(isAr ? 'تم إرسال نداء الويتر بنجاح! 🛎️' : 'Waiter call sent successfully! 🛎️');
        }, 1200);
    };

    // Calculate item modal dynamic total
    const modalTotal = useMemo(() => {
        if (!selectedItem) return 0;
        const base = selectedItem.item.prices?.[modalSizeIdx] || 0;
        const extras = modalExtras.reduce((sum, e) => sum + e.price * (e.qty || 1), 0);
        return (base + extras) * modalQty;
    }, [selectedItem, modalSizeIdx, modalExtras, modalQty]);

    // Social Links
    const socialLinks = config.social_links || {};
    const facebookUrl = config.facebook_url || socialLinks.facebook;
    const instagramUrl = config.instagram_url || socialLinks.instagram;
    const tiktokUrl = config.tiktok_url || socialLinks.tiktok;
    const snapchatUrl = config.snapchat_url || socialLinks.snapchat;
    const youtubeUrl = config.youtube_url || socialLinks.youtube;
    const whatsappNum = config.whatsapp_number;
    const whatsappClean = whatsappNum ? whatsappNum.replace(/[^0-9]/g, '') : null;
    const locationUrl = config.location_url || config.location_link || config.map_link;
    const phoneNum = config.phone || (config.phone_numbers && config.phone_numbers[0]);

    return (
        <div 
            className="theme31-root min-h-screen relative font-sans transition-colors duration-300"
            style={{ 
                backgroundColor: hasBgImage ? 'transparent' : (isDark ? '#05070e' : '#f8fafc'),
                color: isDark ? '#f8fafc' : '#0f172a'
            }}
            dir={isAr ? 'rtl' : 'ltr'}
        >
            {/* Custom CSS overrides */}
            <style dangerouslySetInnerHTML={{ __html: `
                :root {
                    --theme-primary: ${primaryColor};
                    --theme-glow: ${secondaryGlow};
                }
                ::selection {
                    background-color: ${primaryColor} !important;
                    color: #ffffff !important;
                }
                .theme31-glow-border {
                    box-shadow: 0 0 25px -5px ${primaryColor}40;
                }
                .theme31-glass {
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                }
                .theme31-active-pill {
                    background: linear-gradient(135deg, ${primaryColor}, ${secondaryGlow}) !important;
                    box-shadow: 0 4px 20px -2px ${primaryColor}66 !important;
                }
                .theme31-card-hover:hover {
                    border-color: ${primaryColor}66 !important;
                    box-shadow: 0 10px 30px -10px ${primaryColor}33 !important;
                    transform: translateY(-2px);
                }
                .theme31-card-hover:hover .theme31-title-hover,
                .group:hover .theme31-title-hover {
                    color: ${primaryColor} !important;
                }
                .theme31-search-input:focus {
                    border-color: ${primaryColor} !important;
                    box-shadow: 0 0 0 2px ${primaryColor}26 !important;
                }
                .theme31-accent-text {
                    color: ${primaryColor} !important;
                }
            `}} />

            {/* Ambient Aurora Glow Backdrop Layer */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div 
                    className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[500px] rounded-full blur-[140px] opacity-35 dark:opacity-25 transition-all duration-1000"
                    style={{ background: `radial-gradient(circle, ${primaryColor} 0%, ${secondaryGlow} 50%, transparent 80%)` }}
                />
                <div 
                    className="absolute top-[40%] -right-[10%] w-[400px] h-[400px] rounded-full blur-[160px] opacity-20 dark:opacity-15 transition-all duration-1000"
                    style={{ background: secondaryGlow }}
                />
            </div>

            {/* Custom Background Image Layer */}
            {hasBgImage && (
                <>
                    <div 
                        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
                        style={{ backgroundImage: `url("${getProxiedImageUrl(activeBgImage)}")` }}
                    />
                    <div 
                        className="fixed inset-0 pointer-events-none z-0 backdrop-blur-[3px]"
                        style={{ 
                            backgroundColor: isDark ? 'rgba(5, 7, 14, 0.85)' : 'rgba(248, 250, 252, 0.88)' 
                        }}
                    />
                </>
            )}

            {/* Toast Notification Capsule */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-slate-950/90 text-white text-xs font-bold shadow-2xl border border-white/20 backdrop-blur-md flex items-center gap-2"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 w-full max-w-4xl mx-auto min-w-0 px-3 sm:px-6 pt-3 pb-28">

                {/* 1. TOP MARQUEE (If enabled) */}
                {config.marquee_enabled && (
                    <div className="w-full mb-3 rounded-2xl overflow-hidden shadow-md" style={{ backgroundColor: primaryColor }}>
                        <SharedMarquee 
                            text={isAr ? (config.marquee_text_ar || '') : (config.marquee_text_en || config.marquee_text_ar || '')} 
                            bgColor={primaryColor}
                        />
                    </div>
                )}

                {/* 2. ULTRA-LUXE GLASS HERO CAPSULE */}
                <div className="relative rounded-[2.5rem] p-4 sm:p-7 bg-white/70 dark:bg-zinc-900/60 border border-white/40 dark:border-white/10 theme31-glass shadow-2xl overflow-hidden mb-6 transition-all">
                    {/* Top Action Controls Bar */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                        {/* Store Open/Closed Live Status Badge */}
                        <button
                            type="button"
                            onClick={() => setShowHoursModal(true)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide flex items-center gap-1.5 border shadow-xs transition-all active:scale-95 ${
                                storeStatus.isOpen
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${storeStatus.isOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                            <span>{storeStatus.isOpen ? (isAr ? 'مفتوح الآن' : 'Open Now') : (isAr ? 'مغلق حالياً' : 'Closed')}</span>
                            <Clock className="w-3 h-3 opacity-60" />
                        </button>

                        {/* Top Utility Icons (Theme, Lang, Share) */}
                        <div className="flex items-center gap-1.5">
                            {/* Waiter Call Button (If enabled) */}
                            {config.waiter_call_enabled && (
                                <button
                                    type="button"
                                    onClick={() => setIsWaiterCallOpen(true)}
                                    className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                                    title={isAr ? "نداء الويتر" : "Call Waiter"}
                                >
                                    <Bell className="w-3.5 h-3.5 animate-bounce" />
                                    <span className="hidden sm:inline">{isAr ? "نداء الويتر" : "Call Waiter"}</span>
                                </button>
                            )}

                            {/* Share Menu */}
                            <button
                                type="button"
                                onClick={handleShare}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 flex items-center justify-center transition-all border border-black/5 dark:border-white/5 active:scale-95"
                                title={isAr ? "مشاركة المنيو" : "Share Menu"}
                            >
                                <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Dark/Light Switcher */}
                            {mounted && (
                                <button
                                    type="button"
                                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 flex items-center justify-center transition-all border border-black/5 dark:border-white/5 active:scale-95"
                                    title={isAr ? "تبديل الوضع" : "Toggle Theme"}
                                >
                                    {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
                                </button>
                            )}

                            {/* Language Switcher */}
                            <button
                                type="button"
                                onClick={() => setCurrentLang(isAr ? 'en' : 'ar')}
                                className="px-2.5 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 text-xs font-black flex items-center gap-1 transition-all border border-black/5 dark:border-white/5 active:scale-95"
                                title={isAr ? "Switch to English" : "التبديل إلى العربية"}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                <span>{isAr ? 'EN' : 'عربي'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Cover Showcase Carousel (If covers exist) */}
                    {coverImagesList.length > 0 && (
                        <div className="relative w-full h-44 sm:h-64 rounded-3xl overflow-hidden mb-6 shadow-inner border border-black/5 dark:border-white/10">
                            <Swiper
                                modules={[Autoplay, EffectFade]}
                                effect="fade"
                                autoplay={{ delay: 3500, disableOnInteraction: false }}
                                loop={coverImagesList.length > 1}
                                className="w-full h-full"
                            >
                                {coverImagesList.map((img, idx) => (
                                    <SwiperSlide key={idx} className="w-full h-full relative">
                                        <OptimizedMenuImage
                                            src={img}
                                            alt={`${config.name} Cover`}
                                            className="w-full h-full object-cover"
                                            sizes="(max-width: 768px) 100vw, 800px"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                            {/* Floating Badge on Cover */}
                            <div className="absolute bottom-3 start-3 z-10 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>{isAr ? "مرحباً بكم في قائمتنا الرقمية" : "Welcome to our digital menu"}</span>
                            </div>
                        </div>
                    )}

                    {/* Brand Identity: Logo + Name + Slogan */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-start">
                        {/* Logo with Dynamic Aura Ring */}
                        {config.logo_url && (
                            <div 
                                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-1 bg-white dark:bg-zinc-800 shadow-xl border-2 shrink-0 transition-transform hover:scale-105"
                                style={{ borderColor: `${primaryColor}88` }}
                            >
                                <div className="w-full h-full rounded-2xl overflow-hidden relative">
                                    <OptimizedMenuImage
                                        src={config.logo_url}
                                        alt={config.name}
                                        className="w-full h-full object-cover"
                                        sizes="100px"
                                    />
                                </div>
                                <div 
                                    className="absolute -inset-1 rounded-3xl blur-md opacity-40 -z-10"
                                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryGlow})` }}
                                />
                            </div>
                        )}

                        {/* Title & Slogan */}
                        <div className="flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {config.name}
                                </h1>
                                <span 
                                    className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs"
                                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryGlow})` }}
                                >
                                    VIP Menu
                                </span>
                            </div>

                            {(config.slogan_ar || config.slogan_en) && (
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-medium max-w-xl leading-relaxed">
                                    {isAr ? (config.slogan_ar || config.slogan_en) : (config.slogan_en || config.slogan_ar)}
                                </p>
                            )}

                            {/* Address indicator if present */}
                            {config.address && (
                                <p className="text-[11px] text-slate-500 dark:text-zinc-500 flex items-center justify-center sm:justify-start gap-1 font-medium pt-0.5">
                                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                    <span>{config.address}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quick Interactive Contact & Social Media Strip */}
                    <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        {/* WhatsApp Contact */}
                        {whatsappClean && (
                            <a
                                href={`https://wa.me/${whatsappClean}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                            >
                                <FaWhatsapp className="w-3.5 h-3.5 text-[#25D366]" />
                                <span>{isAr ? "واتساب" : "WhatsApp"}</span>
                            </a>
                        )}

                        {/* Direct Call */}
                        {phoneNum && (
                            <a
                                href={`tel:${phoneNum}`}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                            >
                                <Phone className="w-3.5 h-3.5 text-blue-500" />
                                <span>{isAr ? "اتصال" : "Call"}</span>
                            </a>
                        )}

                        {/* Location Map */}
                        {locationUrl && (
                            <a
                                href={locationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                            >
                                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                <span>{isAr ? "الموقع" : "Location"}</span>
                            </a>
                        )}

                        {/* Payment Info Button */}
                        <button
                            type="button"
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                            style={{
                                backgroundColor: `${primaryColor}15`,
                                color: primaryColor,
                                borderColor: `${primaryColor}40`
                            }}
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{isAr ? "طرق الدفع" : "Payments"}</span>
                        </button>

                        {/* Social Links (Instagram, Facebook, TikTok...) */}
                        <div className="flex items-center gap-1.5 ms-auto">
                            {instagramUrl && (
                                <a href={instagramUrl} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 flex items-center justify-center transition-all">
                                    <FaInstagram className="w-3.5 h-3.5" />
                                </a>
                            )}
                            {facebookUrl && (
                                <a href={facebookUrl} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 flex items-center justify-center transition-all">
                                    <FaFacebookF className="w-3.5 h-3.5" />
                                </a>
                            )}
                            {tiktokUrl && (
                                <a href={tiktokUrl} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-lg bg-slate-900/10 dark:bg-white/10 hover:bg-slate-900/20 text-slate-900 dark:text-white flex items-center justify-center transition-all">
                                    <FaTiktok className="w-3.5 h-3.5" />
                                </a>
                            )}
                            {snapchatUrl && (
                                <a href={snapchatUrl} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 flex items-center justify-center transition-all">
                                    <FaSnapchatGhost className="w-3.5 h-3.5" />
                                </a>
                            )}
                            {youtubeUrl && (
                                <a href={youtubeUrl} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all">
                                    <FaYoutube className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. VIP INTERACTIVE STORIES HIGHLIGHTS (If enabled & available) */}
                {showStoriesBar && storyHighlights.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2.5 px-1">
                            <span className="text-xs font-black text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>{isAr ? "هايلايت الأقسام والعروض" : "Featured Stories"}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold">
                                {isAr ? "انقر للمعاينة السريعة" : "Tap to preview"}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 overflow-x-auto py-2 px-1 no-scrollbar scroll-smooth">
                            {storyHighlights.map((story, sIdx) => (
                                <button
                                    key={story.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveStoryIdx(sIdx);
                                        setStoryProgress(0);
                                    }}
                                    className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                                >
                                    <div 
                                        className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2.5px] transition-transform group-hover:scale-105 active:scale-95"
                                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryGlow}, #ec4899)` }}
                                    >
                                        <div className="w-full h-full rounded-full p-[2px] bg-white dark:bg-zinc-950 overflow-hidden">
                                            <OptimizedMenuImage
                                                src={story.image}
                                                alt={story.title}
                                                className="w-full h-full object-cover rounded-full"
                                                sizes="72px"
                                            />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-white text-white flex items-center justify-center text-[9px] shadow-sm">
                                            ✨
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 max-w-[70px] truncate text-center">
                                        {story.title}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. SMART SEARCH & FILTER CONTROLS BAR */}
                <div className="sticky top-2 z-40 mb-6 space-y-2.5">
                    {/* Glass Container */}
                    <div className="p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-white/85 dark:bg-zinc-900/85 theme31-glass border border-white/50 dark:border-white/10 shadow-xl space-y-2.5">
                        {/* Search Input Row */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 rtl:right-3.5 ltr:left-3.5 ltr:right-auto" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={isAr ? "ابحث باسم الصنف، المكونات، أو القسم..." : "Search dish, ingredients, category..."}
                                    className="w-full theme31-search-input bg-slate-100/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl sm:rounded-2xl text-xs py-2.5 px-9 text-slate-900 dark:text-zinc-100 focus:outline-none transition-all placeholder:text-slate-400"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rtl:left-3 ltr:right-3 ltr:left-auto"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* View Mode Switcher Pills */}
                            <div className="flex items-center p-1 rounded-xl sm:rounded-2xl bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'}`}
                                    style={viewMode === 'grid' ? { color: primaryColor } : undefined}
                                    title={isAr ? "عرض شبكي مزدوج" : "Grid View"}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'}`}
                                    style={viewMode === 'list' ? { color: primaryColor } : undefined}
                                    title={isAr ? "عرض قائمة تفصيلية" : "List View"}
                                >
                                    <LayoutList className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('compact')}
                                    className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === 'compact' ? 'bg-white dark:bg-zinc-700 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'}`}
                                    style={viewMode === 'compact' ? { color: primaryColor } : undefined}
                                    title={isAr ? "عرض مضغوط سريع" : "Compact Fast View"}
                                >
                                    <AlignJustify className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('showcase')}
                                    className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === 'showcase' ? 'bg-white dark:bg-zinc-700 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'}`}
                                    style={viewMode === 'showcase' ? { color: primaryColor } : undefined}
                                    title={isAr ? "عرض بصري كامل" : "Showcase View"}
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Category Navigation Pills */}
                        <div 
                            ref={categoryNavRef}
                            className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth touch-pan-x"
                        >
                            <button
                                type="button"
                                onClick={() => scrollToCategory('all')}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                                    activeCategory === 'all'
                                        ? 'theme31-active-pill text-white shadow-md'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                                }`}
                            >
                                <Sparkles className="w-3 h-3" />
                                <span>{isAr ? "كل القائمة" : "All Menu"}</span>
                            </button>

                            {categories.map((cat) => {
                                const isSelected = activeCategory === String(cat.id);
                                const count = cat.items?.length || 0;
                                const isCatFeatured = Boolean(cat.is_popular || (cat.items && cat.items.length > 0 && cat.items.every(it => it.is_popular)));
                                return (
                                    <button
                                        key={cat.id}
                                        id={`nav-cat-t31-${cat.id}`}
                                        type="button"
                                        onClick={() => scrollToCategory(String(cat.id))}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                                            isSelected
                                                ? 'theme31-active-pill text-white shadow-md'
                                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                                        }`}
                                    >
                                        {isCatFeatured && (
                                            <Flame className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-300 fill-amber-300' : 'text-amber-500 fill-amber-500'}`} />
                                        )}
                                        <span>{catName(cat)}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Filter Chips & Sort Row */}
                        <div className="flex items-center justify-between gap-2 overflow-x-auto pt-1 no-scrollbar">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setActiveFilter('all')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                        activeFilter === 'all'
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                            : 'bg-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                                    }`}
                                >
                                    {isAr ? "الكل" : "All"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveFilter('popular')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                                        activeFilter === 'popular'
                                            ? 'bg-rose-500 text-white'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                                    }`}
                                >
                                    <Flame className="w-3 h-3 text-rose-500" />
                                    <span>{isAr ? "الأكثر طلباً" : "Popular"}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveFilter('new')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                                        activeFilter === 'new'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                    }`}
                                >
                                    <Sparkles className="w-3 h-3 text-emerald-500" />
                                    <span>{isAr ? "جديدنا" : "New"}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveFilter('offers')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                                        activeFilter === 'offers'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                                    }`}
                                >
                                    <Tag className="w-3 h-3 text-amber-500" />
                                    <span>{isAr ? "عروض خاصة" : "Offers"}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveFilter('favorites')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                                        activeFilter === 'favorites'
                                            ? 'bg-pink-500 text-white'
                                            : 'bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20'
                                    }`}
                                >
                                    <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
                                    <span>{isAr ? "المفضلة" : "Favorites"}</span>
                                </button>
                            </div>

                            {/* Sort Price Toggle */}
                            <button
                                type="button"
                                onClick={() => {
                                    setSortOrder(prev => prev === 'default' ? 'price-asc' : prev === 'price-asc' ? 'price-desc' : 'default');
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-1 shrink-0"
                                title={isAr ? "ترتيب حسب السعر" : "Sort by price"}
                            >
                                <ArrowUpDown className="w-3 h-3 opacity-60" />
                                <span>
                                    {sortOrder === 'default' 
                                        ? (isAr ? "الترتيب" : "Sort") 
                                        : sortOrder === 'price-asc' 
                                            ? (isAr ? "الأقل سعراً" : "Price ↑") 
                                            : (isAr ? "الأعلى سعراً" : "Price ↓")}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 5. SEARCH RESULTS STATUS OR NO ITEMS */}
                {searchQuery && (
                    <div className="mb-4 px-2 flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400">
                        <span>{isAr ? `نتائج البحث عن "${searchQuery}":` : `Results for "${searchQuery}":`}</span>
                        <span className="font-bold" style={{ color: primaryColor }}>{isAr ? `${totalMatchingItems} صنف متطابق` : `${totalMatchingItems} items found`}</span>
                    </div>
                )}

                {totalMatchingItems === 0 && (
                    <div className="text-center py-16 px-4 bg-white/50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-700">
                        <Utensils className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                        <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                            {isAr ? "لم نجد أي وجبات مطابقة للبحث أو الفلتر" : "No matching items found"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 mb-4">
                            {isAr ? "جرب البحث بكلمات أخرى أو إعادة ضبط الفلاتر" : "Try different keywords or reset filters"}
                        </p>
                        <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 hover:opacity-90"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isAr ? "إعادة ضبط البحث" : "Reset Filter"}
                        </button>
                    </div>
                )}

                {/* 6. CATEGORIES & MENU ITEMS LISTING */}
                <div className="space-y-10">
                    {processedCategories.map((category) => {
                        const isCatFeatured = Boolean(category.is_popular || (category.items && category.items.length > 0 && category.items.every(it => it.is_popular)));
                        return (
                            <section 
                                key={category.id} 
                                id={`cat-section-t31-${category.id}`}
                                className="scroll-mt-36"
                            >
                                {/* Section Header */}
                                <div className="flex items-center justify-between gap-3 mb-4 px-1">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <div 
                                            className="w-2.5 h-6 rounded-full"
                                            style={{ background: `linear-gradient(to bottom, ${primaryColor}, ${secondaryGlow})` }}
                                        />
                                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                            {catName(category)}
                                        </h2>
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                                            {category.items?.length || 0}
                                        </span>
                                        {isCatFeatured && (
                                            <span 
                                                className="px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-xs"
                                                style={{ 
                                                    backgroundColor: `${primaryColor}15`, 
                                                    color: primaryColor,
                                                    border: `1px solid ${primaryColor}40`
                                                }}
                                            >
                                                <Flame className="w-3 h-3 fill-current" />
                                                <span>{isAr ? "قسم مميز" : "Featured Section"}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                            {/* View Mode 1: GRID MODE */}
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                    {(category.items || []).map((item) => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const isFav = Boolean(favorites[String(item.id)]);
                                        const currentSizeIdx = cardSelectedSizes[String(item.id)] ?? 0;
                                        const currentPrice = item.prices?.[currentSizeIdx] || item.prices?.[0] || 0;
                                        const currentOldPrice = item.old_prices?.[currentSizeIdx];
                                        const hasDiscount = currentOldPrice && currentOldPrice > currentPrice;
                                        const discountPct = hasDiscount ? Math.round(((currentOldPrice - currentPrice) / currentOldPrice) * 100) : 0;
                                        const hasMultipleSizes = (item.prices?.length || 0) > 1;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => openItemDetails(item, catName(category), category.id)}
                                                className="group relative cursor-pointer rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-zinc-900/80 theme31-glass border border-slate-200/80 dark:border-white/10 p-2.5 sm:p-3.5 flex flex-col justify-between theme31-card-hover transition-all"
                                            >
                                                {/* Top Image + Badges Container */}
                                                <div className="relative w-full aspect-square sm:aspect-4/3 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 mb-2.5">
                                                    {(item.image_url || item.image) ? (
                                                        <OptimizedMenuImage
                                                            src={item.image_url || item.image}
                                                            alt={itemName(item)}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            sizes="(max-width: 640px) 50vw, 300px"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                            <Utensils className="w-8 h-8" />
                                                        </div>
                                                    )}

                                                    {/* Floating Top Action: Favorite Heart */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => toggleFavorite(item.id, e)}
                                                        className="absolute top-2 start-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-transform active:scale-90 z-10"
                                                        title={isAr ? "إضافة للمفضلة" : "Favorite"}
                                                    >
                                                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-pink-500 fill-pink-500' : 'text-white'}`} />
                                                    </button>

                                                    {/* Floating Badge (Discount / Popular / New) */}
                                                    <div className="absolute top-2 end-2 flex flex-col gap-1 z-10">
                                                        {hasDiscount && (
                                                            <span className="px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-[9px] font-black shadow-md backdrop-blur-xs">
                                                                %{discountPct} {isAr ? "خصم" : "OFF"}
                                                            </span>
                                                        )}
                                                        {item.is_popular && (
                                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[9px] font-black shadow-md backdrop-blur-xs flex items-center gap-0.5">
                                                                <Flame className="w-2.5 h-2.5" />
                                                                <span>{isAr ? "مميز" : "Hot"}</span>
                                                            </span>
                                                        )}
                                                        {item.is_new && (
                                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[9px] font-black shadow-md backdrop-blur-xs">
                                                                {isAr ? "جديد" : "NEW"}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Calories Chip */}
                                                    {item.calories && (
                                                        <div className="absolute bottom-2 start-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9px] font-semibold flex items-center gap-1 z-10">
                                                            <span>🔥</span>
                                                            <span>{item.calories} {isAr ? "كالوري" : "cal"}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Item Details */}
                                                <div className="space-y-1 flex-1">
                                                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 line-clamp-1 theme31-title-hover transition-colors">
                                                        {itemName(item)}
                                                    </h3>
                                                    {itemDesc(item) && (
                                                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                                            {itemDesc(item)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Multiple Size Chooser Pills (If multiple prices exist) */}
                                                {hasMultipleSizes && (
                                                    <div 
                                                        className="flex items-center gap-1 overflow-x-auto py-1.5 my-1 no-scrollbar"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {item.prices.map((pVal, pIdx) => {
                                                            const isSizeActive = currentSizeIdx === pIdx;
                                                            const sizeName = item.size_labels?.[pIdx] || (pIdx === 0 ? (isAr ? 'صغير' : 'S') : pIdx === 1 ? (isAr ? 'وسط' : 'M') : (isAr ? 'كبير' : 'L'));
                                                            return (
                                                                <button
                                                                    key={pIdx}
                                                                    type="button"
                                                                    onClick={() => setCardSelectedSizes(prev => ({ ...prev, [String(item.id)]: pIdx }))}
                                                                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all border ${
                                                                        isSizeActive 
                                                                            ? 'text-white shadow-2xs' 
                                                                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-transparent hover:border-slate-300'
                                                                    }`}
                                                                    style={isSizeActive ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                                                                >
                                                                    {sizeName}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Price & Add To Cart Button */}
                                                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                                                {currentPrice}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                                                                {cur}
                                                            </span>
                                                        </div>
                                                        {hasDiscount && (
                                                            <span className="text-[10px] text-slate-400 line-through">
                                                                {currentOldPrice} {cur}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* In-Card Stepper OR Add Button */}
                                                    {inCartQty > 0 ? (
                                                        <div 
                                                            className="flex items-center gap-1.5 rounded-xl p-0.5 border"
                                                            style={{ 
                                                                backgroundColor: isDark ? `${primaryColor}20` : `${primaryColor}12`,
                                                                borderColor: `${primaryColor}40`
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={(e) => quickDecrementFromCart(item.id, e)}
                                                                className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-slate-100 active:scale-90"
                                                                style={{ color: primaryColor }}
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="text-xs font-black px-1" style={{ color: primaryColor }}>
                                                                {inCartQty}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => quickAddToCart(item, catName(category), e)}
                                                                className="w-6 h-6 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-2xs active:scale-90 hover:opacity-90"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => quickAddToCart(item, catName(category), e)}
                                                            className="w-8 h-8 rounded-xl active:scale-90 text-white flex items-center justify-center transition-all shadow-md hover:opacity-90"
                                                            style={{ 
                                                                backgroundColor: primaryColor,
                                                                boxShadow: `0 4px 14px 0 ${primaryColor}4d`
                                                            }}
                                                            title={isAr ? "إضافة سريعة للسلة" : "Quick Add to Cart"}
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* View Mode 2: LIST MODE */}
                            {viewMode === 'list' && (
                                <div className="space-y-3">
                                    {(category.items || []).map((item) => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const currentPrice = item.prices?.[0] || 0;
                                        const currentOldPrice = item.old_prices?.[0];
                                        const hasDiscount = currentOldPrice && currentOldPrice > currentPrice;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => openItemDetails(item, catName(category), category.id)}
                                                className="group cursor-pointer rounded-2xl bg-white/80 dark:bg-zinc-900/80 theme31-glass border border-slate-200/80 dark:border-white/10 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 theme31-card-hover transition-all"
                                            >
                                                {/* Left/Right Thumbnail */}
                                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0">
                                                    {(item.image_url || item.image) ? (
                                                        <OptimizedMenuImage
                                                            src={item.image_url || item.image}
                                                            alt={itemName(item)}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            sizes="100px"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                            <Utensils className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Middle Details */}
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 truncate theme31-title-hover transition-colors">
                                                            {itemName(item)}
                                                        </h3>
                                                        {item.is_popular && (
                                                            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black shrink-0">
                                                                🔥 {isAr ? "مميز" : "Hot"}
                                                            </span>
                                                        )}
                                                        {item.is_new && (
                                                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black shrink-0">
                                                                ✨ {isAr ? "جديد" : "NEW"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {itemDesc(item) && (
                                                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                                            {itemDesc(item)}
                                                        </p>
                                                    )}
                                                    <div className="flex items-baseline gap-1.5 pt-0.5">
                                                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                                            {currentPrice} {cur}
                                                        </span>
                                                        {hasDiscount && (
                                                            <span className="text-[10px] text-slate-400 line-through">
                                                                {currentOldPrice} {cur}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right Stepper or Add Button */}
                                                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    {inCartQty > 0 ? (
                                                        <div 
                                                            className="flex items-center gap-1.5 rounded-xl p-1 border"
                                                            style={{ 
                                                                backgroundColor: isDark ? `${primaryColor}20` : `${primaryColor}12`,
                                                                borderColor: `${primaryColor}40`
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={(e) => quickDecrementFromCart(item.id, e)}
                                                                className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-slate-100 active:scale-90"
                                                                style={{ color: primaryColor }}
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="text-xs font-black px-1" style={{ color: primaryColor }}>
                                                                {inCartQty}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => quickAddToCart(item, catName(category), e)}
                                                                className="w-6 h-6 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-2xs active:scale-90 hover:opacity-90"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => quickAddToCart(item, catName(category), e)}
                                                            className="w-9 h-9 rounded-2xl active:scale-90 text-white flex items-center justify-center transition-all shadow-md hover:opacity-90"
                                                            style={{ 
                                                                backgroundColor: primaryColor,
                                                                boxShadow: `0 4px 14px 0 ${primaryColor}4d`
                                                            }}
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* View Mode 3: COMPACT MODE */}
                            {viewMode === 'compact' && (
                                <div className="rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-zinc-900/80 theme31-glass border border-slate-200/80 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
                                    {(category.items || []).map((item) => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const currentPrice = item.prices?.[0] || 0;
                                        const currentOldPrice = item.old_prices?.[0];
                                        const hasDiscount = currentOldPrice && currentOldPrice > currentPrice;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => openItemDetails(item, catName(category), category.id)}
                                                className="group p-2.5 sm:p-3 flex items-center justify-between gap-2.5 sm:gap-3.5 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                                            >
                                                {/* Start: Thumbnail + Details */}
                                                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                                                    {/* Mini Image Thumbnail */}
                                                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 border border-slate-200/60 dark:border-white/5 shadow-2xs">
                                                        {(item.image_url || item.image) ? (
                                                            <OptimizedMenuImage
                                                                src={item.image_url || item.image}
                                                                alt={itemName(item)}
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                sizes="60px"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                                <Utensils className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 truncate theme31-title-hover transition-colors">
                                                                {itemName(item)}
                                                            </h3>
                                                            {item.is_popular && (
                                                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shrink-0">
                                                                    🔥 {isAr ? "مميز" : "Hot"}
                                                                </span>
                                                            )}
                                                            {item.is_new && (
                                                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                                                    ✨ {isAr ? "جديد" : "NEW"}
                                                                </span>
                                                            )}
                                                            {item.calories && (
                                                                <span className="text-[9px] text-slate-400 font-bold shrink-0">
                                                                    🔥 {item.calories}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {itemDesc(item) && (
                                                            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5 leading-tight">
                                                                {itemDesc(item)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* End: Price + Stepper / Add Button */}
                                                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    <div className="text-end">
                                                        <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                                                            {currentPrice} {cur}
                                                        </div>
                                                        {hasDiscount && (
                                                            <div className="text-[9px] text-slate-400 line-through">
                                                                {currentOldPrice} {cur}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {inCartQty > 0 ? (
                                                        <div 
                                                            className="flex items-center gap-1 rounded-lg p-0.5 border"
                                                            style={{ 
                                                                backgroundColor: isDark ? `${primaryColor}20` : `${primaryColor}12`,
                                                                borderColor: `${primaryColor}40`
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={(e) => quickDecrementFromCart(item.id, e)}
                                                                className="w-5 h-5 rounded bg-white dark:bg-zinc-800 flex items-center justify-center font-bold text-xs active:scale-90"
                                                                style={{ color: primaryColor }}
                                                            >
                                                                <Minus className="w-2.5 h-2.5" />
                                                            </button>
                                                            <span className="text-xs font-black px-1" style={{ color: primaryColor }}>
                                                                {inCartQty}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => quickAddToCart(item, catName(category), e)}
                                                                className="w-5 h-5 rounded text-white flex items-center justify-center font-bold text-xs active:scale-90 hover:opacity-90"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <Plus className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => quickAddToCart(item, catName(category), e)}
                                                            className="px-2.5 py-1 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95 hover:opacity-90"
                                                            style={{ 
                                                                backgroundColor: primaryColor,
                                                                boxShadow: `0 2px 8px 0 ${primaryColor}40`
                                                            }}
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            <span>{isAr ? "أضف" : "Add"}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* View Mode 4: SHOWCASE MODE */}
                            {viewMode === 'showcase' && (
                                <div className="space-y-6">
                                    {(category.items || []).map((item) => {
                                        const inCartQty = getItemCartQty(item.id);
                                        const currentPrice = item.prices?.[0] || 0;
                                        const currentOldPrice = item.old_prices?.[0];
                                        const hasDiscount = currentOldPrice && currentOldPrice > currentPrice;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => openItemDetails(item, catName(category), category.id)}
                                                className="group cursor-pointer rounded-3xl bg-white/80 dark:bg-zinc-900/80 theme31-glass border border-slate-200/80 dark:border-white/10 overflow-hidden theme31-card-hover transition-all"
                                            >
                                                {/* Full Height Hero Image */}
                                                <div className="relative w-full h-52 sm:h-72 bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                                                    {(item.image_url || item.image) ? (
                                                        <OptimizedMenuImage
                                                            src={item.image_url || item.image}
                                                            alt={itemName(item)}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                            sizes="(max-width: 768px) 100vw, 800px"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                                            <Utensils className="w-12 h-12" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                                                    {/* Floating Badges */}
                                                    <div className="absolute top-3 start-3 flex items-center gap-1.5 z-10">
                                                        {item.is_popular && (
                                                            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black shadow-md flex items-center gap-1">
                                                                <Flame className="w-3 h-3" />
                                                                <span>{isAr ? "الأكثر طلباً" : "Best Seller"}</span>
                                                            </span>
                                                        )}
                                                        {item.is_new && (
                                                            <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-md flex items-center gap-1">
                                                                <Sparkles className="w-3 h-3" />
                                                                <span>{isAr ? "جديد" : "NEW"}</span>
                                                            </span>
                                                        )}
                                                        {hasDiscount && (
                                                            <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black shadow-md">
                                                                {isAr ? "عرض خاص" : "Special Offer"}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Bottom Title on Image */}
                                                    <div className="absolute bottom-3 start-3 end-3 text-white z-10">
                                                        <h3 className="text-lg sm:text-xl font-black drop-shadow-md">
                                                            {itemName(item)}
                                                        </h3>
                                                    </div>
                                                </div>

                                                {/* Description & Action Bar */}
                                                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="space-y-1 max-w-lg">
                                                        {itemDesc(item) && (
                                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed line-clamp-2">
                                                                {itemDesc(item)}
                                                            </p>
                                                        )}
                                                        <div className="flex items-baseline gap-2 pt-1">
                                                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                                                {currentPrice} {cur}
                                                            </span>
                                                            {hasDiscount && (
                                                                <span className="text-xs text-slate-400 line-through">
                                                                    {currentOldPrice} {cur}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                        {inCartQty > 0 ? (
                                                            <div 
                                                                className="flex items-center gap-2 rounded-2xl p-1.5 border"
                                                                style={{ 
                                                                    backgroundColor: isDark ? `${primaryColor}20` : `${primaryColor}12`,
                                                                    borderColor: `${primaryColor}40`
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => quickDecrementFromCart(item.id, e)}
                                                                    className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center font-bold text-sm shadow-xs active:scale-90"
                                                                    style={{ color: primaryColor }}
                                                                >
                                                                    <Minus className="w-4 h-4" />
                                                                </button>
                                                                <span className="text-sm font-black px-2" style={{ color: primaryColor }}>
                                                                    {inCartQty}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => quickAddToCart(item, catName(category), e)}
                                                                    className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs active:scale-90 hover:opacity-90"
                                                                    style={{ backgroundColor: primaryColor }}
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => quickAddToCart(item, catName(category), e)}
                                                                className="px-5 py-2.5 rounded-2xl active:scale-95 text-white text-xs font-black flex items-center gap-2 shadow-lg transition-all hover:opacity-90"
                                                                style={{ 
                                                                    backgroundColor: primaryColor,
                                                                    boxShadow: `0 4px 14px 0 ${primaryColor}4d`
                                                                }}
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                <span>{isAr ? "أضف إلى السلة" : "Add to Cart"}</span>
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
                    );
                })}
                </div>

                {/* 7. FLOATING ACTION GLASS CAPSULE (Bottom Bar) */}
                <AnimatePresence>
                    {cartCount > 0 && (
                        <motion.div
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[460px] z-40"
                        >
                            <button
                                type="button"
                                onClick={() => setIsCartOpen(true)}
                                className="w-full p-3 sm:p-3.5 rounded-3xl bg-slate-950/90 dark:bg-white/95 text-white dark:text-slate-950 shadow-2xl border border-white/20 dark:border-slate-800/20 backdrop-blur-xl flex items-center justify-between gap-3 active:scale-98 transition-transform theme31-glow-border"
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-black text-sm relative shadow-md"
                                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryGlow})` }}
                                    >
                                        <ShoppingCart className="w-5 h-5" />
                                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-950">
                                            {cartCount}
                                        </span>
                                    </div>
                                    <div className="text-start">
                                        <div className="text-xs font-bold opacity-80">
                                            {isAr ? "سلة المشتريات" : "Your Cart"}
                                        </div>
                                        <div className="text-sm sm:text-base font-black">
                                            {cartTotal} {cur}
                                        </div>
                                    </div>
                                </div>

                                <div 
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-white font-black text-xs shadow-md transition-transform active:scale-95"
                                    style={{ 
                                        backgroundColor: primaryColor,
                                        boxShadow: `0 4px 14px 0 ${primaryColor}4d`
                                    }}
                                >
                                    <span>{isAr ? "عرض السلة" : "View Cart"}</span>
                                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                                </div>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 8. SLIDE-OVER LUXE GLASS CART DRAWER */}
                <AnimatePresence>
                    {isCartOpen && (
                        <div className="fixed inset-0 z-50 overflow-hidden">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsCartOpen(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                            />

                            <div className="fixed inset-y-0 end-0 max-w-full flex pl-10 rtl:pr-10 rtl:pl-0">
                                <motion.div
                                    initial={{ x: isAr ? -400 : 400 }}
                                    animate={{ x: 0 }}
                                    exit={{ x: isAr ? -400 : 400 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                                    className="w-screen max-w-md bg-white/95 dark:bg-zinc-950/95 theme31-glass border-s border-white/20 dark:border-white/10 shadow-2xl flex flex-col"
                                >
                                    {/* Cart Drawer Header */}
                                    <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div 
                                                className="w-8 h-8 rounded-xl text-white flex items-center justify-center"
                                                style={{ background: primaryColor }}
                                            >
                                                <ShoppingCart className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                                                    {isAr ? "سلة الطلبات" : "Order Cart"}
                                                </h3>
                                                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold">
                                                    {isAr ? `${cartCount} صنف مضاف` : `${cartCount} items added`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {cart.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(isAr ? "هل أنت متأكد من تفريغ السلة؟" : "Clear all items in cart?")) {
                                                            setCart([]);
                                                        }
                                                    }}
                                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all text-xs"
                                                    title={isAr ? "تفريغ السلة" : "Clear cart"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setIsCartOpen(false)}
                                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Cart Items List */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {cart.length === 0 ? (
                                            <div className="text-center py-20">
                                                <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
                                                <h4 className="font-bold text-sm text-slate-700 dark:text-zinc-300">
                                                    {isAr ? "سلتك فارغة حالياً" : "Your cart is empty"}
                                                </h4>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {isAr ? "أضف وجباتك المفضلة من القائمة لتظهر هنا" : "Add your favorite dishes from the menu"}
                                                </p>
                                            </div>
                                        ) : (
                                            cart.map((cartItem) => {
                                                const extrasSum = (cartItem.extras || []).reduce((s, e) => s + e.price * (e.qty || 1), 0);
                                                const singlePrice = cartItem.price + extrasSum;
                                                const totalItemPrice = singlePrice * cartItem.quantity;

                                                return (
                                                    <div 
                                                        key={cartItem.cKey}
                                                        className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-white/5 space-y-2"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <h4 className="font-black text-xs text-slate-900 dark:text-white truncate">
                                                                    {itemName(cartItem.item)}
                                                                </h4>
                                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 font-bold mt-0.5">
                                                                    <span>{cartItem.sizeLabel}</span>
                                                                    <span>•</span>
                                                                    <span className="font-black" style={{ color: primaryColor }}>{totalItemPrice} {cur}</span>
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => setCart(prev => prev.filter(c => c.cKey !== cartItem.cKey))}
                                                                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* Extras list if any */}
                                                        {cartItem.extras && cartItem.extras.length > 0 && (
                                                            <div className="text-[10px] text-slate-500 dark:text-zinc-400 space-y-0.5 bg-white/60 dark:bg-zinc-800/60 p-2 rounded-xl border border-black/5 dark:border-white/5">
                                                                <span className="font-bold">{isAr ? "الإضافات:" : "Extras:"}</span>
                                                                {cartItem.extras.map((ex, exIdx) => (
                                                                    <div key={exIdx} className="flex justify-between">
                                                                        <span>+ {ex.name} {ex.qty && ex.qty > 1 ? `(×${ex.qty})` : ''}</span>
                                                                        <span>{ex.price * (ex.qty || 1)} {cur}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Notes if any */}
                                                        {cartItem.notes && (
                                                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 italic bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                                                                📝 {cartItem.notes}
                                                            </p>
                                                        )}

                                                        {/* Quantity Stepper */}
                                                        <div className="flex items-center justify-end gap-2 pt-1">
                                                            <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setCart(prev => {
                                                                            return prev.map(c => {
                                                                                if (c.cKey === cartItem.cKey) {
                                                                                    return { ...c, quantity: Math.max(1, c.quantity - 1) };
                                                                                }
                                                                                return c;
                                                                            });
                                                                        });
                                                                    }}
                                                                    className="w-6 h-6 rounded-lg text-slate-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xs hover:bg-slate-100"
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-xs font-black px-1.5 text-slate-900 dark:text-white">
                                                                    {cartItem.quantity}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setCart(prev => {
                                                                            return prev.map(c => {
                                                                                if (c.cKey === cartItem.cKey) {
                                                                                    return { ...c, quantity: c.quantity + 1 };
                                                                                }
                                                                                return c;
                                                                            });
                                                                        });
                                                                    }}
                                                                    className="w-6 h-6 rounded-lg text-white flex items-center justify-center font-bold text-xs active:scale-90 hover:opacity-90"
                                                                    style={{ backgroundColor: primaryColor }}
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Cart Drawer Footer */}
                                    {cart.length > 0 && (
                                        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 space-y-3 bg-slate-50/50 dark:bg-zinc-900/50">
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                                                    <span>{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
                                                    <span>{cartTotal} {cur}</span>
                                                </div>
                                                <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-zinc-800">
                                                    <span>{isAr ? "الإجمالي الكلي" : "Total Amount"}</span>
                                                    <span className="font-black" style={{ color: primaryColor }}>{cartTotal} {cur}</span>
                                                </div>
                                            </div>

                                            {/* Action Button: Open Checkout Modal OR WhatsApp Direct */}
                                            {config.orders_enabled !== false ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsCartOpen(false);
                                                        setShowCheckout(true);
                                                    }}
                                                    className="w-full py-3.5 rounded-2xl active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90"
                                                    style={{ 
                                                        backgroundColor: primaryColor,
                                                        boxShadow: `0 10px 25px -5px ${primaryColor}4d`
                                                    }}
                                                >
                                                    <ShoppingCart className="w-4 h-4" />
                                                    <span>{isAr ? "متابعة الطلب والدفع" : "Proceed to Checkout"}</span>
                                                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                                                </button>
                                            ) : (
                                                whatsappClean && (
                                                    <a
                                                        href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent(
                                                            `${isAr ? 'طلب جديد من منيو' : 'New Order from'} ${config.name}:\n` +
                                                            cart.map(c => `• ${itemName(c.item)} (${c.sizeLabel}) × ${c.quantity} = ${(c.price + (c.extras || []).reduce((s, e) => s + e.price * (e.qty || 1), 0)) * c.quantity} ${cur}`).join('\n') +
                                                            `\n${isAr ? 'الإجمالي:' : 'Total:'} ${cartTotal} ${cur}`
                                                        )}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-full py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                                                    >
                                                        <FaWhatsapp className="w-4 h-4" />
                                                        <span>{isAr ? "إرسال الطلب عبر واتساب" : "Order via WhatsApp"}</span>
                                                    </a>
                                                )
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 9. ULTRA-LUXE PRODUCT DETAILS MODAL */}
                <AnimatePresence>
                    {selectedItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedItem(null)}
                                className="fixed inset-0 bg-black/70 backdrop-blur-md"
                            />

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                                className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-3xl sm:rounded-4xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden z-10 flex flex-col max-h-[90vh]"
                            >
                                {/* Modal Header Image */}
                                <div className="relative w-full h-52 sm:h-64 bg-slate-100 dark:bg-zinc-800 shrink-0">
                                    {(selectedItem.item.image_url || selectedItem.item.image) ? (
                                        <OptimizedMenuImage
                                            src={selectedItem.item.image_url || selectedItem.item.image}
                                            alt={itemName(selectedItem.item)}
                                            className="w-full h-full object-cover"
                                            sizes="500px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                                            <Utensils className="w-12 h-12" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                    {/* Close Button */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        className="absolute top-3 end-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all z-10"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>

                                    {/* Category Pill */}
                                    <span className="absolute top-3 start-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                                        {selectedItem.catName}
                                    </span>

                                    {/* Item Title on Bottom of Image */}
                                    <div className="absolute bottom-3 start-4 end-4 text-white z-10">
                                        <h3 className="text-lg sm:text-xl font-black drop-shadow-md">
                                            {itemName(selectedItem.item)}
                                        </h3>
                                    </div>
                                </div>

                                {/* Modal Body (Scrollable) */}
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                                    {/* Description */}
                                    {itemDesc(selectedItem.item) && (
                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                                            {itemDesc(selectedItem.item)}
                                        </p>
                                    )}

                                    {/* Ingredients (If present) */}
                                    {(selectedItem.item.ingredients || selectedItem.item.ingredients_ar || selectedItem.item.ingredients_en) && (
                                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-white/5 space-y-1">
                                            <span className="text-[11px] font-black text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <span>🌿</span>
                                                <span>{isAr ? "المكونات والمقادير:" : "Ingredients:"}</span>
                                            </span>
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                                                {isAr ? (selectedItem.item.ingredients_ar || selectedItem.item.ingredients) : (selectedItem.item.ingredients_en || selectedItem.item.ingredients || selectedItem.item.ingredients_ar)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Size Options (If multiple prices) */}
                                    {(selectedItem.item.prices?.length || 0) > 1 && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-900 dark:text-white block">
                                                {isAr ? "اختر الحجم المطلوب:" : "Choose Size:"}
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {selectedItem.item.prices.map((pVal, pIdx) => {
                                                    const isSelected = modalSizeIdx === pIdx;
                                                    const sName = selectedItem.item.size_labels?.[pIdx] || (pIdx === 0 ? (isAr ? 'صغير' : 'Small') : pIdx === 1 ? (isAr ? 'وسط' : 'Medium') : (isAr ? 'كبير' : 'Large'));
                                                    return (
                                                        <button
                                                            key={pIdx}
                                                            type="button"
                                                            onClick={() => setModalSizeIdx(pIdx)}
                                                            className={`p-2.5 rounded-2xl border text-xs font-bold transition-all text-start flex flex-col justify-between ${
                                                                isSelected
                                                                    ? 'text-white shadow-md'
                                                                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 hover:border-slate-300'
                                                            }`}
                                                            style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                                                        >
                                                            <span>{sName}</span>
                                                            <span className="text-xs font-black mt-1">
                                                                {pVal} {cur}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Extras & Add-ons (If available) */}
                                    {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-900 dark:text-white block">
                                                {isAr ? "إضافات ومكملات الوجبة:" : "Optional Add-ons:"}
                                            </label>
                                            <div className="space-y-1.5">
                                                {selectedItem.item.extras.map((extra, eIdx) => {
                                                    const eName = isAr ? extra.name_ar : (extra.name_en || extra.name_ar);
                                                    const isSelected = modalExtras.some(e => e.name === eName);
                                                    const currentExtra = modalExtras.find(e => e.name === eName);
                                                    const qty = currentExtra?.qty || 1;

                                                    return (
                                                        <div
                                                            key={eIdx}
                                                            className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                                                                isSelected
                                                                    ? 'border'
                                                                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                                                            }`}
                                                            style={isSelected ? { backgroundColor: isDark ? `${primaryColor}20` : `${primaryColor}10`, borderColor: `${primaryColor}60` } : undefined}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleModalExtra(eName, extra.price)}
                                                                className="flex items-center gap-2.5 flex-1 text-start"
                                                            >
                                                                <div 
                                                                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? 'text-white' : 'border-slate-300 dark:border-zinc-600'}`}
                                                                    style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                                                                >
                                                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{eName}</span>
                                                            </button>

                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black" style={{ color: primaryColor }}>
                                                                    +{extra.price} {cur}
                                                                </span>

                                                                {isSelected && (
                                                                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-0.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateModalExtraQty(eName, -1)}
                                                                            className="w-5 h-5 rounded text-xs flex items-center justify-center font-bold"
                                                                        >
                                                                            <Minus className="w-2.5 h-2.5" />
                                                                        </button>
                                                                        <span className="text-[10px] font-black px-1">{qty}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateModalExtraQty(eName, 1)}
                                                                            className="w-5 h-5 rounded text-white text-xs flex items-center justify-center font-bold"
                                                                            style={{ backgroundColor: primaryColor }}
                                                                        >
                                                                            <Plus className="w-2.5 h-2.5" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Special Requests / Notes */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <span>✍️</span>
                                            <span>{isAr ? "ملاحظات خاصة للطلب (اختياري):" : "Special Instructions (Optional):"}</span>
                                        </label>
                                        <textarea
                                            value={modalNotes}
                                            onChange={(e) => setModalNotes(e.target.value)}
                                            placeholder={isAr ? "مثال: بدون بصل، زيادة صوص، تسوية جيدة..." : "e.g. No onions, extra sauce, well cooked..."}
                                            className="w-full theme31-search-input bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none min-h-[60px] resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Modal Footer (Sticky Action) */}
                                <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-between gap-3 shrink-0">
                                    {/* Main Quantity Stepper */}
                                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl p-1 shadow-xs">
                                        <button
                                            type="button"
                                            onClick={() => setModalQty(prev => Math.max(1, prev - 1))}
                                            className="w-8 h-8 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center font-bold text-xs active:scale-90"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="text-sm font-black px-2 text-slate-900 dark:text-white">
                                            {modalQty}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setModalQty(prev => prev + 1)}
                                            className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs active:scale-90 hover:opacity-90"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Add Button with Total Price */}
                                    <button
                                        type="button"
                                        onClick={addModalToCart}
                                        className="flex-1 py-3 px-4 rounded-2xl active:scale-95 text-white font-black text-xs flex items-center justify-between shadow-lg transition-all hover:opacity-90"
                                        style={{ 
                                            backgroundColor: primaryColor,
                                            boxShadow: `0 10px 25px -5px ${primaryColor}4d`
                                        }}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <ShoppingCart className="w-4 h-4" />
                                            <span>{isAr ? "أضف إلى السلة" : "Add to Cart"}</span>
                                        </span>
                                        <span className="font-extrabold text-sm">
                                            {modalTotal} {cur}
                                        </span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 10. INTERACTIVE VIP STORY REEL MODAL */}
                <AnimatePresence>
                    {activeStoryIdx !== null && storyHighlights[activeStoryIdx] && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
                            <div className="relative w-full max-w-sm h-full max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-zinc-950 text-white">
                                {/* Story Progress Bars */}
                                <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
                                    {storyHighlights.map((_, idx) => (
                                        <div key={idx} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
                                            <div 
                                                className="h-full bg-white transition-all duration-75"
                                                style={{ 
                                                    width: idx < activeStoryIdx ? '100%' : idx === activeStoryIdx ? `${storyProgress}%` : '0%' 
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Story Header */}
                                <div className="absolute top-7 inset-x-4 z-30 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full overflow-hidden border border-white">
                                            <OptimizedMenuImage
                                                src={storyHighlights[activeStoryIdx].image}
                                                alt="Story"
                                                className="w-full h-full object-cover"
                                                sizes="30px"
                                            />
                                        </div>
                                        <span className="text-xs font-black">{storyHighlights[activeStoryIdx].title}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveStoryIdx(null)}
                                        className="p-1 rounded-full bg-black/40 hover:bg-black/70 text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Story Main Image */}
                                <div className="relative flex-1 w-full h-full">
                                    <OptimizedMenuImage
                                        src={storyHighlights[activeStoryIdx].image}
                                        alt={storyHighlights[activeStoryIdx].title}
                                        className="w-full h-full object-cover"
                                        sizes="400px"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />

                                    {/* Tap Zones for Next/Prev */}
                                    <div 
                                        className="absolute inset-y-16 left-0 w-1/3 z-20 cursor-pointer"
                                        onClick={() => {
                                            if (activeStoryIdx > 0) {
                                                setActiveStoryIdx(activeStoryIdx - 1);
                                                setStoryProgress(0);
                                            }
                                        }}
                                    />
                                    <div 
                                        className="absolute inset-y-16 right-0 w-1/3 z-20 cursor-pointer"
                                        onClick={() => {
                                            if (activeStoryIdx < storyHighlights.length - 1) {
                                                setActiveStoryIdx(activeStoryIdx + 1);
                                                setStoryProgress(0);
                                            } else {
                                                setActiveStoryIdx(null);
                                            }
                                        }}
                                    />
                                </div>

                                {/* Story Bottom Card */}
                                {storyHighlights[activeStoryIdx].item && (
                                    <div className="p-4 z-30 bg-black/60 backdrop-blur-md border-t border-white/10 space-y-3">
                                        <div>
                                            <h4 className="text-sm font-black text-white">
                                                {itemName(storyHighlights[activeStoryIdx].item!)}
                                            </h4>
                                            <p className="text-[11px] text-zinc-300 line-clamp-1 mt-0.5">
                                                {itemDesc(storyHighlights[activeStoryIdx].item!)}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-black text-amber-400">
                                                {storyHighlights[activeStoryIdx].item!.prices?.[0] || 0} {cur}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const it = storyHighlights[activeStoryIdx].item!;
                                                    quickAddToCart(it, storyHighlights[activeStoryIdx].title);
                                                    setActiveStoryIdx(null);
                                                }}
                                                className="px-4 py-2 rounded-xl text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 hover:opacity-90"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>{isAr ? "أضف للسلة" : "Add to Cart"}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 11. WAITER CALL MODAL */}
                <AnimatePresence>
                    {isWaiterCallOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsWaiterCallOpen(false)}
                                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                            />

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-white/20 dark:border-white/10 z-10 space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                                            <Bell className="w-4 h-4 animate-bounce" />
                                        </div>
                                        <h3 className="font-black text-sm text-slate-900 dark:text-white">
                                            {isAr ? "نداء الويتر والخدمة" : "Call Waiter & Service"}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsWaiterCallOpen(false)}
                                        className="p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {waiterCallSent ? (
                                    <div className="text-center py-6 space-y-2">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto text-xl">
                                            ✓
                                        </div>
                                        <h4 className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                                            {isAr ? "تم إرسال النداء بنجاح!" : "Call Sent Successfully!"}
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            {isAr ? "الويتر في طريقه إلى طاولتك الآن" : "A waiter will be at your table shortly"}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                                {isAr ? "رقم الطاولة:" : "Table Number:"}
                                            </label>
                                            <input
                                                type="text"
                                                value={waiterTableNum}
                                                onChange={(e) => setWaiterTableNum(e.target.value)}
                                                placeholder={isAr ? "مثال: 5" : "e.g. 5"}
                                                className="w-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:border-amber-500"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                                {isAr ? "نوع الطلب:" : "Request Type:"}
                                            </label>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {[
                                                    { id: 'waiter', labelAr: 'نداء الويتر 🙋‍♂️', labelEn: 'Call Waiter 🙋‍♂️' },
                                                    { id: 'bill_cash', labelAr: 'طلب الحساب كاش 💵', labelEn: 'Cash Bill 💵' },
                                                    { id: 'bill_card', labelAr: 'طلب الحساب فيزا 💳', labelEn: 'Card Bill 💳' },
                                                    { id: 'help', labelAr: 'مساعدة أو خدمة 🍽️', labelEn: 'Assistance 🍽️' }
                                                ].map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => setWaiterCallType(t.id)}
                                                        className={`p-2 rounded-xl border text-[11px] font-bold transition-all ${
                                                            waiterCallType === t.id
                                                                ? 'bg-amber-500 text-white border-amber-500'
                                                                : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                                                        }`}
                                                    >
                                                        {isAr ? t.labelAr : t.labelEn}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleWaiterCall}
                                            disabled={!waiterTableNum.trim()}
                                            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                                        >
                                            <Bell className="w-3.5 h-3.5" />
                                            <span>{isAr ? "إرسال نداء فوري" : "Send Instant Call"}</span>
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 12. PAYMENT METHODS & TRANSFER NUMBERS MODAL */}
                <AnimatePresence>
                    {isPaymentModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                            />

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-white/20 dark:border-white/10 z-10 space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-8 h-8 rounded-xl flex items-center justify-center"
                                            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                                        >
                                            <CreditCard className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-black text-sm text-slate-900 dark:text-white">
                                            {isAr ? "طرق الدفع والتحويل" : "Payment Methods"}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPaymentModalOpen(false)}
                                        className="p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {config.payment_methods && Array.isArray(config.payment_methods) && config.payment_methods.length > 0 ? (
                                        config.payment_methods.map((pm: any, pIdx: number) => {
                                            const pmName = pm.name || pm.type || (isAr ? 'طريقة دفع' : 'Payment Method');
                                            const pmNum = pm.number || pm.phone || pm.account;
                                            return (
                                                <div key={pIdx} className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/5 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-xs text-slate-900 dark:text-white">{pmName}</span>
                                                        {pmNum && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(pmNum);
                                                                    setCopiedNumber(pmNum);
                                                                    setTimeout(() => setCopiedNumber(null), 2000);
                                                                }}
                                                                className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 hover:opacity-80 transition-opacity"
                                                                style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                                                            >
                                                                <Copy className="w-2.5 h-2.5" />
                                                                <span>{copiedNumber === pmNum ? (isAr ? "تم النسخ ✓" : "Copied ✓") : (isAr ? "نسخ الرقم" : "Copy")}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    {pmNum && (
                                                        <p className="font-mono text-xs text-slate-600 dark:text-zinc-300 font-black tracking-wider">
                                                            {pmNum}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800 text-center text-xs text-slate-500">
                                            {isAr ? "متاح الدفع كاش عند الاستلام، أو التحويل عبر انستا باي والمحافظ الإلكترونية." : "Cash on delivery, InstaPay, and mobile wallets are accepted."}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 13. STORE WORKING HOURS MODAL */}
                <AnimatePresence>
                    {showHoursModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowHoursModal(false)}
                                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                            />

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-white/20 dark:border-white/10 z-10 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-black text-sm text-slate-900 dark:text-white">
                                            {isAr ? "أوقات وساعات العمل" : "Working Hours"}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowHoursModal(false)}
                                        className="p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/5 space-y-2 text-xs">
                                    <div className="flex items-center justify-between font-bold">
                                        <span className="text-slate-600 dark:text-zinc-400">{isAr ? "الحالة الحالية:" : "Current Status:"}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${storeStatus.isOpen ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>
                                            {storeStatus.isOpen ? (isAr ? 'مفتوح الآن ✓' : 'Open Now ✓') : (isAr ? 'مغلق حالياً ✕' : 'Closed ✕')}
                                        </span>
                                    </div>

                                    {(config.working_hours || config.time_open) && (
                                        <div className="pt-2 border-t border-slate-200 dark:border-zinc-700/60 space-y-1">
                                            <span className="text-slate-500 dark:text-zinc-400 font-medium">{isAr ? "المواعيد:" : "Schedule:"}</span>
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                {config.working_hours || `${config.time_open || ''} - ${config.time_close || ''}`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 14. CHECKOUT MODAL INTEGRATION */}
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

                {/* 15. ASN BRANDING FOOTER */}
                <ASNFooter show={config.show_asn_branding !== false} />
            </div>
        </div>
    );
}
