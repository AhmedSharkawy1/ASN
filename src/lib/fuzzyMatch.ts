/**
 * Fuzzy text matching utilities optimized for Arabic menu item names.
 * No external dependencies — pure TypeScript implementation.
 */

/**
 * Normalize Arabic text for comparison:
 * - Remove diacritics (tashkeel)
 * - Unify hamza forms (أ إ آ → ا)
 * - Remove "ال" definite article
 * - Collapse whitespace
 * - Lowercase (for any Latin chars)
 */
export function normalizeArabic(text: string): string {
    return text
        // Remove Arabic diacritics (tashkeel)
        .replace(/[\u064B-\u065F\u0670]/g, '')
        // Unify hamza on alef
        .replace(/[أإآٱ]/g, 'ا')
        // Unify taa marbouta and haa
        .replace(/ة/g, 'ه')
        // Unify alef maqsura and yaa
        .replace(/ى/g, 'ي')
        // Remove common punctuation
        .replace(/[_\-–—.,:;!?()[\]{}'"\/\\|+=#@&*~`]/g, ' ')
        // Remove "ال" definite article as a standalone prefix
        .replace(/\bال/g, '')
        // Collapse multiple spaces
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Tokenize text into meaningful words, filtering out very short tokens.
 */
function tokenize(text: string): string[] {
    return normalizeArabic(text)
        .split(' ')
        .filter(w => w.length > 0);
}

/**
 * Calculate similarity score between two strings (0..1).
 * Uses a combination of:
 *   1. Token overlap (Jaccard-like)
 *   2. Substring containment bonus
 *   3. Token-order bonus
 */
export function calculateSimilarity(a: string, b: string): number {
    const normA = normalizeArabic(a);
    const normB = normalizeArabic(b);

    // Exact match after normalization
    if (normA === normB) return 1;

    // Empty string guard
    if (!normA || !normB) return 0;

    // --- 1. Full substring containment (one name inside the other) ---
    if (normA.includes(normB) || normB.includes(normA)) {
        const shorter = normA.length < normB.length ? normA : normB;
        const longer  = normA.length < normB.length ? normB : normA;
        // Score scales with how much of the longer string the shorter covers
        const ratio = shorter.length / longer.length;
        return Math.max(0.65, ratio);
    }

    // --- 2. Token-level matching ---
    const tokensA = tokenize(a);
    const tokensB = tokenize(b);

    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    // Count matching tokens (including partial token matches)
    let matchedA = 0;
    let matchedB = 0;

    for (const tA of tokensA) {
        for (const tB of tokensB) {
            if (tA === tB || tA.includes(tB) || tB.includes(tA)) {
                matchedA++;
                break;
            }
        }
    }
    for (const tB of tokensB) {
        for (const tA of tokensA) {
            if (tA === tB || tA.includes(tB) || tB.includes(tA)) {
                matchedB++;
                break;
            }
        }
    }

    const precisionA = matchedA / tokensA.length;  // how many of A's tokens matched
    const precisionB = matchedB / tokensB.length;  // how many of B's tokens matched

    // F1-like score: harmonic mean of both precisions
    if (precisionA + precisionB === 0) return 0;
    const f1 = (2 * precisionA * precisionB) / (precisionA + precisionB);

    return f1;
}

/**
 * Given a query string and a list of candidates, find the best match.
 * Returns the best candidate and its similarity score.
 * Returns null if no candidate meets the minimum threshold (default 0.40).
 */
export function findBestMatch(
    query: string,
    candidates: { id: string; name: string }[],
    minThreshold = 0.40
): { candidate: { id: string; name: string }; score: number } | null {
    let best: { candidate: { id: string; name: string }; score: number } | null = null;

    for (const candidate of candidates) {
        const score = calculateSimilarity(query, candidate.name);
        if (score >= minThreshold && (!best || score > best.score)) {
            best = { candidate, score };
        }
    }

    return best;
}
