"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useLanguage } from "@/lib/context/LanguageContext";
import { menuPartners } from "@/lib/data/menuPartners";

export default function MenuPartnersShowcase() {
    const { language } = useLanguage();

    // Do not render section if there are no partners
    if (!menuPartners || menuPartners.length === 0) return null;

    return (
        <section className="relative w-full py-24 overflow-hidden bg-transparent">
            {/* Background elements (subtle) */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue/5 rounded-full blur-[100px] mix-blend-screen" />
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
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue/10 border border-blue/20 mb-6">
                        <span className="text-sm font-semibold tracking-wide text-blue-light uppercase">
                            {language === "ar" ? "شركاء النجاح" : "Our Partners"}
                        </span>
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                        {language === "ar" ? "تصفح نماذج حية لعملائنا" : "Browse Live Examples"}
                    </h2>
                    
                    <p className="text-lg text-silver max-w-2xl mx-auto">
                        {language === "ar" 
                            ? "اضغط على أي من العلامات التجارية أدناه لاستعراض المنيو الإلكتروني الخاص بهم ورؤية الجودة التي نقدمها على أرض الواقع."
                            : "Click on any of the brands below to browse their digital menu and see the quality we deliver in the real world."}
                    </p>
                </motion.div>

                {/* Partners Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    {menuPartners.map((partner, index) => (
                        <motion.div
                            key={partner.id}
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
                            <div className="group relative w-full aspect-[4/3] rounded-3xl overflow-hidden preserve-3d cursor-pointer">
                                {/* Base Glass Background */}
                                <div className="absolute inset-0 bg-glass-dark border border-white/10 dark:border-white/5 backdrop-blur-md rounded-3xl z-0 transition-colors duration-500 group-hover:bg-glass" />
                                
                                {/* Glow Effect on Hover */}
                                <div 
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700 -z-10 rounded-full scale-110"
                                    style={{ background: `radial-gradient(circle, ${partner.themeColor}33 0%, transparent 70%)` }}
                                />

                                {/* Content Container */}
                                <div className="absolute inset-2 md:inset-3 rounded-[1.5rem] bg-background/40 backdrop-blur-sm border border-white/5 overflow-hidden z-10 flex flex-col items-center justify-center p-6 transition-transform duration-500 group-hover:scale-[0.98]">
                                    
                                    {/* The Logo Image */}
                                    <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4 transition-transform duration-500 group-hover:-translate-y-4">
                                        <Image
                                            src={partner.logoPath}
                                            alt={partner.name}
                                            fill
                                            className="object-contain drop-shadow-xl"
                                        />
                                    </div>
                                    
                                    {/* Brand Name */}
                                    <h3 className="text-xl font-bold text-foreground text-center line-clamp-1 transition-transform duration-500 group-hover:-translate-y-2">
                                        {partner.name}
                                    </h3>

                                    {/* Overlay that slides up on hover */}
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-10 group-hover:translate-y-0">
                                        <div className="relative">
                                            <div 
                                                className="absolute -inset-2 rounded-full blur-md opacity-50"
                                                style={{ backgroundColor: partner.themeColor }}
                                            />
                                            <Link 
                                                href={partner.menuUrl}
                                                target="_blank"
                                                className="relative flex items-center gap-3 px-6 py-3 bg-black/80 dark:bg-white/10 text-white font-bold rounded-full border border-white/20 shadow-xl hover:scale-105 active:scale-95 transition-all"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                                <span className="tracking-wide">
                                                    {language === "ar" ? "استعرض المنيو" : "View Menu"}
                                                </span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                {/* Magical Border Stroke Effect */}
                                <div 
                                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700 z-20 mix-blend-overlay"
                                    style={{ 
                                        boxShadow: `inset 0 0 0 1px ${partner.themeColor}` 
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
