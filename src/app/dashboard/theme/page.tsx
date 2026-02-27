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
        id: "theme8",
        name_ar: "إكسترا مينيو (برتقالي عصري)",
        name_en: "XtraMenu (Modern Orange)",
        description_ar: "تصميم عصري بلون برتقالي مع بار تنقل سفلي، شبكة عرض بطاقات، بحث متقدم، وسايد بار اجتماعي.",
        description_en: "Modern orange theme with bottom nav bar, grid card display, advanced search, and social sidebar.",
        preview_color: "#f97316", // Orange
    }
];

export default function ThemePage() {
    const { language } = useLanguage();
    const isArabic = language === "ar";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState("");
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: restaurant, error } = await supabase
                    .from('restaurants')
                    .select('id, theme')
                    .eq('email', user.email)
                    .single();

                if (error) throw error;

                if (restaurant) {
                    setRestaurantId(restaurant.id);
                    setSelectedTheme(restaurant.theme || "pizzapasta");
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
        <div className="p-6 max-w-4xl mx-auto space-y-8" dir={isArabic ? "rtl" : "ltr"}>
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
                    className="flex items-center gap-2 bg-blue hover:bg-blue-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue/20"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isArabic ? "حفظ التغييرات" : "Save Changes"}
                </button>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl text-center font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                >
                    {message.text}
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {THEMES.map((theme) => (
                    <div
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`relative cursor-pointer group rounded-3xl border-2 transition-all p-5 overflow-hidden
                            ${selectedTheme === theme.id
                                ? 'border-blue bg-blue/5'
                                : 'border-card bg-card hover:border-silver/30'}`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-foreground">
                                    {isArabic ? theme.name_ar : theme.name_en}
                                </h3>
                                <p className="text-silver text-xs leading-relaxed max-w-[200px]">
                                    {isArabic ? theme.description_ar : theme.description_en}
                                </p>
                            </div>
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                                style={{ backgroundColor: theme.preview_color + '20' }}
                            >
                                {selectedTheme === theme.id ? (
                                    <Check className="w-6 h-6 text-blue" />
                                ) : (
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.preview_color }} />
                                )}
                            </div>
                        </div>

                        {/* Visual Preview Placeholder */}
                        <div className="w-full aspect-[16/9] rounded-2xl bg-background/50 border border-white/5 p-4 flex flex-col gap-2">
                            <div className="w-1/3 h-2 rounded-full opacity-20" style={{ backgroundColor: theme.preview_color }} />
                            <div className="w-full h-8 rounded-xl opacity-10" style={{ backgroundColor: theme.preview_color }} />
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                <div className="h-20 rounded-xl opacity-10" style={{ backgroundColor: theme.preview_color }} />
                                <div className="h-20 rounded-xl opacity-10" style={{ backgroundColor: theme.preview_color }} />
                            </div>
                        </div>

                        {selectedTheme === theme.id && (
                            <div className="absolute top-0 right-0 p-3">
                                <span className="bg-blue text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
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
                        {isArabic ? "معاينة المنيو" : "Preview Menu"}
                    </h4>
                    <p className="text-silver text-xs">
                        {isArabic ? "افتح المنيو في نافذة جديدة لرؤية التغييرات فوراً." : "Open the menu in a new window to see changes immediately."}
                    </p>
                </div>
                <a
                    href={restaurantId ? `/menu/${restaurantId}` : "#"}
                    target="_blank"
                    className="flex items-center gap-2 text-blue font-bold hover:underline"
                >
                    {isArabic ? "معاينة مباشرة" : "Live Preview"}
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </div>
    );
}
