/**
 * Converts Supabase Storage URLs to local Vercel-proxied URLs.
 *
 * Instead of the browser fetching directly from Supabase (counted as egress),
 * images are served through `/api/img/[...path]` which Vercel's edge CDN
 * caches globally.  A 1-year immutable Cache-Control header means almost every
 * request is a cache HIT with **zero** Supabase egress.
 *
 * Supabase free plan: 5 GB egress/month
 * Vercel Hobby plan: 100 GB bandwidth/month (20× more)
 */

/** The public storage prefix we look for in incoming URLs. */
const SUPABASE_STORAGE_PREFIX = '/storage/v1/object/public/menu-images/';

/**
 * Convert a Supabase Storage public URL to its Vercel-proxied equivalent.
 *
 * @example
 *   getProxiedImageUrl(
 *     'https://xxx.supabase.co/storage/v1/object/public/menu-images/thumbs/abc.webp'
 *   )
 *   // → '/api/img/thumbs/abc.webp'
 *
 * Non-Supabase URLs (Unsplash placeholders, data: URIs, relative paths, etc.)
 * are returned unchanged so callers don't need to guard.
 */
export function getProxiedImageUrl(url: string | undefined | null): string {
  if (!url) return '';

  // Already proxied
  if (url.startsWith('/api/img/')) return url;

  // 1. Rewrite Supabase Storage URLs
  const idx = url.indexOf(SUPABASE_STORAGE_PREFIX);
  if (idx !== -1) {
    const storagePath = url.substring(idx + SUPABASE_STORAGE_PREFIX.length);
    if (storagePath) return `/api/img/${storagePath}`;
  }

  // 2. Rewrite Cloudflare R2 public URLs (.r2.dev or any R2 custom domain)
  const r2Match = url.match(/^https:\/\/[^/]+\.r2\.dev\/(.+)$/);
  if (r2Match && r2Match[1]) {
    return `/api/img/${r2Match[1]}`;
  }

  // 3. Rewrite any R2 custom domain URL by checking for /original/ or /thumbs/ prefix
  //    This catches R2 URLs served from custom domains that don't end in .r2.dev
  if (url.startsWith('https://') && (url.includes('/original/') || url.includes('/thumbs/'))) {
    const origIdx = url.indexOf('/original/');
    const thumbIdx = url.indexOf('/thumbs/');
    const pathStart = origIdx !== -1 ? origIdx : thumbIdx;
    if (pathStart !== -1) {
      const storagePath = url.substring(pathStart + 1); // remove leading /
      if (storagePath && !url.includes('supabase')) {
        return `/api/img/${storagePath}`;
      }
    }
  }

  return url;
}

/**
 * Check whether a URL points to our storage bucket (Supabase or Cloudflare R2).
 */
export function isSupabaseImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes(SUPABASE_STORAGE_PREFIX) || url.includes('.r2.dev/') || url.startsWith('/api/img/');
}
