"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { 
    Save, Loader2, ImagePlus, Trash2, Sun, Moon, Palette, Eye, 
    Sparkles, Megaphone, Link2, Plus, X, Layers,
    AlignJustify, LayoutGrid, LayoutList, Maximize2, Check,
    Flame, Coffee, Globe
} from "lucide-react";
import { uploadImageWithThumb } from "@/lib/uploadImage";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { posDb } from "@/lib/pos-db";
import Link from "next/link";

interface CategoryItem {
    id: string;
    name_ar: string;
    name_en: string;
}

interface Theme28PopupConfig {
    enabled: boolean;
    title: string;
    description: string;
    image_url: string;
    button_text: string;
    target_category_id: string;
}

interface Theme28Config {
    theme28_bg_light: string;
    theme28_bg_dark: string;
    primary_color: string;
    theme28_default_view_mode: 'grid' | 'list' | 'compact' | 'showcase';
    theme28_show_stories: boolean;
    theme28_popup: Theme28PopupConfig;
    theme_colors: any;
    current_theme: string;
}

const COLOR_PRESETS = [
    { name_ar: "زمردي فاخر (الأساسي)", name_en: "Emerald Luxury", hex: "#059669", theme_suffix: "" },
    { name_ar: "عنبري وقهوة مختصة", name_en: "Amber & Coffee", hex: "#d97706", theme_suffix: "-amber" },
    { name_ar: "أحمر قرمزي ناري", name_en: "Crimson Red", hex: "#dc2626", theme_suffix: "-red" },
    { name_ar: "سماوي بحري منعش", name_en: "Ocean Cyan", hex: "#0891b2", theme_suffix: "-cyan" },
    { name_ar: "بنفسجي ملكي", name_en: "Royal Purple", hex: "#7c3aed", theme_suffix: "-purple" },
    { name_ar: "أسود ليلي ملوكي", name_en: "Midnight Dark", hex: "#0f172a", theme_suffix: "-dark" },
    { name_ar: "وردي ناعم", name_en: "Rose Pink", hex: "#ec4899", theme_suffix: "-pink" },
];

