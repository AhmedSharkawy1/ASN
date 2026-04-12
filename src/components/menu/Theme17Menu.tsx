"use client";

import React, {  useState, useEffect, useRef  } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import ASNFooter from './ASNFooter';
import CheckoutModal from './CheckoutModal';
import {
    ShoppingCart,
    MapPin,
    Clipboard,
    Plus,
    X,
    Info,
    Phone,
    Share2,
    Search,
    Menu as MenuIcon,
    Home,
    Clock,
    MessageCircle
} from 'lucide-react';
import { FaWhatsapp, FaTwitter, FaInstagram, FaFacebookF, FaMotorcycle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/effect-coverflow';

// Local Types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentMethodEntry = any;

type Item = {
    id: string;
    title_ar: string;
    title_en?: string;
    description_ar?: string;
    description_en?: string;
    description?: string;
    prices: number[];
    size_labels: string[];
    image_url?: string;
    is_available: boolean;
};

type Category = {
    id: string;
    name_ar: string;
    name_en?: string;
    image_url?: string;
    emoji?: string;
    items: Item[];
};

type RestaurantConfig = {
    name: string;
    theme: string;
    phone?: string;
    whatsapp_number?: string;
    facebook_url?: string;
    instagram_url?: string;
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
        snapchat?: string;
        telegram?: string;
        twitter?: string;
    };
    phone_numbers?: { label?: string, number: string }[];
    address?: string;
    default_language?: string;
    currency?: string;
};

type CartItem = {
    id: string;
    item: Item;
    price: number;
    size_label: string;
    quantity: number;
    category_name: string;
    note?: string;
};

