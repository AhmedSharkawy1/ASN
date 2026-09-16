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
    'pizzapasta-cyan', 'pizzapasta-red', 'pizzapasta-emerald', 'pizzapasta-sky',
    'atyab-oriental-cyan', 'atyab-oriental-red', 'atyab-oriental-emerald', 'atyab-oriental-sky',
    'bab-alhara-cyan', 'bab-alhara-red', 'bab-alhara-emerald', 'bab-alhara-sky',
    'atyab-etoile-cyan', 'atyab-etoile-red', 'atyab-etoile-emerald', 'atyab-etoile-sky',
    'theme5-cyan', 'theme5-red', 'theme5-emerald', 'theme5-sky',
    'theme6-cyan', 'theme6-red', 'theme6-emerald', 'theme6-sky',
    'theme7-cyan', 'theme7-red', 'theme7-emerald', 'theme7-sky',
    'theme9-cyan', 'theme9-emerald', 'theme9-sky',
    'theme10-cyan', 'theme10-red', 'theme10-emerald', 'theme10-sky',
    'theme11-cyan', 'theme11-red', 'theme11-emerald', 'theme11-sky',
    'theme13-cyan', 'theme13-red', 'theme13-emerald', 'theme13-sky',
    'theme18', 'theme18-red', 'theme18-cyan', 'theme18-emerald', 'theme18-sky', 'theme18-pink',
    'lamet-zaman', 'lamet-zaman-red', 'lamet-zaman-emerald', 'lamet-zaman-cyan', 'lamet-zaman-sky', 'lamet-zaman-purple', 'lamet-zaman-gold', 'lamet-zaman-pink', 'lamet-zaman-dark',
    'lamet-zaman-compact', 'lamet-zaman-compact-red', 'lamet-zaman-compact-emerald', 'lamet-zaman-compact-cyan', 'lamet-zaman-compact-sky', 'lamet-zaman-compact-purple', 'lamet-zaman-compact-gold', 'lamet-zaman-compact-pink', 'lamet-zaman-compact-dark',
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

    // ═══════════════════════════════════════════════════════════════
    // 0. النطاقات المخصصة (Custom Domain Mappings)
    // ═══════════════════════════════════════════════════════════════
    const path = url.pathname;
    const customDomainMappings: Record<string, string> = {
        'ezzelsham-aboragwan.vercel.app': 'ezzelshamaboragwan',
        'www.ezzelsham-aboragwan.vercel.app': 'ezzelshamaboragwan'
    };

    const mappedSlug = customDomainMappings[hostname];
    if (mappedSlug) {
        if (path === '/' || (!path.startsWith('/menu/') && !path.startsWith('/api'))) {
            const targetPath = path === '/' ? `/menu/${mappedSlug}` : `/menu/${mappedSlug}${path}`;
            console.log(`[Middleware] Custom Host ${hostname} -> Dynamic Rewrite to ${targetPath}`);
            return NextResponse.rewrite(new URL(`${targetPath}${url.search || ''}`, req.url));
        }
        return NextResponse.next();
    }

    const isMainDomain = subdomain === '' || subdomain === 'www';

    // ═══════════════════════════════════════════════════════════════
    // 1. الدومين الأساسي (Redirect)
    // ═══════════════════════════════════════════════════════════════
    if (isMainDomain) {
        // الروابط في الدومين الأساسي (مثل /menu/meeza) تعمل مباشرة بدون إعادة توجيه لسبدومين لتجنب أخطاء 403 والشاشة البيضاء
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
