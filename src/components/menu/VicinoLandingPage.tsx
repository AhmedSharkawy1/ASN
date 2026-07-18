import React from 'react';
import { useTheme } from 'next-themes';
import { ArrowRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import OptimizedMenuImage from '@/components/menu/OptimizedMenuImage';

interface VicinoLandingPageProps {
    config: any;
    onContinue: () => void;
}

export default function VicinoLandingPage({ config, onContinue }: VicinoLandingPageProps) {
    const { resolvedTheme } = useTheme();
    const [currentLang, setCurrentLang] = React.useState<'ar'|'en'>(config.default_language === 'en' ? 'en' : 'ar');
    const isAr = currentLang === 'ar';
    
    const isDark = resolvedTheme === 'dark';
    const bgBody = isDark ? '#111111' : '#F4EEE4';
    const textMain = isDark ? '#ffffff' : '#000000';
    const T19_PRIMARY = '#B8860B';
    const primaryColor = config.theme_colors?.primary || T19_PRIMARY;

    let parsedLogos = { light: config.vicino_logo_url, dark: config.vicino_logo_url };
    if (config.vicino_logo_url?.startsWith('{')) {
        try { parsedLogos = JSON.parse(config.vicino_logo_url); } catch {}
    }
    const currentLogo = isDark ? (parsedLogos.dark || parsedLogos.light) : (parsedLogos.light || parsedLogos.dark);
    const finalLogoSrc = currentLogo || config.logo_url;

    return (
        <div className="min-h-screen font-cairo pb-24 relative" style={{ backgroundColor: bgBody, color: textMain }} dir={isAr ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="px-5 pt-8 pb-4 flex flex-col items-center justify-center relative">
                <div className="absolute top-8 right-5">
                    <div className="flex justify-center items-center gap-2 bg-black/5 dark:bg-white/5 rounded-full p-1" dir="ltr">
                        <button onClick={() => setCurrentLang('en')} className="px-3 py-1 rounded-full font-bold text-xs transition-all" style={{ backgroundColor: !isAr ? primaryColor : 'transparent', color: !isAr ? '#fff' : textMain }}>EN</button>
                        <button onClick={() => setCurrentLang('ar')} className="px-3 py-1 rounded-full font-bold text-xs transition-all" style={{ backgroundColor: isAr ? primaryColor : 'transparent', color: isAr ? '#fff' : textMain }}>AR</button>
                    </div>
                </div>
                {finalLogoSrc && <OptimizedMenuImage src={finalLogoSrc} alt={config.name} className="h-24 w-24 object-contain mb-4" useOriginal={true} />}
                <h1 className="text-2xl font-black text-center">{config.name}</h1>
            </div>

            {/* Video/Hero */}
            {config.vicino_video_url && (
                <div className="px-5 mb-8">
                    <video 
                        src={config.vicino_video_url} 
                        autoPlay muted loop playsInline 
                        className="w-full h-64 object-cover rounded-2xl shadow-lg"
                    />
                </div>
            )}

            {/* About Us */}
            {(isAr ? config.vicino_about_ar : config.vicino_about_en) && (
                <div className="px-5 mb-8 text-center">
                    <h2 className="text-xl font-bold mb-3" style={{ color: primaryColor }}>{isAr ? "من نحن" : "About Us"}</h2>
                    <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap">
                        {isAr ? config.vicino_about_ar : config.vicino_about_en}
                    </p>
                </div>
            )}

            {/* Our History */}
            {(isAr ? config.vicino_history_ar : config.vicino_history_en) && (
                <div className="px-5 mb-8 text-center bg-black/5 dark:bg-white/5 py-6 rounded-2xl mx-5">
                    <h2 className="text-xl font-bold mb-3" style={{ color: primaryColor }}>{isAr ? "تاريخنا" : "Our History"}</h2>
                    <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap">
                        {isAr ? config.vicino_history_ar : config.vicino_history_en}
                    </p>
                </div>
            )}

            {/* Images */}
            {config.vicino_images && config.vicino_images.length > 0 && (
                <div className="px-5 mb-12">
                    <Swiper key={isAr ? 'rtl' : 'ltr'} modules={[Autoplay]} autoplay={{ delay: 2500 }} spaceBetween={10} slidesPerView={1.2} className="w-full">
                        {config.vicino_images.map((img: string, i: number) => (
                            <SwiperSlide key={i}>
                                <OptimizedMenuImage src={img} alt="Gallery" className="w-full h-48 object-cover rounded-2xl shadow-sm" />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            )}

            {/* Floating Button */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/20 dark:from-black/80 to-transparent z-50 flex justify-center">
                <button 
                    onClick={onContinue}
                    className="w-full max-w-md py-4 rounded-2xl font-bold text-lg text-white shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-3"
                    style={{ backgroundColor: primaryColor }}
                >
                    {isAr ? "عرض المنيو" : "View Menu"}
                    <ArrowRight className={`w-6 h-6 ${isAr ? "rotate-180" : ""}`} />
                </button>
            </div>
        </div>
    );
}
