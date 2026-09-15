"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, X, AlertTriangle, CheckCircle2, Search, Sparkles, Loader2, Eye } from 'lucide-react';
import { SmartMatchItem } from '@/lib/menuImages';

interface CategoryOption {
    id: string;
    name_ar: string;
    items: {
        id: string;
        title_ar: string;
        image_url?: string;
    }[];
}

interface SmartImportReviewModalProps {
    language: string;
    matches: SmartMatchItem[];
    categories: CategoryOption[];
    isUploading: boolean;
    onConfirm: (confirmedMatches: SmartMatchItem[]) => void;
    onClose: () => void;
}

export function SmartImportReviewModal({
    language,
    matches: initialMatches,
    categories,
    isUploading,
    onConfirm,
    onClose,
}: SmartImportReviewModalProps) {
    const [matches, setMatches] = useState<SmartMatchItem[]>(initialMatches);
    const [filter, setFilter] = useState<'all' | 'uncertain' | 'confirmed' | 'no_match'>('uncertain');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

    // Calculate stats
    const stats = useMemo(() => {
        let confirmedCount = 0;
        let uncertainCount = 0;
        let noMatchCount = 0;
        let activeSelectedCount = 0;

        for (const m of matches) {
            if (m.status === 'confirmed') confirmedCount++;
            else if (m.status === 'uncertain') uncertainCount++;
            else noMatchCount++;

            if (m.confirmed && (m.matchedItemId || (m.isCover && m.matchedCategoryId))) {
                activeSelectedCount++;
            }
        }

        return {
            total: matches.length,
            confirmed: confirmedCount,
            uncertain: uncertainCount,
            noMatch: noMatchCount,
            activeSelected: activeSelectedCount,
        };
    }, [matches]);

    // If there are no uncertain items at start, default filter to 'all'
    React.useEffect(() => {
        if (stats.uncertain === 0 && stats.confirmed > 0) {
            setFilter('all');
        }
    }, [stats.uncertain, stats.confirmed]);

    // Filtered items
    const filteredMatches = useMemo(() => {
        return matches.filter((m) => {
            if (filter === 'uncertain' && m.status !== 'uncertain') return false;
            if (filter === 'confirmed' && m.status !== 'confirmed') return false;
            if (filter === 'no_match' && m.status !== 'no_match') return false;

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const fileMatch = m.fileName.toLowerCase().includes(term);
                const fileCatMatch = m.fileCategoryName?.toLowerCase().includes(term);
                const fileItemMatch = m.fileItemName?.toLowerCase().includes(term);
                const matchedCatMatch = m.matchedCategoryName?.toLowerCase().includes(term);
                const matchedItemMatch = m.matchedItemName?.toLowerCase().includes(term);
                return fileMatch || fileCatMatch || fileItemMatch || matchedCatMatch || matchedItemMatch;
            }
            return true;
        });
    }, [matches, filter, searchTerm]);

    const toggleConfirm = (id: string, forceValue?: boolean) => {
        setMatches((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const newVal = forceValue !== undefined ? forceValue : !item.confirmed;
                    return { ...item, confirmed: newVal };
                }
                return item;
            })
        );
    };

    const handleSelectConfirmedOnly = () => {
        setMatches((prev) =>
            prev.map((item) => ({
                ...item,
                confirmed: item.status === 'confirmed',
            }))
        );
    };

    const handleSelectAllVisible = () => {
        const visibleIds = new Set(filteredMatches.map((m) => m.id));
        setMatches((prev) =>
            prev.map((item) => {
                if (visibleIds.has(item.id) && (item.matchedItemId || (item.isCover && item.matchedCategoryId))) {
                    return { ...item, confirmed: true };
                }
                return item;
            })
        );
    };

    const handleDeselectAllVisible = () => {
        const visibleIds = new Set(filteredMatches.map((m) => m.id));
        setMatches((prev) =>
            prev.map((item) => {
                if (visibleIds.has(item.id)) {
                    return { ...item, confirmed: false };
                }
                return item;
            })
        );
    };

    const handleReassignItem = (matchId: string, categoryId: string, itemId: string) => {
        const targetCategory = categories.find((c) => c.id === categoryId);
        const targetItem = targetCategory?.items.find((i) => i.id === itemId);

        setMatches((prev) =>
            prev.map((m) => {
                if (m.id !== matchId) return m;

                if (itemId === '__cover__') {
                    return {
                        ...m,
                        matchedCategoryId: targetCategory?.id || null,
                        matchedCategoryName: targetCategory?.name_ar || null,
                        matchedItemId: null,
                        matchedItemName: 'غلاف القسم',
                        isCover: true,
                        confirmed: true,
                        status: 'confirmed',
                        score: 1.0,
                    };
                }

                if (!targetItem) {
                    return {
                        ...m,
                        matchedCategoryId: null,
                        matchedCategoryName: null,
                        matchedItemId: null,
                        matchedItemName: null,
                        confirmed: false,
                        status: 'no_match',
                    };
                }

                return {
                    ...m,
                    matchedCategoryId: targetCategory?.id || null,
                    matchedCategoryName: targetCategory?.name_ar || null,
                    matchedItemId: targetItem.id,
                    matchedItemName: targetItem.title_ar,
                    isCover: false,
                    confirmed: true,
                    status: 'confirmed',
                    score: 1.0,
                };
            })
        );
    };

    return (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-hidden">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 border border-glass-border rounded-3xl shadow-2xl flex flex-col w-full max-w-5xl h-[92vh] overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-glass-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl shrink-0">
                            🪄
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                                {language === 'ar' ? 'مراجعة وتأكيد مطابقة الصور' : 'Review & Confirm Image Matches'}
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold">
                                    {stats.total} {language === 'ar' ? 'صورة' : 'images'}
                                </span>
                            </h2>
                            <p className="text-xs text-silver mt-0.5">
                                {language === 'ar'
                                    ? 'أكد فقط الصور الصحيحة. أي صنف غير مؤكد أو تم رفضه سيُترك فارغاً بدون صورة.'
                                    : 'Confirm only the right matches. Unconfirmed items will be left blank.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isUploading}
                        className="p-2 rounded-xl text-silver hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats & Filter Bar */}
                <div className="px-4 sm:px-6 py-3 border-b border-glass-border bg-white dark:bg-slate-900 flex flex-col gap-3 shrink-0">
                    {/* Tabs */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setFilter('uncertain')}
                                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                    filter === 'uncertain'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-silver hover:text-foreground'
                                }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {language === 'ar' ? 'يحتاج تأكيدك' : 'Needs Review'}
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                                    {stats.uncertain}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFilter('confirmed')}
                                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                    filter === 'confirmed'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-silver hover:text-foreground'
                                }`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {language === 'ar' ? 'مطابق بدقة' : 'Confirmed'}
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                                    {stats.confirmed}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFilter('no_match')}
                                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                    filter === 'no_match'
                                        ? 'bg-red-500 text-white shadow-sm'
                                        : 'text-silver hover:text-foreground'
                                }`}
                            >
                                <X className="w-3.5 h-3.5" />
                                {language === 'ar' ? 'غير مطابق' : 'No Match'}
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                                    {stats.noMatch}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFilter('all')}
                                className={`px-3 py-1.5 rounded-lg transition ${
                                    filter === 'all'
                                        ? 'bg-blue text-white shadow-sm'
                                        : 'text-silver hover:text-foreground'
                                }`}
                            >
                                {language === 'ar' ? 'الكل' : 'All'} ({stats.total})
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="w-4 h-4 text-silver absolute right-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={language === 'ar' ? 'بحث بالاسم أو القسم...' : 'Search by name...'}
                                className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-glass-border focus:border-blue outline-none"
                            />
                        </div>
                    </div>

                    {/* Bulk Selection Actions */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-silver gap-2 pt-1 border-t border-glass-border/40">
                        <div className="flex items-center gap-2">
                            <span>{language === 'ar' ? 'إجراءات سريعة:' : 'Quick Actions:'}</span>
                            <button
                                type="button"
                                onClick={handleSelectConfirmedOnly}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold transition"
                            >
                                {language === 'ar' ? 'تأكيد المطابقة بدقة فقط ✅' : 'Select Confirmed Only'}
                            </button>
                            <button
                                type="button"
                                onClick={handleSelectAllVisible}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-medium transition"
                            >
                                {language === 'ar' ? 'تحديد كل المعروض' : 'Select All Visible'}
                            </button>
                            <button
                                type="button"
                                onClick={handleDeselectAllVisible}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-silver hover:text-foreground transition"
                            >
                                {language === 'ar' ? 'إلغاء تحديد كل المعروض' : 'Deselect All Visible'}
                            </button>
                        </div>
                        <div className="font-bold text-foreground">
                            {language === 'ar'
                                ? `المعتمد للرفع: ${stats.activeSelected} من أصل ${stats.total}`
                                : `Selected: ${stats.activeSelected} of ${stats.total}`}
                        </div>
                    </div>
                </div>

                {/* Cards List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/30">
                    {filteredMatches.length === 0 ? (
                        <div className="text-center py-16 text-silver">
                            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-bold text-sm">
                                {language === 'ar' ? 'لا توجد صور في هذا التصنيف' : 'No images in this category'}
                            </p>
                        </div>
                    ) : (
                        filteredMatches.map((item) => {
                            const isConfirmed = item.confirmed;
                            const hasMatch = !!(item.matchedItemId || (item.isCover && item.matchedCategoryId));
                            const matchPercentage = Math.round(item.score * 100);

                            return (
                                <div
                                    key={item.id}
                                    className={`rounded-2xl border p-3.5 sm:p-4 transition-all ${
                                        isConfirmed
                                            ? 'border-emerald-500/50 bg-emerald-500/[0.04] shadow-sm'
                                            : item.status === 'uncertain'
                                            ? 'border-amber-500/40 bg-amber-500/[0.03]'
                                            : 'border-glass-border bg-white dark:bg-slate-900/80 opacity-80'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                        {/* Image Thumbnail */}
                                        <div className="relative group shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-glass-border bg-slate-100 dark:bg-slate-800">
                                            <img
                                                src={item.previewUrl}
                                                alt={item.fileName}
                                                className="w-full h-full object-cover group-hover:scale-105 transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPreviewImage(item.previewUrl)}
                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-zoom-in"
                                                title={language === 'ar' ? 'تكبير الصورة' : 'Zoom'}
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Info Column */}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            {/* Top: File info */}
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <span className="text-[11px] font-mono text-silver truncate block max-w-md" title={item.fileName}>
                                                        📄 {item.fileName}
                                                    </span>
                                                </div>

                                                {/* Badge */}
                                                <div>
                                                    {item.status === 'confirmed' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {language === 'ar' ? `مطابقة مؤكدة (${matchPercentage}%)` : `Confirmed (${matchPercentage}%)`}
                                                        </span>
                                                    ) : item.status === 'uncertain' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            {language === 'ar' ? `بحاجة لتأكيدك (${matchPercentage}%)` : `Review Needed (${matchPercentage}%)`}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                                            <X className="w-3 h-3" />
                                                            {language === 'ar' ? 'غير مطابق في المنيو' : 'No Match'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Extracted vs Matched details */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-100/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-glass-border">
                                                {/* From File */}
                                                <div>
                                                    <span className="text-silver text-[10px] block mb-0.5">
                                                        {language === 'ar' ? 'البيانات من اسم الملف:' : 'From File:'}
                                                    </span>
                                                    <div className="font-bold text-foreground">
                                                        <span className="text-silver">{language === 'ar' ? 'القسم: ' : 'Category: '}</span>
                                                        <span className="text-teal-600 dark:text-teal-400">
                                                            {item.fileCategoryName || (language === 'ar' ? 'غير محدد' : 'None')}
                                                        </span>
                                                        {'  |  '}
                                                        <span className="text-silver">{language === 'ar' ? 'الصنف: ' : 'Item: '}</span>
                                                        <span>{item.fileItemName}</span>
                                                    </div>
                                                </div>

                                                {/* Matched in Menu */}
                                                <div>
                                                    <span className="text-silver text-[10px] block mb-0.5">
                                                        {language === 'ar' ? 'المطابقة في المنيو:' : 'Menu Match:'}
                                                    </span>
                                                    {hasMatch ? (
                                                        <div className="font-bold text-foreground">
                                                            <span className="text-silver">{language === 'ar' ? 'القسم: ' : 'Category: '}</span>
                                                            <span className="text-blue">{item.matchedCategoryName}</span>
                                                            {'  |  '}
                                                            <span className="text-silver">{language === 'ar' ? 'الصنف: ' : 'Item: '}</span>
                                                            <span className="text-foreground">{item.matchedItemName}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-red-500 font-bold text-[11px]">
                                                            {language === 'ar' ? 'لم يُعثر على صنف مطابق بهذا الاسم' : 'No matching item found'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Reassignment Selector (Manual override) */}
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <span className="text-[11px] text-silver font-medium">
                                                    {language === 'ar' ? 'تعديل التعيين يدوياً:' : 'Change Assignment:'}
                                                </span>
                                                <select
                                                    value={
                                                        item.isCover
                                                            ? `${item.matchedCategoryId}::__cover__`
                                                            : item.matchedCategoryId && item.matchedItemId
                                                            ? `${item.matchedCategoryId}::${item.matchedItemId}`
                                                            : ''
                                                    }
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (!val) {
                                                            handleReassignItem(item.id, '', '');
                                                        } else {
                                                            const [catId, itemId] = val.split('::');
                                                            handleReassignItem(item.id, catId, itemId);
                                                        }
                                                    }}
                                                    className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-glass-border focus:border-blue text-foreground outline-none font-medium max-w-xs"
                                                >
                                                    <option value="">{language === 'ar' ? '-- بدون تعيين (فارغ) --' : '-- Unassigned --'}</option>
                                                    {categories.map((cat) => (
                                                        <optgroup key={cat.id} label={`📂 ${cat.name_ar}`}>
                                                            <option value={`${cat.id}::__cover__`}>
                                                                🖼️ {language === 'ar' ? `غلاف قسم: ${cat.name_ar}` : `Cover: ${cat.name_ar}`}
                                                            </option>
                                                            {cat.items.map((i) => (
                                                                <option key={i.id} value={`${cat.id}::${i.id}`}>
                                                                    🍽️ {i.title_ar}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Action Buttons for this card */}
                                        <div className="flex flex-col sm:flex-col items-stretch gap-2 shrink-0 w-full sm:w-44 pt-2 sm:pt-0 border-t sm:border-t-0 border-glass-border">
                                            {/* Accept Button */}
                                            <button
                                                type="button"
                                                disabled={!hasMatch}
                                                onClick={() => toggleConfirm(item.id, true)}
                                                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-30 cursor-pointer ${
                                                    isConfirmed
                                                        ? 'bg-emerald-600 text-white shadow-md'
                                                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                }`}
                                            >
                                                <Check className="w-4 h-4" />
                                                {isConfirmed
                                                    ? (language === 'ar' ? '✓ معتمد للرفع' : 'Confirmed')
                                                    : (language === 'ar' ? 'نعم، هذه صورة الصنف' : 'Confirm Match')}
                                            </button>

                                            {/* Reject / Skip Button */}
                                            <button
                                                type="button"
                                                onClick={() => toggleConfirm(item.id, false)}
                                                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                                    !isConfirmed
                                                        ? 'bg-slate-200 dark:bg-slate-800 text-silver border border-glass-border'
                                                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                                                }`}
                                            >
                                                <X className="w-4 h-4" />
                                                {!isConfirmed
                                                    ? (language === 'ar' ? 'لا ترفع (اترك فارغاً)' : 'Skip / Empty')
                                                    : (language === 'ar' ? 'إلغاء الاعتماد' : 'Unconfirm')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Bar */}
                <div className="p-4 sm:p-6 border-t border-glass-border bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-silver text-center sm:text-right">
                        <span className="font-bold text-foreground block">
                            {language === 'ar'
                                ? `تم اعتماد ${stats.activeSelected} صورة للرفع`
                                : `${stats.activeSelected} images approved for upload`}
                        </span>
                        <span className="text-[11px]">
                            {language === 'ar'
                                ? 'أي صنف لم يتم اعتماده سيتم تخطيه وتركه فارغاً بدون صورة.'
                                : 'Any unapproved image will be skipped and left blank.'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isUploading}
                            className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground text-sm font-bold transition disabled:opacity-50"
                        >
                            {language === 'ar' ? 'إلغاء وتراجع' : 'Cancel'}
                        </button>

                        <button
                            type="button"
                            disabled={isUploading || stats.activeSelected === 0}
                            onClick={() => {
                                const approved = matches.filter(
                                    (m) => m.confirmed && (m.matchedItemId || (m.isCover && m.matchedCategoryId))
                                );
                                onConfirm(approved);
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {language === 'ar' ? 'جاري الرفع وتحديث المنيو...' : 'Uploading...'}
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    {language === 'ar'
                                        ? `تأكيد ورفع الصور المعتمدة (${stats.activeSelected})`
                                        : `Confirm & Upload (${stats.activeSelected})`}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Image Preview Lightbox */}
            {selectedPreviewImage && (
                <div
                    className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setSelectedPreviewImage(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh]">
                        <img
                            src={selectedPreviewImage}
                            alt="Preview"
                            className="w-full h-full object-contain rounded-2xl shadow-2xl"
                        />
                        <button
                            type="button"
                            onClick={() => setSelectedPreviewImage(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
