"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/context/LanguageContext";
import { notFound } from "next/navigation";
import { Search, MapPin, Phone, Utensils, ShoppingCart, X, Instagram, Facebook } from "lucide-react";
import { FaTiktok } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import PizzaPastaMenu from "@/components/menu/PizzaPastaMenu";
import AtyabOrientalMenu from "@/components/menu/AtyabOrientalMenu";
import BabAlHaraMenu from "@/components/menu/BabAlHaraMenu";
import AtyabEtoileMenu from "@/components/menu/AtyabEtoileMenu";
import Theme5Menu from "@/components/menu/Theme5Menu";
import Theme6Menu from "@/components/menu/Theme6Menu";
import Theme7Menu from "@/components/menu/Theme7Menu";
import { PaymentMethodEntry } from "@/app/dashboard/settings/page";

type Item = {
    id: string;
    title_ar: string;
    title_en?: string;
    desc_ar?: string;
    desc_en?: string;
    prices: number[];
    size_labels: string[];
    is_popular: boolean;
    is_spicy: boolean;
    image_url?: string;
    is_available: boolean;
};

type Category = {
    id: string;
    name_ar: string;
    name_en?: string;
    emoji?: string;
    image_url?: string;
    items: Item[];
};

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
    phone_numbers?: { label: string; number: string }[];
    payment_methods?: PaymentMethodEntry[];
};

type CartItem = {
    id: string;
    item: Item;
    price: number;
    size_label: string;
    quantity: number;
};

