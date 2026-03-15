"use client";
/* eslint-disable @next/next/no-img-element */

import { useLanguage } from "@/lib/context/LanguageContext";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/uploadImage";
import { posDb } from "@/lib/pos-db";
import { Settings, Save, MapPin, Phone, MessageCircle, Instagram, Facebook, Plus, Trash2, Upload, Image as ImageIcon, Download, RefreshCw, AlertTriangle, Send } from "lucide-react";
import { FaTiktok, FaTelegramPlane } from "react-icons/fa";
import { toast } from "sonner";

export type PhoneEntry = { label: string; number: string };

export type PaymentMethodEntry = {
    id: string;
    name_ar: string;
    name_en: string;
    desc_ar: string;
    desc_en: string;
    number?: string;
    link?: string;
};

type RestaurantProfile = {
    id: string;
    name: string;
    phone?: string;
    whatsapp_number?: string;
    facebook_url?: string;
    instagram_url?: string;
    tiktok_url?: string;
    map_link?: string;
    logo_url?: string;
    cover_url?: string;
    cover_images?: string[];
    working_hours?: string;
    address?: string; // New field
    receipt_logo_url?: string; // Specific for receipts
    phone_numbers?: PhoneEntry[];
    payment_methods?: PaymentMethodEntry[];
    marquee_enabled?: boolean;
    marquee_text_ar?: string;
    marquee_text_en?: string;
    orders_enabled?: boolean;
    order_channel?: "whatsapp" | "website" | "both";
    telegram_bot_token?: string;
    telegram_chat_id?: string;
    theme_colors?: {
        primary?: string;
        secondary?: string;
        background?: string;
        text?: string;
    };
};

