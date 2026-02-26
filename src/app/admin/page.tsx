"use client";

import { useLanguage } from "@/lib/context/LanguageContext";

export default function AdminDashboardPage() {
    const { language } = useLanguage();

    return (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">
                    {language === "ar" ? "نظرة عامة على المنصة" : "Platform Overview"}
                </h1>
                <p className="text-silver">
                    {language === "ar"
                        ? "تحكم في كل المطاعم والمنيوهات من هنا."
                        : "Manage all restaurant tenants and menus from here."}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl border border-glass-border bg-white dark:bg-glass-dark shadow-sm">
                    <h3 className="text-sm text-silver font-medium mb-1">Total Restaurants</h3>
                    <p className="text-4xl font-bold text-foreground">0</p>
                </div>
                <div className="p-6 rounded-2xl border border-glass-border bg-white dark:bg-glass-dark shadow-sm">
                    <h3 className="text-sm text-silver font-medium mb-1">Active Menus</h3>
                    <p className="text-4xl font-bold text-blue">0</p>
                </div>
                <div className="p-6 rounded-2xl border border-glass-border bg-white dark:bg-glass-dark shadow-sm">
                    <h3 className="text-sm text-silver font-medium mb-1">Total Views</h3>
                    <p className="text-4xl font-bold text-cyan-500">0</p>
                </div>
            </div>

            <div className="mt-8 p-6 rounded-2xl border border-glass-border bg-white dark:bg-glass-dark">
                <h2 className="text-xl font-semibold mb-4">Recent Restaurants</h2>
                <div className="text-center py-10 text-silver/50">
                    {language === "ar" ? "لا يوجد مطاعم حتى الآن" : "No restaurants added yet."}
                </div>
            </div>
        </div>
    );
}
