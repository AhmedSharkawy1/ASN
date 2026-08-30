/**
 * ASN Cash Drawer Local Service
 * ─────────────────────────────
 * A tiny HTTP server that runs on the client machine (localhost:5689).
 * The web app calls this service to open the cash drawer connected
 * to the thermal printer via RJ11 cable.
 *
 * Usage:
 *   node cash-drawer-service.js
 *   node cash-drawer-service.js "XP-80C"
 *
 * The web browser then calls: POST http://localhost:5689/open-drawer
 */

const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 5689;

// Get printer name from command-line argument or auto-detect
let PRINTER_NAME = process.argv[2] || '';

function detectPrinter() {
    return new Promise((resolve) => {
        execFile('powershell.exe', [
            '-NoProfile', '-NonInteractive', '-Command',
            'Get-Printer | Where-Object {$_.Name -match "XP|Thermal|POS|Receipt|80"} | Select-Object -First 1 -ExpandProperty Name'
        ], { timeout: 5000 }, (err, stdout) => {
            if (!err && stdout.trim()) {
                resolve(stdout.trim());
            } else {
                // Fallback: try default printer
                execFile('powershell.exe', [
                    '-NoProfile', '-NonInteractive', '-Command',
                    'Get-CimInstance Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object -ExpandProperty Name'
                ], { timeout: 5000 }, (err2, stdout2) => {
                    resolve(stdout2 ? stdout2.trim() : '');
                });
            }
        });
    });
}

function sendDrawerKick(printerName) {
    return new Promise((resolve) => {
        // ESC/POS command: ESC p 0 25 250 (kick drawer pin 2)
        const kickBytes = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
        const tmpFile = path.join(os.tmpdir(), `asn_drawer_${Date.now()}.bin`);
        fs.writeFileSync(tmpFile, kickBytes);

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

        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript],
            { timeout: 10000 },
            (err, stdout, stderr) => {
                try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

                if (err) {
                    console.error('[CashDrawer] Error:', err.message);
                    if (stderr) console.error('[CashDrawer] PS stderr:', stderr);
                    resolve({ success: false, error: err.message });
                } else {
                    console.log('[CashDrawer] Drawer opened successfully via:', printerName);
                    resolve({ success: true });
                }
            }
        );
    });
}

const server = http.createServer(async (req, res) => {
    // CORS headers for browser access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/open-drawer' && (req.method === 'POST' || req.method === 'GET')) {
        if (!PRINTER_NAME) {
            PRINTER_NAME = await detectPrinter();
        }
        if (!PRINTER_NAME) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'No printer detected' }));
            return;
        }

        const result = await sendDrawerKick(PRINTER_NAME);
        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
    }

    if (req.url === '/status' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'running', printer: PRINTER_NAME || 'auto-detect' }));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

(async () => {
    if (!PRINTER_NAME) {
        PRINTER_NAME = await detectPrinter();
    }
    server.listen(PORT, '127.0.0.1', () => {
        console.log('╔══════════════════════════════════════════╗');
        console.log('║   ASN Cash Drawer Service Running ✅     ║');
        console.log('╠══════════════════════════════════════════╣');
        console.log(`║  Port:    ${PORT}                            ║`);
        console.log(`║  Printer: ${(PRINTER_NAME || 'auto-detect').padEnd(29)}║`);
        console.log('║  URL:     http://localhost:5689           ║');
        console.log('╚══════════════════════════════════════════╝');
        console.log('');
        console.log('Keep this window open while using the POS.');
        console.log('Press Ctrl+C to stop.');
    });
})();
