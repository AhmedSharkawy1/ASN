/**
 * Image Debug Utility
 * 
 * Controlled by NEXT_PUBLIC_IMAGE_DEBUG environment variable.
 * When enabled, logs image loading events in development.
 * Disabled in production by default.
 */

const IS_DEBUG = typeof window !== 'undefined' && 
  process.env.NEXT_PUBLIC_IMAGE_DEBUG === 'true';

// Track seen URLs to detect duplicates
const seenUrls = new Map<string, number>();

export interface ImageDebugInfo {
  itemId?: string;
  imageSource: string;
  thumbnailAvailable: boolean;
  finalSrc: string;
  fallbackTriggered: boolean;
  fallbackStage: number;
  component?: string;
}

/**
 * Log image debug information.
 * Only active when NEXT_PUBLIC_IMAGE_DEBUG=true.
 */
export function logImageDebug(info: ImageDebugInfo): void {
  if (!IS_DEBUG) return;

  const count = (seenUrls.get(info.finalSrc) || 0) + 1;
  seenUrls.set(info.finalSrc, count);

  console.log(
    `[IMAGE DEBUG]`,
    `\n  item_id: ${info.itemId || 'unknown'}`,
    `\n  image_source: ${info.imageSource}`,
    `\n  thumbnail_available: ${info.thumbnailAvailable}`,
    `\n  final_src: ${info.finalSrc}`,
    `\n  fallback_triggered: ${info.fallbackTriggered}`,
    `\n  fallback_stage: ${info.fallbackStage}`,
    `\n  component: ${info.component || 'OptimizedMenuImage'}`,
    count > 1 ? `\n  ⚠️ DUPLICATE #${count}` : ''
  );
}

/**
 * Log image mount event.
 */
export function logImageMount(src: string, component?: string): void {
  if (!IS_DEBUG) return;
  console.log(`[IMAGE MOUNT] ${component || 'OptimizedMenuImage'} src=${src}`);
}

/**
 * Log image src change.
 */
export function logImageSrcChange(oldSrc: string, newSrc: string): void {
  if (!IS_DEBUG) return;
  if (oldSrc !== newSrc) {
    console.log(`[IMAGE SRC CHANGE] ${oldSrc} → ${newSrc}`);
  }
}

/**
 * Log fallback event.
 */
export function logImageFallback(originalSrc: string, fallbackSrc: string, stage: number): void {
  if (!IS_DEBUG) return;
  console.warn(`[IMAGE FALLBACK] stage=${stage} ${originalSrc} → ${fallbackSrc}`);
}

/**
 * Reset debug tracking (useful for route changes).
 */
export function resetImageDebug(): void {
  seenUrls.clear();
}
