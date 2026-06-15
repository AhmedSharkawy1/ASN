/**
 * Utility to extract full-resolution images from clipboard.
 * When copying an image from a website, the browser puts a small thumbnail
 * in the clipboard. This utility checks the HTML in the clipboard for the
 * original image URL, strips any resize query parameters (like width=172&height=172),
 * and fetches the full-size original image.
 */

/**
 * Strips common image resize/optimization query params from a URL to get the original full-size image.
 */
function getFullSizeUrl(url: string): string {
    try {
        const u = new URL(url);
        // Remove common resize parameters
        const resizeParams = [
            'width', 'height', 'w', 'h',
            'resize', 'size', 'fit',
            'quality', 'q',
            'format', 'f',
            'auto',
            'crop',
            'dpr',
            'blur',
            'sharpen',
        ];
        for (const param of resizeParams) {
            u.searchParams.delete(param);
        }
        return u.toString();
    } catch {
        return url;
    }
}

/**
 * Extracts image URL from HTML clipboard content.
 */
function extractImageUrlFromHtml(html: string): string | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    if (img && img.src) {
        return getFullSizeUrl(img.src);
    }
    return null;
}

/**
 * Fetches an image from a URL and returns it as a File object.
 * Uses a proxy approach via fetch to handle CORS.
 */
async function fetchImageAsFile(url: string): Promise<File | null> {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return null;
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) return null;
        const ext = blob.type.split('/')[1] || 'png';
        return new File([blob], `fetched-image.${ext}`, { type: blob.type });
    } catch {
        // CORS or network error - can't fetch the full-size image
        return null;
    }
}

/**
 * Tries to get the best quality image from clipboard.
 * 1. First checks for HTML content with an image URL → fetches full-size
 * 2. Falls back to the direct image blob in the clipboard
 */
export async function getBestImageFromClipboard(): Promise<File | null> {
    const clipboardItems = await navigator.clipboard.read();
    
    let fallbackImageFile: File | null = null;
    
    for (const clipboardItem of clipboardItems) {
        // Try to get HTML content first (contains the original URL)
        if (clipboardItem.types.includes('text/html')) {
            try {
                const htmlBlob = await clipboardItem.getType('text/html');
                const html = await htmlBlob.text();
                const fullUrl = extractImageUrlFromHtml(html);
                if (fullUrl) {
                    const fullImage = await fetchImageAsFile(fullUrl);
                    if (fullImage && fullImage.size > 0) {
                        return fullImage;
                    }
                }
            } catch {
                // Ignore HTML parsing errors, fall through to image blob
            }
        }
        
        // Get the direct image blob as fallback
        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        for (const imageType of imageTypes) {
            try {
                const blob = await clipboardItem.getType(imageType);
                fallbackImageFile = new File([blob], "pasted-image.png", { type: imageType });
            } catch {
                // Ignore
            }
        }
    }
    
    return fallbackImageFile;
}

/**
 * Same logic but for React ClipboardEvent (Ctrl+V paste)
 */
export async function getBestImageFromPasteEvent(e: React.ClipboardEvent): Promise<File | null> {
    const items = e.clipboardData.items;
    
    let htmlContent: string | null = null;
    let fallbackImageFile: File | null = null;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type === 'text/html') {
            htmlContent = await new Promise<string>((resolve) => {
                items[i].getAsString(resolve);
            });
        }
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                fallbackImageFile = file;
            }
        }
    }
    
    // Try to get full-size from HTML URL first
    if (htmlContent) {
        const fullUrl = extractImageUrlFromHtml(htmlContent);
        if (fullUrl) {
            const fullImage = await fetchImageAsFile(fullUrl);
            if (fullImage && fullImage.size > 0) {
                return fullImage;
            }
        }
    }
    
    return fallbackImageFile;
}
