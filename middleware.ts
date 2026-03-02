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

    // 1. Check for exact hardcoded aliases mapping directly to a specific restaurant ID (UUID)
    const DOMAIN_ALIASES: Record<string, string> = {
        'atiab.asntechnology.com': '6cd35d66-f5e6-4add-a594-b7ec0ba8041a',
        'atiab.asntechnology.net': '6cd35d66-f5e6-4add-a594-b7ec0ba8041a',
        'test-restaurant.localhost:3000': '6cd35d66-f5e6-4add-a594-b7ec0ba8041a',
        'atiab.localhost:3000': '6cd35d66-f5e6-4add-a594-b7ec0ba8041a'
    };

    if (DOMAIN_ALIASES[hostname]) {
        const destRestaurantId = DOMAIN_ALIASES[hostname];
        if (!url.pathname.startsWith(`/menu/${destRestaurantId}`)) {
            return NextResponse.rewrite(new URL(`/menu/${destRestaurantId}${path}`, req.url));
        }
        return NextResponse.next();
    }

    // 2. Determine root domains including localhost variations
    // Replace this with the actual root domain in production 'asntechnology.net'
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const rootDomain = isLocalhost ? 'localhost:3000' : 'asntechnology.net';

    // Extract the potential subdomain
    const currentHost = hostname.replace(`.${rootDomain}`, '');

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

    return NextResponse.next();
}
