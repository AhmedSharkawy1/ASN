// Currency formatter
export function formatCurrency(amount: number, currency: string = "EGP", locale: string = "ar-EG"): string {
    return new Intl.NumberFormat(locale, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount) + ` ${currency === "EGP" ? "ج.م" : currency}`;
}

// Date formatter
export function formatDate(date: string | Date, locale: string = "ar-EG"): string {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

// Relative time
export function timeAgo(date: string | Date, isAr: boolean = true): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return isAr ? "الآن" : "just now";
    if (mins < 60) return isAr ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return isAr ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return isAr ? `منذ ${days} يوم` : `${days}d ago`;
}

// Order status labels — Simplified 3-state system
export const ORDER_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export function statusLabel(status: string, isAr: boolean = true): string {
    const map: Record<string, { ar: string; en: string }> = {
        pending: { ar: "قيد الانتظار", en: "Pending" },
        in_progress: { ar: "تحت التنفيذ", en: "In Progress" },
        // Backward compatibility for old statuses
        accepted: { ar: "تحت التنفيذ", en: "In Progress" },
        preparing: { ar: "تحت التنفيذ", en: "In Progress" },
        ready: { ar: "تحت التنفيذ", en: "In Progress" },
        out_for_delivery: { ar: "تحت التنفيذ", en: "In Progress" },
        completed: { ar: "مكتمل", en: "Completed" },
        cancelled: { ar: "ملغي", en: "Cancelled" },
    };
    return map[status]?.[isAr ? "ar" : "en"] || status;
}

export function statusColor(status: string): string {
    // Map old statuses to new groups
    const normalized = ["accepted", "preparing", "ready", "out_for_delivery"].includes(status) ? "in_progress" : status;
    const map: Record<string, string> = {
        pending: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
        in_progress: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
        completed: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        cancelled: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
    };
    return map[normalized] || "bg-zinc-500/20 text-zinc-400";
}

// Next valid statuses for transition — source-aware
// Website orders: pending → in_progress (confirm) → completed
// POS orders: pending → in_progress → completed (can also skip to completed)
export function nextStatuses(current: string, source?: string): string[] {
    // Normalize old statuses
    const normalized = ["accepted", "preparing", "ready", "out_for_delivery"].includes(current) ? "in_progress" : current;

    const transitions: Record<string, string[]> = {
        pending: source === "pos" ? ["in_progress", "completed", "cancelled"] : ["in_progress", "cancelled"],
        in_progress: ["completed", "cancelled"],
        completed: [],
        cancelled: [],
    };
    return transitions[normalized] || [];
}

// Elapsed time display
export function elapsedTime(createdAt: string | Date, isAr: boolean = true): { text: string; isDelayed: boolean } {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    const isDelayed = mins > 30;
    if (mins < 1) return { text: isAr ? "<1 دقيقة" : "<1 min", isDelayed: false };
    if (mins < 60) return { text: isAr ? `${mins} دقيقة` : `${mins} min`, isDelayed };
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return { text: isAr ? `${hrs} ساعة ${rem} دقيقة` : `${hrs}h ${rem}m`, isDelayed };
}

// Quantity and Unit Formatter
export function formatQuantity(qty: number, unit: string, isAr: boolean = true): { qty: string; unit: string } {
    let finalQty = Number(qty.toFixed(3));
    let finalUnit = unit;

    const kgUnits = ['kg', 'kilogram', 'كيلو', 'كجم'];
    const isKg = kgUnits.includes(unit.toLowerCase());

    if (isKg && finalQty < 1 && finalQty > 0) {
        finalQty = Number((finalQty * 1000).toFixed(0));
        finalUnit = isAr ? 'جرام' : 'gram';
    } else {
        // Just clean up trailing zeros from toFixed(3)
        finalQty = Number(finalQty.toFixed(3));
    }

    // Map units for display labels if needed
    const unitMap: Record<string, { ar: string, en: string }> = {
        kg: { ar: 'كيلو', en: 'kg' },
        gram: { ar: 'جرام', en: 'gram' },
        piece: { ar: 'قطعة', en: 'piece' },
        liter: { ar: 'لتر', en: 'liter' },
        pack: { ar: 'باكيت', en: 'pack' },
        unit: { ar: 'وحدة', en: 'unit' }
    };

    const label = unitMap[finalUnit.toLowerCase()]?.[isAr ? 'ar' : 'en'] || finalUnit;

    return { 
        qty: finalQty.toString(), 
        unit: label 
    };
}
