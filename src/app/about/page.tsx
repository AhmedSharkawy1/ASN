"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "@/lib/context/LanguageContext";
import { ArrowLeft, Target, Lightbulb, Shield, Zap } from "lucide-react";
import StarsBackground from "@/components/ui/StarsBackground";
import LightBackgroundAnimation from "@/components/ui/LightBackgroundAnimation";
import Footer from "@/components/ui/Footer";
import Link from "next/link";
import { useRef } from "react";

export default function AboutPage() {
    const { language } = useLanguage();

    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const yBackground = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacityBackground = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    const content = {
        ar: {
            title: "من نحن",
            subtitle: "الابتكار التقني للمستقبل",
            description1: "في ASN Technology، نؤمن بأن التكنولوجيا هي المحرك الأساسي للنمو في العصر الرقمي. نحن لسنا مجرد مزود خدمات تقنية، بل شريك استراتيجي يساعدك على إعادة تصور أعمالك من خلال حلول ذكية ومنصات قوية تدفع بعلامتك التجارية نحو المستقبل.",
            description2: "رسالتنا هي تمكين الشركات بمختلف أحجامها من تبني أحدث ابتكارات الذكاء الاصطناعي والتطوير البرمجي لتعزيز كفاءتها، زيادة مبيعاتها، وتقديم تجارب استثنائية لعملائها.",
            valuesTitle: "قيمنا الأساسية",
            values: [
                {
                    icon: <Lightbulb className="w-6 h-6" />,
                    title: "الابتكار المستمر",
                    desc: "نسعى دائماً لتقديم حلول إبداعية تسبق التوقعات وتستبق المستقبل."
                },
                {
                    icon: <Target className="w-6 h-6" />,
                    title: "التركيز على النتائج",
                    desc: "أهدافك هي أهدافنا، ونقيس نجاحنا بمدى تأثير حلولنا على نمو أعمالك."
                },
                {
                    icon: <Shield className="w-6 h-6" />,
                    title: "الجودة والموثوقية",
                    desc: "نلتزم بأعلى معايير الجودة والأمان في كل سطر برمجي نكتبه."
                },
                {
                    icon: <Zap className="w-6 h-6" />,
                    title: "السرعة والأداء",
                    desc: "نبني أنظمة سريعة وقابلة للتطوير لتواكب نمو طموحاتك."
                }
            ],
            backBtn: "العودة للرئيسية"
        },
        en: {
            title: "About Us",
            subtitle: "Technical Innovation for the Future",
            description1: "At ASN Technology, we believe that technology is the core driver of growth in the digital era. We are not just a technical service provider, but a strategic partner helping you reimagine your business through intelligent solutions and robust platforms that propel your brand into the future.",
            description2: "Our mission is to empower businesses of all sizes to adopt the latest innovations in AI and software development to enhance their efficiency, increase sales, and deliver exceptional experiences to their customers.",
            valuesTitle: "Our Core Values",
            values: [
                {
                    icon: <Lightbulb className="w-6 h-6" />,
                    title: "Continuous Innovation",
                    desc: "We always strive to deliver creative solutions that exceed expectations and anticipate the future."
                },
                {
                    icon: <Target className="w-6 h-6" />,
                    title: "Results-Driven",
                    desc: "Your goals are our goals, and we measure our success by the impact our solutions have on your business growth."
                },
                {
                    icon: <Shield className="w-6 h-6" />,
                    title: "Quality & Reliability",
                    desc: "We adhere to the highest standards of quality and security in every line of code we write."
                },
                {
                    icon: <Zap className="w-6 h-6" />,
                    title: "Speed & Performance",
                    desc: "We build fast, scalable systems that keep up with your growing ambitions."
                }
            ],
            backBtn: "Back to Home"
        }
    };

    const currentContent = language === "ar" ? content.ar : content.en;

    return (
        <main ref={containerRef} className="min-h-screen bg-slate-100/50 dark:bg-background relative overflow-hidden flex flex-col pt-32 pb-24">
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

            <div className="w-full max-w-5xl mx-auto px-6 md:px-12 relative z-10 flex flex-col h-full flex-grow">
                {/* Navigation Back */}
                <motion.div
                    initial={{ opacity: 0, x: language === "ar" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-silver hover:text-foreground transition-colors group"
                    >
                        <ArrowLeft className={`w-5 h-5 transition-transform ${language === "ar" ? "rotate-180 group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
                        <span className="font-medium tracking-wide">{currentContent.backBtn}</span>
                    </Link>
                </motion.div>

                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="text-center mb-20"
                >
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue/10 border border-blue/20 mb-6">
                        <span className="text-sm font-semibold tracking-wide text-blue-light uppercase">
                            {currentContent.subtitle}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-8">
                        {language === "ar" ? (
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-light via-blue to-blue-dark drop-shadow-[0_0_15px_rgba(46,163,255,0.3)]">
                                {currentContent.title}
                            </span>
                        ) : (
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground/80 to-blue-light">
                                {currentContent.title}
                            </span>
                        )}
                    </h1>
                </motion.div>

                {/* Story Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{
                        opacity: 1,
                        y: 0,
                        boxShadow: ["0 8px 32px 0 rgba(0,0,0,0.37)", "0 0 30px rgba(46,163,255,0.3)", "0 8px 32px 0 rgba(0,0,0,0.37)"]
                    }}
                    viewport={{ once: false, margin: "-100px" }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="bg-gradient-to-br from-white/60 via-blue-50/30 to-white/40 dark:from-slate-900/70 dark:via-blue-950/40 dark:to-black/60 border border-glass-border p-8 md:p-12 rounded-3xl backdrop-blur-md shadow-glass mb-20 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue/5 rounded-full blur-[80px]" />
                    <div className="relative z-10 flex flex-col gap-6 text-lg md:text-xl text-silver/90 leading-relaxed font-light">
                        <p>{currentContent.description1}</p>
                        <p>{currentContent.description2}</p>
                    </div>
                </motion.div>

                {/* Core Values Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.6 }}
                >
                    <h2 className="text-3xl font-bold text-foreground mb-10 text-center">
                        <span className="border-b-2 border-blue pb-2">{currentContent.valuesTitle}</span>
                    </h2>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {currentContent.values.map((value, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.8 + (i * 0.1) }}
                                className="bg-background/40 border border-white/5 p-6 rounded-2xl hover:bg-glass-dark hover:border-blue/30 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue/10 flex items-center justify-center text-blue mb-5 group-hover:scale-110 group-hover:bg-blue group-hover:text-white transition-all shadow-glow">
                                    {value.icon}
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-3">{value.title}</h3>
                                <p className="text-silver/80 leading-relaxed">{value.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
            {/* The Unified Footer will span full width naturally because flex-grow is on the container above */}
            <div className="w-full mt-24">
                <Footer />
            </div>
        </main>
    );
}
