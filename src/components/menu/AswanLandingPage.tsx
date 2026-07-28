'use client';

import { getAswanColors } from '@/lib/aswanVariants';
import React from 'react';
import { useTheme } from 'next-themes';
import { ArrowRight, MapPin, Phone, Clock, Instagram, Facebook, Youtube, Sun, Moon, Sparkles, X } from 'lucide-react';
import { FaTiktok, FaSnapchatGhost, FaWhatsapp } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';
import { motion, AnimatePresence } from 'framer-motion';

interface AswanLandingPageProps {
    config: any;
    onContinue: () => void;
}

export default function AswanLandingPage({ config, onContinue }: AswanLandingPageProps) {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    const [showPhoneModal, setShowPhoneModal] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        if (config.default_theme_mode && config.default_theme_mode !== 'system') {
            setTheme(config.default_theme_mode);
        }
    }, [config.default_theme_mode, setTheme]);

    const isDark = mounted && resolvedTheme === 'dark';
    const { primaryColor, bgBody, bgCard, textMain, textMuted, borderColor, activeBgImage, hasBgImage } = getAswanColors(config, isDark);

    const displayNumbers = (config.phone_numbers && config.phone_numbers.length > 0)
        ? config.phone_numbers
        : (config.phone ? [{ label: 'Contact Number', number: config.phone }] : []);

    let parsedLogos = { light: config.aswan_logo_url || config.vicino_logo_url, dark: config.aswan_logo_url || config.vicino_logo_url };
    const logoField = config.aswan_logo_url || config.vicino_logo_url;
    if (logoField && logoField.startsWith('{')) {
        try { parsedLogos = JSON.parse(logoField); } catch {}
    }
    const currentLogo = isDark ? (parsedLogos.dark || parsedLogos.light) : (parsedLogos.light || parsedLogos.dark);
    const finalLogoSrc = currentLogo || config.logo_url;

    const videoUrl = config.theme_colors?.aswan_video_url || config.aswan_video_url || config.vicino_video_url;
    const aboutText = config.theme_colors?.aswan_about_en || config.aswan_about_en || config.vicino_about_en || config.slogan_en;
    const historyText = config.theme_colors?.aswan_history_en || config.aswan_history_en || config.vicino_history_en;
    const galleryImages = config.theme_colors?.aswan_images || config.aswan_images || config.vicino_images || config.cover_images || [];

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

    const heroMedia = videoUrl 
        ? { type: 'video', src: videoUrl, embed: getEmbedUrl(videoUrl) } 
        : (galleryImages[0] 
            ? { type: 'image', src: galleryImages[0] } 
            : null);

    const socialLinks = [
        { icon: FaWhatsapp, url: config.whatsapp_number ? `https://wa.me/${config.whatsapp_number.replace(/\+/g, '')}` : null, color: '#25D366', name: 'WhatsApp' },
        { icon: Instagram, url: config.instagram_url, color: '#E1306C', name: 'Instagram' },
        { icon: FaTiktok, url: config.tiktok_url, color: isDark ? '#ffffff' : '#000000', name: 'TikTok' },
        { icon: Facebook, url: config.facebook_url, color: '#1877F2', name: 'Facebook' },
        { icon: FaSnapchatGhost, url: config.snapchat_url, color: '#FFFC00', name: 'Snapchat', textColor: '#000000' },
        { icon: Youtube, url: config.youtube_url, color: '#FF0000', name: 'YouTube' },
    ].filter(link => link.url);

    const fadeInUp = {
        hidden: { opacity: 0, y: 25 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } }
    };

    return (
        <div 
            className="min-h-screen font-sans flex flex-col relative transition-colors duration-300"
            style={{ 
                backgroundColor: bgBody, 
                color: textMain,
                backgroundImage: hasBgImage ? `url(${activeBgImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                backgroundRepeat: 'no-repeat'
            }} 
            dir="ltr"
        >
            {/* Background Overlay for image readability */}
            {hasBgImage && (
                <div 
                    className="fixed inset-0 pointer-events-none transition-opacity duration-300 z-0"
                    style={{
                        backgroundColor: isDark ? 'rgba(5, 10, 20, 0.85)' : 'rgba(255, 255, 255, 0.88)',
                        backdropFilter: 'blur(8px)'
                    }}
                />
            )}

            <div className="relative z-10 flex flex-col flex-1">
                {/* --- TOP NAV BAR --- */}
                <div className="w-full flex justify-between items-center px-6 pt-6 pb-4 max-w-4xl mx-auto">
                    {/* Dark/Light mode switcher */}
                    <button 
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md border"
                        style={{ backgroundColor: bgCard, borderColor: borderColor }}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
                    </button>

                    {/* Restaurant Logo */}
                    {finalLogoSrc && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6 }}
                            className="w-24 h-24 md:w-32 md:h-32 relative flex-shrink-0"
                        >
                            <div className="absolute inset-0 rounded-full blur-xl opacity-30" style={{ backgroundColor: primaryColor }} />
                            <div 
                                className="relative w-full h-full rounded-full overflow-hidden border-2 shadow-xl flex items-center justify-center p-1.5"
                                style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: primaryColor }}
                            >
                                <OptimizedMenuImage src={finalLogoSrc} alt={config.name} className="w-full h-full object-contain rounded-full" useOriginal={true} />
                            </div>
                        </motion.div>
                    )}

                    {/* Action button */}
                    <button 
                        onClick={onContinue}
                        className="px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm text-white flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 active:scale-95"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <span>Menu</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {/* --- HERO BRAND HEADER --- */}
                <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                    className="text-center px-6 py-4 max-w-2xl mx-auto"
                >
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2" style={{ color: textMain }}>
                        {config.name}
                    </h1>
                    {config.slogan_en && (
                        <p className="text-sm md:text-lg font-medium opacity-80" style={{ color: textMuted }}>
                            {config.slogan_en}
                        </p>
                    )}
                </motion.div>

                {/* --- MEDIA SECTION (Video / Image Banner) --- */}
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
                                heroMedia.embed ? (
                                    <iframe
                                        src={heroMedia.embed}
                                        className="w-full aspect-video block"
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                        style={{ border: 'none' }}
                                    />
                                ) : (
                                    <video
                                        src={heroMedia.src}
                                        controls
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        className="w-full aspect-video object-cover block"
                                    />
                                )
                            ) : (
                                <OptimizedMenuImage src={heroMedia.src} alt={config.name} className="w-full h-[240px] md:h-[380px] object-cover" />
                            )}
                        </motion.div>
                    </div>
                )}

                {/* --- ABOUT & HISTORY SECTIONS --- */}
                <div className="w-full px-6 max-w-4xl mx-auto space-y-6 mb-10">
                    {aboutText && (
                        <motion.div 
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                            className="p-6 md:p-8 rounded-3xl border shadow-xl backdrop-blur-md"
                            style={{ backgroundColor: `${bgCard}cc`, borderColor: borderColor }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-5 h-5" style={{ color: primaryColor }} />
                                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wider">About Us</h2>
                            </div>
                            <p className="text-sm md:text-base leading-relaxed font-normal opacity-90 whitespace-pre-line" style={{ color: textMain }}>
                                {aboutText}
                            </p>
                        </motion.div>
                    )}

                    {historyText && (
                        <motion.div 
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                            className="p-6 md:p-8 rounded-3xl border shadow-xl backdrop-blur-md"
                            style={{ backgroundColor: `${bgCard}cc`, borderColor: borderColor }}
                        >
                            <h2 className="text-xl md:text-2xl font-bold mb-3 uppercase tracking-wider" style={{ color: primaryColor }}>
                                Our Heritage & Story
                            </h2>
                            <p className="text-sm md:text-base leading-relaxed font-normal opacity-90 whitespace-pre-line" style={{ color: textMain }}>
                                {historyText}
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* --- GALLERY SLIDER --- */}
                {galleryImages.length > 0 && (
                    <div className="w-full max-w-4xl mx-auto mb-12 px-4">
                        <h2 className="text-xl font-bold mb-4 px-2 uppercase tracking-wide flex items-center gap-2">
                            <span>Experience Atmosphere</span>
                        </h2>
                        <Swiper
                            modules={[Autoplay, Pagination]}
                            autoplay={{ delay: 3500, disableOnInteraction: false }}
                            pagination={{ clickable: true }}
                            spaceBetween={16}
                            slidesPerView={1.2}
                            breakpoints={{ 640: { slidesPerView: 2.2 } }}
                            className="w-full rounded-3xl"
                        >
                            {galleryImages.map((img: string, idx: number) => (
                                <SwiperSlide key={idx} className="pb-8">
                                    <div className="rounded-3xl overflow-hidden shadow-lg border h-[220px] md:h-[280px]" style={{ borderColor: borderColor }}>
                                        <OptimizedMenuImage src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                )}

                {/* --- CTA BUTTON --- */}
                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="w-full px-6 max-w-xl mx-auto text-center mb-12"
                >
                    <button 
                        onClick={onContinue}
                        className="w-full py-5 rounded-3xl font-black text-lg md:text-xl text-white shadow-2xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <span>EXPLORE OUR MENU</span>
                        <ArrowRight className="w-6 h-6" />
                    </button>
                </motion.div>

                {/* --- LOCATION, HOURS & CONTACT INFO --- */}
                <div className="w-full px-6 max-w-4xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.address && (
                        <div className="p-5 rounded-3xl border flex items-start gap-4 shadow-md backdrop-blur-md" style={{ backgroundColor: `${bgCard}cc`, borderColor: borderColor }}>
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm uppercase text-slate-400 mb-1">Our Location</h3>
                                <p className="text-sm font-semibold">{config.address}</p>
                                {config.map_link && (
                                    <a href={config.map_link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-sky-500 hover:underline mt-1 block">
                                        View on Google Maps →
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {config.working_hours && (
                        <div className="p-5 rounded-3xl border flex items-start gap-4 shadow-md backdrop-blur-md" style={{ backgroundColor: `${bgCard}cc`, borderColor: borderColor }}>
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm uppercase text-slate-400 mb-1">Opening Hours</h3>
                                <p className="text-sm font-semibold whitespace-pre-line">{config.working_hours}</p>
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
                            <span>Call Us Directly</span>
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
                                <h3 className="font-bold text-lg">Contact Phone Numbers</h3>
                                <button onClick={() => setShowPhoneModal(false)} className="p-1 rounded-full hover:bg-slate-500/20">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {displayNumbers.map((num: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={`tel:${num.number}`}
                                        className="flex items-center justify-between p-4 rounded-2xl border transition-colors hover:bg-slate-500/10"
                                        style={{ borderColor: borderColor }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-5 h-5" style={{ color: primaryColor }} />
                                            <div>
                                                <div className="font-bold text-sm">{num.label || 'Phone Number'}</div>
                                                <div className="text-xs opacity-70" dir="ltr">{num.number}</div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 opacity-50" />
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
