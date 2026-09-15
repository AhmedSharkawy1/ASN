/**
 * Arabic Culinary & Linguistic Matching Engine
 * Specially tuned for Arabic restaurant menus, Egyptian dialect variations,
 * typos, food synonyms, and semantic ingredient conflict prevention.
 */

import { normalizeArabic } from './fuzzyMatch';

// Re-export normalizeArabic for consistency
export { normalizeArabic };

/**
 * Common culinary synonyms and spelling variations in Arabic menus.
 * Grouped into canonical identifiers.
 */
const CULINARY_CANONICAL_MAP: Record<string, string> = {
    // Mozzarella variants
    'موزاريلا': 'موتزاريلا',
    'موتزاريلا': 'موتزاريلا',
    'موتزاريللا': 'موتزاريلا',
    'موتزريلا': 'موتزاريلا',
    'موزريلا': 'موتزاريلا',
    'موتزرلا': 'موتزاريلا',
    'موتزرله': 'موتزاريلا',
    'موزاريللا': 'موتزاريلا',

    // Meat / Lhom variants
    'لحوم': 'لحمة',
    'لحمه': 'لحمة',
    'لحم': 'لحمة',
    'لحمة': 'لحمة',
    'ميت': 'لحمة',
    'مفروم': 'لحمة',

    // Chicken / Poultry
    'فراخ': 'دجاج',
    'دجاج': 'دجاج',
    'تشيكن': 'دجاج',
    'شيكن': 'دجاج',
    'بانيه': 'دجاج',
    'شيش': 'دجاج',

    // Sausage variants
    'سجق': 'سجق',
    'سدق': 'سجق',

    // Hotdog / Frankfurter / Sosis
    'سوسيس': 'سوسيس',
    'سوسيز': 'سوسيس',
    'هوتدوج': 'سوسيس',
    'هوت دوج': 'سوسيس',
    'فرانكفورت': 'سوسيس',

    // Pastrami
    'بسطرمة': 'بسطرمة',
    'بسطرمه': 'بسطرمة',
    'باسترما': 'بسطرمة',

    // Cheeses
    'شيدر': 'شيدر',
    'تشيدر': 'شيدر',
    'شيدار': 'شيدر',
    'رومي': 'رومي',
    'رومى': 'رومي',
    'تركي': 'رومي',
    'كيري': 'كيري',
    'كيرى': 'كيري',
    'جبن': 'جبنة',
    'جبنه': 'جبنة',
    'جبنة': 'جبنة',
    'اجبان': 'جبنة',
    'فورماجي': 'مشكل جبن',
    'فورماجيكو': 'مشكل جبن',

    // Sauces
    'باربيكيو': 'باربيكيو',
    'باربكيو': 'باربيكيو',
    'باربيكيوو': 'باربيكيو',
    'bbq': 'باربيكيو',
    'رانش': 'رانش',
    'رانشى': 'رانش',
    'مايونيز': 'مايونيز',
    'مايونيزه': 'مايونيز',
    'كاتشب': 'كاتشب',
    'كاتشاب': 'كاتشب',
    'تومية': 'تومية',
    'توميه': 'تومية',
    'ثومية': 'تومية',
    'ثوميه': 'تومية',
    'بافلو': 'بافلو',
    'بافالو': 'بافلو',
    'طحينة': 'طحينة',
    'طحينه': 'طحينة',
    'سيراتشا': 'سيراتشا',
    'خردل': 'مستردة',
    'مسترده': 'مستردة',
    'مستردة': 'مستردة',

    // Seafood
    'جمبري': 'جمبري',
    'جمبرى': 'جمبري',
    'شريمب': 'جمبري',
    'تونة': 'تونة',
    'تونه': 'تونة',
    'تونا': 'تونة',
    'سي فود': 'سي فود',
    'سيفود': 'سي فود',
    'كابوريا': 'كابوريا',
    'كاليماري': 'كاليماري',
    'سبيط': 'كاليماري',

    // Strips / Crispy
    'استربس': 'استربس',
    'ستربس': 'استربس',
    'استريبس': 'استربس',
    'كرانشي': 'كرانشي',
    'كرنشى': 'كرانشي',
    'كرسبي': 'كرانشي',
    'كريسبي': 'كرانشي',
    'مقرمش': 'كرانشي',
    'زنجر': 'زنجر',
    'زنكر': 'زنجر',

    // Veggies
    'مشروم': 'مشروم',
    'فطر': 'مشروم',
    'فونجي': 'مشروم',
    'زيتون': 'زيتون',
    'هالبينو': 'هالبينو',
    'هلابينو': 'هالبينو',
    'بطاطس': 'بطاطس',
    'بطاطا': 'بطاطس',
    'فرايز': 'بطاطس',

    // Other meats
    'كفتة': 'كفتة',
    'كفته': 'كفتة',
    'برجر': 'برجر',
    'بورجر': 'برجر',
    'برغر': 'برجر',
    'بيبروني': 'بيبروني',
    'ببروني': 'بيبروني',
    'سلامي': 'سلامي',
    'سلامى': 'سلامي'
};

