'use client';

import { useState, useEffect } from 'react';

/**
 * Utility to calculate whether a restaurant/store is currently OPEN or CLOSED
 * based on its configured working hours or opening/closing times.
 */

export type DayOfWeek = 'saturday' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface DaySchedule {
    isOpen: boolean;
    openTime: string;  // "HH:mm" in 24h format, e.g. "10:00"
    closeTime: string; // "HH:mm" in 24h format, e.g. "02:00"
}

export interface StoreSchedule {
    version: 1;
    mode: 'same_every_day' | 'custom_days' | 'always_open' | 'manual';
    openTime: string;  // default "10:00"
    closeTime: string; // default "02:00"
    activeDays: DayOfWeek[];
    days: Record<DayOfWeek, DaySchedule>;
    displayText?: string;
    manualText?: string;
}

export interface StoreHoursStatus {
    isOpen: boolean;
    labelAr: string;
    labelEn: string;
    hoursText?: string;
}

export const DAYS_ORDER: DayOfWeek[] = [
    'saturday',
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
];

export const DAY_NAMES: Record<DayOfWeek, { ar: string; en: string }> = {
    saturday: { ar: 'السبت', en: 'Saturday' },
    sunday: { ar: 'الأحد', en: 'Sunday' },
    monday: { ar: 'الإثنين', en: 'Monday' },
    tuesday: { ar: 'الثلاثاء', en: 'Tuesday' },
    wednesday: { ar: 'الأربعاء', en: 'Wednesday' },
    thursday: { ar: 'الخميس', en: 'Thursday' },
    friday: { ar: 'الجمعة', en: 'Friday' },
};

// JS Date.getDay(): 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
export const JS_DAY_INDEX_TO_KEY: Record<number, DayOfWeek> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
};

export function createDefaultSchedule(): StoreSchedule {
    const defaultDays: Record<DayOfWeek, DaySchedule> = {
        saturday: { isOpen: true, openTime: '10:00', closeTime: '02:00' },
        sunday: { isOpen: true, openTime: '10:00', closeTime: '02:00' },
        monday: { isOpen: true, openTime: '10:00', closeTime: '02:00' },
        tuesday: { isOpen: true, openTime: '10:00', closeTime: '02:00' },
        wednesday: { isOpen: true, openTime: '10:00', closeTime: '02:00' },
        thursday: { isOpen: true, openTime: '10:00', closeTime: '02:00' },
        friday: { isOpen: true, openTime: '10:00', closeTime: '02:00' },
    };

    return {
        version: 1,
        mode: 'same_every_day',
        openTime: '10:00',
        closeTime: '02:00',
        activeDays: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        days: defaultDays,
        displayText: 'يومياً من 10:00 ص إلى 02:00 ص',
        manualText: '',
    };
}

/**
 * Parses time tokens into minutes from midnight (0 - 1439).
 */
export function parseTimeStringToMinutes(timeStr: string): number | null {
    if (!timeStr) return null;
    const clean = String(timeStr).trim();

    // Regex to match "10:30 AM", "02:00 ص", "10 PM", "2 صباحاً", "23:00", "10:00", etc.
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
 * Formats a 24-hour "HH:mm" time string into a 12-hour human-readable format.
 * E.g., "10:00" -> "10:00 ص" / "10:00 AM"
 *       "14:30" -> "02:30 م" / "02:30 PM"
 *       "02:00" -> "02:00 ص" / "02:00 AM"
 */
export function formatTime12h(timeStr: string, isAr: boolean = true): string {
    const mins = parseTimeStringToMinutes(timeStr);
    if (mins === null) return timeStr;

    const totalHours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const periodAr = totalHours >= 12 ? 'م' : 'ص';
    const periodEn = totalHours >= 12 ? 'PM' : 'AM';

    let hours12 = totalHours % 12;
    if (hours12 === 0) hours12 = 12;

    const hh = String(hours12).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');

    return isAr ? `${hh}:${mm} ${periodAr}` : `${hh}:${mm} ${periodEn}`;
}

/**
 * Attempts to extract start and end minutes from working_hours freeform text
 * e.g. "من 10 صباحاً إلى 2 صباحاً" or "10:00 AM - 02:00 AM" or "10:00 - 23:00"
 */
export function extractTimesFromWorkingHoursText(text: string): { openMinutes: number; closeMinutes: number } | null {
    if (!text || typeof text !== 'string') return null;

    const normalized = text
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
        .trim();

    const regex = /(\d{1,2}(?::\d{2})?\s*(?:am|pm|ص|م|صباحاً|صباحا|مساءً|مساء)?)\s*(?:-|–|—|to|إلى|الي|حتى)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|ص|م|صباحاً|صباحا|مساءً|مساء)?)/i;
    const match = normalized.match(regex);
    if (!match) return null;

    const openMin = parseTimeStringToMinutes(match[1]);
    const closeMin = parseTimeStringToMinutes(match[2]);

    if (openMin !== null && closeMin !== null) {
        return { openMinutes: openMin, closeMinutes: closeMin };
    }
    return null;
}

