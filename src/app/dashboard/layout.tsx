"use client";
/* eslint-disable @next/next/no-img-element */

import { useLanguage } from "@/lib/context/LanguageContext";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
    LayoutDashboard, Utensils, QrCode, LogOut, Settings, Palette,
    Menu, X, ChevronLeft, ClipboardList, ChefHat,
    TableProperties, Truck, Users, UserCog, Bell, CreditCard
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [restaurantName, setRestaurantName] = useState("");

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
            } else {
                // Fetch restaurant name
                const { data: rest } = await supabase
                    .from('restaurants').select('name').eq('email', session.user.email).single();
                if (rest) setRestaurantName(rest.name);
                setLoading(false);
            }
        };
        checkAuth();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                    <span className="text-zinc-500 text-sm font-medium animate-pulse">{language === "ar" ? "جاري التحميل..." : "Loading..."}</span>
                </div>
            </div>
        );
    }

    const navSections = [
        {
            label: language === "ar" ? "الرئيسية" : "Home",
            items: [
                { href: "/dashboard", icon: LayoutDashboard, labelAr: "الرئيسية", labelEn: "Dashboard", exact: true },
            ]
        },
        {
            label: language === "ar" ? "الطلبات" : "Orders",
            items: [
                { href: "/dashboard/orders", icon: ClipboardList, labelAr: "نظام الطلبيات", labelEn: "Orders" },
                { href: "/dashboard/pos", icon: CreditCard, labelAr: "POS", labelEn: "POS" },
                { href: "/dashboard/kitchen", icon: ChefHat, labelAr: "شاشة المطبخ", labelEn: "Kitchen Display" },
            ]
        },
        {
            label: language === "ar" ? "القائمة" : "Menu",
            items: [
                { href: "/dashboard/menu", icon: Utensils, labelAr: "المنتجات", labelEn: "Products" },
                { href: "/dashboard/tables", icon: TableProperties, labelAr: "الطاولات", labelEn: "Tables" },
                { href: "/dashboard/delivery", icon: Truck, labelAr: "مناطق التوصيل", labelEn: "Delivery Zones" },
            ]
        },
        {
            label: language === "ar" ? "المسؤول والتسويق" : "Admin",
            items: [
                { href: "/dashboard/customers", icon: Users, labelAr: "العملاء", labelEn: "Customers" },
                { href: "/dashboard/team", icon: UserCog, labelAr: "الفريق", labelEn: "Team" },
                { href: "/dashboard/notifications", icon: Bell, labelAr: "إشعارات العملاء", labelEn: "Notifications" },
            ]
        },
        {
            label: language === "ar" ? "الأدوات" : "Tools",
            items: [
                { href: "/dashboard/theme", icon: Palette, labelAr: "تخصيص المظهر", labelEn: "Appearance" },
                { href: "/dashboard/qr", icon: QrCode, labelAr: "QR", labelEn: "QR Codes" },
                { href: "/dashboard/settings", icon: Settings, labelAr: "الإعدادات", labelEn: "Settings" },
            ]
        }
    ];

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <div className="min-h-screen bg-[#0a0e1a] text-zinc-100 flex" dir={language === 'ar' ? 'rtl' : 'ltr'}>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ====== SIDEBAR ====== */}
            <aside className={`fixed md:sticky top-0 h-screen z-50 flex flex-col transition-transform duration-300
                ${language === 'ar' ? 'right-0' : 'left-0'}
                ${sidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')}
                w-[260px] bg-[#0d1117] border-zinc-800/50
                ${language === 'ar' ? 'border-l' : 'border-r'}
            `}>
                {/* Logo */}
                <div className="h-[72px] flex items-center gap-3 px-6 border-b border-zinc-800/50 shrink-0">
                    <div className="w-9 h-9 relative flex-shrink-0">
                        <Image src="/logo.png" alt="ASN" fill className="object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">ASN</span>
                        <span className="text-[9px] text-zinc-500 font-medium -mt-1 uppercase tracking-wider">Technology</span>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden mr-auto p-1.5 text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6" style={{ scrollbarWidth: 'none' }}>
                    {navSections.map((section, sIdx) => (
                        <div key={sIdx}>
                            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-2">
                                {section.label}
                            </h3>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const active = isActive(item.href, 'exact' in item ? item.exact : undefined);
                                    return (
                                        <Link key={item.href} href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                                                ${active
                                                    ? 'bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/5'
                                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                                                }`}
                                        >
                                            <item.icon className={`w-[18px] h-[18px] transition-colors ${active ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                                            <span>{language === "ar" ? item.labelAr : item.labelEn}</span>
                                            {active && (
                                                <div className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${language === 'ar' ? 'mr-auto' : 'ml-auto'} animate-pulse`} />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Bottom: Restaurant Name + Logout */}
                <div className="border-t border-zinc-800/50 p-4 space-y-3 shrink-0">
                    {restaurantName && (
                        <div className="bg-zinc-800/30 rounded-xl px-3 py-2.5 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                {restaurantName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-200 truncate">{restaurantName}</p>
                                <p className="text-[10px] text-zinc-500">{language === "ar" ? "المطعم النشط" : "Active Restaurant"}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all"
                    >
                        <LogOut className="w-[18px] h-[18px]" />
                        {language === "ar" ? "تسجيل الخروج" : "Logout"}
                    </button>
                </div>
            </aside>

            {/* ====== MAIN CONTENT ====== */}
            <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
                {/* Top Header Bar */}
                <header className="h-[72px] border-b border-zinc-800/50 bg-[#0d1117]/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden md:flex items-center gap-2 text-zinc-500 text-sm">
                            <ChevronLeft className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
                            <span className="font-medium">
                                {language === "ar" ? "لوحة التحكم" : "Dashboard"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {restaurantName && (
                            <span className="text-sm text-zinc-400 font-medium hidden sm:block">
                                {language === "ar" ? `مرحباً بك في لوحة تحكم` : "Welcome to"} <strong className="text-emerald-400">{restaurantName}</strong>
                            </span>
                        )}
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                            {restaurantName ? restaurantName.charAt(0) : "?"}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 md:p-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
}