/**
 * Culinary Ingredient Domains used to detect and prevent absurd cross-domain matches.
 * E.g., Cheese (موزاريلا) must NEVER match Meat (سجق / بسطرمة).
 */
export const INGREDIENT_DOMAINS: Record<string, string[]> = {
    CHEESE: [
        'موتزاريلا', 'موزاريلا', 'شيدر', 'رومي', 'كيري', 'جبنة', 'فورماجي', 'اجبان', 'بريزيدون'
    ],
    MEAT: [
        'لحمة', 'لحوم', 'سجق', 'بسطرمة', 'سوسيس', 'سلامي', 'بيف', 'برجر', 'كفتة', 'بيبروني', 'روست'
    ],
    POULTRY: [
        'دجاج', 'فراخ', 'بانيه', 'استربس', 'زنجر', 'شيش', 'كوردن بلو'
    ],
    SEAFOOD: [
        'جمبري', 'تونة', 'سي فود', 'كاليماري', 'سبيط', 'كابوريا', 'اسماك'
    ],
    SAUCE: [
        'باربيكيو', 'رانش', 'مايونيز', 'كاتشب', 'تومية', 'طحينة', 'بافلو', 'سيراتشا'
    ],
    VEGGIE: [
        'مشروم', 'زيتون', 'هالبينو', 'بصل', 'طماطم', 'فلفل', 'خضار'
    ]
};

/**
 * Words that are filler/noise in item names (e.g. "إضافة", "طلب", "حجم").
 */
const FILLER_WORDS = new Set([
    'اضافة', 'اضافات', 'طلب', 'علبة', 'ساندوتش', 'سندوتش', 'ساندوتشات',
    'وجبة', 'طبق', 'قطعة', 'قطع', 'حجم', 'صغير', 'وسط', 'كبير', 'عائلي',
    'اكسترا', 'دبل', 'تربل', 'ميكس', 'مشكل', 'مشكله', 'سوبر'
]);

/**
 * Levenshtein distance between two strings.
 */
export function levenshteinDistance(s1: string, s2: string): number {
    if (s1 === s2) return 0;
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    const row: number[] = [];
    for (let i = 0; i <= s2.length; i++) row[i] = i;

    for (let i = 1; i <= s1.length; i++) {
        let prev = i;
        for (let j = 1; j <= s2.length; j++) {
            let val: number;
            if (s1[i - 1] === s2[j - 1]) {
                val = row[j - 1];
            } else {
                val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
            }
            row[j - 1] = prev;
            prev = val;
        }
        row[s2.length] = prev;
    }
    return row[s2.length];
}

/**
 * Levenshtein-based similarity between two single words (0..1).
 */
export function wordLevenshteinSimilarity(w1: string, w2: string): number {
    if (w1 === w2) return 1.0;
    const maxLen = Math.max(w1.length, w2.length);
    if (maxLen === 0) return 1.0;
    const dist = levenshteinDistance(w1, w2);
    return Math.max(0, 1 - dist / maxLen);
}

/**
 * Bigram / Dice coefficient similarity between two words (0..1).
 */
export function diceBigramSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0.0;

    const bigrams1 = new Map<string, number>();
    for (let i = 0; i < s1.length - 1; i++) {
        const bg = s1.slice(i, i + 2);
        bigrams1.set(bg, (bigrams1.get(bg) || 0) + 1);
    }

    let intersection = 0;
    for (let i = 0; i < s2.length - 1; i++) {
        const bg = s2.slice(i, i + 2);
        const count = bigrams1.get(bg) || 0;
        if (count > 0) {
            bigrams1.set(bg, count - 1);
            intersection++;
        }
    }

    const total = (s1.length - 1) + (s2.length - 1);
    return (2.0 * intersection) / total;
}

