/* ═══════════════════════════ PRINTER SETTINGS HELPER ═══════════════════════════ */

const STORAGE_KEY = 'asn_printer_settings';

export type PrinterSettings = {
    paperWidth: string;          // e.g. '58mm', '72mm', '80mm', 'A4'
    printerName: string;         // user-defined label
    fontSize: number;            // base font size in px
    autoPrint: boolean;          // AUTO mode (true) vs MANUAL mode (false)
    systemPrinterName?: string;  // real system printer name from QZ Tray
    orientation?: string;        // 'portrait' or 'landscape'
    margins?: string;            // 'none', 'small', 'normal'
};

const DEFAULT_SETTINGS: PrinterSettings = {
    paperWidth: '72mm',
    printerName: 'الطابعة الافتراضية',
    fontSize: 15,
    autoPrint: false,
    systemPrinterName: '',
    orientation: 'portrait',
    margins: 'none',
};

export function getPrinterSettings(): PrinterSettings {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS, autoPrint: true };

    // Check for URL override (used by the automatic setup tool)
    const params = new URLSearchParams(window.location.search);
    const autoPrintOverride = params.get('autoprint') === '1';

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        let settings = { ...DEFAULT_SETTINGS, autoPrint: true };
        if (raw) {
            settings = { ...settings, ...JSON.parse(raw) };
            // Force autoPrint true per user request to never show the settings modal on order
            settings.autoPrint = true;
        }
        
        if (autoPrintOverride) {
            settings.autoPrint = true;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }
        
        return settings;
    } catch { /* ignore */ }
    
    return { ...DEFAULT_SETTINGS, autoPrint: true };
}

export function savePrinterSettings(settings: PrinterSettings): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Returns the CSS style block for receipt printing based on saved settings */
export function getReceiptStyles(): string {
    const s = getPrinterSettings();
    const width = s.paperWidth === 'A4' ? '210mm' : s.paperWidth;
    const fontSize = s.fontSize;
    
    return `
        body { 
            font-family: 'Courier New', monospace; 
            font-size: ${fontSize}px; 
            font-weight: 900; 
            margin: 0; 
            padding: 0; 
            direction: rtl; 
            color: #000;
            width: 100%;
            background-color: #f5f5f5; /* Light grey background for preview */
        }
        .receipt-wrapper {
            background-color: #fff;
            width: ${width};
            margin: 0 auto;
            padding: 15px;
            box-sizing: border-box;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            min-height: 100vh;
        }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 4px 0; vertical-align: top; font-size: ${fontSize}px; font-weight: 900; }
        .line { border-top: 1.5px dashed #000; margin: 12px 0; }
        .divider { border-top: 1.5px dashed #000; margin: 12px 0; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .font-bold { font-weight: 900; }

        @media print {
            @page {
                margin: 0;
                size: auto;
            }
            body { 
                background-color: #fff; 
                width: 100% !important;
                display: block !important;
            }
            .receipt-wrapper {
                margin: 0 auto !important;
                padding: 10px 15px !important; /* Some padding for clarity */
                width: ${width} !important;
                box-shadow: none !important;
                min-height: auto !important;
                break-inside: avoid;
                page-break-inside: avoid;
            }
            /* Hide UI elements if any accidentally get included */
            .no-print { display: none !important; }
        }
    `;
}

