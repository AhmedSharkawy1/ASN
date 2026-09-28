'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Clock, 
    Calendar, 
    Check, 
    Copy, 
    Sparkles, 
    Moon, 
    Info, 
    AlertCircle,
    CheckCircle2,
    XCircle,
    RotateCcw
} from 'lucide-react';
import { 
    StoreSchedule, 
    DayOfWeek, 
    DAYS_ORDER, 
    DAY_NAMES, 
    parseWorkingHours, 
    generateDisplayText, 
    formatTime12h,
    isStoreOpenAt,
    createDefaultSchedule
} from '@/lib/helpers/storeHours';

interface WorkingHoursSettingsProps {
    value?: string;
    onChange: (value: string) => void;
    language?: 'ar' | 'en';
}

export default function WorkingHoursSettings({
    value = '',
    onChange,
    language = 'ar'
}: WorkingHoursSettingsProps) {
    const isAr = language === 'ar';

    // Parse incoming value into schedule state
    const [schedule, setSchedule] = useState<StoreSchedule>(() => parseWorkingHours(value));

    // When external value changes (e.g. initial fetch)
    useEffect(() => {
        if (value) {
            setSchedule(parseWorkingHours(value));
        }
    }, [value]);

    // Live store open/close evaluation right now
    const [now, setNow] = useState<Date>(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    const isCurrentlyOpen = useMemo(() => {
        return isStoreOpenAt(schedule, now);
    }, [schedule, now]);

    // Update parent with serialized JSON whenever schedule changes
    const updateSchedule = (newSched: StoreSchedule) => {
        const displayText = generateDisplayText(newSched, true);
        const finalSched = {
            ...newSched,
            displayText,
        };
        setSchedule(finalSched);
        onChange(JSON.stringify(finalSched));
    };

    // Mode changer
    const handleModeChange = (mode: StoreSchedule['mode']) => {
        const updated: StoreSchedule = {
            ...schedule,
            mode,
        };
        updateSchedule(updated);
    };

    // Same Every Day: Change Open / Close Times
    const handleTimeChange = (type: 'openTime' | 'closeTime', val: string) => {
        const updated: StoreSchedule = {
            ...schedule,
            [type]: val,
        };
        // Also sync default times to custom days map
        const newDays = { ...updated.days };
        DAYS_ORDER.forEach(d => {
            if (newDays[d]) {
                newDays[d] = {
                    ...newDays[d],
                    [type === 'openTime' ? 'openTime' : 'closeTime']: val,
                };
            }
        });
        updated.days = newDays;
        updateSchedule(updated);
    };

    // Same Every Day: Toggle an active day
    const toggleActiveDay = (day: DayOfWeek) => {
        const currentActive = schedule.activeDays || DAYS_ORDER;
        let newActive: DayOfWeek[];
        if (currentActive.includes(day)) {
            newActive = currentActive.filter(d => d !== day);
        } else {
            newActive = [...currentActive, day];
        }
        // Keep in order
        newActive.sort((a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b));

        const updated: StoreSchedule = {
            ...schedule,
            activeDays: newActive,
        };
        updateSchedule(updated);
    };

    // Quick Day Presets for Same Every Day
    const selectAllDays = () => {
        updateSchedule({
            ...schedule,
            activeDays: [...DAYS_ORDER],
        });
    };

    const setFridayOff = () => {
        updateSchedule({
            ...schedule,
            activeDays: DAYS_ORDER.filter(d => d !== 'friday'),
        });
    };

    // Custom Days: Toggle day open/close
    const toggleCustomDayOpen = (day: DayOfWeek) => {
        const daySched = schedule.days?.[day] || { isOpen: true, openTime: schedule.openTime, closeTime: schedule.closeTime };
        const updated: StoreSchedule = {
            ...schedule,
            days: {
                ...schedule.days,
                [day]: {
                    ...daySched,
                    isOpen: !daySched.isOpen,
                },
            },
        };
        updateSchedule(updated);
    };

    // Custom Days: Change day times
    const handleCustomDayTimeChange = (day: DayOfWeek, type: 'openTime' | 'closeTime', val: string) => {
        const daySched = schedule.days?.[day] || { isOpen: true, openTime: schedule.openTime, closeTime: schedule.closeTime };
        const updated: StoreSchedule = {
            ...schedule,
            days: {
                ...schedule.days,
                [day]: {
                    ...daySched,
                    [type]: val,
                },
            },
        };
        updateSchedule(updated);
    };

    // Custom Days: Copy one day's hours to all days
    const copyDayToAll = (sourceDay: DayOfWeek) => {
        const source = schedule.days?.[sourceDay] || { isOpen: true, openTime: schedule.openTime, closeTime: schedule.closeTime };
        const newDays = {} as Record<DayOfWeek, any>;
        DAYS_ORDER.forEach(d => {
            newDays[d] = {
                isOpen: source.isOpen,
                openTime: source.openTime,
                closeTime: source.closeTime,
            };
        });
        updateSchedule({
            ...schedule,
            openTime: source.openTime,
            closeTime: source.closeTime,
            days: newDays,
        });
    };

    // Freeform manual text
    const handleManualTextChange = (text: string) => {
        updateSchedule({
            ...schedule,
            manualText: text,
        });
    };

    // Overnight shift detection for same_every_day
    const isOvernight = useMemo(() => {
        if (!schedule.openTime || !schedule.closeTime) return false;
        return schedule.closeTime < schedule.openTime;
    }, [schedule.openTime, schedule.closeTime]);

    const activeDays = schedule.activeDays || DAYS_ORDER;
    const currentDisplayText = schedule.displayText || generateDisplayText(schedule, isAr);

    return (
        <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Header with Title and Live Store Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass-border pb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue/10 text-blue flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">
                            {isAr ? 'أوقات ومواعيد العمل' : 'Working Hours & Schedule'}
                        </h2>
                        <p className="text-xs sm:text-sm text-silver mt-0.5">
                            {isAr 
                                ? 'تحكّم في حالة المتجر (مفتوح الآن / مغلق الآن) المعروضة في المنيو' 
                                : 'Control store open/closed badges displayed on the menu'}
                        </p>
                    </div>
                </div>

                {/* Real-time Open/Closed Badge Preview */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-silver hidden sm:inline">
                        {isAr ? 'الحالة الحالية الآن:' : 'Current Status:'}
                    </span>
                    {isCurrentlyOpen ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {isAr ? 'مفتوح الآن' : 'Open Now'}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            {isAr ? 'مغلق الآن' : 'Closed Now'}
                        </span>
                    )}
                </div>
            </div>

            {/* Explanation Alert Note */}
            <div className="p-3.5 rounded-xl bg-blue/5 border border-blue/20 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <Info className="w-4 h-4 text-blue shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                    {isAr ? (
                        <>
                            <strong>ملاحظة هامة:</strong> تحديد أوقات العمل يتحكم في شارة <strong>(مفتوح الآن / مغلق الآن)</strong> في المنيو (الثيمات 28 و 29 و 30) حسب التوقيت اللحظي لدخول العميل. 
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold ms-1">
                                ويمكن للعميل إرسال الطلبات في أي وقت بشكل طبيعي حتى عند ظهور مغلق الآن.
                            </span>
                        </>
                    ) : (
                        <>
                            <strong>Important:</strong> Working hours control the <strong>(Open Now / Closed Now)</strong> badges on the menu (Themes 28, 29, 30) according to the customer's current local time.
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold ms-1">
                                Customers can still place orders normally even when shown as Closed Now.
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                    type="button"
                    onClick={() => handleModeChange('same_every_day')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                        schedule.mode === 'same_every_day'
                            ? 'bg-blue text-white border-blue shadow-md'
                            : 'bg-slate-50 dark:bg-black/20 text-silver hover:text-white border-glass-border hover:border-blue/50'
                    }`}
                >
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{isAr ? 'نفس المواعيد يومياً' : 'Same Every Day'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleModeChange('custom_days')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                        schedule.mode === 'custom_days'
                            ? 'bg-blue text-white border-blue shadow-md'
                            : 'bg-slate-50 dark:bg-black/20 text-silver hover:text-white border-glass-border hover:border-blue/50'
                    }`}
                >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{isAr ? 'مواعيد مخصصة لكل يوم' : 'Custom Per Day'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleModeChange('always_open')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                        schedule.mode === 'always_open'
                            ? 'bg-blue text-white border-blue shadow-md'
                            : 'bg-slate-50 dark:bg-black/20 text-silver hover:text-white border-glass-border hover:border-blue/50'
                    }`}
                >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>{isAr ? 'مفتوح دائماً (24 ساعة)' : 'Open 24/7'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleModeChange('manual')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                        schedule.mode === 'manual'
                            ? 'bg-blue text-white border-blue shadow-md'
                            : 'bg-slate-50 dark:bg-black/20 text-silver hover:text-white border-glass-border hover:border-blue/50'
                    }`}
                >
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{isAr ? 'نص يدوي حر' : 'Manual Text'}</span>
                </button>
            </div>

            {/* Mode 1: Same Hours Every Day */}
            {schedule.mode === 'same_every_day' && (
                <div className="space-y-6 bg-slate-50/70 dark:bg-black/20 p-5 rounded-xl border border-glass-border">
                    {/* Time Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center justify-between text-silver">
                                <span>{isAr ? 'وقت الفتح' : 'Opening Time'}</span>
                                <span className="text-xs font-bold text-blue px-2 py-0.5 rounded-md bg-blue/10">
                                    {formatTime12h(schedule.openTime || '10:00', isAr)}
                                </span>
                            </label>
                            <input
                                type="time"
                                value={schedule.openTime || '10:00'}
                                onChange={e => handleTimeChange('openTime', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-glass-dark border border-glass-border focus:border-blue outline-none transition-all font-mono font-bold text-base text-center"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center justify-between text-silver">
                                <span>{isAr ? 'وقت الإغلاق' : 'Closing Time'}</span>
                                <span className="text-xs font-bold text-blue px-2 py-0.5 rounded-md bg-blue/10">
                                    {formatTime12h(schedule.closeTime || '02:00', isAr)}
                                </span>
                            </label>
                            <input
                                type="time"
                                value={schedule.closeTime || '02:00'}
                                onChange={e => handleTimeChange('closeTime', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-glass-dark border border-glass-border focus:border-blue outline-none transition-all font-mono font-bold text-base text-center"
                            />
                        </div>
                    </div>

                    {/* Overnight shift indicator */}
                    {isOvernight && (
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 rounded-xl">
                            <Moon className="w-4 h-4 shrink-0 text-amber-500" />
                            <span>
                                {isAr 
                                    ? '🌙 دوام ليلي: يمتد وقت العمل إلى الساعات الأولى بعد منتصف الليل (اليوم التالي).' 
                                    : '🌙 Overnight Shift: Closes early the next morning.'}
                            </span>
                        </div>
                    )}

                    {/* Active Days Selection */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-silver">
                                {isAr ? 'أيام العمل الأسبوعية:' : 'Working Days of Week:'}
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllDays}
                                    className="text-xs text-blue hover:underline font-bold"
                                >
                                    {isAr ? 'كل الأيام' : 'All Days'}
                                </button>
                                <span className="text-silver text-xs">•</span>
                                <button
                                    type="button"
                                    onClick={setFridayOff}
                                    className="text-xs text-silver hover:text-white font-medium"
                                >
                                    {isAr ? 'الجمعة عطلة' : 'Friday Off'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                            {DAYS_ORDER.map(dayKey => {
                                const isActive = activeDays.includes(dayKey);
                                const dayName = DAY_NAMES[dayKey][isAr ? 'ar' : 'en'];
                                return (
                                    <button
                                        key={dayKey}
                                        type="button"
                                        onClick={() => toggleActiveDay(dayKey)}
                                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                                            isActive
                                                ? 'bg-blue/10 text-blue border-blue/40 shadow-sm'
                                                : 'bg-white dark:bg-glass-dark text-slate-400 border-glass-border line-through'
                                        }`}
                                    >
                                        <span>{dayName}</span>
                                        <span className={`text-[10px] font-normal ${isActive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isActive ? (isAr ? 'مفتوح' : 'Open') : (isAr ? 'عطلة' : 'Off')}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Mode 2: Custom Schedule Per Day */}
            {schedule.mode === 'custom_days' && (
                <div className="space-y-3 bg-slate-50/70 dark:bg-black/20 p-5 rounded-xl border border-glass-border">
                    <p className="text-xs text-silver mb-2">
                        {isAr 
                            ? 'حدد مواعيد الفتح والإغلاق لكل يوم من أيام الأسبوع، أو عطلة:' 
                            : 'Set opening and closing times for each day, or mark as day off:'}
                    </p>

                    <div className="space-y-2">
                        {DAYS_ORDER.map(dayKey => {
                            const daySched = schedule.days?.[dayKey] || { 
                                isOpen: true, 
                                openTime: schedule.openTime || '10:00', 
                                closeTime: schedule.closeTime || '02:00' 
                            };
                            const dayName = DAY_NAMES[dayKey][isAr ? 'ar' : 'en'];
                            const dayOvernight = daySched.closeTime < daySched.openTime;

                            return (
                                <div 
                                    key={dayKey}
                                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                        daySched.isOpen 
                                            ? 'bg-white dark:bg-glass-dark border-glass-border' 
                                            : 'bg-rose-500/5 border-rose-500/20 opacity-80'
                                    }`}
                                >
                                    {/* Day Name and Open/Close Toggle */}
                                    <div className="flex items-center gap-3 min-w-[130px]">
                                        <button
                                            type="button"
                                            onClick={() => toggleCustomDayOpen(dayKey)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                                daySched.isOpen
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                            }`}
                                        >
                                            {daySched.isOpen ? (isAr ? 'مفتوح' : 'Open') : (isAr ? 'عطلة' : 'Closed')}
                                        </button>
                                        <span className="font-bold text-sm">{dayName}</span>
                                    </div>

                                    {/* Time Inputs if Open */}
                                    {daySched.isOpen ? (
                                        <div className="flex items-center gap-2 flex-1 max-w-md">
                                            <div className="flex-1 flex items-center gap-1.5">
                                                <span className="text-xs text-silver shrink-0">{isAr ? 'من' : 'From'}</span>
                                                <input
                                                    type="time"
                                                    value={daySched.openTime}
                                                    onChange={e => handleCustomDayTimeChange(dayKey, 'openTime', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-black/20 border border-glass-border text-xs font-mono font-bold text-center"
                                                />
                                            </div>
                                            <div className="flex-1 flex items-center gap-1.5">
                                                <span className="text-xs text-silver shrink-0">{isAr ? 'إلى' : 'To'}</span>
                                                <input
                                                    type="time"
                                                    value={daySched.closeTime}
                                                    onChange={e => handleCustomDayTimeChange(dayKey, 'closeTime', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-black/20 border border-glass-border text-xs font-mono font-bold text-center"
                                                />
                                            </div>
                                            {dayOvernight && (
                                                <span title={isAr ? 'دوام ليلي يمتد لبعد منتصف الليل' : 'Overnight shift'} className="text-xs">
                                                    🌙
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex-1 text-xs text-silver italic">
                                            {isAr ? 'يوم عطلة أسبوعية - مغلق طوال اليوم' : 'Day off - closed all day'}
                                        </div>
                                    )}

                                    {/* Copy to all button */}
                                    <button
                                        type="button"
                                        onClick={() => copyDayToAll(dayKey)}
                                        title={isAr ? 'نسخ مواعيد هذا اليوم لباقي الأيام' : 'Copy to all days'}
                                        className="text-xs text-silver hover:text-blue flex items-center gap-1 shrink-0 p-1.5 rounded-lg hover:bg-blue/10 transition-colors"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">{isAr ? 'نسخ للكل' : 'Copy'}</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Mode 3: Always Open 24/7 */}
            {schedule.mode === 'always_open' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-base text-emerald-700 dark:text-emerald-300">
                        {isAr ? 'مفتوح دائماً 24 ساعة طوال أيام الأسبوع' : 'Open 24/7 Around the Clock'}
                    </h3>
                    <p className="text-xs text-silver max-w-md mx-auto">
                        {isAr 
                            ? 'سيظهر المنيو بحالة "مفتوح الآن" في أي وقت يدخل فيه العميل.'
                            : 'The menu will always display "Open Now" whenever a customer enters.'}
                    </p>
                </div>
            )}

            {/* Mode 4: Freeform Manual Text */}
            {schedule.mode === 'manual' && (
                <div className="space-y-4 bg-slate-50/70 dark:bg-black/20 p-5 rounded-xl border border-glass-border">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-silver block">
                            {isAr ? 'النص الحر لأوقات العمل' : 'Freeform Working Hours Text'}
                        </label>
                        <input
                            type="text"
                            value={schedule.manualText || ''}
                            onChange={e => handleManualTextChange(e.target.value)}
                            placeholder={isAr ? 'مثال: من 10 صباحاً إلى 2 صباحاً' : 'e.g., 10 AM to 2 AM'}
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-glass-dark border border-glass-border focus:border-blue outline-none transition-all text-base font-medium"
                        />
                        <p className="text-xs text-silver">
                            {isAr 
                                ? 'سيحاول النظام استخراج أوقات الفتح والإغلاق تلقائياً من النص لعرض حالة "مفتوح الآن / مغلق الآن".' 
                                : 'The system will attempt to extract open/close times to automatically show Open Now / Closed Now.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Bottom Preview Box */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                    <span className="text-silver block font-medium">
                        {isAr ? 'النص الذي سيظهر للعميل في المنيو:' : 'Text displayed to customer on menu:'}
                    </span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">
                        {currentDisplayText || (isAr ? 'غير محدد' : 'Not set')}
                    </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <span className="text-silver">{isAr ? 'حالة المنيو الآن:' : 'Menu Status Now:'}</span>
                    {isCurrentlyOpen ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {isAr ? 'مفتوح الآن' : 'Open Now'}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {isAr ? 'مغلق الآن' : 'Closed Now'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
