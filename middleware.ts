import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

const SLUG_TO_UUID: Record<string, string> = {
    'atiab': '6cd35d66-f5e6-4add-a594-b7ec0ba8041a',
};

const UUID_TO_SLUG: Record<string, string> = Object.fromEntries(
    Object.entries(SLUG_TO_UUID).map(([slug, uuid]) => [uuid, slug])
);

export default function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';

    // تحديد النطاق الأساسي
    const rootDomains = ['asntechnology.net', 'localhost:3000'];
    const rootDomain = rootDomains.find(d => hostname.endsWith(d)) || rootDomains[0];

    // استخراج الـ Subdomain بشكل أدق
    let subdomain = '';
    // إزالة الدومين الأساسي والنقطة التي قبله
    const hostWithoutRoot = hostname.replace(`.${rootDomain}`, '').replace(rootDomain, '');
    if (hostWithoutRoot && hostWithoutRoot !== 'www') {
        const parts = hostWithoutRoot.split('.');
        subdomain = parts[parts.length - 1]; // آخر جزء هو الـ subdomain
    } else if (hostname.startsWith('www.')) {
        subdomain = 'www';
    }

    const isMainDomain = subdomain === '' || subdomain === 'www';
    const path = url.pathname;

    // ═══════════════════════════════════════════════════════════════
    // 1. الدومين الأساسي: تحويل /menu/atiab -> atiab.asntechnology.net
    // ═══════════════════════════════════════════════════════════════
    if (isMainDomain) {
        const menuMatch = path.match(/^\/menu\/([^/]+)/);
        if (menuMatch) {
            const param = menuMatch[1];
            const slug = UUID_TO_SLUG[param] || (SLUG_TO_UUID[param] ? param : null);
            
            if (slug && !hostname.includes('localhost')) {
                const protocol = req.headers.get('x-forwarded-proto') || 'https';
                console.log(`[Middleware] Redirecting ${path} to ${slug}.${rootDomain}`);
                return NextResponse.redirect(new URL(`${protocol}://${slug}.${rootDomain}/`, req.url));
            }
        }
        
        const res = NextResponse.next();
        res.headers.set('x-asn-subdomain', 'main');
        res.headers.set('x-asn-host', hostname);
        return res;
    } 

    // ═══════════════════════════════════════════════════════════════
    // 2. السبدومين: عرض المنيو مباشرة (rewrite داخلي)
    // ═══════════════════════════════════════════════════════════════
    const reserved = ['admin', 'api', 'dashboard', 'app'];
    if (subdomain && !reserved.includes(subdomain)) {
        const restaurantId = SLUG_TO_UUID[subdomain] || subdomain;
        
        // Rewrite داخلي للمنيو
        if (path === '/' || (!path.startsWith('/menu/') && !path.startsWith('/api'))) {
            const targetPath = path === '/' ? `/menu/${restaurantId}` : `/menu/${restaurantId}${path}`;
            console.log(`[Middleware] Subdomain ${subdomain} -> Rewrite to ${targetPath}`);
            const res = NextResponse.rewrite(new URL(`${targetPath}${url.search || ''}`, req.url));
            res.headers.set('x-asn-subdomain', subdomain);
            res.headers.set('x-asn-host', hostname);
            res.headers.set('x-asn-target', targetPath);
            return res;
        }
    }

    const finalRes = NextResponse.next();
    finalRes.headers.set('x-asn-subdomain', subdomain || 'none');
    finalRes.headers.set('x-asn-host', hostname);
    return finalRes;
}
