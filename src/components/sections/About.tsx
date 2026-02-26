"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/context/LanguageContext";

export default function About() {
    const { language } = useLanguage();
    return (
        <section id="about" className="relative py-24 md:py-32 w-full overflow-hidden border-t border-glass-border">
            <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10 flex flex-col md:flex-row items-center gap-16">

                {/* Left Visual AI Element */}
                <div className="w-full md:w-1/2 flex justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative w-72 h-72 md:w-96 md:h-96"
                    >
                        {/* Spinning glowing rings */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border border-blue/20 border-t-blue/90 shadow-[inset_0_0_30px_rgba(46,163,255,0.1)]"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-4 rounded-full border border-silver/10 border-b-silver/70"
                        />
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-8 rounded-full border border-blue-light/10 border-r-blue-light/60"
                        />

                        {/* Core Neural Node */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-32 h-32 rounded-full bg-blue/10 backdrop-blur-xl border border-blue/40 flex items-center justify-center shadow-[0_0_60px_rgba(46,163,255,0.4)] relative overflow-hidden group">
                                <div className="absolute inset-0 bg-glow-conic animate-spin-slow opacity-30 mix-blend-multiply dark:mix-blend-screen"></div>
                                <div className="w-16 h-16 rounded-full bg-blue animate-pulse-glow shadow-glow-lg relative z-10"></div>
                            </div>
                        </div>

                        {/* Floating particles */}
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-2 h-2 bg-blue-light rounded-full shadow-[0_0_10px_rgba(122,204,255,0.8)]"
                                style={{
                                    top: `${Math.random() * 100}%`,
                                    left: `${Math.random() * 100}%`,
                                }}
                                animate={{
                                    y: [0, -30, 0],
                                    x: [0, (Math.random() - 0.5) * 30, 0],
                                    opacity: [0, 1, 0],
                                    scale: [0, 1.5, 0]
                                }}
                                transition={{
                                    duration: 3 + Math.random() * 3,
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}
                    </motion.div>
                </div>

                {/* Right Text Content */}
                <div className="w-full md:w-1/2">
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                    >
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-8">
                            {language === "ar" ? (
                                <div dir="rtl" className="text-transparent bg-clip-text bg-gradient-to-r from-blue-light via-blue to-blue-dark drop-shadow-[0_0_15px_rgba(46,163,255,0.3)] mb-2">من نحن</div>
                            ) : (
                                <div className="text-foreground text-3xl md:text-4xl lg:text-5xl">About ASN Technology</div>
                            )}
                        </h2>

                        <div className="space-y-6 text-silver/90 text-lg leading-relaxed mb-10 font-light flex flex-col gap-4">
                            {language === "ar" ? (
                                <div dir="rtl" className="font-medium text-foreground">
                                    <p className="mb-2">ASN Technology شركة حلول رقمية متخصصة في بناء منصات ذكية، وأتمتة بالذكاء الاصطناعي، وأنظمة ويب عالية الأداء.</p>
                                    <p>نساعد المطاعم والشركات والعلامات التجارية على التحول الرقمي من خلال:</p>
                                </div>
                            ) : (
                                <div className="text-silver/80 text-base md:text-lg">
                                    <p className="mb-2">ASN Technology is a digital solutions company specializing in intelligent platforms, AI-powered automation, and high-performance web systems.</p>
                                    <p>We help restaurants, brands, and businesses transform digitally through:</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                            {[
                                { ar: 'أنظمة منيو إلكتروني ذكية', en: 'Smart QR menu systems', color: '#10b981', hoverGlow: 'rgba(16, 185, 129, 0.4)', hoverBorder: 'rgba(16, 185, 129, 0.6)' },
                                { ar: 'صناعة محتوى بالذكاء الاصطناعي', en: 'AI content & video creation', color: '#8b5cf6', hoverGlow: 'rgba(139, 92, 246, 0.4)', hoverBorder: 'rgba(139, 92, 246, 0.6)' },
                                { ar: 'تصميم وتطوير مواقع احترافية', en: 'Website & eCommerce dev', color: '#0ea5e9', hoverGlow: 'rgba(14, 165, 233, 0.4)', hoverBorder: 'rgba(14, 165, 233, 0.6)' },
                                { ar: 'تسويق عبر وسائل التواصل', en: 'Social media marketing', color: '#ec4899', hoverGlow: 'rgba(236, 72, 153, 0.4)', hoverBorder: 'rgba(236, 72, 153, 0.6)' },
                                { ar: 'أتمتة واتساب', en: 'WhatsApp automation', color: '#16a34a', hoverGlow: 'rgba(22, 163, 74, 0.4)', hoverBorder: 'rgba(22, 163, 74, 0.6)' },
                                { ar: 'تحليلات وتقارير الأداء', en: 'Analytics & performance', color: '#f43f5e', hoverGlow: 'rgba(244, 63, 94, 0.4)', hoverBorder: 'rgba(244, 63, 94, 0.6)' },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.2 + (i * 0.05) }}
                                    className="flex items-start gap-4 p-4 rounded-xl bg-glass-dark border border-white/5 transition-all duration-300 group hover:-translate-y-1"
                                    style={{
                                        ['--hover-box-shadow' as string]: `0 0 20px -2px ${item.hoverGlow}, inset 0 0 10px -5px ${item.hoverGlow}`,
                                        ['--hover-border-color' as string]: item.hoverBorder
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = `0 0 20px -2px ${item.hoverGlow}, inset 0 0 10px -5px ${item.hoverGlow}`;
                                        e.currentTarget.style.borderColor = item.hoverBorder;
                                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = "";
                                        e.currentTarget.style.borderColor = "";
                                        e.currentTarget.style.backgroundColor = "";
                                    }}
                                >
                                    <div
                                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue/10 border border-blue/30 transition-all duration-300 mt-1"
                                        style={{ color: item.color }}
                                    >
                                        <ChevronRight className="w-4 h-4 group-hover:scale-125 transition-transform duration-300" style={{ stroke: item.color }} />
                                    </div>
                                    <div className="flex flex-col w-full text-start">
                                        <span dir={language === "ar" ? "rtl" : "ltr"} className="text-foreground font-medium mb-1">
                                            {language === "ar" ? item.ar : item.en}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="space-y-4 text-silver/90 text-lg leading-relaxed mb-4 font-light">
                            {language === "ar" ? (
                                <p dir="rtl" className="font-medium text-foreground">
                                    نجمع بين التقنية والاستراتيجية والتصميم لبناء أنظمة تحقق نموًا حقيقيًا.
                                </p>
                            ) : (
                                <p className="text-silver/80 text-base md:text-lg">
                                    We combine technology, strategy, and design to build systems that generate measurable growth.
                                </p>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
