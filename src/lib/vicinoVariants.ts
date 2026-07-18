export function getVicinoColors(config: any, isDark: boolean) {
    let primaryColor = config.theme_colors?.primary || '#B8860B';
    let bgBody = isDark ? '#111111' : '#F4EEE4';
    let bgCard = isDark ? '#1c1c1e' : '#FAF7F1';
    let textMain = isDark ? '#ffffff' : '#000000';
    let textMuted = isDark ? '#9ca3af' : '#6b7280';
    let borderColor = isDark ? '#333333' : '#f3f4f6';

    const t = config.theme || '';
    if (t === 'vicino-red') {
        primaryColor = '#ef4444';
        bgBody = isDark ? '#1a0505' : '#fff1f2';
        bgCard = isDark ? '#2a0a0a' : '#ffffff';
    } else if (t === 'vicino-cyan') {
        primaryColor = '#06b6d4';
        bgBody = isDark ? '#081a20' : '#ecfeff';
        bgCard = isDark ? '#112a34' : '#ffffff';
    } else if (t === 'vicino-emerald') {
        primaryColor = '#10b981';
        bgBody = isDark ? '#051c14' : '#ecfdf5';
        bgCard = isDark ? '#0d2d22' : '#ffffff';
    } else if (t === 'vicino-purple') {
        primaryColor = '#8b5cf6';
        bgBody = isDark ? '#170b2e' : '#f5f3ff';
        bgCard = isDark ? '#261546' : '#ffffff';
    } else if (t === 'vicino-dark') {
        primaryColor = '#eab308';
        bgBody = isDark ? '#000000' : '#111111';
        bgCard = isDark ? '#111111' : '#1c1c1e';
        textMain = '#ffffff';
        textMuted = '#9ca3af';
        borderColor = '#333333';
    }

    return { primaryColor, bgBody, bgCard, textMain, textMuted, borderColor };
}