/**
 * Get canonical term for an Arabic food word if known, or return normalized word.
 */
export function getCanonicalFoodTerm(word: string): string {
    const norm = normalizeArabic(word);
    return CULINARY_CANONICAL_MAP[norm] || norm;
}

/**
 * Identify the primary ingredient domains of a phrase.
 */
export function getPhraseIngredientDomains(phrase: string): Set<string> {
    const norm = normalizeArabic(phrase);
    const tokens = norm.split(/\s+/).map(getCanonicalFoodTerm);
    const domains = new Set<string>();

    for (const [domain, keywords] of Object.entries(INGREDIENT_DOMAINS)) {
        for (const token of tokens) {
            if (keywords.includes(token) || keywords.some(k => token.includes(k) || k.includes(token))) {
                domains.add(domain);
            }
        }
    }

    return domains;
}

/**
 * Checks whether two food phrases have mutually conflicting core domains.
 * E.g. If one is purely CHEESE ("موزاريلا") and the other is purely MEAT ("سجق" / "بسطرمة"),
 * they must NEVER be proposed to match each other!
 */
export function areFoodItemsSemanticallyConflicting(phraseA: string, phraseB: string): boolean {
    const domainsA = getPhraseIngredientDomains(phraseA);
    const domainsB = getPhraseIngredientDomains(phraseB);

    // If either has no specific domain recognized, we don't block
    if (domainsA.size === 0 || domainsB.size === 0) return false;

    // Check if they share at least one domain (e.g. both are MEAT or both are CHEESE)
    const listA = Array.from(domainsA);
    for (let i = 0; i < listA.length; i++) {
        if (domainsB.has(listA[i])) return false; // Common domain, not conflicting
    }

    // Strict conflict pairs:
    // CHEESE vs MEAT
    if (domainsA.has('CHEESE') && (domainsB.has('MEAT') || domainsB.has('POULTRY') || domainsB.has('SEAFOOD'))) return true;
    if (domainsB.has('CHEESE') && (domainsA.has('MEAT') || domainsA.has('POULTRY') || domainsA.has('SEAFOOD'))) return true;

    // MEAT vs SEAFOOD
    if (domainsA.has('MEAT') && domainsB.has('SEAFOOD')) return true;
    if (domainsB.has('MEAT') && domainsA.has('SEAFOOD')) return true;

    // POULTRY vs SEAFOOD
    if (domainsA.has('POULTRY') && domainsB.has('SEAFOOD')) return true;
    if (domainsB.has('POULTRY') && domainsA.has('SEAFOOD')) return true;

    return false;
}

/**
 * Calculate similarity between two single words with phonetic, Levenshtein,
 * Dice, and synonym knowledge.
 */
export function calculateLinguisticWordSimilarity(w1: string, w2: string): number {
    const n1 = normalizeArabic(w1);
    const n2 = normalizeArabic(w2);

    if (n1 === n2) return 1.0;
    if (!n1 || !n2) return 0.0;

    // Canonical synonym check
    const c1 = getCanonicalFoodTerm(n1);
    const c2 = getCanonicalFoodTerm(n2);
    if (c1 === c2) return 0.98;

    // Substring containment (e.g. "موتزاريلا" in "موتزريلا" or "استربس" in "ستربس")
    if (n1.includes(n2) || n2.includes(n1)) {
        const shorter = n1.length < n2.length ? n1 : n2;
        const longer  = n1.length < n2.length ? n2 : n1;
        const ratio = shorter.length / longer.length;
        if (ratio >= 0.70) return Math.max(0.88, ratio);
    }

    // Levenshtein edit distance
    const lev = wordLevenshteinSimilarity(n1, n2);
    const dice = diceBigramSimilarity(n1, n2);

    // If edit distance is 1 (typo / variant)
    const dist = levenshteinDistance(n1, n2);
    if (dist === 1 && Math.min(n1.length, n2.length) >= 4) {
        return 0.90;
    }

    const combined = Math.max(lev, dice);
    return combined;
}

/**
 * Clean a phrase for item matching:
 * - Strips category words if repeated in item name
 * - Strips generic filler noise words like "إضافة", "طلب", "حجم"
 */
