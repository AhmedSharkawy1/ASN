'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, Plus, Minus, Trash2, X, Search, Share2, 
    Sparkles, Flame, Clock, MapPin, Phone, MessageCircle,
    Sun, Moon, Globe, ChevronRight, ChevronLeft, Check, ChevronDown, ArrowUpDown,
    LayoutGrid, LayoutList, Tag, Heart, Eye, 
    Truck, ShieldCheck, CreditCard, Headphones, Star, 
    SlidersHorizontal, CheckCircle2, AlertCircle, ShoppingBag, ArrowRight, ArrowLeft,
    Ticket, Gift, Percent, Store, Wallet, Copy, CheckCheck, Banknote, Smartphone
} from 'lucide-react';
import { FaWhatsapp, FaFacebookF, FaInstagram, FaTiktok, FaSnapchatGhost, FaYoutube } from 'react-icons/fa';
import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { parseCurrency } from '@/lib/currency';
import ASNFooter from '@/components/menu/ASNFooter';
import CheckoutModal from '@/components/menu/CheckoutModal';
import SharedMarquee from '@/components/menu/SharedMarquee';
import { 
    fetchActivePromotions, 
    evaluatePromotions, 
    hasPromoCodeOffers, 
    requiresPromoCode, 
    isAllItemsPromotion,
    AppliedPromotion, 
    Promotion,
    CartItemForPromo 
} from '@/lib/helpers/promotionEngine';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

// ================= TYPES =================
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
    old_price?: number;
    extras?: { id?: number | string; name_ar: string; name_en?: string; price: number }[];
    is_available?: boolean;
    is_popular?: boolean;
    is_spicy?: boolean;
    is_new?: boolean;
    calories?: number | string;
    sku?: string;
    tags?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

export interface CategoryWithItemsType {
    id: string | number;
    name_ar: string;
    name_en?: string;
    emoji?: string;
    items?: MenuItem[];
    image_url?: string;
    image?: string;
    thumbnail_url?: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export type CartItemType = {
    id: string; // composite key
    item: MenuItem;
    catName: string;
    price: number;
    sizeLabel: string;
    quantity: number;
    notes: string;
    extras: { name: string; price: number; qty: number }[];
};

interface Theme29MenuProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any;
    categories: CategoryWithItemsType[];
    restaurantId: string;
    language?: string;
}

// ================= COLOR PRESETS =================
const PRESET_COLORS: Record<string, { primary: string; secondary: string; lightBg: string }> = {
    default: { primary: '#008060', secondary: '#004c3f', lightBg: '#f0fdf4' }, // Shopify Classic Emerald
    emerald: { primary: '#059669', secondary: '#047857', lightBg: '#ecfdf5' },
    dark:    { primary: '#18181b', secondary: '#27272a', lightBg: '#f4f4f5' },
    blue:    { primary: '#2563eb', secondary: '#1d4ed8', lightBg: '#eff6ff' },
    red:     { primary: '#e11d48', secondary: '#be123c', lightBg: '#fff1f2' },
    purple:  { primary: '#7c3aed', secondary: '#6d28d9', lightBg: '#f5f3ff' },
    amber:   { primary: '#d97706', secondary: '#b45309', lightBg: '#fffbeb' },
};

