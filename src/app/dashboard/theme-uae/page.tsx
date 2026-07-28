"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { Save, Loader2, ImagePlus, X, Video, UploadCloud, FileVideo, Trash2, Sun, Moon, Users } from "lucide-react";
import { uploadImageWithThumb } from "@/lib/uploadImage";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { posDb } from "@/lib/pos-db";

interface UaeConfig {
    uae_landing_enabled: boolean;
    customer_lead_collection_enabled: boolean;
    uae_video_url: string;
    uae_logo_url: string;
    uae_about_ar: string;
    uae_history_ar: string;
    uae_images: string[];
    uae_bg_light: string;
    uae_bg_dark: string;
    theme_colors: any;
}

export default function ThemeUaeSettings() {
    const { language } = useLanguage();
    const isAr = language === "ar";
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBgLight, setUploadingBgLight] = useState(false);
    const [uploadingBgDark, setUploadingBgDark] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    const [config, setConfig] = useState<UaeConfig>({
        uae_landing_enabled: false,
        customer_lead_collection_enabled: false,
        uae_video_url: "",
        uae_logo_url: "",
        uae_about_ar: "",
        uae_history_ar: "",
        uae_images: [],
        uae_bg_light: "",
        uae_bg_dark: "",
        theme_colors: {},
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
                    toast.error(isAr ? "تعذر تحميل بيانات المطعم. تأكد من اتصالك بالإنترنت." : "Could not load restaurant data.");
                    setLoading(false);
                    return;
                }
                
                setRestaurantId(rId);

                const { data, error } = await supabase
                    .from("restaurants")
                    .select("theme_colors, vicino_landing_enabled, vicino_video_url, vicino_logo_url, vicino_about_ar, vicino_history_ar, vicino_images")
                    .eq("id", rId)
                    .single();

                if (error && error.code !== "PGRST116") throw error;
                if (data) {
                    const tc = data.theme_colors || {};
                    setConfig({
                        uae_landing_enabled: tc.uae_landing_enabled ?? data.vicino_landing_enabled ?? false,
                        customer_lead_collection_enabled: tc.customer_lead_collection_enabled ?? tc.lead_popup_enabled ?? false,
                        uae_video_url: tc.uae_video_url || data.vicino_video_url || "",
                        uae_logo_url: tc.uae_logo_url || data.vicino_logo_url || "",
                        uae_about_ar: tc.uae_about_ar || data.vicino_about_ar || "",
                        uae_history_ar: tc.uae_history_ar || data.vicino_history_ar || "",
                        uae_images: tc.uae_images || data.vicino_images || [],
                        uae_bg_light: tc.uae_bg_light || tc.bg_image_light || "",
                        uae_bg_dark: tc.uae_bg_dark || tc.bg_image_dark || "",
                        theme_colors: tc,
                    });
                }
            } catch (err) {
                console.error("Error loading UAE theme config:", err);
                toast.error(isAr ? "حدث خطأ أثناء تحميل الإعدادات" : "Error loading settings");
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
            const updatedColors = {
                ...config.theme_colors,
                uae_landing_enabled: config.uae_landing_enabled,
                customer_lead_collection_enabled: config.customer_lead_collection_enabled,
                lead_popup_enabled: config.customer_lead_collection_enabled,
                uae_video_url: config.uae_video_url,
                uae_logo_url: config.uae_logo_url,
                uae_about_ar: config.uae_about_ar,
                uae_history_ar: config.uae_history_ar,
                uae_images: config.uae_images,
                uae_bg_light: config.uae_bg_light,
                uae_bg_dark: config.uae_bg_dark,
            };

            const { error } = await supabase
                .from("restaurants")
                .update({
                    vicino_landing_enabled: config.uae_landing_enabled,
                    vicino_video_url: config.uae_video_url,
                    vicino_logo_url: config.uae_logo_url,
                    vicino_about_ar: config.uae_about_ar,
                    vicino_history_ar: config.uae_history_ar,
                    vicino_images: config.uae_images,
                    theme_colors: updatedColors
                })
                .eq("id", restaurantId);

            if (error) throw error;
            toast.success(isAr ? "تم حفظ إعدادات ثيم الإمارات UAE بنجاح!" : "UAE Theme settings saved successfully!");
        } catch (err: any) {
            console.error("Error saving UAE theme config:", err);
            toast.error(isAr ? "فشل الحفظ: " + err.message : "Save failed: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (file: File, path: string): Promise<string | null> => {
        try {
            const res = await uploadImageWithThumb(file, path);
            return res?.originalUrl || null;
        } catch (err) {
            console.error("Upload error:", err);
            toast.error(isAr ? "فشل رفع الملف" : "Upload failed");
            return null;
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        const url = await handleFileUpload(file, `theme-uae/logo_${Date.now()}`);
        if (url) {
            setConfig(prev => ({ ...prev, uae_logo_url: url }));
            toast.success(isAr ? "تم رفع الشعار بنجاح" : "Logo uploaded");
        }
        setUploadingLogo(false);
    };

    const handleBgLightUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingBgLight(true);
        const url = await handleFileUpload(file, `theme-uae/bg_light_${Date.now()}`);
        if (url) {
            setConfig(prev => ({ ...prev, uae_bg_light: url }));
            toast.success(isAr ? "تم رفع خلفية الوضع الفاتح بنجاح" : "Light mode background uploaded");
        }
        setUploadingBgLight(false);
    };

    const handleBgDarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingBgDark(true);
        const url = await handleFileUpload(file, `theme-uae/bg_dark_${Date.now()}`);
        if (url) {
            setConfig(prev => ({ ...prev, uae_bg_dark: url }));
            toast.success(isAr ? "تم رفع خلفية الوضع الداكن بنجاح" : "Dark mode background uploaded");
        }
        setUploadingBgDark(false);
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingVideo(true);
        try {
            const fileExt = file.name.split('.').pop() || 'mp4';
            const fileName = `theme-uae/videos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from('menu-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('menu-images')
                .getPublicUrl(fileName);

            setConfig(prev => ({ ...prev, uae_video_url: publicUrl }));
            toast.success(isAr ? "تم رفع الفيديو بنجاح!" : "Video uploaded successfully!");
        } catch (err: any) {
            console.error("Video upload error:", err);
            toast.error(isAr ? "فشل رفع الفيديو: " + err.message : "Video upload failed: " + err.message);
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploadingImages(true);
        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
            const url = await handleFileUpload(files[i], `theme-uae/gallery_${Date.now()}_${i}`);
            if (url) urls.push(url);
        }
        if (urls.length > 0) {
            setConfig(prev => ({ ...prev, uae_images: [...prev.uae_images, ...urls] }));
            toast.success(isAr ? "تم رفع الصور بنجاح" : "Images uploaded");
        }
        setUploadingImages(false);
    };

    const removeImage = (index: number) => {
        setConfig(prev => ({
            ...prev,
            uae_images: prev.uae_images.filter((_, i) => i !== index)
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 rtl text-right">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2">
                        <span>🇦🇪</span>
                        <span>{isAr ? "إعدادات ثيم الإمارات (UAE Theme)" : "UAE Theme Settings"}</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        تخصيص خلفيات المنيو، صفحة الهبوط، فيديو الأجواء، النبذة والتفاصيل باللغة العربية
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{isAr ? "حفظ التغييرات" : "Save Changes"}</span>
                </button>
            </div>

            {/* Custom Background Images Section */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div>
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        <ImagePlus className="w-4 h-4 text-amber-500" />
                        <span>خلفية صور المنيو (Light & Dark Backgrounds)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        يمكنك رفع صورة خلفية مخصصة للوضع الفاتح وأخرى للوضع الداكن للمنيو
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    
                    {/* Light Mode Background */}
                    <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                            <Sun className="w-4 h-4 text-amber-400" />
                            <span>خلفية الوضع الفاتح (Light Mode)</span>
                        </div>

                        {config.uae_bg_light ? (
                            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={config.uae_bg_light} alt="Light BG" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setConfig({ ...config, uae_bg_light: "" })}
                                    className="absolute top-2 left-2 p-1.5 rounded-full bg-amber-600 text-white shadow-md hover:bg-amber-500"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-full h-32 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
                                لا توجد خلفية مخصصة للوضع الفاتح
                            </div>
                        )}

                        <label className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors flex items-center justify-center gap-2">
                            {uploadingBgLight ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <UploadCloud className="w-4 h-4 text-amber-500" />}
                            <span>{uploadingBgLight ? "جاري الرفع..." : "رفع صورة الوضع الفاتح"}</span>
                            <input type="file" accept="image/*" onChange={handleBgLightUpload} disabled={uploadingBgLight} className="hidden" />
                        </label>
                    </div>

                    {/* Dark Mode Background */}
                    <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                            <Moon className="w-4 h-4 text-amber-400" />
                            <span>خلفية الوضع الداكن (Dark Mode)</span>
                        </div>

                        {config.uae_bg_dark ? (
                            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={config.uae_bg_dark} alt="Dark BG" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setConfig({ ...config, uae_bg_dark: "" })}
                                    className="absolute top-2 left-2 p-1.5 rounded-full bg-amber-600 text-white shadow-md hover:bg-amber-500"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-full h-32 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
                                لا توجد خلفية مخصصة للوضع الداكن
                            </div>
                        )}

                        <label className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors flex items-center justify-center gap-2">
                            {uploadingBgDark ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <UploadCloud className="w-4 h-4 text-amber-500" />}
                            <span>{uploadingBgDark ? "جاري الرفع..." : "رفع صورة الوضع الداكن"}</span>
                            <input type="file" accept="image/*" onChange={handleBgDarkUpload} disabled={uploadingBgDark} className="hidden" />
                        </label>
                    </div>

                </div>
            </div>

            {/* Landing Page Toggle */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-sm text-slate-100">
                        تفعيل صفحة الهبوط قبل المنيو
                    </h3>
                    <p className="text-xs text-slate-400">
                        إظهار صفحة هبوط تفاعلية تحتوي على الفيديو ومعلومات المكان قبل المنيو
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={config.uae_landing_enabled}
                        onChange={(e) => setConfig({ ...config, uae_landing_enabled: e.target.checked })}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
            </div>

            {/* Customer Lead Collection Toggle */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-500" />
                        <span>تجميع بيانات العملاء (Customer Data Capture)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                        إظهار نافذة منبثقة لتسجيل اسم العميل ورقم تليفونه قبل تصفح المنيو لحفظهم في قاعدة البيانات
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={config.customer_lead_collection_enabled}
                        onChange={(e) => setConfig({ ...config, customer_lead_collection_enabled: e.target.checked })}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
            </div>

            {/* Hero Video Section */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <Video className="w-4 h-4 text-amber-500" />
                    <span>فيديو صفحة الهبوط (رفع ملف أو رابط)</span>
                </h3>

                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <label className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20">
                            {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileVideo className="w-4 h-4" />}
                            <span>{uploadingVideo ? "جاري رفع الفيديو..." : "رفع ملف فيديو من الجهاز"}</span>
                            <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={uploadingVideo} className="hidden" />
                        </label>

                        <div className="flex-1 w-full">
                            <input
                                type="text"
                                value={config.uae_video_url}
                                onChange={(e) => setConfig({ ...config, uae_video_url: e.target.value })}
                                placeholder="أو ضع رابط YouTube / Vimeo..."
                                className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
                            />
                        </div>
                    </div>

                    {config.uae_video_url && (
                        <div className="pt-2 relative">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-slate-400">معاينة الفيديو الحالي:</span>
                                <button onClick={() => setConfig({ ...config, uae_video_url: '' })} className="text-xs text-amber-400 hover:underline">حذف الفيديو</button>
                            </div>
                            <div className="rounded-2xl overflow-hidden border border-slate-800 max-w-md bg-black aspect-video">
                                {config.uae_video_url.includes('youtube.com') || config.uae_video_url.includes('youtu.be') || config.uae_video_url.includes('vimeo.com') ? (
                                    <iframe src={config.uae_video_url} className="w-full h-full" allowFullScreen></iframe>
                                ) : (
                                    <video src={config.uae_video_url} controls className="w-full h-full object-cover"></video>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Logo for Landing Page */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <ImagePlus className="w-4 h-4 text-amber-500" />
                    <span>شعار صفحة الهبوط (Landing Logo)</span>
                </h3>

                <div className="flex items-center gap-4">
                    {config.uae_logo_url ? (
                        <div className="relative w-20 h-20 rounded-2xl border border-slate-700 p-1 bg-white flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={config.uae_logo_url} alt="Logo" className="w-full h-full object-contain" />
                            <button
                                onClick={() => setConfig({ ...config, uae_logo_url: "" })}
                                className="absolute -top-2 -left-2 p-1 rounded-full bg-amber-600 text-white shadow-md hover:bg-amber-500"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="w-20 h-20 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500">
                            <ImagePlus className="w-6 h-6" />
                        </div>
                    )}

                    <label className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors flex items-center gap-2">
                        {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <UploadCloud className="w-4 h-4 text-amber-500" />}
                        <span>{uploadingLogo ? "جاري الرفع..." : "رفع شعار جديد"}</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
                    </label>
                </div>
            </div>

            {/* Arabic Story & Bio Section */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-slate-100">
                    نبذة عن المكان وقصته (باللغة العربية)
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                            عن المكان والتجربة
                        </label>
                        <textarea
                            rows={3}
                            value={config.uae_about_ar}
                            onChange={(e) => setConfig({ ...config, uae_about_ar: e.target.value })}
                            placeholder="اكتب نبذة عن المكان والجودة والخدمة..."
                            className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                            قصة المكان وعراقته
                        </label>
                        <textarea
                            rows={3}
                            value={config.uae_history_ar}
                            onChange={(e) => setConfig({ ...config, uae_history_ar: e.target.value })}
                            placeholder="اكتب عن بداية التأسيس والأصالة والرؤية..."
                            className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Gallery Images */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-100">
                        معرض صور صفحة الهبوط
                    </h3>

                    <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors flex items-center gap-2">
                        {uploadingImages ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <ImagePlus className="w-4 h-4 text-amber-500" />}
                        <span>إضافة صور</span>
                        <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={uploadingImages} className="hidden" />
                    </label>
                </div>

                {config.uae_images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {config.uae_images.map((img, idx) => (
                            <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-800 aspect-square bg-slate-950">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-2 left-2 p-1.5 rounded-full bg-amber-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-amber-500"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 italic text-center py-4">
                        لا توجد صور في المعرض بعد.
                    </p>
                )}
            </div>

        </div>
    );
}
