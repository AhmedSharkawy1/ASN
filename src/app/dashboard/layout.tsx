"use client";
/* eslint-disable @next/next/no-img-element */

import { useLanguage } from "@/lib/context/LanguageContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { subscribeSyncStatus } from "@/lib/sync-service";
import { useTheme } from "next-themes";
import {
    LayoutDashboard, Utensils, QrCode, LogOut, Settings, Palette,
    Menu, X, ChevronLeft, ClipboardList, ChefHat,
    TableProperties, Truck, Users, UserCog, Bell, CreditCard,
    Wifi, WifiOff, BarChart3, Sun, Moon, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Toaster, toast } from "sonner";

/* ── Interactive ASN Logo Icon ── */
function ASNIcon() {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="w-9 h-9 relative flex-shrink-0 cursor-pointer group"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 dark:from-emerald-400 dark:via-cyan-400 dark:to-blue-500 opacity-20 dark:opacity-30 blur-md transition-all duration-500 ${hovered ? 'scale-150 opacity-40 dark:opacity-50' : 'scale-100'}`} />
            <div className={`relative w-full h-full transition-transform duration-500 ${hovered ? 'scale-110 rotate-[360deg]' : 'scale-100 rotate-0'}`}>
                <Image src="/logo.png" alt="ASN" fill className="object-contain drop-shadow-lg" />
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    const { setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [restaurantName, setRestaurantName] = useState("");
    const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null);
    const restaurantIdRef = useRef<string | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            } 
            
            const email = session.user.email;
            let rId = null;
            let rName = "";
            let rLogo = null;
            let userPerms = null;

            if (email?.endsWith(".asn")) {
                // It's a staff member
                const { data: staff } = await supabase.from('team_members').select('*, restaurants(name, logo_url)').eq('auth_id', session.user.id).single();
                if (staff) {
                    if (!staff.is_active) {
                        await supabase.auth.signOut();
                        router.push("/login");
                        return;
                    }
                    rId = staff.restaurant_id;
                    rName = staff.restaurants?.name || "";
                    rLogo = staff.restaurants?.logo_url || null;
                    userPerms = staff.permissions;
                }
            } else {
                // It's the admin/owner
                const { data: rest } = await supabase.from('restaurants').select('id,name,logo_url').eq('email', email).single();
                if (rest) {
                    rId = rest.id;
                    rName = rest.name;
                    rLogo = rest.logo_url;
                }
            }

            if (rId) {
                setRestaurantName(rName);
                setRestaurantLogo(rLogo);
                restaurantIdRef.current = rId;
                setRestaurantId(rId);
                setPermissions(userPerms);
            }
            setLoading(false);
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const order = payload.new as any;

                    // Skip POS hold orders (drafts) or orders explicitly marked as POS source
                    if (order.is_draft || order.source === "pos") return;

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

                    // In-app Sonner Toast
                    toast.success(
                        <div className="flex flex-col gap-1 w-full text-right" dir={language === "ar" ? "rtl" : "ltr"}>
                            <p className="font-extrabold text-white text-base">🛍️ {language === "ar" ? "طلب جديد!" : "New Order!"}</p>
                            <p className="font-medium text-emerald-400">#{shortId} {order.customer_name ? `— ${order.customer_name}` : ""}</p>
                        </div>,
                        {
                            duration: 10000,
                            className: "bg-[#0d1117] border-emerald-500/40 text-white shadow-2xl shadow-emerald-500/20",
                        }
                    );
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [restaurantId, playChime, language]);

    const isDark = resolvedTheme === 'dark';

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-background flex items-center justify-center transition-colors">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 dark:border-glass-border"></div>
                    <span className="text-slate-500 dark:text-zinc-500 text-sm font-medium animate-pulse">{language === "ar" ? "جاري التحميل..." : "Loading..."}</span>
                </div>
            </div>
        );
    }

    const navSections = [
        {
            key: "home",
            label: language === "ar" ? "الرئيسية" : "Home",
            items: [
                { href: "/dashboard", icon: LayoutDashboard, labelAr: "الرئيسية", labelEn: "Dashboard", exact: true },
            ]
        },
        {
            key: "orders",
            label: language === "ar" ? "الطلبات" : "Orders",
            items: [
                { href: "/dashboard/orders", icon: ClipboardList, labelAr: "نظام الطلبيات", labelEn: "Orders" },
                { href: "/dashboard/pos", icon: CreditCard, labelAr: "POS", labelEn: "POS" },
                { href: "/dashboard/kitchen", icon: ChefHat, labelAr: "شاشة المطبخ", labelEn: "Kitchen Display" },
                { href: "/dashboard/reports", icon: BarChart3, labelAr: "التقارير", labelEn: "Reports", permKey: "reports" },
            ]
        },
        {
            key: "products",
            label: language === "ar" ? "القائمة" : "Menu",
            items: [
                { href: "/dashboard/menu", icon: Utensils, labelAr: "المنتجات", labelEn: "Products", permKey: "products" },
                { href: "/dashboard/tables", icon: TableProperties, labelAr: "الطاولات", labelEn: "Tables", permKey: "settings" },
                { href: "/dashboard/delivery", icon: Truck, labelAr: "الدليفري", labelEn: "Delivery", permKey: "settings" },
            ]
        },
        {
            key: "admin",
            label: language === "ar" ? "المسؤول والتسويق" : "Admin",
            items: [
                { href: "/dashboard/customers", icon: Users, labelAr: "العملاء", labelEn: "Customers", permKey: "customers" },
                { href: "/dashboard/team", icon: UserCog, labelAr: "الفريق", labelEn: "Team", permKey: "team" },
                { href: "/dashboard/notifications", icon: Bell, labelAr: "إشعارات العملاء", labelEn: "Notifications", permKey: "customers" },
            ]
        },
        {
            key: "settings",
            label: language === "ar" ? "الأدوات" : "Tools",
            items: [
                { href: "/dashboard/theme", icon: Palette, labelAr: "تخصيص المظهر", labelEn: "Appearance", permKey: "settings" },
                { href: "/dashboard/qr", icon: QrCode, labelAr: "QR", labelEn: "QR Codes", permKey: "settings" },
                { href: "/dashboard/settings", icon: Settings, labelAr: "الإعدادات", labelEn: "Settings", permKey: "settings" },
            ]
        }
    ].map(section => {
        // Filter items based on permissions
        const p = permissions as Record<string, boolean> | null;
        if (!p) return section; // Owner has all permissions

        // If the entire section is blocked by a global nav key
        if (p[section.key] === false) return { ...section, items: [] };

        // Otherwise filter sub-items
        const filteredItems = section.items.filter((item: { href: string; permKey?: string; [key: string]: unknown }) => {
            if (!item.permKey) return true; // If no specific perm key, it relies on section key (which passed)
            return p[item.permKey] === true;
        });

        return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background text-slate-900 dark:text-zinc-100 flex transition-colors duration-300" dir={language === 'ar' ? 'rtl' : 'ltr'}>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ====== SIDEBAR ====== */}
            <aside className={`fixed md:sticky top-0 h-screen z-50 flex flex-col transition-all duration-300
                ${language === 'ar' ? 'right-0' : 'left-0'}
                ${sidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')}
                ${sidebarCollapsed ? 'w-20' : 'w-[260px]'} bg-white dark:bg-card border-slate-200 dark:border-zinc-800/50
                shadow-xl shadow-slate-200/50 dark:shadow-none
                ${language === 'ar' ? 'border-l' : 'border-r'}
            `}>
                {/* Logo */}
                <div className="h-[72px] flex items-center justify-between px-4 border-b border-slate-200 dark:border-zinc-800/50 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <ASNIcon />
                        {!sidebarCollapsed && (
                            <div className="flex flex-col whitespace-nowrap">
                                <span className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-emerald-400 dark:to-cyan-400" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>ASN</span>
                                <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-medium -mt-1 uppercase tracking-wider">Technology</span>
                            </div>
                        )}
                    </div>
                    
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden md:block p-1.5 text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                        {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6" style={{ scrollbarWidth: 'none' }}>
                    {navSections.map((section, sIdx) => (
                        <div key={sIdx}>
                            {!sidebarCollapsed && (
                                <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest px-3 mb-2">
                                    {section.label}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const active = isActive(item.href, 'exact' in item ? item.exact : undefined);
                                    return (
                                        <Link key={item.href} href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            title={sidebarCollapsed ? (language === "ar" ? item.labelAr : item.labelEn) : undefined}
                                            className={`flex items-center ${sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-3'} rounded-xl text-[15px] font-bold transition-all duration-200 group
                                                ${active
                                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm shadow-indigo-100 dark:shadow-emerald-500/5'
                                                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            <item.icon className={`w-5 h-5 transition-colors shrink-0 ${active ? 'text-indigo-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-indigo-500 dark:text-zinc-500 dark:group-hover:text-zinc-300'}`} />
                                            {!sidebarCollapsed && <span>{language === "ar" ? item.labelAr : item.labelEn}</span>}
                                            {active && !sidebarCollapsed && (
                                                <div className={`w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-emerald-400 ${language === 'ar' ? 'mr-auto' : 'ml-auto'} animate-pulse`} />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Bottom: Restaurant Name + Logout */}
                <div className={`border-t border-slate-200 dark:border-zinc-800/50 ${sidebarCollapsed ? 'p-2' : 'p-4'} space-y-3 shrink-0`}>
                    {restaurantName && !sidebarCollapsed && (
                        <div className="bg-slate-50/80 hover:bg-slate-100 dark:bg-zinc-800/30 dark:hover:bg-zinc-800/50 transition-colors rounded-xl px-3 py-2.5 flex items-center gap-3 border border-slate-200/50 dark:border-zinc-800/50">
                            {restaurantLogo ? (
                                <img src={restaurantLogo} alt={restaurantName} className="w-9 h-9 object-cover rounded-lg shadow-sm" />
                            ) : (
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 dark:from-emerald-500 dark:to-cyan-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                                    {restaurantName.charAt(0)}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-extrabold text-slate-800 dark:text-zinc-200 truncate">{restaurantName}</p>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-500">{language === "ar" ? "المطعم النشط" : "Active Restaurant"}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                        className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-3'} rounded-xl text-red-500/90 hover:text-red-600 hover:bg-red-50 dark:text-red-400/80 dark:hover:bg-red-500/10 text-[15px] font-bold transition-all`}
                        title={sidebarCollapsed ? (language === "ar" ? "تسجيل الخروج" : "Logout") : undefined}
                    >
                        <LogOut className="w-5 h-5" />
                        {!sidebarCollapsed && (language === "ar" ? "تسجيل الخروج" : "Logout")}
                    </button>
                </div>
            </aside>

            {/* ====== MAIN CONTENT ====== */}
            <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
                {/* Top Header Bar */}
                <header className="h-[72px] border-b border-slate-200 dark:border-zinc-800/50 bg-white/80 dark:bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shrink-0 transition-colors">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden md:flex items-center gap-2 text-slate-400 dark:text-zinc-500 text-sm">
                            <ChevronLeft className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
                            <span className="font-medium">
                                {language === "ar" ? "لوحة التحكم" : "Dashboard"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {restaurantName && (
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">
                                    {language === "ar" ? `مرحباً بك` : "Welcome Back"}
                                </span>
                                <strong className="text-[15px] font-extrabold text-indigo-900 dark:text-emerald-400">{restaurantName}</strong>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            {/* Theme Toggle */}
                            {mounted && (
                                <button
                                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                    className="relative p-2 rounded-xl bg-slate-100 dark:bg-zinc-800/50 hover:bg-slate-200 dark:hover:bg-zinc-700/50 transition-all duration-300 group overflow-hidden"
                                    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                >
                                    <div className={`transition-all duration-500 ${isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0 absolute inset-0 m-auto'}`}>
                                        <Moon className="w-4 h-4 text-yellow-400" />
                                    </div>
                                    <div className={`transition-all duration-500 ${!isDark ? 'rotate-0 scale-100' : '-rotate-90 scale-0 absolute inset-0 m-auto'}`}>
                                        <Sun className="w-4 h-4 text-amber-500" />
                                    </div>
                                </button>
                            )}
                            <span title={isOnline ? "Online - syncing with cloud" : "Offline - data saved locally"}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-extrabold transition-all shadow-sm ${isOnline ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-glass-border" : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"}`}>
                                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                                <span className="hidden sm:block uppercase tracking-wider">{isOnline ? "أونلاين" : "أوفلاين"}</span>
                            </span>
                            
                            {/* Top Right Avatar */}
                            {restaurantLogo ? (
                                <img src={restaurantLogo} alt={restaurantName} className="w-10 h-10 object-cover rounded-xl shadow-md border-2 border-white dark:border-zinc-800" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 dark:from-emerald-500 dark:to-cyan-500 flex items-center justify-center text-white font-extrabold text-base shadow-md border-2 border-white dark:border-zinc-800">
                                    {restaurantName ? restaurantName.charAt(0) : "?"}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className={`${pathname.includes('/pos') ? 'p-2 md:p-4 pt-1' : 'p-4 md:p-8'} flex-1 flex flex-col min-h-0`}>
                    {children}
                </div>
                <Toaster position="top-right" theme={isDark ? "dark" : "light"} richColors closeButton />
            </main>
        </div>
    );
}
