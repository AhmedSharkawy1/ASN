"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { 
    Save, Loader2, ImagePlus, Trash2, Megaphone, 
    Sparkles, ExternalLink, X, CheckCircle2, AlertCircle
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

interface PromoPopupConfig {
    enabled: boolean;
    title: string;
    description: string;
    image_url: string;
    button_text: string;
    target_category_id: string;
}

export default function PopupSettingsPage() {
    const { language } = useLanguage();
    const isAr = language === "ar";
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [primaryColor, setPrimaryColor] = useState<string>("#f97316");
    const [previewDark, setPreviewDark] = useState<boolean>(false);
    const [themeColors, setThemeColors] = useState<any>({});
    const [currentTheme, setCurrentTheme] = useState<string>("");
    const [theme27Enabled, setTheme27Enabled] = useState<boolean>(false);
    const [isAccessDenied, setIsAccessDenied] = useState<boolean>(false);

    const [popupConfig, setPopupConfig] = useState<PromoPopupConfig>({
        enabled: false,
        title: "",
        description: "",
        image_url: "",
        button_text: isAr ? "تصفح العرض الآن" : "View Offer Now",
        target_category_id: ""
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
                    setLoading(false);
                    return;
                }

                setRestaurantId(rId);

                // Check if Super Admin explicitly disabled popup settings for this tenant
                const { data: pageAccess } = await supabase
                    .from('client_page_access')
                    .select('enabled')
                    .eq('tenant_id', rId)
                    .eq('page_key', 'popup_settings')
                    .maybeSingle();

                if (pageAccess && pageAccess.enabled === false) {
                    setIsAccessDenied(true);
                }

                // Load restaurant and theme settings
                const { data: rest, error: rErr } = await supabase
                    .from('restaurants')
                    .select('id, slug, theme, theme_colors')
                    .eq('id', rId)
                    .single();

                if (rErr) throw rErr;

                if (rest) {
                    setRestaurantSlug(rest.slug || rest.id);
                    setCurrentTheme(rest.theme || "");

                    let tc = rest.theme_colors || {};
                    if (typeof tc === 'string') {
                        try { tc = JSON.parse(tc); } catch { tc = {}; }
                    }
                    setThemeColors(tc);

                    const pColor = tc.primary || '#f97316';
                    setPrimaryColor(pColor);

                    // Check existing popup configurations
                    const existingUniversal = tc.promo_popup;
                    const existing27 = tc.theme27_popup;
                    const existing28 = tc.theme28_popup;
                    const existing30 = tc.theme30_popup;

                    if (existing27?.enabled || existing28?.enabled || existing30?.enabled) {
                        setTheme27Enabled(true);
                    }

                    // Default or prefill values
                    const initialConfig: PromoPopupConfig = {
                        enabled: existingUniversal?.enabled ?? false,
                        title: existingUniversal?.title || existing30?.title || existing27?.title || existing28?.title || "",
                        description: existingUniversal?.description || existing30?.description || existing27?.description || existing28?.description || "",
                        image_url: existingUniversal?.image_url || existing30?.image_url || existing27?.image_url || existing28?.image_url || "",
                        button_text: existingUniversal?.button_text || existing30?.button_text || existing27?.button_text || existing28?.button_text || (isAr ? "تصفح العرض الآن" : "View Offer Now"),
                        target_category_id: existingUniversal?.target_category_id || existing30?.target_category_id || existing27?.target_category_id || existing28?.target_category_id || ""
                    };

                    setPopupConfig(initialConfig);
                }

                // Load categories
                const { data: cats, error: cErr } = await supabase
                    .from('categories')
                    .select('id, name_ar, name_en')
                    .eq('restaurant_id', rId)
                    .order('display_order', { ascending: true });

                if (!cErr && cats) {
                    setCategories(cats);
                }
            } catch (err: any) {
                console.error("Error loading popup settings:", err);
                toast.error(isAr ? "حدث خطأ أثناء تحميل البيانات" : "Error loading settings");
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
            let tc = themeColors || {};
            if (typeof tc === 'string') {
                try { tc = JSON.parse(tc); } catch { tc = {}; }
            }

            const updatedThemeColors = {
                ...tc,
                promo_popup: popupConfig
            };

            const { data, error } = await supabase
                .from("restaurants")
                .update({
                    theme_colors: updatedThemeColors
                })
                .eq("id", restaurantId)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("Could not update data. Check database permissions.");

            setThemeColors(updatedThemeColors);

            try {
                const currentConfig = await posDb.settings.get('current_config');
                if (currentConfig) {
                    await posDb.settings.put({
                        ...currentConfig,
                        theme_colors: updatedThemeColors
                    } as any);
                }
            } catch (cErr) {
                console.warn("Could not update offline cache:", cErr);
            }

            toast.success(isAr ? "تم حفظ إعدادات النافذة المنبثقة بنجاح" : "Pop-up settings saved successfully");
        } catch (err: any) {
            console.error("Error saving popup settings:", err);
            toast.error(err.message || (isAr ? "حدث خطأ أثناء الحفظ" : "Error occurred while saving"));
        } finally {
            setSaving(false);
        }
    };

    const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImg(true);
        try {
            const result = await uploadImageWithThumb(file, `promo_popup/offer_${Date.now()}`);
            if (result && result.originalUrl) {
                setPopupConfig(prev => ({ ...prev, image_url: result.originalUrl }));
                toast.success(isAr ? "تم رفع الصورة بنجاح" : "Image uploaded successfully");
            } else {
                toast.error(isAr ? "فشل رفع الصورة" : "Failed to upload image");
            }
        } catch (err) {
            console.error("Popup img upload error:", err);
            toast.error(isAr ? "حدث خطأ أثناء رفع الصورة" : "Error uploading image");
        } finally {
            setUploadingImg(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <p className="text-sm font-bold text-slate-500">{isAr ? "جاري تحميل الإعدادات..." : "Loading settings..."}</p>
            </div>
        );
    }

    if (isAccessDenied) {
        return (
            <div className="max-w-2xl mx-auto p-8 my-12 bg-white dark:bg-zinc-900 rounded-3xl border border-red-200 dark:border-red-900/30 text-center space-y-4 shadow-sm" dir={isAr ? "rtl" : "ltr"}>
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {isAr ? "هذه الصفحة غير مفعلة لمطعمك" : "Page Access Restricted"}
                </h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                    {isAr 
                        ? "تم إخفاء صفحة إعدادات النافذة المنبثقة لمطعمك من قِبل إدارة المنصة (Super Admin). يرجى التواصل مع الإدارة لتفعيل الميزة."
                        : "Access to the promotional pop-up settings page has been disabled for your restaurant by platform administration."}
                </p>
                <div className="pt-2">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm hover:opacity-90 transition-all"
                    >
                        {isAr ? "العودة للوحة التحكم" : "Back to Dashboard"}
                    </Link>
                </div>
            </div>
        );
    }

    const previewBg = previewDark ? "#18181b" : "#ffffff";
    const previewText = previewDark ? "#ffffff" : "#09090b";
    const previewMuted = previewDark ? "#a1a1aa" : "#64748b";

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6" dir={isAr ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {isAr ? "نافذة العروض المنبثقة (Pop-up لجميع الثيمات)" : "Promotional Pop-up Settings"}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                {isAr 
                                    ? "إدارة النافذة المنبثقة الترويجية التفاعلية التي تظهر لعملائك فور دخول المنيو." 
                                    : "Manage promotional offer popup displayed to customers upon opening your menu."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {restaurantSlug && (
                        <Link
                            href={`/menu/${restaurantSlug}`}
                            target="_blank"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-all"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span>{isAr ? "معاينة المنيو الحي" : "View Live Menu"}</span>
                        </Link>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-black shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}</span>
                    </button>
                </div>
            </div>

            {/* Info / Notice Card */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-bold">
                        {isAr ? "ملاحظة هامة حول حالة التفعيل (Activation Logic):" : "Important Note About Pop-up Activation:"}
                    </p>
                    <p className="text-amber-800 dark:text-amber-300">
                        {isAr
                            ? "هذا الخيار يكون معطلاً تلقائياً لجميع الثيمات ما لم تقم بتفعيله من الزر أدناه. في حال كان الخيار معطلاً هنا، لن تظهر النافذة إلا إذا كان الثيم المختار حالياً هو ثيم يحتوي على إعدادات بوب اب خاصة به ومفعلة بداخله (مثل ثيم 27 أو ثيم 28 أو ثيم 30)."
                            : "This option is disabled by default for all themes unless enabled below. If disabled here, the popup will only appear if the currently active theme has its own popup enabled (e.g. Theme 27, 28, or 30)."}
                    </p>
                    {theme27Enabled && (
                        <p className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 pt-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {isAr ? "تم رصد أن إعدادات البوب اب مفعلة مسبقاً في إعدادات الثيم لديك وتعمل بالفعل." : "Theme popup setting is already active on your account."}
                        </p>
                    )}
                </div>
            </div>

            {/* Main Settings Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
                {/* Switch row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-zinc-800">
                    <div className="space-y-1">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-orange-500" />
                            {isAr ? "تفعيل النافذة المنبثقة لجميع الثيمات" : "Enable Pop-up for All Themes"}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                            {isAr 
                                ? "عند التفعيل، ستظهر هذه النافذة للعملاء فور فتح المنيو في أي ثيم يتم اختياره في المطعم." 
                                : "When enabled, this popup will appear across all menu themes."}
                        </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={popupConfig.enabled}
                            onChange={(e) => setPopupConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                            className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        <span className="ms-3 text-sm font-bold text-slate-900 dark:text-white">
                            {popupConfig.enabled ? (isAr ? "مفعلة لجميع الثيمات" : "Enabled Globally") : (isAr ? "معطلة (مقفل)" : "Disabled")}
                        </span>
                    </label>
                </div>

                {/* Form & Live Preview Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
                    {/* Inputs Column */}
                    <div className="lg:col-span-7 space-y-5">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                                {isAr ? "عنوان العرض الترويجي" : "Offer Title"}
                            </label>
                            <input
                                type="text"
                                value={popupConfig.title}
                                onChange={(e) => setPopupConfig(prev => ({ ...prev, title: e.target.value }))}
                                placeholder={isAr ? "مثال: خصم 20% على جميع أنواع البيتزا اليوم!" : "e.g. 20% Off All Pizzas Today!"}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-900 dark:text-white"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                                {isAr ? "تفاصيل ووصف العرض" : "Offer Description / Details"}
                            </label>
                            <textarea
                                rows={3}
                                value={popupConfig.description}
                                onChange={(e) => setPopupConfig(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={isAr ? "مثال: اطلب أي بيتزا حجم كبير أو عائلي واحصل على بيبسي وبطاطس هدية لفترة محدودة." : "e.g. Order any large pizza and get a complimentary soft drink and fries."}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none text-slate-900 dark:text-white"
                            />
                        </div>

                        {/* Button text & Target category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                                    {isAr ? "نص زر الإجراء (CTA)" : "Button Action Text"}
                                </label>
                                <input
                                    type="text"
                                    value={popupConfig.button_text}
                                    onChange={(e) => setPopupConfig(prev => ({ ...prev, button_text: e.target.value }))}
                                    placeholder={isAr ? "تصفح العرض الآن" : "View Offer Now"}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                                    {isAr ? "القسم المرتبط (الانتقال السريع إليه)" : "Target Category"}
                                </label>
                                <select
                                    value={popupConfig.target_category_id || ""}
                                    onChange={(e) => setPopupConfig(prev => ({ ...prev, target_category_id: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-900 dark:text-white"
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
                                {isAr ? "صورة العرض الترويجي (بانر اختياري)" : "Offer Banner Image (Optional)"}
                            </label>
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 font-bold text-xs cursor-pointer border border-orange-200 dark:border-orange-500/30 transition-all active:scale-95">
                                    {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                                    <span>{uploadingImg ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "رفع صورة للعرض" : "Upload Offer Image")}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload} disabled={uploadingImg} />
                                </label>
                                {popupConfig.image_url && (
                                    <button
                                        type="button"
                                        onClick={() => setPopupConfig(prev => ({ ...prev, image_url: "" }))}
                                        className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>{isAr ? "إزالة الصورة" : "Remove Image"}</span>
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5">
                                {isAr ? "يفضل صورة بنسبة عرض 16:9 أو جودة عالية بصيغة WebP أو JPG." : "Recommended aspect ratio 16:9 in WebP or JPG."}
                            </p>
                        </div>
                    </div>

                    {/* Live Preview Column */}
                    <div className="lg:col-span-5 bg-slate-100 dark:bg-zinc-800/40 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 flex flex-col justify-center items-center">
                        <div className="w-full flex items-center justify-between mb-3 px-1">
                            <span className="text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase">
                                {isAr ? "معاينة حية لشكل البوب اب" : "Live Preview"}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewDark(!previewDark)}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300"
                            >
                                {previewDark ? (isAr ? "معاينة الفاتح" : "Light Mode") : (isAr ? "معاينة الداكن" : "Dark Mode")}
                            </button>
                        </div>

                        {/* Mock popup card */}
                        <div 
                            className="w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border transition-colors relative"
                            style={{ 
                                backgroundColor: previewBg,
                                borderColor: previewDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                            }}
                        >
                            {/* Close icon */}
                            <div className="absolute top-3 left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto z-20 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm">
                                <X className="w-3.5 h-3.5" />
                            </div>

                            {/* Header image or gradient */}
                            {popupConfig.image_url ? (
                                <div className="relative h-40 w-full overflow-hidden bg-slate-200 dark:bg-zinc-800">
                                    <img src={popupConfig.image_url} alt="Offer Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                                    <div className="absolute bottom-2.5 right-3 left-3 text-white">
                                        <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full inline-block">
                                            {isAr ? "عرض خاص لفترة محدودة" : "Special Limited Offer"}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className="p-4 text-white flex items-center justify-between"
                                    style={{
                                        background: `linear-gradient(135deg, ${primaryColor}, #f59e0b)`
                                    }}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-amber-200" />
                                        <span className="text-xs font-black">
                                            {isAr ? "عرض اليوم المميز" : "Special Offer of the Day"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-5 space-y-3 text-center">
                                <h3 className="font-black text-base sm:text-lg leading-snug" style={{ color: previewText }}>
                                    {popupConfig.title || (isAr ? "عنوان العرض الترويجي" : "Promotional Offer Title")}
                                </h3>

                                <p className="text-xs leading-relaxed line-clamp-3" style={{ color: previewMuted }}>
                                    {popupConfig.description || (isAr ? "اكتب هنا تفاصيل العرض والخصومات الجذابة لتظهر للعميل." : "Enter offer details and description to attract customers.")}
                                </p>

                                <div className="pt-2 space-y-2">
                                    <button
                                        type="button"
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-black text-white shadow-md transition-transform active:scale-95"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {popupConfig.button_text || (isAr ? "تصفح العرض الآن" : "View Offer Now")}
                                    </button>
                                    <p className="text-[11px] font-bold opacity-60" style={{ color: previewText }}>
                                        {isAr ? "إغلاق ومتابعة التصفح" : "Close and continue browsing"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400">
                            <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: primaryColor }}
                            />
                            <span>{isAr ? "لون الزر متطابق مع لون الثيم الأساسي لمطعمك" : "Button color matches your theme primary color"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
