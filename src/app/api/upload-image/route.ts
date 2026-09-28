import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { isR2Configured, uploadBufferToR2 } from '@/lib/r2';

export const runtime = 'nodejs';
// Encoding a large photo can outlast the default limit on a cold start.
export const maxDuration = 30;

const BUCKET_NAME = 'menu-images';

/** Longest edge kept for the full-size copy. */
const ORIGINAL_MAX_DIM = 1600;
/** Longest edge kept for high quality HD uploads. */
const HQ_ORIGINAL_MAX_DIM = 3840;
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

type Rendered = {
  original: Buffer;
  thumb: Buffer;
  contentType: string;
  mode: string;
  /** Why sharp was skipped, when it was. Returned so a silent regression to
   *  unresized uploads can be diagnosed from the response rather than by
   *  digging through platform logs. */
  reason?: string;
};

/**
 * Resize into a full-size copy and a thumbnail.
 *
 * If isHighQuality is true:
 * - Keeps original resolution up to 3840px (4K) without downscaling and encodes with 95% quality.
 * - Standard mode preserves standard 1600px and 82% quality.
 */
async function renderVariants(input: Buffer, fallbackType: string, isHighQuality: boolean = false): Promise<Rendered> {
  const unprocessed: Rendered = {
    original: input,
    thumb: input,
    contentType: fallbackType,
    mode: 'passthrough',
  };

  try {
    // Interop-safe: under a bundler a CJS native module can arrive either as
    // the namespace itself or under .default.
    const mod = await import('sharp');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sharp = ((mod as any).default ?? mod) as typeof import('sharp').default;
    if (typeof sharp !== 'function') {
      throw new Error(`sharp did not resolve to a function (got ${typeof sharp})`);
    }
    const opts = { limitInputPixels: 100_000_000, sequentialRead: true } as const;

    const meta = await sharp(input, opts).metadata();
    const maxDim = isHighQuality ? HQ_ORIGINAL_MAX_DIM : ORIGINAL_MAX_DIM;
    const originalQuality = isHighQuality ? 95 : 82;
    const thumbWidth = isHighQuality ? 600 : THUMB_MAX_WIDTH;
    const thumbHeight = isHighQuality ? 1800 : THUMB_MAX_HEIGHT;
    const thumbQuality = isHighQuality ? 80 : 72;

    // Re-encoding an image that is already webp and already within bounds only
    // makes it bigger, so leave those alone unless high quality requires special re-encoding.
    const originalIsOptimal =
      meta.format === 'webp' &&
      !meta.orientation &&
      (meta.width ?? 0) <= maxDim &&
      (meta.height ?? 0) <= maxDim &&
      !isHighQuality;

    // Separate instances rather than clone(): clone() is for stream fan-out.
    // .rotate() applies EXIF orientation, which is otherwise lost on re-encode.
    const [original, thumb] = await Promise.all([
      originalIsOptimal
        ? Promise.resolve(input)
        : sharp(input, opts)
            .rotate()
            .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: originalQuality })
            .toBuffer(),
      sharp(input, opts)
        .rotate()
        .resize(thumbWidth, thumbHeight, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: thumbQuality })
        .toBuffer(),
    ]);

    return { original, thumb, contentType: 'image/webp', mode: isHighQuality ? 'sharp-hd' : 'sharp' };
  } catch (err) {
    console.error('[UPLOAD_IMAGE] sharp failed, storing the upload unprocessed:', err);
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return { ...unprocessed, reason: reason.split('\n')[0].slice(0, 300) };
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

    // Check if high quality mode is requested or enabled for the restaurant
    let isHighQuality = formData.get('highQuality') === 'true';
    const restaurantId = formData.get('restaurantId');
    const itemId = formData.get('itemId');
    const categoryId = formData.get('categoryId');
    let effectiveRestaurantId = restaurantId;

    if (!isHighQuality) {
      if (effectiveRestaurantId && typeof effectiveRestaurantId === 'string') {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveRestaurantId);
          const { data: rest } = isUuid
            ? await supabaseAdmin.from('restaurants').select('high_quality_images').eq('id', effectiveRestaurantId).maybeSingle()
            : await supabaseAdmin.from('restaurants').select('high_quality_images').eq('slug', effectiveRestaurantId).maybeSingle();
          if (rest?.high_quality_images) isHighQuality = true;
        } catch (e) {
          console.warn('[UPLOAD_IMAGE] Restaurant HQ check failed:', e);
        }
      } else if (itemId && typeof itemId === 'string') {
        try {
          const { data: itm } = await supabaseAdmin.from('items').select('category_id, categories(restaurant_id)').eq('id', itemId).maybeSingle();
          const rId = (itm as any)?.categories?.restaurant_id;
          if (rId) {
            effectiveRestaurantId = rId;
            const { data: rest } = await supabaseAdmin.from('restaurants').select('high_quality_images').eq('id', rId).maybeSingle();
            if (rest?.high_quality_images) isHighQuality = true;
          }
        } catch (e) {
          console.warn('[UPLOAD_IMAGE] Item HQ check failed:', e);
        }
      } else if (categoryId && typeof categoryId === 'string') {
        try {
          const { data: cat } = await supabaseAdmin.from('categories').select('restaurant_id').eq('id', categoryId).maybeSingle();
          if (cat?.restaurant_id) {
            effectiveRestaurantId = cat.restaurant_id;
            const { data: rest } = await supabaseAdmin.from('restaurants').select('high_quality_images').eq('id', cat.restaurant_id).maybeSingle();
            if (rest?.high_quality_images) isHighQuality = true;
          }
        } catch (e) {
          console.warn('[UPLOAD_IMAGE] Category HQ check failed:', e);
        }
      }
    }

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
    const rendered = await renderVariants(Buffer.from(arrayBuffer), file.type || 'image/webp', isHighQuality);
    const originalBuffer = rendered.original;
    const thumbBuffer = rendered.thumb;

    stage = 'storage-preparation';
    const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    const contentType = rendered.contentType;
    const originalFileName = `original/${fileId}.webp`;
    const thumbFileName = `thumbs/${fileId}.webp`;

    let originalUrl = '';
    let thumbUrl = '';

    if (isR2Configured()) {
      stage = 'storage-r2-upload';
      const [r2Original, r2Thumb] = await Promise.all([
        uploadBufferToR2(originalFileName, originalBuffer, contentType),
        uploadBufferToR2(thumbFileName, thumbBuffer, contentType),
      ]);
      originalUrl = r2Original.publicUrl;
      thumbUrl = r2Thumb.publicUrl;
    } else {
      // Fallback to Supabase Storage if R2 is not yet configured
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
      originalUrl = originalUrlData.publicUrl;
      thumbUrl = thumbUrlData.publicUrl;
    }

    // Direct database update for item images (bypasses client-side RLS hurdles)
    if (itemId && typeof itemId === 'string') {
      try {
        const { data: updatedItem, error: itemErr } = await supabaseAdmin
          .from('items')
          .update({
            image_url: originalUrl,
            thumbnail_url: isHighQuality ? originalUrl : thumbUrl,
          })
          .eq('id', itemId)
          .select('category_id')
          .maybeSingle();

        if (itemErr) {
          console.error('[UPLOAD_IMAGE] Direct item image update failed:', itemErr);
        } else if (!effectiveRestaurantId && updatedItem?.category_id) {
          const { data: cat } = await supabaseAdmin
            .from('categories')
            .select('restaurant_id')
            .eq('id', updatedItem.category_id)
            .maybeSingle();
          if (cat?.restaurant_id) effectiveRestaurantId = cat.restaurant_id;
        }
      } catch (err) {
        console.error('[UPLOAD_IMAGE] Direct item update exception:', err);
      }
    }

    // Direct database update for category images
    if (categoryId && typeof categoryId === 'string') {
      try {
        const { data: updatedCat, error: catErr } = await supabaseAdmin
          .from('categories')
          .update({
            image_url: originalUrl,
            thumbnail_url: isHighQuality ? originalUrl : thumbUrl,
          })
          .eq('id', categoryId)
          .select('restaurant_id')
          .maybeSingle();

        if (catErr) {
          console.error('[UPLOAD_IMAGE] Direct category image update failed:', catErr);
        } else if (!effectiveRestaurantId && updatedCat?.restaurant_id) {
          effectiveRestaurantId = updatedCat.restaurant_id;
        }
      } catch (err) {
        console.error('[UPLOAD_IMAGE] Direct category update exception:', err);
      }
    }

    // Revalidate the public menu cache if an effective restaurantId is available
    if (effectiveRestaurantId && typeof effectiveRestaurantId === 'string') {
      stage = 'revalidation';
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveRestaurantId);
        const query = supabaseAdmin.from('restaurants').select('id, slug');
        const { data: rest } = isUuid
          ? await query.eq('id', effectiveRestaurantId).maybeSingle()
          : await query.eq('slug', effectiveRestaurantId).maybeSingle();

        const actualId = rest?.id || (isUuid ? effectiveRestaurantId : null);
        const slug = rest?.slug || (!isUuid ? effectiveRestaurantId : null);

        if (actualId) {
          revalidateTag(`menu-${actualId}`);
          revalidatePath(`/menu/${actualId}`);
          revalidatePath(`/menu/${actualId}`, 'page');
        }
        if (slug) {
          revalidateTag(`menu-${slug}`);
          revalidatePath(`/menu/${slug}`);
          revalidatePath(`/menu/${slug}`, 'page');
        }
      } catch (revalErr) {
        console.warn('[UPLOAD_IMAGE] Revalidation failed:', revalErr);
      }
    }

    stage = 'response';
    return NextResponse.json({
      success: true,
      originalUrl,
      thumbUrl,
      originalSize: originalBuffer.byteLength,
      thumbSize: thumbBuffer.byteLength,
      storageEngine: isR2Configured() ? 'cloudflare-r2' : 'supabase',
      diagnostic: rendered.mode,
      ...(rendered.reason ? { sharpError: rendered.reason } : {})
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

