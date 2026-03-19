"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { usePrintSettings } from "@/lib/hooks/usePrintSettings";
import { useState } from "react";
import { PAPER_SIZES, generateKioskScript } from "@/lib/helpers/printerSettings";
import {
    Printer, Save, CheckCircle2, Download, MonitorSmartphone, HelpCircle,
    RefreshCw, Wifi, WifiOff, Settings2, ToggleLeft, ToggleRight,
    ChevronDown
} from "lucide-react";
import { toast } from "sonner";

export default function PrinterPage() {
    const { language } = useLanguage();
    const { restaurant, restaurantId, loading: restaurantLoading } = useRestaurant();
    const isAr = language === "ar";

    const {
        settings, setSettings, loading, saveSettings,
    } = usePrintSettings(restaurantId);

    const [saved, setSaved] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const handleSave = async () => {
        await saveSettings(settings);
        setSaved(true);
        toast.success(isAr ? "تم حفظ إعدادات الطابعة" : "Printer settings saved");
        setTimeout(() => setSaved(false), 2000);
    };


    const testPrint = () => {
        const pw = window.open('', '_blank', 'width=300,height=400');
        if (!pw) return;
        const width = settings.paperWidth;
        const fontSize = settings.fontSize;
        pw.document.write(`<html><head><title>Test Print</title>
            <style>
                body{font-family:'Courier New',monospace;font-size:${fontSize}px;width:${width};margin:0 auto;padding:10px;direction:rtl;color:#000}
                @media print{body{width:${width};margin:0;padding:0}}
            </style></head><body>
            <div style="text-align:center;margin-bottom:15px">
                <p style="font-weight:bold;font-size:22px;margin:0 0 10px 0">🖨️ طباعة تجريبية</p>
                <p style="font-size:14px;margin:0 0 5px 0">مقاس الورق: ${width}</p>
                <p style="font-size:14px;margin:0 0 5px 0">حجم الخط: ${fontSize}px</p>
                <p style="font-size:14px;margin:0 0 5px 0">الطابعة: ${settings.printerName}</p>
            </div>
            <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
            <table style="width:100%;border-collapse:collapse">
                <tr>
                    <td style="padding:4px 0;font-size:${fontSize}px">بيتزا مارجريتا</td>
                    <td style="text-align:center;padding:4px 0;font-size:${fontSize}px;font-weight:bold">2</td>
                    <td style="text-align:left;padding:4px 0;font-size:${fontSize}px;font-weight:bold">150 ج.م</td>
                </tr>
                <tr>
                    <td style="padding:4px 0;font-size:${fontSize}px">سلطة يونانية</td>
                    <td style="text-align:center;padding:4px 0;font-size:${fontSize}px;font-weight:bold">1</td>
                    <td style="text-align:left;padding:4px 0;font-size:${fontSize}px;font-weight:bold">45 ج.م</td>
                </tr>
            </table>
            <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:20px">
                <span>الإجمالي</span><span>195 ج.م</span>
            </div>
            <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
            <p style="text-align:center;font-size:13px;font-weight:bold;margin-top:20px">شكرا لطلبكم ❤️</p>
        </body></html>`);
        pw.document.close();
        pw.focus();
        pw.print();
    };

    const downloadSetupScript = () => {
        if (!restaurant) {
            toast.error(isAr ? "بيانات المطعم غير جاهزة. يرجى المحاولة مرة أخرى." : "Restaurant data not ready. Please try again.");
            return;
        }
        
        const baseUrl = window.location.origin;
        const logoUrl = restaurant?.receipt_logo_url || restaurant?.logo_url;
        const rid = restaurant?.id;
        const rName = restaurant?.name;
        
        if (!rName) {
            toast.error(isAr ? "اسم المطعم مفقود. يرجى ضبطه في الإعدادات." : "Restaurant name is missing. Please set it in settings.");
            return;
        }

        const script = generateKioskScript(baseUrl, rid, rName, logoUrl);
        const blob = new Blob([script], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ASN_Setup_${rName.replace(/\s+/g, '_')}.bat`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.info(isAr ? "جاري تحميل أداة الإعداد..." : "Downloading setup tool...");
    };

    if (loading || restaurantLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                    <Printer className="w-10 h-10 text-violet-600 dark:text-violet-400" />
                    {isAr ? "إعدادات الطابعة" : "Printer Settings"}
                </h1>
                <p className="text-slate-500 dark:text-zinc-400 text-lg mt-1">
                    {isAr ? "إعداد مقاس الورق وطريقة الطباعة لفواتيرك" : "Configure paper size and printing method for your receipts"}
                </p>
            </div>

            {/* Silent Print Info Banner */}
            <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <MonitorSmartphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
                        {isAr ? "دعم الطباعة التلقائية (Silent Print)" : "Automatic Printing Supported"}
                    </h3>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400/80 mt-0.5 leading-relaxed font-bold">
                        {isAr 
                            ? "النظام يدعم الطباعة الفورية بدون نوافذ منبثقة. استخدم أداة الإعداد التلقائي أدناه لتفعيلها على أي جهاز بضغطة واحدة."
                            : "Instant printing without popups is supported. Use the Automatic Setup Tool below to enable it on any device with one click."}
                    </p>
                </div>
            </div>

            {/* Settings Card */}
            <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-lg overflow-hidden">
                <div className="p-6 space-y-6">

                    {/* Printer Name (manual label) */}
                    <div>
                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-2 block">
                            {isAr ? "اسم الطابعة (وصف)" : "Printer Label"}
                        </label>
                        <input
                            value={settings.printerName}
                            onChange={e => setSettings({ ...settings, printerName: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white text-lg font-bold outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                            placeholder={isAr ? "مثال: طابعة المطبخ" : "e.g. Kitchen Printer"}
                        />
                    </div>

                    {/* Paper Size */}
                    <div>
                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-2 block">
                            {isAr ? "مقاس الورق" : "Paper Size"}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {PAPER_SIZES.map(size => (
                                <button
                                    key={size.value}
                                    onClick={() => setSettings({ ...settings, paperWidth: size.value })}
                                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                                        settings.paperWidth === size.value
                                            ? "border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 shadow-md"
                                            : "border-slate-200 dark:border-zinc-700/50 bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600"
                                    }`}>
                                    <div className="text-2xl font-black mb-1">{size.value}</div>
                                    <div className="text-xs font-bold opacity-70">{size.label.split('(')[1]?.replace(')', '') || ''}</div>
                                    {settings.paperWidth === size.value && (
                                        <CheckCircle2 className="w-5 h-5 mx-auto mt-2 text-violet-500 dark:text-violet-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Font Size */}
                    <div>
                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-2 block">
                            {isAr ? "حجم الخط" : "Font Size"}: <span className="text-violet-600 dark:text-violet-400">{settings.fontSize}px</span>
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="22"
                            step="1"
                            value={settings.fontSize}
                            onChange={e => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                            className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-violet-500"
                        />
                        <div className="flex justify-between text-xs text-slate-400 dark:text-zinc-600 mt-1 font-bold">
                            <span>10px</span>
                            <span>16px</span>
                            <span>22px</span>
                        </div>
                    </div>

                    {/* Orientation */}
                    <div>
                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-2 block">
                            {isAr ? "اتجاه الورقة" : "Orientation"}
                        </label>
                        <div className="flex gap-3">
                            {[
                                { value: 'portrait', label: isAr ? 'طولي' : 'Portrait', icon: '📄' },
                                { value: 'landscape', label: isAr ? 'عرضي' : 'Landscape', icon: '📃' },
                            ].map(o => (
                                <button
                                    key={o.value}
                                    onClick={() => setSettings({ ...settings, orientation: o.value })}
                                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold transition-all ${
                                        settings.orientation === o.value
                                            ? "border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300"
                                            : "border-slate-200 dark:border-zinc-700/50 bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-zinc-400"
                                    }`}
                                >
                                    <span>{o.icon}</span> {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Margins */}
                    <div>
                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-2 block">
                            {isAr ? "الهوامش" : "Margins"}
                        </label>
                        <div className="flex gap-3">
                            {[
                                { value: 'none', label: isAr ? 'بدون' : 'None' },
                                { value: 'small', label: isAr ? 'صغيرة' : 'Small' },
                                { value: 'normal', label: isAr ? 'عادية' : 'Normal' },
                            ].map(m => (
                                <button
                                    key={m.value}
                                    onClick={() => setSettings({ ...settings, margins: m.value })}
                                    className={`flex-1 p-3 rounded-xl border-2 font-bold text-center transition-all ${
                                        settings.margins === m.value
                                            ? "border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300"
                                            : "border-slate-200 dark:border-zinc-700/50 bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-zinc-400"
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Auto Print Toggle */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        settings.autoPrint
                            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                            : "bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-zinc-700/50"
                    }`}>
                        <div className="flex items-center gap-3">
                            {settings.autoPrint
                                ? <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                : <ToggleLeft className="w-6 h-6 text-slate-400 dark:text-zinc-600" />
                            }
                            <div>
                                <label className="text-sm font-bold text-slate-900 dark:text-white block">
                                    {isAr ? "الطباعة التلقائية" : "Auto Print"}
                                </label>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-bold">
                                    {settings.autoPrint
                                        ? (isAr ? "✓ الفاتورة بتتطبع فوراً بدون تدخل" : "✓ Receipt prints instantly without interaction")
                                        : (isAr ? "هيظهر معاينة قبل الطباعة" : "Preview will appear before printing")
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, autoPrint: !settings.autoPrint })}
                            className={`w-14 h-8 rounded-full transition-all relative ${settings.autoPrint ? "bg-emerald-500 shadow-inner" : "bg-slate-300 dark:bg-zinc-700"}`}>
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${settings.autoPrint ? (isAr ? "right-1" : "left-7") : (isAr ? "right-7" : "left-1")}`} />
                        </button>
                    </div>

                    {/* Universal Setup Tool */}
                    <div className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-indigo-900 dark:text-indigo-300 font-black flex items-center gap-2 mb-2">
                                <MonitorSmartphone className="w-5 h-5" />
                                {isAr ? "تفعيل في أي جهاز آخر" : "Setup on another PC"}
                            </h3>
                            <p className="text-sm text-indigo-700 dark:text-indigo-400 font-bold mb-4 leading-relaxed">
                                {isAr
                                    ? "هل تريد تفعيل الطباعة التلقائية على جهاز كمبيوتر جديد؟ حمل الأداة وشغلها على الجهاز الآخر لضبط الإعدادات بضغطة واحدة."
                                    : "Want to enable silent printing on a new PC? Download and run this tool on the other machine to set it up instantly."}
                            </p>
                            {(!restaurant?.receipt_logo_url && !restaurant?.logo_url) && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-3 -mt-2">
                                    {isAr 
                                        ? "⚠️ تنبيه: لا يوجد شعار للمطعم، سيستخدم الاختصار الأيقونة الافتراضية."
                                        : "⚠️ Warning: No restaurant logo found. Shortcut will use default icon."}
                                </p>
                            )}
                            <button
                                onClick={downloadSetupScript}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white font-black rounded-xl border border-indigo-200 dark:border-transparent hover:bg-slate-50 dark:hover:bg-indigo-700 transition shadow-sm active:scale-95">
                                <Download className="w-4 h-4" />
                                {isAr ? "تحميل أداة الإعداد التلقائي" : "Download Universal Setup Tool"}
                            </button>
                        </div>
                        <HelpCircle className="absolute -bottom-4 -right-4 w-24 h-24 text-indigo-200/50 dark:text-indigo-500/10 group-hover:scale-110 transition-transform" />
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                    <button
                        onClick={handleSave}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-bold text-[15px] rounded-xl shadow-lg transition active:scale-95 ${
                            saved
                                ? "bg-emerald-500 text-white"
                                : "bg-gradient-to-r from-violet-500 to-purple-500 dark:from-emerald-500 dark:to-cyan-500 text-white"
                        }`}>
                        {saved ? <><CheckCircle2 className="w-5 h-5" /> {isAr ? "تم الحفظ!" : "Saved!"}</> : <><Save className="w-5 h-5" /> {isAr ? "حفظ الإعدادات" : "Save Settings"}</>}
                    </button>
                    <button
                        onClick={testPrint}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-700 dark:text-zinc-300 font-bold text-[15px] rounded-xl border border-slate-200 dark:border-zinc-700/30 transition active:scale-95 hover:bg-slate-200 dark:hover:bg-zinc-700/50">
                        <Printer className="w-5 h-5" /> {isAr ? "طباعة تجريبية" : "Test Print"}
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-700 dark:text-blue-400 text-sm font-bold mb-2">
                    {isAr ? "💡 معلومات" : "💡 Info"}
                </p>
                <ul className="text-blue-600 dark:text-blue-300 text-sm space-y-1 list-disc list-inside font-bold">
                    <li>{isAr ? "مقاس 58mm مناسب للطابعات الحرارية الصغيرة" : "58mm is for small thermal printers"}</li>
                    <li>{isAr ? "مقاس 72mm و 80mm للطابعات الحرارية العادية" : "72mm and 80mm for standard thermal printers"}</li>
                    <li>{isAr ? "مقاس A4 للطابعات العادية (ورق كبير)" : "A4 for regular desktop printers"}</li>
                    <li>{isAr ? "التغييرات تطبق على جميع الفواتير: POS، الطلبات، وإنتاج المصنع" : "Changes apply to all receipts: POS, orders, and factory production"}</li>
                    <li>{isAr ? "للتحكم الكامل في الخط والهوامش، استخدم متصفح Google Chrome" : "For full font and margin control, use Google Chrome"}</li>
                </ul>
            </div>
        </div>
    );
}
