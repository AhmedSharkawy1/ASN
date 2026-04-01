"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ExternalLink, Palette } from "lucide-react";
import { useLanguage } from "@/lib/context/LanguageContext";
import { menuThemesShowcase, siteSettings } from "@/lib/data/menuThemes";

export default function MenuThemesShowcase() {
    const { language } = useLanguage();

    // Do not render section if disabled or no themes
    if (!siteSettings.showMarketingThemesSection || !menuThemesShowcase || menuThemesShowcase.length === 0) return null;

    // Using the main domain configured in the app settings
    const ROOT_DOMAIN = "asntechnology.net";

    const getThemeUrl = (themeSubdomain: string) => {
        return `https://${themeSubdomain}.${ROOT_DOMAIN}`;
    };

    return (
        <section className="relative w-full py-24 overflow-hidden bg-stone-50/50 dark:bg-black/20">
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-fuchsia-500/5 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10 flex flex-col items-center">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 mb-6">
                        <Palette className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                        <span className="text-sm font-semibold tracking-wide text-fuchsia-600 dark:text-fuchsia-400 uppercase">
                            {language === "ar" ? "معرض الثيمات" : "Theme Gallery"}
                        </span>
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-800 dark:text-white mb-4">
                        {language === "ar" ? "اختر التصميم الذي يمثل هويتك" : "Choose Your Brand Identity"}
                    </h2>
                    
                    <p className="text-lg text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto">
                        {language === "ar" 
                            ? "نوفر لك مجموعة متنوعة من القوالب الجاهزة المصممة بعناية لتناسب جميع أنواع المطاعم والمقاهي. تصفح النماذج الحية أدناه."
                            : "We provide a diverse collection of carefully designed templates to suit all types of restaurants and cafes. Browse the live demos below."}
                    </p>
                </motion.div>

                {/* Themes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    {menuThemesShowcase.map((theme, index) => (
                        <motion.div
                            key={theme.id}
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ 
                                duration: 0.5, 
                                delay: index * 0.1,
                                type: "spring",
                                stiffness: 200,
                                damping: 20
                            }}
                        >
                            <div className="group relative w-full aspect-[4/5] rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500">
                                {/* Base Background */}
                                <div className="absolute inset-0 bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-white/5 z-0" />
                                
                                {/* Glow Effect on Hover */}
                                <div 
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700 -z-10 rounded-full scale-110"
                                    style={{ background: `radial-gradient(circle, ${theme.themeColor}33 0%, transparent 70%)` }}
                                />

                                {/* Image Image Container */}
                                <div className="absolute inset-2 top-2 bottom-20 rounded-2xl overflow-hidden bg-stone-200 dark:bg-black z-10 transition-transform duration-500 group-hover:scale-[0.98]">
                                    {/* Using regular img tag to avoid next.config.js image domain issues for external placeholders */}
                                    <img
                                        src={theme.imagePath}
                                        alt={theme.name}
                                        className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    
                                    {/* Overlay that slides up on hover */}
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                                        <div className="relative translate-y-10 group-hover:translate-y-0 transition-transform duration-500 delay-100">
                                            <div 
                                                className="absolute -inset-2 rounded-full blur-xl opacity-60"
                                                style={{ backgroundColor: theme.themeColor }}
                                            />
                                            <Link 
                                                href={getThemeUrl(theme.subdomain)}
                                                target="_blank"
                                                className="relative flex items-center gap-3 px-6 py-3 bg-white text-slate-900 font-bold rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                                <span className="tracking-wide">
                                                    {language === "ar" ? "معاينة الثيم" : "Preview Theme"}
                                                </span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Bottom Info Bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-20 px-6 flex items-center justify-between z-10 bg-white/80 dark:bg-[#131b26]/80 backdrop-blur-md border-t border-stone-200 dark:border-white/5">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-1">
                                            {language === "ar" ? theme.name : theme.nameEn}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div 
                                                className="w-2.5 h-2.5 rounded-full" 
                                                style={{ backgroundColor: theme.themeColor, boxShadow: `0 0 8px ${theme.themeColor}` }}
                                            />
                                            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                                                {theme.subdomain}.asntechnology.net
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Magical Border Stroke Effect */}
                                <div 
                                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700 z-20 mix-blend-overlay"
                                    style={{ 
                                        boxShadow: `inset 0 0 0 1px ${theme.themeColor}` 
                                    }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
