"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { 
    Save, Loader2, ImagePlus, Trash2, Sun, Moon, Palette, Eye, 
    Sparkles, Megaphone, Link2, Plus, X, Layers
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

interface Theme27PopupConfig {
    enabled: boolean;
    title: string;
    description: string;
    image_url: string;
    button_text: string;
    target_category_id: string;
}

interface Theme27Config {
    theme27_bg_light: string;
    theme27_bg_dark: string;
    primary_color: string;
    theme27_popup: Theme27PopupConfig;
    theme27_category_addons: Record<string, string>; // { [parentCatId]: addonsCatId }
    theme_colors: any;
    current_theme: string;
}

const COLOR_PRESETS = [
    { name_ar: "برتقالي (الأساسي)", name_en: "Orange (Original)", hex: "#f97316" },
    { name_ar: "أحمر", name_en: "Red", hex: "#ef4444" },
    { name_ar: "زمردي", name_en: "Emerald", hex: "#10b981" },
    { name_ar: "سماوي", name_en: "Cyan", hex: "#06b6d4" },
    { name_ar: "أزرق sky", name_en: "Sky", hex: "#0284c7" },
    { name_ar: "بنفسجي", name_en: "Purple", hex: "#8b5cf6" },
    { name_ar: "ذهبي", name_en: "Gold", hex: "#d4af37" },
    { name_ar: "وردي", name_en: "Pink", hex: "#ec4899" },
    { name_ar: "داكن", name_en: "Dark", hex: "#1e293b" },
];

