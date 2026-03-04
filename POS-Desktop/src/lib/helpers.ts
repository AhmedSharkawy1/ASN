export function formatCurrency(amount: number): string {
    return `${parseFloat(amount.toFixed(2))} ج.م`;
}

export function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('ar-EG')} ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
}

export function timeAgo(dateStr: string): string {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    const days = Math.floor(hrs / 24);
    return `منذ ${days} يوم`;
}

export const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    accepted: 'مقبول',
    preparing: 'قيد التحضير',
    ready: 'جاهز',
    out_for_delivery: 'في الطريق',
    completed: 'مكتمل',
    cancelled: 'ملغي',
};

export const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    accepted: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    preparing: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    ready: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    out_for_delivery: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    completed: 'bg-green-500/15 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export const nextStatuses: Record<string, string[]> = {
    pending: ['accepted', 'cancelled'],
    accepted: ['preparing', 'cancelled'],
    preparing: ['ready'],
    ready: ['out_for_delivery', 'completed'],
    out_for_delivery: ['completed'],
};
