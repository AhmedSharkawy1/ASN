/**
 * Utility to calculate whether a restaurant/store is currently OPEN or CLOSED
 * based on its configured working hours or opening/closing times.
 */

export interface StoreHoursStatus {
    isOpen: boolean;
    labelAr: string;
    labelEn: string;
    hoursText?: string;
}

/**
 * Parses time tokens into minutes from midnight (0 - 1439).
 */
function parseTimeStringToMinutes(timeStr: string): number | null {
    if (!timeStr) return null;
    const clean = timeStr.trim();

    // Regex to match "10:30 AM", "02:00 ص", "10 PM", "2 صباحاً", "23:00", etc.
    const match = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|ص|م|صباحاً|صباحا|مساءً|مساء)?/i);
    if (!match) return null;

    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3] ? match[3].toLowerCase() : '';

    const isPM = period.includes('pm') || period.includes('م') || period.includes('مساء');
    const isAM = period.includes('am') || period.includes('ص') || period.includes('صباح');

    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;

    if (hour >= 24 || minute >= 60) return null;
    return hour * 60 + minute;
}

/**
 * Attempts to extract start and end minutes from working_hours freeform text
 * e.g. "من 10 صباحاً إلى 2 صباحاً" or "10:00 AM - 02:00 AM" or "10:00 - 23:00"
 */
function extractTimesFromWorkingHoursText(text: string): { openMinutes: number; closeMinutes: number } | null {
    if (!text || typeof text !== 'string') return null;

    // Pattern to capture two time expressions separated by separator words/symbols
    // e.g. "من 10:00 صباحاً إلى 02:00 صباحاً", "10 ص - 2 ص", "10:00 AM to 02:00 AM"
    const regex = /(\d{1,2}(?::\d{2})?\s*(?:am|pm|ص|م|صباحاً|صباحا|مساءً|مساء)?)\s*(?:-|–|—|to|إلى|الي|حتى)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|ص|م|صباحاً|صباحا|مساءً|مساء)?)/i;
    const match = text.match(regex);
    if (!match) return null;

    const openMin = parseTimeStringToMinutes(match[1]);
    const closeMin = parseTimeStringToMinutes(match[2]);

    if (openMin !== null && closeMin !== null) {
        return { openMinutes: openMin, closeMinutes: closeMin };
    }
    return null;
}

/**
 * Main evaluation function to determine if the store is currently open.
 */
export function getStoreOpenStatus(config: any): StoreHoursStatus {
    // If restaurant explicitly disabled taking orders
    if (config?.orders_enabled === false) {
        return {
            isOpen: false,
            labelAr: 'مغلق الآن',
            labelEn: 'Closed Now',
            hoursText: config?.working_hours || (config?.time_open ? `${config.time_open} - ${config.time_close}` : undefined)
        };
    }

    let openMinutes: number | null = null;
    let closeMinutes: number | null = null;
    let formattedHours = config?.working_hours || '';

    // 1. Try explicit time_open & time_close fields
    if (config?.time_open && config?.time_close) {
        openMinutes = parseTimeStringToMinutes(String(config.time_open));
        closeMinutes = parseTimeStringToMinutes(String(config.time_close));
        if (!formattedHours) {
            formattedHours = `${config.time_open} - ${config.time_close}`;
        }
    }

    // 2. Fallback to extracting from working_hours string if available
    if ((openMinutes === null || closeMinutes === null) && config?.working_hours) {
        const extracted = extractTimesFromWorkingHoursText(String(config.working_hours));
        if (extracted) {
            openMinutes = extracted.openMinutes;
            closeMinutes = extracted.closeMinutes;
        }
    }

    // 3. If no working hours found or parse failed, default to open if orders_enabled !== false
    if (openMinutes === null || closeMinutes === null) {
        return {
            isOpen: true,
            labelAr: 'مفتوح الآن',
            labelEn: 'Open Now',
            hoursText: formattedHours || undefined
        };
    }

    // 4. Compare with current device local time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let isOpen = false;
    if (openMinutes <= closeMinutes) {
        // Standard same-day working hours (e.g. 10:00 AM to 11:00 PM)
        isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } else {
        // Overnight working hours across midnight (e.g. 10:00 AM to 02:00 AM next day)
        isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    }

    return {
        isOpen,
        labelAr: isOpen ? 'مفتوح الآن' : 'مغلق الآن',
        labelEn: isOpen ? 'Open Now' : 'Closed Now',
        hoursText: formattedHours || undefined
    };
}
