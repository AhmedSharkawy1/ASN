# ASN Cash Drawer Service
# Just double-click open-drawer.bat to run this

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class RawPrint {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct DOCINFO { public string pDocName; public IntPtr pOutputFile; public string pDataType; }
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool OpenPrinter(string p, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr h, int l, ref DOCINFO d);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr h, IntPtr b, int c, out int w);
  public static bool Send(string name, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(name, out h, IntPtr.Zero)) return false;
    var di = new DOCINFO { pDocName = "ASN Drawer", pDataType = "RAW" };
    if (!StartDocPrinter(h, 1, ref di)) { ClosePrinter(h); return false; }
    StartPagePrinter(h);
    IntPtr p = Marshal.AllocCoTaskMem(data.Length);
    Marshal.Copy(data, 0, p, data.Length);
    int w; WritePrinter(h, p, data.Length, out w);
    Marshal.FreeCoTaskMem(p);
    EndPagePrinter(h); EndDocPrinter(h); ClosePrinter(h);
    return true;
  }
}
"@

# Auto-detect thermal printer
$printerName = ''
$printers = Get-Printer -ErrorAction SilentlyContinue
foreach ($pr in $printers) {
  if ($pr.Name -match 'XP|Thermal|POS|Receipt|80|58') { $printerName = $pr.Name; break }
}
if (-not $printerName) {
  $def = $printers | Where-Object { $_.Default -eq $true } | Select-Object -First 1
  if ($def) { $printerName = $def.Name }
  elseif ($printers.Count -gt 0) { $printerName = $printers[0].Name }
}
if (-not $printerName) {
  Write-Host "`n  ERROR: No printer found!`n" -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "     ASN Cash Drawer Service" -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Printer: $printerName" -ForegroundColor Cyan
Write-Host "  Port:    5689" -ForegroundColor Cyan
Write-Host ""

# Start HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:5689/')
try { 
  $listener.Start() 
} catch { 
  Write-Host "  ERROR: Port 5689 already in use!" -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1 
}

Write-Host "  Status:  RUNNING" -ForegroundColor Green
Write-Host ""
Write-Host "  Keep this window open while using POS" -ForegroundColor Yellow
Write-Host ""

# Handle requests
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $ctx.Response.Headers.Add('Access-Control-Allow-Origin','*')
    $ctx.Response.Headers.Add('Access-Control-Allow-Methods','GET,POST,OPTIONS')
    $ctx.Response.Headers.Add('Access-Control-Allow-Headers','Content-Type')
    $ctx.Response.ContentType = 'application/json'

    if ($ctx.Request.HttpMethod -eq 'OPTIONS') {
      $ctx.Response.StatusCode = 204
      $ctx.Response.Close()
      continue
    }

    if ($ctx.Request.Url.LocalPath -eq '/open-drawer') {
      $bytes = [byte[]](0x1B,0x70,0x00,0x19,0xFA)
      $ok = [RawPrint]::Send($printerName, $bytes)
      if ($ok) {
        $json = '{"success":true}'
        Write-Host "  [$(Get-Date -Format 'HH:mm:ss')] Drawer OPENED" -ForegroundColor Green
      } else {
        $json = '{"success":false,"error":"printer send failed"}'
        Write-Host "  [$(Get-Date -Format 'HH:mm:ss')] Drawer FAILED" -ForegroundColor Red
      }
    } else {
      $json = '{"status":"running","printer":"' + $printerName + '"}'
    }

    $buf = [Text.Encoding]::UTF8.GetBytes($json)
    $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
    $ctx.Response.Close()
  } catch {
    # Ignore errors and continue
  }
}
