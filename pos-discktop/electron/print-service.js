const { BrowserWindow } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

    /**
     * Open a cash drawer connected to a thermal printer via RJ11 cable.
     * Sends the ESC/POS kick pulse command (ESC p 0 25 250) as RAW data
     * through the Windows print spooler using PowerShell P/Invoke.
     *
     * @param {BrowserWindow} parentWindow - used to detect the default printer
     * @returns {{ success: boolean, error?: string }}
     */
    async openCashDrawer(parentWindow) {
        try {
            // Determine the target printer (default system printer)
            let printerName = '';
            if (parentWindow && !parentWindow.isDestroyed()) {
                const printers = await parentWindow.webContents.getPrintersAsync();
                const defaultPrinter = printers.find(p => p.isDefault);
                if (defaultPrinter) {
                    printerName = defaultPrinter.name;
                } else if (printers.length > 0) {
                    printerName = printers[0].name;
                }
            }

            if (!printerName) {
                return { success: false, error: 'No printer found for cash drawer' };
            }

            console.log(`[PrintService] Opening cash drawer via printer: ${printerName}`);

            // Write ESC/POS cash drawer kick bytes to a temp file
            // ESC p 0 25 250 = \x1B\x70\x00\x19\xFA
            const kickBytes = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
            const tmpFile = path.join(os.tmpdir(), `asn_drawer_${Date.now()}.bin`);
            fs.writeFileSync(tmpFile, kickBytes);

            // PowerShell script that uses P/Invoke to send RAW bytes to the printer
            // via the Windows spooler API (winspool.drv). This bypasses the printer
            // driver so the ESC/POS command reaches the printer hardware directly.
            const escapedPrinter = printerName.replace(/'/g, "''");
            const escapedFile = tmpFile.replace(/\\/g, '\\\\');

            const psScript = [
                '$ErrorActionPreference = "Stop"',
                'Add-Type @"',
                'using System;',
                'using System.Runtime.InteropServices;',
                'public class RawPrint {',
                '  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]',
                '  public struct DOCINFO { public string pDocName; public IntPtr pOutputFile; public string pDataType; }',
                '  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)]',
                '  public static extern bool OpenPrinter(string p, out IntPtr h, IntPtr d);',
                '  [DllImport("winspool.drv", SetLastError=true)]',
                '  public static extern bool ClosePrinter(IntPtr h);',
                '  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)]',
                '  public static extern bool StartDocPrinter(IntPtr h, int l, ref DOCINFO d);',
                '  [DllImport("winspool.drv", SetLastError=true)]',
                '  public static extern bool EndDocPrinter(IntPtr h);',
                '  [DllImport("winspool.drv", SetLastError=true)]',
                '  public static extern bool StartPagePrinter(IntPtr h);',
                '  [DllImport("winspool.drv", SetLastError=true)]',
                '  public static extern bool EndPagePrinter(IntPtr h);',
                '  [DllImport("winspool.drv", SetLastError=true)]',
                '  public static extern bool WritePrinter(IntPtr h, IntPtr b, int c, out int w);',
                '  public static bool Send(string name, byte[] data) {',
                '    IntPtr h;',
                '    if (!OpenPrinter(name, out h, IntPtr.Zero)) return false;',
                '    var di = new DOCINFO { pDocName = "ASN CashDrawer", pDataType = "RAW" };',
                '    if (!StartDocPrinter(h, 1, ref di)) { ClosePrinter(h); return false; }',
                '    StartPagePrinter(h);',
                '    IntPtr p = Marshal.AllocCoTaskMem(data.Length);',
                '    Marshal.Copy(data, 0, p, data.Length);',
                '    int w; WritePrinter(h, p, data.Length, out w);',
                '    Marshal.FreeCoTaskMem(p);',
                '    EndPagePrinter(h); EndDocPrinter(h); ClosePrinter(h);',
                '    return true;',
                '  }',
                '}',
                '"@',
                `$bytes = [System.IO.File]::ReadAllBytes("${escapedFile}")`,
                `$result = [RawPrint]::Send('${escapedPrinter}', $bytes)`,
                'if ($result) { Write-Output "OK" } else { throw "Failed to send to printer" }',
            ].join('\n');

            return new Promise((resolve) => {
                execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], 
                    { timeout: 10000 }, 
                    (err, stdout, stderr) => {
                        // Cleanup temp file
                        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

                        if (err) {
                            console.error('[PrintService] Cash drawer error:', err.message);
                            if (stderr) console.error('[PrintService] PS stderr:', stderr);
                            resolve({ success: false, error: err.message });
                        } else {
                            console.log('[PrintService] Cash drawer opened successfully');
                            resolve({ success: true });
                        }
                    }
                );
            });
        } catch (err) {
            console.error('[PrintService] Cash drawer error:', err);
            return { success: false, error: err.message };
        }
    }
}

module.exports = { PrintService };