// ================= ITEM DISCOUNT HELPERS =================
export const getItemOldPrice = (item: MenuItem, sizeIdx: number = 0): number => {
    if (item.old_prices && typeof item.old_prices[sizeIdx] === 'number' && item.old_prices[sizeIdx] > 0) {
        return item.old_prices[sizeIdx];
    }
    if (item.old_price && typeof item.old_price === 'number' && item.old_price > 0 && sizeIdx === 0) {
        return item.old_price;
    }
    const label = item.size_labels?.[sizeIdx];
    if (label && typeof label === 'string' && label.includes('::')) {
        const parsed = parseFloat(label.split('::')[1]);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
};

export const hasItemDiscount = (item: MenuItem, sizeIdx: number = 0): boolean => {
    const oldP = getItemOldPrice(item, sizeIdx);
    const currP = item.prices?.[sizeIdx] || 0;
    return oldP > currP && currP > 0;
};

export default function Theme29Menu({ config, categories = [], restaurantId, language: initialLanguage }: Theme29MenuProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (config?.default_theme_mode && config.default_theme_mode !== 'system') {
            setTheme(config.default_theme_mode);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Language
    const [currentLang, setCurrentLang] = useState<'ar' | 'en'>(() => {
        if (initialLanguage === 'en' || initialLanguage === 'ar') return initialLanguage;
        return config?.default_language === 'en' ? 'en' : 'ar';
    });
    const isAr = currentLang === 'ar';
    const isDark = mounted && theme === 'dark';
    const cur = parseCurrency(config?.currency, isAr);

    // Color resolution
    const themeSuffix = config?.theme?.split('-')[1] || 'default';
    const preset = PRESET_COLORS[themeSuffix] || PRESET_COLORS.default;
    const primaryColor = config?.theme_colors?.primary || preset.primary;
    const secondaryColor = config?.theme_colors?.secondary || preset.secondary;

    // Theme backgrounds & surfaces
    const bgBody = isDark ? '#09090b' : '#f8fafc';
    const bgCard = isDark ? '#141417' : '#ffffff';
    const textMain = isDark ? '#f8fafc' : '#0f172a';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? '#27272a' : '#e2e8f0';

    // State: Search & Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterOfferOnly, setFilterOfferOnly] = useState(false);
    const [filterPopularOnly, setFilterPopularOnly] = useState(false);
    const [filterInStockOnly, setFilterInStockOnly] = useState(false);
    const [filterSpicyOnly, setFilterSpicyOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'popular' | 'name'>('default');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    // Refs for Category Tabs and Auto-Scroll (ScrollSpy)
    const categoryTabsRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const isManualScroll = useRef(false);
    const manualScrollTimer = useRef<any>(null);

    // State: Cart
    const [cart, setCart] = useState<CartItemType[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [orderType, setOrderType] = useState<'delivery' | 'takeaway' | 'dinein'>('delivery');
    const [tableNumber, setTableNumber] = useState('');
    const [cartNotes, setCartNotes] = useState('');
    const [selectedBranch, setSelectedBranch] = useState(config?.branches?.[0] || '');

    // State: Promotions & Coupons
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
    const [promoCodeError, setPromoCodeError] = useState('');

    // Fetch active promotions on load
    useEffect(() => {
        if (!restaurantId) return;
        let isMounted = true;
        (async () => {
            try {
                const activePromos = await fetchActivePromotions(restaurantId);
                if (isMounted) setPromotions(activePromos);
            } catch (err) {
                console.error('Error fetching promotions in Theme 29:', err);
            }
        })();
        return () => { isMounted = false; };
    }, [restaurantId]);

    // State: Wishlist
    const [wishlist, setWishlist] = useState<(string | number)[]>([]);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);

    // State: Product Selection / Customization Modal (المعاينة واختيار المقاسات والملاحظات)
    const [quickViewItem, setQuickViewItem] = useState<{ item: MenuItem; catName: string } | null>(null);
    const [modalSizeIdx, setModalSizeIdx] = useState(0);
    const [modalQty, setModalQty] = useState(1);
    const [modalNotes, setModalNotes] = useState('');
    const [modalSelectedExtras, setModalSelectedExtras] = useState<{ name: string; price: number; qty: number }[]>([]);

    // State: Info Modal (Contact & Working Hours)
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    // State: Payment Methods Modal
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

    // Load wishlist from local storage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`t29_wishlist_${restaurantId}`);
            if (saved) setWishlist(JSON.parse(saved));
        } catch {
            // ignore
        }
    }, [restaurantId]);

    const toggleWishlist = (id: string | number) => {
        setWishlist(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            try {
                localStorage.setItem(`t29_wishlist_${restaurantId}`, JSON.stringify(next));
            } catch {
                // ignore
            }
            return next;
        });
    };

    // Helpers: Bilingual text
    const itemName = (item: MenuItem) => isAr ? item.title_ar : (item.title_en || item.title_ar);
    const itemDesc = (item: MenuItem) => isAr ? (item.desc_ar || item.description_ar || '') : (item.desc_en || item.description_en || item.desc_ar || item.description_ar || '');
    const catName = (cat: CategoryWithItemsType) => isAr ? cat.name_ar : (cat.name_en || cat.name_ar);

    // Check if item is included in any active promotion
    const getItemActivePromotions = (itemId: string | number): Promotion[] => {
        return promotions.filter(p => {
            if (isAllItemsPromotion(p)) return true;
            return (p.required_items || []).some(ri => String(ri.item_id) === String(itemId));
        });
    };

    // Phones list
    const phoneList: { label: string; number: string }[] = useMemo(() => {
        const list: { label: string; number: string }[] = [];
        if (Array.isArray(config?.phone_numbers) && config.phone_numbers.length > 0) {
            config.phone_numbers.forEach((p: any, idx: number) => {
                if (typeof p === 'object' && p?.number) {
                    list.push({
                        label: p.label || (isAr ? `رقم التواصل ${idx + 1}` : `Contact ${idx + 1}`),
                        number: String(p.number).trim()
                    });
                } else if (typeof p === 'string' && p.trim()) {
                    list.push({
                        label: isAr ? `رقم التواصل ${idx + 1}` : `Contact ${idx + 1}`,
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
                        label: isAr ? (parts.length > 1 ? `رقم التواصل ${list.length + 1}` : 'رقم الطلبات') : 'Contact Number',
                        number: num
                    });
                }
            });
        }
        return list;
    }, [config, isAr]);

    // Flatten all items
    const allItems = useMemo(() => {
        return categories.flatMap(c => (c.items || []).map(i => ({ ...i, catName: catName(c), catId: c.id })));
    }, [categories, isAr]);

    // Calculate item count per category
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: allItems.length };
        categories.forEach(c => {
            counts[String(c.id)] = (c.items || []).length;
        });
        return counts;
    }, [categories, allItems]);

    // Filter & sort logic (Renders all categories so sections can be scrolled smoothly)
    const filteredCategories = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return categories.map(cat => {
            let items = (cat.items || []).filter(item => {
                // Search query
                if (query) {
                    const matchTitle = itemName(item).toLowerCase().includes(query);
                    const matchDesc = itemDesc(item).toLowerCase().includes(query);
                    const matchIngredients = (item.ingredients_ar || item.ingredients_en || item.ingredients || '').toLowerCase().includes(query);
                    if (!matchTitle && !matchDesc && !matchIngredients) return false;
                }
                // Offer filter (item has discount or is in an active promotion)
                if (filterOfferOnly) {
                    const hasItemDisc = hasItemDiscount(item, 0);
                    const inPromo = getItemActivePromotions(item.id).length > 0;
                    if (!hasItemDisc && !inPromo) return false;
                }
                // Popular filter
                if (filterPopularOnly && !item.is_popular) return false;
                // In stock filter
                if (filterInStockOnly && item.is_available === false) return false;
                // Spicy filter
                if (filterSpicyOnly && !item.is_spicy) return false;

                return true;
            });

            // Sorting
            if (sortBy === 'price-asc') {
                items = [...items].sort((a, b) => (a.prices?.[0] || 0) - (b.prices?.[0] || 0));
            } else if (sortBy === 'price-desc') {
                items = [...items].sort((a, b) => (b.prices?.[0] || 0) - (a.prices?.[0] || 0));
            } else if (sortBy === 'popular') {
                items = [...items].sort((a, b) => (b.is_popular ? 1 : 0) - (a.is_popular ? 1 : 0));
            } else if (sortBy === 'name') {
                items = [...items].sort((a, b) => itemName(a).localeCompare(itemName(b)));
            }

            return { ...cat, items };
        }).filter(cat => (cat.items && cat.items.length > 0));
    }, [categories, searchQuery, filterOfferOnly, filterPopularOnly, filterInStockOnly, filterSpicyOnly, sortBy, promotions, isAr]);

    // Sort Options
    const sortOptions = useMemo(() => [
        { value: 'default', label: isAr ? 'الترتيب: الافتراضي' : 'Sort: Default' },
        { value: 'popular', label: isAr ? 'الأعلى شعبية' : 'Most Popular' },
        { value: 'price-asc', label: isAr ? 'السعر: من الأقل للأعلى' : 'Price: Low to High' },
        { value: 'price-desc', label: isAr ? 'السعر: من الأعلى للأقل' : 'Price: High to Low' },
        { value: 'name', label: isAr ? 'أبجدياً (A-Z)' : 'Name (A-Z)' },
    ], [isAr]);

    const currentSortLabel = sortOptions.find(o => o.value === sortBy)?.label || sortOptions[0].label;

    // Close sort dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
        };
        if (isSortOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isSortOpen]);

    // Smooth scroll to category section
    const scrollToCategory = (catId: string) => {
        setActiveCategory(catId);
        isManualScroll.current = true;
        if (manualScrollTimer.current) clearTimeout(manualScrollTimer.current);
        manualScrollTimer.current = setTimeout(() => {
            isManualScroll.current = false;
        }, 900);

        if (catId === 'all') {
            const topEl = document.getElementById('menu-main-content');
            if (topEl) {
                const y = topEl.getBoundingClientRect().top + window.pageYOffset - 65;
                window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
            }
        } else {
            const target = document.getElementById(`cat-section-${catId}`);
            if (target) {
                const y = target.getBoundingClientRect().top + window.pageYOffset - 65;
                window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
            }
        }
    };

    // Auto-scroll horizontal category bar to center active category tab
    useEffect(() => {
        const activeBtn = tabRefs.current[activeCategory];
        if (activeBtn && categoryTabsRef.current) {
            activeBtn.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [activeCategory]);

    // ScrollSpy: Track visible section and highlight/scroll category tab
    useEffect(() => {
        const handleScroll = () => {
            if (isManualScroll.current) return;

            const mainContent = document.getElementById('menu-main-content');
            if (!mainContent) return;

            const mainRect = mainContent.getBoundingClientRect();
            // If scrolled above main product content (hero / banners area), set active to 'all'
            if (mainRect.top > 120) {
                setActiveCategory('all');
                return;
            }

            const renderedSections = filteredCategories
                .map(cat => ({
                    id: String(cat.id),
                    el: document.getElementById(`cat-section-${cat.id}`)
                }))
                .filter((s): s is { id: string; el: HTMLElement } => s.el !== null);

            if (renderedSections.length === 0) return;

            let currentActive = renderedSections[0].id;
            for (const sec of renderedSections) {
                const rect = sec.el.getBoundingClientRect();
                // 100px accounts for sticky category bar height
                if (rect.top <= 100) {
                    currentActive = sec.id;
                } else {
                    break;
                }
            }

            setActiveCategory(currentActive);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [filteredCategories]);

    // Cart calculations
    const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
    const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    // Prepare cart items for promotion evaluation
    const cartForPromo: CartItemForPromo[] = useMemo(() => {
        return cart.map(line => ({
            id: String(line.item.id),
            title: itemName(line.item),
            qty: line.quantity,
            price: line.price
        }));
    }, [cart, isAr]);

    // Best applicable promotion (either automatic or unlocked by applied coupon code)
    const activeAppliedPromo: AppliedPromotion | null = useMemo(() => {
        if (promotions.length === 0 || cart.length === 0) return null;
        return evaluatePromotions(
            cartForPromo,
            promotions,
            cartTotal,
            0,
            appliedPromoCode
        );
    }, [cartForPromo, promotions, cartTotal, appliedPromoCode]);

    const promoDiscountAmount = activeAppliedPromo?.discountAmount || 0;
    const isFreeShippingApplied = activeAppliedPromo?.freeShipping || false;
    const finalDiscountedTotal = Math.max(0, cartTotal - promoDiscountAmount);

    // Free shipping threshold simulation (or from free_shipping promo)
    const freeShippingThreshold = 250;
    const progressToFreeShipping = isFreeShippingApplied 
        ? 100 
        : Math.min(100, Math.round((cartTotal / freeShippingThreshold) * 100));
    const amountNeededForFreeShipping = isFreeShippingApplied 
        ? 0 
        : Math.max(0, freeShippingThreshold - cartTotal);

    // Apply Coupon Code
    const handleApplyPromoCode = () => {
        const code = promoCodeInput.trim();
        if (!code) return;

        const match = evaluatePromotions(
            cartForPromo,
            promotions.filter(requiresPromoCode),
            cartTotal,
            0,
            code
        );

        if (match) {
            setAppliedPromoCode(code);
            setPromoCodeError('');
            if (navigator.vibrate) navigator.vibrate(25);
        } else {
            const codeExists = promotions.some(p => p.promo_code && p.promo_code.trim().toLowerCase() === code.toLowerCase());
            if (codeExists) {
                setPromoCodeError(isAr ? 'كود الخصم متاح لكن لا تنطبق شروطه على محتويات السلة أو الحد الأدنى' : 'Code valid but does not meet requirements or minimum order');
            } else {
                setPromoCodeError(isAr ? 'كود الخصم غير صحيح أو غير متاح' : 'Invalid or expired coupon code');
            }
        }
    };

    const handleRemovePromoCode = () => {
        setAppliedPromoCode(null);
        setPromoCodeInput('');
        setPromoCodeError('');
    };

    // Open Product Selection / Customization Modal (The primary logical way to choose an item)
    const openQuickView = (item: MenuItem, cName: string) => {
        if (config?.orders_enabled === false || item.is_available === false) return;
        setQuickViewItem({ item, catName: cName });
        setModalSizeIdx(0);
        setModalQty(1);
        setModalNotes('');
        setModalSelectedExtras([]);
        document.body.style.overflow = 'hidden';
    };

    const closeQuickView = () => {
        setQuickViewItem(null);
        document.body.style.overflow = 'auto';
    };

    // Add to cart from the selection modal
    const handleAddFromModal = () => {
        if (!quickViewItem || config?.orders_enabled === false) return;
        const { item, catName: cName } = quickViewItem;
        const basePrice = item.prices?.[modalSizeIdx] || 0;
        const extrasSum = modalSelectedExtras.reduce((sum, e) => sum + (e.price * e.qty), 0);
        const finalUnitPrice = basePrice + extrasSum;
        const rawLabel = item.size_labels?.[modalSizeIdx] || (isAr ? 'عادي' : 'Regular');
        const sizeLabel = rawLabel.includes('::') ? rawLabel.split('::')[0] : rawLabel;

        const extrasKey = modalSelectedExtras.map(e => `${e.name}_${e.qty}`).sort().join(';');
        const cartId = `${item.id}-${modalSizeIdx}-${extrasKey}-${modalNotes.trim()}`;

        setCart(prev => {
            const ex = prev.find(c => c.id === cartId);
            if (ex) {
                return prev.map(c => c.id === cartId ? { ...c, quantity: c.quantity + modalQty } : c);
            }
            return [...prev, {
                id: cartId,
                item,
                catName: cName,
                price: finalUnitPrice,
                sizeLabel,
                quantity: modalQty,
                notes: modalNotes.trim(),
                extras: modalSelectedExtras
            }];
        });

        closeQuickView();
        if (navigator.vibrate) navigator.vibrate(30);
    };

    // Quantity check in cart
    const getItemCartQty = (itemId: string | number) => {
        return cart.filter(c => c.item.id === itemId).reduce((acc, curr) => acc + curr.quantity, 0);
    };

    const updateCartLineQty = (cartId: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id === cartId) {
                const nextQty = c.quantity + delta;
                return { ...c, quantity: nextQty };
            }
            return c;
        }).filter(c => c.quantity > 0));
        if (navigator.vibrate) navigator.vibrate(15);
    };

    const removeCartLine = (cartId: string) => {
        setCart(prev => prev.filter(c => c.id !== cartId));
    };

    // Copy to clipboard helper
    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedAccount(id);
        setTimeout(() => setCopiedAccount(null), 2500);
    };

    // WhatsApp Direct 1-Click Order Formatter
    const handleWhatsAppOrder = () => {
        const rawPhone = config?.whatsapp_number || config?.phone || '';
        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (!cleanPhone) {
            alert(isAr ? 'رقم الواتساب غير محدد في إعدادات المتجر.' : 'WhatsApp number is not configured.');
            return;
        }
        if (cleanPhone.length === 11 && cleanPhone.startsWith('01')) {
            cleanPhone = '20' + cleanPhone.slice(1);
        }

        const lines: string[] = [];
        lines.push(`🛍️ *طلب جديد من متجر ${config?.name || 'Shopify Store'}*`);
        lines.push(`━━━━━━━━━━━━━━━━━━━━`);
        
        // Order Info
        const orderTypeText = orderType === 'delivery' 
            ? (isAr ? '🛵 توصيل للمنزل' : '🛵 Home Delivery')
            : orderType === 'takeaway'
            ? (isAr ? '🏬 استلام من الفرع' : '🏬 Takeaway / Pickup')
            : (isAr ? `🍽️ تناول في المطعم / الصالة (طاولة: ${tableNumber || 'غير محدد'})` : `🍽️ Dine-in (Table: ${tableNumber || 'N/A'})`);
        
        lines.push(`📍 *نوع الطلب:* ${orderTypeText}`);
        if (selectedBranch) {
            lines.push(`🏢 *الفرع:* ${selectedBranch}`);
        }
        lines.push(`━━━━━━━━━━━━━━━━━━━━`);
        lines.push(isAr ? `📦 *تفاصيل المنتجات:*` : `📦 *Order Items:*`);

        cart.forEach((c, idx) => {
            const itemTitle = itemName(c.item);
            lines.push(`\n*${idx + 1}. ${itemTitle}*`);
            if (c.sizeLabel && c.sizeLabel !== (isAr ? 'عادي' : 'Regular')) {
                lines.push(`   ▫️ ${isAr ? 'الحجم/المقاس' : 'Size'}: ${c.sizeLabel}`);
            }
            if (c.extras && c.extras.length > 0) {
                const extrasText = c.extras.map(e => `${e.name} (${e.qty > 1 ? e.qty + 'x ' : ''}+${e.price * e.qty} ${cur})`).join(', ');
                lines.push(`   ▫️ ${isAr ? 'إضافات' : 'Extras'}: ${extrasText}`);
            }
            if (c.notes) {
                lines.push(`   ▫️ ${isAr ? 'ملاحظة' : 'Note'}: ${c.notes}`);
            }
            lines.push(`   ▫️ ${isAr ? 'الكمية' : 'Qty'}: ${c.quantity} × ${c.price} ${cur} = *${c.quantity * c.price} ${cur}*`);
        });

        lines.push(`\n━━━━━━━━━━━━━━━━━━━━`);
        if (cartNotes.trim()) {
            lines.push(`📝 *${isAr ? 'ملاحظات الطلب العامة' : 'General Notes'}:* ${cartNotes.trim()}`);
        }
        lines.push(`💰 *${isAr ? 'المجموع الفرعي' : 'Subtotal'}:* ${cartTotal} ${cur}`);

        // If a promotion or coupon is applied
        if (activeAppliedPromo && promoDiscountAmount > 0) {
            const promoName = isAr ? activeAppliedPromo.promotion.name_ar : (activeAppliedPromo.promotion.name_en || activeAppliedPromo.promotion.name_ar);
            lines.push(`🎉 *${isAr ? 'الخصم المطبق' : 'Discount Applied'}:* -${promoDiscountAmount} ${cur} (${promoName}${appliedPromoCode ? ' | كود: ' + appliedPromoCode : ''})`);
        }
        if (isFreeShippingApplied) {
            lines.push(`🚚 *${isAr ? 'الشحن والتوصيل' : 'Shipping'}:* ${isAr ? 'مجاني (عرض ترويجي)' : 'FREE'}`);
        }
        lines.push(`✨ *${isAr ? 'الإجمالي النهائي المطلوب' : 'Final Total'}:* *${finalDiscountedTotal} ${cur}*`);
        lines.push(`━━━━━━━━━━━━━━━━━━━━`);
        lines.push(isAr ? `شكراً لاختياركم متجرنا! ✨` : `Thank you for shopping with us! ✨`);

        const message = encodeURIComponent(lines.join('\n'));
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    // Share link
    const handleShare = async () => {
        const shareData = {
            title: config?.name || 'Store',
            text: isAr ? `تسوق الآن من ${config?.name || 'متجرنا'}` : `Shop now at ${config?.name || 'our store'}`,
            url: window.location.href,
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {
                // ignore
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert(isAr ? 'تم نسخ الرابط!' : 'Link copied to clipboard!');
        }
    };

    // Find best promotion highlight for top bar
    const promoHighlightText = useMemo(() => {
        if (promotions.length === 0) return null;
        const coded = promotions.find(p => p.promo_code);
        if (coded) {
            const val = coded.discount_type === 'percentage' ? `${coded.discount_value}%` : `${coded.discount_value} ${cur}`;
            return isAr 
                ? `🏷️ كود الخصم: ${coded.promo_code} | احصل على خصم ${val}!`
                : `🏷️ Promo Code: ${coded.promo_code} | Get ${val} OFF!`;
        }
        const auto = promotions[0];
        if (auto) {
            return `🎉 ${isAr ? auto.name_ar : (auto.name_en || auto.name_ar)}`;
        }
        return null;
    }, [promotions, isAr, cur]);

    if (!mounted) return <div className="min-h-screen" style={{ backgroundColor: bgBody }} />;

    return (
        <div 
            className="min-h-screen font-cairo antialiased transition-colors duration-200" 
            style={{ backgroundColor: bgBody, color: textMain }} 
            dir={isAr ? 'rtl' : 'ltr'}
        >
            {/* 1. TOP ANNOUNCEMENT BAR (Shopify Style with Promotions Support) */}
            <div 
                className="py-2 px-4 text-xs font-medium text-white flex items-center justify-between shadow-sm relative z-30"
                style={{ backgroundColor: primaryColor }}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <Sparkles className="w-4 h-4 shrink-0 animate-pulse text-yellow-300" />
                    {config?.marquee_enabled ? (
                        <div className="flex-1 overflow-hidden">
                            <SharedMarquee text={isAr ? (config?.marquee_text_ar || 'أهلاً بكم في متجرنا! تسوقوا أفضل المنتجات والعروض الحصرية') : (config?.marquee_text_en || 'Welcome to our store! Shop exclusive deals and offers')} />
                        </div>
                    ) : promoHighlightText ? (
                        <p className="truncate font-bold tracking-wide">
                            {promoHighlightText}
                        </p>
                    ) : (
                        <p className="truncate">
                            {isAr 
                                ? `🚀 شحن مجاني للطلبات فوق ${freeShippingThreshold} ${cur} | جودة وضمان عالمي` 
                                : `🚀 Free shipping on orders over ${freeShippingThreshold} ${cur} | Guaranteed Quality`}
                        </p>
                    )}
                </div>

                {/* Quick Controls: Lang & Mode */}
                <div className="flex items-center gap-3 shrink-0 ps-3">
                    <button 
                        onClick={() => setCurrentLang(isAr ? 'en' : 'ar')}
                        className="flex items-center gap-1 opacity-90 hover:opacity-100 transition-opacity bg-white/10 px-2 py-0.5 rounded-full"
                        title={isAr ? 'English' : 'عربي'}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span className="font-semibold text-[11px]">{isAr ? 'EN' : 'عربي'}</span>
                    </button>
                    <button 
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className="opacity-90 hover:opacity-100 transition-opacity p-1 bg-white/10 rounded-full"
                        title={isDark ? 'Light Mode' : 'Dark Mode'}
                    >
                        {isDark ? <Sun className="w-3.5 h-3.5 text-yellow-300" /> : <Moon className="w-3.5 h-3.5 text-white" />}
                    </button>
                </div>
            </div>

            {/* 2. MAIN STORE HEADER (Shopify Navbar) */}
            <header 
                className="relative z-10 border-b transition-colors"
                style={{ 
                    backgroundColor: isDark ? '#141417' : '#ffffff',
                    borderColor: borderColor 
                }}
            >
                <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-3">
                        {/* Store Brand / Logo */}
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { scrollToCategory('all'); setSearchQuery(''); }}>
                            {config?.logo_url ? (
                                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shadow-md border-2 border-white/20 shrink-0 relative bg-white">
                                    <OptimizedMenuImage 
                                        src={config.logo_url} 
                                        alt={config.name || 'Store Logo'} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div 
                                    className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-md text-lg shrink-0"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {config?.name ? config.name.slice(0, 2).toUpperCase() : 'SN'}
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="font-black text-base sm:text-xl tracking-tight leading-tight line-clamp-1">
                                        {config?.name || 'Shopify Store'}
                                    </h1>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3 me-0.5" />
                                        {isAr ? 'موثق' : 'Verified'}
                                    </span>
                                </div>
                                {(config?.slogan_ar || config?.slogan_en) && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5" style={{ color: textMuted }}>
                                        {isAr ? config.slogan_ar : (config.slogan_en || config.slogan_ar)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Header Action Buttons */}
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                            {/* Clear Store Profile & Hours Button (Replaces the obscure exclamation mark) */}
                            <button
                                onClick={() => setIsInfoModalOpen(true)}
                                className="px-2.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                style={{ borderColor: borderColor, backgroundColor: isDark ? '#1e1e24' : '#f1f5f9' }}
                                title={isAr ? 'بيانات ومواعيد العمل' : 'Store Info & Hours'}
                            >
                                <Store className="w-4 h-4 text-emerald-500" />
                                <span className="hidden lg:inline">{isAr ? 'بيانات ومواعيد المتجر' : 'Store & Hours'}</span>
                                <span className="inline lg:hidden text-[11px]">{isAr ? 'عن المكان' : 'Info'}</span>
                            </button>

                            {/* Payment Methods Button */}
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="px-2.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                style={{ borderColor: borderColor, backgroundColor: isDark ? '#1e1e24' : '#f1f5f9' }}
                                title={isAr ? 'طرق ووسائل الدفع' : 'Payment Methods'}
                            >
                                <CreditCard className="w-4 h-4 text-amber-500" />
                                <span className="hidden sm:inline">{isAr ? 'طرق الدفع' : 'Payments'}</span>
                            </button>

                            {/* Share Button */}
                            <button
                                onClick={handleShare}
                                className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                                style={{ borderColor: borderColor, backgroundColor: isDark ? '#1e1e24' : '#f1f5f9' }}
                                title={isAr ? 'مشاركة المتجر' : 'Share'}
                            >
                                <Share2 className="w-4 h-4 text-blue-500" />
                            </button>

                            {/* Wishlist Button */}
                            <button
                                onClick={() => setIsWishlistOpen(true)}
                                className="relative p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                                style={{ borderColor: borderColor, backgroundColor: isDark ? '#1e1e24' : '#f1f5f9' }}
                                title={isAr ? 'المفضلة' : 'Wishlist'}
                            >
                                <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
                                {wishlist.length > 0 && (
                                    <span className="absolute -top-1.5 -end-1.5 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-bounce">
                                        {wishlist.length}
                                    </span>
                                )}
                            </button>

                            {/* Cart Drawer Trigger Button (Shopify Style Pill) */}
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-bold text-white shadow-lg shadow-emerald-900/10 transition-all hover:opacity-95 active:scale-95"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <div className="relative">
                                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-2 -end-2.5 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                            {cartCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col text-start">
                                    <span className="text-[10px] uppercase tracking-wider opacity-80 leading-none">
                                        {isAr ? 'السلة' : 'Cart'}
                                    </span>
                                    <span className="text-xs sm:text-sm font-extrabold leading-tight">
                                        {finalDiscountedTotal} {cur}
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Integrated Search Bar */}
                    <div className="mt-3 relative">
                        <div className="relative flex items-center">
                            <Search className="w-4 h-4 absolute start-3 text-slate-400 pointer-events-none" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isAr ? 'ابحث عن أي منتج، صنف، وجبة، أو مكونات...' : 'Search products, meals, ingredients...'}
                                className="w-full ps-10 pe-10 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all shadow-inner"
                                style={{ 
                                    backgroundColor: isDark ? '#141417' : '#ffffff',
                                    borderColor: borderColor,
                                    color: textMain,
                                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                    // @ts-ignore
                                    '--tw-ring-color': primaryColor
                                }}
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute end-3 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* 3. HERO PROMOTIONAL BANNER & TRUST BADGES */}
            <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
                {/* Active Promotions Alert Banner (Shopify Style) */}
                {promotions.length > 0 && (
                    <div className="mb-3 p-3 rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-rose-500/10 flex items-center justify-between gap-3 shadow-sm" style={{ borderColor: borderColor }}>
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="p-2 rounded-xl text-white shrink-0 shadow-sm" style={{ backgroundColor: primaryColor }}>
                                <Gift className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="font-extrabold text-xs block leading-tight">
                                    {isAr ? 'عروض وتخفيضات نشطة الآن! 🎁' : 'Active Promotions & Deals! 🎁'}
                                </span>
                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" style={{ color: textMuted }}>
                                    {promotions.map(p => {
                                        const title = isAr ? p.name_ar : (p.name_en || p.name_ar);
                                        const codePart = p.promo_code ? ` [كود: ${p.promo_code}]` : '';
                                        return `${title}${codePart}`;
                                    }).join(' • ')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm shrink-0 whitespace-nowrap"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isAr ? 'استفد من العرض' : 'Claim Offer'}
                        </button>
                    </div>
                )}

                {/* Cover Carousel (if available) */}
                {config?.cover_images && config.cover_images.length > 0 ? (
                    <div className="rounded-2xl overflow-hidden shadow-lg mb-4 border" style={{ borderColor: borderColor }}>
                        <Swiper
                            modules={[Autoplay, Pagination]}
                            autoplay={{ delay: 4500, disableOnInteraction: false }}
                            pagination={{ clickable: true }}
                            loop={config.cover_images.length > 1}
                            className="w-full h-44 sm:h-64 md:h-80"
                        >
                            {config.cover_images.map((img: string, idx: number) => (
                                <SwiperSlide key={idx} className="relative w-full h-full bg-slate-900">
                                    <OptimizedMenuImage 
                                        src={img} 
                                        alt={`Banner ${idx + 1}`} 
                                        className="w-full h-full object-cover"
                                        priority={idx === 0}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                                        <span className="inline-block self-start px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1" style={{ backgroundColor: primaryColor }}>
                                            {isAr ? 'عروض حصرية ✨' : 'Special Offers ✨'}
                                        </span>
                                        <h2 className="text-lg sm:text-2xl font-black drop-shadow-md">
                                            {config?.name || 'Welcome to our store'}
                                        </h2>
                                        <p className="text-xs sm:text-sm text-slate-200 drop-shadow line-clamp-1 mt-0.5">
                                            {isAr ? (config?.slogan_ar || 'اكتشف أرقى التشكيلات وأشهى المأكولات بأفضل الأسعار') : (config?.slogan_en || 'Discover premium goods and delicacies at the best prices')}
                                        </p>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                ) : config?.cover_url ? (
                    <div className="relative w-full h-36 sm:h-56 rounded-2xl overflow-hidden shadow-md mb-4 border" style={{ borderColor: borderColor }}>
                        <OptimizedMenuImage 
                            src={config.cover_url} 
                            alt="Cover" 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                            <h2 className="text-lg sm:text-2xl font-black">{config?.name}</h2>
                        </div>
                    </div>
                ) : null}

                {/* Shopify Trust Badges Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 py-2">
                    <div className="flex items-center gap-2.5 p-3 rounded-xl border transition-all" style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                            <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold leading-tight">{isAr ? 'شحن سريع ومضمون' : 'Fast Delivery'}</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5" style={{ color: textMuted }}>{isAr ? 'توصيل لباب منزلك' : 'Right to your door'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-3 rounded-xl border transition-all" style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold leading-tight">{isAr ? 'جودة وضمان 100%' : '100% Guaranteed'}</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5" style={{ color: textMuted }}>{isAr ? 'أعلى معايير الدقة' : 'Top quality standards'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-3 rounded-xl border transition-all" style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold leading-tight">{isAr ? 'دفع عند الاستلام' : 'Cash on Delivery'}</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5" style={{ color: textMuted }}>{isAr ? 'كاش أو إلكتروني' : 'Cash or digital'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-3 rounded-xl border transition-all" style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
                            <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold leading-tight">{isAr ? 'دعم فني مباشر' : 'Live Support'}</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5" style={{ color: textMuted }}>{isAr ? 'خدمة سريعة بالواتساب' : 'Instant WhatsApp'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. STICKY CATEGORY NAVIGATION (Shopify Filter Tabs - Sticks at Top and Tracks Sections) */}
            <div 
                className="sticky top-0 z-30 backdrop-blur-md border-b py-2.5 transition-colors shadow-sm"
                style={{ 
                    backgroundColor: isDark ? 'rgba(15, 15, 18, 0.95)' : 'rgba(255, 255, 255, 0.96)',
                    borderColor: borderColor 
                }}
            >
                <div className="max-w-7xl mx-auto px-4">
                    <div ref={categoryTabsRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth">
                        {/* All Categories Pill */}
                        <button
                            ref={el => { tabRefs.current['all'] = el; }}
                            onClick={() => scrollToCategory('all')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 shadow-sm ${
                                activeCategory === 'all'
                                    ? 'text-white scale-105'
                                    : 'border hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            style={{ 
                                backgroundColor: activeCategory === 'all' ? primaryColor : (isDark ? '#18181b' : '#ffffff'),
                                borderColor: borderColor,
                                color: activeCategory === 'all' ? '#ffffff' : textMain
                            }}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isAr ? 'جميع المنتجات' : 'All Products'}</span>
                            <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                                {categoryCounts.all || 0}
                            </span>
                        </button>

                        {/* Category List */}
                        {categories.map((cat) => {
                            const isSelected = activeCategory === String(cat.id);
                            const count = categoryCounts[String(cat.id)] || 0;
                            return (
                                <button
                                    key={cat.id}
                                    ref={el => { tabRefs.current[String(cat.id)] = el; }}
                                    onClick={() => scrollToCategory(String(cat.id))}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 shadow-sm ${
                                        isSelected
                                            ? 'text-white scale-105'
                                            : 'border hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                    style={{ 
                                        backgroundColor: isSelected ? primaryColor : (isDark ? '#18181b' : '#ffffff'),
                                        borderColor: borderColor,
                                        color: isSelected ? '#ffffff' : textMain
                                    }}
                                >
                                    {cat.image_url ? (
                                        <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/20">
                                            <OptimizedMenuImage src={cat.image_url} alt={catName(cat)} className="w-full h-full object-cover" />
                                        </div>
                                    ) : cat.emoji ? (
                                        <span className="text-sm">{cat.emoji}</span>
                                    ) : null}
                                    <span>{catName(cat)}</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isSelected ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 5. FILTER CONTROLS & VIEW MODE BAR */}
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl border text-xs" style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                    {/* Quick Filters */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-muted-foreground me-1 hidden sm:inline" style={{ color: textMuted }}>
                            <SlidersHorizontal className="w-3.5 h-3.5 inline me-1" />
                            {isAr ? 'تصفية:' : 'Filter:'}
                        </span>

                        <button
                            onClick={() => setFilterOfferOnly(!filterOfferOnly)}
                            className={`px-2.5 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1 ${
                                filterOfferOnly ? 'bg-rose-500 text-white border-rose-600 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            style={{ borderColor: filterOfferOnly ? undefined : borderColor }}
                        >
                            <Tag className="w-3 h-3" />
                            <span>{isAr ? 'عروض وتخفيضات' : 'Deals & Discounts'}</span>
                        </button>

                        <button
                            onClick={() => setFilterPopularOnly(!filterPopularOnly)}
                            className={`px-2.5 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1 ${
                                filterPopularOnly ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            style={{ borderColor: filterPopularOnly ? undefined : borderColor }}
                        >
                            <Flame className="w-3 h-3" />
                            <span>{isAr ? 'الأكثر طلباً' : 'Best Sellers'}</span>
                        </button>

                        <button
                            onClick={() => setFilterInStockOnly(!filterInStockOnly)}
                            className={`px-2.5 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1 ${
                                filterInStockOnly ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            style={{ borderColor: filterInStockOnly ? undefined : borderColor }}
                        >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isAr ? 'متوفر حالياً' : 'In Stock'}</span>
                        </button>

                        <button
                            onClick={() => setFilterSpicyOnly(!filterSpicyOnly)}
                            className={`px-2.5 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1 ${
                                filterSpicyOnly ? 'bg-red-600 text-white border-red-700 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            style={{ borderColor: filterSpicyOnly ? undefined : borderColor }}
                        >
                            <span>🌶️</span>
                            <span>{isAr ? 'حار' : 'Spicy'}</span>
                        </button>
                    </div>

                    {/* Sorting & Layout Toggles */}
                    <div className="flex items-center gap-2 ms-auto">
                        {/* Custom Sort Dropdown (Eliminates mobile browser white-screen / white-on-white text bug) */}
                        <div className="relative" ref={sortRef}>
                            <button
                                type="button"
                                onClick={() => setIsSortOpen(!isSortOpen)}
                                className="flex items-center gap-1.5 border rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all shadow-sm"
                                style={{ 
                                    backgroundColor: isDark ? '#1e1e24' : '#ffffff', 
                                    borderColor: isSortOpen ? primaryColor : borderColor, 
                                    color: textMain 
                                }}
                            >
                                <ArrowUpDown className="w-3 h-3 opacity-70" />
                                <span>{currentSortLabel}</span>
                                <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isSortOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute top-full mt-1.5 end-0 z-50 min-w-[190px] rounded-2xl shadow-2xl border p-1.5 backdrop-blur-md overflow-hidden"
                                        style={{ 
                                            backgroundColor: isDark ? '#18181b' : '#ffffff', 
                                            borderColor: borderColor,
                                            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.8)' : '0 10px 30px rgba(0,0,0,0.12)'
                                        }}
                                    >
                                        {sortOptions.map(opt => {
                                            const isSelected = sortBy === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setSortBy(opt.value as any);
                                                        setIsSortOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-start ${
                                                        isSelected 
                                                            ? 'text-white' 
                                                            : 'hover:bg-slate-100 dark:hover:bg-zinc-800'
                                                    }`}
                                                    style={{
                                                        backgroundColor: isSelected ? primaryColor : 'transparent',
                                                        color: isSelected ? '#ffffff' : textMain
                                                    }}
                                                >
                                                    <span>{opt.label}</span>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* View Mode Toggle: Grid vs List */}
                        <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: borderColor }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                style={{ backgroundColor: viewMode === 'grid' ? primaryColor : undefined }}
                                title={isAr ? 'عرض شبكي' : 'Grid View'}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                style={{ backgroundColor: viewMode === 'list' ? primaryColor : undefined }}
                                title={isAr ? 'عرض قائمة للمطاعم' : 'List View'}
                            >
                                <LayoutList className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 6. PRODUCTS & CATEGORIES LIST */}
            <main id="menu-main-content" className="max-w-7xl mx-auto px-4 py-4 min-h-[50vh] pb-32">
                {filteredCategories.length === 0 ? (
                    <div className="text-center py-20 px-4 rounded-3xl border border-dashed my-8" style={{ borderColor: borderColor, backgroundColor: bgCard }}>
                        <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                        <h3 className="text-base font-bold mb-1">
                            {isAr ? 'لم نتمكن من إيجاد أي منتجات مطابقة للبحث أو الفلتر' : 'No matching products found'}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4" style={{ color: textMuted }}>
                            {isAr ? 'جرب البحث بكلمة مختلفة أو إلغاء بعض الفلاتر' : 'Try searching with different keywords or clear filters'}
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); scrollToCategory('all'); setFilterOfferOnly(false); setFilterPopularOnly(false); setFilterInStockOnly(false); setFilterSpicyOnly(false); }}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isAr ? 'إعادة ضبط كل الفلاتر' : 'Reset All Filters'}
                        </button>
                    </div>
                ) : (
                    filteredCategories.map((cat) => (
                        <section key={cat.id} id={`cat-section-${cat.id}`} className="mb-10 scroll-mt-20">
                            {/* Category Header */}
                            <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: borderColor }}>
                                <div className="flex items-center gap-2.5">
                                    {cat.image_url ? (
                                        <div className="w-8 h-8 rounded-xl overflow-hidden border shadow-sm shrink-0">
                                            <OptimizedMenuImage src={cat.image_url} alt={catName(cat)} className="w-full h-full object-cover" />
                                        </div>
                                    ) : cat.emoji ? (
                                        <span className="text-xl">{cat.emoji}</span>
                                    ) : (
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                                    )}
                                    <h3 className="text-lg sm:text-xl font-black tracking-tight">
                                        {catName(cat)}
                                    </h3>
                                    <span className="text-xs text-muted-foreground font-medium" style={{ color: textMuted }}>
                                        ({cat.items?.length || 0})
                                    </span>
                                </div>
                            </div>

                            {/* Products Grid or List */}
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                                    {(cat.items || []).map((item) => {
                                        const title = itemName(item);
                                        const desc = itemDesc(item);
                                        const price = item.prices?.[0] || 0;
                                        const oldPrice = getItemOldPrice(item, 0);
                                        const hasDiscount = oldPrice > price && price > 0;
                                        const discountPercent = hasDiscount ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
                                        const isFav = wishlist.includes(item.id);
                                        const inCartQty = getItemCartQty(item.id);
                                        const isAvailable = item.is_available !== false;
                                        const activePromosForItem = getItemActivePromotions(item.id);
                                        const isPromotional = activePromosForItem.length > 0;

                                        return (
                                            <div 
                                                key={item.id}
                                                onClick={() => openQuickView(item, catName(cat))}
                                                className={`group flex flex-col rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden cursor-pointer ${
                                                    !isAvailable ? 'opacity-70 grayscale-[20%]' : ''
                                                }`}
                                                style={{ backgroundColor: bgCard, borderColor: borderColor }}
                                            >
                                                {/* Card Media Container */}
                                                <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                    {item.image_url || item.image ? (
                                                        <OptimizedMenuImage 
                                                            src={item.image_url || item.image}
                                                            thumbnailSrc={item.thumbnail_url}
                                                            alt={title}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                                                            <ShoppingBag className="w-10 h-10 opacity-30 mb-1" />
                                                            <span className="text-[11px] font-semibold">{config?.name || 'Store'}</span>
                                                        </div>
                                                    )}

                                                    {/* Badges on Image */}
                                                    <div className="absolute top-2 start-2 flex flex-col gap-1 z-10">
                                                        {hasDiscount && (
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white shadow-md">
                                                                {isAr ? `خصم ${discountPercent}%` : `-${discountPercent}%`}
                                                            </span>
                                                        )}
                                                        {isPromotional && (
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-600 text-white shadow-md flex items-center gap-0.5">
                                                                <Gift className="w-2.5 h-2.5" />
                                                                {isAr ? 'مشمول بالعرض' : 'Promo'}
                                                            </span>
                                                        )}
                                                        {item.is_popular && (
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white shadow-md flex items-center gap-0.5">
                                                                <Flame className="w-3 h-3" />
                                                                {isAr ? 'الأكثر طلباً' : 'Hot'}
                                                            </span>
                                                        )}
                                                        {item.is_spicy && (
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-600 text-white shadow-md">
                                                                🌶️ {isAr ? 'حار' : 'Spicy'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Out of Stock Overlay */}
                                                    {!isAvailable && (
                                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-2 z-10">
                                                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-white border border-slate-700">
                                                                {isAr ? 'نفد من المخزون' : 'Sold Out'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Wishlist Floating Button */}
                                                    <div className="absolute top-2 end-2 flex flex-col gap-1.5 z-10">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleWishlist(item.id); }}
                                                            className="p-1.5 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-md shadow-md text-slate-700 dark:text-slate-200 hover:scale-110 active:scale-95 transition-all"
                                                            title={isAr ? 'إضافة للمفضلة' : 'Wishlist'}
                                                        >
                                                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Card Content */}
                                                <div className="p-3 sm:p-4 flex flex-col flex-1">
                                                    {/* Category label */}
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block" style={{ color: textMuted }}>
                                                        {catName(cat)}
                                                    </span>

                                                    {/* Title */}
                                                    <h4 className="font-extrabold text-xs sm:text-sm tracking-tight leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                        {title}
                                                    </h4>

                                                    {/* Rating Snippet */}
                                                    <div className="flex items-center gap-1 mt-1 mb-1.5">
                                                        <div className="flex text-amber-400">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
                                                            ))}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground font-mono" style={{ color: textMuted }}>
                                                            5.0
                                                        </span>
                                                    </div>

                                                    {/* Description */}
                                                    {desc && (
                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 leading-relaxed" style={{ color: textMuted }}>
                                                            {desc}
                                                        </p>
                                                    )}

                                                    {/* Price & Discount */}
                                                    <div className="flex items-baseline justify-between gap-1.5 my-1.5">
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-sm sm:text-base font-black tracking-tight" style={{ color: primaryColor }}>
                                                                {price} {cur}
                                                            </span>
                                                            {hasDiscount && (
                                                                <span className="text-[11px] text-muted-foreground line-through font-mono opacity-70">
                                                                    {oldPrice} {cur}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {hasDiscount && (
                                                            <span className="text-[10px] font-bold text-rose-500">
                                                                {isAr ? `وفر ${(oldPrice - price).toFixed(0)} ${cur}` : `Save ${(oldPrice - price).toFixed(0)}`}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Logical Action Button: Triggers Product Selection Modal */}
                                                    <div className="mt-auto pt-2 border-t" style={{ borderColor: borderColor }}>
                                                        {config?.orders_enabled !== false && isAvailable && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openQuickView(item, catName(cat)); }}
                                                                className={`w-full py-2 px-2.5 rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all hover:opacity-95 active:scale-95 ${
                                                                    inCartQty > 0
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                                        : 'text-white'
                                                                }`}
                                                                style={{ 
                                                                    backgroundColor: inCartQty > 0 ? undefined : primaryColor 
                                                                }}
                                                            >
                                                                {inCartQty > 0 ? (
                                                                    <>
                                                                        <Check className="w-3.5 h-3.5" />
                                                                        <span>{isAr ? `تعديل / خيارات (${inCartQty})` : `Selected (${inCartQty})`}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                        <span>{isAr ? 'اختيار ومواصفات الصنف 🛒' : 'Select Options 🛒'}</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* List View (Clean Restaurant Menu View) */
                                <div className="space-y-3">
                                    {(cat.items || []).map((item) => {
                                        const title = itemName(item);
                                        const desc = itemDesc(item);
                                        const price = item.prices?.[0] || 0;
                                        const oldPrice = getItemOldPrice(item, 0);
                                        const hasDiscount = oldPrice > price && price > 0;
                                        const isFav = wishlist.includes(item.id);
                                        const inCartQty = getItemCartQty(item.id);
                                        const isAvailable = item.is_available !== false;
                                        const isPromotional = getItemActivePromotions(item.id).length > 0;

                                        return (
                                            <div 
                                                key={item.id}
                                                onClick={() => openQuickView(item, catName(cat))}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${
                                                    !isAvailable ? 'opacity-60' : ''
                                                }`}
                                                style={{ backgroundColor: bgCard, borderColor: borderColor }}
                                            >
                                                {/* Left Thumbnail */}
                                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                                    {item.image_url || item.image ? (
                                                        <OptimizedMenuImage 
                                                            src={item.image_url || item.image}
                                                            thumbnailSrc={item.thumbnail_url}
                                                            alt={title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                            <ShoppingBag className="w-6 h-6 opacity-30" />
                                                        </div>
                                                    )}
                                                    {hasDiscount && (
                                                        <span className="absolute top-1 start-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500 text-white">
                                                            {isAr ? 'خصم' : 'Sale'}
                                                        </span>
                                                    )}
                                                    {isPromotional && !hasDiscount && (
                                                        <span className="absolute top-1 start-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-600 text-white">
                                                            {isAr ? 'عرض' : 'Promo'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Middle Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className="font-bold text-xs sm:text-sm tracking-tight truncate">
                                                            {title}
                                                        </h4>
                                                        {item.is_popular && <span className="text-[10px] text-amber-500 font-bold">🔥</span>}
                                                        {item.is_spicy && <span className="text-[10px]">🌶️</span>}
                                                    </div>

                                                    {desc && (
                                                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" style={{ color: textMuted }}>
                                                            {desc}
                                                        </p>
                                                    )}

                                                    <div className="flex items-baseline gap-2 mt-1">
                                                        <span className="text-sm font-black" style={{ color: primaryColor }}>
                                                            {price} {cur}
                                                        </span>
                                                        {hasDiscount && (
                                                            <span className="text-xs text-muted-foreground line-through font-mono">
                                                                {oldPrice} {cur}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right Action: Open Selection Modal */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); toggleWishlist(item.id); }}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500"
                                                        title={isAr ? 'المفضلة' : 'Wishlist'}
                                                    >
                                                        <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                                                    </button>

                                                    {config?.orders_enabled !== false && isAvailable && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openQuickView(item, catName(cat)); }}
                                                            className={`px-3 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-95 ${
                                                                inCartQty > 0
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                                    : 'text-white'
                                                            }`}
                                                            style={{ backgroundColor: inCartQty > 0 ? undefined : primaryColor }}
                                                        >
                                                            {inCartQty > 0 ? (
                                                                <>
                                                                    <Check className="w-3.5 h-3.5" />
                                                                    <span>{isAr ? `في السلة (${inCartQty})` : `In Cart (${inCartQty})`}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                    <span>{isAr ? 'اختيار' : 'Select'}</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    ))
                )}
            </main>

            {/* 7. COMPACT FLOATING MINI-CART (سلة عائمة صغيرة وأنيقة ومدمجة) */}
            <AnimatePresence>
                {cartCount > 0 && !isCartOpen && (
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                        className="fixed bottom-4 right-4 z-40"
                    >
                        <button 
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full shadow-2xl border text-white font-bold transition-all hover:scale-105 active:scale-95 backdrop-blur-md cursor-pointer"
                            style={{ 
                                backgroundColor: primaryColor,
                                borderColor: 'rgba(255, 255, 255, 0.25)',
                                boxShadow: `0 8px 25px -4px ${primaryColor}70`
                            }}
                            title={isAr ? 'عرض سلة المشتريات' : 'View Cart'}
                        >
                            <div className="relative flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4" />
                                <span className="absolute -top-2 -end-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                                    {cartCount}
                                </span>
                            </div>

                            <span className="text-xs font-mono font-black">
                                {finalDiscountedTotal} {cur}
                            </span>

                            <div className="h-3.5 w-px bg-white/30" />

                            <span className="text-[11px] font-bold flex items-center gap-1">
                                <span>{isAr ? 'السلة' : 'Cart'}</span>
                                {isAr ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                            </span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 8. FLOATING WHATSAPP BUTTON (زر الواتساب العائم) */}
            {(config?.whatsapp_number || config?.phone) && (
                <a
                    href={`https://wa.me/${(config?.whatsapp_number || config?.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(isAr ? `مرحباً، أود الاستفسار بخصوص الطلبات في متجر ${config?.name || ''}` : `Hello, I would like to inquire about orders at ${config?.name || ''}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="fixed bottom-4 left-4 z-40 w-11 h-11 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                    title={isAr ? 'تواصل معنا مباشرة عبر واتساب' : 'Chat with us on WhatsApp'}
                >
                    <FaWhatsapp className="w-6 h-6 animate-pulse" />
                </a>
            )}

            {/* 9. SHOPIFY SLIDE-OVER CART DRAWER */}
            <AnimatePresence>
                {isCartOpen && (
                    <div className="fixed inset-0 z-50 overflow-hidden">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsCartOpen(false)}
                        />

                        {/* Slide-out Drawer Panel */}
                        <div className={`fixed inset-y-0 ${isAr ? 'left-0' : 'right-0'} max-w-full flex`}>
                            <motion.div 
                                initial={{ x: isAr ? '-100%' : '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: isAr ? '-100%' : '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                                className="w-screen max-w-md shadow-2xl flex flex-col h-full"
                                style={{ backgroundColor: bgCard, color: textMain }}
                            >
                                {/* Drawer Header */}
                                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: borderColor }}>
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5 text-emerald-500" style={{ color: primaryColor }} />
                                        <h3 className="font-black text-base">
                                            {isAr ? 'سلة المشتريات' : 'Your Shopping Cart'}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800">
                                            {cartCount}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setIsCartOpen(false)}
                                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Free Shipping Progress Bar */}
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-b text-xs" style={{ borderColor: borderColor }}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-bold flex items-center gap-1.5">
                                            <Truck className="w-3.5 h-3.5 text-emerald-500" />
                                            {progressToFreeShipping >= 100 
                                                ? (isAr ? '🎉 مبروك! لقد حصلت على شحن مجاني' : '🎉 You unlocked Free Shipping!') 
                                                : (isAr ? `أضف بـ ${amountNeededForFreeShipping} ${cur} للشحن المجاني!` : `Add ${amountNeededForFreeShipping} ${cur} for Free Shipping!`)}
                                        </span>
                                        <span className="font-mono font-bold text-[11px] text-muted-foreground">{progressToFreeShipping}%</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div 
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ 
                                                width: `${progressToFreeShipping}%`,
                                                backgroundColor: progressToFreeShipping >= 100 ? '#10b981' : primaryColor 
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Drawer Body: Cart Items */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-dashed" style={{ borderColor: borderColor }}>
                                    {cart.length === 0 ? (
                                        <div className="text-center py-20 px-4">
                                            <ShoppingBag className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                                            <h4 className="font-bold text-base mb-1">{isAr ? 'سلة المشتريات فارغة' : 'Your cart is empty'}</h4>
                                            <p className="text-xs text-muted-foreground mb-4" style={{ color: textMuted }}>
                                                {isAr ? 'تصفح المنتجات واختر ما يعجبك لإضافته للسلة' : 'Explore products and add items to your cart'}
                                            </p>
                                            <button 
                                                onClick={() => setIsCartOpen(false)}
                                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                {isAr ? 'ابدأ التسوق الآن' : 'Start Shopping'}
                                            </button>
                                        </div>
                                    ) : (
                                        cart.map((line) => {
                                            const lineItemName = itemName(line.item);
                                            const lineTotal = line.price * line.quantity;

                                            return (
                                                <div key={line.id} className="pt-3 first:pt-0 flex gap-3">
                                                    {/* Thumbnail */}
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border" style={{ borderColor: borderColor }}>
                                                        {line.item.image_url || line.item.image ? (
                                                            <OptimizedMenuImage 
                                                                src={line.item.image_url || line.item.image}
                                                                thumbnailSrc={line.item.thumbnail_url}
                                                                alt={lineItemName}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                <ShoppingBag className="w-6 h-6 opacity-30" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-1">
                                                            <h4 className="font-extrabold text-xs sm:text-sm tracking-tight leading-snug line-clamp-1">
                                                                {lineItemName}
                                                            </h4>
                                                            <button 
                                                                onClick={() => removeCartLine(line.id)}
                                                                className="text-slate-400 hover:text-rose-500 p-0.5 shrink-0"
                                                                title={isAr ? 'حذف' : 'Remove'}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {line.sizeLabel && line.sizeLabel !== (isAr ? 'عادي' : 'Regular') && (
                                                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-muted-foreground mt-0.5">
                                                                {line.sizeLabel}
                                                            </span>
                                                        )}

                                                        {line.extras && line.extras.length > 0 && (
                                                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1" style={{ color: textMuted }}>
                                                                + {line.extras.map(e => `${e.name} (${e.qty}x)`).join(', ')}
                                                            </p>
                                                        )}

                                                        {line.notes && (
                                                            <p className="text-[10px] italic text-amber-600 dark:text-amber-400 mt-0.5">
                                                                &quot;{line.notes}&quot;
                                                            </p>
                                                        )}

                                                        <div className="flex items-center justify-between gap-2 mt-2">
                                                            <div className="flex items-center gap-1.5 border rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800" style={{ borderColor: borderColor }}>
                                                                <button
                                                                    onClick={() => updateCartLineQty(line.id, -1)}
                                                                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-xs font-black min-w-[14px] text-center font-mono">
                                                                    {line.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => updateCartLineQty(line.id, 1)}
                                                                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>

                                                            <span className="font-extrabold text-xs sm:text-sm font-mono" style={{ color: primaryColor }}>
                                                                {lineTotal} {cur}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Drawer Footer: Coupon Code, Order Type & Checkout Buttons */}
                                {cart.length > 0 && (
                                    <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 space-y-3" style={{ borderColor: borderColor }}>
                                        {/* COUPON / PROMO CODE INPUT (Shopify Style) */}
                                        <div className="p-2.5 rounded-xl border bg-white dark:bg-black/50" style={{ borderColor: borderColor }}>
                                            {!appliedPromoCode ? (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Ticket className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="text-[11px] font-bold">{isAr ? 'لديك كود خصم أو كوبون؟' : 'Have a coupon code?'}</span>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <input 
                                                            type="text"
                                                            value={promoCodeInput}
                                                            onChange={(e) => setPromoCodeInput(e.target.value)}
                                                            placeholder={isAr ? 'أدخل الكود هنا...' : 'Enter promo code...'}
                                                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border uppercase tracking-wider font-mono font-bold bg-slate-50 dark:bg-slate-900"
                                                            style={{ borderColor: borderColor }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleApplyPromoCode(); }}
                                                        />
                                                        <button
                                                            onClick={handleApplyPromoCode}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm shrink-0 transition-opacity hover:opacity-90 active:scale-95"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            {isAr ? 'تطبيق' : 'Apply'}
                                                        </button>
                                                    </div>
                                                    {promoCodeError && (
                                                        <p className="text-[10px] text-rose-500 font-semibold">{promoCodeError}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                        <div>
                                                            <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                                                {isAr ? 'تم تفعيل كود الخصم:' : 'Active Code:'} <span className="font-mono">{appliedPromoCode}</span>
                                                            </span>
                                                            {activeAppliedPromo && (
                                                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                                                    {isAr ? activeAppliedPromo.promotion.name_ar : (activeAppliedPromo.promotion.name_en || activeAppliedPromo.promotion.name_ar)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={handleRemovePromoCode}
                                                        className="text-xs text-rose-500 hover:underline font-bold"
                                                    >
                                                        {isAr ? 'إلغاء' : 'Remove'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Order Type Toggle (Specialized for Goods AND Restaurants/Cafes) */}
                                        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-bold">
                                            <button
                                                onClick={() => setOrderType('delivery')}
                                                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                                                    orderType === 'delivery' ? 'bg-white dark:bg-black shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                                                }`}
                                            >
                                                <span>🛵</span>
                                                <span>{isAr ? 'توصيل' : 'Delivery'}</span>
                                            </button>
                                            <button
                                                onClick={() => setOrderType('takeaway')}
                                                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                                                    orderType === 'takeaway' ? 'bg-white dark:bg-black shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                                                }`}
                                            >
                                                <span>🏬</span>
                                                <span>{isAr ? 'استلام' : 'Pickup'}</span>
                                            </button>
                                            <button
                                                onClick={() => setOrderType('dinein')}
                                                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                                                    orderType === 'dinein' ? 'bg-white dark:bg-black shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                                                }`}
                                            >
                                                <span>🍽️</span>
                                                <span>{isAr ? 'صالة' : 'Dine-in'}</span>
                                            </button>
                                        </div>

                                        {/* If Dine-in, Table input */}
                                        {orderType === 'dinein' && (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text" 
                                                    value={tableNumber} 
                                                    onChange={(e) => setTableNumber(e.target.value)}
                                                    placeholder={isAr ? 'أدخل رقم الطاولة هنا...' : 'Enter Table #...'}
                                                    className="w-full px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-black"
                                                    style={{ borderColor: borderColor }}
                                                />
                                            </div>
                                        )}

                                        {/* Branches Selector (if available) */}
                                        {config?.branches_enabled && config?.branches && config.branches.length > 1 && (
                                            <select
                                                value={selectedBranch}
                                                onChange={(e) => setSelectedBranch(e.target.value)}
                                                className="w-full px-3 py-1.5 rounded-xl border text-xs font-medium"
                                                style={{ 
                                                    borderColor: borderColor,
                                                    backgroundColor: isDark ? '#141417' : '#ffffff',
                                                    color: textMain
                                                }}
                                            >
                                                {config.branches.map((b: string, i: number) => (
                                                    <option 
                                                        key={i} 
                                                        value={b}
                                                        style={{ 
                                                            backgroundColor: isDark ? '#18181b' : '#ffffff', 
                                                            color: isDark ? '#ffffff' : '#0f172a' 
                                                        }}
                                                    >
                                                        {isAr ? `فرع: ${b}` : `Branch: ${b}`}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {/* Order Notes */}
                                        <textarea
                                            value={cartNotes}
                                            onChange={(e) => setCartNotes(e.target.value)}
                                            placeholder={isAr ? 'ملاحظات إضافية على الطلب (العنوان بالتفصيل، مواعيد، إلخ)...' : 'Order instructions or delivery address...'}
                                            rows={2}
                                            className="w-full px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-black resize-none"
                                            style={{ borderColor: borderColor }}
                                        />

                                        {/* Totals Summary */}
                                        <div className="space-y-1 text-xs pt-1">
                                            <div className="flex justify-between text-muted-foreground" style={{ color: textMuted }}>
                                                <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                                                <span className="font-mono font-bold">{cartTotal} {cur}</span>
                                            </div>

                                            {/* Promotion Discount Breakdown */}
                                            {activeAppliedPromo && promoDiscountAmount > 0 && (
                                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                                                    <span className="flex items-center gap-1">
                                                        <Tag className="w-3.5 h-3.5" />
                                                        {isAr ? 'الخصم المطبق' : 'Discount'} ({isAr ? activeAppliedPromo.promotion.name_ar : (activeAppliedPromo.promotion.name_en || activeAppliedPromo.promotion.name_ar)})
                                                    </span>
                                                    <span className="font-mono font-bold">-{promoDiscountAmount} {cur}</span>
                                                </div>
                                            )}

                                            {/* Free Shipping Promo */}
                                            {isFreeShippingApplied && (
                                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                                                    <span className="flex items-center gap-1">
                                                        <Truck className="w-3.5 h-3.5" />
                                                        {isAr ? 'الشحن والتوصيل' : 'Shipping'}
                                                    </span>
                                                    <span>{isAr ? 'مجاني (عرض ترويجي)' : 'FREE'}</span>
                                                </div>
                                            )}

                                            {/* Final Grand Total */}
                                            <div className="flex justify-between text-base font-black pt-1 border-t" style={{ borderColor: borderColor }}>
                                                <span>{isAr ? 'الإجمالي الكلي' : 'Total'}</span>
                                                <div className="flex items-baseline gap-1.5 font-mono">
                                                    {promoDiscountAmount > 0 && (
                                                        <span className="text-xs line-through text-muted-foreground opacity-70">
                                                            {cartTotal} {cur}
                                                        </span>
                                                    )}
                                                    <span style={{ color: primaryColor }}>
                                                        {finalDiscountedTotal} {cur}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dual Checkout Action Buttons */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                            {/* WhatsApp Quick 1-Click Order */}
                                            <button
                                                onClick={handleWhatsAppOrder}
                                                className="w-full py-2.5 px-3 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                            >
                                                <FaWhatsapp className="w-4 h-4" />
                                                <span>{isAr ? 'طلب عبر واتساب' : 'WhatsApp Order'}</span>
                                            </button>

                                            {/* Standard Complete Checkout Modal */}
                                            <button
                                                onClick={() => { setIsCartOpen(false); setShowCheckout(true); }}
                                                className="w-full py-2.5 px-3 rounded-xl font-black text-xs text-white shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>{isAr ? 'إتمام الطلب الرسمي' : 'Complete Checkout'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* 10. PRODUCT SELECTION & CUSTOMIZATION MODAL (صفحة اختيار الصنف والمواصفات والملاحظات) */}
            <AnimatePresence>
                {quickViewItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                            onClick={closeQuickView}
                        />

                        {/* Modal Box */}
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border z-10 my-8 max-h-[90vh] flex flex-col"
                            style={{ backgroundColor: bgCard, borderColor: borderColor, color: textMain }}
                        >
                            {/* Close Button */}
                            <button 
                                onClick={closeQuickView}
                                className="absolute top-3 end-3 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
                                {/* Top Image View */}
                                <div className="relative aspect-[16/9] sm:aspect-[2/1] w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border" style={{ borderColor: borderColor }}>
                                    {quickViewItem.item.image_url || quickViewItem.item.image ? (
                                        <OptimizedMenuImage 
                                            src={quickViewItem.item.image_url || quickViewItem.item.image}
                                            thumbnailSrc={quickViewItem.item.thumbnail_url}
                                            alt={itemName(quickViewItem.item)}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <ShoppingBag className="w-12 h-12 opacity-30" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 start-3 flex gap-2">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow" style={{ backgroundColor: primaryColor }}>
                                            {quickViewItem.catName}
                                        </span>
                                        {quickViewItem.item.is_popular && (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow flex items-center gap-1">
                                                <Flame className="w-3 h-3" />
                                                {isAr ? 'الأكثر طلباً' : 'Best Seller'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Title & Pricing Header */}
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-black">
                                                {itemName(quickViewItem.item)}
                                            </h3>
                                            {quickViewItem.item.calories && (
                                                <span className="text-xs text-muted-foreground mt-0.5 block" style={{ color: textMuted }}>
                                                    🔥 {quickViewItem.item.calories} {isAr ? 'سعرة حرارية' : 'kcal'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-end shrink-0">
                                            <span className="text-lg sm:text-xl font-black font-mono" style={{ color: primaryColor }}>
                                                {quickViewItem.item.prices?.[modalSizeIdx] || 0} {cur}
                                            </span>
                                            {hasItemDiscount(quickViewItem.item, modalSizeIdx) && (
                                                <span className="block text-xs line-through text-muted-foreground font-mono">
                                                    {getItemOldPrice(quickViewItem.item, modalSizeIdx)} {cur}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Promotion Banner if item is in promo */}
                                    {getItemActivePromotions(quickViewItem.item.id).length > 0 && (
                                        <div className="mt-2.5 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-center gap-2 text-purple-700 dark:text-purple-300">
                                            <Gift className="w-4 h-4 shrink-0 text-purple-600" />
                                            <span className="font-bold">
                                                {isAr ? 'هذا المنتج مشمول بعرض ترويجي نشط!' : 'This item is included in an active promo!'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Description */}
                                    {itemDesc(quickViewItem.item) && (
                                        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed" style={{ color: textMuted }}>
                                            {itemDesc(quickViewItem.item)}
                                        </p>
                                    )}

                                    {/* Ingredients/Specs */}
                                    {(quickViewItem.item.ingredients_ar || quickViewItem.item.ingredients_en || quickViewItem.item.ingredients) && (
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-xs mt-3" style={{ borderColor: borderColor }}>
                                            <span className="font-bold block mb-1">{isAr ? 'المكونات / المواصفات:' : 'Ingredients / Specs:'}</span>
                                            <p className="text-muted-foreground" style={{ color: textMuted }}>
                                                {isAr ? (quickViewItem.item.ingredients_ar || quickViewItem.item.ingredients) : (quickViewItem.item.ingredients_en || quickViewItem.item.ingredients)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Sizes / Variants Selection */}
                                {quickViewItem.item.prices && quickViewItem.item.prices.length > 1 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-extrabold uppercase tracking-wider block">
                                            {isAr ? 'اختر المقاس / الحجم:' : 'Select Size / Variant:'}
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {quickViewItem.item.prices.map((p: number, idx: number) => {
                                                const rawLabel = quickViewItem.item.size_labels?.[idx] || (isAr ? `خيار ${idx + 1}` : `Option ${idx + 1}`);
                                                const label = rawLabel.includes('::') ? rawLabel.split('::')[0] : rawLabel;
                                                const isSelected = modalSizeIdx === idx;
                                                const oldP = getItemOldPrice(quickViewItem.item, idx);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setModalSizeIdx(idx)}
                                                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                                                            isSelected ? 'border-2 text-white shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        }`}
                                                        style={{ 
                                                            borderColor: isSelected ? primaryColor : borderColor,
                                                            backgroundColor: isSelected ? primaryColor : undefined 
                                                        }}
                                                    >
                                                        <span>{label}</span>
                                                        <div className="flex items-center gap-1 font-mono text-[11px] opacity-90">
                                                            <span>{p} {cur}</span>
                                                            {oldP > p && (
                                                                <span className="line-through text-[10px] opacity-60">{oldP}</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Extras / Addons (For Restaurants & Customizations) */}
                                {quickViewItem.item.extras && quickViewItem.item.extras.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        <label className="text-xs font-extrabold uppercase tracking-wider block">
                                            {isAr ? 'إضافات وتخصيصات اختيارية:' : 'Optional Extras & Addons:'}
                                        </label>
                                        <div className="space-y-1.5">
                                            {quickViewItem.item.extras.map((ex: any, idx: number) => {
                                                const exName = isAr ? ex.name_ar : (ex.name_en || ex.name_ar);
                                                const isChecked = modalSelectedExtras.some(e => e.name === exName);

                                                return (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => {
                                                            setModalSelectedExtras(prev => 
                                                                isChecked 
                                                                    ? prev.filter(e => e.name !== exName) 
                                                                    : [...prev, { name: exName, price: Number(ex.price) || 0, qty: 1 }]
                                                            );
                                                        }}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                                                            isChecked ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        }`}
                                                        style={{ borderColor: isChecked ? primaryColor : borderColor }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-emerald-500 text-white' : ''}`} style={{ backgroundColor: isChecked ? primaryColor : undefined }}>
                                                                {isChecked && <Check className="w-3 h-3" />}
                                                            </div>
                                                            <span>{exName}</span>
                                                        </div>
                                                        <span className="font-mono font-bold">+{ex.price} {cur}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Special Notes Input */}
                                <div className="space-y-1.5 pt-2">
                                    <label className="text-xs font-bold block text-muted-foreground" style={{ color: textMuted }}>
                                        {isAr ? 'ملاحظات التحضير أو التخصيص الخاصة بك:' : 'Special customization or preparation notes:'}
                                    </label>
                                    <textarea 
                                        rows={2}
                                        value={modalNotes}
                                        onChange={(e) => setModalNotes(e.target.value)}
                                        placeholder={isAr ? 'مثال: بدون بصل، صوص خارجي، سكر خفيف، لون معين، إلخ...' : 'e.g. Extra sauce, no onions, specific request...'}
                                        className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800 resize-none"
                                        style={{ borderColor: borderColor }}
                                    />
                                </div>
                            </div>

                            {/* Modal Bottom Sticky Bar */}
                            <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3" style={{ borderColor: borderColor }}>
                                {/* Quantity Stepper */}
                                <div className="flex items-center gap-2 border rounded-xl p-1 bg-white dark:bg-black" style={{ borderColor: borderColor }}>
                                    <button
                                        onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-sm font-black min-w-[20px] text-center font-mono">
                                        {modalQty}
                                    </span>
                                    <button
                                        onClick={() => setModalQty(modalQty + 1)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Add Button */}
                                <button
                                    onClick={handleAddFromModal}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-95"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    <span>
                                        {isAr ? 'أضف إلى السلة' : 'Add to Cart'} — {((quickViewItem.item.prices?.[modalSizeIdx] || 0) + modalSelectedExtras.reduce((s, e) => s + e.price, 0)) * modalQty} {cur}
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 11. PAYMENT METHODS MODAL (طرق ووسائل الدفع المتاحة) */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsPaymentModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border z-10 p-5 space-y-4"
                            style={{ backgroundColor: bgCard, borderColor: borderColor }}
                        >
                            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: borderColor }}>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-amber-500" />
                                    <h3 className="font-black text-base">{isAr ? 'طرق الدفع المتاحة' : 'Accepted Payment Methods'}</h3>
                                </div>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {/* Cash on Delivery */}
                                <div className="p-3 rounded-2xl border flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50" style={{ borderColor: borderColor }}>
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Banknote className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black">{isAr ? 'الدفع نقداً عند الاستلام' : 'Cash on Delivery'}</h4>
                                        <p className="text-[11px] text-muted-foreground mt-0.5" style={{ color: textMuted }}>
                                            {isAr ? 'يمكنك الدفع كاش عند استلام طلبك أو في الصالة' : 'Pay in cash upon receiving your order'}
                                        </p>
                                    </div>
                                </div>

                                {/* Cards (Visa / Mastercard) */}
                                <div className="p-3 rounded-2xl border flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50" style={{ borderColor: borderColor }}>
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black">{isAr ? 'البطاقات الائتمانية والبنكية' : 'Credit / Debit Cards'}</h4>
                                        <p className="text-[11px] text-muted-foreground mt-0.5" style={{ color: textMuted }}>
                                            {isAr ? 'فيزا، ماستركارد، ميزة (عبر نقاط البيع أو التحويل)' : 'Visa, MasterCard, Meeza'}
                                        </p>
                                    </div>
                                </div>

                                {/* Custom merchant payment methods (e.g. Vodafone Cash, InstaPay) */}
                                {config?.payment_methods && config.payment_methods.length > 0 ? (
                                    config.payment_methods.map((pm: any, idx: number) => {
                                        const name = isAr ? pm.name_ar : (pm.name_en || pm.name_ar);
                                        const desc = isAr ? pm.desc_ar : (pm.desc_en || pm.desc_ar);
                                        const num = pm.number;
                                        const isCopied = copiedAccount === `pm-${idx}`;

                                        return (
                                            <div key={idx} className="p-3 rounded-2xl border space-y-2 bg-slate-50 dark:bg-slate-800/50" style={{ borderColor: borderColor }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                                                        <Smartphone className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-black">{name}</h4>
                                                        {desc && (
                                                            <p className="text-[11px] text-muted-foreground mt-0.5" style={{ color: textMuted }}>{desc}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {num && (
                                                    <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-black border text-xs font-mono font-bold" style={{ borderColor: borderColor }}>
                                                        <span className="truncate">{num}</span>
                                                        <button
                                                            onClick={() => handleCopy(num, `pm-${idx}`)}
                                                            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md text-white shrink-0 font-sans"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            {isCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                            <span>{isCopied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-3 rounded-2xl border flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50" style={{ borderColor: borderColor }}>
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                                            <Wallet className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black">{isAr ? 'المحافظ الإلكترونية وإنستاباي' : 'E-Wallets & InstaPay'}</h4>
                                            <p className="text-[11px] text-muted-foreground mt-0.5" style={{ color: textMuted }}>
                                                {isAr ? 'متاح التحويل عند الطلب عبر الواتساب' : 'Available upon ordering via WhatsApp'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 12. STORE INFO & CONTACT MODAL */}
            <AnimatePresence>
                {isInfoModalOpen && (
                    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsInfoModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border z-10 p-5 space-y-4"
                            style={{ backgroundColor: bgCard, borderColor: borderColor }}
                        >
                            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: borderColor }}>
                                <div className="flex items-center gap-2">
                                    <Store className="w-5 h-5 text-emerald-500" />
                                    <h3 className="font-black text-base">{isAr ? 'بيانات ومواعيد المتجر' : 'Store Information & Hours'}</h3>
                                </div>
                                <button onClick={() => setIsInfoModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Working Hours */}
                            {config?.working_hours && (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-xs" style={{ borderColor: borderColor }}>
                                    <Clock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block">{isAr ? 'مواعيد العمل:' : 'Working Hours:'}</span>
                                        <p className="text-muted-foreground mt-0.5" style={{ color: textMuted }}>{config.working_hours}</p>
                                    </div>
                                </div>
                            )}

                            {/* Address / Location */}
                            {config?.address && (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-xs" style={{ borderColor: borderColor }}>
                                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block">{isAr ? 'العنوان:' : 'Address:'}</span>
                                        <p className="text-muted-foreground mt-0.5" style={{ color: textMuted }}>{config.address}</p>
                                    </div>
                                </div>
                            )}

                            {/* Branches */}
                            {config?.branches && config.branches.length > 0 && (
                                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-xs" style={{ borderColor: borderColor }}>
                                    <span className="font-bold block">{isAr ? 'فروعنا:' : 'Our Branches:'}</span>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {config.branches.map((b: string, i: number) => (
                                            <span key={i} className="px-2 py-1 rounded-lg bg-white dark:bg-black border font-medium text-[11px]" style={{ borderColor: borderColor }}>
                                                🏢 {b}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Phone Numbers List */}
                            {phoneList.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-xs font-bold block">{isAr ? 'أرقام الاتصال والطلبات:' : 'Phone Numbers:'}</span>
                                    <div className="space-y-1.5">
                                        {phoneList.map((p, idx) => (
                                            <a 
                                                key={idx}
                                                href={`tel:${p.number}`}
                                                className="flex items-center justify-between p-2.5 rounded-xl border text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                style={{ borderColor: borderColor }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                                                    <span>{p.label}</span>
                                                </div>
                                                <span className="font-mono font-bold dir-ltr">{p.number}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Social Icons */}
                            <div className="pt-2 border-t flex items-center justify-center gap-3" style={{ borderColor: borderColor }}>
                                {config?.whatsapp_number && (
                                    <a href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-emerald-500 text-white shadow hover:scale-110 transition-transform">
                                        <FaWhatsapp className="w-4 h-4" />
                                    </a>
                                )}
                                {config?.facebook_url && (
                                    <a href={config.facebook_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-blue-600 text-white shadow hover:scale-110 transition-transform">
                                        <FaFacebookF className="w-4 h-4" />
                                    </a>
                                )}
                                {config?.instagram_url && (
                                    <a href={config.instagram_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-pink-600 text-white shadow hover:scale-110 transition-transform">
                                        <FaInstagram className="w-4 h-4" />
                                    </a>
                                )}
                                {config?.tiktok_url && (
                                    <a href={config.tiktok_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-black text-white shadow hover:scale-110 transition-transform">
                                        <FaTiktok className="w-4 h-4" />
                                    </a>
                                )}
                                {config?.snapchat_url && (
                                    <a href={config.snapchat_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-yellow-400 text-black shadow hover:scale-110 transition-transform">
                                        <FaSnapchatGhost className="w-4 h-4" />
                                    </a>
                                )}
                                {config?.map_link && (
                                    <a href={config.map_link} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-rose-600 text-white shadow hover:scale-110 transition-transform">
                                        <MapPin className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 13. WISHLIST MODAL */}
            <AnimatePresence>
                {isWishlistOpen && (
                    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsWishlistOpen(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border z-10 flex flex-col max-h-[80vh]"
                            style={{ backgroundColor: bgCard, borderColor: borderColor }}
                        >
                            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: borderColor }}>
                                <div className="flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                                    <h3 className="font-black text-base">{isAr ? 'قائمة المفضلة' : 'Your Wishlist'}</h3>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800">
                                        {wishlist.length}
                                    </span>
                                </div>
                                <button onClick={() => setIsWishlistOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {wishlist.length === 0 ? (
                                    <div className="text-center py-16">
                                        <Heart className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                                        <p className="text-sm font-bold">{isAr ? 'لم تقم بإضافة أي منتجات للمفضلة بعد' : 'No items in your wishlist yet'}</p>
                                    </div>
                                ) : (
                                    allItems.filter(i => wishlist.includes(i.id)).map(item => (
                                        <div key={item.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border" style={{ borderColor: borderColor }}>
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                                    {item.image_url || item.image ? (
                                                        <OptimizedMenuImage src={item.image_url || item.image} alt={itemName(item)} className="w-full h-full object-cover" />
                                                    ) : null}
                                                </div>
                                                <div className="truncate">
                                                    <h5 className="font-bold text-xs truncate">{itemName(item)}</h5>
                                                    <span className="text-xs font-mono font-bold" style={{ color: primaryColor }}>{item.prices?.[0] || 0} {cur}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => { openQuickView(item, item.catName); setIsWishlistOpen(false); }}
                                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    {isAr ? 'اختيار ومواصفات' : 'Select'}
                                                </button>
                                                <button
                                                    onClick={() => toggleWishlist(item.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 14. OFFICIAL CHECKOUT MODAL INTEGRATION */}
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
                restaurantName={config?.name || 'Store'}
                whatsappNumber={config?.whatsapp_number || config?.phone}
                currency={config?.currency}
                language={currentLang}
                branches={config?.branches || []}
                onOrderSuccess={() => {
                    setCart([]);
                    setShowCheckout(false);
                    handleRemovePromoCode();
                }}
            />

            {/* 15. STORE FOOTER (Shopify Style) */}
            <footer className="border-t mt-16 py-10 transition-colors" style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        {/* Brand & Bio */}
                        <div className="md:col-span-2 space-y-3">
                            <div className="flex items-center gap-3">
                                {config?.logo_url && (
                                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow border shrink-0">
                                        <OptimizedMenuImage src={config.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <h3 className="font-black text-lg tracking-tight">{config?.name || 'Shopify Store'}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed max-w-md" style={{ color: textMuted }}>
                                {isAr ? (config?.slogan_ar || 'متجرك الإلكتروني المتكامل لبيع المنتجات والسلع وأشهى الوجبات والمشروبات بأحدث تجربة تسوق عصرية.') : (config?.slogan_en || 'Your complete modern digital store for products, goods, and fine dining.')}
                            </p>
                        </div>

                        {/* Quick Contact */}
                        <div className="space-y-2 text-xs">
                            <h4 className="font-extrabold uppercase tracking-wider text-sm mb-3">{isAr ? 'تواصل معنا' : 'Contact Us'}</h4>
                            {config?.phone && (
                                <p className="text-muted-foreground flex items-center gap-2" style={{ color: textMuted }}>
                                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="font-mono dir-ltr">{config.phone}</span>
                                </p>
                            )}
                            {config?.address && (
                                <p className="text-muted-foreground flex items-center gap-2" style={{ color: textMuted }}>
                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                    <span>{config.address}</span>
                                </p>
                            )}
                            {config?.working_hours && (
                                <p className="text-muted-foreground flex items-center gap-2" style={{ color: textMuted }}>
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    <span>{config.working_hours}</span>
                                </p>
                            )}
                        </div>

                        {/* Social Links */}
                        <div className="space-y-3 text-xs">
                            <h4 className="font-extrabold uppercase tracking-wider text-sm mb-3">{isAr ? 'تابعنا على' : 'Follow Us'}</h4>
                            <div className="flex items-center gap-2 flex-wrap">
                                {config?.whatsapp_number && (
                                    <a href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors">
                                        <FaWhatsapp className="w-4 h-4" />
                                    </a>
                                )}
                                {config?.facebook_url && (
                                    <a href={config.facebook_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors">
                                        <FaFacebookF className="w-4 h-4" />
                                    </a>
                                )}
                                {config?.instagram_url && (
                                    <a href={config.instagram_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-pink-500/10 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors">
                                        <FaInstagram className="w-4 h-4" />
                                    </a>
                                )}
                                {config?.tiktok_url && (
                                    <a href={config.tiktok_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-500/10 text-slate-500 hover:bg-black hover:text-white transition-colors">
                                        <FaTiktok className="w-4 h-4" />
                                    </a>
                                )}
                                {config?.snapchat_url && (
                                    <a href={config.snapchat_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600 hover:bg-yellow-400 hover:text-black transition-colors">
                                        <FaSnapchatGhost className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ASN Branding Footer */}
                    {config?.show_asn_branding !== false && (
                        <div className="pt-6 border-t" style={{ borderColor: borderColor }}>
                            <ASNFooter show={true} />
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}
