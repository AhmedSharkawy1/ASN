"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useState, useEffect } from "react";
import { getPrinterSettings, savePrinterSettings, PAPER_SIZES } from "@/lib/helpers/printerSettings";
import type { PrinterSettings } from "@/lib/helpers/printerSettings";
import { Printer, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function PrinterPage() {
    const { language } = useLanguage();
    const isAr = language === "ar";

    const [settings, setSettings] = useState<PrinterSettings>({
        paperWidth: '72mm',
        printerName: 'الطابعة الافتراضية',
        fontSize: 15,
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setSettings(getPrinterSettings());
    }, []);

    const handleSave = () => {
        savePrinterSettings(settings);
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

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                    <Printer className="w-10 h-10 text-violet-600 dark:text-violet-400" />
                    {isAr ? "إعدادات الطابعة" : "Printer Settings"}
                </h1>
                <p className="text-slate-500 dark:text-zinc-400 text-lg mt-1">
                    {isAr ? "اختر الطابعة ومقاس الورق المناسب لفواتيرك" : "Configure printer paper size for your receipts"}
                </p>
            </div>

            {/* Settings Card */}
            <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-lg overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* Printer Name */}
                    <div>
                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-2 block">
                            {isAr ? "اسم الطابعة" : "Printer Name"}
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
                <ul className="text-blue-600 dark:text-blue-300 text-sm space-y-1 list-disc list-inside">
                    <li>{isAr ? "مقاس 58mm مناسب للطابعات الحرارية الصغيرة" : "58mm is for small thermal printers"}</li>
                    <li>{isAr ? "مقاس 72mm و 80mm للطابعات الحرارية العادية" : "72mm and 80mm for standard thermal printers"}</li>
                    <li>{isAr ? "مقاس A4 للطابعات العادية (ورق كبير)" : "A4 for regular desktop printers"}</li>
                    <li>{isAr ? "التغييرات تطبق على جميع الفواتير: POS، الطلبات، وإنتاج المصنع" : "Changes apply to all receipts: POS, orders, and factory production"}</li>
                </ul>
            </div>
        </div>
    );
}