/**
 * Generates user-friendly display text for the configured schedule.
 */
export function generateDisplayText(schedule: StoreSchedule, isAr: boolean = true): string {
    if (schedule.mode === 'always_open') {
        return isAr ? 'مفتوح 24 ساعة طوال أيام الأسبوع' : 'Open 24/7';
    }

    if (schedule.mode === 'manual') {
        return schedule.manualText || (isAr ? 'حسب أوقات العمل' : 'According to working hours');
    }

    if (schedule.mode === 'same_every_day') {
        const openStr = formatTime12h(schedule.openTime, isAr);
        const closeStr = formatTime12h(schedule.closeTime, isAr);
        const allDaysCount = DAYS_ORDER.length;
        const activeCount = schedule.activeDays.length;

        if (activeCount === allDaysCount) {
            return isAr ? `يومياً من ${openStr} إلى ${closeStr}` : `Daily from ${openStr} to ${closeStr}`;
        }

        if (activeCount === 0) {
            return isAr ? 'مغلق حالياً' : 'Currently Closed';
        }

        // Check if only 1 day is off (e.g. Friday)
        if (activeCount === allDaysCount - 1) {
            const offDay = DAYS_ORDER.find(d => !schedule.activeDays.includes(d));
            if (offDay) {
                const offDayName = DAY_NAMES[offDay][isAr ? 'ar' : 'en'];
                return isAr 
                    ? `طوال الأسبوع عدا ${offDayName}: من ${openStr} إلى ${closeStr}`
                    : `All week except ${offDayName}: ${openStr} to ${closeStr}`;
            }
        }

        const activeNames = schedule.activeDays.map(d => DAY_NAMES[d][isAr ? 'ar' : 'en']).join('، ');
        return isAr 
            ? `أيام (${activeNames}): من ${openStr} إلى ${closeStr}`
            : `Days (${activeNames}): ${openStr} to ${closeStr}`;
    }

    if (schedule.mode === 'custom_days') {
        // Build concise summary of open days
        const openDays = DAYS_ORDER.filter(d => schedule.days?.[d]?.isOpen);
        if (openDays.length === 0) {
            return isAr ? 'مغلق مؤقتاً' : 'Temporarily Closed';
        }

        // If all open days have identical hours
        const firstOpen = schedule.days[openDays[0]];
        const allSame = openDays.every(d => {
            const day = schedule.days[d];
            return day.openTime === firstOpen.openTime && day.closeTime === firstOpen.closeTime;
        });

        if (allSame) {
            const openStr = formatTime12h(firstOpen.openTime, isAr);
            const closeStr = formatTime12h(firstOpen.closeTime, isAr);
            if (openDays.length === DAYS_ORDER.length) {
                return isAr ? `يومياً من ${openStr} إلى ${closeStr}` : `Daily from ${openStr} to ${closeStr}`;
            }
            const activeNames = openDays.map(d => DAY_NAMES[d][isAr ? 'ar' : 'en']).join('، ');
            return isAr 
                ? `أيام (${activeNames}): من ${openStr} إلى ${closeStr}`
                : `Days (${activeNames}): ${openStr} to ${closeStr}`;
        }

        // Multiple distinct hours
        return isAr ? 'مفتوح حسب مواعيد الأيام المحددة' : 'Open according to daily schedule';
    }

    return '';
}

/**
 * Parses raw working_hours data (JSON string, object, or legacy string) into a structured StoreSchedule.
 */
