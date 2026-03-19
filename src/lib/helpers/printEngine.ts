/* ═══════════════════════════ PRINT ENGINE ═══════════════════════════ */
/*
 * Unified print dispatch for the entire app.
 * Decides between QZ Tray silent print vs browser print based on settings.
 */

import type { PrinterSettings } from './printerSettings';

export type PrintOptions = {
    settings: PrinterSettings;
    /** If provided, override the auto/manual decision — force open modal */
    forceManual?: boolean;
};

/**
 * Execute a print job using the best available method.
 * Returns true if silent print succeeded, false if fallback was used.
 *
 * @param html - The full HTML document to print
 * @param settings - The user's print settings
 * @param onManual - Callback to open the PrintModal (if in manual mode)
 */
export async function executePrint(
    html: string,
    settings: PrinterSettings,
    onManual?: (html: string) => void,
    forceManual?: boolean,
): Promise<boolean> {
    // Manual mode: always show modal/preview
    if (forceManual || !settings.autoPrint) {
        if (onManual) {
            onManual(html);
            return false; // modal handles printing
        }
        // No modal handler — fall through to browser print
        return browserPrint(html);
    }

    // Auto mode: try Electron Native first (Async Queue), then iframe fallback (Browser Silent Print)
    if (typeof window !== 'undefined' && 'electronAPI' in (window as any)) {
        try {
            // Enqueue for background printing (Requirement #5)
            const res = await (window as any).electronAPI.enqueuePrint({ data: html });
            if (res.success) return true;
        } catch (err) {
            console.error('[PrintEngine] Electron print enqueue failed:', err);
        }
    }

    // Note: QZ Tray support was removed per user request. 
    // Browser Silent Printing via --kiosk-printing flag is now the primary automatic method.
    return iframePrint(html);
}

/**
 * Print using a hidden iframe — with --kiosk-printing it's silent.
 */
export function iframePrint(html: string): boolean {
    try {
        let iframe = document.getElementById('asn-print-frame') as HTMLIFrameElement;
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'asn-print-frame';
            iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;';
            iframe.title = 'Print Frame';
            document.body.appendChild(iframe);
        }

        const frameWindow = iframe.contentWindow;
        if (frameWindow) {
            const frameDoc = frameWindow.document;
            frameDoc.open();
            frameDoc.write(html);
            frameDoc.close();

            // Wait for images to load inside the iframe
            const imgs = frameDoc.getElementsByTagName('img');
            if (imgs.length === 0) {
                setTimeout(() => frameWindow.print(), 300);
            } else {
                let loaded = 0;
                const checkFinished = () => {
                    loaded++;
                    if (loaded >= imgs.length) frameWindow.print();
                };
                for (let i = 0; i < imgs.length; i++) {
                    const img = imgs[i];
                    if (img.complete) checkFinished();
                    else { img.onload = checkFinished; img.onerror = checkFinished; }
                }
            }
            return true;
        }
    } catch (err) {
        console.error('[PrintEngine] iframe print error:', err);
    }
    return browserPrint(html);
}

/**
 * Open a popup window and trigger browser print dialog.
 */
export function browserPrint(html: string): boolean {
    const pw = window.open('', '_blank', 'width=400,height=600');
    if (pw) {
        pw.document.write(html);
        pw.document.close();
        pw.focus();

        const imgs = pw.document.getElementsByTagName('img');
        if (imgs.length === 0) {
            setTimeout(() => pw.print(), 300);
        } else {
            let loaded = 0;
            const checkFinished = () => {
                loaded++;
                if (loaded >= imgs.length) pw.print();
            };
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];
                if (img.complete) checkFinished();
                else { img.onload = checkFinished; img.onerror = checkFinished; }
            }
        }
        return true;
    }
    return false;
}
