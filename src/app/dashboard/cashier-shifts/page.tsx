"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { posDb } from "@/lib/pos-db";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency, formatDate, statusLabel, statusColor } from "@/lib/helpers/formatters";
import { browserPrint } from "@/lib/helpers/printEngine";
import {
    Users, ShoppingCart, DollarSign, Download, Printer,
    Calendar, Banknote, Tag, Truck, CreditCard, Smartphone,
    Clock, ChevronDown, ChevronUp, Search, ArrowUpRight,
    UserCheck, Package, Eye, EyeOff, ClipboardList
} from "lucide-react";

type DateRange = "today" | "yesterday" | "week" | "month" | "all" | "custom";

type OrderItem = {
    title: string;
    qty: number;
    price: number;
    category?: string;
    size?: string;
    notes?: string;
};

type OrderLike = {
    id: string;
    order_number?: number;
    status: string;
    is_draft?: boolean;
    total: number;
    subtotal?: number;
    deposit_amount?: number;
    delivery_fee?: number;
    discount?: number;
    discount_type?: string;
    payment_method?: string;
    order_type?: string;
    cashier_id?: string;
    cashier_name?: string;
    customer_name?: string;
    customer_phone?: string;
    source?: string;
    promotion_name?: string;
    items: OrderItem[];
    created_at: string;
    notes?: string;
};

type CashierAccount = {
    id: string;
    auth_id: string;
    name: string;
    role: string;
};

type CashierStats = {
    totalOrders: number;
    totalRevenue: number;
    totalCash: number;
    totalDiscount: number;
    totalDeliveryFees: number;
    avgTicket: number;
    completedOrders: number;
    cancelledOrders: number;
    pendingOrders: number;
    paymentBreakdown: Record<string, { count: number; revenue: number }>;
    orderTypeBreakdown: Record<string, { count: number; revenue: number }>;
};

const RANGE_LABELS_AR: Record<DateRange, string> = { today: "اليوم", yesterday: "أمس", week: "الأسبوع", month: "الشهر", all: "الكل", custom: "تحديد بالوقت" };
const RANGE_LABELS_EN: Record<DateRange, string> = { today: "Today", yesterday: "Yesterday", week: "Week", month: "Month", all: "All", custom: "Exact Time" };

const PAY_LABELS: Record<string, { ar: string; en: string }> = {
    cash: { ar: "كاش", en: "Cash" },
    card: { ar: "بطاقة", en: "Card" },
    online: { ar: "أونلاين", en: "Online" },
    visa: { ar: "فيزا", en: "Visa" },
    deposit: { ar: "عربون", en: "Deposit" },
};

const ORDER_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
    pickup: { ar: "تيك أواي", en: "Pickup" },
    delivery: { ar: "دليفري", en: "Delivery" },
    dine_in: { ar: "صالة", en: "Dine In" },
};

