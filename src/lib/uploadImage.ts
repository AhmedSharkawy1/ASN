import { supabase } from './supabase/client';

const BUCKET_NAME = 'menu-images';

/**
 * Resizes and compresses an image using Canvas
 */
async function compressImage(file: File | Blob, maxWidth = 1200, defaultQuality = 0.90): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // If image file size is less than 500KB (512000 bytes), use 100% quality
                const finalQuality = (file.size < 500 * 1024) ? 1.0 : defaultQuality;

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas to Blob failed'));
                    },
                    'image/webp',
                    finalQuality
                );
            };
        };
        reader.onerror = (err) => reject(err);
    });
}

/**
 * Upload an image to Supabase Storage and return the public URL.
 * Automatically compresses the image to save space.
 */
export async function uploadImage(file: File | Blob, folder: string): Promise<string | null> {
    try {
        let finalBlob: Blob = file;
        let ext = 'webp';
        let contentType = 'image/webp';

        // If image file size is less than 500KB (512000 bytes), skip compression to preserve 100% quality
        if (file.size < 500 * 1024) {
            finalBlob = file;
            contentType = file.type || 'image/jpeg';
            if (contentType === 'image/png') ext = 'png';
            else if (contentType === 'image/jpeg') ext = 'jpg';
            else if (contentType === 'image/gif') ext = 'gif';
            else ext = contentType.split('/')[1] || 'png';
        } else {
            finalBlob = await compressImage(file);
        }

        const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, finalBlob, {
                cacheControl: '31536000',
                upsert: false,
                contentType: contentType
            });

        if (error) {
            console.error('Upload error:', error);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    } catch (err) {
        console.error('Upload exception:', err);
        return null;
    }
}

/**
 * Upload a base64 string directly to Supabase Storage.
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
 */
export async function deleteImage(publicUrl: string): Promise<boolean> {
    try {
        const urlParts = publicUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
        if (urlParts.length < 2) return false;

        const filePath = urlParts[1];
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

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
