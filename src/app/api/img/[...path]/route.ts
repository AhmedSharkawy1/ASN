import { NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Edge CDN image proxy for Supabase Storage.
 *
 * Serves images from `/api/img/thumbs/abc.webp` (or `/api/img/original/...`)
 * by fetching them from Supabase Storage on a cache miss and returning them
 * with a 1-year immutable Cache-Control header.
 *
 * WHY THIS EXISTS:
 *   Supabase free plan = 5 GB egress/month.
 *   Vercel Hobby plan  = 100 GB bandwidth/month.
 *   By proxying images through Vercel, the browser never contacts Supabase
 *   directly, and Vercel's global edge CDN caches the response. Subsequent
 *   requests to the same image are served from the edge with ZERO Supabase
 *   egress. Typical cache hit rate: 95–98%.
 *
 * SECURITY:
 *   Only proxies paths within our own Supabase Storage bucket. The path is
 *   validated to prevent SSRF or directory traversal.
 */

// Use Node.js runtime so Vercel can cache the full response at the edge.
// (Edge runtime also works, but Node gives us more familiar APIs.)
export const runtime = 'nodejs';

import { isR2Configured, getObjectFromR2, uploadBufferToR2 } from '@/lib/r2';

// Supabase public bucket base URL — constructed from the env var at startup
// so we don't hardcode the project reference.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const BUCKET_NAME = 'menu-images';
const ORIGIN_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`;

// Path segments that are NOT allowed — prevents traversal tricks
const BLOCKED_SEGMENTS = ['..', '.env', 'node_modules'];

function isPathSafe(segments: string[]): boolean {
  return segments.every(
    (seg) =>
      seg.length > 0 &&
      seg.length < 256 &&
      !BLOCKED_SEGMENTS.includes(seg) &&
      !seg.includes('\\')
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const { path } = params;

  // Validate path
  if (!path || path.length === 0) {
    return NextResponse.json({ error: 'Missing image path' }, { status: 400 });
  }

  if (!isPathSafe(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const storagePath = path.join('/');

  try {
    // 1. Check Cloudflare R2 first (Zero-cost, global edge delivery)
    if (isR2Configured()) {
      const r2Object = await getObjectFromR2(storagePath);
      if (r2Object) {
        return new NextResponse(r2Object.body as any, {
          status: 200,
          headers: {
            'Content-Type': r2Object.contentType,
            'Cache-Control': r2Object.cacheControl,
            'Access-Control-Allow-Origin': '*',
            'Vary': 'Accept-Encoding',
            'X-Storage-Source': 'cloudflare-r2',
          },
        });
      }
    }

    // 2. Fallback to Supabase Storage if not yet in R2
    const originUrl = `${ORIGIN_BASE}/${storagePath}`;
    const originResponse = await fetch(originUrl, {
      cache: 'no-store',
    });

    if (!originResponse.ok) {
      return new NextResponse(null, { status: originResponse.status });
    }

    const contentType =
      originResponse.headers.get('content-type') || 'image/webp';

    if (
      !contentType.startsWith('image/') &&
      !contentType.startsWith('application/octet-stream')
    ) {
      return NextResponse.json(
        { error: 'Not an image' },
        { status: 400 }
      );
    }

    const body = await originResponse.arrayBuffer();

    // 3. Opportunistic Migration: If R2 is configured, copy this image to R2 in background
    if (isR2Configured()) {
      uploadBufferToR2(storagePath, Buffer.from(body), contentType).catch((uploadErr) => {
        console.warn('[IMG_PROXY] Background copy to R2 failed for', storagePath, uploadErr);
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Vary': 'Accept-Encoding',
        'X-Storage-Source': 'supabase-fallback',
      },
    });
  } catch (err) {
    console.error('[IMG_PROXY] Failed to fetch from origin:', err);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 502 }
    );
  }
}