export default function Theme28SettingsPage() {
    const { language } = useLanguage();
    const isAr = language === "ar";
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingBgLight, setUploadingBgLight] = useState(false);
    const [uploadingBgDark, setUploadingBgDark] = useState(false);
    const [uploadingPopupImg, setUploadingPopupImg] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
    const [categories, setCategories] = useState<CategoryItem[]>([]);

    const [config, setConfig] = useState<Theme28Config>({
        theme28_bg_light: "",
        theme28_bg_dark: "",
        primary_color: "#059669",
        theme28_default_view_mode: "grid",
        theme28_show_stories: true,
        theme28_popup: {
            enabled: false,
            title: "",
            description: "",
            image_url: "",
            button_text: isAr ? "تصفح العرض" : "View Offer",
            target_category_id: ""
        },
        theme_colors: {},
        current_theme: "theme28",
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                let rId: string | null = null;
                try {
                    const cached = await posDb.settings.get('current_config');
                    if (cached?.restaurant_id) rId = cached.restaurant_id;
                } catch (e) {
                    console.warn("Could not read posDb cache:", e);
                }

                if (!rId) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: rest } = await supabase
                            .from("restaurants")
                            .select("id, slug, theme, theme_colors")
                            .eq("user_id", user.id)
                            .maybeSingle();
                        if (rest) {
                            rId = rest.id;
                            setRestaurantSlug(rest.slug || rest.id);
                        }
                    }
                }

                if (!rId) {
                    setLoading(false);
                    return;
                }

                setRestaurantId(rId);

                // Fetch Categories
                const { data: cats } = await supabase
                    .from("categories")
                    .select("id, name_ar, name_en")
                    .eq("restaurant_id", rId)
                    .order("sort_order", { ascending: true });

                if (cats) {
                    setCategories(cats);
                }

                // Fetch Restaurant Theme Data
                const { data: restData } = await supabase
                    .from("restaurants")
                    .select("slug, theme, theme_colors")
                    .eq("id", rId)
                    .single();

                if (restData) {
                    setRestaurantSlug(restData.slug || rId);
                    let tc = restData.theme_colors || {};
                    if (typeof tc === 'string') {
                        try { tc = JSON.parse(tc); } catch { tc = {}; }
                    }

                    const popup = tc.theme28_popup || {
                        enabled: false,
                        title: "",
                        description: "",
                        image_url: "",
                        button_text: isAr ? "تصفح العرض" : "View Offer",
                        target_category_id: ""
                    };

                    const defaultViewMode = (tc.theme28_default_view_mode === 'grid' || tc.theme28_default_view_mode === 'list' || tc.theme28_default_view_mode === 'compact' || tc.theme28_default_view_mode === 'showcase')
                        ? tc.theme28_default_view_mode
                        : 'grid';

                    setConfig({
                        theme28_bg_light: tc.theme28_bg_light || tc.bg_image_light || "",
                        theme28_bg_dark: tc.theme28_bg_dark || tc.bg_image_dark || "",
                        primary_color: tc.primary || "#059669",
                        theme28_default_view_mode: defaultViewMode,
                        theme28_show_stories: tc.theme28_show_stories !== false,
                        theme28_popup: popup,
                        theme_colors: tc,
                        current_theme: restData.theme || "theme28",
                    });
                }
            } catch (err) {
                console.error("Error loading theme 28 settings:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isAr]);

    const handleSave = async (activateTheme = false) => {
        if (!restaurantId) return;
        setSaving(true);
        try {
            let tc = config.theme_colors || {};
            if (typeof tc === 'string') {
                try { tc = JSON.parse(tc); } catch { tc = {}; }
            }

            const updatedThemeColors = {
                ...tc,
                primary: config.primary_color,
                theme28_bg_light: config.theme28_bg_light,
                theme28_bg_dark: config.theme28_bg_dark,
                theme28_default_view_mode: config.theme28_default_view_mode,
                theme28_show_stories: config.theme28_show_stories,
                theme28_popup: config.theme28_popup,
            };

            let targetTheme = config.current_theme;
            if (activateTheme || !targetTheme.startsWith("theme28")) {
                targetTheme = "theme28";
            }

            const { data, error } = await supabase
                .from("restaurants")
                .update({
                    theme: targetTheme,
                    theme_colors: updatedThemeColors
                })
                .eq("id", restaurantId)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("Could not update data. Check database permissions.");

            try {
                const currentConfig = await posDb.settings.get('current_config');
                if (currentConfig) {
                    await posDb.settings.put({
                        ...currentConfig,
                        theme: targetTheme,
                        theme_colors: updatedThemeColors
                    } as any);
                }
            } catch (cErr) {
                console.warn("Could not update offline cache:", cErr);
            }

            setConfig(prev => ({ ...prev, current_theme: targetTheme, theme_colors: updatedThemeColors }));
            toast.success(isAr ? "تم حفظ إعدادات ثيم 28 بنجاح" : "Theme 28 settings saved successfully");
        } catch (err: any) {
            console.error("Error saving Theme 28 settings:", err);
            toast.error(err.message || (isAr ? "حدث خطأ أثناء الحفظ" : "Error occurred while saving"));
        } finally {
            setSaving(false);
        }
    };

    // Upload Background Image
    const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
        const file = e.target.files?.[0];
        if (!file || !restaurantId) return;

        if (mode === 'light') setUploadingBgLight(true);
        else setUploadingBgDark(true);

        try {
            const result = await uploadImageWithThumb(file, `theme28/bg_${mode}_${Date.now()}`);
            if (result?.originalUrl) {
                if (mode === 'light') {
                    setConfig(prev => ({ ...prev, theme28_bg_light: result.originalUrl }));
                } else {
                    setConfig(prev => ({ ...prev, theme28_bg_dark: result.originalUrl }));
                }
                toast.success(isAr ? "تم رفع صورة الخلفية بنجاح" : "Background uploaded successfully");
            }
        } catch (err) {
            console.error("Upload bg error:", err);
            toast.error(isAr ? "فشل رفع الصورة" : "Failed to upload image");
        } finally {
            if (mode === 'light') setUploadingBgLight(false);
            else setUploadingBgDark(false);
        }
    };

    // Upload Popup Image
    const handleUploadPopupImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !restaurantId) return;

        setUploadingPopupImg(true);
        try {
            const result = await uploadImageWithThumb(file, `theme28/popup_${Date.now()}`);
            if (result?.originalUrl) {
                setConfig(prev => ({
                    ...prev,
                    theme28_popup: {
                        ...prev.theme28_popup,
                        image_url: result.originalUrl
                    }
                }));
                toast.success(isAr ? "تم رفع صورة العرض الترويجي" : "Promo image uploaded");
            }
        } catch (err) {
            console.error("Upload popup image error:", err);
            toast.error(isAr ? "فشل رفع صورة العرض" : "Failed to upload promo image");
        } finally {
            setUploadingPopupImg(false);
        }
    };

    const isTheme28Active = config.current_theme?.startsWith("theme28");
    const previewUrl = `/menu/${restaurantSlug || restaurantId || 'preview'}?preview_theme=theme28`;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-16 font-cairo" dir={isAr ? "rtl" : "ltr"}>
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 p-6 sm:p-8 text-white shadow-xl">
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black mb-3">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isAr ? "الجيل الأحدث 2026" : "Next-Gen 2026"}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                            {isAr ? "إعدادات وتخصيص ثيم 28 (Theme 28)" : "Theme 28 Settings & Customization"}
                        </h1>
                        <p className="text-sm text-emerald-100 max-w-xl mt-1 leading-relaxed">
                            {isAr 
                                ? "أحدث وأشمل ثيم يناسب كافة المطاعم والمقاهي مع واجهة زجاجية، شريط ستوري، 4 أنماط عرض، وسلة عائمة ذكية."
                                : "The newest universal theme for restaurants and cafes with glassmorphic UI, stories bar, and 4 view modes."}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <Link
                            href={previewUrl}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-black transition-all shadow-sm active:scale-95"
                        >
                            <Eye className="w-4 h-4" />
                            <span>{isAr ? "معاينة المنيو مباشرة" : "Live Preview"}</span>
                        </Link>

                        <button
                            onClick={() => handleSave(false)}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-black shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>{isAr ? "حفظ التعديلات" : "Save Changes"}</span>
                        </button>
                    </div>
                </div>

                {/* Status indicator */}
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-bold">
                        <span className={`w-2.5 h-2.5 rounded-full ${isTheme28Active ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'}`} />
                        {isTheme28Active 
                            ? (isAr ? "ثيم 28 مفعّل حالياً للمطعم" : "Theme 28 is currently active")
                            : (isAr ? `الثيم الحالي: ${config.current_theme}` : `Current theme: ${config.current_theme}`)}
                    </span>
                    {!isTheme28Active && (
                        <button
                            onClick={() => handleSave(true)}
                            className="text-xs font-black underline hover:text-white"
                        >
                            {isAr ? "تفعيل ثيم 28 كثيم أساسي الآن ⚡" : "Activate Theme 28 now ⚡"}
                        </button>
                    )}
                </div>
            </div>

            {/* Grid 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. COLOR PRESET & CUSTOM PRIMARY */}
                <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5">
                        <Palette className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-base font-black">
                            {isAr ? "ألوان وهوية الثيم" : "Theme Color & Accents"}
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {isAr ? "اختر من لوحات الألوان الجاهزة أو حدد لون علامتك التجارية الخاص" : "Choose a preset or pick a custom hex color"}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                        {COLOR_PRESETS.map((preset) => {
                            const isSelected = config.primary_color.toLowerCase() === preset.hex.toLowerCase();
                            return (
                                <button
                                    key={preset.hex}
                                    type="button"
                                    onClick={() => setConfig(prev => ({ ...prev, primary_color: preset.hex }))}
                                    className={`p-3 rounded-2xl border text-right flex items-center gap-3 transition-all ${
                                        isSelected 
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 font-black shadow-xs ring-1 ring-emerald-500' 
                                            : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                                    }`}
                                >
                                    <div 
                                        className="w-6 h-6 rounded-full shrink-0 shadow-sm flex items-center justify-center text-white" 
                                        style={{ backgroundColor: preset.hex }}
                                    >
                                        {isSelected && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs truncate">{isAr ? preset.name_ar : preset.name_en}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                        <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 shrink-0">
                            {isAr ? "لون مخصص (HEX):" : "Custom HEX:"}
                        </label>
                        <div className="flex items-center gap-2 flex-1">
                            <input 
                                type="color" 
                                value={config.primary_color}
                                onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                                className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                            />
                            <input 
                                type="text"
                                value={config.primary_color}
                                onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                                className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-mono font-bold flex-1"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. DEFAULT VIEW MODE & STORIES BAR */}
                <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5">
                        <Layers className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-base font-black">
                            {isAr ? "نمط العرض الافتراضي" : "Default View Mode"}
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {isAr ? "حدد نمط العرض الذي يظهر للعميل عند فتح المنيو لأول مرة" : "Select the initial view mode for your customers"}
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, theme28_default_view_mode: 'grid' }))}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                                config.theme28_default_view_mode === 'grid'
                                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 font-black shadow-xs ring-1 ring-emerald-500'
                                    : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <LayoutGrid className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-black">{isAr ? "شبكة عصرية (Grid)" : "Grid (2 Columns)"}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "للأطباق والحلويات" : "Best for dishes & photos"}</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, theme28_default_view_mode: 'list' }))}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                                config.theme28_default_view_mode === 'list'
                                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 font-black shadow-xs ring-1 ring-emerald-500'
                                    : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <LayoutList className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-black">{isAr ? "قائمة تفصيلية (List)" : "Detailed List"}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "للمشروبات والمقبلات" : "Horizontal cards"}</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, theme28_default_view_mode: 'compact' }))}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                                config.theme28_default_view_mode === 'compact'
                                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 font-black shadow-xs ring-1 ring-emerald-500'
                                    : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <AlignJustify className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-black">{isAr ? "عرض مكثف (Compact)" : "Compact Rows"}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "للمنيوهات الكبيرة 100+" : "Dense rows for speed"}</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, theme28_default_view_mode: 'showcase' }))}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                                config.theme28_default_view_mode === 'showcase'
                                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 font-black shadow-xs ring-1 ring-emerald-500'
                                    : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <Maximize2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-black">{isAr ? "عرض فاخر (Showcase)" : "Showcase"}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "بطاقات صور ملء الشاشة" : "Full width magazine cards"}</div>
                            </div>
                        </button>
                    </div>

                    {/* Stories Bar Switch */}
                    <div className="pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-black">{isAr ? "شريط الستوري والعروض العلوية" : "Top Stories Bar"}</div>
                            <div className="text-[11px] text-slate-500">{isAr ? "دوائر تفاعلية على غرار إنستغرام وتيك توك" : "Instagram/TikTok style bubbles"}</div>
                        </div>
                        <input 
                            type="checkbox"
                            checked={config.theme28_show_stories}
                            onChange={(e) => setConfig(prev => ({ ...prev, theme28_show_stories: e.target.checked }))}
                            className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                    </div>
                </div>
            </div>

            {/* 3. BACKGROUND IMAGES (Light & Dark) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                    <ImagePlus className="w-5 h-5 text-emerald-500" />
                    <div>
                        <h2 className="text-base font-black">
                            {isAr ? "صور الخلفية المخصصة (اختياري)" : "Custom Background Images (Optional)"}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            {isAr ? "يمكنك رفع صورة خلفية مخصصة للوضع النهاري والوضع الليلي تعطي المنيو هوية فاخرة وخاصة بك" : "Upload custom background patterns for light & dark mode"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Light Mode BG */}
                    <div className="p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black flex items-center gap-1.5">
                                <Sun className="w-4 h-4 text-amber-500" />
                                {isAr ? "خلفية الوضع النهاري (Light)" : "Light Mode BG"}
                            </span>
                            {config.theme28_bg_light && (
                                <button
                                    onClick={() => setConfig(prev => ({ ...prev, theme28_bg_light: '' }))}
                                    className="text-[11px] text-rose-500 hover:underline flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    {isAr ? "حذف" : "Remove"}
                                </button>
                            )}
                        </div>

                        {config.theme28_bg_light ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden shadow-xs border">
                                <img src={config.theme28_bg_light} alt="Light BG" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="aspect-video rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center text-slate-400 gap-1.5 text-xs">
                                <ImagePlus className="w-6 h-6" />
                                <span>{isAr ? "لا توجد خلفية مخصصة" : "No custom background"}</span>
                            </div>
                        )}

                        <label className="block">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleUploadBg(e, 'light')}
                                disabled={uploadingBgLight}
                            />
                            <div className="w-full py-2 rounded-xl bg-white dark:bg-zinc-700 border border-black/10 dark:border-white/10 text-center text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 cursor-pointer shadow-xs">
                                {uploadingBgLight ? isAr ? "جاري الرفع..." : "Uploading..." : isAr ? "رفع صورة نهارية" : "Upload Light BG"}
                            </div>
                        </label>
                    </div>

                    {/* Dark Mode BG */}
                    <div className="p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black flex items-center gap-1.5">
                                <Moon className="w-4 h-4 text-indigo-400" />
                                {isAr ? "خلفية الوضع الليلي (Dark)" : "Dark Mode BG"}
                            </span>
                            {config.theme28_bg_dark && (
                                <button
                                    onClick={() => setConfig(prev => ({ ...prev, theme28_bg_dark: '' }))}
                                    className="text-[11px] text-rose-500 hover:underline flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    {isAr ? "حذف" : "Remove"}
                                </button>
                            )}
                        </div>

                        {config.theme28_bg_dark ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden shadow-xs border">
                                <img src={config.theme28_bg_dark} alt="Dark BG" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="aspect-video rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center text-slate-400 gap-1.5 text-xs">
                                <ImagePlus className="w-6 h-6" />
                                <span>{isAr ? "لا توجد خلفية مخصصة" : "No custom background"}</span>
                            </div>
                        )}

                        <label className="block">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleUploadBg(e, 'dark')}
                                disabled={uploadingBgDark}
                            />
                            <div className="w-full py-2 rounded-xl bg-white dark:bg-zinc-700 border border-black/10 dark:border-white/10 text-center text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 cursor-pointer shadow-xs">
                                {uploadingBgDark ? isAr ? "جاري الرفع..." : "Uploading..." : isAr ? "رفع صورة ليلية" : "Upload Dark BG"}
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* 4. PROMOTIONAL POPUP ANNOUNCEMENT */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Megaphone className="w-5 h-5 text-emerald-500" />
                        <div>
                            <h2 className="text-base font-black">
                                {isAr ? "إعلان العرض الترويجي المنبثق" : "Promotional Popup Announcement"}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                {isAr ? "إظهار نافذة منبثقة تفاعلية للعميل فور دخوله المنيو للترويج لعرض خاص أو طبق جديد" : "Show an eye-catching popup when customers open the menu"}
                            </p>
                        </div>
                    </div>

                    <input 
                        type="checkbox"
                        checked={config.theme28_popup?.enabled}
                        onChange={(e) => setConfig(prev => ({
                            ...prev,
                            theme28_popup: {
                                ...prev.theme28_popup,
                                enabled: e.target.checked
                            }
                        }))}
                        className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                </div>

                {config.theme28_popup?.enabled && (
                    <div className="pt-3 border-t border-black/5 dark:border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                                    {isAr ? "عنوان العرض الترويجي" : "Offer Title"}
                                </label>
                                <input 
                                    type="text"
                                    value={config.theme28_popup.title}
                                    onChange={(e) => setConfig(prev => ({
                                        ...prev,
                                        theme28_popup: { ...prev.theme28_popup, title: e.target.value }
                                    }))}
                                    placeholder={isAr ? "مثال: خصم 20% على جميع المشروبات الساخنة!" : "e.g. 20% OFF on all signature drinks!"}
                                    className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                                    {isAr ? "تفاصيل العرض" : "Offer Description"}
                                </label>
                                <textarea 
                                    rows={3}
                                    value={config.theme28_popup.description}
                                    onChange={(e) => setConfig(prev => ({
                                        ...prev,
                                        theme28_popup: { ...prev.theme28_popup, description: e.target.value }
                                    }))}
                                    placeholder={isAr ? "اطلب الآن واستمتع بأقوى العروض الحصرية لفترة محدودة" : "Order now and enjoy special limited-time offers"}
                                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                                        {isAr ? "نص الزر" : "Button Text"}
                                    </label>
                                    <input 
                                        type="text"
                                        value={config.theme28_popup.button_text}
                                        onChange={(e) => setConfig(prev => ({
                                            ...prev,
                                            theme28_popup: { ...prev.theme28_popup, button_text: e.target.value }
                                        }))}
                                        className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                                        {isAr ? "القسم المرتبط" : "Target Category"}
                                    </label>
                                    <select
                                        value={config.theme28_popup.target_category_id}
                                        onChange={(e) => setConfig(prev => ({
                                            ...prev,
                                            theme28_popup: { ...prev.theme28_popup, target_category_id: e.target.value }
                                        }))}
                                        className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold"
                                    >
                                        <option value="">{isAr ? "اختر قسماً للانتقال إليه" : "None"}</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {isAr ? c.name_ar : (c.name_en || c.name_ar)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Image upload */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                                {isAr ? "صورة العرض (بانر)" : "Promo Image Banner"}
                            </label>
                            {config.theme28_popup.image_url ? (
                                <div className="relative aspect-video rounded-xl overflow-hidden border">
                                    <img src={config.theme28_popup.image_url} alt="Popup" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setConfig(prev => ({ ...prev, theme28_popup: { ...prev.theme28_popup, image_url: '' } }))}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-500"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <label className="aspect-video rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center text-slate-400 gap-1.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleUploadPopupImg}
                                        disabled={uploadingPopupImg}
                                    />
                                    <ImagePlus className="w-6 h-6 text-emerald-500" />
                                    <span>{uploadingPopupImg ? isAr ? "جاري الرفع..." : "Uploading..." : isAr ? "اختر صورة العرض" : "Upload promo image"}</span>
                                </label>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-end gap-3 pt-4">
                <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{isAr ? "حفظ كافة الإعدادات" : "Save All Settings"}</span>
                </button>
            </div>
        </div>
    );
}
