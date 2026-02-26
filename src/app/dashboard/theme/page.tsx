"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Palette, CheckCircle2, Save, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const themeOptions = [
    { id: 'dark', nameAr: 'ليلي أنيق', nameEn: 'Elegant Dark', bgClass: 'bg-black', textClass: 'text-white' },
    { id: 'light', nameAr: 'نهاري ساطع', nameEn: 'Bright Light', bgClass: 'bg-white', textClass: 'text-slate-900' },
    { id: 'wood', nameAr: 'خشبي دافئ', nameEn: 'Warm Wood', bgClass: 'bg-amber-900', textClass: 'text-amber-50' },
    { id: 'blue', nameAr: 'أزرق هادئ', nameEn: 'Calm Blue', bgClass: 'bg-slate-900', textClass: 'text-blue-50' },
    { id: 'pizzapasta', nameAr: 'بيتزا باستا (ديناميكي)', nameEn: 'PizzaPasta (Dynamic)', bgClass: 'bg-[#111111]', textClass: 'text-brandYellow' },
];

type ThemeColors = {
    primary: string;
    secondary: string;
    background: string;
    card_bg: string;
    text_color: string;
    accent: string;
};

const defaultColors: Record<string, ThemeColors> = {
    dark: { primary: '#2ea3ff', secondary: '#06b6d4', background: '#050505', card_bg: '#111827', text_color: '#ffffff', accent: '#f59e0b' },
    light: { primary: '#2563eb', secondary: '#0891b2', background: '#f8fafc', card_bg: '#ffffff', text_color: '#0f172a', accent: '#f59e0b' },
    wood: { primary: '#d97706', secondary: '#92400e', background: '#451a03', card_bg: '#78350f', text_color: '#fffbeb', accent: '#fbbf24' },
    blue: { primary: '#3b82f6', secondary: '#06b6d4', background: '#0f172a', card_bg: '#1e293b', text_color: '#f1f5f9', accent: '#f59e0b' },
    pizzapasta: { primary: '#e11d48', secondary: '#be123c', background: '#050505', card_bg: '#18181b', text_color: '#fafafa', accent: '#facc15' },
};

const colorLabels: Record<string, { ar: string; en: string }> = {
    primary: { ar: 'اللون الأساسي', en: 'Primary Color' },
    secondary: { ar: 'اللون الثانوي', en: 'Secondary Color' },
    background: { ar: 'لون الخلفية', en: 'Background' },
    card_bg: { ar: 'خلفية الكروت', en: 'Card Background' },
    text_color: { ar: 'لون النص', en: 'Text Color' },
    accent: { ar: 'لون التمييز', en: 'Accent Color' },
};

