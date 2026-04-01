"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { Palette, Check, Save, Loader2, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";

const THEMES = [
    {
        id: "pizzapasta",
        name_ar: "بيتزا باستا (ديناميكية)",
        name_en: "Pizza Pasta (Dynamic)",
        description_ar: "تصميم عصري بخلفية داكنة، يدعم تغيير الألوان والخطوط.",
        description_en: "Modern dark design, supports custom colors and fonts.",
        preview_color: "#3b82f6", // Blue
    },
    {
        id: "atyab-oriental",
        name_ar: "أطياب مودرن (أورينتال)",
        name_en: "Atyab Modern (Oriental)",
        description_ar: "تصميم احترافي عالي التباين، بلمسات ذهبية وتأثيرات زجاجية وأنيميشن.",
        description_en: "High-contrast professional design with gold accents and glassmorphism.",
        preview_color: "#eab308", // Gold/Yellow
    },
    {
        id: "bab-alhara",
        name_ar: "باب الحارة (سوري كلاسيك)",
        name_en: "Bab Al-Hara (Syrian Classic)",
        description_ar: "تصميم كلاسيكي بطابع سوري، بانر خلفية كبير، بطاقات صور بشبكة، وتنقل دائري.",
        description_en: "Classic Syrian-style design with hero banner, grid cards with images, and circular nav.",
        preview_color: "#e31e24", // Red
    },
    {
        id: "atyab-etoile",
        name_ar: "أطياب إتوال (إيكومرس)",
        name_en: "Atyab Etoile (E-commerce)",
        description_ar: "تصميم أنيق بلمسات ذهبية، شريط أخبار متحرك، بانر سلايدر، بطاقات صور متجر، وشريط تنقل زجاجي.",
        description_en: "Elegant gold-accented design with marquee bar, banner slider, e-commerce grid cards, and glass bottom nav.",
        preview_color: "#B89038", // Gold
    },
    {
        id: "theme5",
        name_ar: "ثيم 5 المتميز",
        name_en: "Premium Theme 5",
        description_ar: "تصميم مميز جديد بخاصية تقسيم العناصر وسلة تسوق متطورة.",
        description_en: "New premium design with item categories and advanced shopping cart.",
        preview_color: "#ea580c", // Orange
    },
    {
        id: "theme6",
        name_ar: "فراندة (لون تيل)",
        name_en: "Veranda (Teal Theme)",
        description_ar: "تصميم عصري باللون التيل، مع لوجو متوسط وأيقونات تواصل سريعة وشريط سلة عائم.",
        description_en: "Modern teal design with centered logo, quick contact icons, and a floating cart bar.",
        preview_color: "#40a798", // Teal
    },
    {
        id: "theme7",
        name_ar: "حليم (ثيم داكن ذهبي)",
        name_en: "Haleem (Dark Gold Theme)",
        description_ar: "تصميم داكن فاخر بلمسات ذهبية، تنقل مزدوج بتابات نصية ودوائر صور، بطاقات أصناف بتصميم عصري.",
        description_en: "Premium dark theme with gold accents, dual navigation (text tabs + circular images), and modern item cards.",
        preview_color: "#c9a84c", // Gold
    },

    {
        id: "theme9",
        name_ar: "ديابلو (أحمر عصري)",
        name_en: "Diablo (Red Modern)",
        description_ar: "تصميم عصري باللون الأحمر وتأثيرات حيوية مع سلة منزلقة وقائمة متقدمة.",
        description_en: "Modern red design with vibrant effects, slide-in cart, and advanced menu drawer.",
        preview_color: "#e74c3c", // Diablo Red
    },
    {
        id: "theme10",
        name_ar: "الوهج البرتقالي (ثيم 10)",
        name_en: "Orange Glow (Theme 10)",
        description_ar: "تصميم مشرق باللون البرتقالي مع تمرير أفقي للأقسام وسلة جانبية سلسة.",
        description_en: "Bright orange design with scrollable categories and a smooth side-sliding cart.",
        preview_color: "#ea580c", // Orange Glow
    },
    {
        id: "theme11",
        name_ar: "عصري أفقي (لوكس 11)",
        name_en: "Horizontal Modern (Luxe 11)",
        description_ar: "تصميم حديث (Luxe) يعتمد على عرض الأصناف والأحجام المختلفة بشكل أفقي أنيق ومريح للعين.",
        description_en: "Modern Luxe design displaying multiple sizes and horizontal item layouts for high readability.",
        preview_color: "#e54750", // Luxe Red
    },
    {
        id: "theme12",
        name_ar: "العام الجديد (ثيم 12)",
        name_en: "New Year (Theme 12)",
        description_ar: "تصميم عصري بأنيميشن RGB، سلايدر مميز، وأقسام دائرية قابلة للتمرير مع قائمة سلة فريدة.",
        description_en: "Modern design with RGB animations, a unique slider, scrollable circular categories, and a distinct cart menu.",
        preview_color: "#6c63ff", // Purple
    },
    {
        id: "theme13",
        name_ar: "لوكس الذهبي (ثيم 13)",
        name_en: "Luxe Gold (Theme 13)",
        description_ar: "تصميم فاخر بلمسات ذهبية، صور متحركة، وطريقة عرض جذابة للمنتجات.",
        description_en: "Luxurious design with gold touches, animated images, and attractive product display.",
        preview_color: "#d4af37", // Gold
    },
    {
        id: "theme16",
        name_ar: "كلاسيك أحمر (ثيم 16)",
        name_en: "Classic Red (Theme 16)",
        description_ar: "تصميم أنيق بلون أحمر جذاب، واجهة نظيفة مع دعم ممتاز لعرض الإضافات والسلال.",
        description_en: "Elegant red design, clean interface with excellent support for extras and cart.",
        preview_color: "#af0a13", // Crimson
    },
    // ===== PizzaPasta Color Variations =====
    { id: "pizzapasta-cyan", name_ar: "PizzaPasta (Cyan)", name_en: "PizzaPasta (Cyan)", description_ar: "نفس التصميم PizzaPasta بلون Cyan", description_en: "PizzaPasta design with Cyan color", preview_color: "#0891b2" },
    { id: "pizzapasta-emerald", name_ar: "PizzaPasta (Emerald)", name_en: "PizzaPasta (Emerald)", description_ar: "نفس التصميم PizzaPasta بلون Emerald", description_en: "PizzaPasta design with Emerald color", preview_color: "#059669" },
    { id: "pizzapasta-sky", name_ar: "PizzaPasta (Sky)", name_en: "PizzaPasta (Sky)", description_ar: "نفس التصميم PizzaPasta بلون Sky", description_en: "PizzaPasta design with Sky color", preview_color: "#0284c7" },
    // ===== AtyabOriental Color Variations =====
    { id: "atyab-oriental-cyan", name_ar: "أطياب أورينتال (Cyan)", name_en: "AtyabOriental (Cyan)", description_ar: "نفس التصميم أطياب أورينتال بلون Cyan", description_en: "AtyabOriental design with Cyan color", preview_color: "#0891b2" },
    { id: "atyab-oriental-emerald", name_ar: "أطياب أورينتال (Emerald)", name_en: "AtyabOriental (Emerald)", description_ar: "نفس التصميم أطياب أورينتال بلون Emerald", description_en: "AtyabOriental design with Emerald color", preview_color: "#059669" },
    { id: "atyab-oriental-sky", name_ar: "أطياب أورينتال (Sky)", name_en: "AtyabOriental (Sky)", description_ar: "نفس التصميم أطياب أورينتال بلون Sky", description_en: "AtyabOriental design with Sky color", preview_color: "#0284c7" },
    // ===== BabAlHara Color Variations =====
    { id: "bab-alhara-cyan", name_ar: "باب الحارة (Cyan)", name_en: "BabAlHara (Cyan)", description_ar: "نفس التصميم باب الحارة بلون Cyan", description_en: "BabAlHara design with Cyan color", preview_color: "#0891b2" },
    { id: "bab-alhara-emerald", name_ar: "باب الحارة (Emerald)", name_en: "BabAlHara (Emerald)", description_ar: "نفس التصميم باب الحارة بلون Emerald", description_en: "BabAlHara design with Emerald color", preview_color: "#059669" },
    { id: "bab-alhara-sky", name_ar: "باب الحارة (Sky)", name_en: "BabAlHara (Sky)", description_ar: "نفس التصميم باب الحارة بلون Sky", description_en: "BabAlHara design with Sky color", preview_color: "#0284c7" },
    // ===== AtyabEtoile Color Variations =====
    { id: "atyab-etoile-cyan", name_ar: "أطياب إتوال (Cyan)", name_en: "AtyabEtoile (Cyan)", description_ar: "نفس التصميم أطياب إتوال بلون Cyan", description_en: "AtyabEtoile design with Cyan color", preview_color: "#0891b2" },
    { id: "atyab-etoile-emerald", name_ar: "أطياب إتوال (Emerald)", name_en: "AtyabEtoile (Emerald)", description_ar: "نفس التصميم أطياب إتوال بلون Emerald", description_en: "AtyabEtoile design with Emerald color", preview_color: "#059669" },
    { id: "atyab-etoile-sky", name_ar: "أطياب إتوال (Sky)", name_en: "AtyabEtoile (Sky)", description_ar: "نفس التصميم أطياب إتوال بلون Sky", description_en: "AtyabEtoile design with Sky color", preview_color: "#0284c7" },
    // ===== Theme 5-15 Color Variations =====
    { id: "theme5-cyan", name_ar: "ثيم 5 (Cyan)", name_en: "Theme5 (Cyan)", description_ar: "نفس التصميم ثيم 5 بلون Cyan", description_en: "Theme5 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme5-emerald", name_ar: "ثيم 5 (Emerald)", name_en: "Theme5 (Emerald)", description_ar: "نفس التصميم ثيم 5 بلون Emerald", description_en: "Theme5 design with Emerald color", preview_color: "#059669" },
    { id: "theme5-sky", name_ar: "ثيم 5 (Sky)", name_en: "Theme5 (Sky)", description_ar: "نفس التصميم ثيم 5 بلون Sky", description_en: "Theme5 design with Sky color", preview_color: "#0284c7" },
    { id: "theme6-cyan", name_ar: "ثيم 6 (Cyan)", name_en: "Theme6 (Cyan)", description_ar: "نفس التصميم ثيم 6 بلون Cyan", description_en: "Theme6 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme6-emerald", name_ar: "ثيم 6 (Emerald)", name_en: "Theme6 (Emerald)", description_ar: "نفس التصميم ثيم 6 بلون Emerald", description_en: "Theme6 design with Emerald color", preview_color: "#059669" },
    { id: "theme6-sky", name_ar: "ثيم 6 (Sky)", name_en: "Theme6 (Sky)", description_ar: "نفس التصميم ثيم 6 بلون Sky", description_en: "Theme6 design with Sky color", preview_color: "#0284c7" },
    { id: "theme7-cyan", name_ar: "ثيم 7 (Cyan)", name_en: "Theme7 (Cyan)", description_ar: "نفس التصميم ثيم 7 بلون Cyan", description_en: "Theme7 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme7-emerald", name_ar: "ثيم 7 (Emerald)", name_en: "Theme7 (Emerald)", description_ar: "نفس التصميم ثيم 7 بلون Emerald", description_en: "Theme7 design with Emerald color", preview_color: "#059669" },
    { id: "theme7-sky", name_ar: "ثيم 7 (Sky)", name_en: "Theme7 (Sky)", description_ar: "نفس التصميم ثيم 7 بلون Sky", description_en: "Theme7 design with Sky color", preview_color: "#0284c7" },
    { id: "theme9-cyan", name_ar: "ثيم 9 (Cyan)", name_en: "Theme9 (Cyan)", description_ar: "نفس التصميم ثيم 9 بلون Cyan", description_en: "Theme9 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme9-emerald", name_ar: "ثيم 9 (Emerald)", name_en: "Theme9 (Emerald)", description_ar: "نفس التصميم ثيم 9 بلون Emerald", description_en: "Theme9 design with Emerald color", preview_color: "#059669" },
    { id: "theme9-sky", name_ar: "ثيم 9 (Sky)", name_en: "Theme9 (Sky)", description_ar: "نفس التصميم ثيم 9 بلون Sky", description_en: "Theme9 design with Sky color", preview_color: "#0284c7" },
    { id: "theme10-cyan", name_ar: "ثيم 10 (Cyan)", name_en: "Theme10 (Cyan)", description_ar: "نفس التصميم ثيم 10 بلون Cyan", description_en: "Theme10 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme10-emerald", name_ar: "ثيم 10 (Emerald)", name_en: "Theme10 (Emerald)", description_ar: "نفس التصميم ثيم 10 بلون Emerald", description_en: "Theme10 design with Emerald color", preview_color: "#059669" },
    { id: "theme10-sky", name_ar: "ثيم 10 (Sky)", name_en: "Theme10 (Sky)", description_ar: "نفس التصميم ثيم 10 بلون Sky", description_en: "Theme10 design with Sky color", preview_color: "#0284c7" },
    { id: "theme11-cyan", name_ar: "ثيم 11 (Cyan)", name_en: "Theme11 (Cyan)", description_ar: "نفس التصميم ثيم 11 بلون Cyan", description_en: "Theme11 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme11-emerald", name_ar: "ثيم 11 (Emerald)", name_en: "Theme11 (Emerald)", description_ar: "نفس التصميم ثيم 11 بلون Emerald", description_en: "Theme11 design with Emerald color", preview_color: "#059669" },
    { id: "theme11-sky", name_ar: "ثيم 11 (Sky)", name_en: "Theme11 (Sky)", description_ar: "نفس التصميم ثيم 11 بلون Sky", description_en: "Theme11 design with Sky color", preview_color: "#0284c7" },
    { id: "theme13-cyan", name_ar: "ثيم 13 (Cyan)", name_en: "Theme13 (Cyan)", description_ar: "نفس التصميم ثيم 13 بلون Cyan", description_en: "Theme13 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme13-emerald", name_ar: "ثيم 13 (Emerald)", name_en: "Theme13 (Emerald)", description_ar: "نفس التصميم ثيم 13 بلون Emerald", description_en: "Theme13 design with Emerald color", preview_color: "#059669" },
    { id: "theme13-sky", name_ar: "ثيم 13 (Sky)", name_en: "Theme13 (Sky)", description_ar: "نفس التصميم ثيم 13 بلون Sky", description_en: "Theme13 design with Sky color", preview_color: "#0284c7" },
    { id: "theme15-sky", name_ar: "ثيم 15 (Sky)", name_en: "Theme15 (Sky)", description_ar: "نفس التصميم ثيم 15 بلون Sky", description_en: "Theme15 design with Sky color", preview_color: "#0284c7" },
];

