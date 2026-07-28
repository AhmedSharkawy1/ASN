export function getUsaColors(config: any, isDark: boolean) {
    let primaryColor = config.theme_colors?.primary || '#dc2626'; // Bold USA Crimson Red
    let bgBody = isDark ? '#0f172a' : '#f8fafc'; // Dark Slate / Clean Ice White
    let bgCard = isDark ? '#1e293b' : '#ffffff';
    let textMain = isDark ? '#f8fafc' : '#0f172a';
    let textMuted = isDark ? '#94a3b8' : '#64748b';
    let borderColor = isDark ? '#334155' : '#e2e8f0';

    const t = config.theme || '';
    if (t === 'usa-navy') {
        primaryColor = '#2563eb';
        bgBody = isDark ? '#0a0f1d' : '#f0f9ff';
        bgCard = isDark ? '#131c31' : '#ffffff';
    } else if (t === 'usa-emerald') {
        primaryColor = '#059669';
        bgBody = isDark ? '#062016' : '#f0fdf4';
        bgCard = isDark ? '#0c3525' : '#ffffff';
    } else if (t === 'usa-gold') {
        primaryColor = '#d97706';
        bgBody = isDark ? '#1c1305' : '#fffbeb';
        bgCard = isDark ? '#2e2009' : '#ffffff';
    } else if (t === 'usa-dark') {
        primaryColor = '#e11d48';
        bgBody = isDark ? '#020617' : '#0f172a';
        bgCard = isDark ? '#0f172a' : '#1e293b';
        textMain = '#f8fafc';
        textMuted = '#94a3b8';
        borderColor = '#334155';
    }

    return { primaryColor, bgBody, bgCard, textMain, textMuted, borderColor };
}
