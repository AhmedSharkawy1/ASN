import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const BUCKET_NAME = 'menu-images';

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
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded', stage }, { status: 400 });
    }

    stage = 'buffer-conversion';
    const arrayBuffer = await (file as Blob).arrayBuffer();
    
    // TEMPORARY DIAGNOSTIC: Bypass Sharp completely to see if Vercel still 502s
    stage = 'bypass-sharp';
    const originalBuffer = Buffer.from(arrayBuffer);
    const thumbBuffer = Buffer.from(arrayBuffer); // Dummy thumb (same as original)

    stage = 'storage-preparation';
    const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    const contentType = file.type || 'image/webp';
    const originalFileName = `original/${fileId}.webp`;
    const thumbFileName = `thumbs/${fileId}.webp`;

    const originalArrayBuffer = originalBuffer.buffer.slice(
      originalBuffer.byteOffset, 
      originalBuffer.byteOffset + originalBuffer.byteLength
    );
    const thumbArrayBuffer = thumbBuffer.buffer.slice(
      thumbBuffer.byteOffset, 
      thumbBuffer.byteOffset + thumbBuffer.byteLength
    );

    stage = 'storage-original';
    const { error: originalUploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(originalFileName, originalArrayBuffer, {
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
      .upload(thumbFileName, thumbArrayBuffer, {
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
      diagnostic: 'sharp-bypassed'
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

