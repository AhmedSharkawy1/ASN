import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 Client & Storage Utilities
 *
 * Cloudflare R2 provides S3-compatible object storage with:
 * - 0$ Egress fees forever (completely free bandwidth)
 * - 10 GB free storage per month
 * - Global edge CDN built-in
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'asn-menu-images';
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

let s3ClientInstance: S3Client | null = null;

/**
 * Check if Cloudflare R2 credentials are configured in the environment.
 */
export function isR2Configured(): boolean {
  return Boolean(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  );
}

/**
 * Get the singleton S3 client for Cloudflare R2.
 */
export function getR2Client(): S3Client {
  if (!s3ClientInstance) {
    if (!isR2Configured()) {
      throw new Error('Cloudflare R2 is not fully configured in environment variables');
    }

    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }

  return s3ClientInstance;
}

/**
 * Construct public URL for an R2 object key.
 */
export function getR2PublicUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, '');
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${cleanKey}`;
  }
  return `/api/img/${cleanKey}`;
}

/**
 * Upload a Buffer to Cloudflare R2 with 1-year immutable caching.
 */
export async function uploadBufferToR2(
  key: string,
  body: Buffer,
  contentType: string = 'image/webp',
  cacheControl: string = 'public, max-age=31536000, immutable'
): Promise<{ success: boolean; publicUrl: string; key: string }> {
  const client = getR2Client();
  const cleanKey = key.replace(/^\/+/, '');

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: cleanKey,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );

  return {
    success: true,
    key: cleanKey,
    publicUrl: getR2PublicUrl(cleanKey),
  };
}

/**
 * Check whether an object exists in Cloudflare R2.
 */
export async function checkR2ObjectExists(key: string): Promise<boolean> {
  if (!isR2Configured()) return false;
  try {
    const client = getR2Client();
    const cleanKey = key.replace(/^\/+/, '');
    await client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: cleanKey,
      })
    );
    return true;
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    // Any other error (network/config)
    return false;
  }
}

/**
 * Fetch an object directly from Cloudflare R2.
 */
export async function getObjectFromR2(key: string): Promise<{
  body: Uint8Array;
  contentType: string;
  cacheControl: string;
} | null> {
  if (!isR2Configured()) return null;
  try {
    const client = getR2Client();
    const cleanKey = key.replace(/^\/+/, '');
    const response = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: cleanKey,
      })
    );

    if (!response.Body) return null;

    const byteArray = await response.Body.transformToByteArray();
    return {
      body: byteArray,
      contentType: response.ContentType || 'image/webp',
      cacheControl: response.CacheControl || 'public, max-age=31536000, immutable',
    };
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.error('[R2] Error reading object:', err);
    return null;
  }
}

/**
 * Delete an object from Cloudflare R2.
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  if (!isR2Configured()) return false;
  try {
    const client = getR2Client();
    const cleanKey = key.replace(/^\/+/, '');
    await client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: cleanKey,
      })
    );
    return true;
  } catch (err) {
    console.error('[R2] Failed to delete object:', key, err);
    return false;
  }
}
