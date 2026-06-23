import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // sharp requires Node.js runtime

const BUCKET_NAME = 'menu-images';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Generate unique ID without relying on crypto import
    const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    const originalFileName = `original/${fileId}.webp`;
    const thumbFileName = `thumbs/${fileId}.webp`;

    // Lazily import modules to catch initialization errors
    let generateOriginal, generateThumbnail, supabaseAdmin;
    try {
        const optimizer = await import('@/lib/imageOptimizer');
        generateOriginal = optimizer.generateOriginal;
        generateThumbnail = optimizer.generateThumbnail;
    } catch (err: any) {
        console.error('Failed to load imageOptimizer (sharp):', err);
        return NextResponse.json({ error: `Image optimizer failed to load: ${err.message}` }, { status: 500 });
    }

    try {
        const adminModule = await import('@/lib/supabase/admin');
        supabaseAdmin = adminModule.supabaseAdmin;
    } catch (err: any) {
        console.error('Failed to load supabaseAdmin:', err);
        return NextResponse.json({ error: `Supabase admin failed to load: ${err.message}` }, { status: 500 });
    }

    // 1. Generate optimized original image (max 1920px, WebP 85%)
    const originalResult = await generateOriginal(inputBuffer);

    // 2. Generate thumbnail image (400px width, WebP 80%)
    const thumbResult = await generateThumbnail(inputBuffer);

    // 3. Upload original to Supabase Storage
    const { error: originalUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(originalFileName, originalResult.buffer, {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
        upsert: true,
      });

    if (originalUploadError) {
      console.error('Error uploading original image:', originalUploadError);
      return NextResponse.json({ error: `Original upload failed: ${originalUploadError.message}` }, { status: 500 });
    }

    // 4. Upload thumbnail to Supabase Storage
    const { error: thumbUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(thumbFileName, thumbResult.buffer, {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
        upsert: true,
      });

    if (thumbUploadError) {
      console.error('Error uploading thumbnail image:', thumbUploadError);
      // Attempt to clean up original image if thumbnail upload fails
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([originalFileName]);
      return NextResponse.json({ error: `Thumbnail upload failed: ${thumbUploadError.message}` }, { status: 500 });
    }

    // 5. Get public URLs
    const { data: originalUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(originalFileName);

    const { data: thumbUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(thumbFileName);

    return NextResponse.json({
      success: true,
      originalUrl: originalUrlData.publicUrl,
      thumbUrl: thumbUrlData.publicUrl,
      originalSize: originalResult.size,
      thumbSize: thumbResult.size,
    });
  } catch (error: any) {
    console.error('Upload API Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
