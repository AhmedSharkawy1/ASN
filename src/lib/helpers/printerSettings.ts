/* ═══════════════════════════ PRINTER SETTINGS HELPER ═══════════════════════════ */

const STORAGE_KEY = 'asn_printer_settings';

export type PrinterSettings = {
    paperWidth: string;   // e.g. '58mm', '72mm', '80mm', 'A4'
    printerName: string;  // user-defined label
    fontSize: number;     // base font size in px
};

const DEFAULT_SETTINGS: PrinterSettings = {
    paperWidth: '72mm',
    printerName: 'الطابعة الافتراضية',
    fontSize: 15,
};

export function getPrinterSettings(): PrinterSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch { /* ignore */ }
    return DEFAULT_SETTINGS;
}

export function savePrinterSettings(settings: PrinterSettings): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Returns the CSS style block for receipt printing based on saved settings */
export function getReceiptStyles(): string {
    const s = getPrinterSettings();
    const width = s.paperWidth;
    const fontSize = s.fontSize;
    return `body{font-family:'Courier New',monospace;font-size:${fontSize}px;width:${width};margin:0 auto;padding:10px;direction:rtl;color:#000}table{width:100%;border-collapse:collapse}td{padding:4px 0;vertical-align:top;font-size:${fontSize}px}.line{border-top:1.5px dashed #000;margin:12px 0}.divider{border-top:1.5px dashed #000;margin:12px 0}.text-center{text-align:center}.text-left{text-align:left}.font-bold{font-weight:bold}@media print{body{width:${width};margin:0;padding:0}}`;
}

/** Returns the CSS style block for factory/production printing */
export function getFactoryPrintStyles(dir: string): string {
    const s = getPrinterSettings();
    const isReceipt = s.paperWidth !== 'A4';
    return `
        @page { size: ${isReceipt ? s.paperWidth + ' auto' : 'A4'}; margin: ${isReceipt ? '5mm' : '20mm'}; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: ${dir}; color: #1e293b; margin: 0; padding: ${isReceipt ? '5px' : '30px'}; ${isReceipt ? `width:${s.paperWidth};` : ''} }
        h1 { font-size: ${isReceipt ? '18px' : '28px'}; margin: 0 0 5px 0; }
        h2 { font-size: ${isReceipt ? '14px' : '20px'}; margin: ${isReceipt ? '10px' : '30px'} 0 10px 0; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { padding: ${isReceipt ? '4px 6px' : '10px 12px'}; background: #f1f5f9; text-align: ${dir === 'rtl' ? 'right' : 'left'}; font-size: ${isReceipt ? '11px' : '13px'}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1; }
        td { font-size: ${isReceipt ? '12px' : '15px'}; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: ${isReceipt ? '5px' : '20px'}; padding-bottom: ${isReceipt ? '5px' : '20px'}; border-bottom: 3px solid #0f172a; }
        .date { color: #64748b; font-size: ${isReceipt ? '11px' : '14px'}; }
        @media print { body { padding: 0; ${isReceipt ? `width:${s.paperWidth};` : ''} } }
    `;
}

export const PAPER_SIZES = [
    { value: '58mm', label: '58mm (طابعة صغيرة)' },
    { value: '72mm', label: '72mm (طابعة متوسطة)' },
    { value: '80mm', label: '80mm (طابعة كبيرة)' },
    { value: 'A4', label: 'A4 (طابعة عادية)' },
];
