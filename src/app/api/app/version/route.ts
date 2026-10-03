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
        version: "1.5.6",
        build_number: 15,
        download_url: apkUrl,
        release_notes: "تحديث جديد يتضمن تحسين استقرار الاتصال وسرعة استلام الطلبات وتوفير استهلاك البيانات.",
        mandatory: false
    }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
