"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login"); // Not logged in
            } else {
                // TODO: Verify if the user is the SuperAdmin
                // If not, redirect them away
                setLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#02040f] text-foreground flex">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-white dark:bg-glass-dark border-r border-glass-border hidden md:flex flex-col">
                <div className="p-6 border-b border-glass-border">
                    <h2 className="text-xl font-bold text-blue tracking-tight">SuperAdmin</h2>
                </div>
                <nav className="flex-1 p-4 flex flex-col gap-2">
                    <a href="/admin" className="px-4 py-3 rounded-xl bg-blue/10 text-blue font-medium">Dashboard</a>
                    <a href="/admin/restaurants" className="px-4 py-3 rounded-xl hover:bg-glass-light text-silver hover:text-foreground transition-colors">Restaurants</a>
                    <a href="/admin/settings" className="px-4 py-3 rounded-xl hover:bg-glass-light text-silver hover:text-foreground transition-colors">Platform Settings</a>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-y-auto">
                <header className="h-16 border-b border-glass-border bg-white/50 dark:bg-glass-dark/50 backdrop-blur-md flex items-center px-6">
                    <h1 className="text-lg font-semibold">{language === "ar" ? "لوحة تحكم الإدارة" : "Administration Panel"}</h1>
                    <div className="ml-auto">
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                router.push("/login");
                            }}
                            className="text-sm font-medium text-red-500 hover:text-red-400"
                        >
                            {language === "ar" ? "تسجيل الخروج" : "Logout"}
                        </button>
                    </div>
                </header>
                <div className="p-6 md:p-10 flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
}