export function parseWorkingHours(raw: any): StoreSchedule {
    const defaultSched = createDefaultSchedule();

    if (!raw) {
        return defaultSched;
    }

    if (typeof raw === 'object') {
        if (raw.version === 1) {
            return {
                ...defaultSched,
                ...raw,
                activeDays: Array.isArray(raw.activeDays) ? raw.activeDays : defaultSched.activeDays,
                days: { ...defaultSched.days, ...(raw.days || {}) },
            };
        }
        return defaultSched;
    }

    if (typeof raw === 'string') {
        const trimmed = raw.trim();

        // Try JSON
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed && typeof parsed === 'object') {
                    return {
                        ...defaultSched,
                        ...parsed,
                        activeDays: Array.isArray(parsed.activeDays) ? parsed.activeDays : defaultSched.activeDays,
                        days: { ...defaultSched.days, ...(parsed.days || {}) },
                    };
                }
            } catch {
                // fall through to legacy parsing
            }
        }

        // Legacy string
        const normalized = trimmed
            .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
            .toLowerCase();

        // 24 hours check
        if (
            normalized.includes('24') ||
            normalized.includes('طوال') ||
            normalized.includes('مدار') ||
            normalized.includes('always') ||
            normalized.includes('دائما') ||
            normalized.includes('دائماً')
        ) {
            return {
                ...defaultSched,
                mode: 'always_open',
                displayText: trimmed,
            };
        }

        // Extract times
        const times = extractTimesFromWorkingHoursText(trimmed);
        if (times) {
            const openHH = String(Math.floor(times.openMinutes / 60)).padStart(2, '0');
            const openMM = String(times.openMinutes % 60).padStart(2, '0');
            const closeHH = String(Math.floor(times.closeMinutes / 60)).padStart(2, '0');
            const closeMM = String(times.closeMinutes % 60).padStart(2, '0');

            const openTime = `${openHH}:${openMM}`;
            const closeTime = `${closeHH}:${closeMM}`;

            const days: Record<DayOfWeek, DaySchedule> = { ...defaultSched.days };
            DAYS_ORDER.forEach(d => {
                days[d] = { isOpen: true, openTime, closeTime };
            });

            return {
                ...defaultSched,
                mode: 'same_every_day',
                openTime,
                closeTime,
                days,
                displayText: trimmed,
                manualText: trimmed,
            };
        }

        // Plain manual text
        return {
            ...defaultSched,
            mode: 'manual',
            manualText: trimmed,
            displayText: trimmed,
        };
    }

    return defaultSched;
}

/**
 * Checks whether the store is open at a specific Date & Time according to its schedule.
 * Correctly accounts for overnight shifts spanning past midnight.
 */
export function isStoreOpenAt(schedule: StoreSchedule, date: Date = new Date()): boolean {
    if (schedule.mode === 'always_open') {
        return true;
    }

    const currentMin = date.getHours() * 60 + date.getMinutes();
    const currentDayIndex = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const currentDayKey = JS_DAY_INDEX_TO_KEY[currentDayIndex];

    const yesterdayIndex = (currentDayIndex + 6) % 7;
    const yesterdayKey = JS_DAY_INDEX_TO_KEY[yesterdayIndex];

    if (schedule.mode === 'manual') {
        if (!schedule.manualText) return true;
        const times = extractTimesFromWorkingHoursText(schedule.manualText);
        if (!times) return true;

        if (times.openMinutes <= times.closeMinutes) {
            return currentMin >= times.openMinutes && currentMin < times.closeMinutes;
        } else {
            return currentMin >= times.openMinutes || currentMin < times.closeMinutes;
        }
    }

    if (schedule.mode === 'same_every_day') {
        const openMin = parseTimeStringToMinutes(schedule.openTime) ?? 600;
        const closeMin = parseTimeStringToMinutes(schedule.closeTime) ?? 120;
        const activeDays = schedule.activeDays || DAYS_ORDER;

        if (openMin <= closeMin) {
            // Standard shift on same day
            const isTodayActive = activeDays.includes(currentDayKey);
            return isTodayActive && currentMin >= openMin && currentMin < closeMin;
        } else {
            // Overnight shift spanning midnight
            // 1. Shift that started today and has not reached midnight yet
            const isTodayActive = activeDays.includes(currentDayKey);
            if (isTodayActive && currentMin >= openMin) {
                return true;
            }

            // 2. Shift that started yesterday and continues into today's early morning before closeMin
            const isYesterdayActive = activeDays.includes(yesterdayKey);
            if (isYesterdayActive && currentMin < closeMin) {
                return true;
            }

            return false;
        }
    }

    if (schedule.mode === 'custom_days') {
        const todaySched = schedule.days?.[currentDayKey];
        const yesterdaySched = schedule.days?.[yesterdayKey];

        // 1. Check today's shift
        if (todaySched && todaySched.isOpen) {
            const oMin = parseTimeStringToMinutes(todaySched.openTime) ?? 600;
            const cMin = parseTimeStringToMinutes(todaySched.closeTime) ?? 120;

            if (oMin <= cMin) {
                if (currentMin >= oMin && currentMin < cMin) {
                    return true;
                }
            } else {
                if (currentMin >= oMin) {
                    return true;
                }
            }
        }

        // 2. Check yesterday's shift if it crossed midnight into today
        if (yesterdaySched && yesterdaySched.isOpen) {
            const yOMin = parseTimeStringToMinutes(yesterdaySched.openTime) ?? 600;
            const yCMin = parseTimeStringToMinutes(yesterdaySched.closeTime) ?? 120;

            if (yOMin > yCMin && currentMin < yCMin) {
                return true;
            }
        }

        return false;
    }

    return true;
}

