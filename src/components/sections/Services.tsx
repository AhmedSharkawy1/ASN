"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { services } from "@/lib/data/services";
import { useLanguage } from "@/lib/context/LanguageContext";


const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export default function Services() {
    const { language } = useLanguage();

    return (
        <section id="services" className="relative py-24 md:py-32 w-full overflow-hidden">
            {/* Background glow elements */}
            <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20 flex flex-col items-center">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl md:text-5xl font-bold tracking-tight mb-6 flex flex-col gap-2"
                    >
                        {language === "ar" ? (
                            <span dir="rtl" className="text-foreground drop-shadow-[0_0_15px_rgba(46,163,255,0.3)] block">خدماتنا</span>
                        ) : (
                            <span>Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue to-foreground">Services</span></span>
                        )}
                    </motion.h2>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="flex flex-col gap-2"
                    >
                        <p className="text-lg text-silver/80">
                            {language === "ar"
                                ? "حلول رقمية شاملة تربط التكنولوجيا المتقدمة بنتائج أعمال مؤثرة."
                                : "Comprehensive digital solutions bridging advanced technology with impactful business results."}
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    {services.map((service) => (
                        <motion.div
                            key={service.id}
                            variants={itemVariants}
                            className="h-full"
                        >
                            <Link href={`/services/${service.slug}`} className="group relative glass-card p-6 md:p-8 transition-all duration-500 hover:-translate-y-3 hover:border-blue/40 hover:shadow-glow-lg overflow-hidden flex flex-col h-full block">
                                {/* Card Hover Glow Background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                {/* Animated gradient border top */}
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>

                                <div className="mb-6 p-4 rounded-2xl bg-blue/5 backdrop-blur-md border border-glass-border shadow-inner group-hover:border-transparent group-hover:bg-transparent group-hover:shadow-none transition-all duration-500 inline-block self-start">
                                    <div className="text-blue group-hover:scale-110 group-hover:text-blue-light group-hover:drop-shadow-none transition-all duration-500 drop-shadow-[0_0_8px_rgba(46,163,255,0.8)]">
                                        {service.icon}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-foreground mb-6 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-foreground group-hover:to-blue-light transition-all duration-300 relative z-10 leading-snug">
                                    {language === "ar" ? <span dir="rtl">{service.titleAr}</span> : <span>{service.title}</span>}
                                </h3>

                                <ul className="space-y-4 relative z-10 mt-auto flex-grow">
                                    {service.features.map((feature, i) => (
                                        <li key={i} className="flex items-start text-sm text-silver font-light group-hover:text-foreground transition-colors duration-300">
                                            <span className="text-blue font-bold mr-3 mt-1">•</span>
                                            <span className="flex-1">
                                                {language === "ar" ? (
                                                    <span dir="rtl" className="text-foreground font-medium">{feature.ar}</span>
                                                ) : (
                                                    <span dir="ltr" className="text-foreground font-medium">{feature.en}</span>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