export default function Theme17Menu({ config, categories, restaurantId }: { config: RestaurantConfig, categories: Category[], restaurantId: string }) {
    const isRTL = config.default_language !== 'en';
    const cur = config.currency || 'ج.م';
    const primaryColor = '#d32f2f'; // Lusha Red

    const [view, setView] = useState<'home' | 'menu'>('home');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [toastMsg, setToastMsg] = useState('');
    const [showItemModal, setShowItemModal] = useState<{ item: Item, cName: string, cImage?: string } | null>(null);
    const [itemQty, setItemQty] = useState(1);
    const [itemSizeIdx, setItemSizeIdx] = useState(0);
    const [itemNote, setItemNote] = useState('');
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filterChipsRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);

    const formatEgyptianPhone = (p: string) => {
        if (!p) return p;
        let f = String(p).trim().replace(/\s+/g, '');
        if (f.startsWith('+20')) return f.replace('+20', '0');
        if (f.startsWith('+2')) return f.replace('+2', '');
        if (f.startsWith('0020')) return f.replace('0020', '0');
        return f;
    };

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const isOpen = (() => {
        if (!config.working_hours) return true;
        try {
            const parts = config.working_hours.split('-');
            if (parts.length === 2) {
                const parseToMins = (t: string) => {
                   let [h, m] = t.replace(/[^\d:]/g, '').split(':').map(Number);
                   if (t.toLowerCase().includes('pm') && h < 12) h += 12;
                   if (t.toLowerCase().includes('am') && h === 12) h = 0;
                   return (h || 0) * 60 + (m || 0);
                };
                const s = parseToMins(parts[0]), e = parseToMins(parts[1]);
                const c = new Date().getHours() * 60 + new Date().getMinutes();
                return e <= s ? (c >= s || c <= e) : (c >= s && c <= e);
            }
        } catch { return true; }
        return true;
    })();

    // Intersection Observer for scroll tracking (only when in menu view)
    useEffect(() => {
        if (view !== 'menu') return;
        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            if (isManualScroll.current) return;
            entries.forEach((entry) => {
                if (entry.isIntersecting) setActiveCategory(entry.target.id);
            });
        };

        const observer = new IntersectionObserver(observerCallback, {
            root: null,
            rootMargin: "-150px 0px -50% 0px",
            threshold: 0
        });

        categories.forEach((cat) => {
            const el = document.getElementById(cat.id.toString());
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories, view]);

    // Center active filter chip
    useEffect(() => {
        if (view === 'menu' && activeCategory && filterChipsRef.current && !isManualScroll.current) {
            const activeBtn = filterChipsRef.current.querySelector(`[data-cat-id="${activeCategory}"]`) as HTMLElement;
            if (activeBtn) {
                const container = filterChipsRef.current;
                const scrollLeft = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [activeCategory, view]);

    const scrollToSection = (id: string) => {
        isManualScroll.current = true;
        setActiveCategory(id);
        const el = document.getElementById(id);
        if (el) {
            const offset = 160;
            const pos = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: pos, behavior: 'smooth' });
        }
        setTimeout(() => { isManualScroll.current = false; }, 800);
    };

    const navigateToMenu = (categoryId?: string) => {
        setView('menu');
        if (categoryId) {
            setTimeout(() => {
                scrollToSection(categoryId);
            }, 300);
        } else {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    };

    const catName = (c: Category) => isRTL ? c.name_ar : (c.name_en || c.name_ar);
    const itemName = (i: Item) => isRTL ? i.title_ar : (i.title_en || i.title_ar);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3000);
    };

    const copyToClipboard = (text: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            showToast(isRTL ? 'تم النسخ!' : 'Copied!');
        });
    };

    const renderDarkFooter = () => (
        <div id="dark-footer" className="bg-[#0a0f16] w-full pt-14 pb-14 rounded-t-[40px] px-6 text-white shadow-[0_-10px_40px_rgba(0,0,0,0.15)] mt-6">
            <div className="flex flex-col items-center border-b border-white/10 pb-8 mb-8">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center p-2 mb-4 overflow-hidden relative shadow-lg">
                    {config.logo_url && <Image src={config.logo_url} fill className="object-contain p-1" alt="Logo"/>}
                </div>
                <h2 className="text-[20px] font-black mb-5 tracking-wide text-center">
                    {isRTL ? 'مطعم' : 'Restaurant'} {config.name}
                </h2>
                <div className="flex gap-4">
                    {(config.social_links?.instagram || config.instagram_url) && (
                        <a href={config.social_links?.instagram || config.instagram_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-[16px] bg-[#1a1f26] border border-white/5 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-sm">
                            <svg width="0" height="0">
                                <radialGradient id="ig-grad" r="150%" cx="30%" cy="107%">
                                    <stop stopColor="#fdf497" offset="0" />
                                    <stop stopColor="#fdf497" offset="0.05" />
                                    <stop stopColor="#fd5949" offset="0.45" />
                                    <stop stopColor="#d6249f" offset="0.6" />
                                    <stop stopColor="#285AEB" offset="0.9" />
                                </radialGradient>
                            </svg>
                            <FaInstagram size={24} style={{ fill: "url(#ig-grad)" }} />
                        </a>
                    )}
                    {(config.social_links?.facebook || config.facebook_url) && (
                        <a href={config.social_links?.facebook || config.facebook_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-[16px] bg-[#1a1f26] border border-white/5 flex items-center justify-center text-[#1877F2] hover:scale-110 active:scale-95 transition-transform shadow-sm">
                            <FaFacebookF size={22} />
                        </a>
                    )}
                </div>
            </div>

            <h3 className="text-center font-bold text-lg mb-8 text-gray-200">{isRTL ? 'تواصل معنا' : 'Contact Us'}</h3>

            <div className="space-y-6 max-w-sm mx-auto">
                {/* Phone Numbers */}
                {config.phone_numbers && config.phone_numbers.length > 0 && (
                    <div>
                        <p className="font-bold flex items-center gap-2 mb-2 text-[15px] text-gray-300">
                            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><Phone className="w-3.5 h-3.5"/></span>
                            {isRTL ? 'أرقام الدليفري' : 'Delivery Numbers'}
                        </p>
                        
                        <div className="flex flex-col gap-2">
                            {/* Delivery Branches/Numbers Only */}
                            {config.phone_numbers && config.phone_numbers.map((p, idx) => (
                                <div key={idx} className="bg-[#1b2330] p-3 text-center rounded-lg border border-white/5 flex flex-col justify-center gap-1 hover:bg-white/5 transition">
                                    {p.label && <span className="text-[11px] text-gray-400 font-bold">{p.label}</span>}
                                    <a href={`tel:${p.number}`} className="text-white hover:text-white font-mono font-bold tracking-wider text-[15px]">{formatEgyptianPhone(p.number)}</a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* WhatsApp */}
                {config.whatsapp_number && (
                    <div>
                        <p className="font-bold flex items-center gap-2 mb-2 text-[15px] text-gray-300">
                            <span className="w-6 h-6 rounded-full bg-[#25D366]/20 flex items-center justify-center"><FaWhatsapp className="w-3.5 h-3.5 text-[#25D366]"/></span>
                            {isRTL ? 'واتس اب' : 'WhatsApp'}
                        </p>
                        <div className="bg-[#0f2c1c] p-4 text-center font-mono font-bold tracking-wider rounded-lg text-[#b4ead2] border border-[#25D366]/20 text-[15px]">
                            <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-white transition">
                                {formatEgyptianPhone(config.whatsapp_number)}
                            </a>
                        </div>
                    </div>
                )}

                {/* Address */}
                {(config.address || config.map_link) && (
                    <div>
                        <p className="font-bold flex items-center gap-2 mb-2 text-[15px] text-gray-300">
                            <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-blue-400"/></span>
                            {isRTL ? 'العنوان' : 'Address'}
                        </p>
                        <div className="bg-[#1b2330] p-4 rounded-lg border border-white/5">
                            <p className="text-sm leading-relaxed text-gray-300 mb-4 text-center px-2">{config.address || (isRTL ? 'العنوان غير متوفر' : 'Address not available')}</p>
                            {config.map_link && (
                                <a href={config.map_link} target="_blank" rel="noreferrer" className="w-full bg-[#1877F2] py-3.5 rounded-lg flex justify-center text-white font-bold shadow-sm active:scale-95 transition">
                                    {isRTL ? 'عرض على الخريطة' : 'View on Map'}
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Add QR Code Here */}
                <div className="flex flex-col items-center justify-center pt-8 border-t border-white/5 mt-8 pb-4">
                    <div className="bg-white p-3 rounded-[24px] shadow-[0_5px_20px_rgba(0,0,0,0.25)] mb-4 border-[4px] border-white/90">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://menu.asn-technology.com/menu/' + restaurantId)}&margin=1`} alt="QR Code" className="w-[180px] h-[180px] rounded-lg" />
                    </div>
                    <p className="font-bold text-gray-300 text-[15px] tracking-wide">
                        {isRTL ? 'شارك المنيو مع الاصحاب' : 'Share menu with friends'}
                    </p>
                </div>

            </div>
        </div>
    );

    const addToCart = () => {
        if (!showItemModal) return;
        const { item, cName } = showItemModal;
        const price = item.prices ? parseFloat(item.prices[itemSizeIdx]?.toString() || "0") : 0;
        const sLabel = item.size_labels?.[itemSizeIdx] || (isRTL ? 'عادي' : 'Regular');
        const cartId = `${item.id}-${sLabel}-${itemNote}`;

        setCart(prev => {
            const ext = prev.find(c => c.id === cartId);
            if (ext) {
                return prev.map(c => c.id === cartId ? { ...c, quantity: c.quantity + itemQty } : c);
            }
            return [...prev, {
                id: cartId,
                item,
                price: price,
                size_label: sLabel,
                quantity: itemQty,
                category_name: cName,
                note: itemNote
            }];
        });

        setShowItemModal(null);
        setItemNote('');
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

    const hasCategories = categories && categories.length > 0;

    if (view === 'home') {
        return (
            <div className="bg-[#fffdfd] min-h-screen text-gray-800 font-sans pb-0" dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Loading */}
                {isLoading && (
                    <div className="fixed inset-0 bg-white flex flex-col justify-center items-center z-[9999]">
                        <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        <h2 className="mt-4 font-bold text-red-600">{isRTL ? "جاري التحميل..." : "Loading..."}</h2>
                    </div>
                )}

                <div className="flex flex-col items-center pt-16 px-4 pb-8">
                    {/* Logo */}
                    <div className="w-32 h-32 bg-white rounded-full shadow-[0_5px_15px_rgba(211,47,47,0.15)] flex items-center justify-center p-2 mb-5 relative z-10 overflow-hidden">
                        {config.logo_url ? <Image src={config.logo_url} fill className="object-contain p-1" alt="Logo"/> : <div className="text-gray-400 font-bold text-xs">{config.name}</div>}
                    </div>
                    <h1 className="text-[22px] font-black text-gray-900 mb-6 tracking-wide text-center leading-tight flex items-center justify-center gap-1.5 flex-wrap">
                        <span className="text-red-500">{isRTL ? 'مطعم' : 'Restaurant'}</span>
                        <span>{config.name}</span>
                    </h1>

                    {/* Glowing Soft Icons */}
                    <div className="flex gap-4 mb-4 flex-wrap justify-center">
                        {config.phone_numbers && config.phone_numbers.length > 0 && (
                            <button onClick={() => setShowDeliveryModal(true)} className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-[#d32f2f] hover:bg-[#d32f2f] hover:text-white hover:-translate-y-1 transition-all shadow-sm">
                                <Phone size={20} strokeWidth={2.5}/>
                            </button>
                        )}
                        {config.whatsapp_number && (
                            <a href={`https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}`} target="_blank" rel="noreferrer" className="w-12 h-12 bg-[#25D366]/10 rounded-full flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white hover:-translate-y-1 transition-all shadow-sm">
                                <FaWhatsapp size={22} />
                            </a>
                        )}
                        {config.map_link && (
                            <a href={config.map_link} target="_blank" rel="noreferrer" className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white hover:-translate-y-1 transition-all shadow-sm">
                                <MapPin size={20} strokeWidth={2.5} />
                            </a>
                        )}
                        {(config.social_links?.instagram || config.instagram_url) && (
                            <a href={config.social_links?.instagram || config.instagram_url} target="_blank" rel="noreferrer" className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center text-pink-600 hover:bg-pink-600 hover:text-white hover:-translate-y-1 transition-all shadow-sm">
                                <FaInstagram size={22} />
                            </a>
                        )}
                        {(config.social_links?.facebook || config.facebook_url) && (
                            <a href={config.social_links?.facebook || config.facebook_url} target="_blank" rel="noreferrer" className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white hover:-translate-y-1 transition-all shadow-sm">
                                <FaFacebookF size={20} />
                            </a>
                        )}
                    </div>
                </div>

                {/* Hero Covers Row */}
                <div className="w-full relative h-[250px] sm:h-[350px] bg-gray-100">
                    {config.cover_images && config.cover_images.length > 0 ? (
                        <Swiper modules={[Autoplay, EffectFade]} effect="fade" autoplay={{ delay: 3500 }} loop className="w-full h-full">
                            {config.cover_images.map((img, idx) => (
                                <SwiperSlide key={idx}>
                                    <Image src={img} alt="Cover" fill className="object-cover" />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    ) : (
                        <Image src={config.cover_url || '/placeholder.jpg'} alt="Cover" fill className="object-cover" />
                    )}
                </div>

                {/* View Menu Button */}
                <div className="flex justify-center -mt-6 relative z-10 mb-8 px-4">
                    <button onClick={() => navigateToMenu()} className="bg-[#fff0f0] text-[#d32f2f] px-10 py-3.5 rounded-[22px] font-black shadow-[0_4px_15px_rgba(211,47,47,0.1)] flex items-center gap-3 hover:-translate-y-1 active:scale-95 transition-all text-lg border border-red-50 backdrop-blur-sm">
                        {isRTL ? 'عرض المنيو' : 'View Menu'}
                        <span className="text-xl animate-bounce">👆</span>
                    </button>
                </div>

                {/* Coverflow */}
                {hasCategories && (
                    <div className="w-full pb-10">
                        <Swiper
                            effect={'coverflow'}
                            grabCursor={true}
                            centeredSlides={true}
                            slidesPerView={2.5}
                            loop={true}
                            autoplay={{ delay: 2500, disableOnInteraction: false }}
                            coverflowEffect={{
                                rotate: 45,
                                stretch: -15,
                                depth: 300,
                                modifier: 1.5,
                                slideShadows: true,
                            }}
                            modules={[EffectCoverflow, Autoplay]}
                            className="w-full px-4 pt-4 pb-8"
                        >
                            {categories.map((cat, idx) => (
                                <SwiperSlide key={idx} className="bg-white rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col cursor-pointer border border-gray-50 hover:shadow-lg transition-all" onClick={() => navigateToMenu(cat.id.toString())}>
                                    <div className="w-full aspect-square relative bg-white flex items-center justify-center p-2">
                                        {cat.image_url ? (
                                            <Image src={cat.image_url} alt={catName(cat)} fill className="object-cover rounded-[18px]" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                {cat.emoji || <ShoppingCart className="w-10 h-10 opacity-20" />}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 w-full text-center bg-white border-t border-gray-100/50 flex flex-col justify-center min-h-[48px]">
                                        <h3 className="font-bold text-gray-800 text-[12px] sm:text-sm leading-tight break-words">{catName(cat)}</h3>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                )}

                {/* Order Now (Second image slice) */}
                <div className="w-full relative h-[250px] sm:h-[350px] bg-gray-100 mt-2 mb-10">
                    <Image src={config.cover_images?.[1] || config.cover_url || '/placeholder.jpg'} alt="Cover 2" fill className="object-cover" />
                </div>
                
                <div className="flex justify-center -mt-10 relative z-10 mb-12 px-4 text-center">
                    <button onClick={() => navigateToMenu()} className="bg-[#fff0f0] text-[#d32f2f] px-12 py-4 rounded-[28px] font-black shadow-[0_4px_20px_rgba(211,47,47,0.15)] flex items-center gap-3 hover:-translate-y-1 active:scale-95 transition-all text-[20px] mx-auto border-2 border-white backdrop-blur-sm">
                        {isRTL ? 'أطلب الان' : 'Order Now'}
                        <span className="text-2xl animate-pulse">👆</span>
                    </button>
                </div>

                {/* Dark Footer */}
                {renderDarkFooter()}

                <ASNFooter />

            {/* Delivery Contact Modal (Home View) */}
            <AnimatePresence>
                {showDeliveryModal && (
                    <div className="fixed inset-0 bg-black/60 z-[1050] flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={() => setShowDeliveryModal(false)}>
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                    <Phone className="w-5 h-5 text-red-500" />
                                    {isRTL ? 'أرقام التوصيل' : 'Delivery Numbers'}
                                </h3>
                                <button className="text-gray-400 bg-gray-50 rounded-full p-2 hover:text-gray-600 hover:bg-gray-100 transition" onClick={() => setShowDeliveryModal(false)}>
                                    <X size={20} className="stroke-[2]" />
                                </button>
                            </div>
                            <div className="p-6">
                                {(!config.phone_numbers || config.phone_numbers.length === 0) && (
                                    <p className="text-center text-gray-500">{isRTL ? 'لا توجد أرقام متاحة.' : 'No numbers available.'}</p>
                                )}
                                
                                {config.phone_numbers && config.phone_numbers.length > 0 && config.phone_numbers.map((ph, idx) => (
                                    <div key={idx} className="mb-4 last:mb-0">
                                        <p className="text-xs text-gray-500 mb-1">{ph.label || (isRTL ? 'توصيل' : 'Delivery')}</p>
                                        <a href={`tel:${ph.number}`} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                                            <span className="font-mono font-bold text-gray-900 tracking-wider text-lg" dir="ltr">{formatEgyptianPhone(ph.number)}</span>
                                            <Phone className="w-5 h-5 text-gray-400 fill-current opacity-20" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-gray-800 font-sans pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
            <style jsx global>{`
                .theme17-primary { color: ${primaryColor}; }
                .theme17-bg-primary { background-color: ${primaryColor}; }
                .theme17-border-primary { border-color: ${primaryColor}; }
                
                /* Hide scrollbar for swiper/tabs */
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                .swiper-slide-shadow-left, .swiper-slide-shadow-right {
                    border-radius: 12px;
                }

                @keyframes marquee17 {
                    0% { transform: translateX(-50%); } 
                    100% { transform: translateX(0); }
                }
                .animate-marquee17 {
                    animation: marquee17 15s linear infinite;
                }
            `}</style>

            {/* Loading */}
            {isLoading && (
                <div className="fixed inset-0 bg-white flex flex-col justify-center items-center z-[9999]">
                    <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <h2 className="mt-4 font-bold text-red-600">{isRTL ? "جاري التحميل..." : "Loading..."}</h2>
                </div>
            )}

            {/* Header */}
            <header className="fixed top-0 left-0 w-full bg-white z-[1000] shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                        <button className="text-gray-800 hover:text-red-600 transition" aria-label="Search" onClick={() => setIsSearchOpen(true)}>
                            <Search className="w-6 h-6 stroke-[1.5]" />
                        </button>
                        <button className="text-gray-800 hover:text-red-600 transition" aria-label="Share" onClick={() => setShowShareModal(true)}>
                            <Share2 className="w-6 h-6 stroke-[1.5]" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        {config.orders_enabled !== false && (
                            <button className="w-8 h-8 rounded-full bg-[#d32f2f] text-white flex items-center justify-center relative shadow-sm" onClick={() => setIsCartOpen(true)}>
                                <FaMotorcycle className="w-5 h-5" />
                                {cart.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-white text-[#d32f2f] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-[#d32f2f]">
                                        {cart.length}
                                    </span>
                                )}
                            </button>
                        )}
                        <button className="text-gray-800 hover:text-red-600" aria-label="Menu" onClick={() => setIsMenuOpen(true)}>
                            <MenuIcon className="w-7 h-7 stroke-[1.5]" />
                        </button>
                    </div>
                </div>
                
                
            </header>

            {/* Main Content Spacer */}
            <div className="pt-[60px]"></div>

            {/* Cover & Info */}
            <div className="relative bg-white pb-3">
                <div className="w-full h-[200px] sm:h-[250px] relative bg-gray-100">
                    {config.cover_images && config.cover_images.length > 0 ? (
                        <Swiper modules={[Autoplay, EffectFade]} effect="fade" autoplay={{ delay: 3500 }} loop className="w-full h-full">
                            {config.cover_images.map((img, idx) => (
                                <SwiperSlide key={idx}>
                                    <Image src={img} alt="Cover" fill className="object-cover" />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    ) : (
                        <Image src={config.cover_url || '/placeholder.jpg'} alt="Cover" fill className="object-cover" />
                    )}
                </div>
                
                <div className="px-4 -mt-10 relative z-10 flex items-end justify-between">
                    <div className="flex items-end gap-3 flex-1 relative z-20">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-full p-1 border border-gray-100 shadow-[0_5px_15px_rgba(0,0,0,0.08)] flex-shrink-0 overflow-hidden relative">
                            {config.logo_url && <img src={config.logo_url} className="w-full h-full object-contain rounded-full" alt="Logo"/>}
                        </div>
                        <div className="flex flex-col pb-2 min-w-0">
                            <h1 className="text-[14px] sm:text-base font-black text-gray-900 leading-tight whitespace-nowrap tracking-tight">
                                {isRTL ? 'مطعم' : 'Restaurant'} {config.name}
                            </h1>
                            <p className="text-gray-500 text-[11px] mt-0.5">{isRTL ? 'الفرع الرئيسي' : 'Main Branch'}</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end justify-center mb-3">
                        <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold shadow-sm ${isOpen ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                            {isOpen ? (isRTL ? 'مفتوح' : 'Open') : (isRTL ? 'مغلق' : 'Closed')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Marquee */}
            {config.marquee_enabled && (
                <div className="overflow-hidden bg-[#fce4e4] py-2 flex items-center mt-2 border-y border-red-100" dir="ltr">
                    <div className="whitespace-nowrap animate-marquee17 flex items-center pr-4">
                        <span className="text-[#d32f2f] font-bold px-4 text-sm">
                            {isRTL ? config.marquee_text_ar : (config.marquee_text_en || config.marquee_text_ar)}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d32f2f] opacity-50 mx-2"></span>
                        <span className="text-[#d32f2f] font-bold px-4 text-sm">
                            {isRTL ? config.marquee_text_ar : (config.marquee_text_en || config.marquee_text_ar)}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d32f2f] opacity-50 mx-2"></span>
                        <span className="text-[#d32f2f] font-bold px-4 text-sm">
                            {isRTL ? config.marquee_text_ar : (config.marquee_text_en || config.marquee_text_ar)}
                        </span>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="sticky top-[56px] py-3 px-4 bg-white border-b border-gray-100 shadow-sm z-40 mt-3">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar" ref={filterChipsRef}>
                    <button 
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${activeCategory === 'all' ? 'bg-[#d32f2f] text-white border-[#d32f2f]' : 'bg-white text-[#d32f2f] border-[#d32f2f]'}`}
                        onClick={() => { setActiveCategory('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    >
                        {isRTL ? 'الكل' : 'All'}
                    </button>
                    {categories.map(cat => (
                        <button 
                            key={cat.id} 
                            data-cat-id={cat.id}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${activeCategory === cat.id.toString() ? 'bg-[#d32f2f] text-white border-[#d32f2f]' : 'bg-white text-[#d32f2f] border-[#d32f2f]'}`}
                            onClick={() => scrollToSection(cat.id.toString())}
                        >
                            {catName(cat)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products List */}
            <div className="px-4 pb-20 pt-4">
                {categories.map((cat, catIdx) => (
                    <div key={cat.id} id={cat.id.toString()} className={`mb-10 scroll-mt-36 ${catIdx === 0 ? '' : 'pt-4 border-t border-red-100/50'}`}>
                        <div className="bg-[#fce4e4] rounded-lg py-2.5 text-center mb-5">
                             <h2 className="text-[#d32f2f] font-bold md:text-lg">{catName(cat)}</h2>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            {cat.items.filter(i => i.is_available !== false).map(item => (
                                <div 
                                    key={item.id} 
                                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex min-h-[120px]"
                                    onClick={() => {
                                        if(config.orders_enabled !== false) {
                                            setShowItemModal({item, cName: catName(cat), cImage: cat.image_url});
                                            setItemQty(1);
                                            setItemSizeIdx(0);
                                            setItemNote('');
                                        }
                                    }}
                                >
                                    {/* Image Area - Standard <img> tag to bypass domain issues */}
                                    {(item.image_url || cat.image_url) && (
                                        <div className="w-[110px] sm:w-[130px] flex-shrink-0 bg-gray-100 border-l border-gray-100 relative self-stretch min-h-[110px]">
                                            <img src={item.image_url || cat.image_url || ''} alt={itemName(item)} className="w-full h-full object-cover absolute inset-0" />
                                        </div>
                                    )}

                                    {/* Content Area - Left Side in RTL */}
                                    <div className="flex-1 p-3.5 flex flex-col justify-between items-start text-right">
                                        <div className="w-full">
                                            <h3 className="font-bold text-gray-900 text-[15px] mb-1 line-clamp-1">{itemName(item)}</h3>
                                            <p className="text-gray-500 text-[12px] line-clamp-2 mb-3">
                                                {isRTL ? (item.description_ar || '') : (item.description_en || item.description_ar || item.description || '')}
                                            </p>
                                        </div>
                                        <div className="mt-auto flex items-end justify-between w-full gap-2 pt-2">
                                            <div className="flex flex-wrap gap-1.5 flex-1">
                                                {item.prices?.map((price, pIdx) => (
                                                    <div key={pIdx} className="bg-[#fce4e4] text-[#d32f2f] px-2 py-0.5 rounded text-[13px] font-bold flex items-center gap-1">
                                                        {item.prices.length > 1 && item.size_labels?.[pIdx] && (
                                                            <span className="text-[10px] text-[#d32f2f]/80 whitespace-nowrap">
                                                                {item.size_labels[pIdx]}:
                                                            </span>
                                                        )}
                                                        <span>{price} <span className="text-[10px] font-normal">{cur}</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                            {config.orders_enabled !== false && (
                                                <button 
                                                    className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 text-[#d32f2f] flex items-center justify-center shadow-sm active:scale-95 transition-transform hover:bg-[#fce4e4]"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowItemModal({item, cName: catName(cat)});
                                                        setItemQty(1);
                                                        setItemSizeIdx(0);
                                                    }}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>



            {/* Floating Delivery Button */}
            {view === 'menu' && (config.phone_numbers && config.phone_numbers.length > 0) && (
                <button 
                    className="fixed bottom-24 right-4 sm:right-10 z-[500] w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(239,68,68,0.4)] hover:bg-red-600 transition-colors animate-[bounce_2s_infinite]"
                    onClick={() => setShowDeliveryModal(true)}
                    aria-label="Delivery"
                >
                    <Phone size={26} fill="currentColor" />
                </button>
            )}

            {/* Delivery Contact Modal */}
            <AnimatePresence>
                {showDeliveryModal && (
                    <div className="fixed inset-0 bg-black/60 z-[1050] flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={() => setShowDeliveryModal(false)}>
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                    <Phone className="w-5 h-5 text-red-500" />
                                    {isRTL ? 'أرقام التوصيل' : 'Delivery Numbers'}
                                </h3>
                                <button className="text-gray-400 bg-gray-50 rounded-full p-2 hover:text-gray-600 hover:bg-gray-100 transition" onClick={() => setShowDeliveryModal(false)}>
                                    <X size={20} className="stroke-[2]" />
                                </button>
                            </div>
                            <div className="p-6">
                                {(!config.phone_numbers || config.phone_numbers.length === 0) && (
                                    <p className="text-center text-gray-500">{isRTL ? 'لا توجد أرقام متاحة.' : 'No numbers available.'}</p>
                                )}
                                
                                {config.phone_numbers && config.phone_numbers.length > 0 && config.phone_numbers.map((ph, idx) => (
                                    <div key={idx} className="mb-4 last:mb-0">
                                        <p className="text-xs text-gray-500 mb-1">{ph.label || (isRTL ? 'توصيل' : 'Delivery')}</p>
                                        <a href={`tel:${ph.number}`} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                                            <span className="font-mono font-bold text-gray-900 tracking-wider text-lg" dir="ltr">{formatEgyptianPhone(ph.number)}</span>
                                            <Phone className="w-5 h-5 text-gray-400 fill-current opacity-20" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Search Modal */}
            <AnimatePresence>
                {isSearchOpen && (
                    <div className="fixed inset-0 bg-[#fffdfd] z-[1100] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
                        <div className="px-4 py-4 flex items-center gap-3 border-b border-gray-100 shadow-sm bg-white sticky top-0">
                            <div className="flex-1 relative">
                                <Search className={`w-5 h-5 text-gray-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
                                <input 
                                    type="text" 
                                    placeholder={isRTL ? "ابحث عن منتج..." : "Search items..."}
                                    className={`w-full bg-gray-100 border-none rounded-xl py-3 focus:ring-0 text-sm font-medium ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <button className="text-blue-600 font-bold px-2 text-sm" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-[#fffdfd] p-4">
                            {searchQuery.trim().length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {categories.flatMap(c => c.items.map(i => ({...i, catName: catName(c), catImage: c.image_url})))
                                        .filter(i => i.is_available !== false && itemName(i).toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map((item, idx) => (
                                            <div 
                                                key={idx} 
                                                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex items-center p-3 gap-3"
                                                onClick={() => {
                                                    setIsSearchOpen(false);
                                                    setSearchQuery('');
                                                    if(config.orders_enabled !== false) {
                                                        setShowItemModal({item, cName: item.catName, cImage: item.catImage});
                                                        setItemQty(1);
                                                        setItemSizeIdx(0);
                                                        setItemNote('');
                                                    }
                                                }}
                                            >
                                                {(item.image_url || item.catImage) ? (
                                                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 relative">
                                                        <img src={item.image_url || item.catImage || ''} alt="" className="object-cover rounded-lg w-full h-full" />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 bg-red-50 rounded-lg flex-shrink-0 flex items-center justify-center">
                                                        <span className="text-xl">🍔</span>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900 text-sm mb-1">{itemName(item)}</h3>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {item.prices?.map((price, pIdx) => (
                                                            <span key={pIdx} className="text-[#d32f2f] font-bold text-[13px] bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                {item.prices.length > 1 && item.size_labels?.[pIdx] && (
                                                                    <span className="text-[10px] text-[#d32f2f]/80 whitespace-nowrap">{item.size_labels[pIdx]}:</span>
                                                                )}
                                                                <span>{price} <span className="text-[10px] font-normal">{cur}</span></span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                {config.orders_enabled !== false && (
                                                    <button className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold">
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    }
                                    {categories.flatMap(c => c.items).filter(i => i.is_available !== false && itemName(i).toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                        <p className="text-center text-gray-400 mt-10 text-sm font-bold">
                                            {isRTL ? 'لا توجد نتائج' : 'No results found'}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                                    <Search className="w-16 h-16 text-gray-200 mb-4" />
                                    <p className="text-gray-400 font-medium text-sm">
                                        {isRTL ? 'اكتب اسم المنتج للبحث' : 'Type to search for items'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Side Drawer Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="fixed inset-0 bg-black/60 z-[1001] backdrop-blur-[2px]"
                            onClick={() => setIsMenuOpen(false)}
                        />
                        <motion.div 
                            initial={{ x: isRTL ? '100%' : '-100%' }} 
                            animate={{ x: 0 }} 
                            exit={{ x: isRTL ? '100%' : '-100%' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} w-[85%] max-w-[320px] h-full bg-white z-[1002] shadow-2xl flex flex-col`}
                        >
                            <div className="py-6 px-5 border-b border-gray-100 bg-white">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-black text-[#d32f2f] text-xl">{config.name}</h2>
                                    <button className="text-[#d32f2f] hover:bg-red-50 p-2 rounded-full transition" onClick={() => setIsMenuOpen(false)}>
                                        <X className="w-6 h-6 stroke-[2]" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto py-2">
                                <ul className="flex flex-col">
                                    <li>
                                        <a href="#" className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 border-b border-gray-100 transition" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); setView('home'); window.scrollTo(0,0); }}>
                                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                                                <Home className="w-4 h-4 text-[#d32f2f] stroke-[2]" />
                                            </div>
                                            <span className="font-bold text-gray-800">{isRTL ? 'الرئيسية' : 'Home'}</span>
                                        </a>
                                    </li>
                                    <li>
                                        <button className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 border-b border-gray-100 transition text-right" onClick={() => { 
                                            setIsMenuOpen(false); 
                                            setTimeout(() => {
                                                const footer = document.getElementById('dark-footer');
                                                if(footer) footer.scrollIntoView({ behavior: 'smooth' });
                                            }, 300);
                                        }}>
                                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                                                <Share2 className="w-4 h-4 text-[#d32f2f] stroke-[2]" />
                                            </div>
                                            <span className="font-bold text-gray-800">{isRTL ? 'ارسال المنيو لصديق' : 'Share Menu'}</span>
                                        </button>
                                    </li>
                                    {config.working_hours && (
                                        <li>
                                            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
                                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                                                    <Clock className="w-4 h-4 text-[#d32f2f] stroke-[2]" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800">{isRTL ? 'مواعيد العمل' : 'Working Hours'}</span>
                                                    <span className="text-xs text-gray-500 mt-0.5">{config.working_hours}</span>
                                                </div>
                                            </div>
                                        </li>
                                    )}
                                    <li>
                                        <button className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition text-right" onClick={() => { 
                                            setIsMenuOpen(false); 
                                            setTimeout(() => {
                                                const footer = document.getElementById('dark-footer');
                                                if(footer) footer.scrollIntoView({ behavior: 'smooth' });
                                            }, 300);
                                        }}>
                                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                                                <MessageCircle className="w-4 h-4 text-[#d32f2f] stroke-[2]" />
                                            </div>
                                            <span className="font-bold text-gray-800">{isRTL ? 'تواصل معنا' : 'Contact Us'}</span>
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

    

            {/* Custom Simple Item Modal */}
            <AnimatePresence>
                {showItemModal && (
                    <div className="fixed inset-0 bg-black/60 z-[1010] flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={() => setShowItemModal(null)}>
                        <motion.div 
                            initial={{ y: "100%", opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            exit={{ y: "100%", opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl pb-safe border-t border-white/20"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 overflow-y-auto">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-black text-[#d32f2f] text-xl">{itemName(showItemModal.item)}</h3>
                                    <button className="text-gray-400 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 ml-2" onClick={() => setShowItemModal(null)}><X size={18} className="stroke-[2]" /></button>
                                </div>
                                
                                <p className="text-gray-600 text-sm mb-5 leading-relaxed font-medium">
                                    {isRTL ? (showItemModal.item.description_ar || '') : (showItemModal.item.description_en || showItemModal.item.description_ar || showItemModal.item.description || '')}
                                </p>

                                {showItemModal.item.prices && showItemModal.item.prices.length > 1 && (
                                    <div className="mb-6 bg-gray-50 p-4 rounded-[20px]">
                                        <p className="font-bold text-gray-900 mb-3">{isRTL ? 'اختر الحجم' : 'Select Size'}</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {showItemModal.item.prices.map((p, idx) => (
                                                <button 
                                                    key={idx}
                                                    className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition ${itemSizeIdx === idx ? 'bg-[#d32f2f] text-white border-[#d32f2f] shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
                                                    onClick={() => setItemSizeIdx(idx)}
                                                >
                                                    {showItemModal.item.size_labels?.[idx] || (isRTL ? 'عادي' : 'Regular')} <span className={`ml-1 ${itemSizeIdx === idx ? 'text-red-100' : 'text-gray-400'}`}>- {p} {cur}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center bg-[#fce4e4] border border-red-100 rounded-2xl p-4 mb-6 relative">
                                    <span className="font-bold text-[#d32f2f] text-lg">{isRTL ? 'الكمية' : 'Quantity'}</span>
                                    <div className="flex items-center gap-4 bg-white p-1 rounded-xl shadow-sm border border-red-50">
                                        <button className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 text-xl font-medium active:bg-gray-100 transition" onClick={() => setItemQty(Math.max(1, itemQty - 1))}>-</button>
                                        <span className="font-bold text-xl w-6 text-center text-gray-900">{itemQty}</span>
                                        <button className="w-10 h-10 rounded-lg bg-[#d32f2f] text-white flex items-center justify-center text-xl font-medium active:scale-95 transition" onClick={() => setItemQty(itemQty + 1)}>+</button>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{isRTL ? 'إضافة ملاحظة (اختياري)' : 'Add a Note (Optional)'}</label>
                                    <textarea 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:border-[#d32f2f] focus:outline-none focus:ring-1 focus:ring-[#d32f2f] transition-all min-h-[80px]"
                                        placeholder={isRTL ? "مثال: بدون بصل، زيادة صوص..." : "e.g. No onions, extra sauce..."}
                                        value={itemNote}
                                        onChange={(e) => setItemNote(e.target.value)}
                                    />
                                </div>

                                <button 
                                    className="w-full bg-[#d32f2f] text-white py-4 rounded-[20px] font-black text-lg flex justify-between items-center px-6 shadow-[0_8px_20px_rgba(211,47,47,0.3)] active:scale-[0.98] transition-transform"
                                    onClick={addToCart}
                                >
                                    <span>{isRTL ? 'إضافة للسلة' : 'Add to Cart'}</span>
                                    <span className="bg-white/20 px-3 py-1 rounded-lg">{(parseFloat(showItemModal.item.prices?.[itemSizeIdx]?.toString() || "0") * itemQty).toFixed(0)} {cur}</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Simple Cart View */}
            <AnimatePresence>
                {isCartOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[1020] flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={() => setIsCartOpen(false)}>
                        <motion.div 
                            initial={{ y: "100%", opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            exit={{ y: "100%", opacity: 0 }}
                            className="bg-gray-50 rounded-[24px] w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border-t border-white/20"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
                                <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                                    <ShoppingCart className="w-6 h-6 text-[#d32f2f]" />
                                    {isRTL ? 'سلة المشتريات' : 'Shopping Cart'}
                                </h3>
                                <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition" onClick={() => setIsCartOpen(false)}>
                                    <X size={20} className="stroke-[2]" />
                                </button>
                            </div>
                            
                            <div className="overflow-y-auto flex-1 p-5">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[40vh] text-center px-6">
                                        <div className="w-24 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mb-6 relative">
                                            <ShoppingCart className="w-10 h-10 text-gray-300 relative z-10" />
                                            <div className="absolute top-2 right-2 w-3 h-3 bg-red-400 rounded-full opacity-50 animate-ping" />
                                        </div>
                                        <p className="font-bold text-lg text-gray-900 mb-2">{isRTL ? 'السلة فارغة' : 'Cart is empty'}</p>
                                        <p className="text-sm text-gray-500 font-medium">{isRTL ? 'قم بإضافة بعض المنتجات الشهية للبدء' : 'Add some delicious items to get started'}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {cart.map((c, idx) => (
                                            <div key={idx} className="bg-white p-3.5 rounded-[20px] shadow-sm border border-gray-100 flex gap-4 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-8 h-8 bg-gray-50 rounded-bl-[20px] flex items-center justify-center">
                                                    <button className="text-gray-400 hover:text-red-500" onClick={() => {
                                                        const confirm = window.confirm(isRTL ? 'إزالة؟' : 'Remove?');
                                                        if(confirm) {
                                                            setCart(cart.filter((_, i) => i !== idx));
                                                        }
                                                    }}>
                                                        <X size={14} className="stroke-[3]" />
                                                    </button>
                                                </div>
                                
                                                {c.item.image_url && (
                                                    <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 relative border border-gray-100">
                                                        <Image src={c.item.image_url} alt="" fill className="object-cover" />
                                                    </div>
                                                )}
                                                <div className="flex-1 flex flex-col justify-between py-1">
                                                    <div className="pr-6">
                                                        <h4 className="font-bold text-[15px] text-gray-900 line-clamp-1 mb-1">{itemName(c.item)}</h4>
                                                        {c.size_label && c.item.size_labels && c.item.size_labels.length > 1 && (
                                                            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md inline-block">
                                                                {c.size_label}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-end justify-between mt-3">
                                                        <span className="font-black text-[#d32f2f] text-base">{c.price * c.quantity} <span className="text-xs">{cur}</span></span>
                                                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1 border border-gray-200">
                                                            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 bg-white shadow-sm font-medium" onClick={() => updateCartQty(c.id, -1)}>-</button>
                                                            <span className="font-bold text-sm w-4 text-center text-gray-900">{c.quantity}</span>
                                                            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-[#d32f2f] shadow-sm font-medium" onClick={() => updateCartQty(c.id, 1)}>+</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {cart.length > 0 && (
                                <div className="p-6 border-t border-gray-200 bg-white rounded-b-[24px]">
                                    <div className="flex flex-col gap-2 mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                                            <span>{isRTL ? 'عناصر' : 'Items'} ({cart.length})</span>
                                            <span>{cartTotal} {cur}</span>
                                        </div>
                                        <div className="w-full h-px bg-gray-200 my-1"></div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-900 font-bold">{isRTL ? 'الإجمالي المطلوب:' : 'Total:'}</span>
                                            <span className="text-2xl font-black text-[#d32f2f]">{cartTotal} {cur}</span>
                                        </div>
                                    </div>
                                    <button 
                                        className="w-full bg-[#d32f2f] text-white py-4 rounded-[20px] font-black text-lg flex justify-center items-center gap-3 shadow-[0_8px_20px_rgba(211,47,47,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all"
                                        onClick={() => { setIsCartOpen(false); setShowCheckout(true); }}
                                    >
                                        <ShoppingCart className="w-6 h-6" />
                                        {isRTL ? 'إتمام الطلب' : 'Checkout'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <AnimatePresence>
                {toastMsg && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-[9999] font-bold text-sm text-center min-w-[200px]"
                    >
                        {toastMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {view === 'menu' && (
                <>
                    {renderDarkFooter()}
                    <ASNFooter />
                </>
            )}

            <CheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                cartItems={cart.map(c => ({
                    ...c,
                    title: isRTL ? c.item.title_ar : c.item.title_en || c.item.title_ar,
                    qty: c.quantity,
                    size: c.size_label !== 'عادي' ? c.size_label : undefined,
                    category: c.category_name,
                    categoryType: undefined,
                }))}
                subtotal={cartTotal}
                language={isRTL ? 'ar' : 'en'}
                restaurantId={restaurantId}
                restaurantName={config.name}
                whatsappNumber={config.whatsapp_number}
                currency={cur}
                onOrderSuccess={() => {
                    setCart([]);
                    setShowCheckout(false);
                }}
            />
        </div>
    );
}