/** Returns the CSS style block for factory/production printing */
export function getFactoryPrintStyles(dir: string): string {
    const s = getPrinterSettings();
    const width = s.paperWidth === 'A4' ? '210mm' : s.paperWidth;
    const isReceipt = s.paperWidth !== 'A4';
    
    return `
        @page { size: ${isReceipt ? width + ' auto' : 'A4'}; margin: ${isReceipt ? '0' : '15mm'}; }
        body { 
            font-family: 'Segoe UI', Tahoma, sans-serif; 
            direction: ${dir}; 
            color: #000; 
            margin: 0 auto; 
            padding: ${isReceipt ? '10px' : '20px'}; 
            width: ${width}; 
            font-weight: 900;
            box-sizing: border-box;
            background: #fff;
        }
        h1 { font-size: ${isReceipt ? '18px' : '28px'}; margin: 0 0 5px 0; font-weight: 900; text-align: center; }
        h2 { font-size: ${isReceipt ? '14px' : '20px'}; margin: ${isReceipt ? '10px' : '30px'} 0 10px 0; color: #000; border-bottom: 2px solid #000; padding-bottom: 8px; font-weight: 900; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { padding: ${isReceipt ? '4px 6px' : '10px 12px'}; background: transparent; text-align: ${dir === 'rtl' ? 'right' : 'left'}; font-size: ${isReceipt ? '11px' : '13px'}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #000; font-weight: 900; }
        td { padding: 6px 4px; font-size: ${isReceipt ? '12px' : '15px'}; font-weight: 900; border-bottom: 1px dashed #eee; }
        .header { display: flex; flex-direction: ${isReceipt ? 'column' : 'row'}; justify-content: space-between; align-items: ${isReceipt ? 'center' : 'flex-start'}; margin-bottom: ${isReceipt ? '10px' : '20px'}; padding-bottom: ${isReceipt ? '5px' : '20px'}; border-bottom: 3px solid #000; text-align: ${isReceipt ? 'center' : 'inherit'}; }
        .date { color: #000; font-size: ${isReceipt ? '11px' : '14px'}; font-weight: 900; }
        @media print { 
            body { 
                width: ${width} !important; 
                margin: 0 auto !important; 
                padding: ${isReceipt ? '5mm' : '0'};
            } 
        }
    `;
}

export const PAPER_SIZES = [
    { value: '58mm', label: '58mm (طابعة صغيرة)' },
    { value: '72mm', label: '72mm (طابعة متوسطة)' },
    { value: '80mm', label: '80mm (طابعة كبيرة)' },
    { value: 'A4', label: 'A4 (طابعة عادية)' },
];

/** 
 * Generates a Windows Batch script to create a Chrome/Edge shortcut with kiosk printing enabled.
 * This makes it easy for the user to setup any new PC.
 */
export function generateKioskScript(baseUrl: string, restaurantId?: string, restaurantName?: string, logoUrl?: string): string {
    // Clean restaurant name for windows filenames/shortcut labels
    const cleanName = (restaurantName || "ASN POS")
        .replace(/[\\/:*?"<>|]/g, "") // Remove illegal filename characters
        .trim();
    
    const displayName = cleanName || "ASN POS";

    const iconDownloadCmd = logoUrl 
        ? `powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '${logoUrl}' -OutFile '%LOGO_PATH%'"`
        : "echo No logo provided";

    const separator = baseUrl.includes('?') ? '&' : '?';
    const params = (restaurantId ? `${separator}r=${restaurantId}` : '') + 
                   (restaurantId || baseUrl.includes('?') ? '&' : '?') + 'autoprint=1';
    
    return `@echo off
setlocal
echo ==========================================
echo    ${displayName} - Setup
echo ==========================================
echo.

set "SC_NAME=${displayName}"
set "URL=${baseUrl}/login${params}"
set "APP_DATA_DIR=%APPDATA%\\ASN"
set "LOGO_PATH=%APP_DATA_DIR%\\logo.ico"

if not exist "%APP_DATA_DIR%" mkdir "%APP_DATA_DIR%"

:: Try to find Chrome
set "CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
if not exist "%CHROME_PATH%" set "CHROME_PATH=C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"

:: Try to find Edge if Chrome is missing
set "TARGET_PATH=%CHROME_PATH%"
if not exist "%TARGET_PATH%" (
    set "TARGET_PATH=C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
)

if not exist "%TARGET_PATH%" (
    echo [ERROR] Could not find Chrome or Edge. Please install a browser first.
    pause
    exit /b
)

echo [1/3] Downloading Branded Logo...
${iconDownloadCmd}

echo [2/3] Creating Desktop Shortcut...
set "SCRIPT_PATH=%TEMP%\\CreateShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SCRIPT_PATH%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\\%SC_NAME%.lnk" >> "%SCRIPT_PATH%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SCRIPT_PATH%"
echo oLink.TargetPath = "%TARGET_PATH%" >> "%SCRIPT_PATH%"
echo oLink.Arguments = "--kiosk-printing --app=%URL%" >> "%SCRIPT_PATH%"
if exist "%LOGO_PATH%" (
    echo oLink.IconLocation = "%LOGO_PATH%" >> "%SCRIPT_PATH%"
)
echo oLink.Save >> "%SCRIPT_PATH%"

cscript /nologo "%SCRIPT_PATH%"
del "%SCRIPT_PATH%"

echo [3/3] Done! 
echo.
echo Setup complete. Look for "%SC_NAME%" on your desktop.
echo Make sure to close all browser windows before using it for the first time.
echo.
pause
    `;
}
