"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Globe, Sun, Moon } from "lucide-react";
import { FaPhoneAlt } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/context/LanguageContext";
import { useTheme } from "next-themes";

export default function Navbar() {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    const { theme, setTheme } = useTheme();
    const { language, toggleLanguage } = useLanguage();

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Hide navbar on dashboard and public menu pages
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/menu')) {
        return null;
    }


    const navLinks = [
        { name: language === "ar" ? "الرئيسية" : "Home", href: "/" },
        { name: language === "ar" ? "خدماتنا" : "Services", href: "/#services" },
        { name: language === "ar" ? "من نحن" : "About", href: "/about" },
        { name: language === "ar" ? "اتصل بنا" : "Contact", href: "/#contact" },
    ];

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                isScrolled ? "bg-background/80 backdrop-blur-md border-b border-glass-border py-4" : "bg-transparent py-6"
            )}
        >
            <div className="w-full max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group" dir="ltr">
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

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-silver hover:text-foreground hover:text-glow transition-all"
                        >
                            {link.name}
                        </Link>
                    ))}

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 rounded-full border border-glass-border bg-glass-dark text-silver hover:text-foreground hover:border-blue/50 transition-all"
                            aria-label="Toggle Theme"
                        >
                            {mounted && (
                                theme === "dark" ? (
                                    <Sun className="w-4 h-4 text-blue-light animate-pulse-glow" />
                                ) : (
                                    <Moon className="w-4 h-4 text-blue" />
                                )
                            )}
                        </button>

                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-2 px-3 py-2 rounded-full border border-glass-border bg-glass-dark text-silver hover:text-foreground hover:border-blue/50 transition-all font-medium text-sm"
                            title="Toggle Language"
                        >
                            <Globe className="w-4 h-4 text-blue" />
                            <span>{language === "ar" ? "En" : "عربي"}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3 ml-2">
                        {/* Phone Contact */}
                        <a
                            href="tel:01092621367"
                            className="hidden lg:flex items-center justify-center p-2.5 rounded-full border border-glass-border bg-glass-dark text-cyan-400 hover:text-white hover:bg-cyan-500 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300"
                            aria-label="Call Us"
                            title="01092621367"
                        >
                            <FaPhoneAlt className="w-4 h-4" />
                        </a>
                        <Link
                            href="/login"
                            className="px-6 py-2 rounded-full border border-glass-border bg-glass-dark text-silver hover:text-foreground hover:border-blue/50 transition-all duration-300 font-medium whitespace-nowrap"
                        >
                            {language === "ar" ? "تسجيل الدخول" : "Login"}
                        </Link>
                        <Link
                            href="/#contact"
                            className="px-6 py-2 rounded-full bg-blue text-white shadow-[0_0_20px_rgba(46,163,255,0.3)] font-medium hover:bg-blue/90 hover:shadow-[0_0_30px_rgba(46,163,255,0.5)] transition-all duration-300 whitespace-nowrap"
                        >
                            {language === "ar" ? "ابدأ الآن" : "Get Started"}
                        </Link>
                    </div>
                </div>

                {/* Mobile Nav Toggle */}
                <div className="md:hidden flex items-center">
                    <button
                        className="text-silver hover:text-white p-2"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-background/70 backdrop-blur-3xl border-b border-glass-border p-6 flex flex-col gap-4 shadow-2xl">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-lg font-medium text-silver hover:text-foreground transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <button
                            onClick={() => {
                                setTheme(theme === "dark" ? "light" : "dark");
                                setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-glass-border bg-glass-dark text-silver hover:text-foreground transition-all"
                        >
                            {mounted && (
                                theme === "dark" ? (
                                    <>
                                        <Sun className="w-5 h-5 text-blue-light" />
                                        <span className="text-sm font-medium">{language === "ar" ? "وضع النهار" : "Light"}</span>
                                    </>
                                ) : (
                                    <>
                                        <Moon className="w-5 h-5 text-blue" />
                                        <span className="text-sm font-medium">{language === "ar" ? "وضع الليل" : "Dark"}</span>
                                    </>
                                )
                            )}
                        </button>

                        <button
                            onClick={() => {
                                toggleLanguage();
                                setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-glass-border bg-glass-dark text-silver hover:text-foreground transition-all"
                        >
                            <Globe className="w-5 h-5 text-blue" />
                            <span className="text-sm font-medium">{language === "ar" ? "English" : "العربية"}</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <Link
                            href="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center justify-center px-4 py-3 text-center rounded-lg border border-glass-border bg-glass-dark hover:bg-glass-light text-foreground font-bold transition-colors"
                        >
                            {language === "ar" ? "تسجيل الدخول" : "Login"}
                        </Link>
                        <a
                            href="tel:01092621367"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center justify-center gap-2 px-4 py-3 text-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                        >
                            <FaPhoneAlt className="w-4 h-4" />
                            <span dir="ltr">01092621367</span>
                        </a>
                    </div>

                    <Link
                        href="/#contact"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center px-4 py-3 text-center rounded-lg bg-gradient-to-r from-blue to-cyan-500 hover:from-blue/90 hover:to-cyan-500/90 text-white font-bold transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    >
                        {language === "ar" ? "ابدأ الآن" : "Get Started"}
                    </Link>
                </div>
            )}
        </nav>
    );
}
