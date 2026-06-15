import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint to fetch images from external URLs.
 * This bypasses CORS restrictions that prevent the browser from fetching
 * images directly from other domains.
 * 
 * Usage: POST /api/proxy-image  { url: "https://..." }
 */
export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'Missing url' }, { status: 400 });
        }

        // Basic URL validation
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
        }

        // Only allow http/https
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/*,*/*',
                'Referer': parsedUrl.origin,
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Verify it's actually an image
        if (!contentType.startsWith('image/')) {
            return NextResponse.json({ error: 'URL did not return an image' }, { status: 400 });
        }

        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Proxy image error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
