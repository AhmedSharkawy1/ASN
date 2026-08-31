@echo off
title تثبيت خدمة درج الكاشير - ASN Cash Drawer Setup
color 0A
chcp 65001 >nul
cls

echo ======================================================
echo    تثبيت خدمة فتح درج الكاشير التلقائي - ASN POS
echo ======================================================
echo.
echo  جاري التثبيت للتشغيل التلقائي مع الويندوز في الخلفية...
echo.

set "TARGET_DIR=%LOCALAPPDATA%\ASN-Drawer"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: Create the PowerShell background script
(
echo Add-Type @"
echo using System;
echo using System.Runtime.InteropServices;
echo public class RawPrint {
echo   [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode^)]
echo   public struct DOCINFO { public string pDocName; public IntPtr pOutputFile; public string pDataType; }
echo   [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode^)]
echo   public static extern bool OpenPrinter(string p, out IntPtr h, IntPtr d^);
echo   [DllImport("winspool.drv", SetLastError=true^)]
echo   public static extern bool ClosePrinter(IntPtr h^);
echo   [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode^)]
echo   public static extern bool StartDocPrinter(IntPtr h, int l, ref DOCINFO d^);
echo   [DllImport("winspool.drv", SetLastError=true^)]
echo   public static extern bool EndDocPrinter(IntPtr h^);
echo   [DllImport("winspool.drv", SetLastError=true^)]
echo   public static extern bool StartPagePrinter(IntPtr h^);
echo   [DllImport("winspool.drv", SetLastError=true^)]
echo   public static extern bool EndPagePrinter(IntPtr h^);
echo   [DllImport("winspool.drv", SetLastError=true^)]
echo   public static extern bool WritePrinter(IntPtr h, IntPtr b, int c, out int w^);
echo   public static bool Send(string name, byte[] data^) {
echo     IntPtr h;
echo     if (!OpenPrinter(name, out h, IntPtr.Zero^)^) return false;
echo     var di = new DOCINFO { pDocName = "ASN Drawer", pDataType = "RAW" };
echo     if (!StartDocPrinter(h, 1, ref di^)^) { ClosePrinter(h^); return false; }
echo     StartPagePrinter(h^);
echo     IntPtr p = Marshal.AllocCoTaskMem(data.Length^);
echo     Marshal.Copy(data, 0, p, data.Length^);
echo     int w; WritePrinter(h, p, data.Length, out w^);
echo     Marshal.FreeCoTaskMem(p^);
echo     EndPagePrinter(h^); EndDocPrinter(h^); ClosePrinter(h^);
echo     return true;
echo   }
echo }
echo "@
echo.
echo function Get-DrawerPrinter {
echo   $printers = Get-Printer -ErrorAction SilentlyContinue
echo   foreach ($pr in $printers^) {
echo     if ($pr.Name -match 'XP^|Thermal^|POS^|Receipt^|80^|58'^) { return $pr.Name }
echo   }
echo   $def = $printers ^| Where-Object { $_.Default -eq $true } ^| Select-Object -First 1
echo   if ($def^) { return $def.Name }
echo   if ($printers.Count -gt 0^) { return $printers[0].Name }
echo   return $null
echo }
echo.
echo $listener = New-Object System.Net.HttpListener
echo $listener.Prefixes.Add('http://localhost:5689/'^)
echo try { $listener.Start(^) } catch { exit }
echo.
echo while ($listener.IsListening^) {
echo   try {
echo     $ctx = $listener.GetContext(^)
echo     $ctx.Response.Headers.Add('Access-Control-Allow-Origin','*'^)
echo     $ctx.Response.Headers.Add('Access-Control-Allow-Methods','GET,POST,OPTIONS'^)
echo     $ctx.Response.Headers.Add('Access-Control-Allow-Headers','Content-Type'^)
echo     $ctx.Response.ContentType = 'application/json'
echo.
echo     if ($ctx.Request.HttpMethod -eq 'OPTIONS'^) {
echo       $ctx.Response.StatusCode = 204
echo       $ctx.Response.Close(^)
echo       continue
echo     }
echo.
echo     $printerName = Get-DrawerPrinter
echo     if ($ctx.Request.Url.LocalPath -eq '/open-drawer'^) {
echo       if ($printerName^) {
echo         $bytes = [byte[]](0x1B,0x70,0x00,0x19,0xFA^)
echo         $ok = [RawPrint]::Send($printerName, $bytes^)
echo         $json = if ($ok^) { '{"success":true}' } else { '{"success":false,"error":"printer send failed"}' }
echo       } else {
echo         $json = '{"success":false,"error":"no printer found"}'
echo       }
echo     } else {
echo       $json = '{"status":"running","printer":"' + $printerName + '"}'
echo     }
echo.
echo     $buf = [Text.Encoding]::UTF8.GetBytes($json^)
echo     $ctx.Response.OutputStream.Write($buf, 0, $buf.Length^)
echo     $ctx.Response.Close(^)
echo   } catch { }
echo }
) > "%TARGET_DIR%\asn-drawer.ps1"

:: Create hidden runner VBScript (runs powershell silently with zero windows)
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ ^& "%TARGET_DIR%\asn-drawer.ps1"""", 0, False
) > "%TARGET_DIR%\run-hidden.vbs"

:: Add shortcut to Windows Startup folder
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
(
echo Set oWS = WScript.CreateObject("WScript.Shell"^)
echo sLinkFile = "%STARTUP_DIR%\ASN-Drawer.lnk"
echo Set oLink = oWS.CreateShortcut(sLinkFile^)
echo oLink.TargetPath = "wscript.exe"
echo oLink.Arguments = """%TARGET_DIR%\run-hidden.vbs"""
echo oLink.WorkingDirectory = "%TARGET_DIR%"
echo oLink.WindowStyle = 7
echo oLink.Save
) > "%TEMP%\create_shortcut.vbs"
cscript //nologo "%TEMP%\create_shortcut.vbs"
del "%TEMP%\create_shortcut.vbs"

:: Kill any existing instance and start immediately
taskkill /F /FI "WINDOWTITLE eq ASN*" >nul 2>&1
wscript.exe "%TARGET_DIR%\run-hidden.vbs"

echo.
echo ======================================================
echo  [✓] تم التثبيت والتشغيل بنجاح!
echo ======================================================
echo.
echo  - الخدمة تعمل الآن في الخلفية بدون أي نوافذ مزعجة.
echo  - ستعمل تلقائياً في كل مرة يفتح فيها الكمبيوتر.
echo  - لا تحتاج لفتح أي ملف بعد اليوم.
echo.
echo اضغط أي زر لإغلاق هذه النافذة...
pause >nul