export function cleanFoodPhrase(phrase: string, categoryName?: string): string[] {
    const norm = normalizeArabic(phrase);
    const catWords = categoryName ? new Set(normalizeArabic(categoryName).split(/\s+/)) : new Set<string>();

    const tokens = norm.split(/\s+/).filter(w => {
        if (!w || w.length < 2) return false;
        if (catWords.has(w)) return false;
        if (FILLER_WORDS.has(w)) return false;
        return true;
    });

    // If everything was stripped, fall back to normalized tokens
    if (tokens.length === 0) {
        return norm.split(/\s+/).filter(w => w.length > 0);
    }

    return tokens;
}

/**
 * Calculate linguistic similarity between two menu item names.
 * Features:
 * 1. Semantic negative constraint (cheese != sausage).
 * 2. Strip noise & category contamination.
 * 3. Word-by-word bipartite matching with fuzzy/synonym awareness.
 * 4. Token order & coverage weights.
 */
export function calculateSmartItemSimilarity(
    fileItemName: string,
    candidateItemName: string,
    categoryName?: string
): number {
    // 1. Guard against semantic cross-domain clashes (e.g. موزاريلا vs سجق)
    if (areFoodItemsSemanticallyConflicting(fileItemName, candidateItemName)) {
        return 0.0;
    }

    const normA = normalizeArabic(fileItemName);
    const normB = normalizeArabic(candidateItemName);

    // Exact normalized match
    if (normA === normB) return 1.0;

    // 2. Clean tokens (stripping category repetition and filler words)
    const tokensA = cleanFoodPhrase(fileItemName, categoryName);
    const tokensB = cleanFoodPhrase(candidateItemName, categoryName);

    if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

    // Full phrase canonical check
    const canonA = tokensA.map(getCanonicalFoodTerm).sort().join(' ');
    const canonB = tokensB.map(getCanonicalFoodTerm).sort().join(' ');
    if (canonA === canonB) return 0.96;

    // 3. Greedy bipartite word matching
    const usedB = new Set<number>();
    let totalScoreA = 0;

    for (let i = 0; i < tokensA.length; i++) {
        const tA = tokensA[i];
        let bestWordScore = 0;
        let bestIdxB = -1;

        for (let j = 0; j < tokensB.length; j++) {
            if (usedB.has(j)) continue;
            const tB = tokensB[j];
            const sim = calculateLinguisticWordSimilarity(tA, tB);
            if (sim > bestWordScore) {
                bestWordScore = sim;
                bestIdxB = j;
            }
        }

        // Only count if similarity is meaningful (>= 0.60)
        if (bestIdxB !== -1 && bestWordScore >= 0.60) {
            usedB.add(bestIdxB);
            totalScoreA += bestWordScore;
        }
    }

    const precisionA = totalScoreA / tokensA.length;
    const precisionB = totalScoreA / tokensB.length;

    if (precisionA + precisionB === 0) return 0.0;
    const f1 = (2 * precisionA * precisionB) / (precisionA + precisionB);

    // Direct containment bonus if all tokens of one phrase match well into the other
    if (tokensA.length === 1 && totalScoreA >= 0.85) {
        return Math.min(0.95, totalScoreA);
    }
    if (tokensB.length === 1 && totalScoreA >= 0.85) {
        return Math.min(0.95, totalScoreA);
    }

    return f1;
}

/**
 * Known category aliases and root mappings (plural <-> singular, compound roots).
 */
const CATEGORY_CANONICAL_ALIASES: Record<string, string> = {
    'كريب': 'كريب',
    'كريبات': 'كريب',
    'ساندوتش': 'ساندوتش',
    'سندوتش': 'ساندوتش',
    'ساندوتشات': 'ساندوتش',
    'سندوتشات': 'ساندوتش',
    'بيتزا': 'بيتزا',
    'بيتزات': 'بيتزا',
    'بيزا': 'بيتزا',
    'برجر': 'برجر',
    'برجرات': 'برجر',
    'بورجر': 'برجر',
    'بورجرات': 'برجر',
    'اضافة': 'اضافات',
    'اضافات': 'اضافات',
    'اكسترا': 'اضافات',
    'مشروب': 'مشروبات',
    'مشروبات': 'مشروبات',
    'عصير': 'مشروبات',
    'عصائر': 'مشروبات',
    'كانز': 'مشروبات',
    'سلطة': 'سلطات',
    'سلطات': 'سلطات',
    'صوص': 'صوصات',
    'صوصات': 'صوصات',
    'وجبة': 'وجبات',
    'وجبات': 'وجبات',
    'حلو': 'حلويات',
    'حلويات': 'حلويات',
    'حلوى': 'حلويات',
    'ديزرت': 'حلويات',
    'طاجن': 'طواجن',
    'طواجن': 'طواجن',
    'مكرونة': 'مكرونات',
    'مكرونه': 'مكرونات',
    'مكرونات': 'مكرونات',
    'باستا': 'مكرونات',
    'فطيرة': 'فطائر',
    'فطائر': 'فطائر',
    'فطاير': 'فطائر',
    'فطير': 'فطائر',
    'حواوشي': 'حواوشي',
    'حواوشى': 'حواوشي',
    'شاورما': 'شاورما',
    'بطاطس': 'بطاطس',
    'مقبلات': 'مقبلات',
    'مقبلة': 'مقبلات'
};

