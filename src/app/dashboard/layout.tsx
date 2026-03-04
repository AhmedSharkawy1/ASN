"use client";
/* eslint-disable @next/next/no-img-element */

import { useLanguage } from "@/lib/context/LanguageContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { subscribeSyncStatus } from "@/lib/sync-service";
import {
    LayoutDashboard, Utensils, QrCode, LogOut, Settings, Palette,
    Menu, X, ChevronLeft, ClipboardList, ChefHat,
    TableProperties, Truck, Users, UserCog, Bell, CreditCard,
    Wifi, WifiOff, BarChart3, ShoppingBag
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
    const [isOnline, setIsOnline] = useState(true);
    const [newOrderToast, setNewOrderToast] = useState<{ orderNumber: number; customerName?: string } | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const restaurantIdRef = useRef<string | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
            } else {
                // Fetch restaurant name + ID
                const { data: rest } = await supabase
                    .from('restaurants').select('id,name').eq('email', session.user.email).single();
                if (rest) {
                    setRestaurantName(rest.name);
                    restaurantIdRef.current = rest.id;
                    setRestaurantId(rest.id); // triggers Realtime subscription
                }
                setLoading(false);
            }
        };
        checkAuth();

        // Subscribe to online/offline status
        const unsub = subscribeSyncStatus(s => setIsOnline(s.isOnline));
        return () => unsub();
    }, [router]);

    /* ── Play chime sound ── */
    const playChime = useCallback(() => {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            // Play 3 ascending beeps
            [0, 0.18, 0.36].forEach((delay, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = "sine";
                osc.frequency.value = 520 + i * 120; // 520, 640, 760 Hz
                gain.gain.setValueAtTime(0, ctx.currentTime + delay);
                gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + delay + 0.04);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.22);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 0.25);
            });
        } catch { /* browser may block autoplay */ }
    }, []);

    /* ── Realtime: watch for new orders from online menu ── */
    useEffect(() => {
        if (!restaurantId) return;

        // Request browser notification permission once
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission();
        }

        const channel = supabase
            .channel(`new-orders-${restaurantId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const order = payload.new as any;
                    if (order.is_draft || order.source !== "menu") return; // skip POS hold orders

                    playChime();

                    const shortId = order.id ? order.id.split('-')[0].toUpperCase() : 'جديد';
                    const title = language === "ar" ? "🛍️ طلب جديد!" : "🛍️ New Order!";
                    const body = language === "ar"
                        ? `طلب #${shortId} ${order.customer_name ? `لـ ${order.customer_name}` : ""}`
                        : `Order #${shortId} ${order.customer_name ? `for ${order.customer_name}` : ""}`;

                    // Native browser notification
                    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                        const notif = new Notification(title, {
                            body: body + `\nالإجمالي: ${order.total || 0} ج`,
                            icon: "/icon-192x192.png", // using standard PWA icon name if logo missing
                            tag: `order-${order.id}`,
                            requireInteraction: true // Keeps the notification on screen until clicked
                        });
                        notif.onclick = () => window.focus();
                    }

                    // In-app Toast
                    setNewOrderToast({ orderNumber: shortId, customerName: order.customer_name });
                    setTimeout(() => setNewOrderToast(null), 6000);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [restaurantId, playChime]);

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
                { href: "/dashboard/reports", icon: BarChart3, labelAr: "التقارير", labelEn: "Reports" },
            ]
        },
        {
            label: language === "ar" ? "القائمة" : "Menu",
            items: [
                { href: "/dashboard/menu", icon: Utensils, labelAr: "المنتجات", labelEn: "Products" },
                { href: "/dashboard/tables", icon: TableProperties, labelAr: "الطاولات", labelEn: "Tables" },
                { href: "/dashboard/delivery", icon: Truck, labelAr: "الدليفري", labelEn: "Delivery" },
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

            {/* ════ NEW ORDER TOAST ════ */}
            {newOrderToast && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4 pointer-events-none">
                    <div className="pointer-events-auto bg-[#0d1117] border border-emerald-500/40 rounded-2xl shadow-2xl shadow-emerald-500/20 overflow-hidden animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3 p-4">
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 animate-pulse">
                                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-extrabold text-white">🛍️ طلب جديد!</p>
                                <p className="text-xs text-zinc-400 truncate">
                                    طلب رقم <span className="text-emerald-400 font-bold">#{newOrderToast.orderNumber}</span>
                                    {newOrderToast.customerName && <> — {newOrderToast.customerName}</>}
                                </p>
                            </div>
                            <button onClick={() => setNewOrderToast(null)} className="text-zinc-500 hover:text-white transition p-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {/* 6-second countdown bar */}
                        <div className="h-0.5 bg-zinc-800">
                            <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-cyan-400 animate-[shrink_6s_linear_forwards]" style={{ width: "100%" }} />
                        </div>
                    </div>
                </div>
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
                        <div className="flex items-center gap-2">
                            <span title={isOnline ? "Online - syncing with cloud" : "Offline - data saved locally"}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition-all ${isOnline ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                <span className="hidden sm:block">{isOnline ? "أونلاين" : "أوفلاين"}</span>
                            </span>
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                {restaurantName ? restaurantName.charAt(0) : "?"}
                            </div>
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
