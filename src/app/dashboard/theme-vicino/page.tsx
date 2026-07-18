"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { Save, Loader2, ImagePlus, X, Video, UploadCloud, FileVideo, Trash2 } from "lucide-react";
import { uploadImageWithThumb } from "@/lib/uploadImage";
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
    theme_colors: any;
    default_language: string;
}

export default function ThemeVicinoSettings() {
    const { language } = useLanguage();
    const isAr = language === "ar";
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
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
        theme_colors: {},
        default_language: "ar",
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
                    .select("vicino_landing_enabled, vicino_video_url, vicino_logo_url, vicino_about_ar, vicino_about_en, vicino_history_ar, vicino_history_en, vicino_images, theme_colors")
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
                        theme_colors: data.theme_colors || {},
                        default_language: data.theme_colors?.default_language || "ar",
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
            const { data, error } = await supabase
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
                    theme_colors: { ...config.theme_colors, default_language: config.default_language || "ar" },
                })
                .eq("id", restaurantId)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("لم يتم تحديث أي بيانات. قد تكون هناك مشكلة في صلاحياتك (RLS).");
            toast.success(isAr ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
        } catch (err: any) {
            console.error("Error saving:", err);
            toast.error(isAr ? `حدث خطأ أثناء الحفظ: ${err.message || err}` : `Error saving settings: ${err.message || err}`);
        } finally {
            setSaving(false);
        }
    };

    
    const parsedLogos = (() => {
        try {
            if (!config.vicino_logo_url) return { light: '', dark: '' };
            if (config.vicino_logo_url.startsWith('{')) {
                return JSON.parse(config.vicino_logo_url);
            }
            return { light: config.vicino_logo_url, dark: '' };
        } catch {
            return { light: config.vicino_logo_url, dark: '' };
        }
    })();

    const updateLogo = (mode: 'light' | 'dark', url: string) => {
        const newLogos = { ...parsedLogos, [mode]: url };
        setConfig({ ...config, vicino_logo_url: JSON.stringify(newLogos) });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const result = await uploadImageWithThumb(file, `vicino/logo/${mode}_${Date.now()}`);
            if (result?.originalUrl) {
                updateLogo(mode, result.originalUrl);
                toast.success(isAr ? "تم رفع الشعار بنجاح" : "Logo uploaded successfully");
            }
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleLoadingLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const result = await uploadImageWithThumb(file, `vicino/loading_logo_${Date.now()}`);
            if (result?.originalUrl) {
                setConfig({
                    ...config,
                    theme_colors: { ...config.theme_colors, vicino_loading_logo: result.originalUrl }
                });
                toast.success(isAr ? "تم رفع شعار التحميل بنجاح" : "Loading logo uploaded successfully");
            }
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingVideo(true);
        try {
            // Upload directly to Supabase storage for video
            const fileExt = file.name.split('.').pop();
            const fileName = `vicino/video/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
            setConfig({ ...config, vicino_video_url: data.publicUrl });
            toast.success(isAr ? "تم رفع الفيديو بنجاح" : "Video uploaded successfully");
        } catch (err: any) {
            console.error(err);
            toast.error(isAr ? "فشل رفع الفيديو" : "Failed to upload video");
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploadingImages(true);
        try {
            const newUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const result = await uploadImageWithThumb(files[i], `vicino/gallery/${Date.now()}_${i}`);
                if (result?.originalUrl) newUrls.push(result.originalUrl);
            }
            setConfig({ ...config, vicino_images: [...config.vicino_images, ...newUrls] });
            toast.success(isAr ? "تم رفع الصور بنجاح" : "Images uploaded successfully");
        } finally {
            setUploadingImages(false);
        }
    };

    const removeImage = (index: number) => {
        const newImages = [...config.vicino_images];
        newImages.splice(index, 1);
        setConfig({ ...config, vicino_images: newImages });
    };

    const getEmbedUrl = (url: string) => {
        if (!url) return null;
        const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch && ytMatch[1]) {
            return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}`;
        }
        const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
        if (vimeoMatch && vimeoMatch[1]) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&loop=1&muted=1&background=1`;
        }
        return null;
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

                <div className="flex items-center justify-between bg-stone-50 dark:bg-[#111] p-4 rounded-xl">
                    <div>
                        <h3 className="font-bold">{isAr ? "لغة المنيو الافتراضية" : "Default Menu Language"}</h3>
                        <p className="text-sm text-slate-500">{isAr ? "اللغة التي سيفتح بها المنيو تلقائياً للعملاء" : "The language the menu will automatically open in"}</p>
                    </div>
                    <select
                        value={config.default_language || "ar"}
                        onChange={(e) => setConfig({ ...config, default_language: e.target.value })}
                        className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-zinc-800 rounded-lg px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                        <option value="ar">{isAr ? "العربية (تلقائي)" : "Arabic (Default)"}</option>
                        <option value="en">{isAr ? "الإنجليزية" : "English"}</option>
                    </select>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg">{isAr ? "الوسائط (فيديو ولوجو)" : "Media (Video & Logo)"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">{isAr ? "فيديو صفحة الهبوط" : "Landing Page Video"}</label>
                            <div className="flex flex-col gap-3">
                                {config.vicino_video_url ? (
                                    <div className="relative w-full h-32 bg-black rounded-lg overflow-hidden border dark:border-zinc-800 flex items-center justify-center group">
                                        {getEmbedUrl(config.vicino_video_url) ? (
                                            <iframe
                                                src={getEmbedUrl(config.vicino_video_url)!}
                                                className="w-full h-full block pointer-events-none opacity-50"
                                                allow="autoplay; fullscreen"
                                                style={{ border: 'none' }}
                                            ></iframe>
                                        ) : (
                                            <video src={config.vicino_video_url} className="w-full h-full object-cover opacity-50" />
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <FileVideo className="w-8 h-8 text-white" />
                                        </div>
                                        <button onClick={() => setConfig({...config, vicino_video_url: ''})} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"><X className="w-4 h-4"/></button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        {uploadingVideo ? <Loader2 className="w-8 h-8 animate-spin text-teal-600" /> : <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />}
                                        <span className="text-sm font-bold text-slate-500">{isAr ? "اختر ملف فيديو" : "Select video file"}</span>
                                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideo} />
                                    </label>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500 whitespace-nowrap">{isAr ? "أو أدخل رابط الفيديو:" : "Or enter video URL:"}</span>
                                    <input 
                                        type="text" 
                                        dir="ltr"
                                        placeholder="https://..." 
                                        value={config.vicino_video_url} 
                                        onChange={(e) => setConfig({...config, vicino_video_url: e.target.value})} 
                                        className="flex-1 px-3 py-2 text-sm border dark:border-zinc-800 rounded-lg bg-stone-50 dark:bg-[#111]"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm mb-1">{isAr ? "اللوجو المخصص (وضع فاتح / داكن)" : "Custom Logo (Light / Dark)"}</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Light Mode */}
                                <div>
                                    <span className="block text-xs mb-1 text-slate-500">{isAr ? "الوضع الفاتح (Light)" : "Light Mode"}</span>
                                    {parsedLogos.light ? (
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden border bg-white flex items-center justify-center group">
                                            <img src={parsedLogos.light} className="w-full h-full object-contain p-2" alt="Light Logo" />
                                            <button onClick={() => updateLogo('light', '')} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                                            {uploadingLogo ? <Loader2 className="w-8 h-8 animate-spin text-teal-600" /> : <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />}
                                            <span className="text-sm font-bold text-slate-500">{isAr ? "اختر شعار الفاتح" : "Select light logo"}</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'light')} disabled={uploadingLogo} />
                                        </label>
                                    )}
                                </div>
                                {/* Dark Mode */}
                                <div>
                                    <span className="block text-xs mb-1 text-slate-500">{isAr ? "الوضع الداكن (Dark)" : "Dark Mode"}</span>
                                    {parsedLogos.dark ? (
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-zinc-800 bg-[#111] flex items-center justify-center group">
                                            <img src={parsedLogos.dark} className="w-full h-full object-contain p-2" alt="Dark Logo" />
                                            <button onClick={() => updateLogo('dark', '')} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-700 border-dashed bg-zinc-900 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                                            {uploadingLogo ? <Loader2 className="w-8 h-8 animate-spin text-teal-600" /> : <UploadCloud className="w-8 h-8 text-zinc-500 mb-2" />}
                                            <span className="text-sm font-bold text-zinc-400">{isAr ? "اختر شعار الداكن" : "Select dark logo"}</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'dark')} disabled={uploadingLogo} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t dark:border-zinc-800">
                                <label className="block text-sm mb-1">{isAr ? "لوجو شاشة التحميل (ذهبي متحرك)" : "Loading Screen Logo (Gold Spinner)"}</label>
                                <p className="text-xs text-slate-500 mb-4">{isAr ? "سيظهر هذا اللوجو داخل دائرة ذهبية تدور أثناء تحميل الصفحة." : "This logo will appear inside a spinning gold circle during page load."}</p>
                                
                                {config.theme_colors?.vicino_loading_logo ? (
                                    <div className="relative w-full md:w-1/2 h-32 rounded-lg overflow-hidden border bg-[#111] flex items-center justify-center group">
                                        <img src={config.theme_colors.vicino_loading_logo} className="w-full h-full object-contain p-2" alt="Loading Logo" />
                                        <button onClick={() => setConfig({...config, theme_colors: { ...config.theme_colors, vicino_loading_logo: '' }})} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full md:w-1/2 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
                                        {uploadingLogo ? <Loader2 className="w-8 h-8 animate-spin text-teal-600" /> : <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />}
                                        <span className="text-sm font-bold text-slate-500">{isAr ? "اختر شعار التحميل" : "Select loading logo"}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleLoadingLogoUpload} disabled={uploadingLogo} />
                                    </label>
                                )}
                            </div>
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
                        <label className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">
                            {uploadingImages ? <Loader2 className="w-5 h-5 animate-spin text-teal-600" /> : <UploadCloud className="w-5 h-5 text-slate-400" />}
                            <span className="font-bold text-slate-500">{isAr ? "رفع صور للمعرض (يمكن اختيار عدة صور)" : "Upload gallery images (Multiple allowed)"}</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={uploadingImages} />
                        </label>
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
