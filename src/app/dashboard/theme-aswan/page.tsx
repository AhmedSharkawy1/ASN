"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { Save, Loader2, ImagePlus, X, Video, UploadCloud, FileVideo, Trash2, Sun, Moon } from "lucide-react";
import { uploadImageWithThumb } from "@/lib/uploadImage";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { posDb } from "@/lib/pos-db";

interface AswanConfig {
    aswan_landing_enabled: boolean;
    aswan_video_url: string;
    aswan_logo_url: string;
    aswan_about_en: string;
    aswan_history_en: string;
    aswan_images: string[];
    aswan_bg_light: string;
    aswan_bg_dark: string;
    theme_colors: any;
}

export default function ThemeAswanSettings() {
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

    const [config, setConfig] = useState<AswanConfig>({
        aswan_landing_enabled: false,
        aswan_video_url: "",
        aswan_logo_url: "",
        aswan_about_en: "",
        aswan_history_en: "",
        aswan_images: [],
        aswan_bg_light: "",
        aswan_bg_dark: "",
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
                    .select("theme_colors, vicino_landing_enabled, vicino_video_url, vicino_logo_url, vicino_about_en, vicino_history_en, vicino_images")
                    .eq("id", rId)
                    .single();

                if (error && error.code !== "PGRST116") throw error;
                if (data) {
                    const tc = data.theme_colors || {};
                    setConfig({
                        aswan_landing_enabled: tc.aswan_landing_enabled ?? data.vicino_landing_enabled ?? false,
                        aswan_video_url: tc.aswan_video_url || data.vicino_video_url || "",
                        aswan_logo_url: tc.aswan_logo_url || data.vicino_logo_url || "",
                        aswan_about_en: tc.aswan_about_en || data.vicino_about_en || "",
                        aswan_history_en: tc.aswan_history_en || data.vicino_history_en || "",
                        aswan_images: tc.aswan_images || data.vicino_images || [],
                        aswan_bg_light: tc.aswan_bg_light || tc.bg_image_light || "",
                        aswan_bg_dark: tc.aswan_bg_dark || tc.bg_image_dark || "",
                        theme_colors: tc,
                    });
                }
            } catch (err: any) {
                console.error("Error loading ASWAN config:", err);
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
            const updatedThemeColors = {
                ...config.theme_colors,
                aswan_landing_enabled: config.aswan_landing_enabled,
                aswan_video_url: config.aswan_video_url,
                aswan_logo_url: config.aswan_logo_url,
                aswan_about_en: config.aswan_about_en,
                aswan_history_en: config.aswan_history_en,
                aswan_images: config.aswan_images,
                aswan_bg_light: config.aswan_bg_light,
                aswan_bg_dark: config.aswan_bg_dark,
                bg_image_light: config.aswan_bg_light,
                bg_image_dark: config.aswan_bg_dark,
                default_language: 'en',
            };

            const { data, error } = await supabase
                .from("restaurants")
                .update({
                    vicino_video_url: config.aswan_video_url,
                    vicino_logo_url: config.aswan_logo_url,
                    theme_colors: updatedThemeColors
                })
                .eq("id", restaurantId)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("Could not update data. Check database permissions (RLS).");

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

            toast.success(isAr ? "تم حفظ إعدادات ثيم أسوان بنجاح" : "ASWAN Theme settings saved successfully");
        } catch (err: any) {
            console.error("Error saving:", err);
            toast.error(err.message || (isAr ? "حدث خطأ أثناء الحفظ" : "Error occurred while saving"));
        } finally {
            setSaving(false);
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingVideo(true);
        try {
            const fileExt = file.name.split('.').pop() || 'mp4';
            const fileName = `aswan/videos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from('menu-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('menu-images')
                .getPublicUrl(fileName);

            setConfig(prev => ({ ...prev, aswan_video_url: publicUrl }));
            toast.success(isAr ? "تم رفع الفيديو بنجاح!" : "Video uploaded successfully!");
        } catch (err: any) {
            console.error("Video upload error:", err);
            toast.error(isAr ? "فشل رفع الفيديو: " + err.message : "Video upload failed: " + err.message);
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (mode === 'light') setUploadingBgLight(true);
        else setUploadingBgDark(true);

        try {
            const result = await uploadImageWithThumb(file, `aswan/bg_${mode}_${Date.now()}`);
            if (result && result.originalUrl) {
                if (mode === 'light') {
                    setConfig(prev => ({ ...prev, aswan_bg_light: result.originalUrl }));
                } else {
                    setConfig(prev => ({ ...prev, aswan_bg_dark: result.originalUrl }));
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

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingLogo(true);
        try {
            const result = await uploadImageWithThumb(file, `aswan/logo_${mode}_${Date.now()}`);
            if (result && result.originalUrl) {
                let currentLogos = { light: '', dark: '' };
                if (config.aswan_logo_url) {
                    if (config.aswan_logo_url.startsWith('{')) {
                        try { currentLogos = JSON.parse(config.aswan_logo_url); } catch {}
                    } else {
                        currentLogos = { light: config.aswan_logo_url, dark: config.aswan_logo_url };
                    }
                }
                const newLogos = { ...currentLogos, [mode]: result.originalUrl };
                setConfig({ ...config, aswan_logo_url: JSON.stringify(newLogos) });
                toast.success(isAr ? "تم رفع اللوجو بنجاح" : "Logo uploaded successfully");
            }
        } catch (err) {
            console.error("Logo upload error:", err);
            toast.error(isAr ? "فشل رفع اللوجو" : "Failed to upload logo");
        } finally {
            setUploadingLogo(false);
        }
    };

    const getLogos = () => {
        if (!config.aswan_logo_url) return { light: '', dark: '' };
        if (config.aswan_logo_url.startsWith('{')) {
            try { return JSON.parse(config.aswan_logo_url); } catch {}
        }
        return { light: config.aswan_logo_url, dark: config.aswan_logo_url };
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingImages(true);
        try {
            const newUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const res = await uploadImageWithThumb(files[i], `aswan/gallery_${Date.now()}_${i}`);
                if (res && res.originalUrl) {
                    newUrls.push(res.originalUrl);
                }
            }
            setConfig({ ...config, aswan_images: [...config.aswan_images, ...newUrls] });
            toast.success(isAr ? "تم رفع الصور بنجاح" : "Images uploaded successfully");
        } catch (err) {
            console.error("Gallery upload error:", err);
            toast.error(isAr ? "فشل رفع بعض الصور" : "Failed to upload images");
        } finally {
            setUploadingImages(false);
        }
    };

    const removeGalleryImage = (index: number) => {
        const updated = [...config.aswan_images];
        updated.splice(index, 1);
        setConfig({ ...config, aswan_images: updated });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue animate-spin" />
            </div>
        );
    }

    const logos = getLogos();

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8" dir={isAr ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-3">
                        <span>ASWAN Theme Settings (100% English)</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Customize background images for Light/Dark modes, landing page video file or link, about story, and branding.
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>Save Settings</span>
                </button>
            </div>

            {/* Toggle Landing Page */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg">Enable ASWAN Landing Page</h3>
                    <p className="text-sm opacity-70">
                        When enabled, customers see a luxury landing page with video and brand story before entering the menu.
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={config.aswan_landing_enabled}
                        onChange={(e) => setConfig({ ...config, aswan_landing_enabled: e.target.checked })}
                        className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {/* Light Mode & Dark Mode Background Image Upload Section */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-6">
                <h3 className="font-bold text-xl border-b pb-3 border-border">Theme Background Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Light Mode Background */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <Sun className="w-4 h-4 text-amber-500" />
                            <span>Light Mode Background Image</span>
                        </div>
                        {config.aswan_bg_light ? (
                            <div className="relative h-44 rounded-2xl overflow-hidden border border-border group">
                                <img src={config.aswan_bg_light} alt="Light Background" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setConfig({ ...config, aswan_bg_light: "" })}
                                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="h-44 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors p-4 text-center">
                                {uploadingBgLight ? (
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                ) : (
                                    <>
                                        <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                                        <span className="text-xs font-bold">Upload Light Mode Background</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" onChange={(e) => handleBgUpload(e, 'light')} className="hidden" />
                            </label>
                        )}
                        <input
                            type="text"
                            placeholder="Or paste Light BG Image URL"
                            value={config.aswan_bg_light}
                            onChange={(e) => setConfig({ ...config, aswan_bg_light: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold outline-none"
                        />
                    </div>

                    {/* Dark Mode Background */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <Moon className="w-4 h-4 text-sky-400" />
                            <span>Dark Mode Background Image</span>
                        </div>
                        {config.aswan_bg_dark ? (
                            <div className="relative h-44 rounded-2xl overflow-hidden border border-border group">
                                <img src={config.aswan_bg_dark} alt="Dark Background" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setConfig({ ...config, aswan_bg_dark: "" })}
                                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="h-44 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors p-4 text-center">
                                {uploadingBgDark ? (
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                ) : (
                                    <>
                                        <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                                        <span className="text-xs font-bold">Upload Dark Mode Background</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" onChange={(e) => handleBgUpload(e, 'dark')} className="hidden" />
                            </label>
                        )}
                        <input
                            type="text"
                            placeholder="Or paste Dark BG Image URL"
                            value={config.aswan_bg_dark}
                            onChange={(e) => setConfig({ ...config, aswan_bg_dark: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Hero Video Upload or URL */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-500" />
                    <span>Hero Landing Video (Direct Upload or Link)</span>
                </h3>
                <p className="text-xs opacity-70">
                    You can upload a video file directly (MP4/WebM/MOV) or paste a YouTube / Vimeo URL.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md">
                        {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileVideo className="w-4 h-4" />}
                        <span>{uploadingVideo ? "Uploading Video..." : "Upload Video File"}</span>
                        <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={uploadingVideo} className="hidden" />
                    </label>

                    <div className="flex-1 w-full">
                        <input
                            type="text"
                            placeholder="Or paste YouTube / Vimeo / Direct Video Link..."
                            value={config.aswan_video_url}
                            onChange={(e) => setConfig({ ...config, aswan_video_url: e.target.value })}
                            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm font-semibold outline-none"
                        />
                    </div>
                </div>

                {config.aswan_video_url && (
                    <div className="pt-2 relative">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-500">Current Video Preview:</span>
                            <button onClick={() => setConfig({ ...config, aswan_video_url: '' })} className="text-xs text-red-500 hover:underline">Remove Video</button>
                        </div>
                        <div className="rounded-2xl overflow-hidden border border-border max-w-md bg-black aspect-video">
                            {config.aswan_video_url.includes('youtube.com') || config.aswan_video_url.includes('youtu.be') || config.aswan_video_url.includes('vimeo.com') ? (
                                <iframe src={config.aswan_video_url} className="w-full h-full" allowFullScreen></iframe>
                            ) : (
                                <video src={config.aswan_video_url} controls className="w-full h-full object-cover"></video>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Brand Logos */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="font-bold text-lg">Theme Logos (Light & Dark)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <span className="text-xs font-bold block mb-2">Light Mode Logo</span>
                        {logos.light ? (
                            <div className="relative w-28 h-28 border border-border rounded-2xl p-2 bg-white flex items-center justify-center group">
                                <img src={logos.light} className="w-full h-full object-contain" alt="Light logo" />
                                <button onClick={() => setConfig({ ...config, aswan_logo_url: JSON.stringify({ ...logos, light: '' }) })} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                            </div>
                        ) : (
                            <label className="w-28 h-28 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer p-2">
                                <UploadCloud className="w-6 h-6 text-slate-400" />
                                <span className="text-[10px] font-bold text-center mt-1">Upload Light</span>
                                <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'light')} className="hidden" />
                            </label>
                        )}
                    </div>

                    <div>
                        <span className="text-xs font-bold block mb-2">Dark Mode Logo</span>
                        {logos.dark ? (
                            <div className="relative w-28 h-28 border border-border rounded-2xl p-2 bg-slate-900 flex items-center justify-center group">
                                <img src={logos.dark} className="w-full h-full object-contain" alt="Dark logo" />
                                <button onClick={() => setConfig({ ...config, aswan_logo_url: JSON.stringify({ ...logos, dark: '' }) })} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                            </div>
                        ) : (
                            <label className="w-28 h-28 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer p-2">
                                <UploadCloud className="w-6 h-6 text-slate-400" />
                                <span className="text-[10px] font-bold text-center mt-1">Upload Dark</span>
                                <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'dark')} className="hidden" />
                            </label>
                        )}
                    </div>
                </div>
            </div>

            {/* English About & Story */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="font-bold text-lg">English Brand Story</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 opacity-70">About Us (English)</label>
                        <textarea
                            rows={3}
                            value={config.aswan_about_en}
                            onChange={(e) => setConfig({ ...config, aswan_about_en: e.target.value })}
                            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm font-medium outline-none resize-none"
                            placeholder="Introduce your restaurant brand in English..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold mb-1 opacity-70">Our History & Story (English)</label>
                        <textarea
                            rows={3}
                            value={config.aswan_history_en}
                            onChange={(e) => setConfig({ ...config, aswan_history_en: e.target.value })}
                            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm font-medium outline-none resize-none"
                            placeholder="Describe your heritage, master chefs, or signature recipes..."
                        />
                    </div>
                </div>
            </div>

            {/* Photo Gallery */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Photo Gallery</h3>
                    <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors">
                        {uploadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                        <span>Add Photos</span>
                        <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
                    </label>
                </div>

                {config.aswan_images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {config.aswan_images.map((img, idx) => (
                            <div key={idx} className="relative group h-32 rounded-2xl overflow-hidden border border-border">
                                <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeGalleryImage(idx)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs opacity-50 italic text-center py-6">No gallery photos added yet.</p>
                )}
            </div>
        </div>
    );
}
