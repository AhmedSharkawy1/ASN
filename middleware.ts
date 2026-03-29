import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

// ربط أسماء الـ slugs بمعرفات المطاعم (UUID)
const SLUG_TO_UUID: Record<string, string> = {
    'atiab': '6cd35d66-f5e6-4add-a594-b7ec0ba8041a',
    // أضف مطاعم أخرى هنا:
    // 'pizza-house': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
};

// عكس الـ Map: UUID → slug (لتحويل /menu/UUID إلى subdomain)
const UUID_TO_SLUG: Record<string, string> = Object.fromEntries(
    Object.entries(SLUG_TO_UUID).map(([slug, uuid]) => [uuid, slug])
);

export default function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get('host') || '';

    // تحديد النطاقات الأساسية
    const rootDomains = ['asntechnology.net', 'localhost:3000'];
    const rootDomain = rootDomains.find(d => hostname.endsWith(d)) || rootDomains[0];

    // استخراج الـ Subdomain
    let subdomain = '';
    if (hostname.endsWith(`.${rootDomain}`)) {
        subdomain = hostname.replace(`.${rootDomain}`, '');
    } else if (hostname === rootDomain) {
        subdomain = '';
    } else {
        subdomain = hostname.replace(rootDomain, '').replace('.', '');
    }

    // الكلمات المحجوزة
    const reservedSubdomains = ['www', 'admin', 'api', 'dashboard', 'app'];
    const isMainDomain = subdomain === '' || subdomain === 'www';

    // ═══════════════════════════════════════════════════════════════
    // 1. الدومين الأساسي: تحويل /menu/{slug} أو /menu/{UUID} → subdomain
    // ═══════════════════════════════════════════════════════════════
    if (isMainDomain) {
        // الصفحة الرئيسية → تحويل لمنيو أطياب
        if (url.pathname === '/') {
            return NextResponse.redirect(new URL(`/menu/6cd35d66-f5e6-4add-a594-b7ec0ba8041a`, req.url));
        }

        // إذا كان المسار /menu/{id-or-slug}، حوّل للـ subdomain
        const menuMatch = url.pathname.match(/^\/menu\/([^/]+)/);
        if (menuMatch) {
            const param = menuMatch[1];
            // تحقق إذا كان UUID أو slug
            const slug = UUID_TO_SLUG[param] || (SLUG_TO_UUID[param] ? param : null);

            if (slug && rootDomain !== 'localhost:3000') {
                // حوّل إلى الـ subdomain
                console.log(`[Middleware] Redirecting /menu/${param} → https://${slug}.${rootDomain}/`);
                return NextResponse.redirect(new URL(`https://${slug}.${rootDomain}/`));
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. الـ Subdomain: عرض المنيو مباشرة (rewrite داخلي)
    // ═══════════════════════════════════════════════════════════════
    if (subdomain && !reservedSubdomains.includes(subdomain)) {
        const restaurantId = SLUG_TO_UUID[subdomain] || subdomain;

        if (url.pathname === '/' || !url.pathname.startsWith('/menu/')) {
            if (!url.pathname.startsWith('/api')) {
                const targetPath = url.pathname === '/' ? `/menu/${restaurantId}` : `/menu/${restaurantId}${url.pathname}`;
                console.log(`[Middleware] Subdomain ${subdomain} → Rewrite to ${targetPath}`);
                return NextResponse.rewrite(new URL(`${targetPath}${url.search || ''}`, req.url));
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. حماية مسار الـ super-admin
    // ═══════════════════════════════════════════════════════════════
    if (url.pathname.startsWith('/super-admin')) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
        const nextAuthCookie = req.cookies.get(`sb-${projectRef}-auth-token`);
        
        if (!nextAuthCookie) {
            return NextResponse.redirect(new URL('/login', req.url));
        }
    }

    return NextResponse.next();
}
