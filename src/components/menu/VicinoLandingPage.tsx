import React from 'react';
import { useTheme } from 'next-themes';
import { ArrowRight, ChevronDown } from 'lucide-react';
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

    return (
        <div className="min-h-screen font-cairo flex flex-col selection:bg-black/10" style={{ backgroundColor: bgBody, color: textMain }} dir={isAr ? 'rtl' : 'ltr'}>
            
            {/* --- HERO SECTION --- */}
            <div className={`relative w-full ${hasContent ? 'h-[80vh] md:h-[90vh]' : 'h-screen'} flex flex-col items-center justify-center overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem] shadow-2xl`}>
                {/* Hero Background */}
                <div className="absolute inset-0 w-full h-full bg-black">
                    {heroMedia?.type === 'video' ? (
                        <video 
                            src={heroMedia.src} 
                            autoPlay muted loop playsInline 
                            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
                            style={{ filter: 'brightness(0.8) contrast(1.2)' }}
                        />
                    ) : heroMedia?.type === 'image' ? (
                        <OptimizedMenuImage 
                            src={heroMedia.src} 
                            alt="Hero" 
                            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
                            style={{ filter: 'brightness(0.8) contrast(1.2)' }}
                        />
                    ) : (
                        <div className="w-full h-full" style={{ backgroundColor: primaryColor, opacity: 0.15 }}></div>
                    )}
                    {/* Premium Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90"></div>
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
                        <div className="w-36 h-36 md:w-48 md:h-48 mb-8 relative">
                            {/* Glow effect behind logo */}
                            <div className="absolute inset-0 rounded-full blur-3xl opacity-50" style={{ backgroundColor: primaryColor }}></div>
                            <OptimizedMenuImage src={finalLogoSrc} alt={config.name} className="w-full h-full object-contain relative z-10 drop-shadow-2xl" useOriginal={true} />
                        </div>
                    )}
                    <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-lg tracking-tight leading-tight">{config.name}</h1>
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
                        className="absolute bottom-8 z-10 text-white/60 hover:text-white transition-colors"
                    >
                        <ChevronDown className="w-10 h-10 drop-shadow-md" />
                    </motion.div>
                )}
            </div>

            {/* --- CONTENT SECTION --- */}
            {hasContent && (
                <div className="flex-1 px-6 pt-16 pb-40 max-w-4xl mx-auto w-full flex flex-col gap-16 md:gap-24">
                    
                    {/* About Us */}
                    {(isAr ? config.vicino_about_ar : config.vicino_about_en) && (
                        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="text-center px-4 md:px-12">
                            <h2 className="text-sm font-black uppercase tracking-[0.3em] mb-6 opacity-80" style={{ color: primaryColor }}>{isAr ? "من نحن" : "About Us"}</h2>
                            <p className="text-lg md:text-2xl leading-[1.8] font-medium" style={{ color: textMuted }}>
                                {isAr ? config.vicino_about_ar : config.vicino_about_en}
                            </p>
                        </motion.div>
                    )}

                    {/* Our History */}
                    {(isAr ? config.vicino_history_ar : config.vicino_history_en) && (
                        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="relative p-8 md:p-12 rounded-[2rem] overflow-hidden shadow-sm border border-black/5 dark:border-white/5" style={{ backgroundColor: isDark ? '#141414' : '#f9fafb' }}>
                            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: primaryColor }}></div>
                            <h2 className="text-sm font-black uppercase tracking-[0.3em] mb-6 opacity-80" style={{ color: primaryColor }}>{isAr ? "تاريخنا" : "Our History"}</h2>
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
                                className="w-full rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden aspect-[4/3] md:aspect-[16/9]"
                            >
                                {config.vicino_images.map((img: string, i: number) => (
                                    <SwiperSlide key={i}>
                                        <OptimizedMenuImage src={img} alt="Gallery" className="w-full h-full object-cover transition-transform duration-[10s] hover:scale-105" />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </motion.div>
                    )}
                </div>
            )}

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
                    className="w-full max-w-md py-4 md:py-5 rounded-full font-black text-lg md:text-xl text-white shadow-[0_8px_40px_rgb(0,0,0,0.2)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:brightness-110 flex items-center justify-center gap-3 pointer-events-auto border border-white/10 backdrop-blur-sm"
                    style={{ backgroundColor: primaryColor }}
                >
                    <span className="relative z-10 tracking-wider">{isAr ? "عــرض المنيـــو" : "View Menu"}</span>
                    <ArrowRight className={`w-6 h-6 md:w-7 md:h-7 relative z-10 transition-transform duration-300 ${isAr ? "rotate-180" : ""}`} />
                </button>
            </motion.div>

            <style dangerouslySetInnerHTML={{__html: `
                .swiper-pagination-bullet { background: ${primaryColor} !important; opacity: 0.5; }
                .swiper-pagination-bullet-active { opacity: 1; transform: scale(1.2); }
            `}} />
        </div>
    );
}
