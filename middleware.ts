import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

export default function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get('host') || '';

    // تحديد النطاقات الأساسية
    const rootDomains = ['asntechnology.net', 'localhost:3000'];
    const rootDomain = rootDomains.find(d => hostname.endsWith(d)) || rootDomains[0];

    // استخراج الـ Subdomain بشكل أدق
    let subdomain = '';
    if (hostname.endsWith(`.${rootDomain}`)) {
        subdomain = hostname.replace(`.${rootDomain}`, '');
    } else if (hostname === rootDomain) {
        subdomain = ''; // النطاق الأساسي
    } else {
        // في حالة وجود إعدادات localhost مختلفة أو دومين مخصص تماماً
        subdomain = hostname.replace(rootDomain, '').replace('.', '');
    }

    const path = `${url.pathname}${url.search ? url.search : ''}`;

    // الكلمات المحجوزة التي لا تمثل مطاعم
    const reservedSubdomains = ['www', 'admin', 'api', 'dashboard', 'app', 'localhost:3000', 'asntechnology.net'];

    // 1. التعامل مع النطاق الأساسي (الرئيسي)
    if ((subdomain === '' || subdomain === 'www') && url.pathname === '/') {
        // تحويل افتراضي لمطعم أطباق (يمكن تغييره لصفحة هبوط لاحقاً)
        return NextResponse.redirect(new URL(`/menu/6cd35d66-f5e6-4add-a594-b7ec0ba8041a`, req.url));
    }

    // 2. التعامل مع الـ Subdomains (مثل atiab.asntechnology.net)
    if (subdomain && !reservedSubdomains.includes(subdomain)) {
        // إذا كان الطلب لا يخص الـ API ولا يبدأ بمسار المنيو فعلياً
        if (!url.pathname.startsWith(`/menu/${subdomain}`) && !url.pathname.startsWith('/api')) {
            console.log(`[Middleware] Subdomain detected: ${subdomain}. Rewriting to /menu/${subdomain}${path}`);
            return NextResponse.rewrite(new URL(`/menu/${subdomain}${path}`, req.url));
        }
    }

    // 3. حماية مسار الـ super-admin
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
