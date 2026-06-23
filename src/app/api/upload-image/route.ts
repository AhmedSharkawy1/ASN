import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Edge runtime to avoid sharp/native-module issues entirely
export const runtime = 'edge';

const BUCKET_NAME = 'menu-images';

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
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Generate unique ID
    const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);

    // Determine content type
    const contentType = file.type || 'image/jpeg';
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';

    const originalFileName = `original/${fileId}.${ext}`;
    const thumbFileName = `thumbs/${fileId}.${ext}`;

    // Upload original to Supabase Storage
    const { error: originalUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(originalFileName, fileBuffer, {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
        upsert: true,
      });

    if (originalUploadError) {
      console.error('Error uploading original image:', originalUploadError);
      return NextResponse.json({ error: `Upload failed: ${originalUploadError.message}` }, { status: 500 });
    }

    // Upload a copy as thumbnail (no server-side resizing, browser handles display size via CSS)
    const { error: thumbUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(thumbFileName, fileBuffer, {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
        upsert: true,
      });

    if (thumbUploadError) {
      console.error('Error uploading thumbnail:', thumbUploadError);
      // Non-fatal: original already uploaded, just return original URL for both
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
      originalSize: fileBuffer.byteLength,
      thumbSize: fileBuffer.byteLength,
    });

  } catch (error: any) {
    console.error('Upload API Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
