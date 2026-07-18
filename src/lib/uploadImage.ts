import { supabase } from './supabase/client';

const BUCKET_NAME = 'menu-images';

/**
 * Convert any image File/Blob to WebP using the browser's Canvas API.
 * Max width: 1600px. Quality: 85% (Ensures high quality while maintaining reasonable file size).
 * Falls back to original if conversion fails or runs outside browser.
 */
async function convertToWebP(file: File | Blob, maxWidth = 800, quality = 0.65): Promise<Blob> {
    return new Promise((resolve) => {
        // If not in browser, return as-is
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            resolve(file);
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Resize if wider than maxWidth
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        resolve(file); // fallback
                    }
                },
                'image/webp',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file); // fallback to original
        };

        img.src = url;
    });
}

/**
 * Upload an image to the server-side API.
 * Converts to WebP client-side before uploading.
 * Returns the public URL of the original image.
 */
export async function uploadImage(file: File | Blob, folder: string): Promise<string | null> {
    try {
        // Convert to WebP on client side first
        let uploadBlob: Blob = file;
        try {
            uploadBlob = await convertToWebP(file);
        } catch (convErr) {
            console.warn('WebP conversion failed, uploading original:', convErr);
        }

        const formData = new FormData();
        formData.append('file', uploadBlob, 'image.webp');
        formData.append('folder', folder);

        const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload API call failed:', errorText);

            let errorMessage = errorText;
            try {
                const parsed = JSON.parse(errorText);
                if (parsed.error) errorMessage = parsed.error;
            } catch (e) {
                // Ignore parse error
            }
            alert(`فشل رفع الصورة: ${errorMessage}`);
            return null;
        }

        const data = await response.json();
        if (data.success && data.originalUrl) {
            return data.originalUrl;
        }

        return null;
    } catch (err) {
        console.error('Upload exception:', err);
        return null;
    }
}

/**
 * Upload a base64 string directly by converting it to a blob and calling uploadImage.
 */
export async function uploadBase64(base64: string, folder: string): Promise<string | null> {
    try {
        const res = await fetch(base64);
        const blob = await res.blob();
        return uploadImage(blob, folder);
    } catch (err) {
        console.error('Base64 upload error:', err);
        return null;
    }
}

/**
 * Delete an image from Supabase Storage by its public URL.
 * Deletes both the original and the thumbnail version.
 */
export async function deleteImage(publicUrl: string): Promise<boolean> {
    try {
        const urlParts = publicUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
        if (urlParts.length < 2) return false;

        const filePath = urlParts[1]; // e.g. "original/uuid.webp" or "items/uuid.webp"
        const fileName = filePath.split('/').pop() || '';
        const rawName = fileName.replace(/\.[^/.]+$/, ''); // just the uuid/filename without extension

        const filesToRemove: string[] = [filePath];

        // Also add the corresponding thumb or original path
        if (filePath.startsWith('original/')) {
            filesToRemove.push(`thumbs/${rawName}.webp`);
        } else if (filePath.startsWith('thumbs/')) {
            filesToRemove.push(`original/${rawName}.webp`);
        } else {
            // Legacy path
            filesToRemove.push(`thumbs/${rawName}.webp`);
        }

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(filesToRemove);

        if (error) {
            console.error('Delete error:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Delete exception:', err);
        return false;
    }
}

/**
 * Uploads an image using the new NodeJS Sharp API route which guarantees
 * a true WebP optimized original and a 400px thumbnail.
 * @returns { originalUrl: string, thumbUrl: string } or null on failure.
 */
export async function uploadImageWithThumb(file: File | Blob, customPath: string): Promise<{ originalUrl: string; thumbUrl: string } | null> {
    try {
        let uploadBlob: Blob = file;
        try {
            // Compress client-side first to avoid Next.js / Vercel 4.5MB payload limit
            // Use 1600px and 0.75 quality to balance high quality and smaller storage size since backend Sharp is bypassed
            uploadBlob = await convertToWebP(file, 800, 0.65);
        } catch (convErr) {
            console.warn('WebP pre-compression failed, uploading original:', convErr);
        }

        const formData = new FormData();
        // The API route expects "file"
        formData.append('file', uploadBlob, 'image.webp');
        formData.append('path', customPath);

        const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const rawBody = await response.text();
            let parsedBody: any = null;

            try {
                parsedBody = rawBody ? JSON.parse(rawBody) : null;
            } catch {
                parsedBody = null;
            }

            console.error('[UPLOAD CLIENT FAILURE]', {
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('content-type'),
                vercelId: response.headers.get('x-vercel-id'),
                rawBody: rawBody.slice(0, 1000),
                parsedBody
            });

            const stage = parsedBody?.stage || 'unknown';
            const msg = parsedBody?.message || parsedBody?.error || 'Unknown error';
            const contentType = response.headers.get('content-type') || 'unknown';

            alert(`Upload failed\nHTTP Status: ${response.status}\nContent-Type: ${contentType}\nStage: ${stage}\nMessage: ${msg}\nRaw Response: ${rawBody.slice(0, 1000)}`);
            
            return null;
        }

        const data = await response.json();
        return {
            originalUrl: data.originalUrl,
            thumbUrl: data.thumbUrl
        };
    } catch (error: any) {
        console.error('[UPLOAD CLIENT EXCEPTION]', error);
        alert(`Upload exception: ${error?.message}`);
        return null;
    }
}
