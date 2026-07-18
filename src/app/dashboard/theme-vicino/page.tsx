"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { Save, Loader2, ImagePlus, X, Video } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { posDb } from "@/lib/pos-db";

interface VicinoConfig {
    vicino_landing_enabled: boolean;
    vicino_video_url: string;
    vicino_logo_url: string;
    vicino_about_ar: string;
    vicino_about_en: string;
    vicino_history_ar: string;
    vicino_history_en: string;
    vicino_images: string[];
}

export default function ThemeVicinoSettings() {
    const { language } = useLanguage();
    const isAr = language === "ar";
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    const [config, setConfig] = useState<VicinoConfig>({
        vicino_landing_enabled: false,
        vicino_video_url: "",
        vicino_logo_url: "",
        vicino_about_ar: "",
        vicino_about_en: "",
        vicino_history_ar: "",
        vicino_history_en: "",
        vicino_images: [],
    });

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const cached = await posDb.settings.get('current_config');
                if (!cached?.restaurant_id) {
                    setLoading(false);
                    return;
                }
                const rId = cached.restaurant_id;
                setRestaurantId(rId);

                const { data, error } = await supabase
                    .from("restaurants")
                    .select("vicino_landing_enabled, vicino_video_url, vicino_logo_url, vicino_about_ar, vicino_about_en, vicino_history_ar, vicino_history_en, vicino_images")
                    .eq("id", rId)
                    .single();

                if (error && error.code !== "PGRST116") throw error;
                if (data) {
                    setConfig({
                        vicino_landing_enabled: data.vicino_landing_enabled || false,
                        vicino_video_url: data.vicino_video_url || "",
                        vicino_logo_url: data.vicino_logo_url || "",
                        vicino_about_ar: data.vicino_about_ar || "",
                        vicino_about_en: data.vicino_about_en || "",
                        vicino_history_ar: data.vicino_history_ar || "",
                        vicino_history_en: data.vicino_history_en || "",
                        vicino_images: data.vicino_images || [],
                    });
                }
            } catch (err: any) {
                console.error("Error loading Vicino config:", err);
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
            const { error } = await supabase
                .from("restaurants")
                .update({
                    vicino_landing_enabled: config.vicino_landing_enabled,
                    vicino_video_url: config.vicino_video_url,
                    vicino_logo_url: config.vicino_logo_url,
                    vicino_about_ar: config.vicino_about_ar,
                    vicino_about_en: config.vicino_about_en,
                    vicino_history_ar: config.vicino_history_ar,
                    vicino_history_en: config.vicino_history_en,
                    vicino_images: config.vicino_images,
                })
                .eq("id", restaurantId);

            if (error) throw error;
            toast.success(isAr ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
        } catch (err: any) {
            console.error("Error saving:", err);
            toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving settings");
        } finally {
            setSaving(false);
        }
    };

    const removeImage = (index: number) => {
        const newImages = [...config.vicino_images];
        newImages.splice(index, 1);
        setConfig({ ...config, vicino_images: newImages });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {isAr ? "إعدادات ثيم Vicino المذهل" : "Theme Vicino Settings"}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {isAr ? "قم بتخصيص صفحة الهبوط وتفاصيل الثيم الخاص بك." : "Customize the landing page and theme details."}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isAr ? "حفظ التغييرات" : "Save Changes"}
                </button>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-stone-200 dark:border-zinc-800 space-y-6">
                <div className="flex items-center justify-between bg-stone-50 dark:bg-[#111] p-4 rounded-xl">
                    <div>
                        <h3 className="font-bold">{isAr ? "تفعيل صفحة الهبوط" : "Enable Landing Page"}</h3>
                        <p className="text-sm text-slate-500">{isAr ? "إظهار صفحة الهبوط قبل الدخول للمنيو" : "Show landing page before entering menu"}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.vicino_landing_enabled}
                            onChange={(e) => setConfig({ ...config, vicino_landing_enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">{isAr ? "الوسائط (فيديو ولوجو)" : "Media (Video & Logo)"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">{isAr ? "رابط الفيديو (Video URL)" : "Video URL"}</label>
                            <input
                                type="url"
                                value={config.vicino_video_url}
                                onChange={(e) => setConfig({ ...config, vicino_video_url: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111]"
                                placeholder="https://example.com/video.mp4"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">{isAr ? "رابط اللوجو المخصص لصفحة الهبوط" : "Custom Landing Page Logo URL"}</label>
                            <input
                                type="url"
                                value={config.vicino_logo_url}
                                onChange={(e) => setConfig({ ...config, vicino_logo_url: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111]"
                                placeholder="https://example.com/logo.png"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">{isAr ? "نبذة عن المكان" : "About the Place"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">{isAr ? "النبذة (عربي)" : "About (Arabic)"}</label>
                            <textarea
                                value={config.vicino_about_ar}
                                onChange={(e) => setConfig({ ...config, vicino_about_ar: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111] h-32 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">{isAr ? "النبذة (إنجليزي)" : "About (English)"}</label>
                            <textarea
                                value={config.vicino_about_en}
                                onChange={(e) => setConfig({ ...config, vicino_about_en: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111] h-32 resize-none"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">{isAr ? "تاريخ المكان" : "History of the Place"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">{isAr ? "التاريخ (عربي)" : "History (Arabic)"}</label>
                            <textarea
                                value={config.vicino_history_ar}
                                onChange={(e) => setConfig({ ...config, vicino_history_ar: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111] h-32 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">{isAr ? "التاريخ (إنجليزي)" : "History (English)"}</label>
                            <textarea
                                value={config.vicino_history_en}
                                onChange={(e) => setConfig({ ...config, vicino_history_en: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111] h-32 resize-none"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">{isAr ? "صور المكان" : "Place Images"}</h3>
                    <p className="text-sm text-slate-500">{isAr ? "أضف روابط الصور المراد عرضها في صفحة الهبوط" : "Add image URLs to show in the landing page"}</p>
                    
                    <div className="flex gap-2">
                        <input
                            type="url"
                            id="newImageUrl"
                            className="flex-1 px-4 py-2 border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111]"
                            placeholder="https://example.com/image.jpg"
                            dir="ltr"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value;
                                    if (val) {
                                        setConfig({ ...config, vicino_images: [...config.vicino_images, val] });
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const input = document.getElementById('newImageUrl') as HTMLInputElement;
                                if (input.value) {
                                    setConfig({ ...config, vicino_images: [...config.vicino_images, input.value] });
                                    input.value = '';
                                }
                            }}
                            className="px-4 py-2 bg-stone-200 dark:bg-zinc-800 rounded-lg font-bold"
                        >
                            {isAr ? "إضافة" : "Add"}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {config.vicino_images.map((img, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt="Place" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
