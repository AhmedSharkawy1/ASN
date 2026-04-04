"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
    LayoutDashboard, ClipboardList, Utensils, Warehouse,
    BarChart3, Settings, LogOut, Menu, X, ChevronLeft,
    Bell, Wifi, WifiOff, Sun, Moon,
    CreditCard, ChefHat, TableProperties, Truck, BookOpen,
    Factory, ScrollText, TrendingUp, Landmark, Users,
    UserCog, Printer, Store, Palette, QrCode,
    PanelLeftClose, PanelLeftOpen,
    Fingerprint, CalendarClock, DollarSign, AlertTriangle, FileBarChart, Megaphone, Cloud
} from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/context/LanguageContext";
import { supabase } from "@/lib/supabase/client";
import { subscribeSyncStatus } from "@/lib/sync-service";
import { Toaster, toast } from "sonner";
import { posDb } from "@/lib/pos-db";
import { SyncStatus } from "@/components/SyncStatus";

interface Branch {
    id: string;
    branch_name: string;
}

interface NavItem {
    href: string;
    icon: React.ElementType;
    labelAr: string;
    labelEn: string;
    exact?: boolean;
    key?: string;
}

interface NavSection {
    key: string;
    label: string;
    items: NavItem[];
}

interface OrderPayload {
    id: string;
    is_draft: boolean;
    source: string;
    customer_name?: string;
}

