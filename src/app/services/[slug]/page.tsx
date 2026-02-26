"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/lib/data/services";
import StarsBackground from "@/components/ui/StarsBackground";
import LightBackgroundAnimation from "@/components/ui/LightBackgroundAnimation";
import Footer from "@/components/ui/Footer";
import { useRef } from "react";
import Image from "next/image";
import { useLanguage } from "@/lib/context/LanguageContext";

export default function ServicePage({ params }: { params: { slug: string } }) {
    const service = getServiceBySlug(params.slug);
    const { language } = useLanguage();

    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    // Parallax for background elements
    const yBackground = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacityBackground = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    if (!service) {
        notFound();
    }

    return (
        <main ref={containerRef} className="min-h-screen bg-slate-100/80 dark:bg-background relative overflow-hidden flex flex-col pt-32 pb-24">
            <StarsBackground />
            <LightBackgroundAnimation />
            {/* Cinematic Background */}
            <motion.div
                style={{ y: yBackground, opacity: opacityBackground }}
                className="absolute inset-0 z-0 pointer-events-none"
            >
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue/10 rounded-full blur-[150px] mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-100" />
                <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[60%] bg-blue-dark/20 rounded-full blur-[150px] mix-blend-multiply dark:mix-blend-screen opacity-30 dark:opacity-100" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(46,163,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(46,163,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_40%,#000_70%,transparent_100%)] dark:[mask-image:radial-gradient(ellipse_70%_50%_at_50%_40%,#fff_70%,transparent_100%)]" />
            </motion.div>

            <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10 flex flex-col h-full flex-grow">

                {/* Navigation Back */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <Link
                        href="/#services"
                        className="inline-flex items-center gap-2 text-silver hover:text-foreground transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium tracking-wide">
                            {language === "ar" ? "العودة للخدمات" : "Back to Solutions"}
                        </span>
                    </Link>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-16 items-center flex-grow">
                    {/* Left Column: Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="flex flex-col"
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue/10 border border-blue/20 w-fit mb-6">
                            <span className="text-blue drop-shadow-[0_0_8px_rgba(46,163,255,0.8)]">
                                {service.icon}
                            </span>
                            <span className="text-sm font-semibold tracking-wide text-blue-light uppercase">
                                {language === "ar" ? "حلول للشركات" : "Enterprise Solution"}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-foreground leading-tight flex flex-col gap-2">
                            {language === "ar" ? (
                                <span dir="rtl">{service.titleAr}</span>
                            ) : (
                                <span>{service.title}</span>
                            )}
                        </h1>

                        <div className="flex flex-col gap-4 text-lg md:text-xl text-silver font-light leading-relaxed mb-10 max-w-xl">
                            {language === "ar" ? (
                                <p dir="rtl" className="text-foreground font-medium">{service.descriptionAr}</p>
                            ) : (
                                <p>{service.description}</p>
                            )}
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{
                                opacity: 1,
                                y: 0,
                                boxShadow: ["0 8px 32px 0 rgba(0,0,0,0.37)", "0 0 30px rgba(46,163,255,0.3)", "0 8px 32px 0 rgba(0,0,0,0.37)"]
                            }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="bg-gradient-to-br from-white/60 via-blue-50/30 to-white/40 dark:from-slate-900/70 dark:via-blue-950/40 dark:to-black/60 border border-glass-border p-8 rounded-2xl backdrop-blur-md shadow-glass w-full"
                        >
                            <h3 className="flex flex-col gap-1 text-xl font-bold text-foreground mb-6 uppercase tracking-wider border-b border-white/10 dark:border-white/10 border-black/5 pb-4">
                                {language === "ar" ? (
                                    <span dir="rtl" className="text-right">المميزات الرئيسية</span>
                                ) : (
                                    <span className="text-sm text-silver tracking-widest block mt-1">KEY FEATURES</span>
                                )}
                            </h3>
                            <ul className="space-y-4">
                                {service.features.map((feature, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5, delay: 0.4 + (i * 0.1) }}
                                        className="flex items-start text-silver/90 font-medium group"
                                    >
                                        <span className="text-blue font-bold mr-4 mt-1 min-w-[1.25rem] h-5 w-5 rounded-full bg-blue/10 flex items-center justify-center flex-shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue group-hover:shadow-[0_0_10px_#2ea3ff] transition-shadow"></span>
                                        </span>
                                        <div className="flex flex-col gap-1 w-full">
                                            {language === "ar" ? (
                                                <span dir="rtl" className="text-right text-lg text-foreground font-medium">{feature.ar}</span>
                                            ) : (
                                                <span className="text-left text-base text-foreground/80 mt-0.5">{feature.en}</span>
                                            )}
                                        </div>
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Call to Action Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="mt-10"
                        >
                            <div className="relative group inline-block w-full sm:w-auto">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue via-cyan-400 to-blue rounded-full blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                <Link
                                    href="/#contact"
                                    className="relative flex items-center justify-center gap-3 px-8 py-4 bg-background text-foreground font-bold rounded-full border border-glass-border hover:bg-glass-dark transition-all duration-300"
                                >
                                    <span className="text-lg tracking-wide drop-shadow-md">
                                        {language === "ar" ? "اشترك واطلب الخدمة الآن" : "Subscribe & Request Service Now"}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-blue/20 flex items-center justify-center border border-blue/30 group-hover:bg-blue group-hover:text-white transition-colors duration-300">
                                        <ArrowLeft className={`w-4 h-4 ${language === "ar" ? "" : "rotate-180"}`} />
                                    </div>
                                </Link>
                            </div>
                        </motion.div>

                    </motion.div>

                    {/* Right Column: 3D Image Frame */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3, type: "spring" }}
                        className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-square flex items-center justify-center -order-1 lg:order-none mb-10 lg:mb-0 perspective-[1200px]"
                    >
                        {/* Interactive 3D Frame */}
                        <motion.div
                            whileHover={{ rotateX: 5, rotateY: -10, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="relative w-full h-full rounded-3xl p-1 bg-gradient-to-br from-blue/40 via-blue/5 to-transparent shadow-[0_20px_60px_-15px_rgba(46,163,255,0.3)] preserve-3d group cursor-pointer"
                        >
                            <div className="absolute inset-0 bg-glass-dark border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm -z-10"></div>

                            {/* Glow Effects behind image */}
                            <div className="absolute inset-0 bg-blue/20 blur-3xl rounded-full scale-75 group-hover:scale-100 group-hover:bg-blue/30 transition-all duration-700"></div>

                            <div className="relative w-full h-full rounded-[1.4rem] overflow-hidden bg-background/50 flex flex-col items-center justify-center border border-white/5">
                                {/* The Image Placeholder */}
                                <div className="absolute inset-0 z-0">
                                    <Image
                                        src={service.imagePath}
                                        alt={service.title}
                                        fill
                                        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700 scale-105 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
                                </div>

                                <div className="relative z-10 flex flex-col items-center justify-center h-full text-center p-8 translate-z-[50px]">
                                    <div className="w-20 h-20 rounded-full bg-glass-light border border-white/20 flex items-center justify-center shadow-glass mb-6 group-hover:shadow-[0_0_30px_rgba(46,163,255,0.4)] transition-shadow duration-500">
                                        <div className="scale-150 text-white drop-shadow-md">{service.icon}</div>
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight text-white/90 drop-shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-4 group-hover:translate-y-0 text-balance">
                                        {language === "ar" ? "تهيئة البناء التقني" : "Initialize Tech Construct"}
                                    </h2>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                </div>
            </div>
            <div className="w-full mt-24">
                <Footer />
            </div>
        </main>
    );
}
