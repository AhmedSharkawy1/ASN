/**
 * Utility functions for managing Supabase Storage image URLs.
 * Handles conversion between original and thumbnail paths.
 */

const SUPABASE_STORAGE_PATH = '/storage/v1/object/public/menu-images/';

/**
 * Check if a URL is from our Supabase Storage.
 */
export function isSupabaseStorageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes('.supabase.co/storage/v1/object/public/menu-images/');
}

/**
 * Extract the file path from a full Supabase Storage URL.
 * e.g., "https://xxx.supabase.co/storage/v1/object/public/menu-images/items/abc/uuid.webp"
 * → "items/abc/uuid.webp"
 */
export function extractStoragePath(url: string): string | null {
  const idx = url.indexOf(SUPABASE_STORAGE_PATH);
  if (idx === -1) return null;
  return url.substring(idx + SUPABASE_STORAGE_PATH.length);
}

/**
 * Extract just the filename (without extension) from a storage path or URL.
 * e.g., "items/abc/uuid.webp" → "uuid"
 */
export function extractFileName(urlOrPath: string): string {
  const parts = urlOrPath.split('/');
  const lastPart = parts[parts.length - 1] || '';
  return lastPart.replace(/\.[^/.]+$/, '');
}

/**
 * Convert any Supabase image URL to its thumbnail version.
 * 
 * Strategy:
 * - Extract filename from the URL
 * - Construct thumb path: menu-images/thumbs/{filename}.webp
 * - If URL is not from Supabase Storage, return it unchanged
 * 
 * Examples:
 *   items/abc/uuid.webp           → thumbs/uuid.webp
 *   categories/abc/uuid.webp      → thumbs/uuid.webp
 *   original/uuid.webp            → thumbs/uuid.webp
 *   thumbs/uuid.webp              → thumbs/uuid.webp (already a thumb)
 */
export function getThumbUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) return '';
  if (!isSupabaseStorageUrl(imageUrl)) return imageUrl;

  const storagePath = extractStoragePath(imageUrl);
  if (!storagePath) return imageUrl;

  // If it's already a thumbnail, return as-is
  if (storagePath.startsWith('thumbs/')) return imageUrl;

  const fileName = extractFileName(storagePath);
  if (!fileName) return imageUrl;

  // Build the base URL (everything before the storage path)
  const baseUrl = imageUrl.substring(
    0,
    imageUrl.indexOf(SUPABASE_STORAGE_PATH) + SUPABASE_STORAGE_PATH.length
  );

  return `${baseUrl}thumbs/${fileName}.webp`;
}

/**
 * Convert any Supabase image URL to its original version.
 * 
 * Strategy:
 * - Extract filename from the URL
 * - Construct original path: menu-images/original/{filename}.webp
 * - If URL is not from Supabase Storage, return it unchanged
 * - For legacy URLs (not in original/ or thumbs/), return as-is
 *   since the original IS the legacy path
 */
export function getOriginalUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) return '';
  if (!isSupabaseStorageUrl(imageUrl)) return imageUrl;

  const storagePath = extractStoragePath(imageUrl);
  if (!storagePath) return imageUrl;

  // If it's a thumbnail, convert to original
  if (storagePath.startsWith('thumbs/')) {
    const fileName = extractFileName(storagePath);
    const baseUrl = imageUrl.substring(
      0,
      imageUrl.indexOf(SUPABASE_STORAGE_PATH) + SUPABASE_STORAGE_PATH.length
    );
    return `${baseUrl}original/${fileName}.webp`;
  }

  // If it's already in original/, return as-is
  if (storagePath.startsWith('original/')) return imageUrl;

  // Legacy URL — the original IS at this path
  return imageUrl;
}

/**
 * Get the default placeholder image URL.
 */
export function getPlaceholderUrl(): string {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIiBmb250LXNpemU9IjE0Ij7wn42SIFNO8J+NkDwvdGV4dD48L3N2Zz4=';
}

/**
 * A tiny 1x1 transparent WebP used as blur placeholder fallback.
 */
export const BLUR_PLACEHOLDER =
  'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
