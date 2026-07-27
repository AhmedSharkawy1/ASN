import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
// Encoding a large photo can outlast the default limit on a cold start.
export const maxDuration = 30;

const BUCKET_NAME = 'menu-images';

/** Longest edge kept for the full-size copy. */
const ORIGINAL_MAX_DIM = 1600;
/**
 * Thumbnails are bounded by WIDTH, not by longest edge, because that is the
 * convention every existing good thumbnail follows (400x533, 400x500, ...) and
 * what the themes ask for via sizes="...400px". Capping the longest edge
 * instead would shrink portrait photos to 300px wide and soften them.
 * The height bound is only a backstop against pathologically tall images.
 */
const THUMB_MAX_WIDTH = 400;
const THUMB_MAX_HEIGHT = 1200;
/** Refuse absurd inputs before handing them to the encoder, not after. */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

type Rendered = { original: Buffer; thumb: Buffer; contentType: string; mode: string };

/**
 * Resize into a full-size copy and a 400px thumbnail.
 *
 * Every failure path here returns the untouched upload for both instead of
 * throwing. Sharp was previously commented out wholesale ("TEMPORARY
 * DIAGNOSTIC: Bypass Sharp completely to see if Vercel still 502s") and never
 * put back, which left thumbs/ as byte-identical copies of original/ and made
 * the whole thumbnail_url scheme save nothing. Degrading to that old
 * behaviour is acceptable; failing the upload is not.
 *
 * The import is dynamic on purpose: a broken or missing native binary then
 * surfaces as a caught rejection rather than taking the route down at load.
 */
async function renderVariants(input: Buffer, fallbackType: string): Promise<Rendered> {
  const unprocessed: Rendered = {
    original: input,
    thumb: input,
    contentType: fallbackType,
    mode: 'passthrough',
  };

  try {
    const sharp = (await import('sharp')).default;
    const opts = { limitInputPixels: 100_000_000, sequentialRead: true } as const;

    const meta = await sharp(input, opts).metadata();
    // Re-encoding an image that is already webp and already within bounds only
    // makes it bigger (measured: 61.5KB -> 71.0KB on a real menu photo), so
    // leave those alone. EXIF orientation still forces a rewrite.
    const originalIsOptimal =
      meta.format === 'webp' &&
      !meta.orientation &&
      (meta.width ?? 0) <= ORIGINAL_MAX_DIM &&
      (meta.height ?? 0) <= ORIGINAL_MAX_DIM;

    // Separate instances rather than clone(): clone() is for stream fan-out.
    // .rotate() applies EXIF orientation, which is otherwise lost on re-encode.
    const [original, thumb] = await Promise.all([
      originalIsOptimal
        ? Promise.resolve(input)
        : sharp(input, opts)
            .rotate()
            .resize(ORIGINAL_MAX_DIM, ORIGINAL_MAX_DIM, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer(),
      sharp(input, opts)
        .rotate()
        .resize(THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer(),
    ]);

    return { original, thumb, contentType: 'image/webp', mode: 'sharp' };
  } catch (err) {
    console.error('[UPLOAD_IMAGE] sharp failed, storing the upload unprocessed:', err);
    return unprocessed;
  }
}

export async function POST(req: NextRequest) {
  let stage = 'route-entered';
  console.log('[UPLOAD_IMAGE_ROUTE_ENTERED]');

  try {
    stage = 'env-validation';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables', stage }, { status: 500 });
    }

    stage = 'supabase-client-init';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    stage = 'formdata';
    const formData = await req.formData();
    
    stage = 'file-validation';
    // formData.get() is typed `string | File | null`; narrow once here so the
    // Blob/File members below are actually checked rather than cast at each use.
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded', stage }, { status: 400 });
    }

    stage = 'buffer-conversion';
    const arrayBuffer = await file.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Image too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)`, stage },
        { status: 413 }
      );
    }

    stage = 'resize';
    const rendered = await renderVariants(Buffer.from(arrayBuffer), file.type || 'image/webp');
    const originalBuffer = rendered.original;
    const thumbBuffer = rendered.thumb;

    stage = 'storage-preparation';
    const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    const contentType = rendered.contentType;
    const originalFileName = `original/${fileId}.webp`;
    const thumbFileName = `thumbs/${fileId}.webp`;

    // Buffer is a valid FileBody, so it goes up as-is — the previous
    // .buffer.slice() round-trip copied every byte for nothing.
    stage = 'storage-original';
    const { error: originalUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(originalFileName, originalBuffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (originalUploadError) {
      return NextResponse.json({ error: `Upload failed: ${originalUploadError.message}`, stage }, { status: 500 });
    }

    stage = 'storage-thumbnail';
    const { error: thumbUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(thumbFileName, thumbBuffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    stage = 'public-url';
    const { data: originalUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(originalFileName);
    const { data: thumbUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(thumbUploadError ? originalFileName : thumbFileName);

    stage = 'response';
    return NextResponse.json({
      success: true,
      originalUrl: originalUrlData.publicUrl,
      thumbUrl: thumbUrlData.publicUrl,
      originalSize: originalBuffer.byteLength,
      thumbSize: thumbBuffer.byteLength,
      // "passthrough" means sharp failed and this upload was stored unresized.
      // Worth watching: a run of these is how the bypass went unnoticed before.
      diagnostic: rendered.mode
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Image upload failed',
        stage,
        message: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}

