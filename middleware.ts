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

    // Get hostname of request (e.g. atiab.asntechnology.net, test.localhost:3000)
    const hostname = req.headers.get('host') || '';

    // Extract path and search params
    const searchParams = req.nextUrl.searchParams.toString();
    const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

    console.log(`[Middleware] Host: ${hostname}, Path: ${path}`);

    // 0. Auto-open Atyab Menu on the main domain root path
    if ((hostname === 'asntechnology.net' || hostname === 'www.asntechnology.net' || hostname === 'localhost:3000') && url.pathname === '/') {
        return NextResponse.redirect(new URL(`/menu/6cd35d66-f5e6-4add-a594-b7ec0ba8041a`, req.url));
    }

    // 1. Check for exact hardcoded aliases for external fully custom domains (e.g., www.brand.com)
    const DOMAIN_ALIASES: Record<string, string> = {
        'test-restaurant.localhost:3000': '6cd35d66-f5e6-4add-a594-b7ec0ba8041a',
    };

    if (DOMAIN_ALIASES[hostname]) {
        const destRestaurantId = DOMAIN_ALIASES[hostname];
        if (!url.pathname.startsWith(`/menu/${destRestaurantId}`)) {
            return NextResponse.rewrite(new URL(`/menu/${destRestaurantId}${path}`, req.url));
        }
        return NextResponse.next();
    }

    // 2. Determine root domains including localhost variations
    const rootDomains = ['asntechnology.net', 'asntechnology.com', 'localhost:3000'];
    const rootDomain = rootDomains.find(d => hostname.endsWith(d)) || rootDomains[0];

    // Extract the potential subdomain (e.g., "atiab" from "atiab.asntechnology.net")
    const currentHost = hostname.replace(`.${rootDomain}`, '').replace(rootDomain, '');

    // Known "safe" prefixes that shouldn't be treated as restaurant subdomains
    const reservedSubdomains = ['www', 'admin', 'api', 'dashboard', 'app', 'localhost:3000', rootDomain];

    // 3. Fallback: If it's a subdomain and NOT a reserved one (and no explicit alias above)
    if (
        currentHost !== hostname && // It actually has a subdomain portion
        currentHost !== rootDomain && // It's not just exactly the root domain
        !reservedSubdomains.includes(currentHost)
    ) {
        // Rewrite to the menu path!
        // For example some-other.asntechnology.net -> /menu/some-other
        if (!url.pathname.startsWith(`/menu/${currentHost}`)) {
            return NextResponse.rewrite(new URL(`/menu/${currentHost}${path}`, req.url));
        }
    }

    // 4. Protect /super-admin route
    if (url.pathname.startsWith('/super-admin')) {
        // To enforce strictly, we really should verify a session cookie or token.
        // For Next.js middleware with Supabase, we need to check the auth cookie.
        // We will just return Next anyway to be parsed by the page/layout, 
        // because running full DB queries in middleware edge runtime is not ideal for Supabase standard client unless using @supabase/ssr.
        // Let's rely on the layout.tsx to do the heavy lifting of role auth, but we can prevent simple access here:
        const nextAuthCookie = req.cookies.get('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1].split('.')[0] + '-auth-token');
        if (!nextAuthCookie) {
           return NextResponse.redirect(new URL('/login', req.url));
        }
    }

    return NextResponse.next();
}
