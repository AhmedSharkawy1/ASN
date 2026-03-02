/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import SharedMarquee from './SharedMarquee';
import CheckoutModal from './CheckoutModal';
import Image from "next/image";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode, Pagination } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/pagination';

import {
    ShoppingCart,
    Share2,
    MapPin,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Clipboard,
    Plus,
    Minus,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Info,
    X,
    FileText
} from "lucide-react";
import { FaWhatsapp, FaFacebookF, FaInstagram, FaSnapchatGhost } from 'react-icons/fa';
import { PhoneCall } from 'lucide-react';

// --- Local Types ---
type MenuItem = {
    id: string | number;
    title_ar: string;
    title_en?: string;
    name?: string; // some themes use name instead of title_ar
    description_ar?: string;
    description_en?: string;
    description?: string;
    image?: string;
    image_url?: string;
    prices: number[];
    price?: number;
    size_labels?: string[];
    extras?: { id?: number | string; name_ar: string; name_en?: string; price: number }[];
    is_available?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

interface CategoryWithItemsType {
    id: string | number;
    name_ar: string;
    name_en?: string;
    name?: string;
    marquee_enabled?: boolean;
    marquee_text_ar?: string;
    marquee_text_en?: string;
    orders_enabled?: boolean;
    items?: MenuItem[];
    image_url?: string;
    icon?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface RestaurantType {
    name: string;
    theme?: string;
    theme_colors?: {
        main_color?: string;
        bg_color?: string;
        text_color?: string;
    };
    cover_images?: string[];
    logo_url?: string;
    cover_url?: string;
    phone?: string;
    currency?: string;
    default_language?: string;
    location_text?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface Theme14MenuProps {
    config: RestaurantType;
    categories: CategoryWithItemsType[];
    restaurantId: string;
}

export default function Theme14Menu({ config, categories, restaurantId }: Theme14MenuProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const language = config?.default_language || 'ar';
    const isRTL = language === "ar" || true; // Force RTL for Arabic themes
    const cur = config?.currency || 'SAR';

    // Custom states
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; catName: string; catImg?: string } | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPhoneMenuOpen, setIsPhoneMenuOpen] = useState(false);

    // Checkout & Cart State
    const [showCheckout, setShowCheckout] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
    const [cart, setCart] = useState<{ id: string, item: MenuItem, catName: string, price: number, sizeLabel: string, quantity: number, notes: string }[]>([]);

    // Item detail state
    const [qty, setQty] = useState(1);
    const [sizeIdx, setSizeIdx] = useState(0);
    const [notes, setNotes] = useState('');
    const [selectedExtras, setSelectedExtras] = useState<{ id: number | string, name: string, price: number }[]>([]);

    useEffect(() => {
        const handleScroll = () => { setIsScrolled(window.scrollY > 100); };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Theme 14 colors (fallback to typical defaults if not provided in theme_colors)
    const primaryColor = config?.theme_colors?.main_color || "#e67e22";
    const secondaryColor = config?.theme_colors?.text_color || "#2c3e50";
    const backgroundColor = config?.theme_colors?.bg_color || "#f8f9fa";

    const extendedCategories = [{ id: "all", name_ar: "الكل", name_en: "All", icon: "🏠" }, ...categories];
    const allItems = categories.flatMap((c: CategoryWithItemsType) => c.items || []);
    const featuredItems = allItems.slice(0, 5);

    // Helpers
    const itemName = (item: MenuItem) => isRTL ? (item.title_ar || item.name || '') : (item.title_en || item.title_ar || item.name || '');
    const catName = (cat: CategoryWithItemsType) => isRTL ? (cat.name_ar || cat.name || '') : (cat.name_en || cat.name_ar || cat.name || '');
    const itemPrice = (item: MenuItem, idx: number = 0) => item.prices?.[idx] || item.price || 0;

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    const copyToClipboard = (text: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        showToast(isRTL ? "تم نسخ محتوى القائمة إلى الحافظة!" : "Copied to clipboard!");
    };

    const handleShareWhatsApp = () => {
        const text = isRTL
            ? `🔖 ${config?.name || "المطعم"}\n\nتصفح القائمة:\n${window.location.href}`
            : `🔖 ${config?.name || "Restaurant"}\n\nBrowse menu:\n${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    // ── CART HANDLING ──
    const openModal = (item: any, catName: string, catImg?: string) => {
        if (config.orders_enabled === false) return;
        setSelectedItem({ item, catName, catImg });
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
        const iP = itemPrice(selectedItem.item, sizeIdx);
        const extP = selectedExtras.reduce((sum, e) => sum + e.price, 0);
        const finalPrice = iP + extP;

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
        showToast(isRTL ? 'تمت الإضافة إلى السلة بنجاح' : 'Added to cart successfully');
    };

    const updateQty = (id: string, itemNotes: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id === id && c.notes === itemNotes) {
                const n = c.quantity + delta;
                return n > 0 ? { ...c, quantity: n } : c;
            }
            return c;
        }).filter(c => c.quantity > 0));
    };

    const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
    const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const checkOutWhatsApp = () => {
        if (!config.phone) {
            alert(isRTL ? 'رقم المطعم غير متوفر' : 'Restaurant phone unavailable');
            return;
        }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            alert(isRTL ? 'يرجى إكمال بيانات التوصيل' : 'Please complete delivery details');
            return;
        }

        let txt = isRTL ? `*طلب جديد من ${customerInfo.name}*%0A` : `*New Order from ${customerInfo.name}*%0A`;
        txt += isRTL ? `رقم الهاتف: ${customerInfo.phone}%0A` : `Phone: ${customerInfo.phone}%0A`;
        txt += isRTL ? `العنوان: ${customerInfo.address}%0A%0A` : `Address: ${customerInfo.address}%0A%0A`;

        cart.forEach(c => {
            txt += `▪ ${itemName(c.item)} (${c.quantity}x)\n`;
            if (c.sizeLabel) txt += `   ${c.sizeLabel}\n`;
            if (c.notes) txt += `   📝 ${c.notes}\n`;
            txt += `   ${cur}${(c.price * c.quantity).toFixed?.(0) || c.price * c.quantity}\n\n`;
        });

        txt += isRTL ? `*الإجمالي: ${cur}${cartTotal.toFixed?.(0) || cartTotal}*` : `*Total: ${cur}${cartTotal.toFixed?.(0) || cartTotal}*`;

        const tel = config.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`, '_blank');
    };

    const filteredItems = activeCategory === "all"
        ? allItems
        : categories.find((c: CategoryWithItemsType) => c.id.toString() === activeCategory)?.items || [];

    if (!mounted) return <div className="min-h-screen bg-slate-50" />;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const MenuItemCardInner = ({ item, catName, catImg, currency, itemName, itemDesc, onAdd, onCopy, onClick }: { item: MenuItem, catName: string, catImg?: string, currency: string, itemName: string, itemDesc: string, onAdd: any, onCopy: any, onClick: any }) => (
        <div className="menu-item" onClick={onClick}>
            <div className="menu-item-content">
                <div className="item-text" dir={isRTL ? "rtl" : "ltr"}>
                    <h3 className="item-name">{itemName}</h3>
                    <p className="item-desc">{itemDesc}</p>
                    <div className="flex flex-col gap-1 w-full max-h-[45px] overflow-y-auto pr-1 custom-scrollbar">
                        {item.prices?.map((p: number, pIdx: number) => (
                            <div key={pIdx} className="flex items-center gap-2">
                                <span className="item-price">{currency} {p?.toFixed?.(0) || p}</span>
                                {item.size_labels?.[pIdx] && (
                                    <span className="text-[10px] text-gray-500">({item.size_labels[pIdx]})</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                {config.orders_enabled !== false && (
                    <div className="item-actions">
                        <button className="action-btn cart-btn" onClick={onAdd}>
                            <Plus size={16} />
                        </button>
                    </div>
                )}
            </div>
            <div className="menu-item-image-container">
                <img src={item.image_url || catImg || '/placeholder-item.jpg'} alt={itemName} className="menu-item-image" />
            </div>
        </div>
    );

    return (
        <div dir={isRTL ? "rtl" : "ltr"} className="theme14-container relative">
            <style jsx>{`
        .theme14-container {
            --primary-color: ${primaryColor};
            --secondary-color: ${secondaryColor};
            --background-color: ${backgroundColor};
            background-color: var(--background-color);
            min-height: 100vh;
            font-family: inherit;
            padding-bottom: 80px;
        }

        .theme14-container * {
            box-sizing: border-box;
        }

        .modern-header {
            position: relative;
            height: 250px;
            background-size: cover;
            background-position: center;
            border-bottom-left-radius: 30px;
            border-bottom-right-radius: 30px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .header-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%);
        }

        .header-social-links {
            position: absolute;
            top: 20px;
            left: 20px; /* Switch left/right for RTL consistency or leave LTR depending on design */
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 20;
            direction: ltr; /* Force LTR for social links layout */
        }

        .header-content {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            display: flex;
            align-items: flex-end;
            gap: 15px;
            z-index: 2;
        }

        .store-logo-wrapper {
            width: 80px;
            height: 80px;
            border-radius: 20px;
            background: white;
            padding: 5px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            flex-shrink: 0;
            position: relative;
            overflow: hidden;
        }

        .store-logo-wrapper img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 15px;
        }

        .store-info {
            color: white;
            flex-grow: 1;
        }

        .store-title {
            font-size: 24px;
            font-weight: 800;
            margin: 0 0 5px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .badge {
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(5px);
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 5px;
            width: fit-content;
        }

        .categories-filter {
            padding: 20px;
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(248, 249, 250, 0.95);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            margin-top: -10px;
        }

        .categories-filter.floating {
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            padding: 10px 20px;
        }

        .category-pill {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            opacity: 0.7;
            border: none;
            background: transparent;
            width: 100%;
        }

        .category-pill.active {
            opacity: 1;
            transform: translateY(-2px);
        }

        .category-icon-wrapper {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            font-size: 24px;
            color: var(--primary-color);
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }

        .category-pill.active .category-icon-wrapper {
            border-color: var(--primary-color);
            background: var(--primary-color);
            color: white;
            box-shadow: 0 4px 15px rgba(var(--primary-color-rgb), 0.3);
        }

        .category-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--secondary-color);
            text-align: center;
            white-space: nowrap;
        }

        .section-title {
            padding: 0 20px;
            margin: 20px 0 15px;
            font-size: 20px;
            font-weight: 800;
            color: var(--secondary-color);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .featured-item-card {
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            height: 100%;
            display: flex;
            flex-direction: column;
            cursor: pointer;
        }

        .featured-image-container {
            position: relative;
            height: 150px;
            width: 100%;
        }
        
        .featured-image-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .featured-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--primary-color);
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 5px;
            z-index: 10;
        }

        .featured-content {
            padding: 15px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .featured-title {
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 5px;
            color: var(--secondary-color);
        }

        .featured-desc {
            font-size: 13px;
            color: #666;
            margin: 0 0 10px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .price-tag {
            font-size: 18px;
            font-weight: 800;
            color: var(--primary-color);
        }

        .add-btn {
            background: var(--primary-color);
            color: white;
            border: none;
            width: 35px;
            height: 35px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .menu-container {
            padding: 0 15px 15px;
        }

        .category-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--secondary-color);
            margin: 20px 0 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .items-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
        
        @media (min-width: 768px) {
            .items-grid {
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
            }
        }
        @media (min-width: 1024px) {
            .items-grid {
                grid-template-columns: repeat(4, 1fr);
            }
        }

        .menu-item {
            background: white;
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            border: 1px solid rgba(0,0,0,0.03);
            transition: all 0.3s ease;
            cursor: pointer;
            height: 100%;
        }

        .menu-item-content {
            flex-grow: 1;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .item-actions {
            display: flex;
            gap: 8px;
            margin-top: auto;
        }

        .action-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .cart-btn {
            background: rgba(230, 126, 34, 0.1);
            color: var(--primary-color);
        }

        .copy-btn {
            background: rgba(44, 62, 80, 0.05);
            color: var(--secondary-color);
        }

        .item-text {
            flex-grow: 1;
        }

        .item-name {
            font-size: 14px;
            font-weight: 700;
            margin: 0 0 4px;
            color: var(--secondary-color);
            line-height: 1.2;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .item-desc {
            font-size: 11px;
            color: #777;
            margin: 0 0 8px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.3;
        }

        .item-price {
            font-weight: 800;
            color: var(--primary-color);
            font-size: 15px;
        }

        .menu-item-image-container {
            width: 100%;
            height: 130px;
            flex-shrink: 0;
            position: relative;
        }

        .menu-item-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .bottom-nav {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: white;
            border-radius: 20px;
            display: flex;
            justify-content: space-around;
            padding: 10px 5px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            z-index: 100;
        }

        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            color: var(--secondary-color);
            font-size: 12px;
            font-weight: 600;
            opacity: 0.7;
            cursor: pointer;
            position: relative;
        }
        
        .nav-item.active {
            opacity: 1;
            color: var(--primary-color);
        }

        .cart-badge {
            position: absolute;
            top: -5px;
            right: 5px;
            background: #e74c3c;
            color: white;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify: center;
            font-weight: bold;
        }

        .toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: rgba(44, 62, 80, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 30px;
            font-size: 14px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 2000;
            backdrop-filter: blur(5px);
            white-space: nowrap;
        }

        .toast.show {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(0);
        }

        .fab-whatsapp {
            position: fixed;
            bottom: 100px;
            z-index: 90;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            background: linear-gradient(135deg, #25D366, #128C7E);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            cursor: pointer;
        }

        /* Cart overlay styling */
        .cart-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(5px);
            z-index: 1050;
            display: flex;
            justify-content: ${isRTL ? "flex-start" : "flex-end"};
        }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideInFromLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>

            <div className={`toast ${toastMessage ? 'show' : ''}`}>
                {toastMessage}
            </div>

            <div
                className="fab-whatsapp"
                onClick={handleShareWhatsApp}
                style={{ [isRTL ? "left" : "right"]: "15px" }}
            >
                <Share2 size={24} />
            </div>

            {/* Header */}
            <div
                className="modern-header"
                style={{ backgroundImage: `url(${config?.cover_url || config?.cover_images?.[0] || '/placeholder-cover.jpg'})` }}
            >
                <div className="header-overlay"></div>

                {/* Social and Contact Links Top Left/Right */}
                <div className="absolute top-4 z-20 flex items-center gap-2" style={{ [isRTL ? 'left' : 'right']: '20px', direction: 'ltr' }}>
                    {config.map_link ? (
                        <a href={config.map_link} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors border border-white/30">
                            <MapPin className="w-4 h-4" />
                        </a>
                    ) : (config.latitude && config.longitude && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${config.latitude},${config.longitude}`} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors border border-white/30">
                            <MapPin className="w-4 h-4" />
                        </a>
                    ))}
                    {(config.social_links?.facebook || config.facebook_url) && (
                        <a href={config.social_links?.facebook || config.facebook_url} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-[#1877f2] transition-colors border border-white/30">
                            <FaFacebookF className="text-sm md:text-base" />
                        </a>
                    )}
                    {(config.social_links?.instagram || config.instagram_url) && (
                        <a href={config.social_links?.instagram || config.instagram_url} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-[#E1306C] transition-colors border border-white/30">
                            <FaInstagram className="text-sm md:text-base" />
                        </a>
                    )}
                    {(config.social_links?.snapchat) && (
                        <a href={config.social_links?.snapchat} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-[#fffc00] hover:text-black transition-colors border border-white/30">
                            <FaSnapchatGhost className="text-sm md:text-base" />
                        </a>
                    )}
                    {(config.social_links?.whatsapp || config.whatsapp_number) && (
                        <a href={`https://wa.me/${(config.social_links?.whatsapp || config.whatsapp_number || '').replace(/\+/g, '')}`} target="_blank" rel="noreferrer" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-[#25D366] transition-colors border border-white/30">
                            <FaWhatsapp className="text-sm md:text-base" />
                        </a>
                    )}
                    {(config.phone || (config.phones && config.phones.length > 0)) && (
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setIsPhoneMenuOpen(!isPhoneMenuOpen)}
                                className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors border border-white/30"
                            >
                                <PhoneCall className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                                {isPhoneMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-auto md:right-0 w-48 bg-white rounded-xl shadow-[0_5px_20px_rgba(0,0,0,0.2)] border border-gray-100 py-2 z-[110] overflow-hidden"
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
                    )}
                </div>

                <div className="header-content">
                    <div className="store-logo-wrapper">
                        <Image
                            src={config?.logo_url || '/placeholder-logo.png'}
                            alt={config?.name || "Store Logo"}
                            fill
                        />
                    </div>
                    <div className="store-info">
                        <h1 className="store-title">{config?.name || "Restaurant Name"}</h1>
                        {config?.location_text && (
                            <div className="badge">
                                <MapPin size={12} />
                                <span>{config.location_text}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Categories Filter */}
            <div className={`categories-filter ${isScrolled ? 'floating' : ''}`}>
                <Swiper
                    slidesPerView="auto"
                    spaceBetween={10}
                    freeMode={true}
                    modules={[FreeMode]}
                    className="categories-swiper"
                    dir={isRTL ? "rtl" : "ltr"}
                >
                    {extendedCategories.map((cat: any) => (
                        <SwiperSlide key={cat.id || cat.name_en || cat.name_ar} style={{ width: '80px' }}>
                            <button
                                className={`category-pill ${activeCategory === cat.id.toString() ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.id.toString())}
                            >
                                <div className="category-icon-wrapper">
                                    {cat.image_url ? (
                                        <img src={cat.image_url} alt={catName(cat)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    ) : (cat.icon || "🍽️")}
                                </div>
                                <span className="category-name">{catName(cat)}</span>
                            </button>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>

            {/* Featured Swiper */}
            {activeCategory === "all" && featuredItems.length > 0 && (
                <div className="featured-section">
                    <h2 className="section-title">
                        <span style={{ fontSize: '24px' }}>🔥</span>
                        {isRTL ? "الأكثر مبيعاً" : "Featured Items"}
                    </h2>
                    <div style={{ padding: '0 0 20px 0' }}>
                        <Swiper
                            slidesPerView={1.2}
                            spaceBetween={20}
                            centeredSlides={true}
                            loop={featuredItems.length > 1}
                            autoplay={{ delay: 3000, disableOnInteraction: false }}
                            pagination={{ clickable: true }}
                            modules={[Autoplay, Pagination]}
                            className="featured-swiper"
                            breakpoints={{ 768: { slidesPerView: 2, spaceBetween: 30 } }}
                        >
                            {featuredItems.map((item: MenuItem, idx: number) => (
                                <SwiperSlide key={`featured-${item.id || idx}`}>
                                    <div className="featured-item-card" onClick={() => openModal(item, "Featured", categories.find(c => c.items?.some(i => i.id === item.id))?.image_url)}>
                                        <div className="featured-image-container">
                                            <Image
                                                src={item.image_url || categories.find(c => c.items?.some(i => i.id === item.id))?.image_url || '/placeholder-item.jpg'}
                                                alt={itemName(item)}
                                                fill
                                            />
                                            <div className="featured-badge">
                                                <span>★</span> Top
                                            </div>
                                        </div>
                                        <div className="featured-content">
                                            <div>
                                                <h3 className="featured-title">{itemName(item)}</h3>
                                                <p className="featured-desc">
                                                    {isRTL ? item.description_ar : (item.description_en || item.description_ar || item.description)}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-end mt-auto pt-2">
                                                <div className="flex flex-col gap-1 w-full max-h-[45px] overflow-y-auto pr-1">
                                                    {item.prices?.map((p: number, pIdx: number) => (
                                                        <div key={pIdx} className="flex items-center gap-2">
                                                            <span className="price-tag text-sm md:text-base">{cur} {p?.toFixed?.(0) || p}</span>
                                                            {item.size_labels?.[pIdx] && (
                                                                <span className="text-[10px] text-gray-500">({item.size_labels[pIdx]})</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                {config.orders_enabled !== false && (
                                                    <button className="add-btn" onClick={(e) => { e.stopPropagation(); openModal(item, "Featured", item.image_url); }}>
                                                        <Plus size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            )}

            {/* Main Menu Grid / List */}
            <div className="menu-container">
                {activeCategory === "all" ? (
                    categories.map((cat: CategoryWithItemsType, i: number) => (
                        <div key={cat.id || i}>
                            <h3 className="category-title">
                                <span>{cat.icon || "📁"}</span>
                                {catName(cat)}
                            </h3>
                            <div className="items-grid">
                                {cat.items?.map((item: MenuItem, idx: number) => (
                                    <MenuItemCardInner
                                        key={item.id || idx}
                                        item={item}
                                        catName={catName(cat)}
                                        catImg={cat.image_url}
                                        currency={cur}
                                        itemName={itemName(item)}
                                        itemDesc={isRTL ? (item.description_ar || '') : (item.description_en || item.description_ar || item.description || '')}
                                        onAdd={(e: any) => { e.stopPropagation(); openModal(item, catName(cat), cat.image_url); }}
                                        onCopy={(e: any) => copyToClipboard(`${itemName(item)}\n${itemPrice(item)} ${cur}`, e)}
                                        onClick={() => openModal(item, catName(cat), cat.image_url)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div>
                        <h3 className="category-title">
                            {categories.find((c: CategoryWithItemsType) => c.id.toString() === activeCategory) && catName(categories.find((c: CategoryWithItemsType) => c.id.toString() === activeCategory)!)}
                        </h3>
                        <div className="items-grid">
                            {filteredItems.map((item: MenuItem, idx: number) => {
                                const cat = categories.find((c: CategoryWithItemsType) => c.id.toString() === activeCategory);
                                return (
                                    <MenuItemCardInner
                                        key={item.id || idx}
                                        item={item}
                                        catName={cat ? catName(cat) : "Category"}
                                        catImg={cat?.image_url}
                                        currency={cur}
                                        itemName={itemName(item)}
                                        itemDesc={isRTL ? (item.description_ar || '') : (item.description_en || item.description_ar || item.description || '')}
                                        onAdd={(e: any) => { e.stopPropagation(); openModal(item, cat ? catName(cat) : "Category", cat?.image_url); }}
                                        onCopy={(e: any) => copyToClipboard(`${itemName(item)}\n${itemPrice(item)} ${cur}`, e)}
                                        onClick={() => openModal(item, cat ? catName(cat) : "Category", cat?.image_url)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Nav Dock */}
            <div className="bottom-nav" dir={isRTL ? "rtl" : "ltr"}>
                <div className="nav-item" onClick={() => setIsPhoneMenuOpen(true)}>
                    <PhoneCall size={24} />
                    <span>{isRTL ? "اتصل" : "Call"}</span>
                </div>
                <div className="nav-item active">
                    <ShoppingCart size={24} />
                    <span>{isRTL ? "القائمة" : "Menu"}</span>
                </div>
                {config.orders_enabled !== false && (
                    <div className="nav-item " onClick={() => setIsCartOpen(true)}>
                        <div style={{ position: 'relative' }}>
                            <ShoppingCart size={24} />
                            {cartCount > 0 && (
                                <span className="cart-badge">
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <span>{isRTL ? "عربة التسوق" : "Cart"}</span>
                    </div>
                )}
            </div>

            {/* Item Details Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-[1050] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal} style={{ animation: "fadeIn 0.2s" }}>
                    <div className="bg-white w-full max-w-[600px] max-h-[90vh] overflow-y-auto relative pb-8 rounded-t-[30px]" onClick={e => e.stopPropagation()} style={{ animation: "slideUp 0.3s ease-out" }}>
                        <div className="w-[40px] h-[5px] bg-gray-200 rounded-[5px] mx-auto my-[15px]"></div>
                        <button className="absolute top-[20px] right-[20px] bg-white/90 text-[var(--secondary-color)] w-[40px] h-[40px] rounded-full flex items-center justify-center shadow-md z-10" onClick={closeModal}>
                            <X size={20} />
                        </button>
                        <div className="w-full h-[250px] relative">
                            <img src={selectedItem.item.image_url || selectedItem.catImg || '/placeholder-item.jpg'} alt={itemName(selectedItem.item)} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-5">
                            <h2 className="text-[24px] font-[800] text-[var(--secondary-color)] mb-2">{itemName(selectedItem.item)}</h2>
                            <p className="text-[15px] mb-5 text-gray-500">
                                {isRTL ? selectedItem.item.description_ar : (selectedItem.item.description_en || selectedItem.item.description_ar || selectedItem.item.description)}
                            </p>
                            <div className="text-[22px] font-[800] text-[var(--primary-color)] mb-5">{cur} {itemPrice(selectedItem.item, sizeIdx).toFixed?.(0) || itemPrice(selectedItem.item, sizeIdx)}</div>

                            {/* Sizes */}
                            {selectedItem.item.prices?.length > 1 && (
                                <div className="mb-5">
                                    <h3 className="font-bold text-sm mb-3 text-gray-600">{isRTL ? 'اختر الحجم' : 'Select Size'}</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedItem.item.prices.map((p, idx) => {
                                            const label = selectedItem.item.size_labels?.[idx] || (isRTL ? `حجم ${idx + 1}` : `Size ${idx + 1}`);
                                            return (
                                                <label key={idx} className="flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-center relative overflow-hidden"
                                                    style={{ borderColor: sizeIdx === idx ? primaryColor : "#eee", backgroundColor: sizeIdx === idx ? `${primaryColor}10` : 'transparent' }}
                                                    onClick={() => setSizeIdx(idx)}>
                                                    <span className="font-bold text-sm mb-1">{label}</span>
                                                    <span className="text-xs font-medium" style={{ color: primaryColor }}>{cur} {p}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Extras */}
                            {selectedItem.item.extras && selectedItem.item.extras.length > 0 && (
                                <div className="mb-5">
                                    <h3 className="font-bold text-sm mb-3 text-gray-600">{isRTL ? 'إضافات (اختياري)' : 'Extras (Optional)'}</h3>
                                    <div className="space-y-2">
                                        {selectedItem.item.extras.map((ext, idx) => {
                                            const id = ext.id || idx;
                                            const isSel = selectedExtras.some(e => e.id === id);
                                            return (
                                                <label key={idx} className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors"
                                                    style={{ borderColor: "#eee", backgroundColor: isSel ? `${primaryColor}05` : 'transparent' }}>
                                                    <input type="checkbox" className="hidden" checked={isSel}
                                                        onChange={() => {
                                                            if (isSel) setSelectedExtras(p => p.filter(e => e.id !== id));
                                                            else setSelectedExtras(p => [...p, { id: id as any, name: isRTL ? ext.name_ar : (ext.name_en || ext.name_ar), price: ext.price }]);
                                                        }} />
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                                                            style={{ borderColor: isSel ? primaryColor : "#ddd", backgroundColor: isSel ? primaryColor : 'transparent' }}>
                                                            {isSel && <Plus className="w-3 h-3 text-white" style={{ transform: 'rotate(45deg)' }} />}
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
                            <div className="mb-6">
                                <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-gray-600">
                                    <FileText className="w-4 h-4" />
                                    {isRTL ? 'ملاحظات إضافية' : 'Special Instructions'}
                                </h3>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder={isRTL ? 'مثال: بدون بصل، زيادة صوص...' : 'e.g., no onions, extra sauce...'}
                                    className="w-full rounded-xl p-3 outline-none resize-none h-24 text-sm border focus:border-[var(--primary-color)] transition-all bg-gray-50 border-gray-200" />
                            </div>

                            {/* Sticky Modal Footer */}
                            {config.orders_enabled !== false && (
                                <div className="flex gap-4 items-center mt-6">
                                    <div className="flex items-center bg-gray-100 rounded-lg h-14 px-2">
                                        <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded shrink-0 flex items-center justify-center text-gray-500 hover:bg-white shadow-sm transition-colors">
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="w-10 text-center font-bold text-lg">{qty}</span>
                                        <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded shrink-0 flex items-center justify-center text-gray-500 hover:bg-white shadow-sm transition-colors">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <button
                                        className="flex-1 rounded-[15px] h-14 text-white font-[bold] text-[18px] flex justify-center items-center gap-[10px] cursor-pointer"
                                        style={{ background: primaryColor }}
                                        onClick={addToCart}
                                    >
                                        <ShoppingCart size={20} />
                                        {isRTL ? "أضف بـ" : "Add for"} {cur} {(((itemPrice(selectedItem.item, sizeIdx)) + selectedExtras.reduce((s, e) => s + e.price, 0)) * qty).toFixed?.(0)}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {isCartOpen && (
                <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
                    <div
                        className="w-full max-w-[420px] h-full flex flex-col shadow-2xl relative bg-white overflow-hidden"
                        style={{ animation: isRTL ? "slideInFromRight 0.3s ease-out" : "slideInFromLeft 0.3s ease-out" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 flex justify-between items-center text-white shadow-md z-10" style={{ backgroundColor: primaryColor }}>
                            <div className="flex items-center gap-3">
                                <ShoppingCart className="w-6 h-6" />
                                <div>
                                    <h2 className="font-bold text-lg leading-tight m-0">{isRTL ? 'عربة التسوق' : 'Shopping Cart'}</h2>
                                    <p className="text-xs opacity-90 m-0">{cartCount} {isRTL ? 'منتجات' : 'items'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCartOpen(false)} className="bg-white/20 p-2 rounded-full"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-20 text-gray-500">
                                    <h3 className="font-bold text-xl mb-2">{isRTL ? 'السلة فارغة!' : 'Cart is Empty!'}</h3>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        {cart.map((c, i) => (
                                            <div key={i} className="flex gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                                                <div className="w-[70px] h-[70px] shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                                    <img src={c.item.image_url || '/placeholder-item.jpg'} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-between pt-1">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div>
                                                            <h4 className="font-semibold text-sm line-clamp-1">{itemName(c.item)}</h4>
                                                            {(c.sizeLabel || c.notes) && (
                                                                <p className="text-[10px] mt-1 space-y-0.5 leading-tight text-gray-500">
                                                                    {c.sizeLabel && <span className="block">{c.sizeLabel}</span>}
                                                                    {c.notes && <span className="block italic">📝 {c.notes}</span>}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button onClick={() => updateQty(c.id, c.notes, -c.quantity)} className="text-red-400 p-1 shrink-0"><X className="w-4 h-4" /></button>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="font-bold text-sm" style={{ color: primaryColor }}>{cur} {(c.price * c.quantity).toFixed?.(0)}</span>
                                                        <div className="flex items-center bg-gray-100 rounded px-1 py-0.5 border">
                                                            <button onClick={() => updateQty(c.id, c.notes, -1)} className="w-6 h-6 flex justify-center items-center"><Minus className="w-3 h-3" /></button>
                                                            <span className="w-6 text-center text-xs font-bold">{c.quantity}</span>
                                                            <button onClick={() => updateQty(c.id, c.notes, 1)} className="w-6 h-6 flex justify-center items-center"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>


                                </>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-5 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] border-t z-20 bg-white">
                                <div className="flex justify-between items-center mb-4 text-sm font-bold text-gray-800">
                                    <span>{isRTL ? 'المجموع الكلي' : 'Total Amount'}</span>
                                    <span className="text-2xl font-black" style={{ color: primaryColor }}>{cur} {cartTotal.toFixed?.(0)}</span>
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
                    size: c.sizeLabel,
                    category: c.catName,
                }))}
                subtotal={cartTotal}
                restaurantId={restaurantId}
                restaurantName={config.name}
                whatsappNumber={config.whatsapp_number || config.phone}
                currency={cur || 'ج.م'}
                language={language}
                onOrderSuccess={() => { setCart([]); setIsCartOpen(false); }}
            />

        </div>
    );
}
