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

// Order status labels
export const ORDER_STATUSES = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export function statusLabel(status: string, isAr: boolean = true): string {
    const map: Record<string, { ar: string; en: string }> = {
        pending: { ar: "قيد الانتظار", en: "Pending" },
        accepted: { ar: "مقبول", en: "Accepted" },
        preparing: { ar: "قيد التحضير", en: "Preparing" },
        ready: { ar: "جاهز", en: "Ready" },
        out_for_delivery: { ar: "في الطريق", en: "Out for Delivery" },
        completed: { ar: "مكتمل", en: "Completed" },
        cancelled: { ar: "ملغي", en: "Cancelled" },
    };
    return map[status]?.[isAr ? "ar" : "en"] || status;
}

export function statusColor(status: string): string {
    const map: Record<string, string> = {
        pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        accepted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        preparing: "bg-violet-500/20 text-violet-400 border-violet-500/30",
        ready: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        out_for_delivery: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        completed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
        cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return map[status] || "bg-zinc-500/20 text-zinc-400";
}

// Next valid statuses for transition validation
export function nextStatuses(current: string): string[] {
    const transitions: Record<string, string[]> = {
        pending: ["accepted", "cancelled"],
        accepted: ["preparing", "cancelled"],
        preparing: ["ready", "cancelled"],
        ready: ["out_for_delivery", "completed"],
        out_for_delivery: ["completed"],
        completed: [],
        cancelled: [],
    };
    return transitions[current] || [];
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
