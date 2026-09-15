"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, X, AlertTriangle, CheckCircle2, Search, Sparkles, Loader2, Eye, Plus, Image as ImageIcon, Filter } from 'lucide-react';
import { SmartMatchItem } from '@/lib/menuImages';
import { calculateSmartItemSimilarity, calculateCategorySimilarity } from '@/lib/arabicLinguisticMatch';

interface CategoryOption {
    id: string;
    name_ar: string;
    image_url?: string;
    items: {
        id: string;
        title_ar: string;
        image_url?: string;
    }[];
}

interface PickingTarget {
    categoryId: string;
    categoryName: string;
    itemId?: string;
    itemTitle: string;
    isCover?: boolean;
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
    const [filter, setFilter] = useState<'all' | 'uncertain' | 'confirmed' | 'no_match' | 'already_exists' | 'missing_items'>('uncertain');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

    // Manual photo picker state for items without images
    const [pickingTarget, setPickingTarget] = useState<PickingTarget | null>(null);
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerFilter, setPickerFilter] = useState<'all' | 'unused' | 'category'>('all');
    const [onlyMissingInTab, setOnlyMissingInTab] = useState(true);

    // Calculate stats
    const stats = useMemo(() => {
        let confirmedCount = 0;
        let uncertainCount = 0;
        let noMatchCount = 0;
        let alreadyExistsCount = 0;
        let activeSelectedCount = 0;

        for (const m of matches) {
            if (m.status === 'already_exists') alreadyExistsCount++;
            else if (m.status === 'confirmed') confirmedCount++;
            else if (m.status === 'uncertain') uncertainCount++;
            else if (m.status === 'no_match') noMatchCount++;

            if (m.confirmed && (m.matchedItemId || (m.isCover && m.matchedCategoryId))) {
                activeSelectedCount++;
            }
        }

        // Count menu items that have no image in database and no confirmed match in current review
        let missingItemsCount = 0;
        for (const cat of categories) {
            for (const item of cat.items) {
                const hasExisting = Boolean(item.image_url);
                const hasAssigned = matches.some((m) => m.matchedItemId === item.id && m.confirmed);
                if (!hasExisting && !hasAssigned) {
                    missingItemsCount++;
                }
            }
        }

        const totalProposals = confirmedCount + uncertainCount + noMatchCount;

        return {
            total: matches.length,
            totalProposals,
            confirmed: confirmedCount,
            uncertain: uncertainCount,
            noMatch: noMatchCount,
            alreadyExists: alreadyExistsCount,
            missingItems: missingItemsCount,
            activeSelected: activeSelectedCount,
        };
    }, [matches, categories]);

    // If there are no uncertain items at start, default filter to 'all' or 'confirmed'
    React.useEffect(() => {
        if (stats.uncertain === 0 && stats.confirmed > 0) {
            setFilter('confirmed');
        } else if (stats.totalProposals === 0 && stats.alreadyExists > 0) {
            setFilter('already_exists');
        }
    }, [stats.uncertain, stats.confirmed, stats.totalProposals, stats.alreadyExists]);

    // Filtered items
    const filteredMatches = useMemo(() => {
        return matches.filter((m) => {
            if (filter === 'uncertain' && m.status !== 'uncertain') return false;
            if (filter === 'confirmed' && m.status !== 'confirmed') return false;
            if (filter === 'no_match' && m.status !== 'no_match') return false;
            if (filter === 'already_exists' && m.status !== 'already_exists') return false;
            // In 'all' tab, show all active proposals (hide already_exists so it doesn't clutter)
            if (filter === 'all' && m.status === 'already_exists') return false;

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

    // Assign an image chosen from the uploaded file picker to a menu item or cover
    const handleAssignImage = (matchId: string) => {
        if (!pickingTarget) return;

        setMatches((prev) =>
            prev.map((m) => {
                // If this is the chosen image from the file
                if (m.id === matchId) {
                    if (pickingTarget.isCover) {
                        return {
                            ...m,
                            matchedCategoryId: pickingTarget.categoryId,
                            matchedCategoryName: pickingTarget.categoryName,
                            matchedItemId: null,
                            matchedItemName: 'غلاف القسم',
                            isCover: true,
                            confirmed: true,
                            status: 'confirmed',
                            score: 1.0,
                        };
                    } else {
                        return {
                            ...m,
                            matchedCategoryId: pickingTarget.categoryId,
                            matchedCategoryName: pickingTarget.categoryName,
                            matchedItemId: pickingTarget.itemId || null,
                            matchedItemName: pickingTarget.itemTitle,
                            isCover: false,
                            confirmed: true,
                            status: 'confirmed',
                            score: 1.0,
                        };
                    }
                }

                // If another image was previously assigned to this target, unassign it to avoid duplicates
                if (pickingTarget.isCover) {
                    if (m.isCover && m.matchedCategoryId === pickingTarget.categoryId) {
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
                } else if (pickingTarget.itemId && m.matchedItemId === pickingTarget.itemId) {
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

                return m;
            })
        );

        setPickingTarget(null);
        setPickerSearch('');
    };

    // Unassign an image from a menu item or cover
    const handleUnassignTarget = (itemId?: string, categoryId?: string, isCover?: boolean) => {
        setMatches((prev) =>
            prev.map((m) => {
                if (isCover && m.isCover && m.matchedCategoryId === categoryId) {
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
                if (!isCover && itemId && m.matchedItemId === itemId) {
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
                return m;
            })
        );
    };

    // Images available inside the picker modal
    const pickerCandidates = useMemo(() => {
        if (!pickingTarget) return [];

        return matches.filter((m) => {
            // Filter by usage
            if (pickerFilter === 'unused') {
                if (m.confirmed && (m.matchedItemId || (m.isCover && m.matchedCategoryId))) {
                    return false;
                }
            } else if (pickerFilter === 'category') {
                const fileCat = (m.fileCategoryName || '').toLowerCase().trim();
                const targetCat = pickingTarget.categoryName.toLowerCase().trim();
                const matchesCat = fileCat && (fileCat.includes(targetCat) || targetCat.includes(fileCat));
                if (!matchesCat && m.matchedCategoryId !== pickingTarget.categoryId) {
                    return false;
                }
            }

            // Filter by search term
            if (pickerSearch.trim()) {
                const term = pickerSearch.toLowerCase().trim();
                const fileMatch = m.fileName.toLowerCase().includes(term);
                const itemMatch = m.fileItemName?.toLowerCase().includes(term);
                const catMatch = m.fileCategoryName?.toLowerCase().includes(term);
                return fileMatch || itemMatch || catMatch;
            }

            return true;
        });
    }, [matches, pickingTarget, pickerFilter, pickerSearch]);

    // Compute smart suggestions for any menu item based on linguistic & category similarity
    const getSuggestedMatchesForItem = (
        target: { itemId?: string; itemTitle: string; categoryId: string; categoryName: string; isCover?: boolean },
        limit = 3
    ) => {
        const scored: { match: SmartMatchItem; itemScore: number; catScore: number; combinedScore: number }[] = [];

        for (const m of matches) {
            // Skip images confirmed for OTHER items
            if (m.confirmed && m.matchedItemId && m.matchedItemId !== target.itemId) {
                continue;
            }
            if (m.confirmed && m.isCover && m.matchedCategoryId && m.matchedCategoryId !== target.categoryId) {
                continue;
            }

            // Category similarity
            const catScore = m.fileCategoryName
                ? calculateCategorySimilarity(m.fileCategoryName, target.categoryName)
                : 0.5;

            if (target.isCover) {
                const isFileCover = m.fileItemName.toLowerCase() === 'cover' || m.isCover;
                if (isFileCover && catScore >= 0.5) {
                    scored.push({ match: m, itemScore: 1.0, catScore, combinedScore: catScore });
                }
                continue;
            }

            // Item linguistic similarity
            const itemScore = calculateSmartItemSimilarity(m.fileItemName, target.itemTitle, target.categoryName);

            if (itemScore >= 0.45) {
                const combinedScore = itemScore * 0.7 + catScore * 0.3;
                scored.push({ match: m, itemScore, catScore, combinedScore });
            }
        }

        scored.sort((a, b) => b.combinedScore - a.combinedScore);
        return scored.slice(0, limit);
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
                                {language === 'ar' ? 'كل المقترحات' : 'All Proposals'} ({stats.totalProposals})
                            </button>

                            {stats.alreadyExists > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setFilter('already_exists')}
                                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                        filter === 'already_exists'
                                            ? 'bg-slate-600 text-white shadow-sm'
                                            : 'text-silver hover:text-foreground'
                                    }`}
                                >
                                    <span>📦</span>
                                    {language === 'ar' ? 'مرفوعة مسبقاً' : 'Already Uploaded'}
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                                        {stats.alreadyExists}
                                    </span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setFilter('missing_items')}
                                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                    filter === 'missing_items'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-silver hover:text-foreground'
                                }`}
                            >
                                <span>🍽️</span>
                                {language === 'ar' ? 'أصناف بدون صورة' : 'Missing Photos'}
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                                    {stats.missingItems}
                                </span>
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

                    {/* Bulk Selection Actions or Missing Items Filter */}
                    {filter !== 'missing_items' ? (
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
                    ) : (
                        <div className="flex flex-wrap items-center justify-between text-xs text-silver gap-2 pt-1 border-t border-glass-border/40">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">
                                    {language === 'ar' ? 'عرض الأصناف:' : 'Show Items:'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setOnlyMissingInTab(true)}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                                        onlyMissingInTab
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-silver hover:text-foreground'
                                    }`}
                                >
                                    {language === 'ar' ? `الأصناف بدون صور فقط (${stats.missingItems})` : `Missing Only (${stats.missingItems})`}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOnlyMissingInTab(false)}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                                        !onlyMissingInTab
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-silver hover:text-foreground'
                                    }`}
                                >
                                    {language === 'ar' ? 'جميع أصناف المنيو' : 'All Menu Items'}
                                </button>
                            </div>
                            <div className="font-bold text-foreground">
                                {language === 'ar'
                                    ? `المعتمد للرفع: ${stats.activeSelected} صورة`
                                    : `Approved: ${stats.activeSelected}`}
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Body: Missing Items Mode or File Cards Mode */}
                {filter === 'missing_items' ? (
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950/30">
                        {/* Info Header Box */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 text-xs">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl shrink-0">✨</span>
                                <div>
                                    <span className="font-bold text-sm text-foreground block">
                                        {language === 'ar' ? 'ربط صور الأصناف والاقتراحات الذكية' : 'Item Photo Matching & Smart Suggestions'}
                                    </span>
                                    <span className="text-silver text-xs">
                                        {language === 'ar'
                                            ? 'اختر صورة من المجلد المرفوع لأي صنف لم ترفع صورته، أو اعتمد الاقتراحات اللغوية المطابقة بنقرة واحدة.'
                                            : 'Pick an image from the uploaded folder for any missing item, or accept smart suggestions.'}
                                    </span>
                                </div>
                            </div>
                            <div className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20 shrink-0">
                                {language === 'ar' ? `الأصناف المتبقية: ${stats.missingItems}` : `Remaining: ${stats.missingItems}`}
                            </div>
                        </div>

                        {/* Categories List */}
                        {categories.map((cat) => {
                            const itemsToShow = cat.items.filter((item) => {
                                const hasExisting = Boolean(item.image_url);
                                const assignedMatch = matches.find((m) => m.matchedItemId === item.id && m.confirmed);
                                if (onlyMissingInTab && hasExisting && !assignedMatch) return false;

                                if (searchTerm.trim()) {
                                    const term = searchTerm.toLowerCase();
                                    return item.title_ar.toLowerCase().includes(term) || cat.name_ar.toLowerCase().includes(term);
                                }
                                return true;
                            });

                            const hasCoverExisting = Boolean(cat.image_url);
                            const assignedCover = matches.find((m) => m.isCover && m.matchedCategoryId === cat.id && m.confirmed);
                            const showCover = !onlyMissingInTab || (!hasCoverExisting && !assignedCover);

                            if (itemsToShow.length === 0 && !showCover) return null;

                            return (
                                <div key={cat.id} className="rounded-2xl border border-glass-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                                    {/* Category Header */}
                                    <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/60 border-b border-glass-border flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">📂</span>
                                            <h3 className="font-bold text-sm text-foreground">{cat.name_ar}</h3>
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-silver font-mono">
                                                {itemsToShow.length} {language === 'ar' ? 'صنف' : 'items'}
                                            </span>
                                        </div>

                                        {/* Cover action */}
                                        <div>
                                            {assignedCover ? (
                                                <div className="flex items-center gap-2 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 text-xs">
                                                    <img src={assignedCover.previewUrl} alt="Cover" className="w-5 h-5 rounded object-cover" />
                                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                        {language === 'ar' ? '✓ تم تعيين غلاف للقسم' : 'Cover Assigned'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnassignTarget(undefined, cat.id, true)}
                                                        className="text-red-500 hover:text-red-600 text-xs px-1 font-bold cursor-pointer"
                                                        title={language === 'ar' ? 'إلغاء الغلاف' : 'Remove Cover'}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : hasCoverExisting ? (
                                                <span className="text-[11px] text-silver font-medium">
                                                    {language === 'ar' ? '🖼️ غلاف القسم موجود' : 'Cover exists'}
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setPickingTarget({
                                                        categoryId: cat.id,
                                                        categoryName: cat.name_ar,
                                                        itemTitle: `غلاف قسم: ${cat.name_ar}`,
                                                        isCover: true,
                                                    })}
                                                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-xs transition cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    {language === 'ar' ? 'اختيار غلاف للقسم' : 'Add Cover'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="divide-y divide-glass-border/50">
                                        {itemsToShow.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-silver">
                                                {language === 'ar' ? 'جميع أصناف هذا القسم مكتملة ولها صور' : 'All items in this category have photos'}
                                            </div>
                                        ) : (
                                            itemsToShow.map((item) => {
                                                const hasExisting = Boolean(item.image_url);
                                                const assignedMatch = matches.find((m) => m.matchedItemId === item.id && m.confirmed);
                                                const suggestions = !assignedMatch
                                                    ? getSuggestedMatchesForItem({
                                                          itemId: item.id,
                                                          itemTitle: item.title_ar,
                                                          categoryId: cat.id,
                                                          categoryName: cat.name_ar,
                                                      }, 2)
                                                    : [];

                                                return (
                                                    <div key={item.id} className="p-3 sm:p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            {/* Thumbnail */}
                                                            {assignedMatch ? (
                                                                <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0 bg-slate-100 dark:bg-slate-800 shadow-sm">
                                                                    <img src={assignedMatch.previewUrl} alt={item.title_ar} className="w-full h-full object-cover" />
                                                                </div>
                                                            ) : hasExisting ? (
                                                                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-glass-border shrink-0 bg-slate-100 dark:bg-slate-800">
                                                                    <img src={item.image_url} alt={item.title_ar} className="w-full h-full object-cover opacity-80" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-14 h-14 rounded-xl border-2 border-dashed border-silver/40 flex items-center justify-center text-silver shrink-0 bg-slate-100/50 dark:bg-slate-800/30">
                                                                    <ImageIcon className="w-6 h-6 opacity-40" />
                                                                </div>
                                                            )}

                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="font-bold text-sm text-foreground truncate">{item.title_ar}</h4>
                                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                    {assignedMatch ? (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                            <Check className="w-3 h-3" />
                                                                            {language === 'ar' ? 'تم اختيار صورة من الملف جاهزة للرفع' : 'Ready for upload'}
                                                                            <span className="font-mono text-[10px] text-silver mr-1">({assignedMatch.fileName})</span>
                                                                        </span>
                                                                    ) : hasExisting ? (
                                                                        <span className="text-[11px] text-silver">
                                                                            {language === 'ar' ? 'يمتلك صورة بالمنيو حالياً' : 'Has photo in menu'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                                                                            <X className="w-3 h-3" />
                                                                            {language === 'ar' ? 'لا توجد صورة' : 'No photo'}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Smart Suggestions on the item card */}
                                                                {!assignedMatch && suggestions.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                                                            <Sparkles className="w-3 h-3 text-amber-500" />
                                                                            {language === 'ar' ? 'اقتراح ذكي:' : 'Suggestion:'}
                                                                        </span>
                                                                        {suggestions.map(({ match, combinedScore }) => (
                                                                            <button
                                                                                key={match.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setPickingTarget({
                                                                                        categoryId: cat.id,
                                                                                        categoryName: cat.name_ar,
                                                                                        itemId: item.id,
                                                                                        itemTitle: item.title_ar,
                                                                                    });
                                                                                    setTimeout(() => {
                                                                                        handleAssignImage(match.id);
                                                                                    }, 0);
                                                                                }}
                                                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-foreground border border-amber-500/30 text-[11px] font-medium transition cursor-pointer hover:scale-[1.02]"
                                                                                title={language === 'ar' ? 'نقر سريع لاعتماد هذا الاقتراح' : 'Click to pick suggestion'}
                                                                            >
                                                                                <img src={match.previewUrl} alt="" className="w-4 h-4 rounded object-cover" />
                                                                                <span className="truncate max-w-[130px]">{match.fileItemName}</span>
                                                                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                                                                                    ({Math.round(combinedScore * 100)}%)
                                                                                </span>
                                                                                <span className="text-emerald-500 font-bold">✓</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                                                            {assignedMatch ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPickingTarget({
                                                                            categoryId: cat.id,
                                                                            categoryName: cat.name_ar,
                                                                            itemId: item.id,
                                                                            itemTitle: item.title_ar,
                                                                        })}
                                                                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground text-xs font-bold transition cursor-pointer"
                                                                    >
                                                                        {language === 'ar' ? 'تغيير الصورة' : 'Change'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUnassignTarget(item.id, cat.id, false)}
                                                                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold transition cursor-pointer"
                                                                    >
                                                                        {language === 'ar' ? 'إلغاء' : 'Remove'}
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPickingTarget({
                                                                        categoryId: cat.id,
                                                                        categoryName: cat.name_ar,
                                                                        itemId: item.id,
                                                                        itemTitle: item.title_ar,
                                                                    })}
                                                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                                                                >
                                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                                    {language === 'ar' ? 'اختيار صورة من الملف' : 'Pick Photo From File'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Regular Cards List */
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
                                                    {item.status === 'already_exists' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                                                            <span>📦</span>
                                                            {language === 'ar' ? 'يمتلك صورة بالفعل (تم التخطي تلقائياً)' : 'Already has photo (Skipped)'}
                                                        </span>
                                                    ) : item.status === 'confirmed' ? (
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
                                                    ? (item.status === 'already_exists'
                                                        ? (language === 'ar' ? '✓ معتمد للاستبدال' : 'Confirmed Replace')
                                                        : (language === 'ar' ? '✓ معتمد للرفع' : 'Confirmed'))
                                                    : (item.status === 'already_exists'
                                                        ? (language === 'ar' ? 'استبدال الصورة الحالية' : 'Replace Photo')
                                                        : (language === 'ar' ? 'نعم، هذه صورة الصنف' : 'Confirm Match'))}
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
                                                    ? (item.status === 'already_exists'
                                                        ? (language === 'ar' ? 'تخطي (الإبقاء على الحالية)' : 'Keep Existing')
                                                        : (language === 'ar' ? 'لا ترفع (اترك فارغاً)' : 'Skip / Empty'))
                                                    : (language === 'ar' ? 'إلغاء الاعتماد' : 'Unconfirm')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

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

            {/* Image Picker from File Modal */}
            {pickingTarget && (
                <div
                    className="fixed inset-0 z-[450] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden"
                    onClick={() => {
                        setPickingTarget(null);
                        setPickerSearch('');
                    }}
                >
                    <div
                        className="bg-white dark:bg-slate-900 border border-glass-border rounded-3xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-glass-border bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl shrink-0">
                                    🖼️
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                                        <span>{language === 'ar' ? 'اختيار صورة لـ:' : 'Choose photo for:'}</span>
                                        <span className="text-blue">{pickingTarget.itemTitle}</span>
                                    </h3>
                                    <p className="text-xs text-silver mt-0.5">
                                        {language === 'ar'
                                            ? `القسم: ${pickingTarget.categoryName} • انقر على أي صورة من الملف لربطها فوراً بهذا الصنف`
                                            : `Category: ${pickingTarget.categoryName} • Click any image to assign`}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setPickingTarget(null);
                                    setPickerSearch('');
                                }}
                                className="p-1.5 rounded-lg text-silver hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="p-3 sm:p-4 border-b border-glass-border bg-white dark:bg-slate-900 space-y-3 shrink-0">
                            {/* Smart Suggestions Bar inside Picker */}
                            {(() => {
                                const suggestions = getSuggestedMatchesForItem(pickingTarget, 4);
                                if (suggestions.length === 0) return null;
                                return (
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                            {language === 'ar' ? 'مقترحات ذكية بالذكاء اللغوي (انقر للاختيار الفوري):' : 'Smart Suggestions (Click to pick):'}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {suggestions.map(({ match, combinedScore }) => (
                                                <button
                                                    key={match.id}
                                                    type="button"
                                                    onClick={() => handleAssignImage(match.id)}
                                                    className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-amber-500/40 hover:border-amber-500 hover:scale-[1.02] transition text-right group cursor-pointer shadow-sm"
                                                >
                                                    <img src={match.previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-xs font-bold text-foreground block truncate group-hover:text-amber-600 transition">
                                                            {match.fileItemName}
                                                        </span>
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                                                            {Math.round(combinedScore * 100)}% {language === 'ar' ? 'تطابق' : 'match'}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Search and category chips */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setPickerFilter('all')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                            pickerFilter === 'all'
                                                ? 'bg-blue text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-silver hover:text-foreground'
                                        }`}
                                    >
                                        {language === 'ar' ? 'جميع صور الملف' : 'All Photos'} ({matches.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPickerFilter('category')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                            pickerFilter === 'category'
                                                ? 'bg-teal-600 text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-silver hover:text-foreground'
                                        }`}
                                    >
                                        {language === 'ar' ? `صور قسم "${pickingTarget.categoryName}"` : `Category: ${pickingTarget.categoryName}`}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPickerFilter('unused')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                            pickerFilter === 'unused'
                                                ? 'bg-slate-700 text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-silver hover:text-foreground'
                                        }`}
                                    >
                                        {language === 'ar' ? 'الصور غير المستخدمة فقط' : 'Unused Only'}
                                    </button>
                                </div>

                                <div className="relative w-full sm:w-64">
                                    <Search className="w-4 h-4 text-silver absolute right-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={pickerSearch}
                                        onChange={(e) => setPickerSearch(e.target.value)}
                                        placeholder={language === 'ar' ? 'بحث باسم الصورة...' : 'Search photo...'}
                                        className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-glass-border focus:border-blue outline-none"
                                    />
                                    {pickerSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setPickerSearch('')}
                                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-silver hover:text-foreground text-xs cursor-pointer"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Images Grid */}
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950/30">
                            {pickerCandidates.length === 0 ? (
                                <div className="text-center py-16 text-silver">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="font-bold text-sm">
                                        {language === 'ar' ? 'لا توجد صور مطابقة لخيارات البحث' : 'No photos found'}
                                    </p>
                                    {pickerFilter !== 'all' && (
                                        <button
                                            type="button"
                                            onClick={() => setPickerFilter('all')}
                                            className="mt-3 text-xs text-blue hover:underline font-bold cursor-pointer"
                                        >
                                            {language === 'ar' ? 'عرض جميع صور الملف بدلاً من ذلك' : 'Show all photos'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {pickerCandidates.map((m) => {
                                        const isCurrentTargetMatch = pickingTarget.isCover
                                            ? (m.isCover && m.matchedCategoryId === pickingTarget.categoryId)
                                            : (m.matchedItemId === pickingTarget.itemId);
                                        const isUsedElsewhere = m.confirmed && !isCurrentTargetMatch && (m.matchedItemId || m.isCover);

                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => handleAssignImage(m.id)}
                                                className={`group relative rounded-2xl border p-2 text-right transition flex flex-col items-stretch cursor-pointer hover:scale-105 active:scale-95 ${
                                                    isCurrentTargetMatch
                                                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500'
                                                        : isUsedElsewhere
                                                        ? 'border-amber-500/30 bg-amber-500/[0.03] opacity-75'
                                                        : 'border-glass-border bg-white dark:bg-slate-800 hover:border-teal-500 hover:shadow-lg'
                                                }`}
                                            >
                                                {/* Image */}
                                                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 mb-2">
                                                    <img src={m.previewUrl} alt={m.fileName} className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                                                    <div className="absolute inset-0 bg-teal-600/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs">
                                                        <span>{language === 'ar' ? '✓ اختيار' : 'Select'}</span>
                                                    </div>
                                                </div>

                                                {/* Details */}
                                                <span className="text-[11px] font-mono text-silver truncate block" title={m.fileName}>
                                                    {m.fileName}
                                                </span>
                                                <span className="text-[10px] font-bold text-foreground truncate block">
                                                    {m.fileItemName}
                                                </span>

                                                {/* Status badge */}
                                                <div className="mt-1">
                                                    {isCurrentTargetMatch ? (
                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                                                            ✓ {language === 'ar' ? 'الصورة الحالية' : 'Current'}
                                                        </span>
                                                    ) : isUsedElsewhere ? (
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block truncate" title={m.matchedItemName || ''}>
                                                            {language === 'ar' ? `مستخدم لـ: ${m.matchedItemName}` : `Used for: ${m.matchedItemName}`}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-silver block">
                                                            {language === 'ar' ? 'متاح للربط' : 'Available'}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3.5 border-t border-glass-border bg-slate-50 dark:bg-slate-900 flex justify-between items-center text-xs text-silver">
                            <span>
                                {language === 'ar' ? `المعروض: ${pickerCandidates.length} صورة` : `Showing ${pickerCandidates.length} photos`}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setPickingTarget(null);
                                    setPickerSearch('');
                                }}
                                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-foreground font-bold hover:opacity-80 transition cursor-pointer"
                            >
                                {language === 'ar' ? 'إغلاق' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
