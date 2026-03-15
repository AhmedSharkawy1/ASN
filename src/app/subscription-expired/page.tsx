"use client";

import { AlertTriangle, Home, Mail } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/context/LanguageContext";

export default function SubscriptionExpiredPage() {
    const { language } = useLanguage();
    
    return (
        <div className="min-h-screen bg-stone-50 dark:bg-[#0a0f16] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#131b26] p-8 md:p-12 rounded-3xl border border-red-200 dark:border-red-900/30 shadow-2xl max-w-lg w-full text-center relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-500" />
                    </div>
                    
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                        {language === "ar" ? "اشتراكك منتهي" : "Subscription Expired"}
                    </h1>
                    
                    <p className="text-slate-600 dark:text-zinc-400 mb-8 leading-relaxed">
                        {language === "ar" 
                            ? "عذرًا، يبدو أن اشتراك متجرك قد انتهى. لا يمكنك الوصول إلى لوحة التحكم حاليًا. يرجى تجديد الاشتراك أو التواصل مع الدعم الفني لاستعادة الوصول." 
                            : "Sorry, it looks like your store's subscription has expired. You cannot access the dashboard at this time. Please renew your subscription or contact support to restore access."}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                        <a 
                            href="mailto:support@asn.technology"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors w-full sm:w-auto"
                        >
                            <Mail className="w-5 h-5" />
                            {language === "ar" ? "تواصل مع الدعم" : "Contact Support"}
                        </a>
                        <Link 
                            href="/login"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors w-full sm:w-auto"
                        >
                            <Home className="w-5 h-5" />
                            {language === "ar" ? "العودة للبداية" : "Return to Login"}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
