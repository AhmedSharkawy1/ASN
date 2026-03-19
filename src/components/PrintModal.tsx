"use client";
/* ═══════════════════════════ PRINT MODAL ═══════════════════════════ */
/*
 * Shows a receipt preview with quick settings before printing.
 * Used in MANUAL mode only.
 */

import { useState, useRef, useEffect } from "react";
import { X, Printer } from "lucide-react";
import { browserPrint, iframePrint } from "@/lib/helpers/printEngine";
import { PAPER_SIZES } from "@/lib/helpers/printerSettings";
import type { PrinterSettings } from "@/lib/helpers/printerSettings";

type PrintModalProps = {
    html: string;
    settings: PrinterSettings;
    isAr: boolean;
    onClose: () => void;
    onSaveSettings?: (settings: PrinterSettings) => void;
};

export default function PrintModal({ html, settings, isAr, onClose, onSaveSettings }: PrintModalProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [selectedPaperWidth, setSelectedPaperWidth] = useState(settings.paperWidth || "80mm");
    const [saveAsDefault, setSaveAsDefault] = useState(true);
    const [printing, setPrinting] = useState(false);

    // Write HTML to preview iframe
    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(html);
                doc.close();
            }
        }
    }, [html]);

    const handlePrint = async () => {
        setPrinting(true);
        try {
            if (saveAsDefault && onSaveSettings) {
                onSaveSettings({
                    ...settings,
                    paperWidth: selectedPaperWidth
                });
            }

            // Note: QZ Tray support was removed. Browser-based printing is used.
            if (settings.paperWidth === 'A4') {
                await browserPrint(html);
            } else {
                await iframePrint(html);
            }
            onClose();
        } finally {
            setPrinting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-zinc-800">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Printer className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        {isAr ? "معاينة الطباعة" : "Print Preview"}
                    </h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-black/20">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden mx-auto" style={{ maxWidth: '320px' }}>
                        <iframe
                            ref={iframeRef}
                            className="w-full border-none"
                            style={{ height: '400px' }}
                            title="Print Preview"
                        />
                    </div>
                </div>

                {/* Print Options */}
                <div className="px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-transparent flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                         <label className="text-xs font-bold text-slate-500">
                            {isAr ? "مقاس الورق" : "Paper Size"}
                        </label>
                        <select
                            value={selectedPaperWidth}
                            onChange={e => setSelectedPaperWidth(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/30"
                        >
                            {PAPER_SIZES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer w-max">
                        <input
                            type="checkbox"
                            checked={saveAsDefault}
                            onChange={e => setSaveAsDefault(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                            {isAr ? "حفظ كإعداد افتراضي لهذا الجهاز" : "Save as default for this PC"}
                        </span>
                    </label>
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-slate-200 dark:border-zinc-800 flex gap-3">
                    <button
                        onClick={handlePrint}
                        disabled={printing}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-500 dark:from-emerald-500 dark:to-cyan-500 text-white font-bold text-[15px] rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
                    >
                        <Printer className="w-5 h-5" />
                        {printing ? (isAr ? "جاري الطباعة..." : "Printing...") : (isAr ? "طباعة" : "Print")}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-slate-100 dark:bg-zinc-800/50 text-slate-700 dark:text-zinc-300 font-bold text-[15px] rounded-xl border border-slate-200 dark:border-zinc-700/30 transition active:scale-95 hover:bg-slate-200 dark:hover:bg-zinc-700/50"
                    >
                        {isAr ? "إلغاء" : "Cancel"}
                    </button>
                </div>
            </div>
        </div>
    );
}
