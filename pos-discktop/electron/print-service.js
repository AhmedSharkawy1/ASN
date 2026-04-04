/* ═══════════════════════════════════════════════════════════════════
 *  ASN POS Desktop — Print Service
 *  Handles native printing via Electron's built-in print capabilities.
 *  Supports thermal receipt printers (58mm, 72mm, 80mm) and A4.
 * ═══════════════════════════════════════════════════════════════════ */

const { BrowserWindow } = require('electron');

class PrintService {
    constructor() {
        this.printWindow = null;
    }

    /**
     * Print HTML content silently using a hidden window.
     * @param {Object} printData - { data: string (HTML content), printerName?: string }
     * @param {BrowserWindow} parentWindow - The parent window for print dialogs
     * @returns {{ success: boolean, error?: string }}
     */
    async print(printData, parentWindow) {
        const { data: html, printerName } = printData;

        if (!html) {
            return { success: false, error: 'No HTML content provided' };
        }

        try {
            // Create a hidden window for printing
            if (this.printWindow && !this.printWindow.isDestroyed()) {
                this.printWindow.destroy();
            }

            this.printWindow = new BrowserWindow({
                show: false,
                width: 400,
                height: 600,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                },
            });

            // Load the HTML content
            await this.printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

            // Wait for content to render
            await new Promise(resolve => setTimeout(resolve, 500));

            // Print options
            const printOptions = {
                silent: true,       // Silent print (no dialog)
                printBackground: true,
                margins: {
                    marginType: 'none',
                },
                pageSize: {
                    width: 80000,   // 80mm in microns
                    height: 297000, // tall enough for receipt
                },
            };

            // If a specific printer is requested
            if (printerName) {
                printOptions.deviceName = printerName;
            }

            // Execute print
            return new Promise((resolve) => {
                this.printWindow.webContents.print(printOptions, (success, failureReason) => {
                    // Cleanup
                    if (this.printWindow && !this.printWindow.isDestroyed()) {
                        this.printWindow.destroy();
                        this.printWindow = null;
                    }

                    if (success) {
                        console.log('[PrintService] Print job sent successfully');
                        resolve({ success: true });
                    } else {
                        console.error('[PrintService] Print failed:', failureReason);
                        // Fallback: try printing in the main window (will show dialog)
                        if (parentWindow && !parentWindow.isDestroyed()) {
                            parentWindow.webContents.print({
                                silent: false,
                                printBackground: true,
                            });
                        }
                        resolve({ success: false, error: failureReason || 'Print failed' });
                    }
                });
            });
        } catch (err) {
            console.error('[PrintService] Error:', err);
            // Cleanup on error
            if (this.printWindow && !this.printWindow.isDestroyed()) {
                this.printWindow.destroy();
                this.printWindow = null;
            }
            return { success: false, error: err.message };
        }
    }
}

module.exports = { PrintService };
