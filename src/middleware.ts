import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

// الكلمات المحجوزة التي لا تمثل مطاعم
const RESERVED_SUBDOMAINS = ['www', 'admin', 'api', 'dashboard', 'app', 'super-admin', 'login'];

export default function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';

    // تحديد النطاق الأساسي
    const rootDomains = ['asntechnology.net', 'localhost:3000'];
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
    // 2. السبدومين (Rewrite)
    // ═══════════════════════════════════════════════════════════════
    if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain)) {
        // توجيه السبدومين داخلياً لصفحة المنيو باستخدام الـ subdomain كـ slug
        if (path === '/' || (!path.startsWith('/menu/') && !path.startsWith('/api'))) {
            const targetPath = path === '/' ? `/menu/${subdomain}` : `/menu/${subdomain}${path}`;
            console.log(`[Middleware] Subdomain ${subdomain} -> Dynamic Rewrite to ${targetPath}`);
            return NextResponse.rewrite(new URL(`${targetPath}${url.search || ''}`, req.url));
        }
    }

    return NextResponse.next();
}
