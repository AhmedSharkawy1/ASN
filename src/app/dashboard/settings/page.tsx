"use client";
/* eslint-disable @next/next/no-img-element */

import { useLanguage } from "@/lib/context/LanguageContext";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/uploadImage";
import { Settings, Save, MapPin, Phone, MessageCircle, Instagram, Facebook, Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { FaTiktok } from "react-icons/fa";

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
    phone_numbers?: PhoneEntry[];
    payment_methods?: PaymentMethodEntry[];
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
    const [uploadingCover, setUploadingCover] = useState(false);
    const [coverImages, setCoverImages] = useState<string[]>([]);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('restaurants')
                .select('id, name, phone, whatsapp_number, facebook_url, instagram_url, tiktok_url, map_link, logo_url, cover_url, cover_images, working_hours, phone_numbers, payment_methods')
                .eq('email', user.email)
                .single();

            if (data) {
                setProfile(data);
                setPhoneNumbers(data.phone_numbers || []);
                setPaymentMethods(data.payment_methods || []);
                setCoverImages(data.cover_images || []);
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
            const { error } = await supabase
                .from('restaurants')
                .update({
                    name: profile.name,
                    phone: profile.phone,
                    whatsapp_number: profile.whatsapp_number,
                    facebook_url: profile.facebook_url,
                    instagram_url: profile.instagram_url,
                    tiktok_url: profile.tiktok_url,
                    map_link: profile.map_link,
                    working_hours: profile.working_hours,
                    cover_images: coverImages,
                    phone_numbers: phoneNumbers.filter(p => p.number.trim()),
                    payment_methods: paymentMethods.filter(p => p.name_ar.trim() || p.name_en.trim()),
                })
                .eq('id', profile.id);

            if (error) throw error;
            setSuccessMessage(language === "ar" ? "تم حفظ الإعدادات بنجاح!" : "Settings saved successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;
        setUploadingLogo(true);
        const url = await uploadImage(file, `logos/${profile.id}`);
        if (url) {
            await supabase.from('restaurants').update({ logo_url: url }).eq('id', profile.id);
            setProfile({ ...profile, logo_url: url });
        }
        setUploadingLogo(false);
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
        <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
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
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "لوجو المطعم" : "Restaurant Logo"}</label>
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
                                        className="flex items-center gap-2 px-4 py-2 bg-blue/10 text-blue font-bold text-sm rounded-xl hover:bg-blue/20 transition-colors disabled:opacity-50">
                                        <Upload className="w-4 h-4" />
                                        {uploadingLogo ? (language === "ar" ? "جاري الرفع..." : "Uploading...") : (language === "ar" ? "رفع لوجو" : "Upload Logo")}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Covers */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "صور الغلاف (بانر)" : "Cover Images (Banners)"}</label>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap gap-2">
                                    {coverImages.length > 0 ? coverImages.map((src, idx) => (
                                        <div key={idx} className="relative w-24 h-16 rounded-xl border-2 border-glass-border overflow-hidden bg-slate-50 dark:bg-black/20 group">
                                            <img src={src} alt="Cover" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => removeCoverImage(idx)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Trash2 className="w-5 h-5 text-red-400" />
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
                                        className="flex items-center gap-2 px-4 py-2 bg-blue/10 text-blue font-bold text-sm rounded-xl hover:bg-blue/20 transition-colors disabled:opacity-50">
                                        <Upload className="w-4 h-4" />
                                        {uploadingCover ? (language === "ar" ? "جاري الرفع..." : "Uploading...") : (language === "ar" ? "رفع صور الغلاف" : "Upload Covers")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-2xl p-6 sm:p-8">
                    <h2 className="text-xl font-bold mb-6">{language === "ar" ? "المعلومات الأساسية" : "Basic Information"}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "اسم المطعم" : "Restaurant Name"}</label>
                            <input required type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none transition-all font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "رقم واتساب (للطلبات)" : "WhatsApp (For Orders)"}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-green-500"><MessageCircle className="w-4 h-4" /></div>
                                <input type="tel" value={profile.whatsapp_number || ''} onChange={e => setProfile({ ...profile, whatsapp_number: e.target.value })} dir="ltr"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-green-500 outline-none transition-all" placeholder="+201..." />
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "أوقات العمل" : "Working Hours"}</label>
                            <input type="text" value={profile.working_hours || ''} onChange={e => setProfile({ ...profile, working_hours: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none transition-all" placeholder={language === "ar" ? "مثال: من 10 صباحاً إلى 2 صباحاً" : "e.g., 10 AM to 2 AM"} />
                        </div>
                    </div>
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
                        <p className="text-sm text-silver text-center py-4">{language === "ar" ? "لم تتم إضافة أرقام بعد. أضف أرقام ليتم عرضها في المنيو." : "No numbers added yet. Add numbers to display in the menu."}</p>
                    ) : (
                        <div className="space-y-3">
                            {phoneNumbers.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-glass-border">
                                    <input type="text" value={p.label} onChange={e => updatePhone(idx, 'label', e.target.value)} placeholder={language === "ar" ? "التسمية (مثال: رقم 1)" : "Label (e.g. Line 1)"}
                                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-sm font-bold" />
                                    <input type="tel" value={p.number} onChange={e => updatePhone(idx, 'number', e.target.value)} placeholder="01xxxxxxxxx" dir="ltr"
                                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-sm font-bold tabular-nums" />
                                    <button type="button" onClick={() => removePhone(idx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
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
                            <p className="text-sm text-silver whitespace-pre-wrap">
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
                                            <label className="text-xs font-bold text-silver px-1">{language === "ar" ? "الاسم (عربي) *" : "Name (Arabic) *"}</label>
                                            <input required type="text" value={pm.name_ar} onChange={e => updatePaymentMethod(idx, 'name_ar', e.target.value)} placeholder="مثال: انستا باي / فودافون كاش"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-sm font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-silver px-1">{language === "ar" ? "الاسم (إنجليزي) *" : "Name (English) *"}</label>
                                            <input required type="text" value={pm.name_en} onChange={e => updatePaymentMethod(idx, 'name_en', e.target.value)} placeholder="e.g. InstaPay / Vodafone Cash"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-sm font-bold" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-silver px-1">{language === "ar" ? "وصف قصير (عربي)" : "Short Desc (Arabic)"}</label>
                                            <input type="text" value={pm.desc_ar} onChange={e => updatePaymentMethod(idx, 'desc_ar', e.target.value)} placeholder="مثال: تحويل لحظي / الدفع عند الاستلام"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-silver px-1">{language === "ar" ? "وصف قصير (إنجليزي)" : "Short Desc (English)"}</label>
                                            <input type="text" value={pm.desc_en} onChange={e => updatePaymentMethod(idx, 'desc_en', e.target.value)} placeholder="e.g. Instant transfer / Cash on delivery"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-sm" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-silver px-1">{language === "ar" ? "رقم الحساب / المحفظة (اختياري)" : "Account/Wallet Number (Optional)"}</label>
                                            <input type="text" value={pm.number || ''} onChange={e => updatePaymentMethod(idx, 'number', e.target.value)} placeholder="010..." dir="ltr"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-sm tabular-nums" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-silver px-1">{language === "ar" ? "رابط الدفع (اختياري)" : "Payment Link (Optional)"}</label>
                                            <input type="url" value={pm.link || ''} onChange={e => updatePaymentMethod(idx, 'link', e.target.value)} placeholder="https://..." dir="ltr"
                                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-sm" />
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
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-400"><MapPin className="w-4 h-4" /></div>
                                <input type="url" value={profile.map_link || ''} onChange={e => setProfile({ ...profile, map_link: e.target.value })} dir="ltr"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue-400 outline-none transition-all text-sm" placeholder="https://maps.app.goo.gl/..." />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "رابط فيسبوك" : "Facebook Link"}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-600"><Facebook className="w-4 h-4" /></div>
                                <input type="url" value={profile.facebook_url || ''} onChange={e => setProfile({ ...profile, facebook_url: e.target.value })} dir="ltr"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue-600 outline-none transition-all text-sm" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "رابط إنستجرام" : "Instagram Link"}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-pink-500"><Instagram className="w-4 h-4" /></div>
                                <input type="url" value={profile.instagram_url || ''} onChange={e => setProfile({ ...profile, instagram_url: e.target.value })} dir="ltr"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-pink-500 outline-none transition-all text-sm" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-silver px-1 block">{language === "ar" ? "رابط تيك توك" : "TikTok Link"}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground"><FaTiktok className="w-4 h-4" /></div>
                                <input type="url" value={profile.tiktok_url || ''} onChange={e => setProfile({ ...profile, tiktok_url: e.target.value })} dir="ltr"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-foreground outline-none transition-all text-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save */}
                <div className="flex items-center gap-4">
                    <button type="submit" disabled={saving}
                        className={`px-8 py-4 bg-gradient-to-r from-blue to-cyan-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all ${saving ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}>
                        <Save className="w-5 h-5" />
                        {saving ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ الإعدادات" : "Save Settings")}
                    </button>
                    {successMessage && <span className="text-green-500 font-bold">{successMessage}</span>}
                </div>
            </form>
        </div>
    );
}