export default function Theme27SettingsPage() {
    const { language } = useLanguage();
    const isAr = language === "ar";
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingBgLight, setUploadingBgLight] = useState(false);
    const [uploadingBgDark, setUploadingBgDark] = useState(false);
    const [uploadingPopupImg, setUploadingPopupImg] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [categories, setCategories] = useState<CategoryItem[]>([]);

    // Category add-ons linking inputs
    const [selectedParentCatId, setSelectedParentCatId] = useState<string>("");
    const [selectedAddonsCatId, setSelectedAddonsCatId] = useState<string>("");

    const [config, setConfig] = useState<Theme27Config>({
        theme27_bg_light: "",
        theme27_bg_dark: "",
        primary_color: "#f97316",
        theme27_popup: {
            enabled: false,
            title: "",
            description: "",
            image_url: "",
            button_text: isAr ? "تصفح العرض" : "View Offer",
            target_category_id: ""
        },
        theme27_category_addons: {},
        theme_colors: {},
        current_theme: "lamet-zaman-compact",
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

                // Fetch categories for mapping
                const { data: catsData } = await supabase
                    .from('categories')
                    .select('id, name_ar, name_en')
                    .eq('restaurant_id', rId)
                    .order('sort_order', { ascending: true });

                if (catsData) {
                    setCategories(catsData);
                    if (catsData.length > 0) {
                        setSelectedParentCatId(catsData[0].id);
                        if (catsData.length > 1) {
                            setSelectedAddonsCatId(catsData[1].id);
                        } else {
                            setSelectedAddonsCatId(catsData[0].id);
                        }
                    }
                }

                // Fetch restaurant theme config
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

                    const popup = tc.theme27_popup || {
                        enabled: false,
                        title: "",
                        description: "",
                        image_url: "",
                        button_text: isAr ? "تصفح العرض" : "View Offer",
                        target_category_id: ""
                    };

                    const catAddons = tc.theme27_category_addons || {};

                    setConfig({
                        theme27_bg_light: tc.theme27_bg_light || tc.lamet_zaman_bg_light || tc.bg_image_light || "",
                        theme27_bg_dark: tc.theme27_bg_dark || tc.lamet_zaman_bg_dark || tc.bg_image_dark || "",
                        primary_color: tc.primary || "#f97316",
                        theme27_popup: popup,
                        theme27_category_addons: catAddons,
                        theme_colors: tc,
                        current_theme: data.theme || "lamet-zaman-compact",
                    });
                }
            } catch (err: any) {
                console.error("Error loading Theme 27 config:", err);
                toast.error(isAr ? "فشل تحميل الإعدادات" : "Failed to load settings");
            } finally {
                setLoading(false);
            }
        };

        loadData();
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
                theme27_bg_light: config.theme27_bg_light,
                theme27_bg_dark: config.theme27_bg_dark,
                theme27_popup: config.theme27_popup,
                theme27_category_addons: config.theme27_category_addons,
            };

            const targetTheme = config.current_theme?.startsWith("lamet-zaman-compact") || config.current_theme?.startsWith("theme27")
                ? config.current_theme
                : "lamet-zaman-compact";

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

            toast.success(isAr ? "تم حفظ إعدادات ثيم 27 بنجاح" : "Theme 27 settings saved successfully");
        } catch (err: any) {
            console.error("Error saving Theme 27 settings:", err);
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
            const result = await uploadImageWithThumb(file, `theme27/bg_${mode}_${Date.now()}`);
            if (result && result.originalUrl) {
                if (mode === 'light') {
                    setConfig(prev => ({ ...prev, theme27_bg_light: result.originalUrl }));
                } else {
                    setConfig(prev => ({ ...prev, theme27_bg_dark: result.originalUrl }));
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

    const handlePopupImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPopupImg(true);
        try {
            const result = await uploadImageWithThumb(file, `theme27/popup_${Date.now()}`);
            if (result && result.originalUrl) {
                setConfig(prev => ({
                    ...prev,
                    theme27_popup: {
                        ...prev.theme27_popup,
                        image_url: result.originalUrl
                    }
                }));
                toast.success(isAr ? "تم رفع صورة العرض الترويجي بنجاح" : "Offer image uploaded successfully");
            }
        } catch (err) {
            console.error("Popup image upload failed:", err);
            toast.error(isAr ? "فشل رفع صورة العرض" : "Failed to upload offer image");
        } finally {
            setUploadingPopupImg(false);
        }
    };

    const handleAddCategoryLink = () => {
        if (!selectedParentCatId || !selectedAddonsCatId) {
            toast.error(isAr ? "يرجى اختيار القسم الأساسي وقسم الإضافات" : "Please select parent and addons categories");
            return;
        }

        if (selectedParentCatId === selectedAddonsCatId) {
            toast.error(isAr ? "لا يمكن ربط القسم بنفسه كقسم إضافات" : "Cannot link category to itself as addons");
            return;
        }

        setConfig(prev => ({
            ...prev,
            theme27_category_addons: {
                ...prev.theme27_category_addons,
                [selectedParentCatId]: selectedAddonsCatId
            }
        }));

        toast.success(isAr ? "تمت إضافة ربط القسم بالإضافات" : "Category addon link added");
    };

    const handleRemoveCategoryLink = (parentCatId: string) => {
        setConfig(prev => {
            const copy = { ...prev.theme27_category_addons };
            delete copy[parentCatId];
            return {
                ...prev,
                theme27_category_addons: copy
            };
        });
        toast.info(isAr ? "تم إزالة الربط" : "Link removed");
    };

    const getCatName = (catId: string) => {
        const cat = categories.find(c => c.id === catId);
        if (!cat) return catId;
        return isAr ? (cat.name_ar || cat.name_en) : (cat.name_en || cat.name_ar);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border border-orange-500/20 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {isAr ? "إعدادات ثيم 27 للمنيوهات الكبيرة" : "Theme 27 Large Menus Settings"}
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                                {isAr ? "تخصيص خلفيات الثيم، نافذة العروض الترويجية (Popup)، وربط أقسام الإضافات التلقائية بالأصناف." : "Customize backgrounds, promotional pop-up, and category add-on options."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {restaurantId && (
                        <Link 
                            href={`/menu/${restaurantId}?previewTheme=lamet-zaman-compact`}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-bold hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                        >
                            <Eye className="w-4 h-4 text-orange-500" />
                            <span>{isAr ? "معاينة ثيم 27" : "Preview Theme 27"}</span>
                        </Link>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>{isAr ? "حفظ الإعدادات" : "Save Settings"}</span>
                    </button>
                </div>
            </div>

            {/* SECTION 1: صور الخلفية (Background Images) */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <ImagePlus className="w-5 h-5 text-orange-500" />
                        {isAr ? "صور خلفية المنيو (ثيم 27)" : "Theme 27 Background Images"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {isAr ? "يمكنك رفع صورة خلفية مخصصة للوضع النهاري وصورة أخرى للوضع الليلي لإعطاء المنيو هوية فاخرة." : "Upload custom background images for light and dark modes."}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Light Mode Background */}
                    <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-700/50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                <Sun className="w-4 h-4 text-amber-500" />
                                {isAr ? "خلفية الوضع النهاري (Light Mode)" : "Light Mode Background"}
                            </span>
                            {config.theme27_bg_light && (
                                <button
                                    onClick={() => setConfig({ ...config, theme27_bg_light: "" })}
                                    className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {isAr ? "حذف" : "Remove"}
                                </button>
                            )}
                        </div>

                        {config.theme27_bg_light ? (
                            <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-900 group">
                                <img src={config.theme27_bg_light} alt="Light BG" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <label className="cursor-pointer bg-white/90 hover:bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow">
                                        {isAr ? "تغيير الصورة" : "Change Image"}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleBgUpload(e, 'light')} />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-orange-500 transition-colors bg-white dark:bg-zinc-800/60">
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
                    <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-700/50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                <Moon className="w-4 h-4 text-indigo-400" />
                                {isAr ? "خلفية الوضع الليلي (Dark Mode)" : "Dark Mode Background"}
                            </span>
                            {config.theme27_bg_dark && (
                                <button
                                    onClick={() => setConfig({ ...config, theme27_bg_dark: "" })}
                                    className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {isAr ? "حذف" : "Remove"}
                                </button>
                            )}
                        </div>

                        {config.theme27_bg_dark ? (
                            <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-900 group">
                                <img src={config.theme27_bg_dark} alt="Dark BG" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <label className="cursor-pointer bg-white/90 hover:bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow">
                                        {isAr ? "تغيير الصورة" : "Change Image"}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleBgUpload(e, 'dark')} />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-orange-500 transition-colors bg-white dark:bg-zinc-800/60">
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

            {/* SECTION 2: نافذة العروض الترويجية (Promotional Pop-up) */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-orange-500" />
                            {isAr ? "نافذة العروض الترويجية (Pop-up)" : "Promotional Offer Pop-up"}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                            {isAr ? "نافذة منبثقة جذابة تظهر للعملاء عند فتح المنيو لتسليط الضوء على عروضك الخاصة أو خصومات اليوم." : "Interactive popup shown to customers when entering the menu."}
                        </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={config.theme27_popup.enabled}
                            onChange={(e) => setConfig({
                                ...config,
                                theme27_popup: {
                                    ...config.theme27_popup,
                                    enabled: e.target.checked
                                }
                            })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        <span className="ms-3 text-sm font-bold text-slate-900 dark:text-white">
                            {config.theme27_popup.enabled ? (isAr ? "مفعلة" : "Enabled") : (isAr ? "معطلة" : "Disabled")}
                        </span>
                    </label>
                </div>

                {config.theme27_popup.enabled && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                        {/* Form Inputs */}
                        <div className="lg:col-span-7 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                                    {isAr ? "عنوان العرض الترويجي" : "Offer Title"}
                                </label>
                                <input
                                    type="text"
                                    value={config.theme27_popup.title}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        theme27_popup: {
                                            ...config.theme27_popup,
                                            title: e.target.value
                                        }
                                    })}
                                    placeholder={isAr ? "مثال: خصم 20% على جميع أنواع البيتزا اليوم!" : "e.g. 20% Off All Pizzas Today!"}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                                    {isAr ? "تفاصيل ووصف العرض" : "Offer Description / Details"}
                                </label>
                                <textarea
                                    rows={3}
                                    value={config.theme27_popup.description}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        theme27_popup: {
                                            ...config.theme27_popup,
                                            description: e.target.value
                                        }
                                    })}
                                    placeholder={isAr ? "مثال: اطلب أي بيتزا حجم كبير أو عائلي واحصل على بيبسي وبطاطس هدية لفترة محدودة." : "e.g. Order any large pizza and get a complimentary soft drink and fries."}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                                />
                            </div>

                            {/* Button text & Target category */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                                        {isAr ? "نص زر الإجراء (CTA)" : "Button Text"}
                                    </label>
                                    <input
                                        type="text"
                                        value={config.theme27_popup.button_text}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            theme27_popup: {
                                                ...config.theme27_popup,
                                                button_text: e.target.value
                                            }
                                        })}
                                        placeholder={isAr ? "تصفح العرض" : "View Offer"}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                                        {isAr ? "القسم المرتبط (الانتقال السريع)" : "Target Category"}
                                    </label>
                                    <select
                                        value={config.theme27_popup.target_category_id || ""}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            theme27_popup: {
                                                ...config.theme27_popup,
                                                target_category_id: e.target.value
                                            }
                                        })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    >
                                        <option value="">{isAr ? "-- إغلاق النافذة فقط --" : "-- Just Dismiss --"}</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {isAr ? (cat.name_ar || cat.name_en) : (cat.name_en || cat.name_ar)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                                    {isAr ? "صورة العرض الترويجي (اختياري)" : "Offer Banner Image (Optional)"}
                                </label>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 font-bold text-xs cursor-pointer border border-orange-200 dark:border-orange-500/30 transition-colors">
                                        {uploadingPopupImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                                        <span>{isAr ? "رفع صورة للعرض" : "Upload Offer Image"}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePopupImgUpload} disabled={uploadingPopupImg} />
                                    </label>
                                    {config.theme27_popup.image_url && (
                                        <button
                                            onClick={() => setConfig({
                                                ...config,
                                                theme27_popup: { ...config.theme27_popup, image_url: "" }
                                            })}
                                            className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            {isAr ? "إزالة الصورة" : "Remove"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Live Preview Card */}
                        <div className="lg:col-span-5 bg-slate-100 dark:bg-zinc-800/60 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700 flex flex-col justify-center">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-2 block uppercase text-center">
                                {isAr ? "معاينة حية لشكل البوب اب للعملاء" : "Live Customer Preview"}
                            </span>

                            <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-zinc-700 max-w-sm mx-auto w-full">
                                {config.theme27_popup.image_url ? (
                                    <div className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-zinc-800">
                                        <img src={config.theme27_popup.image_url} alt="Offer Preview" className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                                            <X className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex justify-between items-center">
                                        <span className="text-xs font-black flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            {isAr ? "عرض مميز" : "Special Offer"}
                                        </span>
                                        <div className="bg-white/20 rounded-full p-1">
                                            <X className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 space-y-2.5 text-center">
                                    <h3 className="font-black text-base text-slate-900 dark:text-white leading-snug">
                                        {config.theme27_popup.title || (isAr ? "عنوان العرض الترويجي" : "Promotional Offer Title")}
                                    </h3>
                                    {config.theme27_popup.description && (
                                        <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-3 leading-relaxed">
                                            {config.theme27_popup.description}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        className="w-full py-2 px-4 rounded-xl text-xs font-black text-white shadow-md transition-transform active:scale-95"
                                        style={{ backgroundColor: config.primary_color }}
                                    >
                                        {config.theme27_popup.button_text || (isAr ? "تصفح العرض" : "View Offer")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION 3: ربط الأقسام بالإضافات (Category Add-ons Linking) */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-orange-500" />
                        {isAr ? "ربط الأقسام بالإضافات (Category Add-ons Linking)" : "Category Add-on Linking"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {isAr 
                            ? "حدد القسم الأساسي (مثل قسم البيتزا) وقسم الإضافات التابع له (مثل قسم إضافات البيتزا والصوصات). عندما يختار العميل أي صنف من هذا القسم، ستظهر له أصناف قسم الإضافات ليختار منها إضافات مباشرة."
                            : "Link a menu category (e.g. Pizza) to an add-ons category (e.g. Pizza Extras). Items from the add-on category will be offered automatically."}
                    </p>
                </div>

                {/* Linking Creator Bar */}
                <div className="bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-700/50 space-y-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                        {isAr ? "إضافة ربط قسم جديد بقسم إضافات:" : "Add New Category Link:"}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-5">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1 block">
                                {isAr ? "القسم الأساسي (مثلاً: البيتزا)" : "Parent Category (e.g. Pizza)"}
                            </label>
                            <select
                                value={selectedParentCatId}
                                onChange={(e) => setSelectedParentCatId(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {isAr ? (c.name_ar || c.name_en) : (c.name_en || c.name_ar)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-1 text-center font-bold text-slate-400 dark:text-zinc-500 text-lg flex items-center justify-center">
                            ⬅️
                        </div>

                        <div className="sm:col-span-4">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1 block">
                                {isAr ? "قسم الإضافات التابع له (مثلاً: إضافات البيتزا)" : "Add-ons Category"}
                            </label>
                            <select
                                value={selectedAddonsCatId}
                                onChange={(e) => setSelectedAddonsCatId(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {isAr ? (c.name_ar || c.name_en) : (c.name_en || c.name_ar)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2 pt-4 sm:pt-0">
                            <button
                                type="button"
                                onClick={handleAddCategoryLink}
                                className="w-full py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                <span>{isAr ? "ربط القسمين" : "Link"}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Existing Links List */}
                <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                        {isAr ? "الأقسام المربوطة حالياً بالإضافات:" : "Currently Linked Categories:"}
                    </span>

                    {Object.keys(config.theme27_category_addons).length === 0 ? (
                        <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                            <Layers className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                                {isAr ? "لم يتم ربط أي قسم بإضافات حتى الآن. اختر قسماً وقسم إضافات من الأعلى واضغط على (ربط القسمين)." : "No categories linked yet. Select categories above to link."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(config.theme27_category_addons).map(([parentCatId, addonsCatId]) => (
                                <div
                                    key={parentCatId}
                                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-3 shadow-sm"
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <div className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-xs truncate max-w-[45%]">
                                            {getCatName(parentCatId)}
                                        </div>
                                        <span className="text-xs text-slate-400">⬅️</span>
                                        <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs truncate max-w-[45%]">
                                            {getCatName(addonsCatId)}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCategoryLink(parentCatId)}
                                        className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                                        title={isAr ? "حذف الربط" : "Remove Link"}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION 4: ألوان الثيم (Color Theme) */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="space-y-1">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Palette className="w-5 h-5 text-orange-500" />
                        {isAr ? "لون ثيم 27 الأساسي (Color Accent)" : "Theme 27 Color Accent"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {isAr ? "اختر اللون المميز للأزرار والأسعار وشريط الأقسام في ثيم 27." : "Select the accent color for buttons, prices, and category bar."}
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                    {COLOR_PRESETS.map((preset) => {
                        const isSelected = config.primary_color?.toLowerCase() === preset.hex.toLowerCase();
                        return (
                            <button
                                key={preset.hex}
                                type="button"
                                onClick={() => setConfig({ ...config, primary_color: preset.hex })}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all ${
                                    isSelected ? 'border-orange-500 bg-orange-500/5 shadow-sm' : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <span className="w-5 h-5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: preset.hex }} />
                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                                    {isAr ? preset.name_ar : preset.name_en}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="flex justify-end gap-3 pt-2">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black shadow-xl shadow-orange-500/30 transition-all disabled:opacity-50 text-base"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>{isAr ? "حفظ كافة التغييرات" : "Save All Changes"}</span>
                </button>
            </div>
        </div>
    );
}
