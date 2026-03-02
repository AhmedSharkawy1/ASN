"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Globe, Code, LineChart, Palette } from "lucide-react";
import { FaFacebook, FaWhatsapp, FaInstagram, FaRobot, FaQrcode, FaTiktok, FaHeadset } from "react-icons/fa";
import { useLanguage } from "@/lib/context/LanguageContext";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

const floatingIcons = [
    { Icon: FaFacebook, color: "#1d4ed8", label: "Facebook", size: 44, x: "-35vw", y: "-20vh", delay: 0 },
    { Icon: FaWhatsapp, color: "#16a34a", label: "WhatsApp", size: 50, x: "32vw", y: "20vh", delay: 0.5 },
    { Icon: FaInstagram, color: "#db2777", label: "Instagram", size: 46, x: "25vw", y: "-30vh", delay: 1 },
    { Icon: FaTiktok, color: "#000000", label: "TikTok", size: 45, x: "-15vw", y: "40vh", delay: 1.2 },
    { Icon: Globe, color: "#0ea5e9", label: "Web", size: 48, x: "-30vw", y: "25vh", delay: 1.5 },
    { Icon: LineChart, color: "#f43f5e", label: "Analytics", size: 40, x: "40vw", y: "-10vh", delay: 2 },
    { Icon: FaRobot, color: "#8b5cf6", label: "AI", size: 55, x: "-42vw", y: "5vh", delay: 2.5 },
    { Icon: FaHeadset, color: "#0ea5e9", label: "Customer Service", size: 42, x: "15vw", y: "35vh", delay: 3 },
    { Icon: FaQrcode, color: "#10b981", label: "QR Code", size: 45, x: "-10vw", y: "-35vh", delay: 3.5 },
    { Icon: Palette, color: "#d946ef", label: "Branding", size: 44, x: "10vw", y: "-40vh", delay: 4 },
    { Icon: Code, color: "#6366f1", label: "Software", size: 46, x: "-25vw", y: "-40vh", delay: 4.5 },
];

