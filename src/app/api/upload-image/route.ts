import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// We MUST use Node.js runtime to use sharp
export const runtime = 'nodejs';

const BUCKET_NAME = 'menu-images';
const MAX_DIMENSION = 1600;
const THUMB_DIMENSION = 400;

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await (file as Blob).arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Ensure it's webp format
    const isWebp = file.type === 'image/webp';
    let originalBuffer = fileBuffer;
    let thumbBuffer = fileBuffer;

    try {
      // 1. Process Original: Max 1600px, WebP 80%
      originalBuffer = await sharp(fileBuffer)
        .rotate() // Auto-rotate based on EXIF
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      // 2. Process Thumbnail: Max 400px, WebP 75%
      thumbBuffer = await sharp(fileBuffer)
        .rotate()
        .resize({ width: THUMB_DIMENSION, height: THUMB_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 4 })
        .toBuffer();
    } catch (sharpError) {
      console.error('Sharp processing failed, falling back to original buffer', sharpError);
      // Fallback: If sharp fails for some reason, upload the raw file as both (avoids breaking uploads)
    }

    const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    const contentType = 'image/webp';
    const originalFileName = `original/${fileId}.webp`;
    const thumbFileName = `thumbs/${fileId}.webp`;

    // Convert Buffer to standard File/Blob for strict Vercel fetch compatibility
    const originalFileBody = new File([originalBuffer], originalFileName.split('/')[1], { type: contentType });
    const thumbFileBody = new File([thumbBuffer], thumbFileName.split('/')[1], { type: contentType });

    // Upload Original
    const { error: originalUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(originalFileName, originalFileBody, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (originalUploadError) {
      console.error('Error uploading original image:', originalUploadError);
      return NextResponse.json({ 
          error: `Upload failed: ${originalUploadError.message}`, 
          details: originalUploadError,
          stage: 'storage-original' 
      }, { status: 500 });
    }

    // Upload Thumbnail
    const { error: thumbUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(thumbFileName, thumbFileBody, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (thumbUploadError) {
      console.error('Error uploading thumbnail:', thumbUploadError);
    }

    // Get public URLs
    const { data: originalUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(originalFileName);

    const { data: thumbUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(thumbUploadError ? originalFileName : thumbFileName);

    return NextResponse.json({
      success: true,
      originalUrl: originalUrlData.publicUrl,
      thumbUrl: thumbUrlData.publicUrl,
      originalSize: originalBuffer.byteLength,
      thumbSize: thumbBuffer.byteLength,
    });

  } catch (error: any) {
    console.error('Upload API Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
