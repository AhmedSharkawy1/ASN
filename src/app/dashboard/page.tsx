"use client";
/* eslint-disable @next/next/no-img-element */

import { useLanguage } from "@/lib/context/LanguageContext";
import { Download, ExternalLink, Copy, Utensils, Layers, Eye, QrCode, Palette, Settings, Zap, Crown, CalendarDays } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function UserDashboardPage() {
    const { language } = useLanguage();
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [restaurantName, setRestaurantName] = useState("");
    const [stats, setStats] = useState({ items: 0, categories: 0 });
    const [subInfo, setSubInfo] = useState<{ plan: string | null; expiresAt: string | null }>({ plan: null, expiresAt: null });
    const qrRef = useRef<SVGSVGElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const impTenant = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;
            let rId: string | null = null;
            let rName = "";
            let rPlan: string | null = null;
            let rExpires: string | null = null;

            if (impTenant) {
                const { data: rest } = await supabase.from('restaurants').select('id, name, slug, subscription_plan, subscription_expires_at').eq('id', impTenant).single();
                if (rest) { rId = rest.id; rName = rest.name || ""; (window as any).rSlug = rest.slug; rPlan = rest.subscription_plan; rExpires = rest.subscription_expires_at; }
            } else {
                const { data: rest } = await supabase.from('restaurants').select('id, name, slug, subscription_plan, subscription_expires_at').eq('email', user.email).single();
                if (rest) {
                    rId = rest.id; rName = rest.name || ""; (window as any).rSlug = rest.slug;
                    rPlan = rest.subscription_plan; rExpires = rest.subscription_expires_at;
                } else {
                    // Fallback for staff users
                    const { data: staff } = await supabase.from('team_members').select('restaurant_id, restaurants(name, slug)').eq('auth_id', user.id).single();
                    if (staff) { 
                        rId = staff.restaurant_id; 
                        rName = (staff as any).restaurants?.name || ""; 
                        (window as any).rSlug = (staff as any).restaurants?.slug;
                    }
                }
            }

            if (rId) {
                setRestaurantId(rId);
                setRestaurantName(rName);
                setSubInfo({ plan: rPlan, expiresAt: rExpires });

                const { count: catsCount } = await supabase.from('categories').select('*', { count: 'exact', head: true }).eq('restaurant_id', rId);
                const { count: itemsCount } = await supabase.from('items').select('*, categories!inner(restaurant_id)', { count: 'exact', head: true }).eq('categories.restaurant_id', rId);
                setStats({ categories: catsCount || 0, items: itemsCount || 0 });
            }
        };
        fetchDashboardData();
    }, []);

    const [origin, setOrigin] = useState("");
    useEffect(() => {
        if (typeof window !== "undefined") {
            setOrigin(window.location.origin);
        }
    }, [])

    const [menuUrl, setMenuUrl] = useState("");
    useEffect(() => {
        if (restaurantId) {
            const slug = (window as any).rSlug;
            if (slug) {
                setMenuUrl(`https://${slug}.asntechnology.net`);
            } else if (origin) {
                setMenuUrl(`${origin}/menu/${restaurantId}`);
            }
        }
    }, [restaurantId, origin]);

    const handleCopy = async () => {
        if (!menuUrl) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(menuUrl);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = menuUrl;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) { console.error(e); }
    };

    const downloadQR = () => {
        if (!qrRef.current) return;
        const svg = qrRef.current;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width + 40; canvas.height = img.height + 40;
            if (ctx) {
                ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 20, 20);
                const pngFile = canvas.toDataURL("image/png");
                const a = document.createElement("a");
                a.download = `Menu-QR-${restaurantId?.substring(0, 5)}.png`;
                a.href = pngFile; a.click();
            }
        };
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    };

    const isAr = language === "ar";

    // Subscription calculations
    const getSubscriptionInfo = () => {
        const { plan, expiresAt } = subInfo;
        if (plan === 'lifetime') {
            return {
                label: isAr ? 'مدى الحياة' : 'Lifetime',
                daysLeft: Infinity,
                totalDays: Infinity,
                expiryDate: null,
                isLifetime: true,
                isExpired: false,
                planLabel: isAr ? 'مدى الحياة' : 'Lifetime',
            };
        }
        if (!expiresAt) {
            return {
                label: isAr ? 'نشط' : 'Active',
                daysLeft: 0,
                totalDays: 0,
                expiryDate: null,
                isLifetime: false,
                isExpired: false,
                planLabel: plan === 'monthly' ? (isAr ? 'شهري' : 'Monthly') : plan === 'yearly' ? (isAr ? 'سنوي' : 'Yearly') : (isAr ? 'مجاني' : 'Free'),
            };
        }
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = plan === 'monthly' ? 30 : plan === 'yearly' ? 365 : 30;
        return {
            label: diff <= 0 ? (isAr ? 'منتهي' : 'Expired') : (isAr ? `${diff} يوم متبقي` : `${diff} days left`),
            daysLeft: Math.max(diff, 0),
            totalDays,
            expiryDate: expiry.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
            isLifetime: false,
            isExpired: diff <= 0,
            planLabel: plan === 'monthly' ? (isAr ? 'شهري' : 'Monthly') : plan === 'yearly' ? (isAr ? 'سنوي' : 'Yearly') : (isAr ? 'مجاني' : 'Free'),
        };
    };

    const subData = getSubscriptionInfo();

    const statCards = [
        { label: isAr ? "عدد الأقسام" : "Categories", value: stats.categories, icon: Layers, gradientLight: "from-violet-50 to-purple-50", gradientDark: "dark:from-violet-600/20 dark:to-purple-600/20", borderLight: "border-violet-200", borderDark: "dark:border-violet-500/20", iconColor: "text-violet-500 dark:text-violet-400", iconBg: "bg-violet-100 dark:bg-black/20" },
        { label: isAr ? "إجمالي الأصناف" : "Total Items", value: stats.items, icon: Utensils, gradientLight: "from-emerald-50 to-teal-50", gradientDark: "dark:from-emerald-600/20 dark:to-teal-600/20", borderLight: "border-emerald-200", borderDark: "dark:border-glass-border", iconColor: "text-emerald-500 dark:text-emerald-400", iconBg: "bg-emerald-100 dark:bg-black/20" },
        { label: isAr ? "المشاهدات" : "Views", value: isAr ? "قريباً" : "Soon", icon: Eye, gradientLight: "from-amber-50 to-orange-50", gradientDark: "dark:from-amber-600/20 dark:to-orange-600/20", borderLight: "border-amber-200", borderDark: "dark:border-amber-500/20", iconColor: "text-amber-500 dark:text-amber-400", iconBg: "bg-amber-100 dark:bg-black/20" },
    ];

    const quickLinks = [
        { href: "/dashboard/menu", icon: Utensils, label: isAr ? "إدارة المنتجات" : "Products", desc: isAr ? "أضف وعدّل الأصناف" : "Manage items", color: "from-emerald-500 to-teal-500" },
        { href: "/dashboard/theme", icon: Palette, label: isAr ? "تخصيص المظهر" : "Appearance", desc: isAr ? "ألوان وثيمات" : "Colors & themes", color: "from-violet-500 to-purple-500" },
        { href: "/dashboard#qr", icon: QrCode, label: isAr ? "إنشاء QR" : "QR Code", desc: isAr ? "حمّل كود المنيو" : "Download code", color: "from-cyan-500 to-blue-500" },
        { href: "/dashboard/settings", icon: Settings, label: isAr ? "الإعدادات" : "Settings", desc: isAr ? "أرقام وروابط" : "Phone & links", color: "from-amber-500 to-orange-500" },
    ];

    return (
        <div className="flex flex-col gap-8 w-full mx-auto pb-20">

            {/* ===== WELCOME HERO ===== */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-br from-white to-stone-50 dark:from-[#0d1117] dark:to-[#111827] rounded-2xl border border-stone-100 dark:border-zinc-800/50 p-6 md:p-8 overflow-hidden shadow-sm dark:shadow-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 dark:bg-emerald-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-stone-500/5 dark:bg-cyan-500/10 rounded-full blur-[80px]" />
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-2" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                        {isAr ? `أهلاً بك يا` : "Welcome back,"} <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-emerald-400 dark:to-cyan-400">{restaurantName || "..."}</span> 👋
                    </h1>
                    <p className="text-slate-600 dark:text-zinc-400 text-base font-medium">
                        {isAr ? "إليك ملخص أداء منيوك الإلكتروني" : "Here's your digital menu performance summary"}
                    </p>
                </div>
            </motion.div>

            {/* ===== STATS CARDS ===== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradientLight} ${card.gradientDark} border ${card.borderLight} ${card.borderDark} p-5 group hover:scale-[1.02] transition-transform shadow-sm dark:shadow-none`}>
                        <div className="flex items-start justify-between mb-5">
                            <div className={`w-12 h-12 rounded-xl border border-white/50 dark:border-white/5 shadow-inner ${card.iconBg} flex items-center justify-center ${card.iconColor}`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-1 drop-shadow-sm">{card.value}</h3>
                        <p className="text-[14px] text-slate-600 dark:text-zinc-400 font-extrabold tracking-wide">{card.label}</p>
                    </motion.div>
                ))}

                {/* Subscription Status Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 group hover:scale-[1.02] transition-transform shadow-sm dark:shadow-none border
                        ${subData.isLifetime
                            ? 'from-purple-50 to-violet-50 dark:from-purple-500/20 dark:to-violet-500/20 border-purple-200 dark:border-purple-500/20'
                            : subData.isExpired
                            ? 'from-red-50 to-rose-50 dark:from-red-500/20 dark:to-rose-500/20 border-red-200 dark:border-red-500/20'
                            : subData.daysLeft <= 7
                            ? 'from-amber-50 to-orange-50 dark:from-amber-500/20 dark:to-orange-500/20 border-amber-200 dark:border-amber-500/20'
                            : 'from-emerald-50 to-cyan-50 dark:from-emerald-500/30 dark:to-cyan-500/30 border-emerald-200 dark:border-glass-border'
                        }
                    `}>
                    <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-xl border border-white/50 dark:border-white/5 shadow-inner flex items-center justify-center
                            ${subData.isLifetime ? 'bg-purple-100 dark:bg-black/20 text-purple-500 dark:text-purple-400' :
                              subData.isExpired ? 'bg-red-100 dark:bg-black/20 text-red-500 dark:text-red-400' :
                              subData.daysLeft <= 7 ? 'bg-amber-100 dark:bg-black/20 text-amber-500 dark:text-amber-400' :
                              'bg-emerald-100 dark:bg-black/20 text-emerald-500 dark:text-emerald-400'
                            }`}>
                            {subData.isLifetime ? <Crown className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm text-white
                            ${subData.isLifetime ? 'bg-purple-500' :
                              subData.isExpired ? 'bg-red-500' :
                              subData.daysLeft <= 7 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}>
                            {subData.isLifetime ? (isAr ? 'مدى الحياة' : 'Lifetime') :
                             subData.isExpired ? (isAr ? 'منتهي' : 'Expired') :
                             (isAr ? 'مفعل' : 'Active')}
                        </span>
                    </div>

                    {subData.isLifetime ? (
                        <>
                            <h3 className="text-3xl md:text-4xl font-black text-purple-700 dark:text-purple-300 mb-1 drop-shadow-sm">∞</h3>
                            <p className="text-[14px] text-purple-600 dark:text-purple-400 font-extrabold tracking-wide">{isAr ? 'حالة الاشتراك' : 'Subscription'}</p>
                        </>
                    ) : (
                        <>
                            <h3 className={`text-3xl md:text-4xl font-black mb-1 drop-shadow-sm
                                ${subData.isExpired ? 'text-red-700 dark:text-red-300' :
                                  subData.daysLeft <= 7 ? 'text-amber-700 dark:text-amber-300' :
                                  'text-slate-800 dark:text-white'
                                }`}>
                                {subData.daysLeft > 0 ? subData.daysLeft : (isAr ? 'منتهي' : '0')}
                            </h3>
                            <p className="text-[14px] text-slate-600 dark:text-zinc-400 font-extrabold tracking-wide">
                                {isAr ? 'حالة الاشتراك' : 'Subscription'}
                            </p>
                            <div className="mt-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                                        {subData.planLabel}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                                        {subData.label}
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-white/60 dark:bg-black/30 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500
                                        ${subData.isExpired ? 'bg-red-500' :
                                          subData.daysLeft <= 7 ? 'bg-amber-500' :
                                          'bg-emerald-500'
                                        }`}
                                        style={{ width: `${subData.totalDays > 0 ? Math.min((subData.daysLeft / subData.totalDays) * 100, 100) : 0}%` }}
                                    />
                                </div>
                                {subData.expiryDate && (
                                    <div className="flex items-center gap-1 mt-2">
                                        <CalendarDays className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                                            {isAr ? `ينتهي: ${subData.expiryDate}` : `Expires: ${subData.expiryDate}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </motion.div>
            </div>

            {/* ===== QUICK ACCESS ===== */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                    ⚡ {isAr ? "وصول سريع" : "Quick Access"}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map((link, i) => (
                        <Link key={i} href={link.href}
                            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-zinc-800/50 p-5 hover:border-stone-200 dark:hover:border-zinc-600/50 transition-all hover:shadow-lg hover:shadow-stone-100/50 dark:hover:shadow-black/20 hover:scale-[1.02] shadow-sm dark:shadow-none">
                            <div className={`w-14 h-14 rounded-xl border border-white/20 bg-gradient-to-br ${link.color} flex items-center justify-center text-white mb-4 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.2)] group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                                <link.icon className="w-[26px] h-[26px]" />
                            </div>
                            <h3 className="font-black text-slate-800 dark:text-white text-[19px] mb-1">{link.label}</h3>
                            <p className="text-[15px] font-bold text-slate-500 dark:text-zinc-500">{link.desc}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ===== QR CODE & LINK ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="qr">
                {/* QR Code Card */}
                <div className="bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-zinc-800/50 p-6 md:p-8 flex flex-col items-center text-center relative overflow-hidden shadow-sm dark:shadow-none">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/5 dark:bg-emerald-500/5 rounded-full blur-[60px]" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-stone-500/5 dark:bg-cyan-500/5 rounded-full blur-[60px]" />
                    {restaurantId ? (
                        <>
                            <div className="bg-white p-3 rounded-2xl shadow-xl relative z-10 hover:scale-105 transition-transform duration-300 mb-4 border border-slate-100 dark:border-transparent">
                                <QRCodeSVG value={menuUrl} size={180} bgColor="#ffffff" fgColor="#020617" level="H" includeMargin={false} ref={qrRef} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white relative z-10 mb-1.5">{isAr ? "كود QR الخاص بك جاهز!" : "Your QR Code is Ready!"}</h3>
                            <p className="text-[15px] font-bold text-slate-500 dark:text-zinc-400 mb-6 w-full max-w-sm relative z-10 leading-relaxed">{isAr ? "اطبع هذا الكود وضعه على طاولات مطعمك ليتمكن العملاء من مسحه وطلب الطعام بسهولة." : "Print and place on your restaurant tables for easy ordering."}</p>
                            <button onClick={downloadQR}
                                className="w-full max-w-[260px] flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 dark:from-emerald-500 dark:to-cyan-500 text-white text-[15px] font-extrabold rounded-xl shadow-lg shadow-teal-500/15 dark:shadow-emerald-500/20 hover:shadow-teal-500/30 dark:hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all active:scale-95 relative z-10">
                                <Download className="w-[18px] h-[18px]" />
                                {isAr ? "تحميل الكود للطباعة" : "Download QR Code"}
                            </button>
                        </>
                    ) : (
                        <div className="py-16 flex flex-col items-center gap-3 text-slate-400 dark:text-zinc-500">
                            <div className="w-10 h-10 border-3 border-teal-500 dark:border-glass-border border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">{isAr ? "جاري التوليد..." : "Generating..."}</span>
                        </div>
                    )}
                </div>

                {/* Direct Link Card */}
                <div className="bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-zinc-800/50 p-6 md:p-8 flex flex-col relative overflow-hidden shadow-sm dark:shadow-none group">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 dark:from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2 relative z-10">
                        🔗 {isAr ? "الرابط المباشر للمنيو" : "Direct Menu Link"}
                    </h3>
                    <p className="text-[15px] font-bold text-slate-500 dark:text-zinc-400 mb-8 leading-relaxed relative z-10">
                        {isAr ? "شارك هذا الرابط مع عملائك على واتساب أو السوشيال ميديا للوصول السريع إلى قائمة طعامك." : "Share this link with your customers on WhatsApp or social media for quick access to your menu."}
                    </p>
                    {restaurantId ? (
                        <div className="flex flex-col gap-4 mt-auto relative z-10">
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-zinc-800/80 p-3.5 rounded-xl overflow-hidden shadow-inner font-bold">
                                <div className="truncate text-base md:text-lg text-teal-700 dark:text-emerald-400 flex-1" dir="ltr">{menuUrl}</div>
                                <button onClick={handleCopy}
                                    className="p-2 bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white rounded-lg transition-all flex-shrink-0 active:scale-90 shadow-sm">
                                    {copied ? <span className="text-xs font-extrabold px-1.5">{isAr ? "تم!" : "Copied!"}</span> : <Copy className="w-[18px] h-[18px]" />}
                                </button>
                            </div>
                            <a href={menuUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-3 bg-stone-50 dark:bg-zinc-800/50 border border-stone-100 dark:border-zinc-700/50 hover:border-teal-300 dark:hover:border-emerald-500/30 text-stone-600 dark:text-zinc-300 font-semibold rounded-xl transition-all w-full hover:text-stone-900 dark:hover:text-white">
                                {isAr ? "فتح المنيو لمعاينته" : "Open & Preview Menu"}
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    ) : (
                        <div className="h-20 flex items-center justify-center text-sm text-slate-400 dark:text-zinc-500 animate-pulse">
                            {isAr ? "جاري إنشاء رابط فريد لك..." : "Creating your unique link..."}
                        </div>
                    )}
                </div>
            </div>

            {/* ===== POWERED BY ===== */}
            <div className="text-center py-4 opacity-30 hover:opacity-60 transition-opacity">
                <p className="text-xs text-stone-400 dark:text-zinc-500 font-medium">Powered by <strong className="text-teal-600 dark:text-emerald-400">ASN Technology</strong></p>
            </div>
        </div>
    );
}
