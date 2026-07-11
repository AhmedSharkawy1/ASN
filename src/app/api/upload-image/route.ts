import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// We MUST use Node.js runtime to use sharp
export const runtime = 'nodejs';

const BUCKET_NAME = 'menu-images';
const MAX_DIMENSION = 1600;
const THUMB_DIMENSION = 400;

export async function POST(req: NextRequest) {
  let stage = 'initialization';
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      stage = 'env-validation';
      return NextResponse.json({ error: 'Missing Supabase environment variables', stage }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    stage = 'formdata';
    const formData = await req.formData();
    
    stage = 'file-validation';
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded', stage }, { status: 400 });
    }

    stage = 'buffer-conversion';
    const arrayBuffer = await (file as Blob).arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Ensure it's webp format
    stage = 'sharp-original';
    let originalBuffer = fileBuffer;
    let thumbBuffer = fileBuffer;

    try {
      // 1. Process Original: Max 1600px, WebP 80%
      originalBuffer = await sharp(fileBuffer)
        .rotate() // Auto-rotate based on EXIF
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      stage = 'sharp-thumbnail';
      // 2. Process Thumbnail: Max 400px, WebP 75%
      thumbBuffer = await sharp(fileBuffer)
        .rotate()
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 4 })
        .toBuffer();
    } catch (sharpError) {
      console.error('[SHARP_ERROR]', sharpError);
      // Fallback: If sharp fails for some reason, upload the raw file as both (avoids breaking uploads)
    }

    stage = 'storage-preparation';
    const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    const contentType = 'image/webp';
    const originalFileName = `original/${fileId}.webp`;
    const thumbFileName = `thumbs/${fileId}.webp`;

    // Convert Node Buffer to pure ArrayBuffer for strict Vercel fetch compatibility
    // Using `buffer.slice` guarantees a clean Web API ArrayBuffer detached from the Node Buffer pool.
    // This entirely avoids `new File()` which throws ReferenceError in Node 18 on Vercel.
    const originalArrayBuffer = originalBuffer.buffer.slice(
      originalBuffer.byteOffset, 
      originalBuffer.byteOffset + originalBuffer.byteLength
    );
    const thumbArrayBuffer = thumbBuffer.buffer.slice(
      thumbBuffer.byteOffset, 
      thumbBuffer.byteOffset + thumbBuffer.byteLength
    );

    stage = 'storage-original';
    // Upload Original
    const { error: originalUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(originalFileName, originalArrayBuffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (originalUploadError) {
      console.error('[STORAGE_ORIGINAL_ERROR]', {
        name: originalUploadError.name,
        message: originalUploadError.message,
      });
      return NextResponse.json({ 
          error: `Upload failed: ${originalUploadError.message}`,
          stage
      }, { status: 500 });
    }

    stage = 'storage-thumbnail';
    // Upload Thumbnail
    const { error: thumbUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(thumbFileName, thumbArrayBuffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (thumbUploadError) {
      console.error('[STORAGE_THUMBNAIL_ERROR]', {
        name: thumbUploadError.name,
        message: thumbUploadError.message,
      });
    }

    stage = 'public-url';
    // Get public URLs
    const { data: originalUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(originalFileName);

    const { data: thumbUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(thumbUploadError ? originalFileName : thumbFileName);

    stage = 'response';
    return NextResponse.json({
      success: true,
      originalUrl: originalUrlData.publicUrl,
      thumbUrl: thumbUrlData.publicUrl,
      originalSize: originalBuffer.byteLength,
      thumbSize: thumbBuffer.byteLength,
    });

  } catch (error: any) {
    console.error('[UPLOAD_IMAGE_ERROR]', {
      stage,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Image upload failed',
        stage,
        message: process.env.NODE_ENV !== 'production'
            ? error instanceof Error ? error.message : String(error)
            : `Upload processing failed at stage: ${stage}`
      },
      { status: 500 }
    );
  }
}

