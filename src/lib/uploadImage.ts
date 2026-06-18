import { supabase } from './supabase/client';

const BUCKET_NAME = 'menu-images';

/**
 * Upload an image to the server-side API which generates originals and thumbnails.
 * Returns the public URL of the original image.
 */
export async function uploadImage(file: File | Blob, folder: string): Promise<string | null> {
    try {
        const formData = new FormData();
        const fileName = file instanceof File ? file.name : 'image.webp';
        formData.append('file', file, fileName);
        formData.append('folder', folder);

        const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload API call failed:', errorText);
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
            // Legacy path: delete the legacy file and check if there's a thumbnail under thumbs/
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

