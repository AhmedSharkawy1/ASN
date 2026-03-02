"use client";

import React, { useState, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import SharedMarquee from './SharedMarquee';
import CheckoutModal from './CheckoutModal';
import Image from 'next/image';
import {
    ShoppingCart,
    MapPin,
    Clipboard,
    Plus,
    X,
    Info,
    Phone,
    Share2,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Filter,
    ChevronUp
} from 'lucide-react';
import { FaWhatsapp, FaFacebook, FaTwitter, FaTelegram, FaSnapchatGhost, FaInstagram, FaFacebookF } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

// Local Types to avoid import issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentMethodEntry = any;

type Item = {
    id: string;
    title_ar: string;
    title_en?: string;
    desc_ar?: string;
    desc_en?: string;
    description_ar?: string;
    description_en?: string;
    description?: string;
    prices: number[];
    size_labels: string[];
    is_popular: boolean;
    is_spicy: boolean;
    image_url?: string;
    is_available: boolean;
    calories?: string;
    preparation_time?: string;
    extras?: {
        name_ar: string;
        name_en: string;
        price: number;
    }[];
};

// type MenuItem = Item;

type Category = {
    id: string;
    name_ar: string;
    name_en?: string;
    emoji?: string;
    image_url?: string;
    items: Item[];
};

type CategoryWithItemsType = Category;

type RestaurantConfig = {
    name: string;
    theme: string;
    phone?: string;
    whatsapp_number?: string;
    facebook_url?: string;
    instagram_url?: string;
    tiktok_url?: string;
    map_link?: string;
    logo_url?: string;
    cover_url?: string;
    cover_images?: string[];
    working_hours?: string;
    payment_methods?: PaymentMethodEntry[];
    marquee_enabled?: boolean;
    marquee_text_ar?: string;
    marquee_text_en?: string;
    orders_enabled?: boolean;
    social_links?: {
        facebook?: string;
        instagram?: string;
        whatsapp?: string;
        tiktok?: string;
        snapchat?: string;
        telegram?: string;
        twitter?: string;
        location_url?: string;
    };
    phones?: string[];
    latitude?: string;
    longitude?: string;
    address?: string;
    theme_colors?: {
        primary?: string;
        secondary?: string;
        background?: string;
        text?: string;
    };
    default_language?: string;
    currency?: string;
};

type CartItem = {
    id: string;
    item: Item;
    price: number;
    size_label: string;
    quantity: number;
    extras?: { id: string, name_ar: string, name_en?: string, price: number }[];
    notes?: string;
    category_name: string;
};

// Main Component
export default function Theme16Menu({ config, categories, restaurantId }: { config: RestaurantConfig, categories: CategoryWithItemsType[], restaurantId: string }) {
    // --- Configuration ---
    const isRTL = config.default_language !== 'en';
    const cur = config.currency || 'ج.م';
    const primaryColor = config.theme_colors?.primary || '#af0a13';
    const secondaryColor = config.theme_colors?.secondary || '#9b0000';
    const bgColor = config.theme_colors?.background || '#f8f9fa';

    // --- State ---
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Modal State
    const [selectedItem, setSelectedItem] = useState<{ item: Item, cName: string, cImage: string } | null>(null);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [qty, setQty] = useState(1);
    const [selectedExtras, setSelectedExtras] = useState<{ id: string, name_ar: string, name_en?: string, price: number }[]>([]);
    const [notes, setNotes] = useState("");

    // UI State
    const [toastMsg, setToastMsg] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [showShareModal, setShowShareModal] = useState(false);
    const [showCategorySheet, setShowCategorySheet] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isPhoneMenuOpen, setIsPhoneMenuOpen] = useState(false);

    // Customer Info
    const [showCheckout, setShowCheckout] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });

    // --- Effects ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // --- Helpers ---
    const catName = (c: CategoryWithItemsType) => isRTL ? c.name_ar : (c.name_en || c.name_ar);
    const itemName = (i: Item) => isRTL ? i.title_ar : (i.title_en || i.title_ar);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const itemPrice = (i: Item) => parseFloat(i.prices?.[0]?.toString() || "0");

    const copyToClipboard = (text: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            showToast(isRTL ? 'تم نسخ المنتج إلى الحافظة!' : 'Item copied!');
        }).catch(() => {
            showToast(isRTL ? 'فشل النسخ!' : 'Copy failed!', 'error');
        });
    };

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToastMsg(msg);
        setToastType(type);
        setTimeout(() => setToastMsg(''), 3000);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- Cart Actions ---
    const openModal = (item: Item, catName: string, catImg?: string) => {
        if (config.orders_enabled === false) return;
        setSelectedItem({ item, cName: catName, cImage: catImg || '' }); // Adjusted to match existing state type
        setSizeIdx(0);
        setQty(1);
        setNotes('');
        setSelectedExtras([]);
    };

    const closeModal = () => setSelectedItem(null);

    const addToCart = () => {
        if (!selectedItem || config.orders_enabled === false) return;
        const { item, cName } = selectedItem;
        const price = item.prices ? parseFloat(item.prices[sizeIdx]?.toString() || "0") : 0;
        const sLabel = item.size_labels?.[sizeIdx] || (isRTL ? 'عادي' : 'Regular');

        let extrasTotal = 0;
        selectedExtras.forEach(e => extrasTotal += e.price);

        const cartId = `${item.id} -${sLabel} -${selectedExtras.map(e => e.id).sort().join('-')} `;
        const finalPrice = price + extrasTotal;

        setCart(prev => {
            const ext = prev.find(c => c.id === cartId);
            if (ext) {
                return prev.map(c => c.id === cartId ? { ...c, quantity: c.quantity + qty } : c);
            }
            return [...prev, {
                id: cartId,
                item,
                price: finalPrice,
                size_label: sLabel,
                quantity: qty,
                extras: selectedExtras,
                notes,
                category_name: cName
            }];
        });

        closeModal();
        showToast(isRTL ? 'تمت الإضافة للسلة!' : 'Added to cart!');
    };

    const updateCartQty = (id: string, delta: number) => {
        setCart(prev => {
            return prev.map(c => {
                if (c.id === id) {
                    const newQ = c.quantity + delta;
                    return newQ > 0 ? { ...c, quantity: newQ } : c;
                }
                return c;
            }).filter(c => c.quantity > 0);
        });
    };

    const cartTotal = cart.reduce((sum, c) => sum + (c.price * c.quantity), 0);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const checkOutWhatsApp = () => {
        if (!config.whatsapp_number) {
            showToast(isRTL ? "رقم الواتساب غير متوفر" : "WhatsApp number unavailable", "error");
            return;
        }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            showToast(isRTL ? "الرجاء إكمال بيانات التوصيل" : "Please complete delivery details", "error");
            return;
        }

        let msg = `*🧾 طلب جديد - ${config.name}*\n\n`;
        msg += `👤 * الاسم:* ${customerInfo.name} \n`;
        msg += `📞 * الموبايل:* ${customerInfo.phone} \n`;
        msg += `📍 * العنوان:* ${customerInfo.address} \n`;
        msg += `------------------------------\n\n`;

        cart.forEach((c, idx) => {
            msg += `${idx + 1}. * ${itemName(c.item)}*\n`;
            if (c.size_label && c.item.size_labels && c.item.size_labels.length > 1) {
                msg += `   📏 الحجم: ${c.size_label} \n`;
            }
            if (c.extras && c.extras.length > 0) {
                const exStr = c.extras.map(e => isRTL ? e.name_ar : (e.name_en || e.name_ar)).join(', ');
                msg += `   ➕ الإضافات: ${exStr} \n`;
            }
            if (c.notes) {
                msg += `   📝 ملاحظات: ${c.notes} \n`;
            }
            msg += `   🔢 الكمية: ${c.quantity} | 💵 المجموع: ${c.price * c.quantity} ${cur} \n\n`;
        });

        msg += `------------------------------\n`;
        msg += `*💰 الإجمالي المطلوب: ${cartTotal} ${cur}*\n`;
        msg += `(السعر لا يشمل رسوم التوصيل) \n`;

        const waUrl = `https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
        setCart([]);
        setIsCartOpen(false);
    };

    // --- Search & Filter Logic ---
    let filteredItems: Item[] = [];
    if (searchQuery) {
        filteredItems = categories
            .flatMap(c => c.items)
            .filter(item => {
                const q = searchQuery.toLowerCase();
                return (item.title_ar?.toLowerCase().includes(q) || item.title_en?.toLowerCase().includes(q));
            });
    } else if (activeCategory === 'all') {
        filteredItems = categories.flatMap(c => c.items);
    } else {
        const cat = categories.find(c => c.id.toString() === activeCategory);
        filteredItems = cat ? cat.items : [];
    }

    return (
        <div className="theme16-container" dir={isRTL ? 'rtl' : 'ltr'}>
            <style jsx global>{`
                .theme16-container {
                    --primary-color: ${primaryColor};
                    --primary-light: ${primaryColor}1a;
                    --primary-dark: ${secondaryColor};
                    --text-color: #333333;
                    --text-light: #666666;
                    --menu-bg: #ffffff;
                    --body-bg: ${bgColor};
                    --accent-color: #FF6B6B;
                    --success-color: #28a745;
                    --whatsapp-color: #25D366;
                    --telegram-color: #0088cc;
                    --radius-sm: 6px;
                    --radius-md: 8px;
                    --radius-lg: 12px;
                    --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
                    --shadow-md: 0 2px 8px rgba(0,0,0,0.12);
                    --transition-fast: 0.15s ease;
                    --transition-normal: 0.25s ease;
                    font-family: 'Cairo', sans-serif;
                    background-color: var(--body-bg);
                    color: var(--text-color);
                    min-height: 100vh;
                    padding-bottom: 70px; /* footer space */
                }

                /* Loading */
                .loading-container {
                    position: fixed; inset: 0; background: var(--body-bg);
                    display: flex; flex-direction: column; justify-content: center; align-items: center;
                    z-index: 9999;
                    transition: opacity var(--transition-normal);
                }
                .loading-container.hidden { opacity: 0; pointer-events: none; }
                
                /* Compact Header */
                .compact-header {
                    position: fixed; top: 0; left: 0; width: 100%;
                    background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    z-index: 1000; padding: 8px 0;
                }
                .header-content {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0 12px;
                }
                .store-branding { display: flex; align-items: center; gap: 8px; }
                .store-logo {
                    width: 40px; height: 40px; border-radius: var(--radius-sm); border: 2px solid white;
                    overflow: hidden; flex-shrink: 0;
                }
                .store-logo img { width: 100%; height: 100%; object-fit: cover; }
                .store-info { display: flex; flex-direction: column; }
                .store-name { font-size: 0.9rem; font-weight: 700; margin: 0; line-height: 1.2; }
                .store-tagline { color: var(--text-light); font-size: 0.75rem; margin: 0; }
                .back-button, .header-icon-btn {
                    width: 32px; height: 32px; border-radius: 50%;
                    background: var(--primary-light); color: var(--primary-color);
                    display: flex; align-items: center; justify-content: center;
                    border: none; cursor: pointer; transition: all var(--transition-fast);
                }
                .header-icon-btn:hover { background: var(--primary-color); color: white; }

                /* Hero Section */
                .hero-section {
                    margin-top: 56px; height: 120px; position: relative; overflow: hidden;
                }
                .cover-image {
                    width: 100%; height: 100%; background-size: cover; background-position: center;
                }
                .hero-overlay {
                    position: absolute; bottom: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
                    display: flex; align-items: flex-end; padding: 12px;
                }
                .hero-title { color: white; font-size: 1.2rem; font-weight: 800; margin: 0 0 4px 0; }
                .hero-subtitle { color: rgba(255,255,255,0.9); font-size: 0.8rem; margin: 0; }

                /* Filter Section */
                .filter-section {
                    padding: 12px; background: white; position: sticky; top: 56px; z-index: 900;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                }
                .results-counter { text-align: center; padding: 4px 0; font-size: 0.8rem; color: var(--text-light); margin-bottom: 8px;}
                .results-count { font-weight: 700; color: var(--primary-color); padding: 0 4px; }
                .filter-chips-container {
                    display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;
                }
                .filter-chips-container::-webkit-scrollbar { display: none; }
                .filter-chip {
                    padding: 6px 12px; border-radius: 16px; background: white; color: var(--text-color);
                    font-size: 0.8rem; font-weight: 500; white-space: nowrap; cursor: pointer;
                    border: 1px solid #e0e0e0; flex-shrink: 0; transition: all var(--transition-fast);
                }
                .filter-chip.active {
                    background: var(--primary-color); color: white; border-color: var(--primary-color);
                }

                /* Menu Grid */
                .main-content { padding: 0 12px; max-width: 1200px; margin: 0 auto; }
                .menu-grid {
                    display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 8px 0;
                }
                @media (min-width: 768px) { .menu-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
                @media (min-width: 1024px) { .menu-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; } }

                .menu-item {
                    background: white; border-radius: var(--radius-md); overflow: hidden;
                    box-shadow: var(--shadow-sm); border: 1px solid #f0f0f0;
                    display: flex; flex-direction: column; position: relative;
                }
                .item-badge {
                    position: absolute; top: 6px; right: 6px; background: var(--primary-color); color: white;
                    padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; z-index: 2;
                }
                .item-image { width: 100%; height: 100px; position: relative; background: #f8f9fa; }
                .item-image img { object-fit: cover; }
                .item-content { flex: 1; padding: 8px; display: flex; flex-direction: column; }
                .item-title { font-size: 0.85rem; font-weight: 700; margin: 0 0 2px 0; line-clamp: 2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .item-description { font-size: 0.75rem; color: var(--text-light); margin: 0 0 8px 0; line-clamp: 2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex: 1;}
                .item-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
                .item-price { font-size: 0.9rem; font-weight: 800; color: var(--primary-color); }
                .item-actions { display: flex; gap: 4px; }
                .action-btn {
                    width: 28px; height: 28px; border-radius: 50%; border: none; display: flex; align-items: center;
                    justify-content: center; cursor: pointer; color: white; font-size: 0.8rem;
                }
                .copy-btn { background: #6c757d; }
                .details-btn { background: var(--success-color); }
                .cart-btn { background: var(--primary-color); }

                /* Bottom Navigation */
                .bottom-nav {
                    position: fixed; bottom: 0; left: 0; width: 100%; background: white;
                    border-top: 1px solid #e0e0e0; display: flex; justify-content: space-around;
                    padding: 8px 0; z-index: 1000; box-shadow: 0 -1px 3px rgba(0,0,0,0.1);
                }
                .nav-item {
                    display: flex; flex-direction: column; align-items: center; flex: 1;
                    color: var(--text-light); cursor: pointer; text-decoration: none; position: relative;
                }
                .nav-item.active, .nav-item:hover { color: var(--primary-color); }
                .nav-icon { font-size: 1.1rem; margin-bottom: 2px; }
                .nav-label { font-size: 0.7rem; font-weight: 600; }
                .nav-badge {
                    position: absolute; top: -2px; right: calc(50% - 14px);
                    background: var(--accent-color); color: white; border-radius: 50%;
                    width: 14px; height: 14px; font-size: 0.6rem; display: flex; align-items: center; justify-content: center;
                }

                /* FABs */
                .fab-container { position: fixed; bottom: 65px; left: 12px; display: flex; flex-direction: column; gap: 8px; z-index: 900; }
                .fab {
                    width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    color: white; box-shadow: var(--shadow-md); border: none; cursor: pointer;
                }
                .fab-whatsapp { background: var(--whatsapp-color); }
                .fab-scroll { background: var(--primary-color); opacity: 0; pointer-events: none; transition: 0.3s; }
                .fab-scroll.show { opacity: 1; pointer-events: auto; }

                /* Toast */
                .toast-notification {
                    position: fixed; top: 70px; right: 12px; background: rgba(0,0,0,0.9); color: white;
                    padding: 8px 12px; border-radius: var(--radius-md); font-size: 0.8rem; z-index: 9999;
                    opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all var(--transition-normal);
                    display: flex; align-items: center; gap: 8px; max-width: 250px;
                }
                .toast-notification.show { opacity: 1; visibility: visible; transform: translateY(0); }
                .toast-notification.error { background: rgba(220, 53, 69, 0.9); }

                /* Full Page Modals overlay */
                .modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9998;
                    display: flex; align-items: flex-end; justify-content: center;
                }
                .modal-content-sheet {
                    background: white; width: 100%; max-width: 500px;
                    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
                    transform: translateY(100%); transition: transform 0.3s ease;
                    max-height: 85vh; display: flex; flex-direction: column;
                }
                .modal-overlay.open .modal-content-sheet { transform: translateY(0); }

            `}</style>

            {/* Loading */}
            {isLoading && (
                <div className="loading-container">
                    <h2 className="loading-text" style={{ color: primaryColor }}>{isRTL ? "جاري التحميل..." : "Loading..."}</h2>
                </div>
            )}

            {/* Header */}
            <header className="compact-header">
                <div className="header-content">
                    <div className="store-branding">
                        {config.logo_url && (
                            <div className="store-logo">
                                <Image src={config.logo_url} alt="Logo" width={40} height={40} />
                            </div>
                        )}
                        <div className="store-info">
                            <h1 className="store-name">{config.name}</h1>
                            <p className="store-tagline">{isRTL ? 'القائمة' : 'Menu'}</p>
                        </div>
                    </div>
                    <div className="header-actions flex items-center gap-2">
                        {config.map_link ? (
                            <a href={config.map_link} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                                <MapPin className="w-4 h-4" />
                            </a>
                        ) : (config.latitude && config.longitude && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${config.latitude},${config.longitude}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                                <MapPin className="w-4 h-4" />
                            </a>
                        ))}
                        {(config.social_links?.facebook || config.facebook_url) && (
                            <a href={config.social_links?.facebook || config.facebook_url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-[#1877f2] hover:bg-gray-200 transition-colors">
                                <FaFacebookF className="w-4 h-4" />
                            </a>
                        )}
                        {(config.social_links?.instagram || config.instagram_url) && (
                            <a href={config.social_links?.instagram || config.instagram_url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-[#E1306C] hover:bg-gray-200 transition-colors">
                                <FaInstagram className="w-4 h-4" />
                            </a>
                        )}
                        {(config.social_links?.snapchat) && (
                            <a href={config.social_links?.snapchat} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-[#fffc00] hover:bg-gray-200 transition-colors">
                                <FaSnapchatGhost className="w-4 h-4 text-black" />
                            </a>
                        )}
                        {(config.social_links?.whatsapp || config.whatsapp_number) && (
                            <a href={`https://wa.me/${(config.social_links?.whatsapp || config.whatsapp_number || '').replace(/\+/g, '')}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-[#25D366] hover:bg-gray-200 transition-colors">
                                <FaWhatsapp className="w-4 h-4" />
                            </a>
                        )}
                        <button className="w-8 h-8 rounded-full flex items-center justify-center bg-[#25D366] text-white hover:opacity-90 transition-opacity" onClick={() => setShowShareModal(true)}>
                            <Share2 size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Cover */}
            <section className="hero-section">
                <div className="cover-image" style={{ backgroundImage: `url('${config.cover_url || ''}')` }}></div>
                <div className="hero-overlay">
                    <div>
                        <h2 className="hero-title">{config.name}</h2>
                        <p className="hero-subtitle">{isRTL ? 'القائمة المتميزة' : 'Premium Menu'}</p>
                    </div>
                </div>
            </section>

            {/* Filter Section */}
            <section className="filter-section">
                <div className="results-counter">
                    <span>{isRTL ? 'تم العثور على' : 'Found'}</span>
                    <span className="results-count">{filteredItems.length}</span>
                    <span>{isRTL ? 'عنصر' : 'items'}</span>
                </div>
                <div className="filter-chips-container">
                    <div className={`filter-chip ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>
                        {isRTL ? 'الكل' : 'All'}
                    </div>
                    {
                        categories.map(cat => (
                            <div key={cat.id} className={`filter-chip ${activeCategory === cat.id.toString() ? 'active' : ''}`} onClick={() => setActiveCategory(cat.id.toString())}>
                                {catName(cat)}
                            </div>
                        ))}
                </div>
            </section>

            {/* Main Menu Grid */}
            <main className="main-content">
                <div className="menu-grid">
                    {filteredItems.map(item => {
                        const cArr = categories.filter(c => c.items.some(i => i.id === item.id));
                        const cName = cArr.length > 0 ? catName(cArr[0]) : '';
                        const cImage = cArr.length > 0 ? cArr[0].image_url : '';
                        return (
                            <div className="menu-item" key={item.id}>
                                <span className="item-badge">{cName}</span>
                                <div className="item-image" onClick={() => openModal(item, cName, cImage || '')}>
                                    <Image src={item.image_url || cImage || '/placeholder.jpg'} alt="Item" fill className="object-cover cursor-pointer" />
                                </div>
                                <div className="item-content">
                                    <div className="item-header">
                                        <h3 className="item-title">{itemName(item)}</h3>
                                    </div>
                                    <p className="item-description">{isRTL ? (item.description_ar || '') : (item.description_en || item.description_ar || item.description || '')}</p>
                                    <div className="item-footer">
                                        <div className="flex flex-col gap-1 w-[70%] pr-1 pt-2 pb-1">
                                            {item.prices?.map((p: number | string, pIdx: number) => (
                                                <div key={pIdx} className="flex items-center gap-1.5 item-price-row">
                                                    <span className="item-price text-sm whitespace-nowrap">{cur} {p}</span>
                                                    {item.size_labels?.[pIdx] && (
                                                        <span className="text-[9px] text-gray-400 line-clamp-1">({item.size_labels[pIdx]})</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="item-actions">
                                            <button className="action-btn copy-btn" onClick={(e) => copyToClipboard(`${itemName(item)} - ${cur} ${item.prices[0]?.toFixed?.(0) || item.prices[0]}`, e)}>
                                                <Clipboard size={14} />
                                            </button>
                                            {config.orders_enabled !== false && (
                                                <button className="action-btn cart-btn" onClick={() => openModal(item, cName, cImage || '')}>
                                                    <Plus size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Bottom Nav */}
            <nav className="bottom-nav">
                <a href={config.map_link || '#'} target="_blank" className="nav-item">
                    <MapPin className="nav-icon" />
                    <span className="nav-label">{isRTL ? 'الفروع' : 'Branches'}</span>
                </a>
                <div className="nav-item relative">
                    <div onClick={() => setIsPhoneMenuOpen(!isPhoneMenuOpen)} className="flex flex-col items-center">
                        <Phone className="nav-icon" />
                        <span className="nav-label">{isRTL ? 'اتصل بنا' : 'Contact'}</span>
                    </div>
                    <AnimatePresence>
                        {isPhoneMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-white rounded-xl shadow-[0_5px_20px_rgba(0,0,0,0.2)] border border-gray-100 py-2 z-[110] overflow-hidden"
                            >
                                <div className="px-4 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase text-center" dir={isRTL ? 'rtl' : 'ltr'}>
                                    {isRTL ? 'أرقام الديلفري' : 'Delivery Numbers'}
                                </div>
                                {config.phones && config.phones.length > 0 ? (
                                    config.phones.map((phoneNum: string, idx: number) => (
                                        <a
                                            key={idx}
                                            href={`tel:${phoneNum}`}
                                            className="block px-4 py-2.5 text-center text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                                        >
                                            {phoneNum}
                                        </a>
                                    ))
                                ) : (
                                    <a
                                        href={`tel:${config.phone}`}
                                        className="block px-4 py-2.5 text-center text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                                    >
                                        {config.phone}
                                    </a>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="nav-item" onClick={() => setShowCategorySheet(true)}>
                    <Filter className="nav-icon" />
                    <span className="nav-label">{isRTL ? 'تصفية الفئات' : 'Filter Categories'}</span>
                </div>
                {config.orders_enabled !== false && (
                    <div className="nav-item" onClick={() => setIsCartOpen(true)}>
                        <ShoppingCart className="nav-icon" />
                        <span className="nav-label">{isRTL ? 'السلة' : 'Cart'}</span>
                        {cart.length > 0 && <span className="nav-badge">{cart.length}</span>}
                    </div>
                )}
            </nav>

            {/* FABs */}
            <div className="fab-container">
                <button className="fab fab-whatsapp" onClick={() => window.open(`https://wa.me/${config.whatsapp_number?.replace('+', '')}`, '_blank')}>
                    <FaWhatsapp size={20} />
                </button>
                <button className={`fab fab-scroll ${showScrollTop ? 'show' : ''}`} onClick={scrollToTop}>
                    <ChevronUp size={20} />
                </button>
            </div>

            {/* Toast */}
            {toastMsg && (
                <div className={`toast-notification show ${toastType === 'error' ? 'error' : ''}`}>
                    <Info size={16} />
                    <span>{toastMsg}</span>
                </div>
            )}

            {/* Modals Overlay Base */}

            {/* Share Modal */}
            {showShareModal && (
                <div className="modal-overlay open" onClick={() => setShowShareModal(false)}>
                    <div className="modal-content-sheet" onClick={e => e.stopPropagation()}>
                        <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#25D366', color: 'white' }}>
                            <h3 className="font-bold">{isRTL ? 'مشاركة المطعم' : 'Share Restaurant'}</h3>
                            <button onClick={() => setShowShareModal(false)}><X size={20} /></button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex gap-4 p-4 bg-gray-50 rounded-lg items-center">
                                <Image src={config.logo_url || ''} width={50} height={50} alt="Logo" className="rounded-md object-cover" />
                                <div>
                                    <h4 className="font-bold">{config.name}</h4>
                                    <p className="text-xs text-gray-500">{window.location.href}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3 text-center">
                                <div className="p-3 bg-gray-50 rounded-lg text-[#25D366] cursor-pointer border" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`)}>
                                    <FaWhatsapp size={24} className="mx-auto mb-1" />
                                    <span className="text-[10px] text-gray-800">{isRTL ? 'واتساب' : 'WhatsApp'}</span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg text-[#1877F2] cursor-pointer border" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}>
                                    <FaFacebook size={24} className="mx-auto mb-1" />
                                    <span className="text-[10px] text-gray-800">{isRTL ? 'فيسبوك' : 'FB'}</span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg text-[#1DA1F2] cursor-pointer border" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`)}>
                                    <FaTwitter size={24} className="mx-auto mb-1" />
                                    <span className="text-[10px] text-gray-800">{isRTL ? 'تويتر' : 'Twitter'}</span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg text-blue-500 cursor-pointer border" onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`)}>
                                    <FaTelegram size={24} className="mx-auto mb-1" />
                                    <span className="text-[10px] text-gray-800">{isRTL ? 'تلغرام' : 'Telegram'}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" readOnly value={window.location.href} className="flex-1 bg-gray-100 p-3 rounded-lg text-xs outline-none" dir="ltr" />
                                <button className="bg-primary text-white px-4 rounded-lg font-bold text-sm" style={{ backgroundColor: primaryColor }} onClick={(e) => copyToClipboard(window.location.href, e)}>
                                    {isRTL ? 'نسخ' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Filter Modal */}
            {showCategorySheet && (
                <div className="modal-overlay open !items-center" onClick={() => setShowCategorySheet(false)}>
                    <div className="modal-content-sheet !rounded-xl !transform-none !transition-none max-h-[80vh] w-[90%] mx-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-4 flex items-center justify-between border-b">
                            <h3 className="font-bold text-gray-800">{isRTL ? 'تصفية حسب الفئة' : 'Filter by Category'}</h3>
                            <button onClick={() => setShowCategorySheet(false)} className="text-gray-500"><X size={20} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[50vh]">
                            <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
                                <div className={`p-3 border rounded-lg cursor-pointer ${activeCategory === 'all' ? 'bg-primary text-white' : 'bg-white'}`}
                                    style={activeCategory === 'all' ? { backgroundColor: primaryColor, color: 'white' } : {}}
                                    onClick={() => { setActiveCategory('all'); setShowCategorySheet(false); }}>
                                    {isRTL ? 'الكل' : 'All'}
                                </div>
                                {categories.map(c => (
                                    <div key={c.id} className={`p-3 border rounded-lg cursor-pointer flex items-center justify-center`}
                                        style={activeCategory === c.id.toString() ? { backgroundColor: primaryColor, color: 'white' } : { borderColor: '#eee' }}
                                        onClick={() => { setActiveCategory(c.id.toString()); setShowCategorySheet(false); }}>
                                        {catName(c)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add To Cart / Item Selection Modal */}
            {selectedItem && (
                <div className="modal-overlay open" onClick={closeModal}>
                    <div className="modal-content-sheet max-w-[450px]" onClick={e => e.stopPropagation()}>
                        <div className="relative h-48 w-full bg-gray-100">
                            <Image src={selectedItem.item.image_url || selectedItem.cImage || '/placeholder.jpg'} alt="Item" fill className="object-cover rounded-t-lg" />
                            <button onClick={closeModal} className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-md">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 pb-24">
                            <h2 className="text-xl font-bold mb-1 text-gray-800">{itemName(selectedItem.item)}</h2>
                            <p className="text-gray-500 text-sm mb-4">{isRTL ? selectedItem.item.description_ar : (selectedItem.item.description_en || selectedItem.item.description_ar)}</p>

                            {/* Sizes */}
                            {selectedItem.item.prices && selectedItem.item.prices.length > 0 && (
                                <div className="mb-5">
                                    <h3 className="font-bold text-sm mb-3">{isRTL ? 'اختر الحجم' : 'Select Size'}</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedItem.item.prices.map((p, idx) => {
                                            const label = selectedItem.item.size_labels?.[idx] || (isRTL ? `حجم ${idx + 1}` : `Size ${idx + 1}`);
                                            return (
                                                <label key={idx} className="flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all"
                                                    style={{ borderColor: sizeIdx === idx ? primaryColor : "#eee", backgroundColor: sizeIdx === idx ? `${primaryColor}10` : 'transparent' }}
                                                    onClick={() => setSizeIdx(idx)}>
                                                    <span className="font-bold text-base mb-1">{label}</span>
                                                    <span className="text-sm font-semibold" style={{ color: primaryColor }}>{cur} {p}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Extras */}
                            {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                <div className="mb-5">
                                    <h3 className="font-bold text-sm mb-3">{isRTL ? 'إضافات (اختياري)' : 'Extras (Optional)'}</h3>
                                    <div className="space-y-2">
                                        {selectedItem.item.extras.map((ext, idx) => {
                                            const id = `ext-${idx}`;
                                            const isSel = selectedExtras.some(e => e.id === id);
                                            return (
                                                <label key={idx} className="flex items-center justify-between p-3 rounded-xl border cursor-pointer"
                                                    style={{ borderColor: "#eee", backgroundColor: isSel ? `${primaryColor}05` : 'transparent' }}>
                                                    <input type="checkbox" className="hidden" checked={isSel}
                                                        onChange={() => {
                                                            if (isSel) setSelectedExtras(p => p.filter(e => e.id !== id));
                                                            else setSelectedExtras(p => [...p, { id, name_ar: ext.name_ar, name_en: ext.name_en, price: ext.price }]);
                                                        }} />
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-5 h-5 rounded border flex items-center justify-center" style={{ backgroundColor: isSel ? primaryColor : 'transparent', borderColor: isSel ? primaryColor : '#ddd' }}>
                                                            {isSel && <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>}
                                                        </div>
                                                        <span className="text-sm font-semibold">{isRTL ? ext.name_ar : (ext.name_en || ext.name_ar)}</span>
                                                    </div>
                                                    <span className="text-xs font-bold" style={{ color: primaryColor }}>{ext.price > 0 ? `+${cur} ${ext.price}` : (isRTL ? 'مجاناً' : 'Free')}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="mb-5">
                                <h3 className="font-bold text-sm mb-3">{isRTL ? 'ملاحظات خاصة' : 'Special Instructions'}</h3>
                                <textarea className="w-full border rounded-xl p-3 text-sm outline-none bg-gray-50 h-24 resize-none"
                                    placeholder={isRTL ? 'بدون بصل، اكسترا صوص...' : 'No onions, extra sauce...'}
                                    value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>

                        </div>

                        {/* Modal Footer */}
                        {config.orders_enabled !== false && (
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex items-center gap-4 z-10 shadow-[0_-10px_15px_rgba(0,0,0,0.05)] rounded-b-lg">
                                <div className="flex items-center bg-gray-100 rounded-xl max-w-[120px] w-full p-1 border">
                                    <button className="w-10 h-10 flex items-center justify-center text-gray-600 font-bold text-lg" onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
                                    <span className="flex-1 text-center font-bold">{qty}</span>
                                    <button className="w-10 h-10 flex items-center justify-center text-gray-600 font-bold text-lg" onClick={() => setQty(qty + 1)}>+</button>
                                </div>
                                <button className="flex-1 h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
                                    style={{ backgroundColor: primaryColor }} onClick={addToCart}>
                                    <span>{isRTL ? 'إضافة للسلة' : 'Add to Cart'}</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                                        {cur} {((selectedItem.item.prices ? parseFloat(selectedItem.item.prices[sizeIdx]?.toString() || "0") : 0) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {isCartOpen && (
                <div className="modal-overlay open" onClick={() => setIsCartOpen(false)}>
                    <div className="bg-white w-full max-w-[450px] h-[90vh] rounded-t-2xl shadow-2xl flex flex-col transform transition-transform" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ShoppingCart style={{ color: primaryColor }} />
                                {isRTL ? 'سلة الطلبات' : 'Your Cart'}
                            </h2>
                            <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-500 border">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50/50">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50">
                                    <ShoppingCart size={80} />
                                    <p className="font-medium text-lg text-black">{isRTL ? 'السلة فارغة' : 'Cart is empty'}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6">
                                    <div className="space-y-4">
                                        {cart.map((c, i) => (
                                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 relative">
                                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    <Image src={c.item.image_url || '/placeholder.jpg'} alt="Item" width={64} height={64} className="object-cover w-full h-full" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-bold text-sm text-gray-800 line-clamp-1 pr-4">{itemName(c.item)}</h4>
                                                        <button onClick={() => updateCartQty(c.id, -c.quantity)} className="text-red-400 absolute top-4 right-4"><X size={16} /></button>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mb-2">{c.size_label}{c.extras && c.extras.length > 0 ? ` + ${c.extras.length} ${isRTL ? 'إضافات' : 'extras'}` : ''}</p>
                                                    <div className="flex items-center justify-between mt-auto">
                                                        <span className="font-bold text-sm" style={{ color: primaryColor }}>{cur} {c.price}</span>
                                                        <div className="flex items-center bg-gray-50 rounded-lg p-1 border">
                                                            <button className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 font-bold" onClick={() => updateCartQty(c.id, -1)}>-</button>
                                                            <span className="w-6 text-center font-bold text-xs">{c.quantity}</span>
                                                            <button className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 font-bold" onClick={() => updateCartQty(c.id, 1)}>+</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>


                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-5 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] border-t z-20 bg-white rounded-b-2xl">
                                <div className="flex justify-between items-center mb-4 text-sm font-bold text-gray-800">
                                    <span>{isRTL ? 'المجموع الكلي' : 'Total Amount'}</span>
                                    <span className="text-2xl font-black" style={{ color: primaryColor }}>{cur} {cartTotal}</span>
                                </div>
                                <button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full flex justify-center items-center gap-2 h-14 rounded-xl text-white font-bold text-base shadow-md" style={{ backgroundColor: '#10b981' }}>
                                    {isRTL ? 'إتمام الطلب' : 'Proceed to Checkout'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <CheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                cartItems={cart.map(c => ({
                    id: c.id,
                    title: isRTL ? c.item.title_ar : c.item.title_en || c.item.title_ar,
                    qty: c.quantity,
                    price: c.price,
                    size: c.size_label,
                    category: c.category_name,
                }))}
                subtotal={cartTotal}
                restaurantId={restaurantId}
                restaurantName={config.name}
                whatsappNumber={config.whatsapp_number || config.phone}
                currency={cur || 'ج.م'}
                language={isRTL ? 'ar' : 'en'}
                onOrderSuccess={() => { setCart([]); setIsCartOpen(false); }}
            />
        </div>
    );
}
