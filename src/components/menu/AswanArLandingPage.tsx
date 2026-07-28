'use client';

import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { getEmbedUrl } from '@/lib/videoUtils';
import { getAswanColors } from '@/lib/aswanVariants';
import React from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, Clock, Instagram, Facebook, Youtube, Sun, Moon, MapPin, X, Utensils } from 'lucide-react';
import { FaTiktok, FaSnapchatGhost, FaWhatsapp } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

interface AswanArLandingPageProps {
    config: any;
    onContinue: () => void;
}

export default function AswanArLandingPage({ config, onContinue }: AswanArLandingPageProps) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    const [showPhoneModal, setShowPhoneModal] = React.useState(false);
    const [localMode, setLocalMode] = React.useState<'light' | 'dark' | null>(null);

    React.useEffect(() => {
        setMounted(true);
        if (config.default_theme_mode && config.default_theme_mode !== 'system') {
            setTheme(config.default_theme_mode);
        }
    }, [config.default_theme_mode, setTheme]);

    const isDark = mounted && (localMode ? localMode === 'dark' : (resolvedTheme === 'dark' || theme === 'dark'));

    const toggleTheme = () => {
        const nextMode = isDark ? 'light' : 'dark';
        setLocalMode(nextMode);
        setTheme(nextMode);
    };

    const { primaryColor, bgBody, bgCard, textMain, textMuted, borderColor, activeBgImage, hasBgImage } = getAswanColors(config, isDark);

    const displayNumbers = (config.phone_numbers && config.phone_numbers.length > 0)
        ? config.phone_numbers
        : (config.phone ? [{ label: 'رقم التواصل', number: config.phone }] : []);

    let parsedLogos = { light: config.aswan_logo_url || config.vicino_logo_url, dark: config.aswan_logo_url || config.vicino_logo_url };
    const logoField = config.aswan_logo_url || config.vicino_logo_url;
    if (logoField && logoField.startsWith('{')) {
        try { parsedLogos = JSON.parse(logoField); } catch {}
    }
    const currentLogo = isDark ? (parsedLogos.dark || parsedLogos.light) : (parsedLogos.light || parsedLogos.dark);
    const finalLogoSrc = currentLogo || config.logo_url;

    const videoUrl = config.theme_colors?.aswan_video_url || config.aswan_video_url || config.vicino_video_url;
    const aboutText = config.theme_colors?.aswan_about_ar || config.aswan_about_ar || config.vicino_about_ar || config.slogan_ar;
    const historyText = config.theme_colors?.aswan_history_ar || config.aswan_history_ar || config.vicino_history_ar;
    const galleryImages = config.theme_colors?.aswan_images || config.aswan_images || config.vicino_images || config.cover_images || [];

    const heroMedia = videoUrl 
        ? { type: 'video', src: videoUrl, embed: getEmbedUrl(videoUrl) } 
        : (galleryImages[0] 
            ? { type: 'image', src: galleryImages[0] } 
            : null);

    const socialLinks = [
        { icon: FaWhatsapp, url: config.whatsapp_number ? `https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}` : null, color: '#25D366', name: 'واتساب' },
        { icon: Instagram, url: config.instagram_url, color: '#E1306C', name: 'إنستغرام' },
        { icon: FaTiktok, url: config.tiktok_url, color: '#000000', name: 'تيك توك', textColor: '#ffffff' },
        { icon: Facebook, url: config.facebook_url, color: '#1877F2', name: 'فيسبوك' },
        { icon: FaSnapchatGhost, url: config.snapchat_url, color: '#FFFC00', name: 'سناب شات', textColor: '#000000' },
        { icon: Youtube, url: config.youtube_url, color: '#FF0000', name: 'يوتيوب' },
    ].filter(link => link.url);

    const fadeInUp = {
        hidden: { opacity: 0, y: 25 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } }
    };

    return (
        <div 
            className="min-h-screen font-sans flex flex-col relative transition-colors duration-300 antialiased"
            style={{ 
                backgroundColor: hasBgImage ? 'transparent' : bgBody, 
                color: textMain
            }} 
            dir="rtl"
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
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.40)' : 'rgba(255, 255, 255, 0.25)'
                    }}
                />
            )}

            <div className="relative z-10 flex flex-col flex-1">
                {/* --- TOP NAV BAR --- */}
                <div className="w-full flex justify-between items-center px-6 pt-6 pb-4 max-w-4xl mx-auto">
                    <button 
                        onClick={toggleTheme}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md border"
                        style={{ backgroundColor: bgCard, borderColor: borderColor }}
                        title={isDark ? "التحول للوضع الفاتح" : "التحول للوضع الداكن"}
                    >
                        {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
                    </button>

                    {finalLogoSrc && (
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 shadow-md flex items-center justify-center p-1 bg-white" style={{ borderColor: primaryColor }}>
                            <OptimizedMenuImage src={finalLogoSrc} alt={config.name} className="w-full h-full object-contain rounded-full" useOriginal={true} />
                        </div>
                    )}
                </div>

                {/* --- HERO BRAND HEADER --- */}
                <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                    className="text-center px-6 py-4 max-w-2xl mx-auto"
                >
                    <h1 className="text-3xl md:text-5xl font-bold tracking-normal mb-2" style={{ color: textMain }}>
                        {config.name}
                    </h1>
                    {config.slogan_ar && (
                        <p className="text-sm md:text-lg font-medium opacity-80 leading-relaxed" style={{ color: textMuted }}>
                            {config.slogan_ar}
                        </p>
                    )}
                </motion.div>

                {/* --- MEDIA SECTION --- */}
                {heroMedia && (
                    <div className="w-full px-4 md:px-8 max-w-4xl mx-auto mb-8">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="w-full rounded-3xl overflow-hidden shadow-2xl border flex items-center justify-center"
                            style={{ borderColor: borderColor, backgroundColor: '#000' }}
                        >
                            {heroMedia.type === 'video' ? (
                                <div className="w-full aspect-video relative">
                                    {heroMedia.embed ? (
                                        <iframe 
                                            src={heroMedia.embed} 
                                            className="w-full h-full min-h-[300px] sm:min-h-[420px] border-0" 
                                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
                                            allowFullScreen
                                            title="فيديو المطعم"
                                        />
                                    ) : (
                                        <video 
                                            src={heroMedia.src} 
                                            autoPlay 
                                            loop 
                                            muted 
                                            playsInline 
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="w-full h-[220px] md:h-[380px] relative">
                                    <OptimizedMenuImage 
                                        src={heroMedia.src} 
                                        alt={config.name} 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}

                {/* --- ENTER MENU ACTION BUTTON --- */}
                <div className="w-full px-6 max-w-md mx-auto mb-12">
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onContinue}
                        className="w-full py-4 px-8 rounded-3xl font-extrabold text-lg text-white shadow-2xl flex items-center justify-center gap-3 transition-all"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <span>تصفح المنيو الآن</span>
                        <ArrowLeft className="w-6 h-6" />
                    </motion.button>
                </div>

                {/* --- ABOUT STORY --- */}
                {aboutText && (
                    <div className="w-full px-6 max-w-3xl mx-auto mb-10 text-center">
                        <div className="p-6 md:p-8 rounded-3xl border shadow-lg backdrop-blur-md" style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                            <div className="w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                <Utensils className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">عن المكان</h2>
                            <p className="text-sm md:text-base opacity-85 leading-relaxed font-normal" style={{ color: textMuted }}>
                                {aboutText}
                            </p>
                        </div>
                    </div>
                )}

                {/* --- ATMOSPHERE GALLERY SLIDER --- */}
                {!videoUrl && galleryImages.length > 0 && (
                    <div className="w-full px-4 max-w-4xl mx-auto mb-12">
                        <div className="text-center mb-4">
                            <h2 className="text-xl font-bold">معرض الصور والأجواء</h2>
                        </div>
                        <Swiper
                            modules={[Autoplay, Pagination]}
                            autoplay={{ delay: 3000, disableOnInteraction: false }}
                            pagination={{ clickable: true }}
                            spaceBetween={16}
                            slidesPerView={1.2}
                            breakpoints={{
                                640: { slidesPerView: 2.2 }
                            }}
                            className="w-full rounded-3xl pb-10"
                        >
                            {galleryImages.map((img: string, i: number) => (
                                <SwiperSlide key={i}>
                                    <div className="h-[200px] md:h-[260px] rounded-3xl overflow-hidden border shadow-md" style={{ borderColor: borderColor }}>
                                        <OptimizedMenuImage src={img} alt={`معرض ${i + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                )}

                {/* --- LOCATION & WORKING HOURS --- */}
                <div className="w-full px-6 max-w-3xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.address && (
                        <div className="p-5 rounded-3xl border shadow-sm flex items-start gap-3" style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                            <MapPin className="w-6 h-6 shrink-0 mt-1" style={{ color: primaryColor }} />
                            <div>
                                <h3 className="font-bold text-sm">العنوان والموقع</h3>
                                <p className="text-xs opacity-80 mt-1 font-normal leading-relaxed">{config.address}</p>
                                {config.map_link && (
                                    <a href={config.map_link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-sky-500 hover:underline mt-2 inline-block">
                                        فتح في خرائط جوجل ←
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {config.working_hours && (
                        <div className="p-5 rounded-3xl border shadow-sm flex items-start gap-3" style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                            <Clock className="w-6 h-6 shrink-0 mt-1" style={{ color: primaryColor }} />
                            <div>
                                <h3 className="font-bold text-sm">ساعات العمل</h3>
                                <p className="text-xs opacity-80 mt-1 font-normal whitespace-pre-line leading-relaxed">{config.working_hours}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- SOCIAL LINKS & CALL BUTTONS --- */}
                <div className="w-full px-6 max-w-2xl mx-auto mb-16 flex flex-col items-center gap-6">
                    {socialLinks.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {socialLinks.map((link, idx) => {
                                const Icon = link.icon;
                                return (
                                    <a
                                        key={idx}
                                        href={link.url!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                                        style={{ backgroundColor: link.color }}
                                        title={link.name}
                                    >
                                        <Icon className="w-6 h-6" style={{ color: link.textColor || '#ffffff' }} />
                                    </a>
                                );
                            })}
                        </div>
                    )}

                    {displayNumbers.length > 0 && (
                        <button
                            onClick={() => setShowPhoneModal(true)}
                            className="px-6 py-3.5 rounded-2xl border font-bold text-sm flex items-center gap-2 shadow-md transition-transform hover:scale-105 active:scale-95"
                            style={{ backgroundColor: bgCard, borderColor: borderColor, color: textMain }}
                        >
                            <Phone className="w-4 h-4" style={{ color: primaryColor }} />
                            <span>الاتصال المباشر بالمكان</span>
                        </button>
                    )}
                </div>
            </div>

            {/* --- PHONE MODAL --- */}
            <AnimatePresence>
                {showPhoneModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowPhoneModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border relative"
                            style={{ backgroundColor: bgCard, borderColor: borderColor }}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">أرقام التواصل المباشر</h3>
                                <button onClick={() => setShowPhoneModal(false)} className="p-1 rounded-full hover:bg-slate-500/10">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {displayNumbers.map((num: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={`tel:${num.number}`}
                                        className="flex items-center justify-between p-3.5 rounded-2xl border transition-colors hover:bg-slate-500/10"
                                        style={{ borderColor: borderColor, backgroundColor: bgBody }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-4 h-4" style={{ color: primaryColor }} />
                                            <div>
                                                <div className="font-bold text-xs">{num.label || 'رقم هاتف'}</div>
                                                <div className="text-xs font-semibold opacity-80" dir="ltr">{num.number}</div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-white px-3 py-1.5 rounded-xl shadow-sm" style={{ backgroundColor: primaryColor }}>
                                            اتصال الان
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
