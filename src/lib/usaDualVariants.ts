export interface UsaDualThemeColors {
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

export function getUsaDualColors(config: any, isDark: boolean): UsaDualThemeColors {
    let tc = config?.theme_colors || {};
    if (typeof tc === 'string') {
        try { tc = JSON.parse(tc); } catch { tc = {}; }
    }

    let primaryColor = tc.primary || config.primary_color || '#e11d48'; // Rose / Crimson
    let bgBody = isDark ? '#0f172a' : '#f8fafc'; 
    let bgCard = isDark ? '#1e293b' : '#ffffff';
    let textMain = isDark ? '#f8fafc' : '#0f172a';
    let textMuted = isDark ? '#94a3b8' : '#64748b';
    let borderColor = isDark ? '#334155' : '#e2e8f0';

    const t = config.theme || '';
    if (t === 'usa-dual-navy') {
        primaryColor = '#2563eb';
        bgBody = isDark ? '#0a0f1d' : '#f0f9ff';
        bgCard = isDark ? '#131c31' : '#ffffff';
    } else if (t === 'usa-dual-emerald') {
        primaryColor = '#059669';
        bgBody = isDark ? '#062016' : '#f0fdf4';
        bgCard = isDark ? '#0c3525' : '#ffffff';
    } else if (t === 'usa-dual-gold') {
        primaryColor = '#d97706';
        bgBody = isDark ? '#1c1305' : '#fffbeb';
        bgCard = isDark ? '#2e2009' : '#ffffff';
    } else if (t === 'usa-dual-dark') {
        primaryColor = '#f43f5e';
        bgBody = isDark ? '#020617' : '#0f172a';
        bgCard = isDark ? '#0f172a' : '#1e293b';
        textMain = '#f8fafc';
        textMuted = '#94a3b8';
        borderColor = '#334155';
    }

    // Extract light and dark background images
    const bgImageLight = tc.usa_dual_bg_light || tc.bg_image_light || config?.usa_dual_bg_light || '';
    const bgImageDark = tc.usa_dual_bg_dark || tc.bg_image_dark || config?.usa_dual_bg_dark || '';

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