export default function Hero() {
    const { language } = useLanguage();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setMounted(true);
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const isLightMode = mounted && theme === "light";

    // Parallax & Interaction for scroll
    const { scrollY } = useScroll();
    const yIcons = useTransform(scrollY, [0, 800], [0, 250]);
    const rotateIcons = useTransform(scrollY, [0, 800], [0, 25]);
    const opacityIcons = useTransform(scrollY, [0, 500], [1, 0]);

    return (
        <section className="relative w-full h-screen min-h-[800px] flex items-center justify-center overflow-hidden">
            {/* Futuristic Animated Background */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-background">
                {/* Dynamic grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(46,163,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(46,163,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:[mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#fff_70%,transparent_100%)] pointer-events-none"></div>

                {/* Glowing Orbs */}
                <motion.div
                    className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-2xl md:blur-[120px] mix-blend-normal md:mix-blend-multiply dark:mix-blend-normal md:dark:mix-blend-screen opacity-50 dark:opacity-100"
                    animate={{
                        x: [0, 50, 0, -50, 0],
                        y: [0, -50, 50, 0, 0],
                        scale: [1, 1.2, 0.8, 1.1, 1]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-dark/20 rounded-full blur-3xl md:blur-[150px] mix-blend-normal md:mix-blend-multiply dark:mix-blend-normal md:dark:mix-blend-screen opacity-30 dark:opacity-100"
                    animate={{
                        x: [0, -80, 0, 80, 0],
                        y: [0, 80, -80, 0, 0],
                        scale: [1, 0.9, 1.3, 0.9, 1]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />
            </div>

            {/* Floating Interactive 3D Icons */}
            <motion.div
                className="absolute inset-x-0 -top-[30vh] bottom-[30vh] md:inset-0 z-10 pointer-events-none flex items-center justify-center scale-[0.45] sm:scale-[0.6] md:scale-100 origin-center transition-transform duration-500"
                style={{ y: yIcons, rotateZ: rotateIcons, opacity: opacityIcons }}
            >
                {floatingIcons.map((item, index) => {
                    // Special case for TikTok icon: Dark gray in Dark Mode, Black in Light Mode
                    const activeColor = (item.label === "TikTok" && !isLightMode) ? "#4b5563" : item.color;

                    // Calculate perfect circular orbit for mobile
                    const totalIcons = floatingIcons.length;
                    const angle = (index / totalIcons) * Math.PI * 2;
                    // Orbit radius: mostly vertical oval to fit phone screens (e.g. 40vw width, 35vh height)
                    const radiusX = 40; // vw
                    const radiusY = 32; // vh
                    const mobileX = `${Math.cos(angle) * radiusX}vw`;
                    const mobileY = `${Math.sin(angle) * radiusY}vh`;

                    return (
                        <motion.div
                            key={index}
                            className="absolute pointer-events-auto cursor-pointer flex flex-col items-center justify-center"
                            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                            animate={{ opacity: 1, scale: 1, x: isMobile ? mobileX : item.x, y: isMobile ? mobileY : item.y }}
                            transition={{ duration: 1.5, delay: item.delay, type: "spring", bounce: 0.4 }}
                            whileHover={{ zIndex: 50, scale: 1.1 }}
                        >
                            <motion.div
                                animate={{
                                    y: [0, -25, 0],
                                    x: [0, 20, 0],
                                    rotateZ: [0, 8, 0],
                                }}
                                transition={{
                                    duration: 12 + (index % 5) * 3,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                className="relative flex items-center justify-center p-4 lg:p-5 rounded-2xl bg-transparent group transition-colors"
                            >
                                {/* 3D Hover glow */}
                                <div
                                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                                    style={{ backgroundColor: activeColor }}
                                ></div>

                                {/* No dark background layer ensures pure transparency */}

                                <item.Icon size={item.size} style={{ color: activeColor }} className="drop-shadow-xl z-10 group-hover:scale-110 transition-transform duration-300" />

                                {/* Interactive Tooltip */}
                                <div
                                    className="absolute top-[120%] bg-popover/80 backdrop-blur-md text-popover-foreground text-xs font-bold px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none tracking-widest uppercase shadow-2xl translate-y-2 group-hover:translate-y-0"
                                    style={{ borderBottom: `2px solid ${activeColor}` }}
                                >
                                    {item.label}
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                })}
            </motion.div>

            {/* Hero Content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center justify-center text-center mt-20 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="pointer-events-auto flex flex-col items-center"
                >
                    {/* Brand Logo in Hero */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            duration: 0.8,
                            type: "spring",
                            stiffness: 100
                        }}
                        className="relative w-24 h-24 mb-8 group"
                    >
                        <div className="absolute inset-0 bg-blue/30 rounded-full blur-2xl group-hover:bg-blue/50 transition-all duration-500 animate-pulse"></div>
                        <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_30px_rgba(46,163,255,0.4)] group-hover:shadow-[0_0_50px_rgba(46,163,255,0.7)] group-hover:scale-105 transition-all duration-500">
                            <Image
                                src="/logo.png"
                                alt="ASN Technology"
                                fill
                                className="object-cover scale-110"
                                priority
                            />
                        </div>
                        {/* Orbiting ring */}
                        <div className="absolute -inset-2 border border-blue/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                    </motion.div>
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-glass-dark border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] mb-10 backdrop-blur-md">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse-glow"></span>
                        <span className="text-sm font-semibold tracking-wide text-cyan-400 uppercase">
                            {language === "ar" ? "حلول تقنية ذكية لنمو علامتك التجارية ❤️" : "Smart tech solutions for your brand growth ❤️"}
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 relative z-10 leading-tight">
                        {language === "ar" ? (
                            <div dir="rtl" className="text-transparent bg-clip-text bg-gradient-to-r from-blue-light via-cyan-400 to-blue-dark drop-shadow-[0_0_25px_rgba(6,182,212,0.4)] mb-4 leading-[1.3] py-2 font-bold px-4">
                                نصمم أنظمة رقمية ذكية تنمّي أعمالك
                            </div>
                        ) : (
                            <div className="text-transparent bg-clip-text bg-gradient-to-r from-foreground via-cyan-600 to-silver drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] dark:drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] mt-2 font-extrabold px-4">
                                We Build Intelligent Digital Systems <br className="hidden md:block" /> That Grow Your Business
                            </div>
                        )}
                    </h1>

                    <div className="max-w-3xl mx-auto mb-12 flex flex-col gap-5">
                        {language === "ar" ? (
                            <p dir="rtl" className="text-lg md:text-xl md:text-2xl text-silver text-balance font-medium leading-relaxed">
                                تقدم ASN Technology منصات ذكية، حلول مدعومة بالذكاء الاصطناعي، وتجارب رقمية عالية التحويل لزيادة المبيعات وتعزيز العلامة التجارية.
                            </p>
                        ) : (
                            <p className="text-base md:text-lg lg:text-xl text-silver/80 text-balance font-light leading-relaxed">
                                ASN Technology delivers smart platforms, AI-powered solutions, and high-conversion digital experiences that increase sales and strengthen your brand.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button className="group relative px-6 py-4 bg-gradient-to-r from-blue to-cyan-500 text-white font-bold rounded-xl overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] active:scale-95 flex items-center justify-center gap-3 w-full sm:w-auto border border-cyan-400/30">
                            <span className="relative z-10 text-xl font-bold whitespace-nowrap">
                                {language === "ar" ? "ابدأ مشروعك" : "Start Your Project"}
                            </span>
                            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform duration-300 ml-1 rtl:rotate-180" />
                        </button>
                        <button className="group px-6 py-4 rounded-xl bg-glass-dark border border-glass-border backdrop-blur-md text-foreground font-medium shadow-glass hover:bg-glass-light hover:border-blue/50 hover:shadow-glow transition-all duration-300 flex items-center justify-center gap-3 w-full sm:w-auto">
                            <span className="text-lg font-bold whitespace-nowrap">
                                {language === "ar" ? "استعرض خدماتنا" : "Explore Our Services"}
                            </span>
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
                <span className="text-xs text-silver tracking-widest uppercase">
                    {language === "ar" ? "قم بالتمرير" : "Scroll"}
                </span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-blue to-transparent"></div>
            </motion.div>
        </section>
    );
}
