"use client";
/* eslint-disable @next/next/no-img-element */

import { useLanguage } from "@/lib/context/LanguageContext";
import { Download, ExternalLink, Copy, Utensils, Layers, Eye, QrCode, Palette, Settings, Zap } from "lucide-react";
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
    const qrRef = useRef<SVGSVGElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('id, name')
                .eq('email', user.email)
                .single();

            if (restaurant) {
                setRestaurantId(restaurant.id);
                setRestaurantName(restaurant.name || "");

                const { count: catsCount } = await supabase.from('categories').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id);
                const { count: itemsCount } = await supabase.from('items').select('*, categories!inner(restaurant_id)').eq('categories.restaurant_id', restaurant.id);
                setStats({ categories: catsCount || 0, items: itemsCount || 0 });
            }
        };
        fetchDashboardData();
    }, []);

    const menuUrl = typeof window !== 'undefined' && restaurantId ? `${window.location.origin}/menu/${restaurantId}` : '';

    const handleCopy = async () => {
        if (!menuUrl) return;
        try { await navigator.clipboard.writeText(menuUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
        catch (e) { console.error(e); }
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

    const statCards = [
        { label: isAr ? "عدد الأقسام" : "Categories", value: stats.categories, icon: Layers, gradient: "from-violet-600/20 to-purple-600/20", border: "border-violet-500/20", iconColor: "text-violet-400" },
        { label: isAr ? "إجمالي الأصناف" : "Total Items", value: stats.items, icon: Utensils, gradient: "from-emerald-600/20 to-teal-600/20", border: "border-emerald-500/20", iconColor: "text-emerald-400" },
        { label: isAr ? "المشاهدات" : "Views", value: isAr ? "قريباً" : "Soon", icon: Eye, gradient: "from-amber-600/20 to-orange-600/20", border: "border-amber-500/20", iconColor: "text-amber-400" },
        { label: isAr ? "حالة الاشتراك" : "Status", value: isAr ? "نشط" : "Active", icon: Zap, gradient: "from-emerald-500/30 to-cyan-500/30", border: "border-emerald-500/30", iconColor: "text-emerald-400", special: true },
    ];

    const quickLinks = [
        { href: "/dashboard/menu", icon: Utensils, label: isAr ? "إدارة المنتجات" : "Products", desc: isAr ? "أضف وعدّل الأصناف" : "Manage items", color: "from-emerald-500 to-teal-500" },
        { href: "/dashboard/theme", icon: Palette, label: isAr ? "تخصيص المظهر" : "Appearance", desc: isAr ? "ألوان وثيمات" : "Colors & themes", color: "from-violet-500 to-purple-500" },
        { href: "/dashboard#qr", icon: QrCode, label: isAr ? "إنشاء QR" : "QR Code", desc: isAr ? "حمّل كود المنيو" : "Download code", color: "from-cyan-500 to-blue-500" },
        { href: "/dashboard/settings", icon: Settings, label: isAr ? "الإعدادات" : "Settings", desc: isAr ? "أرقام وروابط" : "Phone & links", color: "from-amber-500 to-orange-500" },
    ];

    return (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto pb-20">

            {/* ===== WELCOME HERO ===== */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-br from-[#0d1117] to-[#111827] rounded-2xl border border-zinc-800/50 p-6 md:p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px]" />
                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">
                        {isAr ? `أهلاً بك يا` : "Welcome back,"} <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">{restaurantName || "..."}</span> 👋
                    </h1>
                    <p className="text-zinc-400 text-sm">
                        {isAr ? "إليك ملخص أداء منيوك الإلكتروني" : "Here's your digital menu performance summary"}
                    </p>
                </div>
            </motion.div>

            {/* ===== STATS CARDS ===== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} border ${card.border} p-5 group hover:scale-[1.02] transition-transform`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center ${card.iconColor}`}>
                                <card.icon className="w-5 h-5" />
                            </div>
                            {card.special && <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-2 py-1 rounded-full">{isAr ? "مفعل" : "Active"}</span>}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-0.5">{card.value}</h3>
                        <p className="text-xs text-zinc-400 font-medium">{card.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* ===== QUICK ACCESS ===== */}
            <div>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    ⚡ {isAr ? "وصول سريع" : "Quick Access"}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map((link, i) => (
                        <Link key={i} href={link.href}
                            className="group relative overflow-hidden rounded-2xl bg-[#0d1117] border border-zinc-800/50 p-5 hover:border-zinc-600/50 transition-all hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02]">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                <link.icon className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-white text-sm mb-1">{link.label}</h3>
                            <p className="text-[11px] text-zinc-500">{link.desc}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ===== QR CODE & LINK ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="qr">
                {/* QR Code Card */}
                <div className="bg-[#0d1117] rounded-2xl border border-zinc-800/50 p-6 md:p-8 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-[60px]" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-[60px]" />
                    {restaurantId ? (
                        <>
                            <div className="bg-white p-3 rounded-2xl shadow-xl relative z-10 hover:scale-105 transition-transform duration-300 mb-4">
                                <QRCodeSVG value={menuUrl} size={180} bgColor="#ffffff" fgColor="#020617" level="H" includeMargin={false} ref={qrRef} />
                            </div>
                            <h3 className="text-lg font-bold text-white relative z-10 mb-1">{isAr ? "كود QR الخاص بك جاهز!" : "Your QR Code is Ready!"}</h3>
                            <p className="text-xs text-zinc-400 mb-5 max-w-xs relative z-10">{isAr ? "اطبع هذا الكود وضعه على طاولات مطعمك." : "Print and place on your restaurant tables."}</p>
                            <button onClick={downloadQR}
                                className="w-full max-w-xs flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-95 relative z-10">
                                <Download className="w-5 h-5" />
                                {isAr ? "تحميل الكود للطباعة" : "Download QR Code"}
                            </button>
                        </>
                    ) : (
                        <div className="py-16 flex flex-col items-center gap-3 text-zinc-500">
                            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">{isAr ? "جاري التوليد..." : "Generating..."}</span>
                        </div>
                    )}
                </div>

                {/* Direct Link Card */}
                <div className="bg-[#0d1117] rounded-2xl border border-zinc-800/50 p-6 md:p-8 flex flex-col relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        🔗 {isAr ? "الرابط المباشر للمنيو" : "Direct Menu Link"}
                    </h3>
                    <p className="text-xs text-zinc-400 mb-6">
                        {isAr ? "شارك هذا الرابط مع عملائك على واتساب أو السوشيال ميديا." : "Share this link with your customers on WhatsApp or social media."}
                    </p>
                    {restaurantId ? (
                        <div className="flex flex-col gap-3 mt-auto">
                            <div className="flex items-center gap-2 bg-black/40 border border-zinc-800 p-3 rounded-xl overflow-hidden">
                                <div className="truncate text-xs font-mono text-emerald-400/80 flex-1" dir="ltr">{menuUrl}</div>
                                <button onClick={handleCopy}
                                    className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all flex-shrink-0 active:scale-90">
                                    {copied ? <span className="text-xs font-bold px-1">{isAr ? "تم!" : "Copied!"}</span> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <a href={menuUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-3 bg-zinc-800/50 border border-zinc-700/50 hover:border-emerald-500/30 text-zinc-300 font-semibold rounded-xl transition-all w-full hover:text-white">
                                {isAr ? "فتح المنيو لمعاينته" : "Open & Preview Menu"}
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    ) : (
                        <div className="h-20 flex items-center justify-center text-sm text-zinc-500 animate-pulse">
                            {isAr ? "جاري إنشاء رابط فريد لك..." : "Creating your unique link..."}
                        </div>
                    )}
                </div>
            </div>

            {/* ===== POWERED BY ===== */}
            <div className="text-center py-4 opacity-30 hover:opacity-60 transition-opacity">
                <p className="text-[10px] text-zinc-500 font-medium">Powered by <strong className="text-emerald-400">ASN Technology</strong></p>
            </div>
        </div>
    );
}
