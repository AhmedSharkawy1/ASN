"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Palette, CheckCircle2, Save, RotateCcw, MonitorSmartphone } from "lucide-react";
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
    const [showColors, setShowColors] = useState(true);

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

    // Send Live Preview updates to the iframe
    useEffect(() => {
        const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'UPDATE_THEME_COLORS', colors: customColors }, '*');
        }
    }, [customColors]);

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

    const isArabic = language === "ar";

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] overflow-hidden gap-6 p-2 lg:p-6" dir={isArabic ? "rtl" : "ltr"}>

            {/* LEFT PANE: CONTROLS */}
            <div className="w-full lg:w-1/2 flex flex-col overflow-y-auto pr-2 pb-20 custom-scrollbar space-y-8">
                <div className="flex flex-col border-b border-glass-border pb-4 shrink-0">
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2 flex items-center gap-3">
                        <Palette className="w-8 h-8 text-blue" />
                        {isArabic ? "مُعدّل المظهر المباشر" : "Live Theme Customizer"}
                    </h1>
                    <p className="text-silver">
                        {isArabic ? "عدّل الألوان وشاهد النتيجة فوراً على المنيو بتاعك قبل نشرها." : "Edit colors and see the results instantly on your menu before publishing."}
                    </p>
                </div>

                {/* Theme Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {themeOptions.map((theme) => {
                        const isActive = activeTheme === theme.id;
                        return (
                            <div
                                key={theme.id}
                                onClick={() => handleThemeSave(theme.id)}
                                className={`relative cursor-pointer group rounded-2xl overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-blue shadow-[0_0_20px_rgba(46,163,255,0.3)]' : 'border-glass-border hover:border-blue/50'}`}
                            >
                                <div className={`h-24 w-full p-3 flex flex-col gap-2 ${theme.bgClass} relative`}>
                                    <div className="w-16 h-2 rounded-full bg-white/20 dark:bg-black/20 mx-auto"></div>
                                    <div className="w-full flex justify-between items-center bg-white/10 dark:bg-black/10 p-1.5 rounded-lg">
                                        <div className="h-6 w-6 bg-white/20 dark:bg-black/20 rounded-md"></div>
                                        <div className="w-8 h-2 bg-white/20 dark:bg-black/20 rounded-full"></div>
                                    </div>
                                    {isActive && (
                                        <div className="absolute inset-0 bg-blue/10 backdrop-blur-[1px] flex items-center justify-center">
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-blue text-white p-2 rounded-full shadow-lg">
                                                <CheckCircle2 className="w-6 h-6" />
                                            </motion.div>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white dark:bg-glass-dark p-3 flex justify-between items-center text-sm">
                                    <h3 className="font-bold text-foreground">{isArabic ? theme.nameAr : theme.nameEn}</h3>
                                    {isActive && <span className="text-[10px] font-bold text-blue px-2 py-1 bg-blue/10 rounded-md">{isArabic ? "مفعل" : "Active"}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Color Customization */}
                <div className="flex-1">
                    <button onClick={() => setShowColors(!showColors)}
                        className="w-full flex items-center justify-between bg-white dark:bg-glass-dark border border-glass-border rounded-t-2xl px-6 py-4 transition-all">
                        <div>
                            <h3 className="font-bold text-foreground flex items-center gap-2">
                                🎨 {isArabic ? "تخصيص الألوان" : "Customize Colors"}
                            </h3>
                        </div>
                        <span className={`text-silver transition-transform duration-300 ${showColors ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    <AnimatePresence>
                        {showColors && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="bg-white dark:bg-glass-dark border border-t-0 border-glass-border rounded-b-2xl px-6 py-6 space-y-6">

                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(customColors).map(([key, color]) => (
                                            <div key={key} className="space-y-1.5 p-3 rounded-xl border border-glass-border bg-slate-50 dark:bg-black/20">
                                                <label className="text-[10px] font-bold text-silver uppercase block">
                                                    {colorLabels[key]?.[isArabic ? 'ar' : 'en'] || key}
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-glass-border cursor-pointer shadow-sm shrink-0">
                                                        <input type="color" value={color} onChange={e => handleColorChange(key, e.target.value)}
                                                            className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer" />
                                                    </div>
                                                    <input type="text" value={color} onChange={e => handleColorChange(key, e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-black/40 border border-glass-border text-xs font-mono font-bold uppercase focus:border-blue outline-none" dir="ltr" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-glass-border">
                                        <button onClick={handleSaveColors} disabled={saving}
                                            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue to-cyan-500 text-white font-black rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 active:scale-95">
                                            <Save className="w-5 h-5" />
                                            {saving ? (isArabic ? "جاري النشر..." : "Publishing...") : (isArabic ? "نشر التعديلات" : "Publish Changes")}
                                        </button>
                                        <button onClick={handleResetColors}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 border border-glass-border rounded-xl text-silver font-bold text-sm hover:text-foreground hover:bg-white/5 transition">
                                            <RotateCcw className="w-4 h-4" />
                                            {isArabic ? "تراجع" : "Undo"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* RIGHT PANE: LIVE PREVIEW IFRAME */}
            <div className="w-full lg:w-1/2 h-[75vh] lg:h-full bg-slate-100 dark:bg-black/40 rounded-3xl p-2 lg:p-4 flex flex-col border border-glass-border relative">
                <div className="flex items-center justify-between mb-3 px-2">
                    <span className="text-sm font-bold opacity-60 flex items-center gap-2">
                        <MonitorSmartphone className="w-4 h-4" />
                        {isArabic ? "معاينة حية (موبايل)" : "Live Preview (Mobile)"}
                    </span>
                    <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                </div>

                <div className="flex-1 w-full max-w-[400px] mx-auto bg-black rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden relative">
                    {restaurantId ? (
                        <iframe
                            id="preview-iframe"
                            src={`/menu/${restaurantId}`}
                            className="w-full h-full bg-background"
                            frameBorder="0"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-silver animate-pulse">
                            {isArabic ? "جاري التحميل..." : "Loading Preview..."}
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); }
            `}</style>
        </div>
    );
}
