"use client";

import { motion } from "framer-motion";
import { Send, Mail } from "lucide-react";
import { FaFacebook, FaWhatsapp, FaInstagram, FaPhoneAlt } from "react-icons/fa";
import { useLanguage } from "@/lib/context/LanguageContext";

export default function Contact() {
    const { language } = useLanguage();

    const content = {
        ar: {
            title: "تواصل معنا",
            subtitle: "اتصل بنا",
            description: "هل أنت مستعد لتطوير بنية أعمالك الرقمية؟ تواصل مع خبرائنا لمناقشة فرص التعاون الممكنة وبدء رحلة التحول الرقمي.",
            form: {
                firstName: "الاسم الأول",
                firstNamePh: "أحمد",
                lastName: "الاسم الأخير",
                lastNamePh: "محمد",
                phone: "رقم الهاتف",
                phonePh: "01092621367",
                email: "البريد الإلكتروني (اختياري)",
                emailPh: "ahmed@example.com",
                message: "رسالتك",
                messagePh: "قم بوصف متطلبات مشروعك هنا...",
                submit: "إرسال الرسالة",
            }
        },
        en: {
            title: "Contact Us",
            subtitle: "Get In Touch",
            description: "Ready to transform your enterprise infrastructure? Connect with our integration specialists to discuss deployment possibilities.",
            form: {
                firstName: "First Name",
                firstNamePh: "John",
                lastName: "Last Name",
                lastNamePh: "Doe",
                phone: "Phone Number",
                phonePh: "+201092621367",
                email: "Email (Optional)",
                emailPh: "john@enterprise.com",
                message: "Transmission Data",
                messagePh: "Detail your operational requirements...",
                submit: "Transmit Request",
            }
        }
    };

    const t = language === "ar" ? content.ar : content.en;

    const contactLinks = [
        {
            icon: <FaWhatsapp className="w-5 h-5" />,
            title: language === "ar" ? "واتساب" : "WhatsApp",
            value: "ASN Technology",
            href: "https://wa.me/message/TYV7HCKV4SYUI1",
            delay: "0s",
            color: "#16a34a",
            hoverGlow: "rgba(22, 163, 74, 0.4)",
            hoverBorder: "rgba(22, 163, 74, 0.6)"
        },
        {
            icon: <FaFacebook className="w-5 h-5" />,
            title: language === "ar" ? "فيسبوك" : "Facebook",
            value: "ASN Technology Account",
            href: "https://www.facebook.com/profile.php?id=61588482305662",
            delay: "0.1s",
            color: "#1d4ed8",
            hoverGlow: "rgba(29, 78, 216, 0.4)",
            hoverBorder: "rgba(29, 78, 216, 0.6)"
        },
        {
            icon: <FaInstagram className="w-5 h-5" />,
            title: language === "ar" ? "إنستجرام" : "Instagram",
            value: "@asntechnology1",
            href: "https://www.instagram.com/asntechnology1?igsh=MXN5dnRmMDBsa2Zhdw==",
            delay: "0.2s",
            color: "#db2777",
            hoverGlow: "rgba(219, 39, 119, 0.4)",
            hoverBorder: "rgba(219, 39, 119, 0.6)"
        },
        {
            icon: <FaPhoneAlt className="w-5 h-5" />,
            title: language === "ar" ? "رقم الهاتف" : "Phone Number",
            value: "201092621367",
            href: "tel:201092621367",
            delay: "0.3s",
            color: "#0ea5e9", // Sky Blue
            hoverGlow: "rgba(14, 165, 233, 0.4)",
            hoverBorder: "rgba(14, 165, 233, 0.6)"
        },
        {
            icon: <Mail className="w-5 h-5" />,
            title: language === "ar" ? "البريد الإلكتروني" : "Email",
            value: "asntechnology1@gmail.com",
            href: "mailto:asntechnology1@gmail.com",
            delay: "0.4s",
            color: "#3b82f6", // Blue
            hoverGlow: "rgba(59, 130, 246, 0.4)",
            hoverBorder: "rgba(59, 130, 246, 0.6)"
        }
    ];

    return (
        <section id="contact" className="relative py-24 md:py-32 w-full overflow-hidden border-t border-glass-border">
            {/* Background radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue/5 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10 flex flex-col md:flex-row gap-16 items-center">

                {/* Left Side: Info */}
                <div className="w-full md:w-1/2">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue/10 border border-blue/20 mb-6">
                            <span className="text-sm font-semibold tracking-wide text-blue-light uppercase">
                                {t.subtitle}
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                            {language === "ar" ? (
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-light via-blue to-blue-dark drop-shadow-[0_0_15px_rgba(46,163,255,0.3)] block">
                                    {t.title}
                                </span>
                            ) : (
                                <span className="text-foreground">{t.title}</span>
                            )}
                        </h2>
                        <p className={`text-lg text-silver/90 mb-10 max-w-md font-light leading-relaxed ${language === "ar" ? "text-right" : "text-left"}`}>
                            {t.description}
                        </p>

                        <div className="space-y-4">
                            {contactLinks.map((link, idx) => (
                                <a
                                    key={idx}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-5 rounded-2xl bg-blue/5 border border-blue/10 backdrop-blur-sm transition-all duration-300 group hover:-translate-y-1"
                                    style={{
                                        ['--hover-box-shadow' as string]: `0 0 20px -2px ${link.hoverGlow}, inset 0 0 10px -5px ${link.hoverGlow}`,
                                        ['--hover-border-color' as string]: link.hoverBorder
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = `0 0 30px -5px ${link.hoverGlow}, inset 0 0 15px -5px ${link.hoverGlow}`;
                                        e.currentTarget.style.borderColor = link.hoverBorder;
                                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = "";
                                        e.currentTarget.style.borderColor = "";
                                        e.currentTarget.style.backgroundColor = "";
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform shadow-inner"
                                            style={{ color: link.color }}
                                        >
                                            {link.icon}
                                        </div>
                                        <div className="flex flex-col">
                                            <h4 className="text-sm font-semibold text-silver uppercase tracking-widest mb-1 group-hover:text-blue-light transition-colors">
                                                {link.title}
                                            </h4>
                                            <p className={`text-foreground text-base md:text-lg font-medium tracking-wide ${language === "ar" ? "text-right" : "text-left"} break-all group-hover:drop-shadow-md transition-all`}>
                                                {link.value}
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Right Side: Form */}
                <div className="w-full md:w-1/2">
                    <motion.form
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="glass-card p-8 md:p-10 flex flex-col gap-6 relative overflow-hidden"
                        onSubmit={(e) => e.preventDefault()}
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-2">
                                <label className={`text-sm font-medium text-silver px-1 block ${language === "ar" ? "text-right" : "text-left"}`} htmlFor="firstName">{t.form.firstName} <span className="text-blue-light">*</span></label>
                                <input
                                    type="text"
                                    id="firstName"
                                    required
                                    dir={language === "ar" ? "rtl" : "ltr"}
                                    className="w-full px-5 py-3.5 rounded-xl bg-background border border-glass-border focus:border-blue-light focus:bg-background focus:outline-none focus:ring-1 focus:ring-blue-light transition-all text-foreground placeholder-silver/30 shadow-inner"
                                    placeholder={t.form.firstNamePh}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-sm font-medium text-silver px-1 block ${language === "ar" ? "text-right" : "text-left"}`} htmlFor="lastName">{t.form.lastName}</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    dir={language === "ar" ? "rtl" : "ltr"}
                                    className="w-full px-5 py-3.5 rounded-xl bg-background border border-glass-border focus:border-blue-light focus:bg-background focus:outline-none focus:ring-1 focus:ring-blue-light transition-all text-foreground placeholder-silver/30 shadow-inner"
                                    placeholder={t.form.lastNamePh}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-2">
                                <label className={`text-sm font-medium text-silver px-1 block ${language === "ar" ? "text-right" : "text-left"}`} htmlFor="phone">{t.form.phone} <span className="text-blue-light">*</span></label>
                                <input
                                    type="tel"
                                    id="phone"
                                    required
                                    dir="ltr"
                                    className={`w-full px-5 py-3.5 rounded-xl bg-background border border-glass-border focus:border-blue-light focus:bg-background focus:outline-none focus:ring-1 focus:ring-blue-light transition-all text-foreground placeholder-silver/30 shadow-inner ${language === "ar" ? "text-right" : "text-left"}`}
                                    placeholder={t.form.phonePh}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-sm font-medium text-silver px-1 block ${language === "ar" ? "text-right" : "text-left"}`} htmlFor="email">{t.form.email}</label>
                                <input
                                    type="email"
                                    id="email"
                                    dir="ltr"
                                    className={`w-full px-5 py-3.5 rounded-xl bg-background border border-glass-border focus:border-blue-light focus:bg-background focus:outline-none focus:ring-1 focus:ring-blue-light transition-all text-foreground placeholder-silver/30 shadow-inner ${language === "ar" ? "text-right" : "text-left"}`}
                                    placeholder={t.form.emailPh}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 relative z-10">
                            <label className={`text-sm font-medium text-silver px-1 block ${language === "ar" ? "text-right" : "text-left"}`} htmlFor="message">{t.form.message} <span className="text-blue-light">*</span></label>
                            <textarea
                                id="message"
                                required
                                rows={4}
                                dir={language === "ar" ? "rtl" : "ltr"}
                                className="w-full px-5 py-3.5 rounded-xl bg-background border border-glass-border focus:border-blue-light focus:bg-background focus:outline-none focus:ring-1 focus:ring-blue-light transition-all text-foreground placeholder-silver/30 resize-none shadow-inner"
                                placeholder={t.form.messagePh}
                            ></textarea>
                        </div>

                        <button className="group relative w-full py-4 mt-4 rounded-xl overflow-hidden bg-blue text-white font-bold transition-all flex items-center justify-center gap-2 hover:shadow-glow-lg active:scale-[0.98] z-10 border border-blue-light/50">
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue to-blue-dark group-hover:opacity-80 transition-opacity duration-300"></div>
                            <div className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <span className="relative flex items-center gap-2 drop-shadow-md">
                                {t.form.submit}
                                <Send className={`w-5 h-5 transition-transform duration-300 ${language === "ar" ? "group-hover:-translate-x-1 group-hover:-translate-y-1 scale-x-[-1]" : "group-hover:translate-x-1 group-hover:-translate-y-1"}`} />
                            </span>
                        </button>
                    </motion.form>
                </div>
            </div>
        </section>
    );
}
