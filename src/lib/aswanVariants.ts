export interface AswanThemeColors {
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

export function getAswanColors(config: any, isDark: boolean): AswanThemeColors {
    let tc = config?.theme_colors || {};
    if (typeof tc === 'string') {
        try {
            tc = JSON.parse(tc);
        } catch {
            tc = {};
        }
    }
    
    // Primary color: default to luxury dark beige (#B89B72)
    let primaryColor = tc.primary || config?.primary_color || '#B89B72';
    
    // Default theme background & card colors
    let bgBody = isDark ? '#0f172a' : '#faf7f2';
    let bgCard = isDark ? '#1e293b' : '#ffffff';
    let textMain = isDark ? '#f8fafc' : '#0f172a';
    let textMuted = isDark ? '#94a3b8' : '#64748b';
    let borderColor = isDark ? '#334155' : '#e7e2d8';

    const t = (config?.theme || '').toLowerCase();
    
    if (t === 'aswan-red') {
        primaryColor = tc.primary || '#ef4444';
        bgBody = isDark ? '#1a0505' : '#fff1f2';
        bgCard = isDark ? '#2a0a0a' : '#ffffff';
    } else if (t === 'aswan-cyan') {
        primaryColor = tc.primary || '#06b6d4';
        bgBody = isDark ? '#081a20' : '#ecfeff';
        bgCard = isDark ? '#112a34' : '#ffffff';
    } else if (t === 'aswan-emerald') {
        primaryColor = tc.primary || '#10b981';
        bgBody = isDark ? '#051c14' : '#ecfdf5';
        bgCard = isDark ? '#0d2d22' : '#ffffff';
    } else if (t === 'aswan-purple') {
        primaryColor = tc.primary || '#8b5cf6';
        bgBody = isDark ? '#170b2e' : '#f5f3ff';
        bgCard = isDark ? '#261546' : '#ffffff';
    } else if (t === 'aswan-dark') {
        primaryColor = tc.primary || '#f59e0b';
        bgBody = '#05070a';
        bgCard = '#0f172a';
        textMain = '#ffffff';
        textMuted = '#94a3b8';
        borderColor = '#1e293b';
    }

    // Extract light and dark background images from theme_colors and root config object
    const bgImageLight = tc.aswan_bg_light || tc.bg_image_light || tc.bg_light || tc.background_image_light || config?.aswan_bg_light || config?.bg_image_light || '';
    const bgImageDark = tc.aswan_bg_dark || tc.bg_image_dark || tc.bg_dark || tc.background_image_dark || config?.aswan_bg_dark || config?.bg_image_dark || '';

    // Determine active background image with fallback if only one mode image is provided
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