/**
 * Normalize and stem a category word, handling plurals like "ات" and prefixes.
 */
export function stemCategoryWord(word: string): string {
    let norm = normalizeArabic(word).trim();
    if (!norm) return '';

    if (CATEGORY_CANONICAL_ALIASES[norm]) {
        return CATEGORY_CANONICAL_ALIASES[norm];
    }

    // Strip leading "ال"
    if (norm.startsWith('ال') && norm.length > 3) {
        norm = norm.substring(2);
        if (CATEGORY_CANONICAL_ALIASES[norm]) {
            return CATEGORY_CANONICAL_ALIASES[norm];
        }
    }

    // Strip feminine plural suffix "ات" (e.g. كريبات -> كريب)
    if (norm.endsWith('ات') && norm.length > 4) {
        const base = norm.slice(0, -2);
        if (CATEGORY_CANONICAL_ALIASES[base]) return CATEGORY_CANONICAL_ALIASES[base];
        return base;
    }

    // Strip "ة" / "ه"
    if ((norm.endsWith('ة') || norm.endsWith('ه')) && norm.length > 3) {
        const base = norm.slice(0, -1);
        if (CATEGORY_CANONICAL_ALIASES[base]) return CATEGORY_CANONICAL_ALIASES[base];
        return base;
    }

    return norm;
}

/**
 * Calculate category similarity supporting:
 * 1. Plural / Singular variations (كريب ↔ كريبات).
 * 2. Compound & Subset categories (الاضافات ↔ البطاطس والاضافات ↔ اضافات البيتزا).
 * 3. Shared key category tokens (e.g. both have 'اضافات' or 'كريب').
 */
export function calculateCategorySimilarity(catA: string, catB: string): number {
    const normA = normalizeArabic(catA).trim();
    const normB = normalizeArabic(catB).trim();

    if (normA === normB) return 1.0;
    if (!normA || !normB) return 0.0;

    // Single word stemmed check
    const stemA = stemCategoryWord(normA);
    const stemB = stemCategoryWord(normB);
    if (stemA === stemB) return 0.98;

    // Direct substring or inclusion
    if (normA.includes(normB) || normB.includes(normA)) {
        const shorter = normA.length < normB.length ? normA : normB;
        const longer  = normA.length < normB.length ? normB : normA;
        const ratio = shorter.length / longer.length;
        return Math.max(0.85, ratio);
    }

    // Tokenized stems (e.g. "البطاطس والاضافات" -> ["بطاطس", "اضافات"], "اضافات البيتزا" -> ["اضافات", "بيتزا"])
    const STOP_WORDS = new Set(['و', 'مع', 'في', 'من', 'او', 'قسم', 'القسم']);
    const tokensA = normA.split(/\s+/).filter(w => !STOP_WORDS.has(w)).map(stemCategoryWord).filter(w => w.length >= 2);
    const tokensB = normB.split(/\s+/).filter(w => !STOP_WORDS.has(w)).map(stemCategoryWord).filter(w => w.length >= 2);

    if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

    // Check shared tokens
    const setB = new Set(tokensB);
    const sharedTokens = tokensA.filter(t => setB.has(t));

    if (sharedTokens.length > 0) {
        // If the shared token represents all tokens of one phrase, it's a direct category match!
        if (sharedTokens.length === tokensA.length || sharedTokens.length === tokensB.length) {
            return 0.92;
        }
        // Partial overlap of compound category
        const overlapRatio = (2 * sharedTokens.length) / (tokensA.length + tokensB.length);
        return Math.max(0.80, overlapRatio);
    }

    // Levenshtein & Dice fallback
    const lev = wordLevenshteinSimilarity(stemA, stemB);
    const dice = diceBigramSimilarity(stemA, stemB);
    return Math.max(lev, dice);
}