/**
 * Main evaluation function to determine if the store is currently open.
 */
export function getStoreOpenStatus(config: any, currentTime: Date = new Date()): StoreHoursStatus {
    // If restaurant explicitly disabled taking orders overall
    if (config?.orders_enabled === false) {
        return {
            isOpen: false,
            labelAr: 'مغلق الآن',
            labelEn: 'Closed Now',
            hoursText: config?.working_hours || (config?.time_open ? `${config.time_open} - ${config.time_close}` : undefined),
        };
    }

    // 1. Parse structured schedule from working_schedule or working_hours
    let schedule: StoreSchedule | null = null;
    if (config?.working_schedule && typeof config.working_schedule === 'object') {
        schedule = parseWorkingHours(config.working_schedule);
    } else if (config?.working_hours) {
        schedule = parseWorkingHours(config.working_hours);
    }

    if (schedule) {
        const isOpen = isStoreOpenAt(schedule, currentTime);
        return {
            isOpen,
            labelAr: isOpen ? 'مفتوح الآن' : 'مغلق الآن',
            labelEn: isOpen ? 'Open Now' : 'Closed Now',
            hoursText: schedule.displayText || config?.working_hours || undefined,
        };
    }

    // 2. Fallback to explicit time_open & time_close fields if present
    if (config?.time_open && config?.time_close) {
        const openMin = parseTimeStringToMinutes(String(config.time_open));
        const closeMin = parseTimeStringToMinutes(String(config.time_close));
        if (openMin !== null && closeMin !== null) {
            const cur = currentTime.getHours() * 60 + currentTime.getMinutes();
            const isOpen = openMin <= closeMin
                ? (cur >= openMin && cur < closeMin)
                : (cur >= openMin || cur < closeMin);

            return {
                isOpen,
                labelAr: isOpen ? 'مفتوح الآن' : 'مغلق الآن',
                labelEn: isOpen ? 'Open Now' : 'Closed Now',
                hoursText: `${config.time_open} - ${config.time_close}`,
            };
        }
    }

    // 3. Default to Open
    return {
        isOpen: true,
        labelAr: 'مفتوح الآن',
        labelEn: 'Open Now',
        hoursText: config?.working_hours || undefined,
    };
}

/**
 * React hook to keep the store's open/close status updated in real-time
 * without needing the customer to refresh the page.
 * Re-checks every 30 seconds.
 */
export function useStoreHours(config: any): StoreHoursStatus {
    const [status, setStatus] = useState<StoreHoursStatus>(() => getStoreOpenStatus(config));

    useEffect(() => {
        setStatus(getStoreOpenStatus(config));

        const interval = setInterval(() => {
            setStatus(getStoreOpenStatus(config));
        }, 30000);

        return () => clearInterval(interval);
    }, [config]);

    return status;
}
