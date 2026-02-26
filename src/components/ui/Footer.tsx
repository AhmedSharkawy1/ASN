"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import Link from "next/link";
import Image from "next/image";
import { FaFacebook, FaWhatsapp, FaInstagram, FaTiktok, FaPhoneAlt } from "react-icons/fa";

export default function Footer() {
    const { language } = useLanguage();

    const socialLinks = [
        { href: "https://wa.me/201026049216", icon: <FaWhatsapp size={20} />, label: "WhatsApp", color: "#16a34a", hoverGlow: "rgba(22, 163, 74, 0.4)", hoverBorder: "rgba(22, 163, 74, 0.6)" },
        { href: "https://www.facebook.com/Abdalaahmed90?mibextid=ZbWKwL", icon: <FaFacebook size={20} />, label: "Facebook", color: "#1d4ed8", hoverGlow: "rgba(29, 78, 216, 0.4)", hoverBorder: "rgba(29, 78, 216, 0.6)" },
        { href: "https://www.instagram.com/asn_technology_ceo?igsh=YzljYTk1ODg3Zg==", icon: <FaInstagram size={20} />, label: "Instagram", color: "#db2777", hoverGlow: "rgba(219, 39, 119, 0.4)", hoverBorder: "rgba(219, 39, 119, 0.6)" },
        { href: "https://www.tiktok.com/@asntechnology?_t=8rrO8G0k5kX&_r=1", icon: <FaTiktok size={20} />, label: "TikTok", color: "currentColor", hoverGlow: "rgba(255, 255, 255, 0.3)", hoverBorder: "rgba(255, 255, 255, 0.4)" }, // Adapts to theme
        { href: "tel:201092621367", icon: <FaPhoneAlt size={20} />, label: "Phone", color: "#0ea5e9", hoverGlow: "rgba(14, 165, 233, 0.4)", hoverBorder: "rgba(14, 165, 233, 0.6)" },
    ];

    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t border-glass-border bg-background py-10 relative z-10 block">
            <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">

                {/* Brand / Copyright */}
                <div className="flex flex-col items-center md:items-start text-center md:text-start">
                    <Link href="/" className="flex items-center gap-3 group mb-4" dir="ltr">
                        {/* Circular Logo Image */}
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-blue/30 shadow-[0_0_15px_rgba(46,163,255,0.3)] group-hover:shadow-[0_0_20px_rgba(46,163,255,0.5)] transition-all">
                            <Image
                                src="/logo.png"
                                alt="ASN Technology Logo"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold tracking-tighter text-foreground group-hover:text-blue transition-colors">
                                ASN
                            </span>
                            <span className="text-sm tracking-widest text-silver uppercase hidden sm:inline-block">
                                Technology
                            </span>
                        </div>
                    </Link>
                    <p className="text-sm text-silver/70">
                        {language === "ar"
                            ? `© ${currentYear} ASN Technology. جميع الحقوق محفوظة.`
                            : `© ${currentYear} ASN Technology. All rights reserved.`}
                    </p>
                </div>

                {/* Internal Links */}
                <div className="flex gap-6 text-sm font-medium text-silver/80">
                    <Link href="/" className="hover:text-foreground transition-colors">
                        {language === "ar" ? "الرئيسية" : "Home"}
                    </Link>
                    <Link href="/about" className="hover:text-foreground transition-colors">
                        {language === "ar" ? "من نحن" : "About"}
                    </Link>
                    <Link href="/#services" className="hover:text-foreground transition-colors">
                        {language === "ar" ? "الخدمات" : "Services"}
                    </Link>
                    <Link href="/#contact" className="hover:text-foreground transition-colors">
                        {language === "ar" ? "اتصل بنا" : "Contact"}
                    </Link>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-4">
                    {socialLinks.map((social) => (
                        <a
                            key={social.label}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-2xl border border-glass-border bg-glass-dark transition-all duration-300 group hover:-translate-y-1"
                            style={{
                                // We use CSS variables for hover effects since Tailwind hover classes don't support dynamic arbitrary values well
                                ['--hover-box-shadow' as string]: `0 0 20px -2px ${social.hoverGlow}, inset 0 0 10px -5px ${social.hoverGlow}`,
                                ['--hover-border-color' as string]: social.hoverBorder
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = `0 0 20px -2px ${social.hoverGlow}, inset 0 0 10px -5px ${social.hoverGlow}`;
                                e.currentTarget.style.borderColor = social.hoverBorder;
                                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "";
                                e.currentTarget.style.borderColor = "";
                                e.currentTarget.style.backgroundColor = "";
                            }}
                            aria-label={social.label}
                        >
                            <span
                                className="block drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                                style={{ color: social.color }}
                            >
                                {social.icon}
                            </span>
                        </a>
                    ))}
                </div>

            </div>
        </footer>
    );
}
