"use client";

import { useState, useEffect } from "react";
import { Copy, ExternalLink, CheckCircle2, Megaphone, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/context/LanguageContext";
import { supabase } from "@/lib/supabase/client";

// List of available themes 
const MarketingThemes = [
    { key: "pizzapasta", nameEn: "Pizza & Pasta Hub", nameAr: "بيتزا وباستا هب" },
    { key: "pizzapasta-cyan", nameEn: "Pizza Hub - Cyan", nameAr: "بيتزا هب - سماوي" },
    { key: "pizzapasta-emerald", nameEn: "Pizza Hub - Emerald", nameAr: "بيتزا هب - زمردي" },
    { key: "pizzapasta-sky", nameEn: "Pizza Hub - Sky", nameAr: "بيتزا هب - سماوي فاتح" },
    { key: "atyab-oriental", nameEn: "Atyab Oriental", nameAr: "أطياب الشرق" },
    { key: "atyab-oriental-cyan", nameEn: "Atyab Oriental - Cyan", nameAr: "أطياب الشرق - سماوي" },
    { key: "atyab-oriental-emerald", nameEn: "Atyab Oriental - Emerald", nameAr: "أطياب الشرق - زمردي" },
    { key: "atyab-oriental-sky", nameEn: "Atyab Oriental - Sky", nameAr: "أطياب الشرق - سماوي فاتح" },
    { key: "bab-alhara", nameEn: "Bab Al-Hara", nameAr: "باب الحارة" },
    { key: "bab-alhara-cyan", nameEn: "Bab Al-Hara - Cyan", nameAr: "باب الحارة - سماوي" },
    { key: "bab-alhara-emerald", nameEn: "Bab Al-Hara - Emerald", nameAr: "باب الحارة - زمردي" },
    { key: "bab-alhara-sky", nameEn: "Bab Al-Hara - Sky", nameAr: "باب الحارة - سماوي فاتح" },
    { key: "atyab-etoile", nameEn: "Atyab Etoile", nameAr: "أطياب إيتوال" },
    { key: "atyab-etoile-cyan", nameEn: "Atyab Etoile - Cyan", nameAr: "أطياب إيتوال - سماوي" },
    { key: "atyab-etoile-emerald", nameEn: "Atyab Etoile - Emerald", nameAr: "أطياب إيتوال - زمردي" },
    { key: "atyab-etoile-sky", nameEn: "Atyab Etoile - Sky", nameAr: "أطياب إيتوال - سماوي فاتح" },
    { key: "theme5", nameEn: "Premium Elegance", nameAr: "الفاخر والأنيق" },
    { key: "theme5-cyan", nameEn: "Premium Elegance - Cyan", nameAr: "الفاخر - سماوي" },
    { key: "theme5-emerald", nameEn: "Premium Elegance - Emerald", nameAr: "الفاخر - زمردي" },
    { key: "theme5-sky", nameEn: "Premium Elegance - Sky", nameAr: "الفاخر - سماوي فاتح" },
    { key: "theme6", nameEn: "Veranda Style", nameAr: "الروح المفتوحة" },
    { key: "theme6-cyan", nameEn: "Veranda - Cyan", nameAr: "الروح المفتوحة - سماوي" },
    { key: "theme6-emerald", nameEn: "Veranda - Emerald", nameAr: "الروح المفتوحة - زمردي" },
    { key: "theme6-sky", nameEn: "Veranda - Sky", nameAr: "الروح المفتوحة - سماوي فاتح" },
    { key: "theme7", nameEn: "Haleem Dark", nameAr: "حليم المعتم" },
    { key: "theme7-cyan", nameEn: "Haleem Dark - Cyan", nameAr: "حليم المعتم - سماوي" },
    { key: "theme7-emerald", nameEn: "Haleem Dark - Emerald", nameAr: "حليم المعتم - زمردي" },
    { key: "theme7-sky", nameEn: "Haleem Dark - Sky", nameAr: "حليم المعتم - سماوي فاتح" },
    { key: "theme9", nameEn: "Diablo Modern", nameAr: "ديابلو العصري" },
    { key: "theme9-cyan", nameEn: "Diablo Modern - Cyan", nameAr: "ديابلو العصري - سماوي" },
    { key: "theme9-emerald", nameEn: "Diablo Modern - Emerald", nameAr: "ديابلو العصري - زمردي" },
    { key: "theme9-sky", nameEn: "Diablo Modern - Sky", nameAr: "ديابلو العصري - سماوي فاتح" },
    { key: "theme10", nameEn: "Orange Glow", nameAr: "الوهج البرتقالي" },
    { key: "theme10-cyan", nameEn: "Orange Glow - Cyan", nameAr: "الوهج البرتقالي - سماوي" },
    { key: "theme10-emerald", nameEn: "Orange Glow - Emerald", nameAr: "الوهج البرتقالي - زمردي" },
    { key: "theme10-sky", nameEn: "Orange Glow - Sky", nameAr: "الوهج البرتقالي - سماوي فاتح" },
    { key: "theme11", nameEn: "Luxe Minimal", nameAr: "التصميم البسيط" },
    { key: "theme11-cyan", nameEn: "Luxe Minimal - Cyan", nameAr: "التصميم البسيط - سماوي" },
    { key: "theme11-emerald", nameEn: "Luxe Minimal - Emerald", nameAr: "التصميم البسيط - زمردي" },
    { key: "theme11-sky", nameEn: "Luxe Minimal - Sky", nameAr: "التصميم البسيط - سماوي فاتح" },
    { key: "theme12", nameEn: "New Year Celebration", nameAr: "احتفالية العام الجديد" },
    { key: "theme13", nameEn: "Fresh Bakery", nameAr: "المخبز الطازج" },
    { key: "theme13-cyan", nameEn: "Fresh Bakery - Cyan", nameAr: "المخبز الطازج - سماوي" },
    { key: "theme13-emerald", nameEn: "Fresh Bakery - Emerald", nameAr: "المخبز الطازج - زمردي" },
    { key: "theme13-sky", nameEn: "Fresh Bakery - Sky", nameAr: "المخبز الطازج - سماوي فاتح" },
    { key: "theme16", nameEn: "Vibrant Hub", nameAr: "محور الحيوية" }
];

export default function MarketingLinksPage() {
    const { language } = useLanguage();
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
    const [restaurantName, setRestaurantName] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const ROOT_DOMAIN = "asntechnology.net";

    useEffect(() => {
        const fetchRestaurant = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const email = session.user.email;
                const userId = session.user.id;

                // Check impersonation first
                const impersonatingTenant = sessionStorage.getItem('impersonating_tenant');

                let restData: any = null;

                if (impersonatingTenant) {
                    const { data } = await supabase.from('restaurants').select('id, name, slug').eq('id', impersonatingTenant).maybeSingle();
                    restData = data;
                } else {
                    // Check if staff
                    const { data: staff } = await supabase.from('team_members').select('restaurant_id').eq('auth_id', userId).maybeSingle();
                    if (staff) {
                        const { data } = await supabase.from('restaurants').select('id, name, slug').eq('id', staff.restaurant_id).maybeSingle();
                        restData = data;
                    } else {
                        // Owner
                        const { data } = await supabase.from('restaurants').select('id, name, slug').ilike('email', email!).maybeSingle();
                        restData = data;
                    }
                }

                if (restData) {
                    setRestaurantSlug(restData.slug || restData.id);
                    setRestaurantName(restData.name || "");
                }
            } catch (err) {
                console.error("Failed to fetch restaurant info", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRestaurant();
    }, []);

    const getThemeUrl = (themeKey: string) => {
        if (!restaurantSlug) return "#";
        return `https://${restaurantSlug}.${ROOT_DOMAIN}?preview_theme=${themeKey}`;
    };

    const handleCopy = async (themeKey: string) => {
        const url = getThemeUrl(themeKey);
        try {
            await navigator.clipboard.writeText(url);
            setCopiedKey(themeKey);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="relative z-10 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                                <Megaphone className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-md">
                                {language === "ar" ? "روابط العرض للتسويق" : "Marketing Theme Links"}
                            </h1>
                        </div>
                        <p className="text-fuchsia-100 text-lg md:text-xl font-medium max-w-2xl">
                            {language === "ar" 
                                ? `أرسل هذه الروابط لعملائك لاستعراض منيو "${restaurantName}" بتصاميم مختلفة. كل رابط يفتح المنيو الخاص بك بثيم مختلف.`
                                : `Share these links with clients to preview "${restaurantName}" menu in different designs. Each link opens your menu with a different theme.`}
                        </p>
                        {restaurantSlug && (
                            <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-bold border border-white/20">
                                <span className="opacity-70">{language === "ar" ? "الدومين:" : "Domain:"}</span>
                                <span dir="ltr">{restaurantSlug}.{ROOT_DOMAIN}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Themes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MarketingThemes.map((theme) => {
                    const url = getThemeUrl(theme.key);
                    const isCopied = copiedKey === theme.key;

                    return (
                        <div key={theme.key} className="bg-white dark:bg-card border border-stone-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                            <div className="mb-4">
                                <span className="inline-block px-3 py-1 bg-stone-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 font-mono text-xs font-bold rounded-lg mb-2">
                                    {theme.key}
                                </span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                    {language === "ar" ? theme.nameAr : theme.nameEn}
                                </h3>
                            </div>

                            <div className="mt-auto space-y-3">
                                <div className="p-3 bg-stone-50 dark:bg-black/30 rounded-xl border border-stone-100 dark:border-zinc-800 overflow-hidden">
                                    <p className="text-sm font-mono text-blue-600 dark:text-blue-400 truncate select-all" dir="ltr">
                                        {url}
                                    </p>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleCopy(theme.key)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                            isCopied 
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                                            : 'bg-white text-slate-700 border-stone-200 hover:bg-stone-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700/50'
                                        } border`}
                                    >
                                        {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {isCopied ? (language === "ar" ? "تم النسخ" : "Copied") : (language === "ar" ? "نسخ الرابط" : "Copy Link")}
                                    </button>
                                    
                                    <a 
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-[42px] px-4 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
                                        title={language === "ar" ? "استعرض الثيم" : "Preview Theme"}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
