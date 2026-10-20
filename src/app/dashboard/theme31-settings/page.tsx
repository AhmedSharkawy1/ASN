"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { 
    Save, Loader2, ImagePlus, Trash2, Sun, Moon, Palette, Eye, 
    Sparkles, Megaphone, Link2, Plus, X, Layers,
    AlignJustify, LayoutGrid, LayoutList, Maximize2, Check,
    Flame, Coffee, Globe, Utensils, Truck
} from "lucide-react";
import { uploadImageWithThumb } from "@/lib/uploadImage";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { posDb } from "@/lib/pos-db";
import Link from "next/link";
import { useDashboardContext } from "@/lib/context/DashboardContext";

interface CategoryItem {
    id: string;
    name_ar: string;
    name_en: string;
}

interface Theme31PopupConfig {
    enabled: boolean;
    title: string;
    description: string;
    image_url: string;
    button_text: string;
    target_category_id: string;
}

interface Theme31Config {
    theme31_bg_light: string;
    theme31_bg_dark: string;
    primary_color: string;
    theme31_default_view_mode: 'grid' | 'list' | 'compact' | 'showcase';
    theme31_show_stories: boolean;
    service_type: 'delivery_and_takeaway' | 'dine_in_and_delivery' | 'delivery_only' | 'dine_in_only';
    theme31_popup: Theme31PopupConfig;
    theme_colors: any;
    current_theme: string;
}

const COLOR_PRESETS = [
    { name_ar: "أورا شفق بنفسجي نيلي (الأساسي)", name_en: "Cyber Ultra-Violet Indigo (Default)", hex: "#6366f1", theme_suffix: "" },
    { name_ar: "أورا نيون زمردي ملكي", name_en: "Neon Cyber Emerald", hex: "#10b981", theme_suffix: "-emerald" },
    { name_ar: "عنبر كافيه وذهب سائل فاخر", name_en: "Liquid Amber Gold & Coffee", hex: "#f59e0b", theme_suffix: "-amber" },
    { name_ar: "ياقوت قرمزي مخملي متوهج", name_en: "Hyper Ruby Rose Velvet", hex: "#f43f5e", theme_suffix: "-rose" },
    { name_ar: "أزرق جليدي كهربائي منعش", name_en: "Electric Ice Glaze Cyan", hex: "#06b6d4", theme_suffix: "-cyan" },
    { name_ar: "غروب ناري متوهج", name_en: "Sunset Flame & Radiant Orange", hex: "#f97316", theme_suffix: "-sunset" },
    { name_ar: "بنفسجي ملكي أرجواني فاخر", name_en: "Royal Violet Luxury", hex: "#7c3aed", theme_suffix: "-violet" },
    { name_ar: "ماتريكس أوبسيديان كوني فاخر", name_en: "Cosmic Obsidian Matrix Dark", hex: "#0f172a", theme_suffix: "-dark" },
];