export default function SettingsPage() {
    const { language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<RestaurantProfile | null>(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneEntry[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodEntry[]>([]);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingReceiptLogo, setUploadingReceiptLogo] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [coverImages, setCoverImages] = useState<string[]>([]);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const receiptLogoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let finalData: RestaurantProfile | null = null;

            // Try fetching with all columns
            const { data: d1, error: e1 } = await supabase
                .from('restaurants')
                .select('id, name, phone, whatsapp_number, address, receipt_logo_url, facebook_url, instagram_url, tiktok_url, map_link, logo_url, cover_url, cover_images, working_hours, phone_numbers, payment_methods, marquee_enabled, marquee_text_ar, marquee_text_en, orders_enabled, order_channel, theme_colors, telegram_bot_token, telegram_chat_id')
                .eq('email', user.email)
                .single();

            if (e1) {
                // Fallback: omit receipt_logo_url and address if they don't exist
                const { data: d2 } = await supabase
                    .from('restaurants')
                    .select('id, name, phone, whatsapp_number, address, facebook_url, instagram_url, tiktok_url, map_link, logo_url, cover_url, cover_images, working_hours, phone_numbers, payment_methods, marquee_enabled, marquee_text_ar, marquee_text_en, orders_enabled, telegram_bot_token, telegram_chat_id')
                    .eq('email', user.email)
                    .single();
                finalData = d2;
            } else {
                finalData = d1;
            }

            if (finalData) {
                setProfile(finalData);
                setPhoneNumbers(finalData.phone_numbers || []);
                setPaymentMethods(finalData.payment_methods || []);
                setCoverImages(finalData.cover_images || []);
            }
            setLoading(false);
        };

        fetchProfile();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSaving(true);
        setSuccessMessage("");

        try {
            // First attempt with all new columns
            let { error } = await supabase
                .from('restaurants')
                .update({
                    name: profile.name,
                    phone: profile.phone,
                    whatsapp_number: profile.whatsapp_number,
                    address: profile.address,
                    receipt_logo_url: profile.receipt_logo_url,
                    facebook_url: profile.facebook_url,
                    instagram_url: profile.instagram_url,
                    tiktok_url: profile.tiktok_url,
                    map_link: profile.map_link,
                    working_hours: profile.working_hours,
                    cover_images: coverImages,
                    phone_numbers: phoneNumbers.filter(p => p.number.trim()),
                    payment_methods: paymentMethods.filter(p => p.name_ar.trim() || p.name_en.trim()),
                    marquee_enabled: profile.marquee_enabled || false,
                    marquee_text_ar: profile.marquee_text_ar || '',
                    marquee_text_en: profile.marquee_text_en || '',
                    orders_enabled: profile.orders_enabled ?? true,
                    order_channel: profile.order_channel || 'whatsapp',
                    theme_colors: profile.theme_colors || {},
                    telegram_bot_token: profile.telegram_bot_token || '',
                    telegram_chat_id: profile.telegram_chat_id || '',
                })
                .eq('id', profile.id);

            // If error, likely due to missing columns (order_channel, theme_colors), attempt fallback
            if (error) {
                const fallbackUpdate = await supabase
                    .from('restaurants')
                    .update({
                        name: profile.name,
                        phone: profile.phone,
                        whatsapp_number: profile.whatsapp_number,
                        address: profile.address,
                        receipt_logo_url: profile.receipt_logo_url,
                        facebook_url: profile.facebook_url,
                        instagram_url: profile.instagram_url,
                        tiktok_url: profile.tiktok_url,
                        map_link: profile.map_link,
                        working_hours: profile.working_hours,
                        cover_images: coverImages,
                        phone_numbers: phoneNumbers.filter(p => p.number.trim()),
                        payment_methods: paymentMethods.filter(p => p.name_ar.trim() || p.name_en.trim()),
                        marquee_enabled: profile.marquee_enabled || false,
                        marquee_text_ar: profile.marquee_text_ar || '',
                        marquee_text_en: profile.marquee_text_en || '',
                        orders_enabled: profile.orders_enabled ?? true,
                    })
                    .eq('id', profile.id);
                error = fallbackUpdate.error;
            }

            if (error) throw error;
            setSuccessMessage(language === "ar" ? "تم حفظ الإعدادات بنجاح!" : "Settings saved successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error(err);
            // We could set an error toast here if needed
            setSuccessMessage(language === "ar" ? "حدث خطأ أثناء החفظ!" : "Error saving settings!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;
        setUploadingLogo(true);
        try {
            const url = await uploadImage(file, `logos/${profile.id}`);
            if (url) {
                const { error } = await supabase.from('restaurants').update({ logo_url: url }).eq('id', profile.id);
                if (error) throw error;
                setProfile({ ...profile, logo_url: url });
                toast.success(language === "ar" ? "تم تحديث اللوجو بنجاح!" : "Logo updated successfully!");
            }
        } catch (err) {
            console.error(err);
            toast.error(language === "ar" ? "فشل حفظ اللوجو في قاعدة البيانات" : "Failed to save logo to database");
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleReceiptLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;
        setUploadingReceiptLogo(true);
        try {
            const url = await uploadImage(file, `receipt_logos/${profile.id}`);
            if (url) {
                const { error } = await supabase.from('restaurants').update({ receipt_logo_url: url }).eq('id', profile.id);
                if (error) throw error;
                setProfile({ ...profile, receipt_logo_url: url });
                toast.success(language === "ar" ? "تم تحديث لوجو الفاتورة بنجاح!" : "Receipt logo updated successfully!");
            }
        } catch (err) {
            console.error(err);
            toast.error(language === "ar" ? "فشل حفظ لوجو الفاتورة في قاعدة البيانات (تأكد من تطبيق كود SQL)" : "Failed to save receipt logo to database (Make sure SQL is applied)");
        } finally {
            setUploadingReceiptLogo(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !profile) return;
        setUploadingCover(true);

        const newUrls: string[] = [];
        for (const file of files) {
            const url = await uploadImage(file, `covers/${profile.id}`);
            if (url) newUrls.push(url);
        }

        if (newUrls.length > 0) {
            const updatedImages = [...coverImages, ...newUrls];
            await supabase.from('restaurants').update({ cover_images: updatedImages }).eq('id', profile.id);
            setCoverImages(updatedImages);
        }
        setUploadingCover(false);
    };

    const removeCoverImage = async (idx: number) => {
        if (!profile) return;
        const updatedImages = coverImages.filter((_, i) => i !== idx);
        await supabase.from('restaurants').update({ cover_images: updatedImages }).eq('id', profile.id);
        setCoverImages(updatedImages);
    };

    const addPhone = () => setPhoneNumbers([...phoneNumbers, { label: "", number: "" }]);
    const removePhone = (idx: number) => setPhoneNumbers(phoneNumbers.filter((_, i) => i !== idx));
    const updatePhone = (idx: number, field: keyof PhoneEntry, val: string) => {
        setPhoneNumbers(phoneNumbers.map((p, i) => i === idx ? { ...p, [field]: val } : p));
    };

    const addPaymentMethod = () => setPaymentMethods([...paymentMethods, { id: crypto.randomUUID(), name_ar: "", name_en: "", desc_ar: "", desc_en: "", number: "", link: "" }]);
    const removePaymentMethod = (idx: number) => setPaymentMethods(paymentMethods.filter((_, i) => i !== idx));
    const updatePaymentMethod = (idx: number, field: keyof PaymentMethodEntry, val: string) => {
        setPaymentMethods(paymentMethods.map((p, i) => i === idx ? { ...p, [field]: val } : p));
    };

    if (loading) return <div className="p-8 text-center text-silver animate-pulse">{language === "ar" ? "جاري التحميل..." : "Loading..."}</div>;
    if (!profile) return null;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            <div className="flex flex-col border-b border-glass-border pb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2 flex items-center gap-3">
                    <Settings className="w-8 h-8 text-blue" />
                    {language === "ar" ? "إعدادات المطعم" : "Restaurant Settings"}
                </h1>
                <p className="text-silver">
                    {language === "ar" ? "قم بتحديث معلومات التواصل والروابط وتفاصيل مطعمك." : "Update your contact information, social links, and restaurant details."}
                </p>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-8">

                {/* Logo & Cover */}
                <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-2xl p-6 sm:p-8">
                    <h2 className="text-xl font-bold mb-6">{language === "ar" ? "اللوجو وصورة الغلاف" : "Logo & Cover Image"}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo */}
                        <div className="space-y-3">
                            <label className="text-base font-medium text-silver px-1 block">{language === "ar" ? "لوجو المطعم (للمنيو)" : "Restaurant Logo (Menu)"}</label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-full border-2 border-glass-border flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-black/20 flex-shrink-0">
                                    {profile.logo_url ? (
                                        <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-silver/40" />
                                    )}
                                </div>
                                <div>
                                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                    <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue/10 text-blue font-bold text-base rounded-xl hover:bg-blue/20 transition-colors disabled:opacity-50">
                                        <Upload className="w-5 h-5" />
                                        {uploadingLogo ? (language === "ar" ? "جاري الرفع..." : "Uploading...") : (language === "ar" ? "رفع لوجو" : "Upload Logo")}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Receipt Logo */}
                        <div className="space-y-3">
                            <label className="text-base font-medium text-silver px-1 block">{language === "ar" ? "لوجو الفاتورة (للطباعة)" : "Receipt Logo (Printing)"}</label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-xl border-2 border-glass-border flex items-center justify-center overflow-hidden bg-white dark:bg-black/20 flex-shrink-0">
                                    {profile.receipt_logo_url ? (
                                        <img src={profile.receipt_logo_url} alt="Receipt Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-silver/40" />
                                    )}
                                </div>
                                <div>
                                    <input ref={receiptLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptLogoUpload} />
                                    <button type="button" onClick={() => receiptLogoInputRef.current?.click()} disabled={uploadingReceiptLogo}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-base rounded-xl hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                                        <Upload className="w-5 h-5" />
                                        {uploadingReceiptLogo ? (language === "ar" ? "جاري الرفع..." : "Uploading...") : (language === "ar" ? "رفع لوجو الفاتورة" : "Upload Receipt Logo")}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Covers */}
                        <div className="space-y-3">
                            <label className="text-base font-medium text-silver px-1 block">{language === "ar" ? "صور الغلاف (بانر)" : "Cover Images (Banners)"}</label>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap gap-2">
                                    {coverImages.length > 0 ? coverImages.map((src, idx) => (
                                        <div key={idx} className="relative w-24 h-16 rounded-xl border-2 border-glass-border overflow-hidden bg-slate-50 dark:bg-black/20 group">
                                            <img src={src} alt="Cover" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => removeCoverImage(idx)} className="absolute inset-0 bg-slate-200 dark:bg-black/50 text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="w-32 h-20 rounded-xl border-2 border-glass-border flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-black/20">
                                            <ImageIcon className="w-8 h-8 text-silver/40" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <input ref={coverInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleCoverUpload} />
                                    <button type="button" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue/10 text-blue font-bold text-base rounded-xl hover:bg-blue/20 transition-colors disabled:opacity-50">
                                        <Upload className="w-5 h-5" />
                                        {uploadingCover ? (language === "ar" ? "جاري الرفع..." : "Uploading...") : (language === "ar" ? "رفع صور الغلاف" : "Upload Covers")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-2xl p-6 sm:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center justify-between w-full md:w-auto">
                            <h2 className="text-xl font-bold">{language === "ar" ? "المعلومات الأساسية" : "Basic Information"}</h2>
                            <label className="relative inline-flex items-center cursor-pointer group md:ml-4">
                                <span className="mr-3 ml-3 text-base font-bold text-zinc-700 dark:text-zinc-300">
                                    {(profile.orders_enabled ?? true)
                                        ? (language === "ar" ? "استقبال الطلبات: مفعل" : "Orders: Enabled")
                                        : (language === "ar" ? "استقبال الطلبات: متوقف" : "Orders: Disabled")
                                    }
                                </span>
                                <input type="checkbox" className="sr-only peer" checked={profile.orders_enabled ?? true} onChange={e => setProfile({ ...profile, orders_enabled: e.target.checked })} />
                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:left-auto rtl:after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-green-500 shadow-inner"></div>
                            </label>
                        </div>

                        {/* Order Channel selector */}
                        <div className="flex items-center gap-2 flex-wrap bg-slate-50 dark:bg-black/20 p-2 rounded-xl border border-glass-border">
                            <span className="text-sm font-bold text-slate-500 dark:text-zinc-500 dark:text-zinc-400 mr-1 ml-1">
                                {language === "ar" ? "طريقة الاستلام:" : "Channel:"}
                            </span>
                            {(["whatsapp", "website", "both"] as const).map(ch => (
                                <button type="button" key={ch}
                                    onClick={(e) => { e.preventDefault(); setProfile({ ...profile, order_channel: ch }); }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${(profile.order_channel || "whatsapp") === ch
                                        ? ch === "whatsapp" ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40"
                                            : ch === "website" ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40"
                                                : "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40"
                                        : "bg-white dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700/50 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-sm"
                                        }`}>
                                    {ch === "whatsapp" ? "📲 واتساب" : ch === "website" ? "📦 ويبسايت" : "🔄 الاثنين"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-base font-medium text-silver px-1 block">{language === "ar" ? "اسم المطعم" : "Restaurant Name"}</label>
                            <input required type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none transition-all font-bold text-base" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-base font-medium text-silver px-1 block">{language === "ar" ? "رقم واتساب (للطلبات)" : "WhatsApp (For Orders)"}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-green-500"><MessageCircle className="w-5 h-5" /></div>
                                <input type="tel" value={profile.whatsapp_number || ''} onChange={e => setProfile({ ...profile, whatsapp_number: e.target.value })} dir="ltr"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-green-500 outline-none transition-all text-base" placeholder="+201..." />
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-base font-medium text-silver px-1 block">{language === "ar" ? "أوقات العمل" : "Working Hours"}</label>
                            <input type="text" value={profile.working_hours || ''} onChange={e => setProfile({ ...profile, working_hours: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none transition-all text-base" placeholder={language === "ar" ? "مثال: من 10 صباحاً إلى 2 صباحاً" : "e.g., 10 AM to 2 AM"} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-base font-medium text-silver px-1 block">{language === "ar" ? "عنوان المكان" : "Restaurant Address"}</label>
                            <input type="text" value={profile.address || ''} onChange={e => setProfile({ ...profile, address: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none transition-all text-base" placeholder={language === "ar" ? "مثال: شارع النيل، المعادي، القاهرة" : "e.g., El Nile St, Maadi, Cairo"} />
                        </div>
                    </div>
                </div>

                {/* Marquee Banner Info */}
                <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-2xl p-6 sm:p-8">
                    <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
                        <span>{language === "ar" ? "الشريط الإخباري (Marquee)" : "Announcement Banner (Marquee)"}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={profile.marquee_enabled || false} onChange={e => setProfile({ ...profile, marquee_enabled: e.target.checked })} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue"></div>
                        </label>
                    </h2>
                    {profile.marquee_enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-base font-medium text-silver px-1 block">{language === "ar" ? "نص الشريط (عربي)" : "Banner Text (Arabic)"}</label>
                                <input type="text" value={profile.marquee_text_ar || ''} onChange={e => setProfile({ ...profile, marquee_text_ar: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none transition-all font-bold text-base" placeholder={language === "ar" ? "مثال: عرض خاص لفترة محدودة!" : "e.g., Special offer for a limited time!"} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-base font-medium text-silver px-1 block">{language === "ar" ? "نص الشريط (إنجليزي)" : "Banner Text (English)"}</label>
                                <input type="text" value={profile.marquee_text_en || ''} onChange={e => setProfile({ ...profile, marquee_text_en: e.target.value })} dir="ltr"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none transition-all font-bold text-base" placeholder="e.g., Special offer for a limited time!" />
                            </div>
                        </div>
                    )}
                </div>


                {/* Multi-Phone Numbers */}
                <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-2xl p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Phone className="w-5 h-5 text-blue" />
                            {language === "ar" ? "أرقام الاتصال" : "Phone Numbers"}
                        </h2>
                        <button type="button" onClick={addPhone}
                            className="flex items-center gap-1 px-3 py-2 bg-blue/10 text-blue font-bold text-sm rounded-xl hover:bg-blue/20 transition-colors">
                            <Plus className="w-4 h-4" />
                            {language === "ar" ? "إضافة رقم" : "Add Number"}
                        </button>
                    </div>

                    {phoneNumbers.length === 0 ? (
                        <p className="text-base text-silver text-center py-4">{language === "ar" ? "لم تتم إضافة أرقام بعد. أضف أرقام ليتم عرضها في المنيو." : "No numbers added yet. Add numbers to display in the menu."}</p>
                    ) : (
                        <div className="space-y-3">
                            {phoneNumbers.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-glass-border">
                                    <input type="text" value={p.label} onChange={e => updatePhone(idx, 'label', e.target.value)} placeholder={language === "ar" ? "التسمية (مثال: رقم 1)" : "Label (e.g. Line 1)"}
                                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base font-bold" />
                                    <input type="tel" value={p.number} onChange={e => updatePhone(idx, 'number', e.target.value)} placeholder="01xxxxxxxxx" dir="ltr"
                                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base font-bold tabular-nums" />
                                    <button type="button" onClick={() => removePhone(idx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Dynamic Payment Methods */}
                <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-2xl p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-2xl text-blue">💳</span>
                                {language === "ar" ? "وسائل الدفع" : "Payment Methods"}
                            </h2>
                            <p className="text-base text-silver whitespace-pre-wrap">
                                {language === "ar"
                                    ? "أضف وسائل الدفع المتاحة (مثل انستا باي، فودافون كاش، الدفع عند الاستلام).\nيمكنك إضافة رقم حاسب (مثل رقم المحفظة) أو رابط (مثل رابط انستا باي)."
                                    : "Add available payment methods (e.g., InstaPay, Vodafone Cash, Cash on Delivery).\nYou can optionally add a number or a direct link."}
                            </p>
                        </div>
                        <button type="button" onClick={addPaymentMethod}
                            className="flex items-center gap-1 shrink-0 px-3 py-2 bg-blue/10 text-blue font-bold text-sm rounded-xl hover:bg-blue/20 transition-colors">
                            <Plus className="w-4 h-4" />
                            {language === "ar" ? "إضافة وسيلة" : "Add Method"}
                        </button>
                    </div>

                    {paymentMethods.length === 0 ? (
                        <p className="text-sm text-silver text-center py-4">{language === "ar" ? "لم تتم إضافة وسائل دفع بعد." : "No payment methods added yet."}</p>
                    ) : (
                        <div className="space-y-4">
                            {paymentMethods.map((pm, idx) => (
                                <div key={pm.id} className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-glass-border flex flex-col gap-4 relative">
                                    <button type="button" onClick={() => removePaymentMethod(idx)} className="absolute top-4 right-4 rtl:left-4 rtl:right-auto p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors z-10">
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-silver px-1">{language === "ar" ? "الاسم (عربي) *" : "Name (Arabic) *"}</label>
                                            <input required type="text" value={pm.name_ar} onChange={e => updatePaymentMethod(idx, 'name_ar', e.target.value)} placeholder="مثال: انستا باي / فودافون كاش"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-silver px-1">{language === "ar" ? "الاسم (إنجليزي) *" : "Name (English) *"}</label>
                                            <input required type="text" value={pm.name_en} onChange={e => updatePaymentMethod(idx, 'name_en', e.target.value)} placeholder="e.g. InstaPay / Vodafone Cash"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base font-bold" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-silver px-1">{language === "ar" ? "وصف قصير (عربي)" : "Short Desc (Arabic)"}</label>
                                            <input type="text" value={pm.desc_ar} onChange={e => updatePaymentMethod(idx, 'desc_ar', e.target.value)} placeholder="مثال: تحويل لحظي / الدفع عند الاستلام"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-silver px-1">{language === "ar" ? "وصف قصير (إنجليزي)" : "Short Desc (English)"}</label>
                                            <input type="text" value={pm.desc_en} onChange={e => updatePaymentMethod(idx, 'desc_en', e.target.value)} placeholder="e.g. Instant transfer / Cash on delivery"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-silver px-1">{language === "ar" ? "رقم الحساب / المحفظة (اختياري)" : "Account/Wallet Number (Optional)"}</label>
                                            <input type="text" value={pm.number || ''} onChange={e => updatePaymentMethod(idx, 'number', e.target.value)} placeholder="010..." dir="ltr"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base tabular-nums" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-silver px-1">{language === "ar" ? "رابط الدفع (اختياري)" : "Payment Link (Optional)"}</label>
                                            <input type="url" value={pm.link || ''} onChange={e => updatePaymentMethod(idx, 'link', e.target.value)} placeholder="https://..." dir="ltr"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Social & Contact Links */}
                <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-2xl p-6 sm:p-8">
                    <h2 className="text-xl font-bold mb-6">{language === "ar" ? "روابط التواصل والسوشيال ميديا" : "Social Media & Contact Links"}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "رابط خريطة المكان" : "Google Maps Link"}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-600 dark:text-blue-400"><MapPin className="w-5 h-5" /></div>
                                <input type="url" value={profile.map_link || ''} onChange={e => setProfile({ ...profile, map_link: e.target.value })} dir="ltr"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue-400 outline-none transition-all text-base" placeholder="https://maps.app.goo.gl/..." />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "رابط فيسبوك" : "Facebook Link"}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-600"><Facebook className="w-5 h-5" /></div>
                                <input type="url" value={profile.facebook_url || ''} onChange={e => setProfile({ ...profile, facebook_url: e.target.value })} dir="ltr"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue-600 outline-none transition-all text-base" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "رابط إنستجرام" : "Instagram Link"}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-pink-500"><Instagram className="w-5 h-5" /></div>
                                <input type="url" value={profile.instagram_url || ''} onChange={e => setProfile({ ...profile, instagram_url: e.target.value })} dir="ltr"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-pink-500 outline-none transition-all text-base" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "رابط تيك توك" : "TikTok Link"}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground"><FaTiktok className="w-5 h-5" /></div>
                                <input type="url" value={profile.tiktok_url || ''} onChange={e => setProfile({ ...profile, tiktok_url: e.target.value })} dir="ltr"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-foreground outline-none transition-all text-base" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Telegram Notifications */}
                <TelegramSettingsPanel profile={profile} setProfile={setProfile} language={language} />

                {/* Backup & Restore */}
                <BackupRestorePanel />

                {/* Save */}
                <div className="flex items-center gap-4">
                    <button type="submit" disabled={saving}
                        className={`px-8 py-4 bg-gradient-to-r from-blue to-cyan-500 text-slate-900 dark:text-white font-bold rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all ${saving ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}>
                        <Save className="w-5 h-5" />
                        {saving ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ الإعدادات" : "Save Settings")}
                    </button>
                    {successMessage && <span className="text-green-500 font-bold">{successMessage}</span>}
                </div>
            </form>
        </div>
    );
}

function TelegramSettingsPanel({ profile, setProfile, language }: {
    profile: RestaurantProfile;
    setProfile: (p: RestaurantProfile) => void;
    language: string;
}) {
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleTest = async () => {
        if (!profile.telegram_bot_token || !profile.telegram_chat_id) {
            setTestResult({ success: false, message: language === "ar" ? "يرجى إدخال التوكن و Chat ID أولاً" : "Please enter Bot Token and Chat ID first" });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botToken: profile.telegram_bot_token,
                    chatId: profile.telegram_chat_id,
                    message: `✅ *تم الاتصال بنجاح!*\n\nهذه رسالة تجريبية من نظام ${profile.name || 'ASN'}.\nسيتم إرسال إشعارات الطلبات الجديدة تلقائياً إلى هذه المحادثة.\n\n🕐 ${new Date().toLocaleString('ar-EG')}`,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setTestResult({ success: true, message: language === "ar" ? "✅ تم الإرسال بنجاح! تحقق من التلغرام" : "✅ Sent successfully! Check your Telegram" });
            } else {
                setTestResult({ success: false, message: data.error || (language === "ar" ? "فشل الإرسال" : "Failed to send") });
            }
        } catch {
            setTestResult({ success: false, message: language === "ar" ? "خطأ في الاتصال" : "Connection error" });
        } finally {
            setTesting(false);
            setTimeout(() => setTestResult(null), 5000);
        }
    };

    return (
        <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <FaTelegramPlane className="w-5 h-5 text-[#0088cc]" />
                {language === "ar" ? "إشعارات تلغرام" : "Telegram Notifications"}
            </h2>
            <p className="text-sm text-silver mb-6">
                {language === "ar"
                    ? "فعّل إشعارات تلغرام لاستقبال الطلبات الجديدة تلقائياً على حسابك. أنشئ بوت عبر @BotFather واحصل على Chat ID من @userinfobot."
                    : "Enable Telegram notifications to automatically receive new orders. Create a bot via @BotFather and get your Chat ID from @userinfobot."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-silver px-1 block">
                        {language === "ar" ? "توكن البوت (Bot Token)" : "Bot Token"}
                    </label>
                    <input
                        type="text"
                        value={profile.telegram_bot_token || ''}
                        onChange={e => setProfile({ ...profile, telegram_bot_token: e.target.value })}
                        dir="ltr"
                        placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-[#0088cc] outline-none transition-all text-sm font-mono"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 px-1">
                        {language === "ar" ? "أنشئ بوت جديد عبر @BotFather على تلغرام" : "Create a new bot via @BotFather on Telegram"}
                    </p>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-silver px-1 block">
                        {language === "ar" ? "رقم المحادثة (Chat ID)" : "Chat ID"}
                    </label>
                    <input
                        type="text"
                        value={profile.telegram_chat_id || ''}
                        onChange={e => setProfile({ ...profile, telegram_chat_id: e.target.value })}
                        dir="ltr"
                        placeholder="123456789"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-[#0088cc] outline-none transition-all text-sm font-mono"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 px-1">
                        {language === "ar" ? "أرسل /start لبوتك ثم احصل على الـ Chat ID من @userinfobot" : "Send /start to your bot, then get your Chat ID from @userinfobot"}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 mt-5">
                <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !profile.telegram_bot_token || !profile.telegram_chat_id}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0088cc]/10 text-[#0088cc] font-bold text-sm rounded-xl hover:bg-[#0088cc]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Send className="w-4 h-4" />
                    {testing
                        ? (language === "ar" ? "جاري الإرسال..." : "Sending...")
                        : (language === "ar" ? "إرسال رسالة تجريبية" : "Send Test Message")}
                </button>
                {testResult && (
                    <span className={`text-sm font-bold ${testResult.success ? 'text-green-500' : 'text-red-500'}`}>
                        {testResult.message}
                    </span>
                )}
            </div>
        </div>
    );
}

function BackupRestorePanel() {
    const [restoring, setRestoring] = useState(false);
    const [status, setStatus] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        const data = {
            categories: await posDb.categories.toArray(),
            menu_items: await posDb.menu_items.toArray(),
            orders: await posDb.orders.toArray(),
            customers: await posDb.customers.toArray(),
            pos_users: await posDb.pos_users.toArray(),
            settings: await posDb.settings.toArray(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = `ASN_POS_Backup_${new Date().toISOString().split("T")[0]}.json`;
        a.click(); URL.revokeObjectURL(a.href);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setRestoring(true); setStatus("");
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data.categories?.length) await posDb.categories.bulkPut(data.categories);
                if (data.menu_items?.length) await posDb.menu_items.bulkPut(data.menu_items);
                if (data.orders?.length) await posDb.orders.bulkPut(data.orders);
                if (data.customers?.length) await posDb.customers.bulkPut(data.customers);
                if (data.pos_users?.length) await posDb.pos_users.bulkPut(data.pos_users);
                setStatus("✓ تم استعادة البيانات بنجاح!");
            } catch { setStatus("✗ ملف غير صالح أو خطأ في الاستعادة"); }
            finally { setRestoring(false); }
        };
        reader.readAsText(file);
        if (fileRef.current) fileRef.current.value = "";
    };

    return (
        <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" /> النسخ الاحتياطي والاستعادة</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-500 mb-5">احتفظ بنسخة احتياطية من بيانات POS المحلية أو استعدها من ملف سابق.</p>
            <div className="flex flex-wrap gap-3 items-center">
                <button type="button" onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-500/20 rounded-xl font-bold text-sm transition"><Download className="w-4 h-4" /> تنزيل نسخة احتياطية</button>
                <label className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-500/20 rounded-xl font-bold text-sm transition cursor-pointer">
                    <Upload className="w-4 h-4" /> {restoring ? "جاري الاستعادة..." : "استعادة من ملف"}
                    <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> استعادة البيانات ستضيف البيانات إلى القاعدة المحلية دون حذف الحالية.</div>
            {status && <p className="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">{status}</p>}
        </div>
    );
}
