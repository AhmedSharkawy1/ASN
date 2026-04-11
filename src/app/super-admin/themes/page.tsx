"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/context/LanguageContext";
import { Palette, Save, Loader2, Eye, EyeOff, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Master list of all themes (same as dashboard/theme/page.tsx)
const ALL_THEMES = [
    { id: "pizzapasta", name_ar: "بيتزا باستا (ديناميكية)", name_en: "Pizza Pasta (Dynamic)", preview_color: "#3b82f6" },
    { id: "atyab-oriental", name_ar: "أطياب مودرن (أورينتال)", name_en: "Atyab Modern (Oriental)", preview_color: "#eab308" },
    { id: "bab-alhara", name_ar: "باب الحارة (سوري كلاسيك)", name_en: "Bab Al-Hara (Syrian Classic)", preview_color: "#e31e24" },
    { id: "atyab-etoile", name_ar: "أطياب إتوال (إيكومرس)", name_en: "Atyab Etoile (E-commerce)", preview_color: "#B89038" },
    { id: "theme5", name_ar: "ثيم 5 المتميز", name_en: "Premium Theme 5", preview_color: "#ea580c" },
    { id: "theme6", name_ar: "فراندة (لون تيل)", name_en: "Veranda (Teal Theme)", preview_color: "#40a798" },
    { id: "theme7", name_ar: "حليم (ثيم داكن ذهبي)", name_en: "Haleem (Dark Gold Theme)", preview_color: "#c9a84c" },
    { id: "theme9", name_ar: "ديابلو (أحمر عصري)", name_en: "Diablo (Red Modern)", preview_color: "#e74c3c" },
    { id: "theme10", name_ar: "الوهج البرتقالي (ثيم 10)", name_en: "Orange Glow (Theme 10)", preview_color: "#ea580c" },
    { id: "theme11", name_ar: "عصري أفقي (لوكس 11)", name_en: "Horizontal Modern (Luxe 11)", preview_color: "#e54750" },
    { id: "theme12", name_ar: "العام الجديد (ثيم 12)", name_en: "New Year (Theme 12)", preview_color: "#6c63ff" },
    { id: "theme13", name_ar: "لوكس الذهبي (ثيم 13)", name_en: "Luxe Gold (Theme 13)", preview_color: "#d4af37" },
    { id: "theme16", name_ar: "كلاسيك أحمر (ثيم 16)", name_en: "Classic Red (Theme 16)", preview_color: "#af0a13" },
    { id: "theme17", name_ar: "لوشا (الأحمر المميز - ثيم 17)", name_en: "Lusha (Premium Red - Theme 17)", preview_color: "#d32f2f" },
    // Color Variations
    { id: "pizzapasta-cyan", name_ar: "PizzaPasta (Cyan)", name_en: "PizzaPasta (Cyan)", preview_color: "#0891b2" },
    { id: "pizzapasta-emerald", name_ar: "PizzaPasta (Emerald)", name_en: "PizzaPasta (Emerald)", preview_color: "#059669" },
    { id: "pizzapasta-sky", name_ar: "PizzaPasta (Sky)", name_en: "PizzaPasta (Sky)", preview_color: "#0284c7" },
    { id: "atyab-oriental-cyan", name_ar: "أطياب أورينتال (Cyan)", name_en: "AtyabOriental (Cyan)", preview_color: "#0891b2" },
    { id: "atyab-oriental-emerald", name_ar: "أطياب أورينتال (Emerald)", name_en: "AtyabOriental (Emerald)", preview_color: "#059669" },
    { id: "atyab-oriental-sky", name_ar: "أطياب أورينتال (Sky)", name_en: "AtyabOriental (Sky)", preview_color: "#0284c7" },
    { id: "bab-alhara-cyan", name_ar: "باب الحارة (Cyan)", name_en: "BabAlHara (Cyan)", preview_color: "#0891b2" },
    { id: "bab-alhara-emerald", name_ar: "باب الحارة (Emerald)", name_en: "BabAlHara (Emerald)", preview_color: "#059669" },
    { id: "bab-alhara-sky", name_ar: "باب الحارة (Sky)", name_en: "BabAlHara (Sky)", preview_color: "#0284c7" },
    { id: "atyab-etoile-cyan", name_ar: "أطياب إتوال (Cyan)", name_en: "AtyabEtoile (Cyan)", preview_color: "#0891b2" },
    { id: "atyab-etoile-emerald", name_ar: "أطياب إتوال (Emerald)", name_en: "AtyabEtoile (Emerald)", preview_color: "#059669" },
    { id: "atyab-etoile-sky", name_ar: "أطياب إتوال (Sky)", name_en: "AtyabEtoile (Sky)", preview_color: "#0284c7" },
    { id: "theme5-cyan", name_ar: "ثيم 5 (Cyan)", name_en: "Theme5 (Cyan)", preview_color: "#0891b2" },
    { id: "theme5-emerald", name_ar: "ثيم 5 (Emerald)", name_en: "Theme5 (Emerald)", preview_color: "#059669" },
    { id: "theme5-sky", name_ar: "ثيم 5 (Sky)", name_en: "Theme5 (Sky)", preview_color: "#0284c7" },
    { id: "theme6-cyan", name_ar: "ثيم 6 (Cyan)", name_en: "Theme6 (Cyan)", preview_color: "#0891b2" },
    { id: "theme6-emerald", name_ar: "ثيم 6 (Emerald)", name_en: "Theme6 (Emerald)", preview_color: "#059669" },
    { id: "theme6-sky", name_ar: "ثيم 6 (Sky)", name_en: "Theme6 (Sky)", preview_color: "#0284c7" },
    { id: "theme7-cyan", name_ar: "ثيم 7 (Cyan)", name_en: "Theme7 (Cyan)", preview_color: "#0891b2" },
    { id: "theme7-emerald", name_ar: "ثيم 7 (Emerald)", name_en: "Theme7 (Emerald)", preview_color: "#059669" },
    { id: "theme7-sky", name_ar: "ثيم 7 (Sky)", name_en: "Theme7 (Sky)", preview_color: "#0284c7" },
    { id: "theme9-cyan", name_ar: "ثيم 9 (Cyan)", name_en: "Theme9 (Cyan)", preview_color: "#0891b2" },
    { id: "theme9-emerald", name_ar: "ثيم 9 (Emerald)", name_en: "Theme9 (Emerald)", preview_color: "#059669" },
    { id: "theme9-sky", name_ar: "ثيم 9 (Sky)", name_en: "Theme9 (Sky)", preview_color: "#0284c7" },
    { id: "theme10-cyan", name_ar: "ثيم 10 (Cyan)", name_en: "Theme10 (Cyan)", preview_color: "#0891b2" },
    { id: "theme10-emerald", name_ar: "ثيم 10 (Emerald)", name_en: "Theme10 (Emerald)", preview_color: "#059669" },
    { id: "theme10-sky", name_ar: "ثيم 10 (Sky)", name_en: "Theme10 (Sky)", preview_color: "#0284c7" },
    { id: "theme11-cyan", name_ar: "ثيم 11 (Cyan)", name_en: "Theme11 (Cyan)", preview_color: "#0891b2" },
    { id: "theme11-emerald", name_ar: "ثيم 11 (Emerald)", name_en: "Theme11 (Emerald)", preview_color: "#059669" },
    { id: "theme11-sky", name_ar: "ثيم 11 (Sky)", name_en: "Theme11 (Sky)", preview_color: "#0284c7" },
    { id: "theme13-cyan", name_ar: "ثيم 13 (Cyan)", name_en: "Theme13 (Cyan)", preview_color: "#0891b2" },
    { id: "theme13-emerald", name_ar: "ثيم 13 (Emerald)", name_en: "Theme13 (Emerald)", preview_color: "#059669" },
    { id: "theme13-sky", name_ar: "ثيم 13 (Sky)", name_en: "Theme13 (Sky)", preview_color: "#0284c7" },
    { id: "theme15-sky", name_ar: "ثيم 15 (Sky)", name_en: "Theme15 (Sky)", preview_color: "#0284c7" },
];

interface ThemeOverride {
    theme_id: string;
    custom_name_ar: string;
    custom_name_en: string;
    is_hidden: boolean;
}

export default function SuperAdminThemesPage() {
    const { language } = useLanguage();
    const isArabic = language === "ar";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [overrides, setOverrides] = useState<Record<string, ThemeOverride>>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Stats
    const hiddenCount = Object.values(overrides).filter(o => o.is_hidden).length;
    const visibleCount = ALL_THEMES.length - hiddenCount;
    const renamedCount = Object.values(overrides).filter(o => o.custom_name_ar || o.custom_name_en).length;

    const fetchOverrides = useCallback(async () => {
        try {
            const { data, error } = await supabase.from("theme_settings").select("*");
            if (error) {
                console.error("Error fetching theme_settings:", error);
                // Table might not exist yet
                return;
            }
            if (data) {
                const map: Record<string, ThemeOverride> = {};
                data.forEach((row: ThemeOverride) => {
                    map[row.theme_id] = row;
                });
                setOverrides(map);
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOverrides();
    }, [fetchOverrides]);

    const getOverride = (themeId: string): ThemeOverride => {
        return overrides[themeId] || { theme_id: themeId, custom_name_ar: "", custom_name_en: "", is_hidden: false };
    };

    const updateOverride = (themeId: string, field: keyof ThemeOverride, value: string | boolean) => {
        setOverrides(prev => ({
            ...prev,
            [themeId]: {
                ...getOverride(themeId),
                theme_id: themeId,
                [field]: value,
            }
        }));
        setHasChanges(true);
    };

    const toggleVisibility = (themeId: string) => {
        const current = getOverride(themeId);
        updateOverride(themeId, "is_hidden", !current.is_hidden);
    };

    const resetTheme = (themeId: string) => {
        setOverrides(prev => {
            const updated = { ...prev };
            delete updated[themeId];
            return updated;
        });
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Collect all overrides that have actual changes
            const toUpsert = Object.values(overrides).filter(o => 
                o.is_hidden || o.custom_name_ar || o.custom_name_en
            ).map(o => ({
                theme_id: o.theme_id,
                custom_name_ar: o.custom_name_ar || null,
                custom_name_en: o.custom_name_en || null,
                is_hidden: o.is_hidden,
                updated_at: new Date().toISOString(),
            }));

            // Delete rows that are back to default
            const toDelete = Object.values(overrides).filter(o =>
                !o.is_hidden && !o.custom_name_ar && !o.custom_name_en
            ).map(o => o.theme_id);

            // Also find previously saved overrides that are no longer in our state (were reset)
            const allIds = ALL_THEMES.map(t => t.id);
            const existingIds = Object.keys(overrides);
            const resetIds = allIds.filter(id => !existingIds.includes(id));

            const deleteIds = [...toDelete, ...resetIds].filter(id => id);

            if (deleteIds.length > 0) {
                await supabase.from("theme_settings").delete().in("theme_id", deleteIds);
            }
            if (toUpsert.length > 0) {
                const { error } = await supabase.from("theme_settings").upsert(toUpsert, { onConflict: "theme_id" });
                if (error) throw error;
            }

            toast.success(isArabic ? "تم حفظ إعدادات الثيمات بنجاح!" : "Theme settings saved successfully!");
            setHasChanges(false);
            // Re-fetch to sync
            await fetchOverrides();
        } catch (err) {
            console.error("Error saving:", err);
            toast.error(isArabic ? "حدث خطأ أثناء الحفظ" : "Error saving theme settings");
        } finally {
            setSaving(false);
        }
    };

    // Filter themes by search
    const filteredThemes = ALL_THEMES.filter(theme => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return theme.id.toLowerCase().includes(q) ||
            theme.name_ar.toLowerCase().includes(q) ||
            theme.name_en.toLowerCase().includes(q) ||
            (getOverride(theme.id).custom_name_ar || "").toLowerCase().includes(q) ||
            (getOverride(theme.id).custom_name_en || "").toLowerCase().includes(q);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full" dir={isArabic ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                            <Palette className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                                {isArabic ? "إدارة الثيمات" : "Themes Management"}
                            </h1>
                            <p className="text-slate-500 dark:text-zinc-400 mt-0.5">
                                {isArabic
                                    ? "تحكم في ظهور الثيمات وأسمائها عند العملاء"
                                    : "Control theme visibility and naming for clients"}
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl shadow-md transition-all active:scale-95 ${
                        hasChanges
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                            : "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed"
                    }`}
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isArabic ? "حفظ التغييرات" : "Save Changes"}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <Eye className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{visibleCount}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold">{isArabic ? "ثيم ظاهر" : "Visible Themes"}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                        <EyeOff className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{hiddenCount}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold">{isArabic ? "ثيم مخفي" : "Hidden Themes"}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                        <Palette className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{renamedCount}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold">{isArabic ? "ثيم تم تغيير اسمه" : "Renamed Themes"}</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className={`w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isArabic ? "right-4" : "left-4"}`} />
                <input
                    type="text"
                    placeholder={isArabic ? "ابحث عن ثيم بالاسم أو المعرف..." : "Search themes by name or ID..."}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full ${isArabic ? "pr-12 pl-4" : "pl-12 pr-4"} py-3 bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium`}
                />
            </div>

            {/* Themes Table */}
            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-stone-100 dark:border-stone-800 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <div className="col-span-1">{isArabic ? "لون" : "Color"}</div>
                    <div className="col-span-2">{isArabic ? "المعرف" : "ID"}</div>
                    <div className="col-span-3">{isArabic ? "الاسم العربي" : "Arabic Name"}</div>
                    <div className="col-span-3">{isArabic ? "الاسم الإنجليزي" : "English Name"}</div>
                    <div className="col-span-1 text-center">{isArabic ? "الحالة" : "Status"}</div>
                    <div className="col-span-2 text-center">{isArabic ? "إجراءات" : "Actions"}</div>
                </div>

                {/* Table Body */}
                <AnimatePresence>
                    {filteredThemes.map((theme, index) => {
                        const override = getOverride(theme.id);
                        const isHidden = override.is_hidden;
                        const hasCustomAr = !!override.custom_name_ar;
                        const hasCustomEn = !!override.custom_name_en;
                        const isModified = isHidden || hasCustomAr || hasCustomEn;

                        return (
                            <motion.div
                                key={theme.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.01 }}
                                className={`grid grid-cols-12 gap-4 p-4 items-center border-b border-stone-50 dark:border-stone-800/50 transition-all hover:bg-stone-50 dark:hover:bg-white/[0.02] ${
                                    isHidden ? "opacity-50" : ""
                                } ${isModified ? "bg-blue-50/30 dark:bg-blue-500/[0.03]" : ""}`}
                            >
                                {/* Color Dot */}
                                <div className="col-span-1">
                                    <div
                                        className="w-7 h-7 rounded-lg shadow-inner border border-white/20"
                                        style={{ backgroundColor: theme.preview_color }}
                                    />
                                </div>

                                {/* ID */}
                                <div className="col-span-2">
                                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 bg-stone-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                                        {theme.id}
                                    </span>
                                </div>

                                {/* Arabic Name */}
                                <div className="col-span-3">
                                    <input
                                        type="text"
                                        dir="rtl"
                                        placeholder={theme.name_ar}
                                        value={override.custom_name_ar || ""}
                                        onChange={e => updateOverride(theme.id, "custom_name_ar", e.target.value)}
                                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none transition-all ${
                                            hasCustomAr
                                                ? "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 text-slate-900 dark:text-white"
                                                : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#0a0f16] text-slate-500 dark:text-zinc-400"
                                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    />
                                </div>

                                {/* English Name */}
                                <div className="col-span-3">
                                    <input
                                        type="text"
                                        dir="ltr"
                                        placeholder={theme.name_en}
                                        value={override.custom_name_en || ""}
                                        onChange={e => updateOverride(theme.id, "custom_name_en", e.target.value)}
                                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none transition-all ${
                                            hasCustomEn
                                                ? "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 text-slate-900 dark:text-white"
                                                : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#0a0f16] text-slate-500 dark:text-zinc-400"
                                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    />
                                </div>

                                {/* Visibility Toggle */}
                                <div className="col-span-1 flex justify-center">
                                    <button
                                        onClick={() => toggleVisibility(theme.id)}
                                        className={`p-2 rounded-lg transition-all ${
                                            isHidden
                                                ? "bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
                                                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                        }`}
                                        title={isHidden ? (isArabic ? "مخفي" : "Hidden") : (isArabic ? "ظاهر" : "Visible")}
                                    >
                                        {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 flex justify-center gap-2">
                                    {isModified && (
                                        <button
                                            onClick={() => resetTheme(theme.id)}
                                            className="p-2 rounded-lg bg-stone-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-white/10 transition-all"
                                            title={isArabic ? "إعادة للأصلي" : "Reset to default"}
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filteredThemes.length === 0 && (
                    <div className="p-12 text-center text-slate-400 dark:text-zinc-500">
                        <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p className="font-bold">{isArabic ? "لا توجد نتائج" : "No themes found"}</p>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-6 flex items-start gap-4">
                <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1">
                        {isArabic ? "ملاحظة عن إدارة الثيمات" : "About Theme Management"}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        {isArabic
                            ? "إخفاء ثيم يمنع ظهوره في صفحة اختيار الثيم للعملاء. تغيير الاسم يُظهر الاسم الجديد بدلاً من الأصلي. العملاء اللي عندهم ثيم مخفي مفعل حالياً لن يتأثروا."
                            : "Hiding a theme removes it from the client's theme selection page. Renaming shows the new name instead of the default. Clients who already have a hidden theme active will not be affected."}
                    </p>
                </div>
            </div>
        </div>
    );
}
