import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
    const userAgent = request.headers.get("user-agent") || "";
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isMobile = isIOS || isAndroid;

    // Try to get the APK download URL from Supabase storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    let apkUrl = "";
    if (supabaseUrl) {
        apkUrl = `${supabaseUrl}/storage/v1/object/public/app-releases/asn-app-release.apk`;
    }

    // If Android device, redirect directly to APK download
    if (isAndroid && apkUrl) {
        return NextResponse.redirect(apkUrl);
    }

    // For all other cases, serve the download landing page
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تحميل تطبيق ASN</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            overflow: hidden;
        }
        .container {
            max-width: 460px;
            width: 90%;
            text-align: center;
            padding: 40px 24px;
            position: relative;
            z-index: 1;
        }
        .glow {
            position: fixed;
            width: 300px;
            height: 300px;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.15;
            z-index: 0;
        }
        .glow-1 { background: #14b8a6; top: -100px; left: -50px; }
        .glow-2 { background: #06b6d4; bottom: -100px; right: -50px; }
        .logo-container {
            width: 100px;
            height: 100px;
            margin: 0 auto 24px;
            background: linear-gradient(135deg, #14b8a6, #06b6d4);
            border-radius: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 20px 60px rgba(20, 184, 166, 0.3);
            animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        .logo-container svg { width: 50px; height: 50px; fill: white; }
        h1 {
            font-size: 28px;
            font-weight: 900;
            margin-bottom: 8px;
            background: linear-gradient(to left, #14b8a6, #06b6d4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle { color: #94a3b8; font-size: 15px; margin-bottom: 32px; line-height: 1.6; }
        .platform-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 24px;
            margin-bottom: 16px;
            backdrop-filter: blur(10px);
            transition: all 0.3s;
        }
        .platform-card:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(20, 184, 166, 0.3);
            transform: translateY(-2px);
        }
        .platform-icon { font-size: 40px; margin-bottom: 12px; }
        .platform-name { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
        .platform-desc { color: #94a3b8; font-size: 13px; margin-bottom: 16px; }
        .download-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 28px;
            border: none;
            border-radius: 14px;
            font-size: 15px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
        }
        .btn-android {
            background: linear-gradient(135deg, #14b8a6, #10b981);
            color: white;
        }
        .btn-android:hover { transform: scale(1.05); box-shadow: 0 10px 30px rgba(20, 184, 166, 0.4); }
        .btn-ios {
            background: rgba(255, 255, 255, 0.1);
            color: #94a3b8;
            border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .btn-ios:hover { background: rgba(255, 255, 255, 0.15); }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 12px;
        }
        .badge-ready { background: rgba(20, 184, 166, 0.15); color: #14b8a6; }
        .badge-soon { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
        .steps {
            text-align: right;
            margin-top: 24px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .steps h3 { font-size: 14px; font-weight: 800; margin-bottom: 12px; color: #14b8a6; }
        .steps ol { padding-right: 20px; }
        .steps li { color: #94a3b8; font-size: 13px; line-height: 2; }
        .version { color: #475569; font-size: 12px; margin-top: 24px; }
    </style>
</head>
<body>
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>
    <div class="container">
        <div class="logo-container">
            <svg viewBox="0 0 24 24"><path d="M17.6 11.48L19.5 9.6c.4-.4.4-1 0-1.4l-1.1-1.1c-.4-.4-1-.4-1.4 0l-1.9 1.9c-.8-.5-1.7-.8-2.6-.9V6h1.5c.6 0 1-.4 1-1V3.5c0-.6-.4-1-1-1h-4c-.6 0-1 .4-1 1V5c0 .6.4 1 1 1H12v2.1c-3.5.5-6.2 3.5-6.2 7.1 0 4 3.2 7.2 7.2 7.2s7.2-3.2 7.2-7.2c0-1.3-.3-2.5-1-3.6zM13 20.2c-3.4 0-6.2-2.8-6.2-6.2 0-3.1 2.3-5.7 5.2-6.1v3.1h2v-3.1c2.9.4 5.2 3 5.2 6.1 0 3.4-2.8 6.2-6.2 6.2z"/></svg>
        </div>
        <h1>تطبيق ASN</h1>
        <p class="subtitle">إدارة مطعمك من أي مكان - الطلبات، المنتجات، التقارير، وأكثر</p>

        <!-- Android Section -->
        <div class="platform-card" ${isIOS ? 'style="order: 2"' : ''}>
            <div class="platform-icon">🤖</div>
            <span class="badge badge-ready">متاح الآن ✓</span>
            <div class="platform-name">Android</div>
            <p class="platform-desc">تحميل مباشر - لا يحتاج متجر Google Play</p>
            <a href="${apkUrl}" class="download-btn btn-android">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                تحميل APK
            </a>
            <div class="steps">
                <h3>خطوات التثبيت:</h3>
                <ol>
                    <li>اضغط على زر "تحميل APK" أعلاه</li>
                    <li>بعد انتهاء التحميل، افتح الملف</li>
                    <li>إذا ظهرت رسالة أمان، اضغط "الإعدادات" ثم فعّل "السماح من هذا المصدر"</li>
                    <li>اضغط "تثبيت" وانتظر حتى يكتمل</li>
                    <li>افتح التطبيق وسجل الدخول ببيانات حسابك</li>
                </ol>
            </div>
        </div>

        <!-- iOS Section -->
        <div class="platform-card" ${isIOS ? 'style="order: 1"' : ''}>
            <div class="platform-icon">🍎</div>
            <span class="badge badge-soon">قريباً</span>
            <div class="platform-name">iPhone / iPad</div>
            <p class="platform-desc">سيكون متاح قريباً عبر TestFlight أو App Store</p>
            <button class="download-btn btn-ios" disabled>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                قريباً - تحت التطوير
            </button>
        </div>

        <p class="version">ASN Technology © ${new Date().getFullYear()} — الإصدار 1.0.0</p>
    </div>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
        },
    });
}
