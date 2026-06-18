import sharp from 'sharp';

/**
 * Image optimization configuration
 */
export interface OptimizationConfig {
  /** Maximum width for the output image */
  maxWidth: number;
  /** WebP quality (1-100) */
  quality: number;
  /** Output format */
  format: 'webp';
}

/**
 * Result of an image optimization operation
 */
export interface OptimizedImageResult {
  /** The optimized image buffer */
  buffer: Buffer;
  /** Width of the optimized image */
  width: number;
  /** Height of the optimized image */
  height: number;
  /** Size in bytes */
  size: number;
  /** MIME type */
  contentType: string;
}

/** Default config for thumbnails (400px, 80% quality) */
const THUMB_CONFIG: OptimizationConfig = {
  maxWidth: 400,
  quality: 80,
  format: 'webp',
};

/** Default config for originals (preserved dimensions, 85% quality) */
const ORIGINAL_CONFIG: OptimizationConfig = {
  maxWidth: 1920,
  quality: 85,
  format: 'webp',
};

/**
 * Optimize an image buffer with the given configuration.
 * Converts to WebP and resizes if needed.
 */
async function optimizeImage(
  inputBuffer: Buffer,
  config: OptimizationConfig
): Promise<OptimizedImageResult> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  const currentWidth = metadata.width || 800;
  const currentHeight = metadata.height || 600;

  // Only resize if the image is wider than maxWidth
  const needsResize = currentWidth > config.maxWidth;
  const targetWidth = needsResize ? config.maxWidth : currentWidth;
  const targetHeight = needsResize
    ? Math.round((currentHeight * config.maxWidth) / currentWidth)
    : currentHeight;

  let pipeline = image;

  if (needsResize) {
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Auto-rotate based on EXIF, strip metadata for smaller size
  pipeline = pipeline.rotate().withMetadata({ orientation: undefined });

  const outputBuffer = await pipeline
    .webp({ quality: config.quality, effort: 4 })
    .toBuffer();

  return {
    buffer: outputBuffer,
    width: targetWidth,
    height: targetHeight,
    size: outputBuffer.byteLength,
    contentType: 'image/webp',
  };
}

/**
 * Generate a thumbnail from an image buffer.
 * Default: 400px width, WebP 80% quality.
 */
export async function generateThumbnail(
  inputBuffer: Buffer,
  maxWidth = THUMB_CONFIG.maxWidth,
  quality = THUMB_CONFIG.quality
): Promise<OptimizedImageResult> {
  return optimizeImage(inputBuffer, {
    maxWidth,
    quality,
    format: 'webp',
  });
}

/**
 * Generate an optimized original from an image buffer.
 * Preserves dimensions (up to 1920px), WebP 85% quality.
 */
export async function generateOriginal(
  inputBuffer: Buffer,
  maxWidth = ORIGINAL_CONFIG.maxWidth,
  quality = ORIGINAL_CONFIG.quality
): Promise<OptimizedImageResult> {
  return optimizeImage(inputBuffer, {
    maxWidth,
    quality,
    format: 'webp',
  });
}

/**
 * Generate a tiny blur placeholder (8px wide base64 WebP).
 * Used for progressive image loading with placeholder="blur".
 */
export async function generateBlurPlaceholder(
  inputBuffer: Buffer
): Promise<string> {
  const tinyBuffer = await sharp(inputBuffer)
    .resize(8, undefined, { fit: 'inside' })
    .webp({ quality: 20 })
    .toBuffer();

  return `data:image/webp;base64,${tinyBuffer.toString('base64')}`;
}
