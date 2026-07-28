/**
 * Parses any video URL (YouTube, Facebook, Instagram, TikTok, Vimeo, or direct embed)
 * and returns the appropriate iframe embed URL for landing pages and previews.
 */
export const getEmbedUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const cleanUrl = url.trim();
    if (!cleanUrl) return null;

    // Direct embed iframe URL already provided
    if (cleanUrl.includes('/embed') || cleanUrl.includes('plugins/video.php')) {
        return cleanUrl;
    }

    // 1. YouTube (Watch, Shorts, standard, mobile, embed)
    const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch && ytMatch[1]) {
        return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&loop=1&playlist=${ytMatch[1]}`;
    }

    // 2. Facebook (watch, reels, video posts, fb.watch)
    if (cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) {
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=0&autoplay=0`;
    }

    // 3. Instagram (Reels, Posts, IGTV)
    if (cleanUrl.includes('instagram.com') || cleanUrl.includes('instagr.am')) {
        const igMatch = cleanUrl.match(/(?:instagram\.com|instagr\.am)\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
        if (igMatch && igMatch[1]) {
            return `https://www.instagram.com/p/${igMatch[1]}/embed`;
        }
        const trimmedIg = cleanUrl.split('?')[0].replace(/\/$/, '');
        return `${trimmedIg}/embed`;
    }

    // 4. TikTok (videos)
    const ttMatch = cleanUrl.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
    if (ttMatch && ttMatch[1]) {
        return `https://www.tiktok.com/embed/v2/${ttMatch[1]}`;
    }

    // 5. Vimeo
    const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
    if (vimeoMatch && vimeoMatch[1]) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&loop=1`;
    }

    return null;
};