export default function ThemePage() {
    const { language } = useLanguage();
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [activeTheme, setActiveTheme] = useState<string>('dark');
    const [customColors, setCustomColors] = useState<ThemeColors>(defaultColors.dark);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showColors, setShowColors] = useState(false);

    useEffect(() => {
        const fetchRestData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('restaurants')
                .select('id, theme, theme_colors')
                .eq('email', user.email)
                .single();

            if (data) {
                setRestaurantId(data.id);
                if (data.theme) setActiveTheme(data.theme);
                if (data.theme_colors) {
                    setCustomColors(data.theme_colors);
                } else {
                    setCustomColors(defaultColors[data.theme || 'dark'] || defaultColors.dark);
                }
            }
            setLoading(false);
        };
        fetchRestData();
    }, []);

    const handleThemeSave = async (themeId: string) => {
        if (!restaurantId) return;
        setActiveTheme(themeId);
        const colors = defaultColors[themeId] || defaultColors.dark;
        setCustomColors(colors);
        try {
            await supabase
                .from('restaurants')
                .update({ theme: themeId, theme_colors: colors })
                .eq('id', restaurantId);
        } catch (e) { console.error(e); }
    };

    const handleColorChange = (key: string, value: string) => {
        setCustomColors(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveColors = async () => {
        if (!restaurantId) return;
        setSaving(true);
        try {
            await supabase.from('restaurants').update({ theme_colors: customColors }).eq('id', restaurantId);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const handleResetColors = () => {
        setCustomColors(defaultColors[activeTheme] || defaultColors.dark);
    };

    if (loading) return <div className="p-8 text-center text-silver animate-pulse">{language === "ar" ? "جاري تحميل الإعدادات..." : "Loading Settings..."}</div>;

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
            <div className="flex flex-col border-b border-glass-border pb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2 flex items-center gap-3">
                    <Palette className="w-8 h-8 text-blue" />
                    {language === "ar" ? "تخصيص المظهر" : "Theme & Customization"}
                </h1>
                <p className="text-silver">
                    {language === "ar" ? "اختر التصميم والألوان المناسبة لهوية مطعمك." : "Choose the design and colors that match your restaurant's brand."}
                </p>
            </div>

            {/* Theme Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                {themeOptions.map((theme) => {
                    const isActive = activeTheme === theme.id;
                    return (
                        <div
                            key={theme.id}
                            onClick={() => handleThemeSave(theme.id)}
                            className={`relative cursor-pointer group rounded-2xl overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-blue shadow-[0_0_20px_rgba(46,163,255,0.3)]' : 'border-glass-border hover:border-blue/50'}`}
                        >
                            <div className={`h-40 w-full p-4 flex flex-col gap-3 ${theme.bgClass} relative`}>
                                <div className="w-24 h-4 rounded-full bg-white/20 dark:bg-black/20 mx-auto mb-2"></div>
                                <div className="w-full flex justify-between items-center bg-white/10 dark:bg-black/10 p-2 rounded-lg">
                                    <div className="h-10 w-10 bg-white/20 dark:bg-black/20 rounded-md"></div>
                                    <div className="w-10 h-3 bg-white/20 dark:bg-black/20 rounded-full"></div>
                                </div>
                                <div className="w-full flex justify-between items-center bg-white/10 dark:bg-black/10 p-2 rounded-lg">
                                    <div className="h-10 w-10 bg-white/20 dark:bg-black/20 rounded-md"></div>
                                    <div className="w-10 h-3 bg-white/20 dark:bg-black/20 rounded-full"></div>
                                </div>
                                {isActive && (
                                    <div className="absolute inset-0 bg-blue/10 backdrop-blur-[1px] flex items-center justify-center">
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-blue text-white p-3 rounded-full shadow-lg">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </motion.div>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white dark:bg-glass-dark p-4 border-t border-glass-border flex justify-between items-center">
                                <h3 className="font-bold text-foreground">{language === "ar" ? theme.nameAr : theme.nameEn}</h3>
                                {isActive && <span className="text-xs font-bold text-blue px-2 py-1 bg-blue/10 rounded-md">{language === "ar" ? "مفعل" : "Active"}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Color Customization */}
            <div className="mt-8">
                <button onClick={() => setShowColors(!showColors)}
                    className="w-full flex items-center justify-between bg-white dark:bg-[#080d20] border border-glass-border rounded-2xl px-6 py-4 hover:border-blue/50 transition-all group">
                    <div>
                        <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                            🎨 {language === "ar" ? "تخصيص الألوان" : "Customize Colors"}
                        </h3>
                        <p className="text-silver text-sm">{language === "ar" ? "عدّل ألوان المنيو حسب هوية مطعمك" : "Adjust menu colors to match your brand"}</p>
                    </div>
                    <span className={`text-silver transition-transform ${showColors ? 'rotate-180' : ''}`}>▼</span>
                </button>

                <AnimatePresence>
                    {showColors && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                            className="overflow-hidden">
                            <div className="bg-white dark:bg-[#080d20] border border-t-0 border-glass-border rounded-b-2xl px-6 py-6 space-y-6">
                                {/* Color Preview Bar */}
                                <div className="flex items-center gap-1 h-8 rounded-xl overflow-hidden shadow-inner border border-glass-border">
                                    {Object.entries(customColors).map(([key, color]) => (
                                        <div key={key} className="flex-1 h-full relative group cursor-pointer" style={{ backgroundColor: color }}
                                            title={colorLabels[key]?.[language === 'ar' ? 'ar' : 'en'] || key}>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                                                <span className="text-[8px] text-white font-bold uppercase">{key.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Color Pickers */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {Object.entries(customColors).map(([key, color]) => (
                                        <div key={key} className="space-y-2 bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-glass-border">
                                            <label className="text-[10px] font-bold text-silver uppercase block">
                                                {colorLabels[key]?.[language === 'ar' ? 'ar' : 'en'] || key}
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={color} onChange={e => handleColorChange(key, e.target.value)}
                                                    className="w-10 h-10 rounded-lg border-2 border-glass-border cursor-pointer" style={{ padding: 0 }} />
                                                <input type="text" value={color} onChange={e => handleColorChange(key, e.target.value)}
                                                    className="flex-1 px-2 py-1.5 rounded-lg bg-white dark:bg-black/30 border border-glass-border text-xs font-mono font-bold tracking-wider uppercase focus:border-blue outline-none" dir="ltr" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-glass-border">
                                    <button onClick={handleSaveColors} disabled={saving}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-95">
                                        <Save className="w-4 h-4" />
                                        {saving ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ الألوان" : "Save Colors")}
                                    </button>
                                    <button onClick={handleResetColors}
                                        className="flex items-center gap-2 px-4 py-3 text-silver font-bold text-sm hover:text-foreground transition">
                                        <RotateCcw className="w-4 h-4" />
                                        {language === "ar" ? "استعادة الافتراضي" : "Reset to Default"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
