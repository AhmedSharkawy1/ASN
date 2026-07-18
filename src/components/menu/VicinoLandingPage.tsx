import { getVicinoColors } from '@/lib/vicinoVariants';
import { parseCurrency } from '@/lib/currency';
import React from 'react';
import { useTheme } from 'next-themes';
import { ArrowRight, MapPin, Phone, Clock, Instagram, Facebook, Youtube } from 'lucide-react';
import { FaTiktok, FaSnapchatGhost, FaWhatsapp } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { motion, AnimatePresence } from 'framer-motion';

interface VicinoLandingPageProps {
    config: any;
    onContinue: () => void;
}

export default function VicinoLandingPage({ config, onContinue }: VicinoLandingPageProps) {
    const { resolvedTheme, setTheme } = useTheme();
    const [currentLang, setCurrentLang] = React.useState<'ar'|'en'>((config.theme_colors?.default_language || config.default_language) === 'en' ? 'en' : 'ar');
    const isAr = currentLang === 'ar';
    const [showPhoneModal, setShowPhoneModal] = React.useState(false);
    
    React.useEffect(() => {
        if (config.default_theme_mode && config.default_theme_mode !== 'system') {
            setTheme(config.default_theme_mode);
        }
    }, [config.default_theme_mode, setTheme]);

    const isDark = resolvedTheme === 'dark';
    const { primaryColor, bgBody, textMain, textMuted } = getVicinoColors(config, isDark);

    const displayNumbers = (config.phone_numbers && config.phone_numbers.length > 0) 
        ? config.phone_numbers 
        : (config.phone ? [{ label: isAr ? 'رقم الاتصال' : 'Contact Number', number: config.phone }] : []);

    let parsedLogos = { light: config.vicino_logo_url, dark: config.vicino_logo_url };
    if (config.vicino_logo_url?.startsWith('{')) {
        try { parsedLogos = JSON.parse(config.vicino_logo_url); } catch {}
    }
    const currentLogo = isDark ? (parsedLogos.dark || parsedLogos.light) : (parsedLogos.light || parsedLogos.dark);
    const finalLogoSrc = currentLogo || config.logo_url;

    const [showSplash, setShowSplash] = React.useState(!!config.theme_colors?.vicino_loading_logo);

    React.useEffect(() => {
        if (showSplash) {
            const timer = setTimeout(() => setShowSplash(false), 2500);
            return () => clearTimeout(timer);
        }
    }, [showSplash]);

    const getEmbedUrl = (url: string) => {
        if (!url) return null;
        const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch && ytMatch[1]) {
            return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&loop=1&playlist=${ytMatch[1]}`;
        }
        const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
        if (vimeoMatch && vimeoMatch[1]) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&loop=1`;
        }
        return null;
    };

    const heroMedia = config.vicino_video_url 
        ? { type: 'video', src: config.vicino_video_url, embed: getEmbedUrl(config.vicino_video_url) } 
        : (config.vicino_images?.[0] || config.cover_images?.[0] 
            ? { type: 'image', src: config.vicino_images?.[0] || config.cover_images?.[0] } 
            : null);

    const hasContent = config.vicino_about_ar || config.vicino_about_en || config.vicino_history_ar || config.vicino_history_en || (config.vicino_images && config.vicino_images.length > 0);

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
    };

    const socialLinks = [
        { icon: FaWhatsapp, url: config.whatsapp_number ? `https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}` : null, color: '#25D366', name: 'WhatsApp' },
        { icon: Instagram, url: config.instagram_url, color: '#E1306C', name: 'Instagram' },
        { icon: FaTiktok, url: config.tiktok_url, color: isDark ? '#333333' : '#000000', name: 'TikTok' },
        { icon: Facebook, url: config.facebook_url, color: '#1877F2', name: 'Facebook' },
        { icon: FaSnapchatGhost, url: config.snapchat_url, color: '#FFFC00', name: 'Snapchat', textColor: '#000000' },
        { icon: Youtube, url: config.youtube_url, color: '#FF0000', name: 'YouTube' },
    ].filter(link => link.url);

    if (showSplash) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center selection:bg-black/10">
                <div className="relative w-48 h-48 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[4px] border-[#B8860B]/20 border-t-[#B8860B] animate-spin"></div>
                    <OptimizedMenuImage src={config.theme_colors?.vicino_loading_logo} alt="Loading" className="w-32 h-32 object-contain animate-pulse rounded-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-cairo flex flex-col selection:bg-black/10" style={{ backgroundColor: bgBody, color: textMain }} dir={isAr ? 'rtl' : 'ltr'}>
            
            {/* --- HEADER --- */}
            <div className="w-full flex justify-between items-start px-6 pt-8 pb-6 max-w-4xl mx-auto">
                <div className="flex-1"></div>
                
                {/* Logo */}
                {finalLogoSrc && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="w-32 h-32 md:w-40 md:h-40 relative group flex-shrink-0 mx-4"
                    >
                        <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ backgroundColor: primaryColor }}></div>
                        <div className="relative w-full h-full rounded-full overflow-hidden border-[4px] border-black/5 dark:border-white/10 shadow-lg bg-white flex items-center justify-center p-1">
                            <OptimizedMenuImage src={finalLogoSrc} alt="Logo" className="w-full h-full object-contain rounded-full" useOriginal={true} />
                        </div>
                    </motion.div>
                )}

                {/* Language Toggle */}
                <div className="flex-1 flex justify-end">
                    <div className="flex justify-center items-center gap-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full p-1 shadow-sm" dir="ltr">
                        <button onClick={() => setCurrentLang('en')} className="px-3 py-1 md:px-4 md:py-1.5 rounded-full font-bold text-xs transition-all duration-300" style={{ backgroundColor: !isAr ? primaryColor : 'transparent', color: !isAr ? '#ffffff' : textMain }}>EN</button>
                        <button onClick={() => setCurrentLang('ar')} className="px-3 py-1 md:px-4 md:py-1.5 rounded-full font-bold text-xs transition-all duration-300" style={{ backgroundColor: isAr ? primaryColor : 'transparent', color: isAr ? '#ffffff' : textMain }}>AR</button>
                    </div>
                </div>
            </div>

            {/* --- MEDIA SECTION --- */}
            {heroMedia && (
                <div className="w-full px-4 md:px-8 max-w-4xl mx-auto mb-10 relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-full rounded-3xl overflow-hidden shadow-2xl bg-black flex items-center justify-center border-0"
                    >
                        {heroMedia.type === 'video' ? (
                            heroMedia.embed ? (
                                <iframe
                                    src={heroMedia.embed}
                                    className="w-full h-[70vh] md:h-[80vh] block"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowFullScreen
                                    style={{ border: 'none' }}
                                ></iframe>
                            ) : (
                                <video 
                                    src={heroMedia.src} 
                                    autoPlay muted loop playsInline controls={true}
                                    className="w-full h-auto max-h-[75vh] object-cover block animate-[cinematicZoom_20s_ease-in-out_infinite]"
                                />
                            )
                        ) : (
                            <OptimizedMenuImage 
                                src={heroMedia.src} 
                                alt="Hero" 
                                className="w-full h-auto max-h-[75vh] object-cover"
                            />
                        )}
                    </motion.div>
                </div>
            )}

            {/* --- CREATIVE QUICK INFO GRID --- */}
            <div className="px-5 max-w-4xl mx-auto w-full relative z-20 mb-12">
                <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Location */}
                    <a href={config.map_link || (config.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}` : "#")} target={(config.map_link || config.address) ? "_blank" : undefined} rel="noreferrer" className="flex flex-col items-center p-6 rounded-[2rem] shadow-sm bg-black/5 dark:bg-white/5 border transition-all duration-300 hover:-translate-y-2 hover:shadow-lg" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                            <MapPin className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-base mb-1" style={{ color: textMain }}>{isAr ? "الموقع" : "Location"}</h3>
                        <p className="text-sm text-center font-medium opacity-70 break-words whitespace-pre-wrap leading-relaxed" style={{ color: textMuted }}>{config.address || (isAr ? "عرض على الخريطة" : "View on Map")}</p>
                    </a>
                    
                    {/* Working Hours */}
                    <div className="flex flex-col items-center p-6 rounded-[2rem] shadow-sm bg-black/5 dark:bg-white/5 border transition-all duration-300 hover:-translate-y-2 hover:shadow-lg" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                            <Clock className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-base mb-1" style={{ color: textMain }}>{isAr ? "ساعات العمل" : "Working Hours"}</h3>
                        <p className="text-sm text-center font-medium opacity-70 line-clamp-2" style={{ color: textMuted }}>{config.working_hours || (isAr ? "متاح دائماً" : "Always Open")}</p>
                    </div>

                    {/* Phone */}
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            if (displayNumbers.length > 0) {
                                setShowPhoneModal(true);
                            }
                        }}
                        className="w-full flex flex-col items-center p-6 rounded-[2rem] shadow-sm bg-black/5 dark:bg-white/5 border transition-all duration-300 hover:-translate-y-2 hover:shadow-lg" 
                        style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                    >
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                            <Phone className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-base mb-1" style={{ color: textMain }}>{isAr ? "اتصل بنا" : "Call Us"}</h3>
                        <p className="text-sm text-center font-medium opacity-70 line-clamp-2 leading-relaxed" dir="ltr" style={{ color: textMuted }}>
                            {displayNumbers.length > 0 
                                ? displayNumbers.map((p: any) => p.number).join(' • ') 
                                : (isAr ? "اتصال" : "Call Now")}
                        </p>
                    </button>
                </motion.div>
            </div>

            {/* --- CONTENT SECTION --- */}
            {hasContent && (
                <div className="flex-1 px-6 pt-8 max-w-4xl mx-auto w-full flex flex-col gap-16 md:gap-24">
                    
                    {/* About Us */}
                    {(isAr ? config.vicino_about_ar : config.vicino_about_en) && (
                        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="text-center px-4 md:px-12">
                            <div className="inline-flex items-center justify-center gap-4 mb-6">
                                <div className="h-[2px] w-12 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                                <h2 className="text-sm font-black uppercase tracking-[0.3em] opacity-90" style={{ color: primaryColor }}>{isAr ? "من نحن" : "About Us"}</h2>
                                <div className="h-[2px] w-12 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                            </div>
                            <p className="text-lg md:text-2xl leading-[1.8] font-medium" style={{ color: textMuted }}>
                                {isAr ? config.vicino_about_ar : config.vicino_about_en}
                            </p>
                        </motion.div>
                    )}

                    {/* Our History */}
                    {(isAr ? config.vicino_history_ar : config.vicino_history_en) && (
                        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="relative p-8 md:p-12 rounded-[2.5rem] overflow-hidden shadow-lg border border-black/5 dark:border-white/5" style={{ backgroundColor: isDark ? '#141414' : '#f9fafb' }}>
                            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: primaryColor }}></div>
                            <h2 className="text-sm font-black uppercase tracking-[0.3em] mb-6 opacity-90" style={{ color: primaryColor }}>{isAr ? "تاريخنا" : "Our History"}</h2>
                            <p className="text-base md:text-xl leading-[1.8] font-medium" style={{ color: textMain }}>
                                {isAr ? config.vicino_history_ar : config.vicino_history_en}
                            </p>
                        </motion.div>
                    )}

                    {/* Gallery Images */}
                    {config.vicino_images && config.vicino_images.length > 0 && (
                        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="w-full">
                            <Swiper 
                                key={isAr ? 'rtl' : 'ltr'} 
                                modules={[Autoplay, EffectFade, Pagination]} 
                                effect="fade"
                                pagination={{ clickable: true, dynamicBullets: true }}
                                autoplay={{ delay: 3500, disableOnInteraction: false }} 
                                className="w-full rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden aspect-[4/3] md:aspect-[16/9] border-4 border-white/10"
                            >
                                {config.vicino_images.map((img: string, i: number) => (
                                    <SwiperSlide key={i}>
                                        <OptimizedMenuImage src={img} alt="Gallery" className="w-full h-full object-cover transition-transform duration-[15s] hover:scale-110" />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </motion.div>
                    )}
                </div>
            )}

            {/* --- SOCIAL MEDIA DOCK --- */}
            {socialLinks.length > 0 && (
                <div className="px-5 w-full max-w-2xl mx-auto mt-16 pb-48 flex justify-center relative z-20">
                    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col items-center gap-6 w-full">
                        <div className="text-xs font-bold uppercase tracking-widest opacity-50">{isAr ? "تواصل معنا" : "Connect With Us"}</div>
                        <div className="flex flex-wrap justify-center gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-full border border-black/5 dark:border-white/10 shadow-sm">
                            {socialLinks.map((link, idx) => {
                                const Icon = link.icon;
                                return (
                                    <a key={idx} href={link.url} target="_blank" rel="noreferrer" title={link.name}
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg relative group overflow-hidden"
                                        style={{ backgroundColor: link.color }}
                                    >
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <Icon className="w-6 h-6 relative z-10" style={{ color: link.textColor || '#ffffff' }} />
                                    </a>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            )}
            
            {/* Fallback padding if no social links */}
            {socialLinks.length === 0 && <div className="pb-40"></div>}

            {/* --- FLOATING CTA --- */}
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8, type: "spring", stiffness: 100 }}
                className="fixed bottom-0 left-0 right-0 p-6 z-50 flex justify-center pointer-events-none"
            >
                <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black/20 to-transparent -z-10 pointer-events-none dark:from-black/80"></div>
                
                <button 
                    onClick={onContinue}
                    className="w-full max-w-md py-4 md:py-5 rounded-full font-black text-lg md:text-xl text-white shadow-[0_8px_40px_rgb(0,0,0,0.3)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:brightness-110 flex items-center justify-center gap-3 pointer-events-auto border border-white/20 overflow-hidden group"
                    style={{ backgroundColor: primaryColor }}
                >
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2.5s_infinite]"></div>
                    <span className="relative z-10 tracking-wider drop-shadow-md">{isAr ? "عــرض المنيـــو" : "View Menu"}</span>
                    <ArrowRight className={`w-6 h-6 md:w-7 md:h-7 relative z-10 transition-transform duration-300 drop-shadow-md ${isAr ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                </button>
            </motion.div>

            <style dangerouslySetInnerHTML={{__html: `
                .swiper-pagination-bullet { background: ${primaryColor} !important; opacity: 0.5; }
                .swiper-pagination-bullet-active { opacity: 1; transform: scale(1.2); }
                @keyframes shimmer {
                    0% { transform: translateX(-150%); }
                    100% { transform: translateX(150%); }
                }
                @keyframes cinematicZoom {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.04); }
                    100% { transform: scale(1); }
                }
            `}} />

            {/* Local Phone Modal */}
            <AnimatePresence>
                {showPhoneModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    onClick={() => setShowPhoneModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-zinc-200 dark:border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="px-5 pb-4 pt-5 flex items-center justify-between border-b border-zinc-100 dark:border-white/5" dir={isAr ? 'rtl' : 'ltr'}>
                                <h3 className="text-lg font-black text-zinc-900 dark:text-white">{isAr ? 'أرقام الاتصال' : 'Phone Numbers'}</h3>
                                <button onClick={() => setShowPhoneModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 active:scale-90 transition-transform">
                                    <span className="text-lg">✕</span>
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto space-y-3 pb-safe">
                                {displayNumbers.length > 0 ? (
                                    displayNumbers.map((pn: any, i: number) => (
                                        <a key={i} href={`tel:${pn.number}`} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl active:scale-[0.97] transition-transform" dir="rtl">
                                            <div className="flex flex-col text-right">
                                                <span className="text-[17px] font-black text-zinc-900 dark:text-white" dir={isAr ? 'rtl' : 'ltr'}>
                                                    {pn.label ? pn.label : pn.number}
                                                </span>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm border border-zinc-100 dark:border-white/5 text-zinc-900 dark:text-white">
                                                <Phone className="w-5 h-5" />
                                            </div>
                                        </a>
                                    ))
                                ) : null}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