export default function Theme31SettingsPage() {
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

    const [config, setConfig] = useState<Theme31Config>({
        theme31_bg_light: "",
        theme31_bg_dark: "",
        primary_color: "#6366f1",
        theme31_default_view_mode: "grid",
        theme31_show_stories: true,
        service_type: "delivery_and_takeaway",
        theme31_popup: {
            enabled: false,
            title: "",
            description: "",
            image_url: "",
            button_text: isAr ? "تصفح العرض" : "View Offer",
            target_category_id: ""
        },
        theme_colors: {},
        current_theme: "theme31",
    });

    const { restaurantId: ctxRestaurantId } = useDashboardContext();

    useEffect(() => {
        const loadData = async () => {
            try {
                let rId: string | null = null;

                if (ctxRestaurantId) rId = ctxRestaurantId;

                if (!rId) {
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
                    setCategories(cats.map(c => ({ id: String(c.id), name_ar: c.name_ar, name_en: c.name_en })));
                }

                // Fetch Restaurant Data
                const { data: rest, error } = await supabase
                    .from("restaurants")
                    .select("id, slug, theme, theme_colors, dine_in_enabled, pickup_enabled, delivery_enabled")
                    .eq("id", rId)
                    .single();

                if (error) throw error;

                if (rest) {
                    setRestaurantSlug(rest.slug || rest.id);
                    let tc: any = rest.theme_colors || {};
                    if (typeof tc === 'string') {
                        try { tc = JSON.parse(tc); } catch { tc = {}; }
                    }

                    const resolvedTheme = rest.theme || "theme31";

                    // Determine primary color
                    let pColor = tc.theme31_primary || tc.primary || "#6366f1";
                    const t = resolvedTheme.toLowerCase();
                    if (t.includes('emerald') || t.includes('green')) pColor = "#10b981";
                    else if (t.includes('amber') || t.includes('gold')) pColor = "#f59e0b";
                    else if (t.includes('rose') || t.includes('red')) pColor = "#f43f5e";
                    else if (t.includes('cyan') || t.includes('sky')) pColor = "#06b6d4";
                    else if (t.includes('sunset') || t.includes('orange')) pColor = "#f97316";
                    else if (t.includes('violet') || t.includes('purple')) pColor = "#7c3aed";
                    else if (t.includes('dark')) pColor = "#0f172a";

                    const defaultViewMode = (tc.theme31_default_view_mode || tc.theme30_default_view_mode || "grid") as any;
                    const showStories = tc.theme31_show_stories !== false;

                    let sType: any = tc.service_type || tc.theme31_service_type || tc.theme30_service_type || "delivery_and_takeaway";
                    if (rest.dine_in_enabled) {
                        sType = rest.delivery_enabled ? "dine_in_and_delivery" : "dine_in_only";
                    }

                    const popup = tc.theme31_popup || tc.theme30_popup || {
                        enabled: false,
                        title: "",
                        description: "",
                        image_url: "",
                        button_text: isAr ? "تصفح العرض" : "View Offer",
                        target_category_id: ""
                    };

                    setConfig({
                        theme31_bg_light: tc.theme31_bg_light || tc.theme30_bg_light || tc.bg_image_light || "",
                        theme31_bg_dark: tc.theme31_bg_dark || tc.theme30_bg_dark || tc.bg_image_dark || "",
                        primary_color: pColor,
                        theme31_default_view_mode: defaultViewMode,
                        theme31_show_stories: showStories,
                        service_type: sType,
                        theme31_popup: popup,
                        theme_colors: tc,
                        current_theme: resolvedTheme,
                    });
                }
            } catch (err) {
                console.error("Error loading theme 31 config:", err);
                toast.error(isAr ? "حدث خطأ أثناء تحميل البيانات" : "Failed to load theme settings");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [ctxRestaurantId, isAr]);

    // Handle Save
    const handleSave = async (activateTheme: boolean = false) => {
        if (!restaurantId) return;
        setSaving(true);

        try {
            let tc = config.theme_colors || {};
            if (typeof tc === 'string') {
                try { tc = JSON.parse(tc); } catch { tc = {}; }
            }

            let dineInEnabled = false;
            let pickupEnabled = true;
            let deliveryEnabled = true;

            if (config.service_type === 'dine_in_and_delivery') {
                dineInEnabled = true;
                deliveryEnabled = true;
                pickupEnabled = true;
            } else if (config.service_type === 'dine_in_only') {
                dineInEnabled = true;
                deliveryEnabled = false;
                pickupEnabled = false;
            } else if (config.service_type === 'delivery_only') {
                dineInEnabled = false;
                deliveryEnabled = true;
                pickupEnabled = false;
            } else {
                dineInEnabled = false;
                deliveryEnabled = true;
                pickupEnabled = true;
            }

            const matchedPreset = COLOR_PRESETS.find(p => p.hex.toLowerCase() === config.primary_color.toLowerCase());
            let targetTheme = matchedPreset ? `theme31${matchedPreset.theme_suffix}` : 'theme31';
            if (!activateTheme && config.current_theme?.startsWith("theme31")) {
                targetTheme = matchedPreset ? `theme31${matchedPreset.theme_suffix}` : config.current_theme;
            }

            const updatedThemeColors = {
                ...tc,
                primary: config.primary_color,
                theme31_primary: config.primary_color,
                theme31_bg_light: config.theme31_bg_light,
                theme31_bg_dark: config.theme31_bg_dark,
                bg_image_light: config.theme31_bg_light || tc.bg_image_light || "",
                bg_image_dark: config.theme31_bg_dark || tc.bg_image_dark || "",
                theme31_default_view_mode: config.theme31_default_view_mode,
                theme31_show_stories: config.theme31_show_stories,
                theme31_service_type: config.service_type,
                service_type: config.service_type,
                dine_in_enabled: dineInEnabled,
                theme31_popup: config.theme31_popup,
            };

            const { data, error } = await supabase
                .from("restaurants")
                .update({
                    theme: targetTheme,
                    theme_colors: updatedThemeColors,
                    pickup_enabled: pickupEnabled,
                    delivery_enabled: deliveryEnabled
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

            // Immediately purge Next.js menu cache
            try {
                await fetch('/api/revalidate-menu', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ restaurantId })
                });
            } catch (revErr) {
                console.warn("Could not revalidate menu cache:", revErr);
            }

            setConfig(prev => ({ ...prev, current_theme: targetTheme, theme_colors: updatedThemeColors }));
            toast.success(isAr ? "تم حفظ إعدادات ثيم 31 بنجاح" : "Theme 31 settings saved successfully");
        } catch (err: any) {
            console.error("Error saving Theme 31 settings:", err);
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
            const result = await uploadImageWithThumb(file, `theme31/bg_${mode}_${Date.now()}`);
            if (result?.originalUrl) {
                const key = mode === 'light' ? 'theme31_bg_light' : 'theme31_bg_dark';
                setConfig(prev => ({ ...prev, [key]: result.originalUrl }));
                toast.success(isAr ? `تم رفع خلفية الوضع ${mode === 'light' ? 'الفاتح' : 'الداكن'}` : `Background uploaded for ${mode} mode`);
            } else {
                throw new Error(isAr ? "فشل رفع الصورة" : "Upload failed");
            }
        } catch (err: any) {
            toast.error(err.message || (isAr ? "فشل رفع الصورة" : "Image upload failed"));
        } finally {
            if (mode === 'light') setUploadingBgLight(false);
            else setUploadingBgDark(false);
        }
    };

    const isThemeActive = config.current_theme?.startsWith("theme31");

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 w-full mx-auto space-y-6 max-w-6xl" dir={isAr ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue/10 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-inner">
                        <Sparkles className="w-7 h-7 text-indigo-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-foreground">
                                {isAr ? "تخصيص ثيم 31 (أورا فيوتشر الزجاجي)" : "Customize Theme 31 (Aura Glassmorphism)"}
                            </h1>
                            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                                isThemeActive 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }`}>
                                {isThemeActive 
                                    ? (isAr ? "الثيم مفعل حالياً ✓" : "Theme Active ✓") 
                                    : (isAr ? "غير مفعل (انقر تفعيل)" : "Inactive")}
                            </span>
                        </div>
                        <p className="text-silver text-xs sm:text-sm mt-0.5">
                            {isAr ? "تحكم في اللون المميز، طريقة العرض الافتراضية، شريط الستوري، والخلفيات المخصصة." : "Manage accent colors, default view mode, stories bar, and custom backgrounds."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <a
                        href={restaurantSlug ? `/menu/${restaurantSlug}?previewTheme=${config.current_theme}&t=${Date.now()}` : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-card text-foreground font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
                    >
                        <Eye className="w-4 h-4 text-silver" />
                        <span>{isAr ? "معاينة المنيو" : "Preview"}</span>
                    </a>

                    {!isThemeActive && (
                        <button
                            type="button"
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                        >
                            <Check className="w-4 h-4" />
                            <span>{isAr ? "تفعيل ثيم 31" : "Activate Theme 31"}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isAr ? "حفظ التعديلات" : "Save Settings"}</span>
                    </button>
                </div>
            </div>

            {/* Main Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left/Main Column */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Section 1: Color Presets & Custom Accent */}
                    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Palette className="w-5 h-5 text-indigo-500" />
                                <div>
                                    <h2 className="font-black text-base text-foreground">
                                        {isAr ? "اللون المميز وألوان الأورا" : "Accent Color & Aura Spirits"}
                                    </h2>
                                    <p className="text-silver text-xs">
                                        {isAr ? "اختر أحد الألوان المعتمدة لثيم 31 أو اكتب كود سداسي مخصص." : "Choose a ready preset or enter a custom hex color code."}
                                    </p>
                                </div>
                            </div>
                            <div 
                                className="w-8 h-8 rounded-full border-2 border-white shadow-md shrink-0 transition-transform hover:scale-110"
                                style={{ backgroundColor: config.primary_color }}
                                title={config.primary_color}
                            />
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                            {COLOR_PRESETS.map((p) => {
                                const isSelected = config.primary_color.toLowerCase() === p.hex.toLowerCase();
                                return (
                                    <button
                                        key={p.hex}
                                        type="button"
                                        onClick={() => setConfig(prev => ({ ...prev, primary_color: p.hex }))}
                                        className={`p-3 rounded-2xl border text-start transition-all relative overflow-hidden group ${
                                            isSelected 
                                                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-400 shadow-sm" 
                                                : "border-border hover:border-indigo-500/50 hover:bg-background/80"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-1 mb-2">
                                            <div 
                                                className="w-5 h-5 rounded-full border border-white/40 shadow-xs flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: p.hex }}
                                            >
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-[10px] font-mono text-silver">{p.hex}</span>
                                        </div>
                                        <p className="font-extrabold text-xs text-foreground line-clamp-1">
                                            {isAr ? p.name_ar : p.name_en}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom Hex Picker Input */}
                        <div className="pt-2 border-t border-border flex items-center gap-3">
                            <span className="text-xs font-bold text-silver shrink-0">
                                {isAr ? "أو كود مخصص (Hex):" : "Or Custom Hex Code:"}
                            </span>
                            <div className="flex items-center gap-2 flex-1 max-w-xs">
                                <input
                                    type="color"
                                    value={config.primary_color}
                                    onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                                    className="w-9 h-9 rounded-xl border border-border cursor-pointer bg-transparent"
                                />
                                <input
                                    type="text"
                                    value={config.primary_color}
                                    onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                                    className="flex-1 bg-background border border-border rounded-xl text-xs font-mono font-bold py-2 px-3 text-foreground uppercase focus:outline-none focus:border-indigo-500"
                                    placeholder="#6366f1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Default View Mode */}
                    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2.5">
                            <Layers className="w-5 h-5 text-indigo-500" />
                            <div>
                                <h2 className="font-black text-base text-foreground">
                                    {isAr ? "طريقة العرض الافتراضية للأصناف" : "Default Items View Mode"}
                                </h2>
                                <p className="text-silver text-xs">
                                    {isAr ? "طريقة العرض التي يراها العميل عند فتح المنيو لأول مرة." : "The view layout customers see when first opening your menu."}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { mode: 'grid' as const, labelAr: "شبكة مربعة (Grid)", labelEn: "Grid View", icon: LayoutGrid, descAr: "بطاقات صور مربعة عصرية" },
                                { mode: 'list' as const, labelAr: "قائمة أفقية (List)", labelEn: "List View", icon: LayoutList, descAr: "صورة يسار وتفاصيل يمين" },
                                { mode: 'compact' as const, labelAr: "مكثف سريع (Compact)", labelEn: "Compact View", icon: AlignJustify, descAr: "صفوف مقتضبة للمنيوهات الكبيرة" },
                                { mode: 'showcase' as const, labelAr: "شوكيس فاخر (Showcase)", labelEn: "Showcase Hero", icon: Maximize2, descAr: "صور عريضة سينمائية" },
                            ].map((v) => {
                                const isSelected = config.theme31_default_view_mode === v.mode;
                                const IconComp = v.icon;
                                return (
                                    <button
                                        key={v.mode}
                                        type="button"
                                        onClick={() => setConfig(prev => ({ ...prev, theme31_default_view_mode: v.mode }))}
                                        className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-between transition-all ${
                                            isSelected 
                                                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-400 shadow-sm" 
                                                : "border-border hover:border-indigo-500/50 hover:bg-background/80"
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                                            isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-silver"
                                        }`}>
                                            <IconComp className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-extrabold text-xs text-foreground mb-1">
                                            {isAr ? v.labelAr : v.labelEn}
                                        </h4>
                                        <p className="text-[10px] text-silver leading-tight">
                                            {v.descAr}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 3: Stories & Service Mode */}
                    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2.5">
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                            <div>
                                <h2 className="font-black text-base text-foreground">
                                    {isAr ? "شريط الستوري ونوع الخدمة" : "Stories Bar & Service Type"}
                                </h2>
                                <p className="text-silver text-xs">
                                    {isAr ? "تحكم في إظهار شريط الستوري التفاعلي وتحديد نوع الخدمة المتاحة." : "Toggle VIP stories bar and configure accepted ordering channels."}
                                </p>
                            </div>
                        </div>

                        {/* Stories Toggle */}
                        <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-background">
                            <div className="space-y-0.5">
                                <h4 className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{isAr ? "إظهار شريط ستوري الهايلايتس (Stories Bar)" : "Show VIP Highlights Stories Bar"}</span>
                                </h4>
                                <p className="text-[11px] text-silver">
                                    {isAr ? "يعرض دوائر تفاعلية للأصناف المميزة والجديدة أعلى المنيو." : "Displays interactive round story avatars for bestsellers and new items."}
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={config.theme31_show_stories}
                                onChange={(e) => setConfig(prev => ({ ...prev, theme31_show_stories: e.target.checked }))}
                                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                            />
                        </div>

                        {/* Service Type Radios */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {[
                                { id: "delivery_and_takeaway", labelAr: "دليفري وتيك أواي فقط (سحابي)", labelEn: "Delivery & Takeaway Only", descAr: "لا يطلب رقم طاولة، مناسب للمطابخ السحابية والمطاعم السريعة", icon: Truck },
                                { id: "dine_in_and_delivery", labelAr: "صالة ودليفري وتيك أواي (شامل)", labelEn: "Dine-in, Takeaway & Delivery", descAr: "يتيح للزبون في الصالة إدخال رقم الطاولة أو اختيار التوصيل", icon: Utensils },
                            ].map((st) => {
                                const isSelected = config.service_type === st.id;
                                const IconComp = st.icon;
                                return (
                                    <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => setConfig(prev => ({ ...prev, service_type: st.id as any }))}
                                        className={`p-3.5 rounded-2xl border text-start flex items-start gap-3 transition-all ${
                                            isSelected 
                                                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-400 shadow-sm" 
                                                : "border-border hover:border-indigo-500/50 hover:bg-background/80"
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                            isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-silver"
                                        }`}>
                                            <IconComp className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h5 className="font-extrabold text-xs text-foreground">
                                                {isAr ? st.labelAr : st.labelEn}
                                            </h5>
                                            <p className="text-[11px] text-silver leading-relaxed">
                                                {st.descAr}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 4: Custom Background Images (Optional) */}
                    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2.5">
                            <ImagePlus className="w-5 h-5 text-indigo-500" />
                            <div>
                                <h2 className="font-black text-base text-foreground">
                                    {isAr ? "خلفيات صور مخصصة (اختياري)" : "Custom Background Images (Optional)"}
                                </h2>
                                <p className="text-silver text-xs">
                                    {isAr ? "يمكنك رفع صورة خلفية مخصصة للوضع الفاتح أو الداكن بدلاً من التدرج الزجاجي الافتراضي." : "Upload custom background image for light/dark mode instead of default aurora mesh."}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Light Mode BG */}
                            <div className="p-4 rounded-2xl border border-border bg-background space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sun className="w-4 h-4 text-amber-500" />
                                        <span className="font-bold text-xs text-foreground">{isAr ? "خلفية الوضع الفاتح" : "Light Mode BG"}</span>
                                    </div>
                                    {config.theme31_bg_light && (
                                        <button
                                            type="button"
                                            onClick={() => setConfig(prev => ({ ...prev, theme31_bg_light: "" }))}
                                            className="text-rose-500 hover:text-rose-600 p-1"
                                            title={isAr ? "حذف" : "Remove"}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {config.theme31_bg_light ? (
                                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border">
                                        <img src={config.theme31_bg_light} alt="Light BG" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-border hover:border-indigo-500 cursor-pointer transition-colors bg-card/50">
                                        {uploadingBgLight ? (
                                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                        ) : (
                                            <>
                                                <ImagePlus className="w-6 h-6 text-silver mb-1" />
                                                <span className="text-[11px] font-bold text-silver">{isAr ? "رفع صورة للوضع الفاتح" : "Upload Light BG"}</span>
                                            </>
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => handleUploadBg(e, 'light')} className="hidden" disabled={uploadingBgLight} />
                                    </label>
                                )}
                            </div>

                            {/* Dark Mode BG */}
                            <div className="p-4 rounded-2xl border border-border bg-background space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Moon className="w-4 h-4 text-indigo-400" />
                                        <span className="font-bold text-xs text-foreground">{isAr ? "خلفية الوضع الداكن" : "Dark Mode BG"}</span>
                                    </div>
                                    {config.theme31_bg_dark && (
                                        <button
                                            type="button"
                                            onClick={() => setConfig(prev => ({ ...prev, theme31_bg_dark: "" }))}
                                            className="text-rose-500 hover:text-rose-600 p-1"
                                            title={isAr ? "حذف" : "Remove"}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {config.theme31_bg_dark ? (
                                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border">
                                        <img src={config.theme31_bg_dark} alt="Dark BG" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-border hover:border-indigo-500 cursor-pointer transition-colors bg-card/50">
                                        {uploadingBgDark ? (
                                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                        ) : (
                                            <>
                                                <ImagePlus className="w-6 h-6 text-silver mb-1" />
                                                <span className="text-[11px] font-bold text-silver">{isAr ? "رفع صورة للوضع الداكن" : "Upload Dark BG"}</span>
                                            </>
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => handleUploadBg(e, 'dark')} className="hidden" disabled={uploadingBgDark} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Summary & Direct Phone Preview */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-[90px] space-y-4">
                        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                            <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                <span>{isAr ? "ملخص إعدادات ثيم 31" : "Theme 31 Summary"}</span>
                            </h3>

                            <div className="space-y-2 text-xs divide-y divide-border/60">
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-silver">{isAr ? "حالة الثيم:" : "Theme Status:"}</span>
                                    <span className="font-bold text-foreground">{isThemeActive ? (isAr ? "مفعل" : "Active") : (isAr ? "غير مفعل" : "Inactive")}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-silver">{isAr ? "اللون المعتمد:" : "Accent Color:"}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: config.primary_color }} />
                                        <span className="font-mono font-bold text-foreground">{config.primary_color}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-silver">{isAr ? "العرض الافتراضي:" : "View Mode:"}</span>
                                    <span className="font-bold text-foreground uppercase">{config.theme31_default_view_mode}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-silver">{isAr ? "شريط الستوري:" : "Stories Bar:"}</span>
                                    <span className="font-bold text-foreground">{config.theme31_show_stories ? (isAr ? "مفعل ✓" : "Enabled") : (isAr ? "معطل" : "Disabled")}</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleSave(true)}
                                disabled={saving}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span>{isAr ? "حفظ وتطبيق فوراً" : "Save & Apply Now"}</span>
                            </button>
                        </div>

                        {/* Phone Simulator Preview */}
                        <div className="bg-card border border-border rounded-3xl p-3 shadow-md">
                            <div className="flex items-center justify-between px-2 mb-2">
                                <span className="text-[11px] font-black text-foreground flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    <span>{isAr ? "معاينة حية" : "Live Preview"}</span>
                                </span>
                                <span className="text-[10px] font-mono text-silver">{config.current_theme}</span>
                            </div>
                            <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-border bg-white dark:bg-black relative shadow-inner">
                                {restaurantSlug ? (
                                    <iframe
                                        src={`/menu/${restaurantSlug}?previewTheme=${config.current_theme}&t=${Date.now()}`}
                                        className="w-full h-full border-none"
                                        title="Live Menu Preview"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-silver text-xs">
                                        {isAr ? "جاري تحميل المعاينة..." : "Loading preview..."}
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
