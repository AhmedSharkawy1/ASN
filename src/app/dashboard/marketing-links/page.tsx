"use client";

import { useState, useEffect } from "react";
import { Copy, ExternalLink, CheckCircle2, Megaphone, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/context/LanguageContext";
import { supabase } from "@/lib/supabase/client";

// List of available themes 
const MarketingThemes = [
    // Theme 1: PizzaPasta
    { key: "pizzapasta", nameEn: "Theme 1 (Pizza Pasta - Blue)", nameAr: "ثيم 1 (بيتزا باستا - أزرق)" },
    { key: "pizzapasta-cyan", nameEn: "Theme 1 (Pizza Pasta - Cyan)", nameAr: "ثيم 1 (بيتزا باستا - سماوي)" },
    { key: "pizzapasta-red", nameEn: "Theme 1 (Pizza Pasta - Red)", nameAr: "ثيم 1 (بيتزا باستا - أحمر)" },
    { key: "pizzapasta-emerald", nameEn: "Theme 1 (Pizza Pasta - Emerald)", nameAr: "ثيم 1 (بيتزا باستا - زمردي)" },
    { key: "pizzapasta-sky", nameEn: "Theme 1 (Pizza Pasta - Sky)", nameAr: "ثيم 1 (بيتزا باستا - أزرق sky)" },

    // Theme 2: Atyab Oriental
    { key: "atyab-oriental", nameEn: "Theme 2 (Atyab Oriental - Gold)", nameAr: "ثيم 2 (أطياب أورينتال - ذهبي)" },
    { key: "atyab-oriental-cyan", nameEn: "Theme 2 (Atyab Oriental - Cyan)", nameAr: "ثيم 2 (أطياب أورينتال - سماوي)" },
    { key: "atyab-oriental-red", nameEn: "Theme 2 (Atyab Oriental - Red)", nameAr: "ثيم 2 (أطياب أورينتال - أحمر)" },
    { key: "atyab-oriental-emerald", nameEn: "Theme 2 (Atyab Oriental - Emerald)", nameAr: "ثيم 2 (أطياب أورينتال - زمردي)" },
    { key: "atyab-oriental-sky", nameEn: "Theme 2 (Atyab Oriental - Sky)", nameAr: "ثيم 2 (أطياب أورينتال - أزرق sky)" },

    // Theme 3: Bab Al-Hara
    { key: "bab-alhara", nameEn: "Theme 3 (Bab Al-Hara - Red)", nameAr: "ثيم 3 (باب الحارة - أحمر)" },
    { key: "bab-alhara-cyan", nameEn: "Theme 3 (Bab Al-Hara - Cyan)", nameAr: "ثيم 3 (باب الحارة - سماوي)" },
    { key: "bab-alhara-red", nameEn: "Theme 3 (Bab Al-Hara - Dark Red)", nameAr: "ثيم 3 (باب الحارة - أحمر داكن)" },
    { key: "bab-alhara-emerald", nameEn: "Theme 3 (Bab Al-Hara - Emerald)", nameAr: "ثيم 3 (باب الحارة - زمردي)" },
    { key: "bab-alhara-sky", nameEn: "Theme 3 (Bab Al-Hara - Sky)", nameAr: "ثيم 3 (باب الحارة - أزرق sky)" },

    // Theme 4: Atyab Etoile
    { key: "atyab-etoile", nameEn: "Theme 4 (Atyab Etoile - Gold)", nameAr: "ثيم 4 (أطياب إتوال - ذهبي)" },
    { key: "atyab-etoile-cyan", nameEn: "Theme 4 (Atyab Etoile - Cyan)", nameAr: "ثيم 4 (أطياب إتوال - سماوي)" },
    { key: "atyab-etoile-red", nameEn: "Theme 4 (Atyab Etoile - Red)", nameAr: "ثيم 4 (أطياب إتوال - أحمر)" },
    { key: "atyab-etoile-emerald", nameEn: "Theme 4 (Atyab Etoile - Emerald)", nameAr: "ثيم 4 (أطياب إتوال - زمردي)" },
    { key: "atyab-etoile-sky", nameEn: "Theme 4 (Atyab Etoile - Sky)", nameAr: "ثيم 4 (أطياب إتوال - أزرق sky)" },

    // Theme 5
    { key: "theme5", nameEn: "Theme 5 (Orange)", nameAr: "ثيم 5 (برتقالي)" },
    { key: "theme5-cyan", nameEn: "Theme 5 (Cyan)", nameAr: "ثيم 5 (سماوي)" },
    { key: "theme5-red", nameEn: "Theme 5 (Red)", nameAr: "ثيم 5 (أحمر)" },
    { key: "theme5-emerald", nameEn: "Theme 5 (Emerald)", nameAr: "ثيم 5 (زمردي)" },
    { key: "theme5-sky", nameEn: "Theme 5 (Sky)", nameAr: "ثيم 5 (أزرق sky)" },

    // Theme 6: Veranda
    { key: "theme6", nameEn: "Theme 6 (Veranda - Teal)", nameAr: "ثيم 6 (فراندة - تيل)" },
    { key: "theme6-cyan", nameEn: "Theme 6 (Cyan)", nameAr: "ثيم 6 (سماوي)" },
    { key: "theme6-red", nameEn: "Theme 6 (Red)", nameAr: "ثيم 6 (أحمر)" },
    { key: "theme6-emerald", nameEn: "Theme 6 (Emerald)", nameAr: "ثيم 6 (زمردي)" },
    { key: "theme6-sky", nameEn: "Theme 6 (Sky)", nameAr: "ثيم 6 (أزرق sky)" },

    // Theme 7: Haleem
    { key: "theme7", nameEn: "Theme 7 (Haleem - Dark Gold)", nameAr: "ثيم 7 (حليم - داكن ذهبي)" },
    { key: "theme7-cyan", nameEn: "Theme 7 (Cyan)", nameAr: "ثيم 7 (سماوي)" },
    { key: "theme7-red", nameEn: "Theme 7 (Red)", nameAr: "ثيم 7 (أحمر)" },
    { key: "theme7-emerald", nameEn: "Theme 7 (Emerald)", nameAr: "ثيم 7 (زمردي)" },
    { key: "theme7-sky", nameEn: "Theme 7 (Sky)", nameAr: "ثيم 7 (أزرق sky)" },

    // Theme 8: ASWAN EN
    { key: "aswan", nameEn: "Theme 8 (ASWAN EN - Dark Beige)", nameAr: "ثيم 8 (أسوان إنجليزي - بيج غامق)" },

    // Theme 9: Diablo
    { key: "theme9", nameEn: "Theme 9 (Diablo - Red)", nameAr: "ثيم 9 (ديابلو - أحمر)" },
    { key: "theme9-cyan", nameEn: "Theme 9 (Diablo - Cyan)", nameAr: "ثيم 9 (ديابلو - سماوي)" },
    { key: "theme9-emerald", nameEn: "Theme 9 (Diablo - Emerald)", nameAr: "ثيم 9 (ديابلو - زمردي)" },
    { key: "theme9-sky", nameEn: "Theme 9 (Diablo - Sky)", nameAr: "ثيم 9 (ديابلو - أزرق sky)" },
    { key: "theme9-pink", nameEn: "Theme 9 (Diablo - Pink)", nameAr: "ثيم 9 (ديابلو - وردي)" },

    // Theme 10: Orange Glow
    { key: "theme10", nameEn: "Theme 10 (Orange Glow)", nameAr: "ثيم 10 (الوهج البرتقالي)" },
    { key: "theme10-cyan", nameEn: "Theme 10 (Cyan)", nameAr: "ثيم 10 (سماوي)" },
    { key: "theme10-red", nameEn: "Theme 10 (Red)", nameAr: "ثيم 10 (أحمر)" },
    { key: "theme10-emerald", nameEn: "Theme 10 (Emerald)", nameAr: "ثيم 10 (زمردي)" },
    { key: "theme10-sky", nameEn: "Theme 10 (Sky)", nameAr: "ثيم 10 (أزرق sky)" },

    // Theme 11: Luxe Horizontal
    { key: "theme11", nameEn: "Theme 11 (Luxe Horizontal - Red)", nameAr: "ثيم 11 (عصري أفقي - أحمر)" },
    { key: "theme11-cyan", nameEn: "Theme 11 (Cyan)", nameAr: "ثيم 11 (سماوي)" },
    { key: "theme11-red", nameEn: "Theme 11 (Red)", nameAr: "ثيم 11 (أحمر)" },
    { key: "theme11-emerald", nameEn: "Theme 11 (Emerald)", nameAr: "ثيم 11 (زمردي)" },
    { key: "theme11-sky", nameEn: "Theme 11 (Sky)", nameAr: "ثيم 11 (أزرق sky)" },

    // Theme 12: New Year
    { key: "theme12", nameEn: "Theme 12 (New Year - RGB)", nameAr: "ثيم 12 (العام الجديد - RGB)" },

    // Theme 13: Fresh Bakery / Luxe Gold
    { key: "theme13", nameEn: "Theme 13 (Luxe Gold)", nameAr: "ثيم 13 (لوكس الذهبي)" },
    { key: "theme13-cyan", nameEn: "Theme 13 (Cyan)", nameAr: "ثيم 13 (سماوي)" },
    { key: "theme13-red", nameEn: "Theme 13 (Red)", nameAr: "ثيم 13 (أحمر)" },
    { key: "theme13-emerald", nameEn: "Theme 13 (Emerald)", nameAr: "ثيم 13 (زمردي)" },
    { key: "theme13-sky", nameEn: "Theme 13 (Sky)", nameAr: "ثيم 13 (أزرق sky)" },

    // Theme 14: ASWAN AR
    { key: "aswan-ar", nameEn: "Theme 14 (ASWAN AR - Dark Beige)", nameAr: "ثيم 14 (أسوان عربي - بيج غامق)" },

    // Theme 15: ASWAN Dual
    { key: "aswan-dual", nameEn: "Theme 15 (ASWAN Dual - Dark Beige)", nameAr: "ثيم 15 (أسوان ثنائي - بيج غامق)" },

    // Theme 16: Classic Red
    { key: "theme16", nameEn: "Theme 16 (Classic Red)", nameAr: "ثيم 16 (كلاسيك أحمر)" },

    // Theme 17: Lusha
    { key: "theme17", nameEn: "Theme 17 (Lusha - Coverflow)", nameAr: "ثيم 17 (لوشا - كوفرفلو)" },

    // Theme 18: Sham Flavor
    { key: "theme18", nameEn: "Theme 18 (Sham Flavor - Green)", nameAr: "ثيم 18 (نكهة الشام - أخضر)" },
    { key: "theme18-red", nameEn: "Theme 18 (Red)", nameAr: "ثيم 18 (أحمر)" },
    { key: "theme18-cyan", nameEn: "Theme 18 (Cyan)", nameAr: "ثيم 18 (سماوي)" },
    { key: "theme18-emerald", nameEn: "Theme 18 (Emerald)", nameAr: "ثيم 18 (زمردي)" },
    { key: "theme18-sky", nameEn: "Theme 18 (Sky)", nameAr: "ثيم 18 (أزرق sky)" },
    { key: "theme18-pink", nameEn: "Theme 18 (Pink)", nameAr: "ثيم 18 (وردي)" },
    { key: "theme18-gold", nameEn: "Theme 18 (Gold)", nameAr: "ثيم 18 (ذهبي)" },

    // Theme 19: MenuMasr
    { key: "theme19", nameEn: "Theme 19 (MenuMasr - Blue)", nameAr: "ثيم 19 (منيو مصر - أزرق)" },
    { key: "theme19-red", nameEn: "Theme 19 (Red)", nameAr: "ثيم 19 (أحمر)" },
    { key: "theme19-cyan", nameEn: "Theme 19 (Cyan)", nameAr: "ثيم 19 (سماوي)" },
    { key: "theme19-emerald", nameEn: "Theme 19 (Emerald)", nameAr: "ثيم 19 (زمردي)" },
    { key: "theme19-sky", nameEn: "Theme 19 (Sky)", nameAr: "ثيم 19 (أزرق sky)" },
    { key: "theme19-pink", nameEn: "Theme 19 (Pink)", nameAr: "ثيم 19 (وردي)" },

    // Theme 20: Vicino
    { key: "vicino", nameEn: "Theme 20 (Vicino - Gold)", nameAr: "ثيم 20 (فيتشينو - ذهبي)" },
    { key: "vicino-red", nameEn: "Theme 20 (Red)", nameAr: "ثيم 20 (أحمر)" },
    { key: "vicino-cyan", nameEn: "Theme 20 (Cyan)", nameAr: "ثيم 20 (سماوي)" },
    { key: "vicino-emerald", nameEn: "Theme 20 (Emerald)", nameAr: "ثيم 20 (زمردي)" },
    { key: "vicino-purple", nameEn: "Theme 20 (Purple)", nameAr: "ثيم 20 (بنفسجي)" },
    { key: "vicino-dark", nameEn: "Theme 20 (Dark Gold)", nameAr: "ثيم 20 (ذهبي داكن)" },

    // Theme 21: UAE
    { key: "uae", nameEn: "Theme 21 (UAE - Royal Gold)", nameAr: "ثيم 21 (الإمارات - ذهبي ملكي)" },

    // Theme 22: Add to Cart
    { key: "theme22", nameEn: "Theme 22 (Add to Cart - Orange)", nameAr: "ثيم 22 (إضافة للسلة - برتقالي)" },
    { key: "theme22-red", nameEn: "Theme 22 (Red)", nameAr: "ثيم 22 (أحمر)" },
    { key: "theme22-cyan", nameEn: "Theme 22 (Cyan)", nameAr: "ثيم 22 (سماوي)" },
    { key: "theme22-emerald", nameEn: "Theme 22 (Emerald)", nameAr: "ثيم 22 (زمردي)" },
    { key: "theme22-sky", nameEn: "Theme 22 (Sky)", nameAr: "ثيم 22 (أزرق sky)" },
    { key: "theme22-pink", nameEn: "Theme 22 (Pink)", nameAr: "ثيم 22 (وردي)" },
    { key: "theme22-gold", nameEn: "Theme 22 (Gold)", nameAr: "ثيم 22 (ذهبي)" },

    // Theme 23: USA
    { key: "usa", nameEn: "Theme 23 (USA EN - Crimson Red)", nameAr: "ثيم 23 (USA أمريكي - أحمر)" },

    // Theme 24: USA Dual
    { key: "usa-dual", nameEn: "Theme 24 (USA Dual - Crimson)", nameAr: "ثيم 24 (USA ثنائي - وردي)" },

    // Theme 25: Lamet Zaman
    { key: "lamet-zaman", nameEn: "Theme 25 (Lamet Zaman - Orange)", nameAr: "ثيم 25 (لمة زمان - برتقالي)" },
    { key: "lamet-zaman-red", nameEn: "Theme 25 (Lamet Zaman - Red)", nameAr: "ثيم 25 (لمة زمان - أحمر)" },
    { key: "lamet-zaman-emerald", nameEn: "Theme 25 (Lamet Zaman - Emerald)", nameAr: "ثيم 25 (لمة زمان - زمردي)" },
    { key: "lamet-zaman-cyan", nameEn: "Theme 25 (Lamet Zaman - Cyan)", nameAr: "ثيم 25 (لمة زمان - سماوي)" },
    { key: "lamet-zaman-sky", nameEn: "Theme 25 (Lamet Zaman - Sky)", nameAr: "ثيم 25 (لمة زمان - أزرق sky)" },
    { key: "lamet-zaman-purple", nameEn: "Theme 25 (Lamet Zaman - Purple)", nameAr: "ثيم 25 (لمة زمان - بنفسجي)" },
    { key: "lamet-zaman-gold", nameEn: "Theme 25 (Lamet Zaman - Gold)", nameAr: "ثيم 25 (لمة زمان - ذهبي)" },
    { key: "lamet-zaman-pink", nameEn: "Theme 25 (Lamet Zaman - Pink)", nameAr: "ثيم 25 (لمة زمان - وردي)" },
    { key: "lamet-zaman-dark", nameEn: "Theme 25 (Lamet Zaman - Dark)", nameAr: "ثيم 25 (لمة زمان - داكن)" },

    // Theme 26: Lamet Zaman BG
    { key: "lamet-zaman-bg", nameEn: "Theme 26 (Lamet Zaman BG - Orange)", nameAr: "ثيم 26 (لمة زمان مع خلفية صورة - برتقالي)" },
    { key: "lamet-zaman-bg-red", nameEn: "Theme 26 (Lamet Zaman BG - Red)", nameAr: "ثيم 26 (لمة زمان مع خلفية صورة - أحمر)" },
    { key: "lamet-zaman-bg-emerald", nameEn: "Theme 26 (Lamet Zaman BG - Emerald)", nameAr: "ثيم 26 (لمة زمان مع خلفية صورة - زمردي)" },
    { key: "lamet-zaman-bg-cyan", nameEn: "Theme 26 (Lamet Zaman BG - Cyan)", nameAr: "ثيم 26 (لمة زمان مع خلفية صورة - سماوي)" },
    { key: "lamet-zaman-bg-sky", nameEn: "Theme 26 (Lamet Zaman BG - Sky)", nameAr: "ثيم 26 (لمة زمان مع خلفية صورة - أزرق sky)" },
    { key: "lamet-zaman-bg-purple", nameEn: "Theme 26 (Lamet Zaman BG - Purple)", nameAr: "ثيم 26 (لمة زمان مع خلفية صورة - بنفسجي)" },
    { key: "lamet-zaman-bg-gold", nameEn: "Theme 26 (Lamet Zaman BG - Gold)", nameAr: "ثيم 26 (لمة زمان مع خلفية صورة - ذهبي)" },
    { key: "lamet-zaman-bg-pink", nameEn: "Theme 26 (Lamet Zaman BG - Pink)", nameAr: "ثيم 26 (لمة زمان مع خلفية صورة - وردي)" },
    { key: "lamet-zaman-bg-dark", nameEn: "Theme 26 (Lamet Zaman BG - Dark)", nameAr: "ثيم 26 (لمة زمان مع خلفية صورة - داكن)" }
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