export default function SmartMenuPage({ params }: { params: { restaurantId: string } }) {
    const { language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<RestaurantConfig | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Cart & Modal State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: Item, cName: string } | null>(null);
    const [tempSizeIdx, setTempSizeIdx] = useState(0);

    // Customer Info for Order
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });

    useEffect(() => {
        const fetchPublicMenu = async () => {
            try {
                const { data: restData } = await supabase
                    .from('restaurants')
                    .select('name, theme, phone, whatsapp_number, facebook_url, instagram_url, tiktok_url, map_link, logo_url, cover_url, cover_images, working_hours, phone_numbers, payment_methods')
                    .eq('id', params.restaurantId)
                    .single();

                if (!restData) {
                    notFound();
                    return;
                }
                setConfig(restData);

                const { data: catsData } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('restaurant_id', params.restaurantId)
                    .order('sort_order', { ascending: true });

                if (catsData && catsData.length > 0) {
                    const catIds = catsData.map(c => c.id);
                    const { data: itemsData } = await supabase
                        .from('items')
                        .select('*')
                        .in('category_id', catIds)
                        .eq('is_available', true);

                    const formattedData: Category[] = catsData.map(cat => ({
                        id: cat.id,
                        name_ar: cat.name_ar,
                        name_en: cat.name_en,
                        emoji: cat.emoji,
                        image_url: cat.image_url,
                        items: itemsData ? itemsData.filter(i => i.category_id === cat.id) : []
                    }));

                    setCategories(formattedData);
                    setActiveCategory(formattedData[0].id);
                }
            } catch (error) {
                console.error("Failed to load menu", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPublicMenu();
    }, [params.restaurantId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 border-4 border-blue border-t-transparent rounded-full animate-spin"></div>
                <p className="text-silver font-medium animate-pulse">
                    {language === "ar" ? "جاري تحضير المنيو المذهل..." : "Preparing Amazing Menu..."}
                </p>
            </div>
        );
    }

    if (!config || categories.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
                <div className="max-w-md">
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        {language === "ar" ? "المنيو غير متاح" : "Menu Unavailable"}
                    </h1>
                    <p className="text-silver">
                        {language === "ar" ? "عذراً، هذا المطعم لم يقم بإضافة أي أصناف بعد." : "Sorry, this restaurant hasn't added any items yet."}
                    </p>
                </div>
            </div>
        );
    }

    // If PizzaPasta theme, render the dedicated full-layout component
    if (config?.theme === 'pizzapasta') {
        return <PizzaPastaMenu config={config} categories={categories} language={language} />;
    }

    // If Atyab Oriental theme
    if (config?.theme === 'atyab-oriental') {
        return <AtyabOrientalMenu config={config} categories={categories} language={language} />;
    }

    // If Bab Al-Hara theme
    if (config?.theme === 'bab-alhara') {
        return <BabAlHaraMenu config={config} categories={categories} language={language} />;
    }

    // If Atyab Etoile theme
    if (config?.theme === 'atyab-etoile') {
        return <AtyabEtoileMenu config={config} categories={categories} language={language} />;
    }

    // If Premium Theme 5
    if (config?.theme === 'theme5') {
        return <Theme5Menu config={config} categories={categories} language={language} />;
    }

    // If Veranda Theme 6
    if (config?.theme === 'theme6') {
        return <Theme6Menu config={config} categories={categories} />;
    }

    // If Haleem Dark Theme 7
    if (config?.theme === 'theme7') {
        return <Theme7Menu config={config} categories={categories} />;
    }

    // ----------------- CART LOGIC -----------------
    const openItemSelect = (item: Item, cName: string) => {
        setSelectedItem({ item, cName });
        setTempSizeIdx(0);
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const addToCart = () => {
        if (!selectedItem) return;
        const { item } = selectedItem;
        const price = item.prices ? parseFloat(item.prices[tempSizeIdx]?.toString()) : 0;
        const sizeLabel = item.size_labels ? item.size_labels[tempSizeIdx] : 'عادي';
        const cartId = `${item.id}-${sizeLabel}`;

        setCart(prev => {
            const existing = prev.find(c => c.id === cartId);
            if (existing) {
                return prev.map(c => c.id === cartId ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { id: cartId, item, price, size_label: sizeLabel, quantity: 1 }];
        });

        setSelectedItem(null);
        if (navigator.vibrate) navigator.vibrate(20);
    };

    const updateCartQty = (id: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id === id) {
                const newQty = Math.max(0, c.quantity + delta);
                return { ...c, quantity: newQty };
            }
            return c;
        }).filter(c => c.quantity > 0));
        if (navigator.vibrate) navigator.vibrate(5);
    };

    const cartTotal = cart.reduce((sum, c) => sum + (c.price * c.quantity), 0);

    const checkOutWhatsApp = () => {
        if (!config.whatsapp_number) {
            alert(language === "ar" ? "عذراً، المطعم لم يقم بتوفير رقم واتساب للطلبات." : "Sorry, the restaurant hasn't provided a WhatsApp number for orders.");
            return;
        }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            alert(language === "ar" ? "⚠️ يرجى إدخال جميع البيانات (الاسم، الموبايل، العنوان) لإتمام الطلب" : "⚠️ Please enter all details (Name, Phone, Address) to complete the order");
            return;
        }

        let message = `*🧾 فاتورة طلب جديدة - ${config.name}*\n`;
        message += `------------------------------\n`;
        message += `👤 *الاسم:* ${customerInfo.name}\n`;
        message += `📞 *الموبايل:* ${customerInfo.phone}\n`;
        message += `📍 *العنوان:* ${customerInfo.address}\n`;
        message += `------------------------------\n`;
        message += `*📋 الأصناف المطلوبة:*\n\n`;

        cart.forEach((c, idx) => {
            message += `${idx + 1}. ✨ *${language === "ar" ? c.item.title_ar : (c.item.title_en || c.item.title_ar)}*\n`;
            if (c.size_label && c.item.size_labels && c.item.size_labels.length > 1) {
                message += `   📏 الحجم: ${c.size_label}\n`;
            }
            message += `   💵 السعر: ${c.price} ج\n`;
            message += `   🔢 الكمية: ${c.quantity}\n`;
            message += `   💰 المجموع: *${c.price * c.quantity} ج*\n\n`;
        });

        message += `------------------------------\n`;
        message += `*💵 الإجمالي المطلوب: ${cartTotal} ج*\n`;
        message += `------------------------------\n`;
        message += `🚚 *تنبيه:* السعر أعلاه غير شامل قيمة التوصيل إن وجدت.\n`;

        window.open(`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        setCart([]);
        setShowCart(false);
    };
    // ---------------------------------------------

    // Filter Logic
    const activeCatData = categories.find(c => c.id === activeCategory);
    let filteredItems = activeCatData ? activeCatData.items : [];

    if (searchQuery) {
        filteredItems = categories.flatMap(c => c.items).filter(item => {
            const query = searchQuery.toLowerCase();
            return item.title_ar.toLowerCase().includes(query) || (item.title_en && item.title_en.toLowerCase().includes(query));
        });
    }

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans pb-32 transition-colors duration-500 relative">

            {/* Floating Cart Button */}
            <AnimatePresence>
                {cart.length > 0 && !showCart && !selectedItem && (
                    <motion.button
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        onClick={() => { setShowCart(true); if (navigator.vibrate) navigator.vibrate(20); }}
                        className="fixed bottom-20 right-6 z-[60] bg-blue-600 text-white shadow-2xl p-4 rounded-full flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95"
                    >
                        <div className="relative">
                            <ShoppingCart className="w-6 h-6" />
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                {cart.length}
                            </span>
                        </div>
                        <span className="font-bold whitespace-nowrap hidden sm:inline">{language === "ar" ? "إتمام الطلب" : "Checkout"}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Header Area */}
            <div className="pt-8 pb-6 px-4 md:px-6 bg-[#171717] shadow-sm relative z-10 rounded-b-[2.5rem] overflow-hidden">
                {config.cover_url && (
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <img src={config.cover_url} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="max-w-3xl mx-auto relative z-20 flex flex-col items-center text-center">
                    {config.logo_url && (
                        <div className="w-24 h-24 rounded-full border-4 border-white/10 bg-white shadow-xl overflow-hidden mb-4 p-1">
                            <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    )}
                    <h1 className="text-3xl font-black mb-2 tracking-tight">{config.name}</h1>

                    {/* Social Links Row */}
                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm opacity-80 mb-6 mt-1">
                        {config.phone && (
                            <a href={`tel:${config.phone}`} className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                                <Phone className="w-4 h-4" />
                                <span dir="ltr">{config.phone}</span>
                            </a>
                        )}
                        {config.map_link && (
                            <a href={config.map_link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors bg-blue-500/10 px-3 py-1 rounded-full">
                                <MapPin className="w-4 h-4" />
                                <span>{language === "ar" ? "الموقع" : "Location"}</span>
                            </a>
                        )}
                        {config.instagram_url && (
                            <a href={config.instagram_url} target="_blank" rel="noreferrer" className="text-pink-500 hover:scale-110 transition-transform"><Instagram className="w-5 h-5" /></a>
                        )}
                        {config.facebook_url && (
                            <a href={config.facebook_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:scale-110 transition-transform"><Facebook className="w-5 h-5" /></a>
                        )}
                        {config.tiktok_url && (
                            <a href={config.tiktok_url} target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform"><FaTiktok className="w-5 h-5" /></a>
                        )}
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-50">
                            <Search className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={language === "ar" ? "ابحث عن الأطباق..." : "Search for dishes..."}
                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#0a0a0a] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue/50 transition-all font-medium placeholder:opacity-50"
                            dir={language === "ar" ? "rtl" : "ltr"}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-6">

                {/* Horizontal Category Scroller */}
                {!searchQuery && (
                    <div className="flex overflow-x-auto hide-scrollbar gap-3 mb-8 pb-2 snap-x px-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`snap-start whitespace-nowrap px-6 py-2.5 rounded-full font-bold transition-all flex items-center gap-2 ${activeCategory === cat.id
                                    ? 'bg-blue text-white shadow-md shadow-blue/30 scale-105'
                                    : 'bg-[#171717] border border-white/10 opacity-80 hover:opacity-100 hover:border-blue/50'
                                    }`}
                            >
                                {cat.emoji && <span className="text-lg">{cat.emoji}</span>}
                                {language === "ar" ? cat.name_ar : (cat.name_en || cat.name_ar)}
                            </button>
                        ))}
                    </div>
                )}

                {/* Active Category Image Header */}
                {!searchQuery && activeCatData?.image_url && (
                    <div className="w-full h-32 md:h-48 rounded-[2rem] overflow-hidden mb-6 relative shadow-lg">
                        <img src={activeCatData.image_url} alt="Category Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                            <h2 className="text-white text-2xl font-black">{language === "ar" ? activeCatData.name_ar : (activeCatData.name_en || activeCatData.name_ar)}</h2>
                        </div>
                    </div>
                )}

                {/* Items Grid */}
                <div>
                    {searchQuery && <h3 className="font-bold text-lg mb-4 opacity-70 px-2">{language === "ar" ? "نتائج البحث" : "Search Results"}</h3>}

                    {filteredItems.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <p>{language === "ar" ? "لم يتم العثور على أطباق." : "No dishes found."}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AnimatePresence mode="popLayout">
                                {filteredItems.map((item) => (
                                    <motion.div
                                        layout
                                        onClick={() => openItemSelect(item, activeCatData?.name_ar || "")}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        key={item.id}
                                        className="bg-[#171717] border border-white/10 rounded-[2rem] p-4 flex gap-4 overflow-hidden shadow-sm cursor-pointer hover:border-blue/50 transition-all duration-300 group relative"
                                    >
                                        <div className="relative shrink-0">
                                            {item.image_url ? (
                                                <div className="w-[100px] h-[100px] rounded-2xl bg-gray-200 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
                                                    <img src={item.image_url} alt={item.title_ar} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-[100px] h-[100px] rounded-2xl bg-gray-800 flex items-center justify-center border border-white/5 opacity-80">
                                                    <Utensils className="w-8 h-8 opacity-20" />
                                                </div>
                                            )}
                                            <div className="absolute -top-2 -right-2 flex flex-col gap-1 items-end z-10">
                                                {item.is_popular && <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded shadow-sm">⭐ مميز</span>}
                                                {item.is_spicy && <span className="text-2xl drop-shadow-md">🌶️</span>}
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col justify-between py-1 min-w-0 pr-1">
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight mb-1 truncate">
                                                    {language === "ar" ? item.title_ar : (item.title_en || item.title_ar)}
                                                </h3>
                                                {(item.desc_ar || item.desc_en) && (
                                                    <p className="text-sm opacity-60 line-clamp-2 leading-relaxed">
                                                        {language === "ar" ? item.desc_ar : (item.desc_en || item.desc_ar)}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {item.prices && item.prices.length > 0 ? (
                                                    item.prices.map((p, idx) => (
                                                        <div key={idx} className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 flex flex-col sm:flex-row items-center sm:gap-2 text-center">
                                                            {item.size_labels && item.size_labels[idx] && (
                                                                <span className="text-[9px] opacity-70 font-black uppercase">{item.size_labels[idx]}</span>
                                                            )}
                                                            <span className="font-black tracking-tight text-sm text-blue-400">
                                                                {p} {language === "ar" ? "ج" : "EGP"}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-2 py-1 rounded-lg border border-white/10 bg-white/5">
                                                        <span className="font-black tracking-tight text-sm text-blue-400">
                                                            -- {language === "ar" ? "ج" : "EGP"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* --- ADD TO CART MODAL --- */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-[#171717] text-gray-100 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <button onClick={() => setSelectedItem(null)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center font-bold active:scale-95"><X className="w-5 h-5" /></button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black">{language === "ar" ? selectedItem.item.title_ar : (selectedItem.item.title_en || selectedItem.item.title_ar)}</h3>
                                    <p className="text-[10px] text-blue font-black uppercase tracking-widest">{selectedItem.cName}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                                {selectedItem.item.image_url && (
                                    <div className="w-full h-40 rounded-[1.5rem] overflow-hidden mb-6 shadow-md">
                                        <img src={selectedItem.item.image_url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}

                                <h4 className="text-sm font-black text-right mb-4 opacity-70 uppercase tracking-widest">{language === "ar" ? "اختر الحجم أو السعر الواجب" : "Select Size / Variation"}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {(selectedItem.item.prices && selectedItem.item.prices.length > 0 ? selectedItem.item.prices : [0]).map((p, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setTempSizeIdx(idx); if (navigator.vibrate) navigator.vibrate(5); }}
                                            className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1 ${tempSizeIdx === idx ? 'border-blue bg-blue/10' : 'border-transparent bg-white/5'}`}
                                        >
                                            <span className={`text-[10px] font-black uppercase ${tempSizeIdx === idx ? 'text-blue' : 'opacity-60'}`}>
                                                {selectedItem.item.size_labels?.[idx] || 'عادي'}
                                            </span>
                                            <span className="text-xl font-black tabular-nums">{p} {language === "ar" ? "ج.م" : "EGP"}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-white/5 border-t border-white/10">
                                <button
                                    onClick={addToCart}
                                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all text-lg"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    {language === "ar" ? "إضافة للطلب - " : "Add to Order - "}
                                    {selectedItem.item.prices?.[tempSizeIdx] || 0} {language === "ar" ? "ج.م" : "EGP"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* --- CART AND CHECKOUT MODAL --- */}
            <AnimatePresence>
                {showCart && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6"
                        onClick={() => setShowCart(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#171717] text-gray-100 w-full max-w-xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <button onClick={() => setShowCart(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center font-bold active:scale-95"><X className="w-5 h-5" /></button>
                                <div className="text-right">
                                    <h3 className="text-xl font-black">{language === "ar" ? "🛒 مراجعة الطلب" : "🛒 Order Review"}</h3>
                                    <p className="text-[10px] opacity-60 font-black uppercase tracking-widest mt-1">
                                        {language === "ar" ? "أكمل بياناتك للمتابعة" : "Complete details to proceed"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 no-scrollbar">
                                {/* Form */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-black text-right flex items-center justify-end gap-2">
                                        {language === "ar" ? "بيانات التوصيل" : "Delivery Details"} <MapPin className="w-4 h-4 text-blue" />
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase opacity-60 ml-2 block text-right">{language === "ar" ? "الاسم" : "Name"}</label>
                                            <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                                className="w-full bg-white/5 border border-transparent p-3.5 rounded-xl outline-none focus:border-blue transition-all font-bold text-sm"
                                                dir={language === "ar" ? "rtl" : "ltr"} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase opacity-60 ml-2 block text-right">{language === "ar" ? "الموبايل" : "Phone"}</label>
                                            <input type="tel" value={customerInfo.phone} onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                                className="w-full bg-white/5 border border-transparent p-3.5 rounded-xl outline-none focus:border-blue transition-all font-bold text-sm tabular-nums"
                                                dir="ltr" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase opacity-60 ml-2 block text-right">{language === "ar" ? "العنوان" : "Address"}</label>
                                            <textarea value={customerInfo.address} onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                                                className="w-full bg-white/5 border border-transparent p-3.5 rounded-xl outline-none focus:border-blue transition-all font-bold text-sm min-h-[80px]"
                                                dir={language === "ar" ? "rtl" : "ltr"} />
                                        </div>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-right opacity-60 uppercase tracking-widest border-b border-white/5 pb-2">
                                        {language === "ar" ? "محتويات السلة" : "Cart Items"}
                                    </h4>
                                    {cart.map((c) => (
                                        <div key={c.id} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                                            <div className="flex-1 text-right">
                                                <h4 className="font-bold text-sm">{language === "ar" ? c.item.title_ar : (c.item.title_en || c.item.title_ar)}</h4>
                                                <p className="text-[10px] opacity-70 font-bold mt-0.5">{c.size_label !== 'عادي' ? c.size_label : ''}</p>
                                                <p className="text-xs font-black mt-1 text-blue">{c.price * c.quantity} ج.م</p>
                                            </div>
                                            <div className="flex items-center gap-2.5 bg-black/40 p-1 rounded-xl shadow-sm border border-white/5">
                                                <button onClick={() => updateCartQty(c.id, 1)} className="w-7 h-7 flex items-center justify-center bg-blue text-white rounded-lg font-black text-sm">+</button>
                                                <span className="font-black text-sm tabular-nums w-4 text-center">{c.quantity}</span>
                                                <button onClick={() => updateCartQty(c.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white/10 rounded-lg font-black text-sm">-</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/10 bg-white/5">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className="flex flex-col items-start">
                                        <span className="text-2xl font-black tabular-nums text-blue">{cartTotal} {language === "ar" ? "ج.م" : "EGP"}</span>
                                        <span className="text-[9px] font-black opacity-60 uppercase tracking-widest">{language === "ar" ? "إجمالي الحساب" : "Total Amount"}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={checkOutWhatsApp}
                                    className="w-full bg-[#25D366] text-white font-black py-4 rounded-2xl shadow-lg shadow-green-500/20 active:scale-95 transition-all text-base flex items-center justify-center gap-3 hover:bg-[#20bd5a]"
                                >
                                    {language === "ar" ? "تأكيد الطلب عبر واتساب" : "Confirm via WhatsApp"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Powered By Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 text-center pb-safe z-50 pointer-events-none">
                <a href="/" target="_blank" className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-xs font-medium text-white/90 border border-white/10 shadow-lg pointer-events-auto hover:bg-black/60 transition-colors">
                    {language === "ar" ? "مدعوم بواسطة" : "Powered by"} <span className="font-bold text-blue-400">ASN Technology</span>
                </a>
            </div>

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .pb-safe {
                    padding-bottom: env(safe-area-inset-bottom, 1rem);
                }
            `}</style>
        </main>
    );
}
