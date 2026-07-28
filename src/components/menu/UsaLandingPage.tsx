import { getUsaColors } from '@/lib/usaVariants';
import React from 'react';
import { useTheme } from 'next-themes';
import { ArrowRight, Phone, Clock, Instagram, Facebook, Youtube, Sun, Moon, Sparkles, ChefHat, Award } from 'lucide-react';
import { FaTiktok, FaSnapchatGhost, FaWhatsapp } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { motion, AnimatePresence } from 'framer-motion';

interface UsaLandingPageProps {
    config: any;
    onContinue: () => void;
}

export default function UsaLandingPage({ config, onContinue }: UsaLandingPageProps) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    const [forcedMode, setForcedMode] = React.useState<'light' | 'dark' | null>(null);
    const [showPhoneModal, setShowPhoneModal] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (config.default_theme_mode && config.default_theme_mode !== 'system') {
            setTheme(config.default_theme_mode);
        }
    }, [config.default_theme_mode, setTheme]);

    const isDark = forcedMode !== null 
        ? forcedMode === 'dark' 
        : (mounted && (resolvedTheme === 'dark' || theme === 'dark'));

    const toggleThemeMode = () => {
        const nextMode = isDark ? 'light' : 'dark';
        setForcedMode(nextMode);
        setTheme(nextMode);
    };

    const { primaryColor, bgBody, textMain, textMuted, bgCard, borderColor, hasBgImage, activeBgImage } = getUsaColors(config, isDark);

    const displayNumbers = (config.phone_numbers && config.phone_numbers.length > 0) 
        ? config.phone_numbers 
        : (config.phone ? [{ label: 'Contact Number', number: config.phone }] : []);

    let parsedLogos = { light: config.vicino_logo_url, dark: config.vicino_logo_url };
    if (config.vicino_logo_url?.startsWith('{')) {
        try { parsedLogos = JSON.parse(config.vicino_logo_url); } catch {}
    }
    const currentLogo = isDark ? (parsedLogos.dark || parsedLogos.light) : (parsedLogos.light || parsedLogos.dark);
    const finalLogoSrc = currentLogo || config.logo_url;

    const [showSplash, setShowSplash] = React.useState(!!config.theme_colors?.vicino_loading_logo);

    React.useEffect(() => {
        if (showSplash) {
            const timer = setTimeout(() => setShowSplash(false), 2200);
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

    const hasContent = config.vicino_about_en || config.vicino_about_ar || config.vicino_history_en || config.vicino_history_ar || (config.vicino_images && config.vicino_images.length > 0);

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } }
    };

    const socialLinks = [
        { icon: FaWhatsapp, url: config.whatsapp_number ? `https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}` : null, color: '#25D366', name: 'WhatsApp' },
        { icon: Instagram, url: config.instagram_url, color: '#E1306C', name: 'Instagram' },
        { icon: FaTiktok, url: config.tiktok_url, color: isDark ? '#ffffff' : '#000000', name: 'TikTok', textColor: isDark ? '#ffffff' : '#000000' },
        { icon: Facebook, url: config.facebook_url, color: '#1877F2', name: 'Facebook' },
        { icon: FaSnapchatGhost, url: config.snapchat_url, color: '#FFFC00', name: 'Snapchat', textColor: isDark ? '#ffffff' : '#000000' },
        { icon: Youtube, url: config.youtube_url, color: '#FF0000', name: 'YouTube' },
    ].filter(link => link.url);

    if (showSplash) {
        return (
            <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center">
                <div className="relative w-48 h-48 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[4px] border-rose-500/20 border-t-rose-500 animate-spin"></div>
                    <OptimizedMenuImage src={config.theme_colors?.vicino_loading_logo} alt="Loading" className="w-32 h-32 object-contain animate-pulse rounded-full" />
                </div>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen font-sans flex flex-col ltr text-left selection:bg-rose-500/20 transition-colors duration-300" 
            style={{ 
                backgroundColor: bgBody, 
                color: textMain,
                ...(hasBgImage ? {
                    backgroundImage: `url(${activeBgImage})`,
                    backgroundSize: 'cover',
                    backgroundAttachment: 'fixed',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                } : {})
            }}
        >
            
            {/* Header & Prominent Centered Brand Logo (Like Theme Aswan) */}
            <div className="w-full max-w-4xl mx-auto px-6 pt-6 pb-4 text-center flex flex-col items-center justify-center">
                
                {/* Top Utility Bar */}
                <div className="w-full flex justify-between items-center mb-6">
                    {displayNumbers.length > 0 ? (
                        <button
                            onClick={() => setShowPhoneModal(true)}
                            className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-emerald-400 hover:text-emerald-300 transition-colors shadow-sm"
                            title="Call Us"
                        >
                            <Phone className="w-4 h-4" />
                        </button>
                    ) : <div />}

                    {/* Dark/Light Switcher */}
                    <button
                        onClick={toggleThemeMode}
                        className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-slate-100 transition-colors shadow-sm"
                        title="Toggle Light/Dark Mode"
                    >
                        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
                    </button>
                </div>

                {/* Prominent Logo */}
                {finalLogoSrc && (
                    <div className="relative mb-4 group">
                        <div className="absolute inset-0 rounded-full blur-xl opacity-35" style={{ backgroundColor: primaryColor }} />
                        <div className={`relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-rose-500 shadow-2xl flex items-center justify-center p-2 backdrop-blur-md ${
                            isDark ? 'bg-slate-950/80' : 'bg-white/90'
                        }`}>
                            <OptimizedMenuImage src={finalLogoSrc} alt={config.name} className="w-full h-full object-contain rounded-full" useOriginal={true} />
                        </div>
                    </div>
                )}

                <h1 className="font-black text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight mb-1">{config.name}</h1>
                <span className="text-xs sm:text-sm font-extrabold text-rose-500 tracking-widest uppercase">Authentic Taste</span>
            </div>

            {/* Hero Media Section */}
            {heroMedia && (
                <div className="w-full px-4 md:px-8 max-w-4xl mx-auto mb-8 relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-full rounded-3xl overflow-hidden shadow-2xl bg-black flex items-center justify-center border border-slate-800"
                    >
                        {heroMedia.type === 'video' ? (
                            heroMedia.embed ? (
                                <iframe
                                    src={heroMedia.embed}
                                    className="w-full aspect-video block"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowFullScreen
                                    style={{ border: 'none', backgroundColor: '#000' }}
                                ></iframe>
                            ) : (
                                <video 
                                    src={heroMedia.src} 
                                    autoPlay 
                                    loop 
                                    muted 
                                    playsInline 
                                    className="w-full aspect-video object-cover block"
                                />
                            )
                        ) : (
                            <OptimizedMenuImage 
                                src={heroMedia.src} 
                                alt={config.name} 
                                className="w-full aspect-video md:aspect-[21/9] object-cover block"
                            />
                        )}
                    </motion.div>
                </div>
            )}

            {/* Quick Action Bar: View Menu Button */}
            <div className="w-full px-6 max-w-4xl mx-auto mb-10 text-center">
                <motion.button
                    onClick={onContinue}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 px-8 rounded-2xl font-black text-base md:text-lg tracking-wide uppercase shadow-xl flex items-center justify-center gap-3 text-white transition-all"
                    style={{ backgroundColor: primaryColor }}
                >
                    <span>Explore Menu & Order Online</span>
                    <ArrowRight className="w-5 h-5 animate-pulse" />
                </motion.button>
            </div>

            {/* Story & About Section */}
            {hasContent && (
                <div className="w-full px-6 max-w-4xl mx-auto mb-12 space-y-8">
                    
                    {(config.vicino_about_en || config.vicino_about_ar) && (
                        <motion.div 
                            variants={fadeInUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className={`p-6 md:p-8 rounded-3xl border shadow-lg space-y-3 ${
                                hasBgImage 
                                    ? (isDark ? 'bg-slate-900/90 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md')
                                    : ''
                            }`}
                            style={{ backgroundColor: hasBgImage ? undefined : bgCard, borderColor }}
                        >
                            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest">
                                <ChefHat className="w-4 h-4" />
                                <span>Our Craft & Passion</span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">About {config.name}</h2>
                            <p className="text-sm md:text-base leading-relaxed opacity-90 font-normal">
                                {config.vicino_about_en || config.vicino_about_ar}
                            </p>
                        </motion.div>
                    )}

                    {(config.vicino_history_en || config.vicino_history_ar) && (
                        <motion.div 
                            variants={fadeInUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className={`p-6 md:p-8 rounded-3xl border shadow-lg space-y-3 ${
                                hasBgImage 
                                    ? (isDark ? 'bg-slate-900/90 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md')
                                    : ''
                            }`}
                            style={{ backgroundColor: hasBgImage ? undefined : bgCard, borderColor }}
                        >
                            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest">
                                <Award className="w-4 h-4" />
                                <span>Heritage & Quality</span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Our Story</h2>
                            <p className="text-sm md:text-base leading-relaxed opacity-90 font-normal">
                                {config.vicino_history_en || config.vicino_history_ar}
                            </p>
                        </motion.div>
                    )}

                    {/* Gallery Carousel */}
                    {config.vicino_images && config.vicino_images.length > 0 && (
                        <motion.div 
                            variants={fadeInUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest px-1">
                                <Sparkles className="w-4 h-4" />
                                <span>Visual Atmosphere</span>
                            </div>
                            <Swiper
                                modules={[Autoplay, EffectFade, Pagination]}
                                autoplay={{ delay: 3500, disableOnInteraction: false }}
                                pagination={{ clickable: true }}
                                loop={true}
                                className="rounded-3xl overflow-hidden shadow-xl border"
                                style={{ borderColor }}
                            >
                                {config.vicino_images.map((imgUrl: string, idx: number) => (
                                    <SwiperSlide key={idx}>
                                        <OptimizedMenuImage 
                                            src={imgUrl} 
                                            alt={`Gallery ${idx + 1}`} 
                                            className="w-full h-64 md:h-96 object-cover"
                                        />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </motion.div>
                    )}

                </div>
            )}

            {/* Info Cards: Work Hours, Branches & Direct Contact */}
            <div className="w-full px-6 max-w-4xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Working Hours */}
                {(config.work_hours_en || config.work_hours_ar || config.opening_hours) && (
                    <div 
                        className={`p-6 rounded-3xl border shadow-md flex items-start gap-4 ${
                            hasBgImage 
                                ? (isDark ? 'bg-slate-900/90 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md')
                                : ''
                        }`}
                        style={{ backgroundColor: hasBgImage ? undefined : bgCard, borderColor }}
                    >
                        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 flex-shrink-0">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-base">Opening Hours</h3>
                            <p className="text-xs opacity-75 leading-relaxed">
                                {config.work_hours_en || config.work_hours_ar || config.opening_hours}
                            </p>
                        </div>
                    </div>
                )}

                {/* Direct Phone / Contact */}
                {displayNumbers.length > 0 && (
                    <div 
                        onClick={() => setShowPhoneModal(true)}
                        className={`p-6 rounded-3xl border shadow-md flex items-start gap-4 cursor-pointer hover:border-rose-500/50 transition-all ${
                            hasBgImage 
                                ? (isDark ? 'bg-slate-900/90 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md')
                                : ''
                        }`}
                        style={{ backgroundColor: hasBgImage ? undefined : bgCard, borderColor }}
                    >
                        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 flex-shrink-0">
                            <Phone className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-base">Contact & Hotline</h3>
                            <p className="text-xs opacity-75">Click to call or view available phone numbers</p>
                        </div>
                    </div>
                )}

            </div>

            {/* Social Links Bar */}
            {socialLinks.length > 0 && (
                <div className="w-full px-6 max-w-4xl mx-auto mb-12 text-center space-y-4">
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-75">Connect With Us</span>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {socialLinks.map((social, i) => {
                            const IconComponent = social.icon;
                            return (
                                <a
                                    key={i}
                                    href={social.url!}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-sm text-xs font-bold transition-all hover:scale-105 ${
                                        hasBgImage 
                                            ? (isDark ? 'bg-slate-900/90 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md')
                                            : ''
                                    }`}
                                    style={{ backgroundColor: hasBgImage ? undefined : bgCard, borderColor, color: social.textColor || textMain }}
                                >
                                    <IconComponent className="w-4 h-4" style={{ color: social.color }} />
                                    <span>{social.name}</span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="w-full py-8 text-center border-t text-xs opacity-60" style={{ borderColor }}>
                <p>&copy; {new Date().getFullYear()} {config.name}. All Rights Reserved.</p>
            </div>

            {/* Phone Numbers Modal */}
            <AnimatePresence>
                {showPhoneModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl space-y-4 text-left ${
                                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                            style={{ borderColor }}
                        >
                            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor }}>
                                <h3 className="font-bold text-base">Call Us Directly</h3>
                                <button onClick={() => setShowPhoneModal(false)} className="opacity-70 hover:opacity-100">✕</button>
                            </div>
                            <div className="space-y-2">
                                {displayNumbers.map((numObj: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={`tel:${numObj.number}`}
                                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800 transition-colors text-sm font-semibold border border-slate-700/50"
                                    >
                                        <span>{numObj.label || 'Phone'}</span>
                                        <span className="text-rose-500 font-bold">{numObj.number}</span>
                                    </a>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
