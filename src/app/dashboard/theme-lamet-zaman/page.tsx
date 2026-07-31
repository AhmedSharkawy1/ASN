"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { Save, Loader2, ImagePlus, Trash2, Sun, Moon, Palette, Eye } from "lucide-react";
import { uploadImageWithThumb } from "@/lib/uploadImage";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { posDb } from "@/lib/pos-db";
import Link from "next/link";

interface LametZamanConfig {
    lamet_zaman_bg_light: string;
    lamet_zaman_bg_dark: string;
    primary_color: string;
    theme_colors: any;
    current_theme: string;
}

const COLOR_PRESETS = [
    { name_ar: "برتقالي (الأصلي)", name_en: "Orange (Original)", hex: "#f97316" },
    { name_ar: "أحمر", name_en: "Red", hex: "#ef4444" },
    { name_ar: "زمردي", name_en: "Emerald", hex: "#10b981" },
    { name_ar: "سماوي", name_en: "Cyan", hex: "#06b6d4" },
    { name_ar: "أزرق sky", name_en: "Sky", hex: "#0284c7" },
    { name_ar: "بنفسجي", name_en: "Purple", hex: "#8b5cf6" },
    { name_ar: "ذهبي", name_en: "Gold", hex: "#d4af37" },
    { name_ar: "وردي", name_en: "Pink", hex: "#ec4899" },
    { name_ar: "داكن", name_en: "Dark", hex: "#1e293b" },
];

