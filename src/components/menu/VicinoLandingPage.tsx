import React from 'react';
import { useTheme } from 'next-themes';
import { ArrowRight, ChevronDown, MapPin, Phone, Clock, Instagram, Facebook, Youtube } from 'lucide-react';
import { FaTiktok, FaSnapchatGhost, FaWhatsapp } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { motion } from 'framer-motion';

interface VicinoLandingPageProps {
    config: any;
    onContinue: () => void;
}

export default function VicinoLandingPage({ config, onContinue }: VicinoLandingPageProps) {
    const { resolvedTheme } = useTheme();
    const [currentLang, setCurrentLang] = React.useState<'ar'|'en'>(config.default_language === 'en' ? 'en' : 'ar');
    const isAr = currentLang === 'ar';
    
    const isDark = resolvedTheme === 'dark';
    const bgBody = isDark ? '#0a0a0a' : '#ffffff';
    const textMain = isDark ? '#ffffff' : '#0a0a0a';
    const textMuted = isDark ? '#a3a3a3' : '#525252';
    const T19_PRIMARY = '#B8860B';
    const primaryColor = config.theme_colors?.primary || T19_PRIMARY;

    let parsedLogos = { light: config.vicino_logo_url, dark: config.vicino_logo_url };
    if (config.vicino_logo_url?.startsWith('{')) {
        try { parsedLogos = JSON.parse(config.vicino_logo_url); } catch {}
    }
    const currentLogo = isDark ? (parsedLogos.dark || parsedLogos.light) : (parsedLogos.light || parsedLogos.dark);
    const finalLogoSrc = currentLogo || config.logo_url;

    const heroMedia = config.vicino_video_url 
        ? { type: 'video', src: config.vicino_video_url } 
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

    return (
        <div className="min-h-screen font-cairo flex flex-col selection:bg-black/10" style={{ backgroundColor: bgBody, color: textMain }} dir={isAr ? 'rtl' : 'ltr'}>
            
            {/* --- HERO SECTION --- */}
            <div className={`relative w-full ${hasContent ? 'h-[80vh] md:h-[90vh]' : 'h-screen'} flex flex-col items-center justify-center overflow-hidden rounded-b-[3rem] md:rounded-b-[4rem] shadow-2xl`}>
                {/* Hero Background */}
                <div className="absolute inset-0 w-full h-full bg-black">
                    {heroMedia?.type === 'video' ? (
                        <video 
                            src={heroMedia.src} 
                            autoPlay muted loop playsInline 
                            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
                            style={{ filter: 'brightness(0.7) contrast(1.2)' }}
                        />
                    ) : heroMedia?.type === 'image' ? (
                        <OptimizedMenuImage 
                            src={heroMedia.src} 
                            alt="Hero" 
                            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
                            style={{ filter: 'brightness(0.7) contrast(1.2)' }}
                        />
                    ) : (
                        <div className="w-full h-full" style={{ backgroundColor: primaryColor, opacity: 0.15 }}></div>
                    )}
                    {/* Premium Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/90"></div>
                </div>

                {/* Top Language Toggle (Glassmorphic) */}
                <div className="absolute top-6 right-5 z-20">
                    <div className="flex justify-center items-center gap-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-lg" dir="ltr">
                        <button onClick={() => setCurrentLang('en')} className="px-5 py-2 rounded-full font-bold text-xs transition-all duration-300" style={{ backgroundColor: !isAr ? '#ffffff' : 'transparent', color: !isAr ? '#000000' : '#ffffff' }}>EN</button>
                        <button onClick={() => setCurrentLang('ar')} className="px-5 py-2 rounded-full font-bold text-xs transition-all duration-300" style={{ backgroundColor: isAr ? '#ffffff' : 'transparent', color: isAr ? '#000000' : '#ffffff' }}>AR</button>
                    </div>
                </div>

                {/* Hero Content */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 flex flex-col items-center px-6 text-center mt-10"
                >
                    {finalLogoSrc && (
                        <div className="w-40 h-40 md:w-52 md:h-52 mb-8 relative group">
                            {/* Glow effect behind logo */}
                            <div className="absolute inset-0 rounded-full blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" style={{ backgroundColor: primaryColor }}></div>
                            
                            {/* Circular Premium Logo Container */}
                            <div className="relative z-10 w-full h-full rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-white/5 backdrop-blur-md p-1 md:p-2 flex items-center justify-center transform transition-transform duration-500 hover:scale-105">
                                {/* Inner circle to handle transparent/white logos elegantly */}
                                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-transparent">
                                    <OptimizedMenuImage src={finalLogoSrc} alt={config.name} className="w-full h-full object-contain scale-95" useOriginal={true} />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] tracking-tight leading-tight">{config.name}</h1>
                    
                    {(config.slogan_ar || config.slogan_en) && (
                        <p className="mt-4 text-lg md:text-xl text-white/90 font-medium tracking-wide drop-shadow-md max-w-lg">
                            {isAr ? (config.slogan_ar || config.slogan_en) : (config.slogan_en || config.slogan_ar)}
                        </p>
                    )}
                </motion.div>

                {/* Scroll Indicator */}
                {hasContent && (
                    <motion.div 
                        animate={{ y: [0, 8, 0] }} 
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute bottom-10 z-10 text-white/60 hover:text-white transition-colors"
                    >
                        <ChevronDown className="w-10 h-10 drop-shadow-md" />
                    </motion.div>
                )}
            </div>

            {/* --- CREATIVE QUICK INFO GRID --- */}
            {(config.address || config.working_hours || config.phone || config.map_link) && (
                <div className="px-5 max-w-4xl mx-auto w-full relative z-20 -mt-12 md:-mt-16 mb-8">
                    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {config.map_link && (
                            <a href={config.map_link} target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 rounded-[2rem] shadow-xl backdrop-blur-xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl" style={{ backgroundColor: isDark ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-inner" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                                    <MapPin className="w-7 h-7" />
                                </div>
                                <h3 className="font-bold text-base mb-1" style={{ color: textMain }}>{isAr ? "الموقع" : "Location"}</h3>
                                <p className="text-sm text-center font-medium opacity-70 line-clamp-2" style={{ color: textMuted }}>{config.address || (isAr ? "عرض على الخريطة" : "View on Map")}</p>
                            </a>
                        )}
                        {config.working_hours && (
                            <div className="flex flex-col items-center p-6 rounded-[2rem] shadow-xl backdrop-blur-xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl" style={{ backgroundColor: isDark ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-inner" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                                    <Clock className="w-7 h-7" />
                                </div>
                                <h3 className="font-bold text-base mb-1" style={{ color: textMain }}>{isAr ? "ساعات العمل" : "Working Hours"}</h3>
                                <p className="text-sm text-center font-medium opacity-70 line-clamp-2" style={{ color: textMuted }}>{config.working_hours}</p>
                            </div>
                        )}
                        {config.phone && (
                            <a href={`tel:${config.phone}`} className="flex flex-col items-center p-6 rounded-[2rem] shadow-xl backdrop-blur-xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl" style={{ backgroundColor: isDark ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-inner" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                                    <Phone className="w-7 h-7" />
                                </div>
                                <h3 className="font-bold text-base mb-1" style={{ color: textMain }}>{isAr ? "اتصل بنا" : "Call Us"}</h3>
                                <p className="text-sm text-center font-medium opacity-70 line-clamp-2" dir="ltr" style={{ color: textMuted }}>{config.phone}</p>
                            </a>
                        )}
                    </motion.div>
                </div>
            )}

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
                        <div className="flex flex-wrap justify-center gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-full backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-inner">
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
                {/* Backdrop blur behind the button area */}
                <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent -z-10 pointer-events-none mix-blend-multiply dark:mix-blend-normal"></div>
                
                <button 
                    onClick={onContinue}
                    className="w-full max-w-md py-4 md:py-5 rounded-full font-black text-lg md:text-xl text-white shadow-[0_8px_40px_rgb(0,0,0,0.3)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:brightness-110 flex items-center justify-center gap-3 pointer-events-auto border border-white/20 backdrop-blur-sm overflow-hidden group"
                    style={{ backgroundColor: primaryColor }}
                >
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    <span className="relative z-10 tracking-wider drop-shadow-md">{isAr ? "عــرض المنيـــو" : "View Menu"}</span>
                    <ArrowRight className={`w-6 h-6 md:w-7 md:h-7 relative z-10 transition-transform duration-300 drop-shadow-md ${isAr ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                </button>
            </motion.div>

            <style dangerouslySetInnerHTML={{__html: `
                .swiper-pagination-bullet { background: ${primaryColor} !important; opacity: 0.5; }
                .swiper-pagination-bullet-active { opacity: 1; transform: scale(1.2); }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}} />
        </div>
    );
}