const DEFAULT_COLORS = {
    primary: '#af0a13',
    secondary: '#9b0000',
    background: '#f8f9fa',
    text: '#333333'
};

export default function ThemePage() {
    const { language } = useLanguage();
    const isArabic = language === "ar";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState("");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_themeColors, setThemeColors] = useState({ ...DEFAULT_COLORS });
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: restaurant, error } = await supabase
                    .from('restaurants')
                    .select('id, theme, theme_colors, slug')
                    .eq(typeof window !== "undefined" && sessionStorage.getItem('impersonating_tenant') ? 'id' : 'email', typeof window !== "undefined" && sessionStorage.getItem('impersonating_tenant') ? sessionStorage.getItem('impersonating_tenant') : user.email)
                    .single();

                // If error (e.g. theme_colors column doesn't exist yet), try without it
                if (error) {
                    const { data: restaurant2 } = await supabase
                        .from('restaurants')
                        .select('id, theme, slug')
                        .eq(typeof window !== "undefined" && sessionStorage.getItem('impersonating_tenant') ? 'id' : 'email', typeof window !== "undefined" && sessionStorage.getItem('impersonating_tenant') ? sessionStorage.getItem('impersonating_tenant') : user.email)
                        .single();
                    if (restaurant2) {
                        setRestaurantId(restaurant2.id);
                        (window as any).rSlug = restaurant2.slug;
                        setSelectedTheme(restaurant2.theme || "pizzapasta");
                    }
                } else if (restaurant) {
                    setRestaurantId(restaurant.id);
                    (window as any).rSlug = restaurant.slug;
                    setSelectedTheme(restaurant.theme || "pizzapasta");
                    if (restaurant.theme_colors) {
                        setThemeColors(prev => ({ ...prev, ...restaurant.theme_colors }));
                    }
                }
            } catch (err) {
                console.error("Error fetching theme:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSave = async () => {
        if (!restaurantId) return;

        setSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('restaurants')
                .update({ theme: selectedTheme })
                .eq('id', restaurantId);

            if (error) throw error;

            setMessage({
                type: 'success',
                text: isArabic ? "تم حفظ التغييرات بنجاح!" : "Changes saved successfully!"
            });

            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error("Error saving theme:", err);
            setMessage({
                type: 'error',
                text: isArabic ? "حدث خطأ أثناء الحفظ." : "Error occurred while saving."
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 w-full mx-auto space-y-8" dir={isArabic ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue/10 rounded-2xl flex items-center justify-center">
                        <Palette className="w-6 h-6 text-blue" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {isArabic ? "اختر مظهر المنيو" : "Choose Menu Theme"}
                        </h1>
                        <p className="text-silver text-sm">
                            {isArabic ? "اختر التصميم الذي يظهر لعملائك عند فتح المنيو." : "Select the design your customers see when they open the menu."}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue hover:bg-blue-hover disabled:opacity-50 text-slate-900 dark:text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue/20"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isArabic ? "حفظ التغييرات" : "Save Changes"}
                </button>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl text-center font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-50 dark:bg-red-500/10 text-red-500'}`}
                >
                    {message.text}
                </motion.div>
            )}

            <div className="lg:grid lg:grid-cols-12 lg:gap-8 flex flex-col-reverse">

                {/* Left Column (Settings and Themes) */}
                <div className="col-span-12 lg:col-span-7 space-y-8">


                    <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
                        {THEMES.map((theme) => (
                            <div
                                key={theme.id}
                                onClick={() => setSelectedTheme(theme.id)}
                                className={`relative cursor-pointer group rounded-lg border transition-all p-2 overflow-hidden
                                    ${selectedTheme === theme.id
                                        ? 'border-blue bg-blue/5'
                                        : 'border-card bg-card hover:border-silver/30'}`}
                            >
                                <div className="flex items-start justify-between mb-1.5">
                                    <div className="space-y-0 text-[10px]">
                                        <h3 className="font-bold text-foreground line-clamp-1 scale-95 origin-left">
                                            {isArabic ? theme.name_ar : theme.name_en}
                                        </h3>
                                    </div>
                                    <div
                                        className="w-4 h-4 rounded-full flex items-center justify-center transition-all shrink-0"
                                        style={{ backgroundColor: theme.preview_color + '20' }}
                                    >
                                        {selectedTheme === theme.id ? (
                                            <Check className="w-2.5 h-2.5 text-blue" />
                                        ) : (
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.preview_color }} />
                                        )}
                                    </div>
                                </div>

                                {/* Visual Preview Placeholder */}
                                <div className="w-full aspect-square rounded bg-background/50 border border-white/5 p-1.5 flex flex-col gap-0.5">
                                    <div className="w-1/2 h-0.5 rounded-full opacity-20" style={{ backgroundColor: theme.preview_color }} />
                                    <div className="w-full h-3 rounded opacity-10" style={{ backgroundColor: theme.preview_color }} />
                                    <div className="grid grid-cols-2 gap-0.5 mt-auto">
                                        <div className="h-8 rounded opacity-10" style={{ backgroundColor: theme.preview_color }} />
                                        <div className="h-8 rounded opacity-10" style={{ backgroundColor: theme.preview_color }} />
                                    </div>
                                </div>

                                {selectedTheme === theme.id && (
                                    <div className="absolute top-0 right-0 p-3">
                                        <span className="bg-blue text-slate-900 dark:text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
                                            {isArabic ? "مفعل" : "Active"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue/5 border border-blue/10 p-6 rounded-[2rem] flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="font-bold text-foreground">
                                {isArabic ? "رابط المنيو العام" : "Public Menu Link"}
                            </h4>
                            <p className="text-silver text-xs">
                                {isArabic ? "افتح المنيو في نافذة جديدة." : "Open the menu in a new window."}
                            </p>
                        </div>
                        <a
                            href={restaurantId ? ((window as any).rSlug ? `https://${(window as any).rSlug}.asntechnology.net` : `/menu/${restaurantId}`) : "#"}
                            target="_blank"
                            className="flex items-center gap-2 text-blue font-bold hover:underline text-base"
                        >
                            {isArabic ? "فتح المنيو" : "Open Menu"}
                            <ExternalLink className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                {/* Right Column (Live Preview Iframe Simulator) */}
                <div className="col-span-12 lg:col-span-5 hidden lg:block">
                    <div className="sticky top-[90px]">
                        <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-[3rem] p-4 shadow-xl flex flex-col items-center w-max mx-auto">
                            <div className="w-full flex justify-between items-center mb-5 px-3">
                                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                                    <span className="flex h-3 w-3 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    {isArabic ? "معاينة حية" : "Live Preview"}
                                </h3>
                                <p className="text-xs text-silver font-medium">
                                    {isArabic ? "تحديث تلقائي" : "Auto-updating"}
                                </p>
                            </div>

                            <div className="w-[414px] h-[850px] border-[10px] border-slate-900 dark:border-slate-800 rounded-[3rem] overflow-hidden bg-white dark:bg-black relative shadow-2xl">
                                {/* Phone Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[24px] bg-slate-900 dark:border-slate-800 rounded-b-2xl z-20"></div>

                                {restaurantId ? (
                                    <iframe
                                        src={`/menu/${restaurantId}?preview_theme=${selectedTheme}`}
                                        className="w-full h-full border-0 absolute inset-0"
                                        sandbox="allow-scripts allow-same-origin"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-silver" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
