import { supabase } from './supabase/client';

const BUCKET_NAME = 'menu-images';

/**
 * Upload an image to Supabase Storage and return the public URL.
 * @param file - The File object to upload
 * @param folder - The folder path within the bucket (e.g., 'categories', 'items', 'logos')
 * @returns The public URL of the uploaded image, or null if failed
 */
export async function uploadImage(file: File, folder: string): Promise<string | null> {
    try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
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
 * Delete an image from Supabase Storage by its public URL.
 */
export async function deleteImage(publicUrl: string): Promise<boolean> {
    try {
        // Extract the file path from the public URL
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