export default function CashierShiftsPage() {
    const { language } = useLanguage();
    const { restaurant, restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [range, setRange] = useState<DateRange>("today");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [loading, setLoading] = useState(true);
    const [cashiers, setCashiers] = useState<CashierAccount[]>([]);
    const [selectedCashierId, setSelectedCashierId] = useState<string>("all");
    const [orders, setOrders] = useState<OrderLike[]>([]);
    const [stats, setStats] = useState<CashierStats>({
        totalOrders: 0, totalRevenue: 0, totalCash: 0, totalDiscount: 0,
        totalDeliveryFees: 0, avgTicket: 0, completedOrders: 0, cancelledOrders: 0,
        pendingOrders: 0, paymentBreakdown: {}, orderTypeBreakdown: {},
    });
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showItemsInline, setShowItemsInline] = useState(false);

    // Fetch cashier accounts
    useEffect(() => {
        if (!restaurantId) return;
        const fetchCashiers = async () => {
            try {
                const { data } = await supabase
                    .from("team_members")
                    .select("id, auth_id, name, role")
                    .eq("restaurant_id", restaurantId)
                    .eq("is_active", true)
                    .in("role", ["cashier", "admin", "manager"]);
                if (data) setCashiers(data as CashierAccount[]);
            } catch { /* offline */ }
        };
        fetchCashiers();
    }, [restaurantId]);

    // Fetch & compute orders
    const fetchOrders = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);

        // 1. Local Dexie
        const localOrders = await posDb.orders
            .where("restaurant_id").equals(restaurantId)
            .and(o => !o.is_draft)
            .toArray();
        const localMapped: OrderLike[] = localOrders.map(o => {
            const oa = o as any;
            return {
                id: o.id,
                order_number: o.order_number,
                status: o.status,
                is_draft: o.is_draft,
                total: o.total || 0,
                subtotal: o.subtotal,
                deposit_amount: o.deposit_amount,
                delivery_fee: o.delivery_fee,
                discount: o.discount,
                discount_type: o.discount_type,
                payment_method: o.payment_method,
                order_type: o.order_type,
                cashier_id: o.cashier_id,
                cashier_name: o.cashier_name,
                customer_name: o.customer_name,
                customer_phone: o.customer_phone,
                source: oa.source,
                promotion_name: oa.promotion_name,
                items: (o.items || []).map((i: any) => ({ title: i.title, qty: i.qty, price: i.price, category: i.category, size: i.size, notes: i.notes })),
                created_at: o.created_at,
                notes: o.notes,
            };
        });

        // 2. Supabase
        let remoteOrders: OrderLike[] = [];
        try {
            const { data } = await supabase
                .from("orders")
                .select("id, order_number, status, is_draft, total, subtotal, deposit_amount, delivery_fee, discount, discount_type, payment_method, order_type, cashier_id, cashier_name, customer_name, customer_phone, source, promotion_name, items, created_at, notes")
                .eq("restaurant_id", restaurantId)
                .eq("is_draft", false);
            remoteOrders = ((data as OrderLike[]) || []).map(o => ({
                ...o,
                total: o.total || 0,
                items: (o.items || []) as OrderItem[],
            }));
        } catch { /* offline */ }

        // 3. Merge
        const mergedMap = new Map<string, OrderLike>();
        localMapped.forEach(o => mergedMap.set(o.id, o));
        remoteOrders.forEach(o => mergedMap.set(o.id, o));
        let allOrders = Array.from(mergedMap.values());

        // 4. Date filter
        const getLocalStartOfDay = (d: Date) => {
            const start = new Date(d);
            start.setHours(0, 0, 0, 0);
            return start;
        };
        const now = new Date();
        if (range === "today") {
            const startOfToday = getLocalStartOfDay(now);
            allOrders = allOrders.filter(o => new Date(o.created_at) >= startOfToday);
        } else if (range === "yesterday") {
            const startOfYesterday = getLocalStartOfDay(now);
            startOfYesterday.setDate(startOfYesterday.getDate() - 1);
            const endOfYesterday = new Date(startOfYesterday);
            endOfYesterday.setHours(23, 59, 59, 999);
            allOrders = allOrders.filter(o => {
                const d = new Date(o.created_at);
                return d >= startOfYesterday && d <= endOfYesterday;
            });
        } else if (range === "week") {
            const w = getLocalStartOfDay(now);
            w.setDate(w.getDate() - 7);
            allOrders = allOrders.filter(o => new Date(o.created_at) >= w);
        } else if (range === "month") {
            const m = getLocalStartOfDay(now);
            m.setMonth(m.getMonth() - 1);
            allOrders = allOrders.filter(o => new Date(o.created_at) >= m);
        } else if (range === "custom") {
            let start: Date | null = null;
            let end: Date | null = null;
            if (customStart) {
                start = customStart.includes("T") ? new Date(customStart) : new Date(customStart + "T00:00:00");
            }
            if (customEnd) {
                end = customEnd.includes("T") ? new Date(customEnd) : new Date(customEnd + "T23:59:59.999");
            }
            if (start && end) {
                allOrders = allOrders.filter(o => { const d = new Date(o.created_at); return d >= start! && d <= end!; });
            } else if (start) {
                allOrders = allOrders.filter(o => new Date(o.created_at) >= start!);
            } else if (end) {
                allOrders = allOrders.filter(o => new Date(o.created_at) <= end!);
            }
        }

        // 5. Cashier filter
        let filtered = allOrders;
        if (selectedCashierId !== "all") {
            const selectedCashier = cashiers.find(c => c.id === selectedCashierId);
            if (selectedCashier) {
                filtered = allOrders.filter(o =>
                    o.cashier_id === selectedCashier.auth_id ||
                    o.cashier_id === selectedCashier.id ||
                    o.cashier_name === selectedCashier.name
                );
            }
        }

        // Sort by date descending
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // 6. Compute stats (exclude cancelled from financial stats)
        const activeOrders = filtered.filter(o => o.status !== "cancelled");
        const totalRevenue = activeOrders.reduce((s, o) => s + (o.total || 0), 0);
        const totalCash = activeOrders.reduce((s, o) => {
            if (o.status === "completed" || o.payment_method === "cash") return s + (o.total || 0);
            else if (o.deposit_amount && o.deposit_amount > 0) return s + o.deposit_amount;
            return s;
        }, 0);
        const totalDiscount = activeOrders.reduce((s, o) => s + (o.discount || 0), 0);
        const totalDeliveryFees = activeOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0);
        const avgTicket = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

        const completedOrders = filtered.filter(o => o.status === "completed").length;
        const cancelledOrders = filtered.filter(o => o.status === "cancelled").length;
        const pendingOrders = filtered.filter(o => o.status === "pending" || o.status === "in_progress").length;

        // Payment breakdown
        const paymentBreakdown: Record<string, { count: number; revenue: number }> = {};
        activeOrders.forEach(o => {
            const method = o.payment_method || "cash";
            if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, revenue: 0 };
            paymentBreakdown[method].count++;
            paymentBreakdown[method].revenue += o.total || 0;
        });

        // Order type breakdown
        const orderTypeBreakdown: Record<string, { count: number; revenue: number }> = {};
        activeOrders.forEach(o => {
            const type = o.order_type || "pickup";
            if (!orderTypeBreakdown[type]) orderTypeBreakdown[type] = { count: 0, revenue: 0 };
            orderTypeBreakdown[type].count++;
            orderTypeBreakdown[type].revenue += o.total || 0;
        });

        setOrders(filtered);
        setStats({
            totalOrders: filtered.length, totalRevenue, totalCash, totalDiscount,
            totalDeliveryFees, avgTicket, completedOrders, cancelledOrders, pendingOrders,
            paymentBreakdown, orderTypeBreakdown,
        });
        setLoading(false);
    }, [restaurantId, range, customStart, customEnd, selectedCashierId, cashiers]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // Search filter
    const displayedOrders = searchQuery.trim()
        ? orders.filter(o =>
            (o.order_number?.toString() || "").includes(searchQuery) ||
            (o.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (o.customer_phone || "").includes(searchQuery)
        )
        : orders;

    // CSV export
    const exportCSV = () => {
        const headers = [
            isAr ? "رقم الطلب" : "Order #",
            isAr ? "التاريخ" : "Date",
            isAr ? "الكاشير" : "Cashier",
            isAr ? "العميل" : "Customer",
            isAr ? "الأصناف" : "Items",
            isAr ? "الإجمالي" : "Total",
            isAr ? "الخصم" : "Discount",
            isAr ? "نوع الخصم" : "Discount Type",
            isAr ? "رسوم التوصيل" : "Delivery Fee",
            isAr ? "طريقة الدفع" : "Payment",
            isAr ? "نوع الطلب" : "Order Type",
            isAr ? "الحالة" : "Status",
        ];
        const rows = displayedOrders.map(o => [
            o.order_number || o.id.split("-")[0],
            new Date(o.created_at).toLocaleString("ar-EG"),
            o.cashier_name || "-",
            o.customer_name || "-",
            (o.items || []).map(i => `${i.title} x${i.qty}`).join(" | "),
            o.total,
            o.discount || 0,
            o.discount_type || "-",
            o.delivery_fee || 0,
            o.payment_method || "cash",
            o.order_type || "pickup",
            o.status,
        ]);
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const cashierLabel = selectedCashierId === "all"
            ? (isAr ? "الكل" : "All")
            : cashiers.find(c => c.id === selectedCashierId)?.name || "";
        a.download = `${isAr ? "ورديات-الكاشير" : "cashier-shifts"}-${cashierLabel}-${RANGE_LABELS_AR[range]}.csv`;
        a.click();
    };

    // Print report
    const printReport = () => {
        const cashierLabel = selectedCashierId === "all"
            ? (isAr ? "جميع الكاشير" : "All Cashiers")
            : cashiers.find(c => c.id === selectedCashierId)?.name || "";
        let rangeLabel = isAr ? RANGE_LABELS_AR[range] : RANGE_LABELS_EN[range];
        if (range === "custom" && (customStart || customEnd)) {
            const fmtDT = (str: string) => {
                if (!str) return "-";
                const d = new Date(str.includes("T") ? str : str + "T00:00:00");
                return d.toLocaleString("ar-EG", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
            };
            rangeLabel = `${isAr ? "فترة محددة: من" : "From"} ${fmtDT(customStart)} ${isAr ? "إلى" : "to"} ${fmtDT(customEnd)}`;
        }
        const fmtPrice = (num: number) => new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);

        const ordersRows = displayedOrders.filter(o => o.status !== "cancelled").map(o => `
            <tr>
                <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:12px;font-weight:700;text-align:center">${o.order_number || o.id.split("-")[0].toUpperCase()}</td>
                <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:11px;font-weight:700;text-align:center" dir="ltr">${new Date(o.created_at).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</td>
                <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:12px;font-weight:700">${o.customer_name || "-"}</td>
                <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:12px;font-weight:700;text-align:center">${(o.items || []).reduce((s, i) => s + i.qty, 0)}</td>
                <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:12px;font-weight:700;text-align:center">${fmtPrice(o.total)}</td>
                <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:12px;font-weight:700;text-align:center;color:${(o.discount || 0) > 0 ? '#dc2626' : '#666'}">${(o.discount || 0) > 0 ? fmtPrice(o.discount!) : "-"}</td>
                <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:12px;font-weight:700;text-align:center">${o.payment_method === "cash" ? "كاش" : o.payment_method === "card" ? "بطاقة" : o.payment_method || "كاش"}</td>
            </tr>
        `).join("");

        const html = `<html><head><title>${isAr ? "تقرير ورديات الكاشير" : "Cashier Shifts Report"}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #000; padding: 20px; }
            @media print { body { padding: 10px; } }
        </style></head><body>
        <div style="text-align:center;margin-bottom:20px">
            <h1 style="font-size:22px;font-weight:900;margin-bottom:5px">${restaurant?.name || ""}</h1>
            <h2 style="font-size:18px;font-weight:900;border:2px solid #000;display:inline-block;padding:4px 16px;border-radius:8px;margin-bottom:8px">${isAr ? "تقرير ورديات الكاشير" : "Cashier Shifts Report"}</h2>
            <p style="font-size:14px;font-weight:700;color:#333">${isAr ? "الكاشير:" : "Cashier:"} ${cashierLabel} &nbsp;|&nbsp; ${isAr ? "الفترة:" : "Period:"} ${rangeLabel}</p>
            <p style="font-size:13px;font-weight:700;color:#555">${isAr ? "تاريخ الطباعة:" : "Print Date:"} ${new Date().toLocaleDateString("ar-EG")} - ${new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>

        <div style="border-top:2px dashed #000;margin:15px 0"></div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:14px;font-weight:900">
            <tr><td style="padding:6px 0">${isAr ? "عدد الطلبات:" : "Total Orders:"}</td><td style="text-align:left;padding:6px 0">${stats.totalOrders - stats.cancelledOrders}</td></tr>
            <tr><td style="padding:6px 0">${isAr ? "إجمالي المبيعات:" : "Total Revenue:"}</td><td style="text-align:left;padding:6px 0">${fmtPrice(stats.totalRevenue)}</td></tr>
            <tr><td style="padding:6px 0">${isAr ? "المحصلة النقدية:" : "Cash Collected:"}</td><td style="text-align:left;padding:6px 0">${fmtPrice(stats.totalCash)}</td></tr>
            <tr><td style="padding:6px 0">${isAr ? "إجمالي الخصومات:" : "Total Discounts:"}</td><td style="text-align:left;padding:6px 0;color:#dc2626">${fmtPrice(stats.totalDiscount)}</td></tr>
            <tr><td style="padding:6px 0">${isAr ? "رسوم التوصيل:" : "Delivery Fees:"}</td><td style="text-align:left;padding:6px 0">${fmtPrice(stats.totalDeliveryFees)}</td></tr>
            <tr><td style="padding:6px 0">${isAr ? "متوسط قيمة الطلب:" : "Avg Ticket:"}</td><td style="text-align:left;padding:6px 0">${fmtPrice(stats.avgTicket)}</td></tr>
        </table>

        <div style="border-top:2px dashed #000;margin:15px 0"></div>

        <h3 style="font-size:16px;font-weight:900;margin-bottom:10px;text-align:center">${isAr ? "تفاصيل الطلبات" : "Order Details"}</h3>
        <table style="width:100%;border-collapse:collapse;font-weight:700">
            <thead>
                <tr style="background:#f3f4f6">
                    <th style="padding:6px;border-bottom:2px solid #000;font-size:12px;text-align:center">#</th>
                    <th style="padding:6px;border-bottom:2px solid #000;font-size:12px;text-align:center">${isAr ? "الوقت" : "Time"}</th>
                    <th style="padding:6px;border-bottom:2px solid #000;font-size:12px">${isAr ? "العميل" : "Customer"}</th>
                    <th style="padding:6px;border-bottom:2px solid #000;font-size:12px;text-align:center">${isAr ? "أصناف" : "Items"}</th>
                    <th style="padding:6px;border-bottom:2px solid #000;font-size:12px;text-align:center">${isAr ? "الإجمالي" : "Total"}</th>
                    <th style="padding:6px;border-bottom:2px solid #000;font-size:12px;text-align:center">${isAr ? "الخصم" : "Disc."}</th>
                    <th style="padding:6px;border-bottom:2px solid #000;font-size:12px;text-align:center">${isAr ? "الدفع" : "Pay"}</th>
                </tr>
            </thead>
            <tbody>${ordersRows}</tbody>
        </table>

        <div style="border-top:2px solid #000;margin:25px 0"></div>

        <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:14px;font-weight:900">
            <div style="text-align:center;width:45%;border-top:1px solid #000;padding-top:8px">${isAr ? "توقيع الكاشير" : "Cashier Sign"}</div>
            <div style="text-align:center;width:45%;border-top:1px solid #000;padding-top:8px">${isAr ? "توقيع المدير" : "Manager Sign"}</div>
        </div>

        <div style="text-align:center;font-size:12px;margin-top:30px;font-weight:700;color:#666">
            <p>${isAr ? "تم طباعة التقرير من النظام" : "Printed from ASN System"}</p>
        </div>
        </body></html>`;

        browserPrint(html);
    };

    const getPayLabel = (method: string) => {
        const info = PAY_LABELS[method];
        return info ? (isAr ? info.ar : info.en) : method;
    };

    const getOrderTypeLabel = (type: string) => {
        const info = ORDER_TYPE_LABELS[type];
        return info ? (isAr ? info.ar : info.en) : type;
    };

    const handleRangeSelect = (r: DateRange) => {
        setRange(r);
        if (r === "custom" && !customStart && !customEnd) {
            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, "0");
            const yyyy = now.getFullYear();
            const mm = pad(now.getMonth() + 1);
            const dd = pad(now.getDate());
            setCustomStart(`${yyyy}-${mm}-${dd}T00:00`);
            setCustomEnd(`${yyyy}-${mm}-${dd}T23:59`);
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <UserCheck className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                        {isAr ? "ورديات الكاشير" : "Cashier Shifts"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">
                        {isAr ? "سجل أوردرات كل كاشير وتفاصيل الورديات" : "Order log for each cashier and shift details"}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={printReport}
                        className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 rounded-xl text-sm font-bold hover:bg-violet-100 dark:hover:bg-violet-500/20 transition">
                        <Printer className="w-3.5 h-3.5" /> {isAr ? "طباعة التقرير" : "Print Report"}
                    </button>
                    <button onClick={exportCSV}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-glass-border rounded-xl text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition">
                        <Download className="w-3.5 h-3.5" /> {isAr ? "تصدير CSV" : "Export CSV"}
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3 items-center">
                {/* Cashier Selector */}
                <div className="flex items-center gap-2 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl px-3 py-2">
                    <Users className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                    <select
                        value={selectedCashierId}
                        onChange={e => setSelectedCashierId(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-700 dark:text-zinc-300 outline-none cursor-pointer min-w-[120px]"
                    >
                        <option value="all">{isAr ? "جميع الكاشير" : "All Cashiers"}</option>
                        {cashiers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.role === "cashier" ? (isAr ? "كاشير" : "Cashier") : c.role === "admin" ? (isAr ? "مدير" : "Admin") : (isAr ? "مدير" : "Manager")})</option>
                        ))}
                    </select>
                </div>

                {/* Date Range Buttons */}
                <div className="flex flex-wrap gap-1.5 items-center">
                    {(["today", "yesterday", "week", "month", "all", "custom"] as DateRange[]).map(r => (
                        <button key={r} onClick={() => handleRangeSelect(r)}
                            className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${range === r ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20" : "bg-white dark:bg-card text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-800/50 hover:text-slate-900 dark:hover:text-white"}`}>
                            {isAr ? RANGE_LABELS_AR[r] : RANGE_LABELS_EN[r]}
                        </button>
                    ))}
                </div>

                {/* Custom Date & Exact Time Filter */}
                {range === "custom" && (
                    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-card border border-violet-200 dark:border-violet-500/30 rounded-xl px-3 py-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">{isAr ? "من:" : "From:"}</span>
                            <input
                                type="datetime-local"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/50 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-zinc-200 outline-none font-bold cursor-pointer"
                            />
                        </div>
                        <span className="text-slate-400 dark:text-zinc-600 font-bold">–</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">{isAr ? "إلى:" : "To:"}</span>
                            <input
                                type="datetime-local"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/50 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-zinc-200 outline-none font-bold cursor-pointer"
                            />
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                        {[
                            { icon: ShoppingCart, label: isAr ? "عدد الطلبات" : "Total Orders", val: stats.totalOrders.toString(), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
                            { icon: DollarSign, label: isAr ? "إجمالي المبيعات" : "Total Revenue", val: formatCurrency(stats.totalRevenue, restaurant?.currency), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-glass-border" },
                            { icon: Banknote, label: isAr ? "المحصلة النقدية" : "Cash Collected", val: formatCurrency(stats.totalCash, restaurant?.currency), color: "text-slate-600 dark:text-zinc-400", bg: "bg-slate-50 dark:bg-zinc-800/20 border-slate-200 dark:border-zinc-700/30" },
                            { icon: Tag, label: isAr ? "إجمالي الخصومات" : "Total Discounts", val: formatCurrency(stats.totalDiscount, restaurant?.currency), color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
                            { icon: Truck, label: isAr ? "رسوم التوصيل" : "Delivery Fees", val: formatCurrency(stats.totalDeliveryFees, restaurant?.currency), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
                            { icon: ArrowUpRight, label: isAr ? "متوسط الطلب" : "Avg Ticket", val: formatCurrency(stats.avgTicket, restaurant?.currency), color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20" },
                        ].map((card, i) => (
                            <div key={i} className={`bg-white dark:bg-card border ${card.bg} rounded-xl p-4 flex items-center gap-3`}>
                                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.color} flex-shrink-0`}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase mb-0.5 truncate">{card.label}</p>
                                    <p className={`text-lg font-extrabold ${card.color} tabular-nums`}>{card.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Status & Payment Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Order Status Summary */}
                        <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                            <h3 className="text-sm font-extrabold text-slate-700 dark:text-zinc-200 mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-500" /> {isAr ? "حالة الطلبات" : "Order Status"}
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "مكتمل" : "Done"}</p>
                                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.completedOrders}</p>
                                </div>
                                <div className="text-center p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "قيد التنفيذ" : "Active"}</p>
                                    <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{stats.pendingOrders}</p>
                                </div>
                                <div className="text-center p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "ملغي" : "Cancelled"}</p>
                                    <p className="text-xl font-extrabold text-red-600 dark:text-red-400">{stats.cancelledOrders}</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                            <h3 className="text-sm font-extrabold text-slate-700 dark:text-zinc-200 mb-3 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-violet-500" /> {isAr ? "طرق الدفع" : "Payment Methods"}
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(stats.paymentBreakdown).map(([method, data]) => (
                                    <div key={method} className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-slate-600 dark:text-zinc-400">{getPayLabel(method)}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 dark:text-zinc-500 font-bold">{data.count} {isAr ? "طلب" : "orders"}</span>
                                            <span className="font-extrabold text-slate-700 dark:text-zinc-200 tabular-nums">{formatCurrency(data.revenue, restaurant?.currency)}</span>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(stats.paymentBreakdown).length === 0 && (
                                    <p className="text-xs text-slate-400 dark:text-zinc-600 font-bold text-center py-2">{isAr ? "لا توجد بيانات" : "No data"}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Type Breakdown */}
                    {Object.keys(stats.orderTypeBreakdown).length > 0 && (
                        <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                            <h3 className="text-sm font-extrabold text-slate-700 dark:text-zinc-200 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-amber-500" /> {isAr ? "أنواع الطلبات" : "Order Types"}
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(stats.orderTypeBreakdown).map(([type, data]) => (
                                    <div key={type} className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-800/30 border border-slate-200 dark:border-zinc-700/30 rounded-xl px-4 py-3">
                                        <span className="font-bold text-slate-600 dark:text-zinc-400">{getOrderTypeLabel(type)}</span>
                                        <span className="text-xs bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-md font-bold">{data.count}</span>
                                        <span className="font-extrabold text-slate-700 dark:text-zinc-200 tabular-nums">{formatCurrency(data.revenue, restaurant?.currency)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Orders Table */}
                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800/50 flex-wrap gap-3">
                            <h3 className="text-base font-extrabold text-slate-700 dark:text-zinc-200 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-violet-500" />
                                {isAr ? "سجل الأوردرات" : "Orders Log"}
                                <span className="text-xs bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-md font-bold">{displayedOrders.length}</span>
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/30 border border-slate-200 dark:border-zinc-700/30 rounded-xl px-3 py-2">
                                    <Search className="w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={isAr ? "بحث برقم الطلب أو اسم العميل..." : "Search by order # or customer..."}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="bg-transparent text-sm text-slate-700 dark:text-zinc-300 outline-none w-48"
                                    />
                                </div>
                                <button onClick={() => setShowItemsInline(!showItemsInline)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-zinc-800/30 text-slate-500 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700/30 rounded-xl text-xs font-bold hover:text-slate-900 dark:hover:text-white transition"
                                    title={isAr ? "عرض/إخفاء الأصناف" : "Show/Hide items"}>
                                    {showItemsInline ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {isAr ? "الأصناف" : "Items"}
                                </button>
                            </div>
                        </div>

                        {displayedOrders.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 dark:text-zinc-600">
                                <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-bold">{isAr ? "لا توجد أوردرات في هذه الفترة" : "No orders in this period"}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                                <table className="w-full min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-zinc-800/30 border-b border-slate-200 dark:border-zinc-800/50">
                                            <th className="px-4 py-3 text-xs font-extrabold text-slate-500 dark:text-zinc-500 text-right">#</th>
                                            <th className="px-4 py-3 text-xs font-extrabold text-slate-500 dark:text-zinc-500 text-right">{isAr ? "التاريخ" : "Date"}</th>
                                            <th className="px-4 py-3 text-xs font-extrabold text-slate-500 dark:text-zinc-500 text-right">{isAr ? "الكاشير" : "Cashier"}</th>
                                            <th className="px-4 py-3 text-xs font-extrabold text-slate-500 dark:text-zinc-500 text-right">{isAr ? "العميل" : "Customer"}</th>
                                            <th className="px-4 py-3 text-xs font-extrabold text-slate-500 dark:text-zinc-500 text-center">{isAr ? "الأصناف" : "Items"}</th>
                                            <th className="px-4 py-3 text-xs font-extrabold text-slate-500 dark:text-zinc-500 text-center">{isAr ? "الإجمالي" : "Total"}</th>
                                            <th className="px-4 py-3 text-xs font-extrabold text-slate-500 dark:text-zinc-500 text-center">{isAr ? "الخصم" : "Discount"}</th>
                                            <th className="px-4 py-3 text-xs font-extrabold text-slate-500 dark:text-zinc-500 text-center">{isAr ? "الدفع" : "Payment"}</th>
                                            <th className="px-4 py-3 text-xs font-extrabold text-slate-500 dark:text-zinc-500 text-center">{isAr ? "النوع" : "Type"}</th>
                                            <th className="px-4 py-3 text-xs font-extrabold text-slate-500 dark:text-zinc-500 text-center">{isAr ? "الحالة" : "Status"}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedOrders.map((order) => (
                                            <tr key={order.id}
                                                className="border-b border-slate-100 dark:border-zinc-800/30 hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition cursor-pointer"
                                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                                                {/* Order Number */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        {expandedOrder === order.id ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                                        <span className="text-sm font-extrabold text-slate-700 dark:text-zinc-200">#{order.order_number || order.id.split("-")[0].toUpperCase()}</span>
                                                    </div>
                                                </td>
                                                {/* Date */}
                                                <td className="px-4 py-3">
                                                    <p className="text-xs font-bold text-slate-600 dark:text-zinc-400">{new Date(order.created_at).toLocaleDateString("ar-EG")}</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-zinc-600 font-bold">{new Date(order.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</p>
                                                </td>
                                                {/* Cashier */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{order.cashier_name || (isAr ? "غير محدد" : "N/A")}</span>
                                                </td>
                                                {/* Customer */}
                                                <td className="px-4 py-3">
                                                    <p className="text-xs font-bold text-slate-600 dark:text-zinc-400 truncate max-w-[120px]">{order.customer_name || "-"}</p>
                                                </td>
                                                {/* Items Count */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-sm font-extrabold text-slate-700 dark:text-zinc-200">{(order.items || []).reduce((s, i) => s + i.qty, 0)}</span>
                                                </td>
                                                {/* Total */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(order.total, restaurant?.currency)}</span>
                                                </td>
                                                {/* Discount */}
                                                <td className="px-4 py-3 text-center">
                                                    {(order.discount || 0) > 0 ? (
                                                        <div>
                                                            <span className="text-xs font-extrabold text-red-600 dark:text-red-400 tabular-nums">-{formatCurrency(order.discount!, restaurant?.currency)}</span>
                                                            {order.discount_type && <p className="text-[9px] text-red-400 dark:text-red-500 font-bold">{order.discount_type === "percent" ? "%" : order.discount_type === "fixed" ? (isAr ? "ثابت" : "Fixed") : order.discount_type}</p>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-300 dark:text-zinc-700">—</span>
                                                    )}
                                                </td>
                                                {/* Payment */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-[10px] bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 px-2 py-1 rounded-md font-bold">{getPayLabel(order.payment_method || "cash")}</span>
                                                </td>
                                                {/* Order Type */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md font-bold">{getOrderTypeLabel(order.order_type || "pickup")}</span>
                                                </td>
                                                {/* Status */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-[10px] px-2 py-1 rounded-md font-bold border ${statusColor(order.status)}`}>{statusLabel(order.status, isAr)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Expanded Order Details */}
                                {expandedOrder && (() => {
                                    const order = displayedOrders.find(o => o.id === expandedOrder);
                                    if (!order) return null;
                                    return (
                                        <div className="border-t border-violet-200 dark:border-violet-500/20 bg-violet-50/30 dark:bg-violet-500/5 p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Items list */}
                                                <div>
                                                    <h4 className="text-xs font-extrabold text-violet-600 dark:text-violet-400 mb-2 flex items-center gap-1">
                                                        <Package className="w-3.5 h-3.5" /> {isAr ? "الأصناف" : "Items"}
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {(order.items || []).map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-violet-100 dark:border-violet-500/10 last:border-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 w-5 h-5 rounded flex items-center justify-center font-bold">{item.qty}</span>
                                                                    <span className="font-bold text-slate-700 dark:text-zinc-300 text-xs">{item.title}</span>
                                                                    {item.size && item.size !== "عادي" && <span className="text-[9px] text-slate-400 dark:text-zinc-600 font-bold">({item.size})</span>}
                                                                </div>
                                                                <span className="text-xs font-extrabold text-slate-600 dark:text-zinc-400 tabular-nums">{formatCurrency(item.price * item.qty, restaurant?.currency)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Order details */}
                                                <div className="space-y-2 text-xs">
                                                    <h4 className="font-extrabold text-violet-600 dark:text-violet-400 mb-2 flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" /> {isAr ? "تفاصيل إضافية" : "More Details"}
                                                    </h4>
                                                    {order.customer_phone && (
                                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "رقم العميل:" : "Phone:"}</span><span className="font-bold text-slate-700 dark:text-zinc-300" dir="ltr">{order.customer_phone}</span></div>
                                                    )}
                                                    {order.source && (
                                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "المصدر:" : "Source:"}</span><span className="font-bold text-slate-700 dark:text-zinc-300">{order.source === "pos" ? "POS" : order.source === "website" ? (isAr ? "الموقع" : "Website") : order.source}</span></div>
                                                    )}
                                                    {order.promotion_name && (
                                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "العرض:" : "Promo:"}</span><span className="font-bold text-violet-600 dark:text-violet-400">{order.promotion_name}</span></div>
                                                    )}
                                                    {(order.delivery_fee || 0) > 0 && (
                                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "رسوم التوصيل:" : "Delivery Fee:"}</span><span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(order.delivery_fee!, restaurant?.currency)}</span></div>
                                                    )}
                                                    {order.deposit_amount && order.deposit_amount > 0 && (
                                                        <>
                                                            <div className="flex justify-between"><span className="text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "العربون:" : "Deposit:"}</span><span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{formatCurrency(order.deposit_amount, restaurant?.currency)}</span></div>
                                                            <div className="flex justify-between"><span className="text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "الباقي:" : "Remaining:"}</span><span className="font-extrabold text-red-600 dark:text-red-400 tabular-nums">{formatCurrency(Math.max(0, order.total - order.deposit_amount), restaurant?.currency)}</span></div>
                                                        </>
                                                    )}
                                                    {order.notes && (
                                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "ملاحظات:" : "Notes:"}</span><span className="font-bold text-slate-700 dark:text-zinc-300">{order.notes}</span></div>
                                                    )}
                                                    <div className="flex justify-between pt-2 border-t border-violet-200 dark:border-violet-500/10">
                                                        <span className="text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "التاريخ الكامل:" : "Full Date:"}</span>
                                                        <span className="font-bold text-slate-700 dark:text-zinc-300">{formatDate(order.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
