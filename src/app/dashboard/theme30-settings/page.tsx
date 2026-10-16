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

interface Theme30PopupConfig {
    enabled: boolean;
    title: string;
    description: string;
    image_url: string;
    button_text: string;
    target_category_id: string;
}

interface Theme30Config {
    theme30_bg_light: string;
    theme30_bg_dark: string;
    primary_color: string;
    theme30_default_view_mode: 'grid' | 'list' | 'compact' | 'showcase';
    theme30_show_stories: boolean;
    service_type: 'delivery_and_takeaway' | 'dine_in_and_delivery' | 'delivery_only' | 'dine_in_only';
    theme30_popup: Theme30PopupConfig;
    theme_colors: any;
    current_theme: string;
}

const COLOR_PRESETS = [
    { name_ar: "نيلي أوبسيديان ملكي (الأساسي)", name_en: "Obsidian Sapphire (Default)", hex: "#4f46e5", theme_suffix: "" },
    { name_ar: "زمردي فاخر", name_en: "Emerald Luxury", hex: "#059669", theme_suffix: "-emerald" },
    { name_ar: "عنبري وقهوة مختصة", name_en: "Amber & Specialty Coffee", hex: "#d97706", theme_suffix: "-amber" },
    { name_ar: "ياقوتي أحمر ناري", name_en: "Ruby Red", hex: "#e11d48", theme_suffix: "-rose" },
    { name_ar: "سماوي بحري منعش", name_en: "Ocean Cyan", hex: "#0284c7", theme_suffix: "-cyan" },
    { name_ar: "بنفسجي ملكي أرجواني", name_en: "Royal Violet", hex: "#7c3aed", theme_suffix: "-violet" },
    { name_ar: "أسود ليلي ملوكي", name_en: "Midnight Obsidian", hex: "#0f172a", theme_suffix: "-dark" },
    { name_ar: "وردي ناعم", name_en: "Rose Pink", hex: "#ec4899", theme_suffix: "-pink" },
];

