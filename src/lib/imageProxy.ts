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

  // Only rewrite Supabase Storage URLs
  const idx = url.indexOf(SUPABASE_STORAGE_PREFIX);
  if (idx === -1) return url;

  // Extract the path after the bucket name, e.g. "thumbs/abc.webp"
  const storagePath = url.substring(idx + SUPABASE_STORAGE_PREFIX.length);
  if (!storagePath) return url;

  return `/api/img/${storagePath}`;
}

/**
 * Check whether a URL points to our Supabase Storage bucket.
 */
export function isSupabaseImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes(SUPABASE_STORAGE_PREFIX);
}
