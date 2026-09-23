/**
 * Smart Menu Search Engine
 * Supports cross-entity searching (e.g., searching "سندوتش بطاطس" matches "بطاطس" in category "سندوتشات"),
 * tokenization, Arabic normalization, stemming, and fuzzy prefix/suffix matching.
 */

/**
 * Normalizes Arabic and English text for accurate phonetic and semantic matching.
 */
export function normalizeMenuSearchText(text: string): string {
    if (!text) return '';
    return text
        .toLowerCase()
        // Remove Arabic Tashkeel / Harakat
        .replace(/[\u064B-\u065F\u0670]/g, '')
        // Remove Tatweel
        .replace(/\u0640/g, '')
        // Normalize Alifs (أ, إ, آ, ٱ -> ا)
        .replace(/[أإآٱ]/g, 'ا')
        // Normalize Taa Marbuta (ة -> ه)
        .replace(/ة/g, 'ه')
        // Normalize Yaa (ى -> ي)
        .replace(/ى/g, 'ي')
        // Normalize Waw with Hamza (ؤ -> و)
        .replace(/ؤ/g, 'و')
        // Normalize Yaa with Hamza (ئ -> ي)
        .replace(/ئ/g, 'ي')
        // Replace punctuation with spaces
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, ' ')
        // Normalize common alternative Arabic spellings
        .replace(/ساندوتش/g, 'سندوتش')
        .replace(/بورجر/g, 'برجر')
        // Collapse multiple spaces into one
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Checks if a single query token matches within the searchable target text corpus.
 */
function tokenMatchesCorpus(corpus: string, token: string): boolean {
    if (!token) return true;
    if (corpus.includes(token)) return true;

    // 1. Strip definite article "ال" if present (e.g., "البطاطس" -> "بطاطس")
    if (token.startsWith('ال') && token.length > 3) {
        const withoutAl = token.slice(2);
        if (corpus.includes(withoutAl)) return true;
    }

    // 2. Strip plural suffix "ات" (e.g., "سندوتشات" -> "سندوتش")
    if (token.endsWith('ات') && token.length > 4) {
        const singular = token.slice(0, -2);
        if (corpus.includes(singular)) return true;
    }

    // 3. Strip trailing "ه" or "ة" (e.g., "متبله" -> "متبل")
    if (token.endsWith('ه') && token.length > 3) {
        const withoutTaa = token.slice(0, -1);
        if (corpus.includes(withoutTaa)) return true;
    }

    // 4. Strip trailing "ي" (e.g., "ايطالي" -> "ايطال")
    if (token.endsWith('ي') && token.length > 4) {
        const base = token.slice(0, -1);
        if (corpus.includes(base)) return true;
    }

    return false;
}

/**
 * Determines whether an item (and its category context) matches the user's search query.
 *
 * Example:
 * query: "سندوتش بطاطس"
 * categoryName: "سندوتشات"
 * itemName: "بطاطس فارم فريتس"
 * -> Token "سندوتش" matches category "سندوتشات".
 * -> Token "بطاطس" matches item "بطاطس فارم فريتس".
 * -> ALL tokens matched -> Returns true!
 */
export function itemMatchesSmartSearch(
    item: any,
    categoryName: string,
    searchQuery: string,
    isAr: boolean = true
): boolean {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return true;

    const normalizedQuery = normalizeMenuSearchText(rawQuery);
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    if (queryTokens.length === 0) return true;

    // Gather all searchable fields into one combined corpus
    const titleAr = item.title_ar || '';
    const titleEn = item.title_en || '';
    const descAr = item.description_ar || item.desc_ar || item.ingredients_ar || '';
    const descEn = item.description_en || item.desc_en || item.ingredients_en || '';
    const ingredients = item.ingredients || '';
    const tags = Array.isArray(item.tags) ? item.tags.join(' ') : '';
    const catName = categoryName || '';

    const combinedText = `${titleAr} ${titleEn} ${descAr} ${descEn} ${ingredients} ${tags} ${catName}`;
    const normalizedCorpus = normalizeMenuSearchText(combinedText);

    // Every token in the query must match something in the item corpus
    return queryTokens.every(token => tokenMatchesCorpus(normalizedCorpus, token));
}
