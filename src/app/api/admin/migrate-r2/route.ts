import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { isR2Configured, R2_BUCKET_NAME } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 300; // Allow long execution on Vercel Pro/server

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = 'menu-images';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';

/**
 * Cloud-based zero-downtime migration endpoint.
 * Runs directly on Vercel cloud servers where Supabase and Cloudflare R2
 * have unrestricted 10Gbps connectivity.
 *
 * GET /api/admin/migrate-r2?limit=100&offset=0
 */
export async function GET(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: 'Cloudflare R2 is not configured in environment variables' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') || 100), 500);
  const folder = searchParams.get('folder') || '';

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    // 1. List files in folder
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .list(folder, { limit, sortBy: { column: 'name', order: 'asc' } });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No files found', folder, migrated: 0 });
    }

    let migrated = 0;
    let skipped = 0;
    let failed = 0;
    const details: any[] = [];

    for (const file of files) {
      if (!file.id || file.name === '.emptyFolderPlaceholder') continue;

      const fullPath = folder ? `${folder}/${file.name}` : file.name;

      // Check R2
      try {
        await r2Client.send(
          new HeadObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fullPath,
          })
        );
        skipped++;
        details.push({ file: fullPath, status: 'already_in_r2' });
        continue;
      } catch {
        // Not in R2 yet -> proceed to transfer
      }

      try {
        const { data: blob, error: downloadError } = await supabaseAdmin.storage
          .from(SUPABASE_BUCKET)
          .download(fullPath);

        if (downloadError) throw downloadError;

        const buffer = Buffer.from(await blob.arrayBuffer());

        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fullPath,
            Body: buffer,
            ContentType: file.metadata?.mimetype || 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          })
        );

        migrated++;
        details.push({ file: fullPath, status: 'migrated', size: buffer.length });
      } catch (uploadErr: any) {
        failed++;
        details.push({ file: fullPath, status: 'error', error: uploadErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      folder,
      totalInBatch: files.length,
      migrated,
      skipped,
      failed,
      details: details.slice(0, 50),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
