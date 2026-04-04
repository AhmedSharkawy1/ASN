"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import {
    LayoutDashboard, Users, CreditCard, Layers,
    Shield, Database, LineChart, Activity, Settings,
    LogOut, Menu, X, ChevronLeft, Sun, Moon, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import Link from "next/link";
import { Toaster } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    const { setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [userEmail, setUserEmail] = useState("");

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }

            // Verify super admin role purely for UI safety
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();

            if (!roleData || roleData.role !== 'super_admin') {
                router.push("/dashboard"); // Redirect to normal dashboard if not super admin
                return;
            }

            setUserEmail(session.user.email || 'Super Admin');
            setLoading(false);
        };
        checkAuth();
    }, [router]);

    const isDark = resolvedTheme === 'dark';

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 dark:bg-background flex items-center justify-center transition-colors">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 dark:border-glass-border"></div>
                    <span className="text-slate-500 dark:text-zinc-500 text-sm font-medium animate-pulse">Loading Platform Engine...</span>
                </div>
            </div>
        );
    }

    const navItems = [
        { href: "/super-admin", icon: LayoutDashboard, label: "Platform Overview", exact: true },
        { href: "/super-admin/clients", icon: Users, label: "Clients & Tenants" },
        { href: "/super-admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
        { href: "/super-admin/plans", icon: Layers, label: "Pricing Plans" },
        { href: "/super-admin/features", icon: Shield, label: "Feature Controls" },
        { href: "/super-admin/backups", icon: Database, label: "System Backups" },
        { href: "/super-admin/analytics", icon: LineChart, label: "Analytics" },
        { href: "/super-admin/logs", icon: Activity, label: "Activity Logs" },
        { href: "/super-admin/settings", icon: Settings, label: "Platform Settings" },
    ];

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-[#0a0f16] text-slate-900 dark:text-zinc-100 flex transition-colors duration-300" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ====== SIDEBAR ====== */}
            <aside className={`fixed md:sticky top-0 h-screen z-50 flex flex-col transition-all duration-300
                ${language === 'ar' ? 'right-0' : 'left-0'}
                ${sidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')}
                ${sidebarCollapsed ? 'w-20' : 'w-[280px]'} bg-[#131b26] border-stone-800
                shadow-2xl shadow-black/50
                ${language === 'ar' ? 'border-l' : 'border-r'} border-[#232f40]
            `}>
                {/* Logo */}
                <div className="h-[72px] flex items-center justify-between px-5 border-b border-[#232f40] shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 relative flex-shrink-0 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                           <Shield className="w-5 h-5 text-white" />
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex flex-col whitespace-nowrap">
                                <span className="text-lg font-extrabold tracking-tight text-white uppercase">Engine</span>
                                <span className="text-[10px] text-blue-400 font-bold -mt-1 tracking-widest uppercase">Super Admin</span>
                            </div>
                        )}
                    </div>
                    
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden md:block p-1.5 text-slate-500 hover:text-white transition-colors">
                        {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5" style={{ scrollbarWidth: 'none' }}>
                    {navItems.map((item) => {
                        const active = isActive(item.href, item.exact);
                        return (
                            <Link key={item.href} href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                title={sidebarCollapsed ? item.label : undefined}
                                className={`flex items-center ${sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl text-[15px] font-bold transition-all duration-200 group
                                    ${active
                                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-[#1a2433]'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 transition-colors shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom: Logout */}
                <div className={`border-t border-[#232f40] ${sidebarCollapsed ? 'p-2' : 'p-4'} shrink-0`}>
                    {!sidebarCollapsed && (
                         <div className="mb-4 px-2">
                             <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Logged in as</p>
                             <p className="text-sm text-slate-300 font-medium truncate">{userEmail}</p>
                         </div>
                    )}
                    <button
                        onClick={async () => { 
                            sessionStorage.removeItem('impersonating_tenant');
                            localStorage.removeItem('offline_session');
                            localStorage.removeItem('offline_pw');
                            await supabase.auth.signOut(); 
                            router.push("/login"); 
                        }}
                        className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[15px] font-bold transition-all`}
                        title={sidebarCollapsed ? "Logout" : undefined}
                    >
                        <LogOut className="w-5 h-5" />
                        {!sidebarCollapsed && "Secure Logout"}
                    </button>
                </div>
            </aside>

            {/* ====== MAIN CONTENT ====== */}
            <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
                {/* Top Header Bar */}
                <header className="h-[72px] border-b border-stone-200 dark:border-zinc-800/50 bg-white/80 dark:bg-[#0a0f16]/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shrink-0 transition-colors">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden md:flex items-center gap-2 text-slate-400 dark:text-zinc-500 text-sm">
                            <ChevronLeft className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                                Super Admin Control Center
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Theme Toggle */}
                        {mounted && (
                            <button
                                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                className="relative p-2.5 rounded-full bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-all duration-300 group overflow-hidden"
                            >
                                <div className={`transition-all duration-500 ${isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0 absolute inset-0 m-auto'}`}>
                                    <Moon className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className={`transition-all duration-500 ${!isDark ? 'rotate-0 scale-100' : '-rotate-90 scale-0 absolute inset-0 m-auto'}`}>
                                    <Sun className="w-4 h-4 text-amber-500" />
                                </div>
                            </button>
                        )}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white dark:border-zinc-800 ring-2 ring-blue-500/20">
                            SA
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className={`p-4 md:p-8 flex-1 flex flex-col min-h-0`}>
                    {children}
                </div>
                <Toaster position="top-right" theme={isDark ? "dark" : "light"} richColors closeButton />
            </main>
        </div>
    );
}
