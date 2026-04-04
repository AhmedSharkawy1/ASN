import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

// الكلمات المحجوزة التي لا تمثل مطاعم
const RESERVED_SUBDOMAINS = ['www', 'admin', 'api', 'dashboard', 'app', 'super-admin', 'login'];

// الثيمات التي سيتم توجيهها أتوماتيكياً لحساب التسويق "demo"
const THEME_SUBDOMAINS = [
    'pizzapasta', 'atyab-oriental', 'bab-alhara', 'atyab-etoile',
    'theme5', 'theme6', 'theme7', 'theme9', 'theme10', 'theme11', 'theme12', 'theme13', 'theme16',
    'pizzapasta-cyan', 'pizzapasta-emerald', 'pizzapasta-sky',
    'atyab-oriental-cyan', 'atyab-oriental-emerald', 'atyab-oriental-sky',
    'bab-alhara-cyan', 'bab-alhara-emerald', 'bab-alhara-sky',
    'atyab-etoile-cyan', 'atyab-etoile-emerald', 'atyab-etoile-sky',
    'theme5-cyan', 'theme5-emerald', 'theme5-sky',
    'theme6-cyan', 'theme6-emerald', 'theme6-sky',
    'theme7-cyan', 'theme7-emerald', 'theme7-sky',
    'theme9-cyan', 'theme9-emerald', 'theme9-sky',
    'theme10-cyan', 'theme10-emerald', 'theme10-sky',
    'theme11-cyan', 'theme11-emerald', 'theme11-sky',
    'theme13-cyan', 'theme13-emerald', 'theme13-sky',
    'theme15-sky' // just keeping historical ones in case
];

export default function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';

    // تحديد النطاق الأساسي
    const rootDomains = ['asntechnology.net', 'localhost:3000', 'localhost:3456'];
    const rootDomain = rootDomains.find(d => hostname.endsWith(d)) || rootDomains[0];

    // استخراج الـ Subdomain
    let subdomain = '';
    const hostWithoutRoot = hostname.replace(`.${rootDomain}`, '').replace(rootDomain, '');
    if (hostWithoutRoot && hostWithoutRoot !== 'www') {
        const parts = hostWithoutRoot.split('.');
        subdomain = parts[parts.length - 1];
    } else if (hostname.startsWith('www.')) {
        subdomain = 'www';
    }

    const isMainDomain = subdomain === '' || subdomain === 'www';
    const path = url.pathname;

    // ═══════════════════════════════════════════════════════════════
    // 1. الدومين الأساسي (Redirect)
    // ═══════════════════════════════════════════════════════════════
    if (isMainDomain) {
        // تحويل /menu/slug -> slug.asntechnology.net
        const menuMatch = path.match(/^\/menu\/([^/]+)/);
        if (menuMatch && !hostname.includes('localhost')) {
            const param = menuMatch[1];
            
            // تحقق إذا كان المعرف عبارة عن UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);

            // لا تقم بالتحويل لسبدومين إذا كان المعرف هو UUID (لأن Vercel/Cloudflare سيعطي خطأ SSL)
            if (!isUUID) {
                const protocol = req.headers.get('x-forwarded-proto') || 'https';
                console.log(`[Middleware] Redirecting slug ${param} to subdomain`);
                return NextResponse.redirect(new URL(`${protocol}://${param}.${rootDomain}/`, req.url));
            }
        }
        return NextResponse.next();
    } 

    // ═══════════════════════════════════════════════════════════════
    // 2. الثيمات التسويقية (Marketing Themes Subdomains)
    // ═══════════════════════════════════════════════════════════════
    if (subdomain && THEME_SUBDOMAINS.includes(subdomain)) {
        if (path === '/' || !path.startsWith('/menu/')) {
            const targetPath = path === '/' ? `/menu/demo` : `/menu/demo${path}`;
            console.log(`[Middleware] Theme Subdomain ${subdomain} -> Dynamic Rewrite to demo marketing account`);
            const targetUrl = new URL(targetPath, req.url);
            // Append the preview_theme param, preserve existing search params
            targetUrl.searchParams.set('preview_theme', subdomain);
            if (url.search) {
                // Ensure existing query params are kept
                const existingParams = new URLSearchParams(url.search);
                existingParams.forEach((val, key) => targetUrl.searchParams.set(key, val));
            }
            return NextResponse.rewrite(targetUrl);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. السبدومين (Rewrite)
    // ═══════════════════════════════════════════════════════════════
    if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain) && !THEME_SUBDOMAINS.includes(subdomain)) {
        // توجيه السبدومين داخلياً لصفحة المنيو باستخدام الـ subdomain كـ slug
        if (path === '/' || (!path.startsWith('/menu/') && !path.startsWith('/api'))) {
            const targetPath = path === '/' ? `/menu/${subdomain}` : `/menu/${subdomain}${path}`;
            console.log(`[Middleware] Subdomain ${subdomain} -> Dynamic Rewrite to ${targetPath}`);
            return NextResponse.rewrite(new URL(`${targetPath}${url.search || ''}`, req.url));
        }
    }

    return NextResponse.next();
}