/* ── Interactive ASN Logo Icon ── */
function ASNIcon() {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="w-9 h-9 relative flex-shrink-0 cursor-pointer group"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400 via-emerald-300 to-cyan-300 dark:from-emerald-400 dark:via-cyan-400 dark:to-blue-500 opacity-15 dark:opacity-30 blur-md transition-all duration-500 ${hovered ? 'scale-150 opacity-30 dark:opacity-50' : 'scale-100'}`} />
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
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [restaurantName, setRestaurantName] = useState("");
    const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null);
    const [isDesktopApp, setIsDesktopApp] = useState(false);
    const [syncStatus, setSyncStatus] = useState({ pending: 0, lastSync: null, deviceId: null });
    const restaurantIdRef = useRef<string | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Tenant Switcher (Parent/Child Branches)
    const [tenantLinks, setTenantLinks] = useState<{id: string, name: string, is_parent: boolean}[]>([]);
    const [currentTenantId, setCurrentTenantId] = useState<string>("");

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname === href || pathname.startsWith(href + '/');
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('desktop') === 'true') {
                setIsDesktopApp(true);
                localStorage.setItem('desktop_mode', 'true');
            } else if (localStorage.getItem('desktop_mode') === 'true') {
                setIsDesktopApp(true);
            }
        }

        const loadFromCache = async () => {
            const cached = await posDb.settings.get('current_config');
            if (cached) {
                setRestaurantName(cached.restaurant_name);
                setRestaurantLogo(cached.restaurant_logo || null);
                setRestaurantId(cached.restaurant_id);
                restaurantIdRef.current = cached.restaurant_id;
                if (cached.permissions_json) {
                    setPermissions(JSON.parse(cached.permissions_json));
                }
                
                const cachedBranches = await posDb.branches.where('restaurant_id').equals(cached.restaurant_id).toArray();
                if (cachedBranches.length > 0) {
                    // Branches loaded from cache — context will be updated when online
                }
                
                setLoading(false);
                return true;
            }
            return false;
        };

        const checkAuth = async () => {
            // If offline, skip ALL Supabase operations and rely on cache
            if (!navigator.onLine) {
                const offline = localStorage.getItem('offline_session');
                if (offline) {
                    const parsed = JSON.parse(offline);
                    // Make sure cache has our data
                    const cached = await posDb.settings.get('current_config');
                    if (cached) {
                        setRestaurantName(cached.restaurant_name);
                        setRestaurantLogo(cached.restaurant_logo || null);
                        setRestaurantId(cached.restaurant_id);
                        restaurantIdRef.current = cached.restaurant_id;
                        if (cached.permissions_json) {
                            setPermissions(JSON.parse(cached.permissions_json));
                        }
                    } else {
                        // Minimal setup from offline_session
                        setRestaurantId(parsed.restaurant_id);
                        restaurantIdRef.current = parsed.restaurant_id;
                        setPermissions({ _isAdmin: true });
                    }
                    setLoading(false);
                    return;
                } else {
                    router.push('/login');
                    return;
                }
            }

            // ═══ ONLINE: Full Supabase auth check ═══
            const { data: { session } } = await supabase.auth.getSession();
            let finalSession = session;

            if (!finalSession) {
                const offline = localStorage.getItem('offline_session');
                if (offline) {
                    finalSession = JSON.parse(offline);
                } else {
                    router.push("/login");
                    return;
                }
            }

            if (!finalSession) return;

            const email = finalSession.user.email;
            const userId = finalSession.user.id;
            let rId: string | null = null;
            let rName = "";
            let rLogo = null;
            let tempPermissions: Record<string, boolean> = {};

            // Check super_admin status
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .maybeSingle();
            
            if (roleError) console.error("ASN_LOG: User Roles Fetch Error:", roleError);

            // Impersonation Support
            const impersonatingTenant = sessionStorage.getItem('impersonating_tenant');
            if (impersonatingTenant) {
                const { data: rest, error: impError } = await supabase.from('restaurants').select('id,name,logo_url,is_marketing_account').eq('id', impersonatingTenant).maybeSingle();
                if (impError) console.error("ASN_LOG: Impersonation Lookup Error:", impError);
                if (rest) {
                    rId = rest.id;
                    rName = rest.name + ' (Impersonating)';
                    rLogo = rest.logo_url;
                    if (rest.is_marketing_account) tempPermissions['marketing_links'] = true;
                }
            } else if (roleData && roleData.role === 'super_admin') {
                router.push('/super-admin');
                return;
            }

            let isStaffFlag = false;

            if (!rId) {
                if (email?.endsWith(".asn") || (roleData && roleData.role === 'staff')) {
                    isStaffFlag = true;
                    const { data: staff, error: staffError } = await supabase.from('team_members').select('*, restaurants(name, logo_url, subscription_expires_at)').eq('auth_id', userId).maybeSingle();
                    
                    if (staffError) console.error("ASN_LOG: Staff Lookup Error:", staffError);

                    if (staff) {
                        if (!staff.is_active) {
                            await supabase.auth.signOut();
                            router.push("/login");
                            return;
                        }
                        if (staff.restaurants?.subscription_expires_at && new Date(staff.restaurants.subscription_expires_at) < new Date()) {
                            router.push('/subscription-expired');
                            return;
                        }

                        rId = staff.restaurant_id;
                        rName = staff.restaurants?.name || "";
                        rLogo = staff.restaurants?.logo_url || null;

                        if (staff.permissions) {
                            tempPermissions = typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : staff.permissions;
                        }
                        if (staff.restaurants?.is_marketing_account) tempPermissions['marketing_links'] = true;
                    }
                } else {
                    const { data: rest, error: restError } = await supabase.from('restaurants').select('id,name,logo_url, subscription_expires_at, is_marketing_account').ilike('email', email!).maybeSingle();
                    
                    if (restError) console.error("ASN_LOG: Restaurant Lookup Error:", restError);

                    if (rest) {
                        rId = rest.id;
                        rName = rest.name;
                        rLogo = rest.logo_url;
                        if (rest.subscription_expires_at && new Date(rest.subscription_expires_at) < new Date()) {
                            router.push('/subscription-expired');
                            return;
                        }
                        if (rest.is_marketing_account) tempPermissions['marketing_links'] = true;
                    } else {
                        // Fallback: check if this auth user is linked as a team member by auth_id
                        console.log("ASN_LOG: No restaurant found for email, trying team_members by auth_id:", userId);
                        const { data: staffFallback } = await supabase.from('team_members').select('*, restaurants(name, logo_url, subscription_expires_at)').eq('auth_id', userId).maybeSingle();
                        
                        if (staffFallback) {
                            isStaffFlag = true;
                            if (!staffFallback.is_active) {
                                await supabase.auth.signOut();
                                router.push("/login");
                                return;
                            }
                            if (staffFallback.restaurants?.subscription_expires_at && new Date(staffFallback.restaurants.subscription_expires_at) < new Date()) {
                                router.push('/subscription-expired');
                                return;
                            }
                            rId = staffFallback.restaurant_id;
                            rName = staffFallback.restaurants?.name || "";
                            rLogo = staffFallback.restaurants?.logo_url || null;
                            if (staffFallback.permissions) {
                                tempPermissions = typeof staffFallback.permissions === 'string' ? JSON.parse(staffFallback.permissions) : staffFallback.permissions;
                            }
                            if (staffFallback.restaurants?.is_marketing_account) tempPermissions['marketing_links'] = true;
                        } else {
                            // AUTO-CREATE: New account with no restaurant — create one automatically
                            console.log("ASN_LOG: Auto-creating restaurant for new user:", email);
                            const newName = email!.split('@')[0] || 'My Restaurant';
                            const { data: newRest, error: createErr } = await supabase
                                .from('restaurants')
                                .insert({
                                    name: newName,
                                    email: email,
                                })
                                .select('id, name, logo_url')
                                .single();

                            if (createErr) {
                                console.error("ASN_LOG: Failed to auto-create restaurant:", createErr);
                            } else if (newRest) {
                                console.log("ASN_LOG: Auto-created restaurant:", newRest.id, newRest.name);
                                rId = newRest.id;
                                rName = newRest.name;
                                rLogo = newRest.logo_url || null;
                            }
                        }
                    }
                }
            }

            // Fetch Tenant Switcher links regardless of impersonation, as long as user is a root owner
            if (roleData?.role !== 'super_admin' && !isStaffFlag && email) {
                const { data: rootRest } = await supabase.from('restaurants').select('id, name, parent_id').ilike('email', email).maybeSingle();
                if (rootRest && !rootRest.parent_id) { // Only root owners get the switcher
                    const { data: children } = await supabase.from('restaurants').select('id, name').eq('parent_id', rootRest.id);
                    if (children && children.length > 0) {
                        setTenantLinks([
                            { id: rootRest.id, name: rootRest.name, is_parent: true },
                            ...children.map(c => ({ id: c.id, name: c.name, is_parent: false }))
                        ]);
                        setCurrentTenantId(rId || rootRest.id);
                    }
                }
            }

            if (rId) {
                console.log("ASN_LOG: Final rId for check:", rId);
                const { data: cpa, error: cpaError } = await supabase.from('client_page_access').select('page_key, enabled').eq('tenant_id', rId);
                
                const tenantPerms: Record<string, boolean> = {};
                if (cpa && cpa.length > 0) {
                    cpa.forEach(p => { tenantPerms[p.page_key] = p.enabled; });
                }

                if (!isStaffFlag) {
                    tempPermissions = { ...tenantPerms, _isAdmin: true };
                } else {
                    const merged = { ...tempPermissions };
                    Object.keys(tenantPerms).forEach(key => {
                        if (tenantPerms[key] === false) merged[key] = false;
                    });
                    tempPermissions = { ...merged, _isAdmin: false };
                }
                
                // Update local cache (Requirement #5)
                await posDb.settings.put({
                    id: 'current_config',
                    restaurant_id: rId,
                    restaurant_name: rName,
                    restaurant_logo: rLogo,
                    currency: 'EGP', // Default
                    language: language,
                    permissions_json: JSON.stringify(tempPermissions)
                });

                setRestaurantName(rName);
                setRestaurantLogo(rLogo);
                restaurantIdRef.current = rId;
                setRestaurantId(rId);
                setPermissions(tempPermissions);
            } else if (!roleData || roleData.role !== 'super_admin') {
                router.push('/login');
                return;
            }
            setLoading(false);
        };

        const checkAuthWithFallback = async () => {
            // Priority 1: Load from local cache for instant UI
            const hasCache = await loadFromCache();
            
            try {
                // Priority 2: Update if online
                if (navigator.onLine) {
                    await checkAuth();
                } else if (!hasCache) {
                    // Offline with no cache: check offline_session
                    const offlineSession = localStorage.getItem('offline_session');
                    if (offlineSession) {
                        // We have a session but no cache — create minimal cache
                        const parsed = JSON.parse(offlineSession);
                        if (parsed.restaurant_id) {
                            setRestaurantId(parsed.restaurant_id);
                            restaurantIdRef.current = parsed.restaurant_id;
                            setPermissions({ _isAdmin: true });
                            setLoading(false);
                        } else {
                            toast.error(language === "ar" ? "أنت أوفلاين ولا يوجد بيانات مخزنة" : "You are offline and no cached data found");
                            setLoading(false);
                        }
                    } else {
                        router.push('/login');
                    }
                } else {
                    // Offline but has cache — already loaded, just mark done
                    setLoading(false);
                }
            } catch (err) {
                console.log("ASN_LOG: Auth fallback triggered", err);
                if (!hasCache) {
                    // Check offline_session as last resort
                    const offlineSession = localStorage.getItem('offline_session');
                    if (offlineSession) {
                        const parsed = JSON.parse(offlineSession);
                        if (parsed.restaurant_id) {
                            setRestaurantId(parsed.restaurant_id);
                            restaurantIdRef.current = parsed.restaurant_id;
                            setPermissions({ _isAdmin: true });
                            setLoading(false);
                            return;
                        }
                    }
                    router.push('/login');
                }
            }
        }

        checkAuthWithFallback();

        const unsub = subscribeSyncStatus(s => setIsOnline(s.isOnline));

        if (typeof window !== 'undefined' && 'electronAPI' in (window as any)) {
            setIsDesktopApp(true);
        }

        return () => {
            unsub();
        };
    }, [router]);

    const playChime = useCallback(() => {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            [0, 0.18, 0.36].forEach((delay, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = "sine";
                osc.frequency.value = 520 + i * 120;
                gain.gain.setValueAtTime(0, ctx.currentTime + delay);
                gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + delay + 0.04);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.22);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 0.25);
            });
        } catch { /* ignored */ }
    }, []);

    useEffect(() => {
        if (!restaurantId) return;
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission();
        }
        const channel = supabase
            .channel(`new-orders-${restaurantId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, (payload) => {
                const order = payload.new as OrderPayload;
                if (order.is_draft || order.source === "pos") return;
                playChime();
                const shortId = order.id ? order.id.split('-')[0].toUpperCase() : 'NEW';
                const titleText = language === "ar" ? "🛍️ طلب جديد!" : "🛍️ New Order!";
                const bodyText = language === "ar" ? `طلب #${shortId}` : `Order #${shortId}`;
                if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                    new Notification(titleText, { body: bodyText, icon: "/logo.png", tag: `order-${order.id}` }).onclick = () => window.focus();
                }
                toast.success(titleText, { description: bodyText });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [restaurantId, playChime, language]);

    const isDark = resolvedTheme === 'dark';

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 dark:bg-background flex items-center justify-center transition-colors">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
                    <span className="text-slate-500 text-sm font-medium">{language === "ar" ? "جاري التحميل..." : "Loading..."}</span>
                </div>
            </div>
        );
    }

    const navSections: NavSection[] = [
        {
            key: "home",
            label: language === "ar" ? "الرئيسية" : "Home",
            items: [
                { href: "/dashboard", icon: LayoutDashboard, labelAr: "الرئيسية", labelEn: "Dashboard", exact: true, key: "dashboard" },
            ]
        },
        {
            key: "orders",
            label: language === "ar" ? "الطلبات" : "Orders",
            items: [
                { href: "/dashboard/orders", icon: ClipboardList, labelAr: "نظام الطلبيات", labelEn: "Orders", key: "orders" },
                { href: "/dashboard/pos", icon: CreditCard, labelAr: "POS", labelEn: "POS", key: "pos" },
                { href: "/dashboard/kitchen", icon: ChefHat, labelAr: "شاشة المطبخ", labelEn: "Kitchen Display", key: "kitchen" },
                { href: "/dashboard/reports", icon: BarChart3, labelAr: "التقارير", labelEn: "Reports", key: "reports" },
            ]
        },
        {
            key: "products",
            label: language === "ar" ? "القائمة" : "Menu",
            items: [
                { href: "/dashboard/menu", icon: Utensils, labelAr: "المنتجات", labelEn: "Products", key: "products" },
                { href: "/dashboard/tables", icon: TableProperties, labelAr: "الطاولات", labelEn: "Tables", key: "tables" },
                { href: "/dashboard/delivery", icon: Truck, labelAr: "الدليفري", labelEn: "Delivery", key: "delivery" },
            ]
        },
        {
            key: "inventory",
            label: language === "ar" ? "المخزون والمصنع" : "Inventory & Factory",
            items: [
                { href: "/dashboard/inventory", icon: Warehouse, labelAr: "المخزون", labelEn: "Inventory", key: "inventory" },
                { href: "/dashboard/recipes", icon: BookOpen, labelAr: "الوصفات", labelEn: "Recipes", key: "recipes" },
                { href: "/dashboard/factory", icon: Factory, labelAr: "المصنع", labelEn: "Factory", key: "factory" },
                { href: "/dashboard/inventory/transactions", icon: ScrollText, labelAr: "حركات المخزون", labelEn: "Transactions", key: "transactions" },
                { href: "/dashboard/costs", icon: TrendingUp, labelAr: "التكاليف والأرباح", labelEn: "Cost Analytics", key: "costs" },
                { href: "/dashboard/supplies", icon: Truck, labelAr: "التوريدات", labelEn: "Supplies", key: "supplies" },
                { href: "/dashboard/branch-supplies", icon: Warehouse, labelAr: "توريدات الفروع", labelEn: "Branch Supplies", key: "branch_supplies" },
            ]
        },
        {
            key: "finance",
            label: language === "ar" ? "المالية" : "Finance",
            items: [
                { href: "/dashboard/accounts", icon: Landmark, labelAr: "الحسابات", labelEn: "Accounts", key: "accounts" },
            ]
        },
        {
            key: "hr",
            label: language === "ar" ? "الموارد البشرية" : "HR",
            items: [
                { href: "/dashboard/hr", icon: Fingerprint, labelAr: "لوحة HR", labelEn: "HR Dashboard", exact: true, key: "hr" },
                { href: "/dashboard/hr/employees", icon: Users, labelAr: "الموظفين", labelEn: "Employees", key: "hr_employees" },
                { href: "/dashboard/hr/attendance", icon: CalendarClock, labelAr: "الحضور والانصراف", labelEn: "Attendance", key: "hr_attendance" },
                { href: "/dashboard/hr/payroll", icon: DollarSign, labelAr: "كشف المرتبات", labelEn: "Payroll", key: "hr_payroll" },
                { href: "/dashboard/hr/deductions", icon: AlertTriangle, labelAr: "الخصومات", labelEn: "Deductions", key: "hr_deductions" },
                { href: "/dashboard/hr/reports", icon: FileBarChart, labelAr: "تقارير HR", labelEn: "HR Reports", key: "hr_reports" },
            ]
        },
        {
            key: "admin",
            label: language === "ar" ? "المسؤول والتسويق" : "Admin",
            items: [
                { href: "/dashboard/marketing-links", icon: Megaphone, labelAr: "روابط العرض للتسويق", labelEn: "Marketing Links", key: "marketing_links" },
                { href: "/dashboard/customers", icon: Users, labelAr: "العملاء", labelEn: "Customers", key: "customers" },
                { href: "/dashboard/staff", icon: UserCog, labelAr: "الفريق", labelEn: "Staff", key: "team" },
                { href: "/dashboard/notifications", icon: Bell, labelAr: "إشعارات العملاء", labelEn: "Notifications", key: "notifications" },
            ]
        },
        {
            key: "settings",
            label: language === "ar" ? "الأدوات" : "Tools",
            items: [
                { href: "/dashboard/printer", icon: Printer, labelAr: "إعدادات الطابعة", labelEn: "Printer", key: "printer" },
                { href: "/dashboard/branches", icon: Store, labelAr: "الفروع", labelEn: "Branches", key: "branches" },
                { href: "/dashboard/theme", icon: Palette, labelAr: "تخصيص المظهر", labelEn: "Appearance", key: "theme" },
                ...(!isDesktopApp ? [{ href: "/dashboard/qr", icon: QrCode, labelAr: "QR", labelEn: "QR Codes", key: "qr" }] : []),
                { href: "/dashboard/settings", icon: Settings, labelAr: "الإعدادات", labelEn: "settings_page" },
            ]
        }
    ];

    const filteredNavSections = navSections.map(section => {
        const p = permissions as Record<string, boolean> | null;
        if (!p) return section;
        const filteredItems = section.items.filter((item: NavItem) => {
            if (item.key && p[item.key] === false) return false;
            return true;
        });
        return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-background text-slate-900 dark:text-zinc-100 flex transition-colors duration-300" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {(
            <aside className={`fixed md:sticky top-0 h-screen z-50 flex flex-col transition-all duration-300
                ${language === 'ar' ? 'right-0' : 'left-0'}
                ${sidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')}
                ${sidebarCollapsed ? 'w-20' : 'w-[280px]'} bg-white dark:bg-card border-stone-200 dark:border-zinc-800/50
                shadow-lg shadow-stone-100/50 dark:shadow-none
                ${language === 'ar' ? 'border-l' : 'border-r'}
            `}>
                <div className="h-[72px] flex items-center justify-between px-4 border-b border-stone-100 dark:border-zinc-800/50 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <ASNIcon />
                        {!sidebarCollapsed && (
                            <div className="flex flex-col whitespace-nowrap">
                                <strong className="text-xl font-black bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">ASN</strong>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-zinc-500">Technology</span>
                            </div>
                        )}
                    </div>

                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden md:block p-1.5 text-stone-400 dark:text-zinc-500 hover:text-teal-600 dark:hover:text-emerald-400 hover:bg-stone-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                        {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6" style={{ scrollbarWidth: 'none' }}>
                    {filteredNavSections.map((section, sIdx) => (
                        <div key={sIdx}>
                            {!sidebarCollapsed && (
                                <h3 className="px-4 text-[11px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.15em] mb-2">
                                    {section.label}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {section.items.map((item: NavItem) => {
                                    const active = isActive(item.href, item.exact);
                                    return (
                                        <Link key={item.href} href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group
                                                ${active
                                                    ? 'bg-teal-50 dark:bg-emerald-500/10 text-teal-700 dark:text-emerald-400 shadow-sm shadow-teal-500/10'
                                                    : 'text-slate-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-zinc-100'
                                                }`}
                                        >
                                            <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${active ? 'text-teal-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500 group-hover:text-teal-500 dark:group-hover:text-emerald-500'}`} />
                                            {!sidebarCollapsed && (
                                                <span className={`text-[15px] font-bold tracking-tight whitespace-nowrap transition-colors ${active ? 'font-extrabold' : ''}`}>
                                                    {language === "ar" ? item.labelAr : item.labelEn}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className={`border-t border-stone-100 dark:border-zinc-800/50 ${sidebarCollapsed ? 'p-2' : 'p-4'} space-y-3 shrink-0`}>
                    {restaurantName && !sidebarCollapsed && (
                        <div className="bg-stone-50/60 hover:bg-stone-50 dark:bg-zinc-800/30 dark:hover:bg-zinc-800/50 transition-colors rounded-xl px-3 py-2.5 flex items-center gap-3 border border-stone-100/50 dark:border-zinc-800/50">
                            {restaurantLogo ? (
                                <Image src={restaurantLogo} alt={restaurantName} width={36} height={36} className="w-9 h-9 object-cover rounded-lg shadow-sm" />
                            ) : (
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 dark:from-emerald-500 dark:to-cyan-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                                    {restaurantName.charAt(0)}
                                </div>
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{language === "ar" ? "المتجر" : "RESTAURANT"}</span>
                                <span className="text-[14px] font-extrabold text-slate-700 dark:text-zinc-200 truncate">{restaurantName}</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                        className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-3'} rounded-xl text-red-500/90 hover:text-red-600 hover:bg-red-50 dark:text-red-400/80 dark:hover:bg-red-500/10 text-[16px] font-extrabold transition-all`}
                    >
                        <LogOut className="w-5 h-5" />
                        {!sidebarCollapsed && (language === "ar" ? "تسجيل الخروج" : "Logout")}
                    </button>
                </div>
            </aside>
            )}

            <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
                {(
                <header className="h-[72px] border-b border-stone-100 dark:border-zinc-800/50 bg-white/80 dark:bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shrink-0 transition-colors">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden md:flex items-center gap-2 text-slate-400 dark:text-zinc-500 text-sm">
                            <ChevronLeft className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
                            <span className="font-medium">{language === "ar" ? "لوحة التحكم" : "Dashboard"}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {restaurantId && tenantLinks.length > 0 && (
                            <select
                                className="hidden md:block bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700/50 text-slate-700 dark:text-zinc-300 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                                value={currentTenantId}
                                onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const rootLink = tenantLinks.find(t => t.is_parent);
                                    if (rootLink && selectedId === rootLink.id) {
                                        sessionStorage.removeItem('impersonating_tenant');
                                    } else {
                                        sessionStorage.setItem('impersonating_tenant', selectedId);
                                    }
                                    window.location.reload();
                                }}
                            >
                                {tenantLinks.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.is_parent ? `🏢 ${language === "ar" ? "رئيسي:" : "Main:"} ${t.name}` : `↳ ${t.name}`}
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className="p-2 rounded-xl bg-stone-50 dark:bg-zinc-800/50 hover:bg-stone-100 dark:hover:bg-zinc-700/50 transition-all font-bold"
                        >
                            {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-400" />}
                        </button>

                        <SyncStatus />

                        {isDesktopApp && (
                            <button
                                onClick={async () => {
                                    try {
                                        if (typeof window !== 'undefined' && 'electronAPI' in (window as any)) {
                                            const result = await (window as any).electronAPI.forceSync();
                                            if (result.success) {
                                                toast.success(language === 'ar' ? 'تم رفع البيانات بنجاح' : 'Data uploaded successfully');
                                            }
                                        } else {
                                            // Fallback: trigger sync service
                                            const { forceSyncNow } = await import('@/lib/sync-service');
                                            await forceSyncNow();
                                            toast.success(language === 'ar' ? 'تم رفع البيانات بنجاح' : 'Data uploaded successfully');
                                        }
                                    } catch (err) {
                                        toast.error(language === 'ar' ? 'فشل رفع البيانات' : 'Upload failed');
                                    }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all border border-emerald-500/20"
                                title={language === 'ar' ? 'رفع البيانات على السيرفر' : 'Upload data to server'}
                            >
                                <Cloud className="w-4 h-4" />
                                {language === 'ar' ? 'رفع البيانات' : 'Upload Data'}
                            </button>
                        )}

                        {restaurantLogo ? (
                            <Image src={restaurantLogo} alt={restaurantName || "Logo"} width={40} height={40} className="w-10 h-10 object-cover rounded-xl shadow-md border-2 border-white dark:border-zinc-800" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 dark:from-emerald-500 dark:to-cyan-500 flex items-center justify-center text-white font-extrabold text-base shadow-md border-2 border-white dark:border-zinc-800">
                                {restaurantName ? restaurantName.charAt(0) : "?"}
                            </div>
                        )}
                    </div>
                </header>
                )}

                <div className={`${pathname.includes('/pos') ? 'p-2 md:p-4 pt-1' : 'p-4 md:p-8'} flex-1 flex flex-col min-h-0`}>
                    {children}
                </div>
                <Toaster position="top-right" theme={isDark ? "dark" : "light"} richColors closeButton />
            </main>
        </div>
    );
}
