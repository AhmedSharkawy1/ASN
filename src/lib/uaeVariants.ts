export interface UaeThemeColors {
    primaryColor: string;
    bgBody: string;
    bgCard: string;
    textMain: string;
    textMuted: string;
    borderColor: string;
    bgImageLight?: string;
    bgImageDark?: string;
    activeBgImage?: string;
    hasBgImage: boolean;
}

export function getUaeColors(config: any, isDark: boolean): UaeThemeColors {
    let tc = config?.theme_colors || {};
    if (typeof tc === 'string') {
        try { tc = JSON.parse(tc); } catch { tc = {}; }
    }

    // Default UAE Color: Luxury Emirates Gold / Red
    let primaryColor = tc.primary || config.primary_color || '#d97706'; // Gold Accent
    let bgBody = isDark ? '#0f172a' : '#fcfbf7'; 
    let bgCard = isDark ? '#1e293b' : '#ffffff';
    let textMain = isDark ? '#f8fafc' : '#0f172a';
    let textMuted = isDark ? '#94a3b8' : '#64748b';
    let borderColor = isDark ? '#334155' : '#e5e0d8';

    const t = config.theme || '';
    if (t === 'uae-red') {
        primaryColor = '#dc2626';
        bgBody = isDark ? '#1a0505' : '#fff5f5';
        bgCard = isDark ? '#2a0a0a' : '#ffffff';
    } else if (t === 'uae-emerald') {
        primaryColor = '#059669';
        bgBody = isDark ? '#062016' : '#f0fdf4';
        bgCard = isDark ? '#0c3525' : '#ffffff';
    } else if (t === 'uae-navy') {
        primaryColor = '#2563eb';
        bgBody = isDark ? '#0a0f1d' : '#f0f9ff';
        bgCard = isDark ? '#131c31' : '#ffffff';
    } else if (t === 'uae-dark') {
        primaryColor = '#d97706';
        bgBody = isDark ? '#020617' : '#0f172a';
        bgCard = isDark ? '#0f172a' : '#1e293b';
        textMain = '#f8fafc';
        textMuted = '#94a3b8';
        borderColor = '#334155';
    }

    // Extract light and dark background images
    const bgImageLight = tc.uae_bg_light || tc.bg_image_light || config?.uae_bg_light || '';
    const bgImageDark = tc.uae_bg_dark || tc.bg_image_dark || config?.uae_bg_dark || '';

    // Determine active background image with fallback
    let activeBgImage = isDark ? (bgImageDark || bgImageLight) : (bgImageLight || bgImageDark);
    activeBgImage = (activeBgImage || '').trim();

    const hasBgImage = Boolean(activeBgImage && activeBgImage.length > 0);

    return {
        primaryColor,
        bgBody,
        bgCard,
        textMain,
        textMuted,
        borderColor,
        bgImageLight,
        bgImageDark,
        activeBgImage,
        hasBgImage
    };
}