export default function ThemeLametZamanSettings() {
    const { language } = useLanguage();
    const isAr = language === "ar";
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingBgLight, setUploadingBgLight] = useState(false);
    const [uploadingBgDark, setUploadingBgDark] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    const [config, setConfig] = useState<LametZamanConfig>({
        lamet_zaman_bg_light: "",
        lamet_zaman_bg_dark: "",
        primary_color: "#f97316",
        theme_colors: {},
        current_theme: "lamet-zaman-bg",
    });

    useEffect(() => {
        const loadConfig = async () => {
            try {
                let rId = null;
                try {
                    const cached = await posDb.settings.get('current_config');
                    if (cached?.restaurant_id) rId = cached.restaurant_id;
                } catch (e) {
                    console.warn("Could not read posDb cache:", e);
                }

                if (!rId) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const imp = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;
                        if (imp) {
                            rId = imp;
                        } else {
                            const { data: rest } = await supabase.from('restaurants').select('id').eq('email', user.email).maybeSingle();
                            if (rest) {
                                rId = rest.id;
                            } else {
                                const { data: staff } = await supabase.from('team_members').select('restaurant_id').eq('auth_id', user.id).maybeSingle();
                                if (staff) rId = staff.restaurant_id;
                            }
                        }
                    }
                }

                if (!rId) {
                    toast.error(isAr ? "تعذر تحميل بيانات المطعم." : "Could not load restaurant data.");
                    setLoading(false);
                    return;
                }
                
                setRestaurantId(rId);

                const { data, error } = await supabase
                    .from("restaurants")
                    .select("theme, theme_colors")
                    .eq("id", rId)
                    .single();

                if (error && error.code !== "PGRST116") throw error;
                if (data) {
                    let tc = data.theme_colors || {};
                    if (typeof tc === 'string') {
                        try { tc = JSON.parse(tc); } catch { tc = {}; }
                    }
                    setConfig({
                        lamet_zaman_bg_light: tc.lamet_zaman_bg_light || tc.bg_image_light || tc.aswan_bg_light || "",
                        lamet_zaman_bg_dark: tc.lamet_zaman_bg_dark || tc.bg_image_dark || tc.aswan_bg_dark || "",
                        primary_color: tc.primary || "#f97316",
                        theme_colors: tc,
                        current_theme: data.theme || "lamet-zaman-bg",
                    });
                }
            } catch (err: any) {
                console.error("Error loading Lamet Zaman config:", err);
                toast.error(isAr ? "فشل تحميل الإعدادات" : "Failed to load settings");
            } finally {
                setLoading(false);
            }
        };

        loadConfig();
    }, [isAr]);

    const handleSave = async () => {
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
                lamet_zaman_bg_light: config.lamet_zaman_bg_light,
                lamet_zaman_bg_dark: config.lamet_zaman_bg_dark,
                bg_image_light: config.lamet_zaman_bg_light,
                bg_image_dark: config.lamet_zaman_bg_dark,
                aswan_bg_light: config.lamet_zaman_bg_light,
                aswan_bg_dark: config.lamet_zaman_bg_dark,
            };

            const targetTheme = config.current_theme.startsWith("lamet-zaman") ? config.current_theme : "lamet-zaman-bg";

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

            toast.success(isAr ? "تم حفظ إعدادات ثيم لمة زمان بنجاح" : "Lamet Zaman Theme settings saved successfully");
        } catch (err: any) {
            console.error("Error saving:", err);
            toast.error(err.message || (isAr ? "حدث خطأ أثناء الحفظ" : "Error occurred while saving"));
        } finally {
            setSaving(false);
        }
    };

    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (mode === 'light') setUploadingBgLight(true);
        else setUploadingBgDark(true);

        try {
            const result = await uploadImageWithThumb(file, `lamet_zaman/bg_${mode}_${Date.now()}`);
            if (result && result.originalUrl) {
                if (mode === 'light') {
                    setConfig(prev => ({ ...prev, lamet_zaman_bg_light: result.originalUrl }));
                } else {
                    setConfig(prev => ({ ...prev, lamet_zaman_bg_dark: result.originalUrl }));
                }
                toast.success(isAr ? "تم رفع صورة الخلفية بنجاح" : "Background image uploaded successfully");
            }
        } catch (err) {
            console.error("Background upload failed:", err);
            toast.error(isAr ? "فشل رفع الصورة" : "Failed to upload image");
        } finally {
            if (mode === 'light') setUploadingBgLight(false);
            else setUploadingBgDark(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8" dir={isAr ? "rtl" : "ltr"}>
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-6 rounded-2xl border border-orange-500/20">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30">
                            <Palette className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                            {isAr ? "إعدادات ثيم لمة زمان (خلفية صورة)" : "Lamet Zaman BG Theme Settings"}
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium">
                        {isAr ? "تخصيص ثيم لمة زمان وإضافة صور خلفية مخصصة للوضع النهاري والليلي مثل ثيم أسوان." : "Customize Lamet Zaman theme with custom background images for light and dark modes."}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {restaurantId && (
                        <Link 
                            href={`/menu/${restaurantId}?previewTheme=lamet-zaman-bg`}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-bold hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <Eye className="w-4 h-4 text-orange-500" />
                            <span>{isAr ? "معاينة المنيو" : "Preview Menu"}</span>
                        </Link>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>{isAr ? "حفظ التغييرات" : "Save Changes"}</span>
                    </button>
                </div>
            </div>

            {/* Background Images Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <ImagePlus className="w-5 h-5 text-orange-500" />
                        {isAr ? "صور خلفية المنيو (مثل ثيم أسوان)" : "Menu Background Images"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {isAr ? "يمكنك رفع صورة خلفية مخصصة للوضع النهاري وصورة أخرى للوضع الليلي." : "Upload custom background images for light mode and dark mode."}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Light Mode Background */}
                    <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-700/50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                <Sun className="w-4 h-4 text-amber-500" />
                                {isAr ? "خلفية الوضع النهاري (Light Mode)" : "Light Mode Background"}
                            </span>
                            {config.lamet_zaman_bg_light && (
                                <button
                                    onClick={() => setConfig({ ...config, lamet_zaman_bg_light: "" })}
                                    className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {isAr ? "حذف" : "Remove"}
                                </button>
                            )}
                        </div>

                        {config.lamet_zaman_bg_light ? (
                            <div className="relative h-44 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-900 group">
                                <img src={config.lamet_zaman_bg_light} alt="Light BG" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <label className="cursor-pointer bg-white/90 hover:bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow">
                                        {isAr ? "تغيير الصورة" : "Change Image"}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleBgUpload(e, 'light')} />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-white dark:bg-zinc-800/60">
                                {uploadingBgLight ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                ) : (
                                    <>
                                        <ImagePlus className="w-8 h-8 text-slate-400 dark:text-zinc-500 mb-2" />
                                        <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">
                                            {isAr ? "اضغط لرفع صورة خلفية للوضع النهاري" : "Click to upload Light Mode BG"}
                                        </span>
                                    </>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleBgUpload(e, 'light')} disabled={uploadingBgLight} />
                            </label>
                        )}
                    </div>

                    {/* Dark Mode Background */}
                    <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-700/50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                <Moon className="w-4 h-4 text-indigo-400" />
                                {isAr ? "خلفية الوضع الليلي (Dark Mode)" : "Dark Mode Background"}
                            </span>
                            {config.lamet_zaman_bg_dark && (
                                <button
                                    onClick={() => setConfig({ ...config, lamet_zaman_bg_dark: "" })}
                                    className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {isAr ? "حذف" : "Remove"}
                                </button>
                            )}
                        </div>

                        {config.lamet_zaman_bg_dark ? (
                            <div className="relative h-44 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-900 group">
                                <img src={config.lamet_zaman_bg_dark} alt="Dark BG" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <label className="cursor-pointer bg-white/90 hover:bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow">
                                        {isAr ? "تغيير الصورة" : "Change Image"}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleBgUpload(e, 'dark')} />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-white dark:bg-zinc-800/60">
                                {uploadingBgDark ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                ) : (
                                    <>
                                        <ImagePlus className="w-8 h-8 text-slate-400 dark:text-zinc-500 mb-2" />
                                        <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">
                                            {isAr ? "اضغط لرفع صورة خلفية للوضع الليلي" : "Click to upload Dark Mode BG"}
                                        </span>
                                    </>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleBgUpload(e, 'dark')} disabled={uploadingBgDark} />
                            </label>
                        )}
                    </div>
                </div>
            </div>

            {/* Primary Color Selection */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Palette className="w-5 h-5 text-orange-500" />
                        {isAr ? "اللون الرئيسي للثيم" : "Primary Accent Color"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {isAr ? "اختر اللون الأساسي للأزرار والأيقونات داخل ثيم لمة زمان." : "Select the primary color for buttons and highlights."}
                    </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
                    {COLOR_PRESETS.map(preset => (
                        <button
                            key={preset.hex}
                            onClick={() => setConfig({ ...config, primary_color: preset.hex })}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                config.primary_color === preset.hex 
                                    ? "border-orange-500 bg-orange-500/10 scale-105 shadow-md" 
                                    : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                            }`}
                        >
                            <div className="w-8 h-8 rounded-full shadow-inner border border-white/20" style={{ backgroundColor: preset.hex }} />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 truncate w-full text-center">
                                {isAr ? preset.name_ar : preset.name_en}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
