import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/app/version
 * Returns the latest mobile app version metadata so mobile clients (both Google Play
 * and direct/sideloaded APKs) can detect new updates and prompt the user to update.
 */
export async function GET() {
    const r2PublicUrl = (process.env.R2_PUBLIC_URL || 'https://pub-bf5cb456ccb341b98cf3e5da0997dfc1.r2.dev').replace(/\/+$/, '');
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');

    let apkUrl = `${r2PublicUrl}/asn-app-release.apk`;
    if (!process.env.R2_PUBLIC_URL && supabaseUrl) {
        apkUrl = `${supabaseUrl}/storage/v1/object/public/app-releases/asn-app-release.apk`;
    }

    return NextResponse.json({
        version: "2.1.2",
        build_number: 19,
        download_url: apkUrl,
        release_notes: "الإصدار 2.1.2: تحديث أمني واستقرار شامل، منع كامل لأخطاء المصادقة بالخلفية، وإدارة حصرية لنداء الويتر من السوبر أدمن.",
        mandatory: true
    }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