export default function Theme30SettingsPage() {
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

    const [config, setConfig] = useState<Theme30Config>({
        theme30_bg_light: "",
        theme30_bg_dark: "",
        primary_color: "#4f46e5",
        theme30_default_view_mode: "grid",
        theme30_show_stories: true,
        service_type: "delivery_and_takeaway",
        theme30_popup: {
            enabled: false,
            title: "",
            description: "",
            image_url: "",
            button_text: isAr ? "تصفح العرض" : "View Offer",
            target_category_id: ""
        },
        theme_colors: {},
        current_theme: "theme30",
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
                    setCategories(cats);
                }

                // Fetch Restaurant Theme Data
                const { data: restData } = await supabase
                    .from("restaurants")
                    .select("slug, theme, theme_colors, pickup_enabled, delivery_enabled")
                    .eq("id", rId)
                    .single();

                if (restData) {
                    setRestaurantSlug(restData.slug || rId);
                    let tc = restData.theme_colors || {};
                    if (typeof tc === 'string') {
                        try { tc = JSON.parse(tc); } catch { tc = {}; }
                    }

                    const popup = tc.theme30_popup || tc.theme28_popup || {
                        enabled: false,
                        title: "",
                        description: "",
                        image_url: "",
                        button_text: isAr ? "تصفح العرض" : "View Offer",
                        target_category_id: ""
                    };

                    const defaultViewMode = (tc.theme30_default_view_mode === 'grid' || tc.theme30_default_view_mode === 'list' || tc.theme30_default_view_mode === 'compact' || tc.theme30_default_view_mode === 'showcase')
                        ? tc.theme30_default_view_mode
                        : (tc.theme28_default_view_mode || 'grid');

                    const explicitSt = tc.theme30_service_type || tc.service_type || tc.theme28_service_type;

                    let resolvedServiceType: 'delivery_and_takeaway' | 'dine_in_and_delivery' | 'delivery_only' | 'dine_in_only' = 'delivery_and_takeaway';

                    if (explicitSt === 'delivery_only' || (restData.pickup_enabled === false && restData.delivery_enabled !== false)) {
                        resolvedServiceType = 'delivery_only';
                    } else if (explicitSt === 'dine_in_only' || (restData.pickup_enabled !== false && restData.delivery_enabled === false)) {
                        resolvedServiceType = 'dine_in_only';
                    } else if (explicitSt === 'dine_in_and_delivery' || (tc.dine_in_enabled === true && !explicitSt)) {
                        resolvedServiceType = 'dine_in_and_delivery';
                    } else if (explicitSt === 'delivery_and_takeaway') {
                        resolvedServiceType = 'delivery_and_takeaway';
                    } else {
                        resolvedServiceType = 'delivery_and_takeaway';
                    }

                    let resolvedPrimary = tc.primary;
                    if (restData.theme) {
                        if (restData.theme.endsWith('-amber') || restData.theme.endsWith('-gold')) resolvedPrimary = '#d97706';
                        else if (restData.theme.endsWith('-rose') || restData.theme.endsWith('-red')) resolvedPrimary = '#e11d48';
                        else if (restData.theme.endsWith('-cyan')) resolvedPrimary = '#0284c7';
                        else if (restData.theme.endsWith('-violet') || restData.theme.endsWith('-purple')) resolvedPrimary = '#7c3aed';
                        else if (restData.theme.endsWith('-dark')) resolvedPrimary = '#0f172a';
                        else if (restData.theme.endsWith('-pink')) resolvedPrimary = '#ec4899';
                        else if (restData.theme.endsWith('-emerald') || restData.theme.endsWith('-green')) resolvedPrimary = '#059669';
                    }
                    if (!resolvedPrimary) resolvedPrimary = '#4f46e5';

                    setConfig({
                        theme30_bg_light: tc.theme30_bg_light || tc.theme28_bg_light || tc.bg_image_light || tc.bg_light || "",
                        theme30_bg_dark: tc.theme30_bg_dark || tc.theme28_bg_dark || tc.bg_image_dark || tc.bg_dark || "",
                        primary_color: resolvedPrimary,
                        theme30_default_view_mode: defaultViewMode,
                        theme30_show_stories: tc.theme30_show_stories !== false && tc.theme28_show_stories !== false,
                        service_type: resolvedServiceType,
                        theme30_popup: popup,
                        theme_colors: tc,
                        current_theme: restData.theme || "theme30",
                    });
                }
            } catch (err) {
                console.error("Error loading theme 30 settings:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isAr, ctxRestaurantId]);

    const handleSave = async (activateTheme = false) => {
        if (!restaurantId) return;
        setSaving(true);
        try {
            let tc = config.theme_colors || {};
            if (typeof tc === 'string') {
                try { tc = JSON.parse(tc); } catch { tc = {}; }
            }

            const isDeliveryOnly = config.service_type === 'delivery_only';
            const isDineInOnly = config.service_type === 'dine_in_only';
            const dineInEnabled = config.service_type === 'dine_in_and_delivery' || config.service_type === 'dine_in_only';
            const pickupEnabled = config.service_type !== 'delivery_only';
            const deliveryEnabled = config.service_type !== 'dine_in_only';

            const updatedThemeColors = {
                ...tc,
                primary: config.primary_color,
                theme30_bg_light: config.theme30_bg_light,
                theme30_bg_dark: config.theme30_bg_dark,
                theme28_bg_light: config.theme30_bg_light || tc.theme28_bg_light || "",
                theme28_bg_dark: config.theme30_bg_dark || tc.theme28_bg_dark || "",
                bg_image_light: config.theme30_bg_light || tc.bg_image_light || "",
                bg_image_dark: config.theme30_bg_dark || tc.bg_image_dark || "",
                theme30_default_view_mode: config.theme30_default_view_mode,
                theme30_show_stories: config.theme30_show_stories,
                theme30_service_type: config.service_type,
                service_type: config.service_type,
                dine_in_enabled: dineInEnabled,
                theme30_popup: config.theme30_popup,
            };

            const matchedPreset = COLOR_PRESETS.find(p => p.hex.toLowerCase() === config.primary_color.toLowerCase());
            let targetTheme = matchedPreset ? `theme30${matchedPreset.theme_suffix}` : 'theme30';
            if (!activateTheme && config.current_theme?.startsWith("theme30")) {
                targetTheme = matchedPreset ? `theme30${matchedPreset.theme_suffix}` : config.current_theme;
            }

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
            toast.success(isAr ? "تم حفظ إعدادات ثيم 30 بنجاح" : "Theme 30 settings saved successfully");
        } catch (err: any) {
            console.error("Error saving Theme 30 settings:", err);
            toast.error(err.message || (isAr ? "حدث خطأ أثناء الحفظ" : "Error occurred while saving"));
        } finally {
            setSaving(false);
        }
    };

    // Upload Background Image with auto-save
    const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
        const file = e.target.files?.[0];
        if (!file || !restaurantId) return;

        if (mode === 'light') setUploadingBgLight(true);
        else setUploadingBgDark(true);

        try {
            const result = await uploadImageWithThumb(file, `theme30/bg_${mode}_${Date.now()}`);
            if (result?.originalUrl) {
                const newUrl = result.originalUrl;
                if (mode === 'light') {
                    setConfig(prev => ({ ...prev, theme30_bg_light: newUrl }));
                } else {
                    setConfig(prev => ({ ...prev, theme30_bg_dark: newUrl }));
                }

                // Immediately persist to DB so user does not lose it if they exit without clicking save
                let tc = config.theme_colors || {};
                if (typeof tc === 'string') {
                    try { tc = JSON.parse(tc); } catch { tc = {}; }
                }
                const updatedThemeColors = {
                    ...tc,
                    ...(mode === 'light' ? {
                        theme30_bg_light: newUrl,
                        theme28_bg_light: newUrl,
                        bg_image_light: newUrl
                    } : {
                        theme30_bg_dark: newUrl,
                        theme28_bg_dark: newUrl,
                        bg_image_dark: newUrl
                    })
                };
                await supabase.from("restaurants").update({ theme_colors: updatedThemeColors }).eq("id", restaurantId);
                setConfig(prev => ({ ...prev, theme_colors: updatedThemeColors }));

                toast.success(isAr ? "تم رفع وحفظ صورة الخلفية بنجاح" : "Background uploaded & saved successfully");
            }
        } catch (err) {
            console.error(err);
            toast.error(isAr ? "فشل رفع الصورة" : "Failed to upload image");
        } finally {
            if (mode === 'light') setUploadingBgLight(false);
            else setUploadingBgDark(false);
        }
    };

    // Remove Background Image with auto-save
    const handleRemoveBg = async (mode: 'light' | 'dark') => {
        if (!restaurantId) return;
        if (mode === 'light') {
            setConfig(prev => ({ ...prev, theme30_bg_light: '' }));
        } else {
            setConfig(prev => ({ ...prev, theme30_bg_dark: '' }));
        }

        try {
            let tc = config.theme_colors || {};
            if (typeof tc === 'string') {
                try { tc = JSON.parse(tc); } catch { tc = {}; }
            }
            const updatedThemeColors = {
                ...tc,
                ...(mode === 'light' ? {
                    theme30_bg_light: '',
                    theme28_bg_light: '',
                    bg_image_light: ''
                } : {
                    theme30_bg_dark: '',
                    theme28_bg_dark: '',
                    bg_image_dark: ''
                })
            };
            await supabase.from("restaurants").update({ theme_colors: updatedThemeColors }).eq("id", restaurantId);
            setConfig(prev => ({ ...prev, theme_colors: updatedThemeColors }));
            toast.success(isAr ? "تم حذف صورة الخلفية بنجاح" : "Background removed successfully");
        } catch (err) {
            console.error("Remove bg error:", err);
        }
    };

    // Upload Popup Image
    const handleUploadPopupImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !restaurantId) return;

        setUploadingPopupImg(true);
        try {
            const result = await uploadImageWithThumb(file, `theme30/popup_${Date.now()}`);
            if (result?.originalUrl) {
                setConfig(prev => ({
                    ...prev,
                    theme30_popup: { ...prev.theme30_popup, image_url: result.originalUrl }
                }));
                toast.success(isAr ? "تم رفع صورة العرض الترويجي" : "Popup offer image uploaded");
            }
        } catch (err) {
            console.error(err);
            toast.error(isAr ? "فشل رفع الصورة" : "Failed to upload image");
        } finally {
            setUploadingPopupImg(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const isCurrentTheme30 = config.current_theme.startsWith("theme30");

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-1 relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/20">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isAr ? "ثيم أوبسيديان نيو-لوكس الفاخر" : "Obsidian Neo-Luxe Theme"}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                        {isAr ? "إعدادات ثيم 30 (أوبسيديان نيو-لوكس)" : "Theme 30 (Neo-Luxe) Settings"}
                    </h1>
                    <p className="text-sm text-indigo-200/80">
                        {isAr 
                            ? "تخصيص كامل لثيم 30: نوع الخدمة (صالة ودليفري / دليفري فقط)، الألوان، طريقة العرض، والخلفيات المخصصة" 
                            : "Customize Theme 30: service mode, colors, layout view, and luxury background images"}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 relative z-10 shrink-0">
                    {restaurantSlug && (
                        <Link 
                            href={`/menu/${restaurantSlug}?previewTheme=theme30`}
                            target="_blank"
                            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md border border-white/10"
                        >
                            <Eye className="w-4 h-4" />
                            <span>{isAr ? "معاينة مباشرة" : "Live Preview"}</span>
                        </Link>
                    )}

                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isAr ? "حفظ التعديلات" : "Save Settings"}</span>
                    </button>
                </div>
            </div>

            {/* Current Active Status Alert */}
            {!isCurrentTheme30 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400 font-bold">
                        <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>
                            {isAr 
                                ? "ثيم 30 ليس الثيم النشط حالياً في مطعمك. يمكنك ضبط إعداداته ثم تفعيله بضغطة واحدة." 
                                : "Theme 30 is not currently active on your menu. You can configure and activate it with one click."}
                        </span>
                    </div>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shrink-0 transition-all shadow-sm"
                    >
                        {isAr ? "تفعيل ثيم 30 الآن للمطعم" : "Activate Theme 30 Now"}
                    </button>
                </div>
            )}

            {/* 1. RESTAURANT SERVICE MODE (DINE-IN & DELIVERY VS DELIVERY ONLY) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                    <Utensils className="w-5 h-5 text-indigo-600" />
                    <div>
                        <h2 className="text-base font-black">
                            {isAr ? "نوع خدمة المطعم (صالة ودليفري أم دليفري فقط)" : "Restaurant Service Mode"}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            {isAr 
                                ? "حدد ما إذا كان المطعم يستقبل زبائن في الصالة ويقدم دليفري، أم أنه مخصص لطلبات الدليفري والتوصيل فقط. يظهر هذا الخيار في ترويسة المنيو ويتحكم في خيارات الطلب." 
                                : "Specify whether the restaurant offers dine-in & delivery or delivery only. Controls header badges and checkout options."}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, service_type: 'delivery_and_takeaway' }))}
                        className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 relative ${
                            config.service_type === 'delivery_and_takeaway'
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-black shadow-xs ring-2 ring-indigo-500'
                                : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                        }`}
                    >
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-black">{isAr ? "دليفري وتيك أواي (الافتراضي)" : "Delivery & Takeaway"}</span>
                                {config.service_type === 'delivery_and_takeaway' && (
                                    <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                        {isAr ? "محدد" : "Active"}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                {isAr 
                                    ? "إتاحة استلام الطلبات تيك أواي وتوصيل دليفري (بدون صالة داخلية)." 
                                    : "Takeaway & delivery orders enabled without dine-in."}
                            </p>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, service_type: 'dine_in_and_delivery' }))}
                        className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 relative ${
                            config.service_type === 'dine_in_and_delivery'
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-black shadow-xs ring-2 ring-indigo-500'
                                : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                        }`}
                    >
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                            <Utensils className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-black">{isAr ? "صالة وتيك أواي ودليفري" : "All Modes"}</span>
                                {config.service_type === 'dine_in_and_delivery' && (
                                    <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                        {isAr ? "محدد" : "Active"}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                {isAr 
                                    ? "إتاحة كافة الخيارات: تناول في الصالة، واستلام تيك أواي، وتوصيل دليفري." 
                                    : "All order options available: dine-in, takeaway, and delivery."}
                            </p>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, service_type: 'delivery_only' }))}
                        className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 relative ${
                            config.service_type === 'delivery_only'
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-black shadow-xs ring-2 ring-indigo-500'
                                : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                        }`}
                    >
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-black">{isAr ? "دليفري فقط" : "Delivery Only"}</span>
                                {config.service_type === 'delivery_only' && (
                                    <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                        {isAr ? "محدد" : "Active"}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                {isAr 
                                    ? "عرض شارة 'دليفري فقط' وقفل الطلبات على التوصيل حصراً." 
                                    : "Locks ordering strictly to delivery without takeaway or dine-in."}
                            </p>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, service_type: 'dine_in_only' }))}
                        className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 relative ${
                            config.service_type === 'dine_in_only'
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-black shadow-xs ring-2 ring-indigo-500'
                                : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                        }`}
                    >
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                            <Utensils className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-black">{isAr ? "صالة وتيك أواي فقط" : "Dine-in & Pickup"}</span>
                                {config.service_type === 'dine_in_only' && (
                                    <span className="text-[10px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full">
                                        {isAr ? "محدد" : "Active"}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                {isAr 
                                    ? "إتاحة الصالة والتيك أواي فقط بدون خدمة توصيل دليفري." 
                                    : "Dine-in and takeaway only without home delivery."}
                            </p>
                        </div>
                    </button>
                </div>
            </div>

            {/* 2. COLOR PALETTES */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                    <Palette className="w-5 h-5 text-indigo-600" />
                    <div>
                        <h2 className="text-base font-black">
                            {isAr ? "لون الهوية البصرية لثيم 30" : "Visual Identity Accent Color"}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            {isAr ? "اختر أحد الألوان الملوكية المعدة خصيصاً لثيم 30 لتمييز الأزرار والأسعار والترويسة" : "Choose a signature color preset for buttons and accents"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {COLOR_PRESETS.map((p) => {
                        const isSelected = config.primary_color === p.hex;
                        return (
                            <button
                                key={p.hex}
                                type="button"
                                onClick={() => {
                                    setConfig(prev => ({
                                        ...prev,
                                        primary_color: p.hex,
                                        current_theme: `theme30${p.theme_suffix}`
                                    }));
                                }}
                                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 relative ${
                                    isSelected 
                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-black shadow-xs ring-2 ring-indigo-500' 
                                        : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <span 
                                    className="w-6 h-6 rounded-xl shrink-0 shadow-xs flex items-center justify-center" 
                                    style={{ backgroundColor: p.hex }}
                                >
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-black truncate">{isAr ? p.name_ar : p.name_en}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.hex}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. LAYOUT & STORIES BAR */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <div>
                        <h2 className="text-base font-black">
                            {isAr ? "طريقة العرض الافتراضية وشريط الستوري" : "Layout Mode & Stories Bar"}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            {isAr ? "حدد الشكل المفضل لعرض الأصناف للعميل لأول مرة عند فتح المنيو" : "Choose initial layout style when customers open the menu"}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, theme30_default_view_mode: 'grid' }))}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                                config.theme30_default_view_mode === 'grid'
                                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-black shadow-xs ring-1 ring-indigo-500'
                                    : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <LayoutGrid className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-black">{isAr ? "شبكة عصرية (Grid)" : "Grid (2 Columns)"}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "للأطباق والحلويات" : "Best for dishes & photos"}</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, theme30_default_view_mode: 'list' }))}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                                config.theme30_default_view_mode === 'list'
                                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-black shadow-xs ring-1 ring-indigo-500'
                                    : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <LayoutList className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-black">{isAr ? "قائمة تفصيلية (List)" : "Detailed List"}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "للمشروبات والمقبلات" : "Horizontal cards"}</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, theme30_default_view_mode: 'compact' }))}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                                config.theme30_default_view_mode === 'compact'
                                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-black shadow-xs ring-1 ring-indigo-500'
                                    : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <AlignJustify className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-black">{isAr ? "عرض مكثف (Compact)" : "Compact Rows"}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? "للمنيوهات الكبيرة 100+" : "Dense rows for speed"}</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, theme30_default_view_mode: 'showcase' }))}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                                config.theme30_default_view_mode === 'showcase'
                                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 font-black shadow-xs ring-1 ring-indigo-500'
                                    : 'border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <Maximize2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
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
                            checked={config.theme30_show_stories}
                            onChange={(e) => setConfig(prev => ({ ...prev, theme30_show_stories: e.target.checked }))}
                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* 4. BACKGROUND IMAGES (Light & Dark) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                    <ImagePlus className="w-5 h-5 text-indigo-600" />
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
                            {config.theme30_bg_light && (
                                <button
                                    onClick={() => handleRemoveBg('light')}
                                    className="text-[11px] text-rose-500 hover:underline flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    {isAr ? "حذف" : "Remove"}
                                </button>
                            )}
                        </div>

                        {config.theme30_bg_light ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden shadow-xs border">
                                <img src={config.theme30_bg_light} alt="Light BG" className="w-full h-full object-cover" />
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
                            {config.theme30_bg_dark && (
                                <button
                                    onClick={() => handleRemoveBg('dark')}
                                    className="text-[11px] text-rose-500 hover:underline flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    {isAr ? "حذف" : "Remove"}
                                </button>
                            )}
                        </div>

                        {config.theme30_bg_dark ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden shadow-xs border">
                                <img src={config.theme30_bg_dark} alt="Dark BG" className="w-full h-full object-cover" />
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

            {/* 5. POPUP OFFER */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Megaphone className="w-5 h-5 text-indigo-600" />
                        <div>
                            <h2 className="text-base font-black">
                                {isAr ? "النافذة المنبثقة للعروض (Pop-up)" : "Promotional Offer Pop-up"}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                {isAr ? "نافذة ترويجية جذابة تظهر للعميل عند فتح المنيو لترويج صنف أو خصم مميز" : "Engaging popup shown to visitors on menu open"}
                            </p>
                        </div>
                    </div>

                    <input 
                        type="checkbox"
                        checked={config.theme30_popup.enabled}
                        onChange={(e) => setConfig(prev => ({
                            ...prev,
                            theme30_popup: { ...prev.theme30_popup, enabled: e.target.checked }
                        }))}
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                </div>

                {config.theme30_popup.enabled && (
                    <div className="pt-4 border-t border-black/5 dark:border-white/10 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    {isAr ? "عنوان العرض الترويجي" : "Offer Title"}
                                </label>
                                <input 
                                    type="text" 
                                    value={config.theme30_popup.title}
                                    onChange={(e) => setConfig(prev => ({
                                        ...prev,
                                        theme30_popup: { ...prev.theme30_popup, title: e.target.value }
                                    }))}
                                    placeholder={isAr ? "مثال: عرض خاص لا يفوتك!" : "e.g. Special Offer!"}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs font-bold focus:border-indigo-600 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    {isAr ? "نص الزر" : "Button Text"}
                                </label>
                                <input 
                                    type="text" 
                                    value={config.theme30_popup.button_text}
                                    onChange={(e) => setConfig(prev => ({
                                        ...prev,
                                        theme30_popup: { ...prev.theme30_popup, button_text: e.target.value }
                                    }))}
                                    placeholder={isAr ? "مثال: اطلب الآن / تصفح العرض" : "e.g. Order Now"}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs font-bold focus:border-indigo-600 outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                {isAr ? "وصف العرض أو كود الخصم" : "Description / Details"}
                            </label>
                            <textarea 
                                value={config.theme30_popup.description}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    theme30_popup: { ...prev.theme30_popup, description: e.target.value }
                                }))}
                                rows={2}
                                placeholder={isAr ? "تفاصيل الوجبة أو العرض..." : "Offer details..."}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs font-bold focus:border-indigo-600 outline-none resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    {isAr ? "الانتقال لقسم محدد (اختياري)" : "Target Category (Optional)"}
                                </label>
                                <select
                                    value={config.theme30_popup.target_category_id}
                                    onChange={(e) => setConfig(prev => ({
                                        ...prev,
                                        theme30_popup: { ...prev.theme30_popup, target_category_id: e.target.value }
                                    }))}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs font-bold focus:border-indigo-600 outline-none"
                                >
                                    <option value="">{isAr ? "-- بدون توجيه --" : "-- No Redirect --"}</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {isAr ? c.name_ar : c.name_en || c.name_ar}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    {isAr ? "صورة العرض الترويجي" : "Popup Image"}
                                </label>
                                <div className="flex items-center gap-2">
                                    <label className="flex-1">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={handleUploadPopupImg}
                                            disabled={uploadingPopupImg}
                                        />
                                        <div className="w-full py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-center text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer shadow-xs">
                                            {uploadingPopupImg ? isAr ? "جاري الرفع..." : "Uploading..." : isAr ? "رفع صورة العرض" : "Upload Image"}
                                        </div>
                                    </label>
                                    {config.theme30_popup.image_url && (
                                        <button
                                            type="button"
                                            onClick={() => setConfig(prev => ({
                                                ...prev,
                                                theme30_popup: { ...prev.theme30_popup, image_url: '' }
                                            }))}
                                            className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900"
                                            title={isAr ? "حذف الصورة" : "Delete Image"}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Floating Save Bar */}
            <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-xl flex items-center justify-between gap-4">
                <div className="text-xs text-slate-500 dark:text-zinc-400 font-bold">
                    {isAr 
                        ? `حالة الثيم: ${isCurrentTheme30 ? "ثيم 30 مفعّل حالياً للمطعم" : "ثيم آخر مفعل حالياً"}` 
                        : `Status: ${isCurrentTheme30 ? "Theme 30 is active" : "Another theme active"}`}
                </div>

                <div className="flex items-center gap-2.5">
                    {!isCurrentTheme30 && (
                        <button
                            type="button"
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all"
                        >
                            {isAr ? "حفظ وتفعيل ثيم 30" : "Save & Activate"}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isAr ? "حفظ الإعدادات" : "Save Settings"}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
