"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCostAnalytics, calculateOrderCost } from "@/lib/helpers/costService";
import { TrendingUp, DollarSign, BarChart3, ArrowUp, ArrowDown, Percent, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

type ProductProfit = {
    title: string;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    orderCount: number;
    margin: number;
};

export default function CostAnalyticsPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [analytics, setAnalytics] = useState({ totalRevenue: 0, totalCost: 0, totalProfit: 0, avgMargin: 0, orderCount: 0 });
    const [productProfits, setProductProfits] = useState<ProductProfit[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [recalculating, setRecalculating] = useState(false);

    const fetchAnalytics = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);

        // Get summary analytics
        const summary = await getCostAnalytics(restaurantId, dateFrom || undefined, dateTo || undefined);
        setAnalytics(summary);

        // Get current product costs from items and recipes to proportionally distribute historical order cost
        const { data: menuItems } = await supabase
            .from('items')
            .select('id, title, recipes(product_cost)')
            .eq('restaurant_id', restaurantId);

        const itemCostMap = new Map<string, number>();
        const titleCostMap = new Map<string, number>();

        interface MenuItemData {
            id: string;
            title: string;
            recipes: { product_cost: number } | { product_cost: number }[] | null;
        }

        if (menuItems) {
            (menuItems as unknown as MenuItemData[]).forEach((mi) => {
                const recipes = mi.recipes;
                const cost = Array.isArray(recipes) 
                    ? (recipes[0]?.product_cost || 0) 
                    : (recipes?.product_cost || 0);
                itemCostMap.set(mi.id, cost);
                titleCostMap.set(mi.title, cost);
            });
        }

        // Get per-product profitability
        let query = supabase.from('orders').select('items, total, order_cost, order_profit')
            .eq('restaurant_id', restaurantId).eq('is_draft', false).not('order_cost', 'is', null);
        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');
        const { data: orders } = await query;

        interface OrderItem {
            id?: string;
            title?: string;
            qty?: number;
            price?: number;
        }

        interface OrderData {
            items: OrderItem[] | null;
            order_cost: number | null;
        }

        if (orders) {
            const productMap = new Map<string, { revenue: number; cost: number; profit: number; count: number }>();
            (orders as unknown as OrderData[]).forEach((order) => {
                const items = order.items || [];
                
                // Calculate current sum of costs for these items to find the proportional ratio
                let currTotalCost = 0;
                items.forEach((item) => {
                    const itemId = item.id;
                    const title = item.title || "Unknown";
                    let unitCost = 0;
                    if (itemId && itemCostMap.has(itemId)) unitCost = itemCostMap.get(itemId) || 0;
                    else if (titleCostMap.has(title)) unitCost = titleCostMap.get(title) || 0;
                    currTotalCost += unitCost * (item.qty || 1);
                });

                const historicalOrderCost = order.order_cost || 0;
                const adjustmentRatio = currTotalCost > 0 ? historicalOrderCost / currTotalCost : 0;
                const totalItemQty = items.reduce((s: number, i) => s + (i.qty || 1), 0);

                items.forEach((item) => {
                    const title = item.title || "Unknown";
                    const itemId = item.id;
                    const qty = item.qty || 1;
                    const revenue = (item.price || 0) * qty;
                    
                    let cost = 0;
                    if (currTotalCost > 0) {
                        let unitCost = 0;
                        if (itemId && itemCostMap.has(itemId)) unitCost = itemCostMap.get(itemId) || 0;
                        else if (titleCostMap.has(title)) unitCost = titleCostMap.get(title) || 0;
                        cost = (unitCost * qty) * adjustmentRatio;
                    } else {
                        // Fallback: distribute evenly based on quantity if no products have known costs
                        cost = totalItemQty > 0 ? historicalOrderCost * (qty / totalItemQty) : 0;
                    }

                    const existing = productMap.get(title);
                    if (existing) {
                        existing.revenue += revenue;
                        existing.cost += cost;
                        existing.profit += revenue - cost;
                        existing.count += qty;
                    } else {
                        productMap.set(title, { revenue, cost, profit: revenue - cost, count: qty });
                    }
                });
            });

            const profitList: ProductProfit[] = Array.from(productMap.entries()).map(([title, data]) => ({
                title,
                totalRevenue: Math.round(data.revenue * 100) / 100,
                totalCost: Math.round(data.cost * 100) / 100,
                totalProfit: Math.round(data.profit * 100) / 100,
                orderCount: data.count,
                margin: data.revenue > 0 ? Math.round((data.profit / data.revenue) * 10000) / 100 : 0
            }));

            profitList.sort((a, b) => b.totalProfit - a.totalProfit);
            setProductProfits(profitList);
        }

        setLoading(false);
    }, [restaurantId, dateFrom, dateTo]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const formatCurrency = (v: number) => `${v.toFixed(2)}`;

    if (loading && analytics.orderCount === 0 && productProfits.length === 0) {
        return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;
    }

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    {isAr ? "التكاليف والأرباح" : "Cost & Profit Analytics"}
                </h1>
                <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">{isAr ? "تحليل تكاليف المنتجات وأرباح الطلبات" : "Product cost analysis and order profitability"}</p>
            </div>

            {/* Date Range */}
            <div className="flex flex-wrap gap-3 items-center">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="px-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                <span className="text-slate-400 dark:text-zinc-600 font-bold">{isAr ? "إلى" : "to"}</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="px-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold text-sm rounded-xl border border-slate-200 dark:border-zinc-700/50 transition hover:bg-slate-200 dark:hover:bg-zinc-700/50">
                    {isAr ? "كل الفترات" : "All Time"}
                </button>
                <button onClick={async () => {
                    if (!restaurantId || recalculating) return;
                    setRecalculating(true);
                    try {
                        // Find all orders that don't have cost calculated yet
                        const { data: uncalculated } = await supabase
                            .from('orders')
                            .select('id')
                            .eq('restaurant_id', restaurantId)
                            .eq('is_draft', false)
                            .is('order_cost', null);
                        
                        if (uncalculated && uncalculated.length > 0) {
                            let count = 0;
                            for (const order of uncalculated) {
                                await calculateOrderCost(order.id);
                                count++;
                            }
                            toast.success(isAr ? `تم حساب تكاليف ${count} طلب` : `Calculated costs for ${count} orders`);
                            fetchAnalytics();
                        } else {
                            toast.info(isAr ? "كل الطلبات محسوبة بالفعل" : "All orders already have costs");
                        }
                    } catch (err) {
                        console.error('Recalculate error:', err);
                        toast.error(isAr ? "حدث خطأ" : "Error recalculating");
                    } finally {
                        setRecalculating(false);
                    }
                }}
                    disabled={recalculating}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-emerald-500 dark:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg transition hover:shadow-xl disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                    {recalculating ? (isAr ? "جاري الحساب..." : "Calculating...") : (isAr ? "إعادة حساب التكاليف" : "Recalculate Costs")}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: isAr ? "إجمالي الإيرادات" : "Total Revenue", value: formatCurrency(analytics.totalRevenue), icon: DollarSign, gradLight: "from-emerald-50 to-teal-50", gradDark: "dark:from-emerald-600/20 dark:to-teal-600/20", borderL: "border-emerald-200", borderD: "dark:border-emerald-500/20", iconColor: "text-emerald-500 dark:text-emerald-400", prefix: "" },
                    { label: isAr ? "إجمالي التكاليف" : "Total Cost", value: formatCurrency(analytics.totalCost), icon: BarChart3, gradLight: "from-red-50 to-orange-50", gradDark: "dark:from-red-600/20 dark:to-orange-600/20", borderL: "border-red-200", borderD: "dark:border-red-500/20", iconColor: "text-red-500 dark:text-red-400", prefix: "" },
                    { label: isAr ? "صافي الربح" : "Net Profit", value: formatCurrency(analytics.totalProfit), icon: ArrowUp, gradLight: "from-indigo-50 to-violet-50", gradDark: "dark:from-indigo-600/20 dark:to-violet-600/20", borderL: "border-indigo-200", borderD: "dark:border-indigo-500/20", iconColor: "text-indigo-500 dark:text-indigo-400", prefix: analytics.totalProfit >= 0 ? "+" : "" },
                    { label: isAr ? "هامش الربح" : "Avg Margin", value: `${(analytics.avgMargin * 100).toFixed(1)}%`, icon: Percent, gradLight: "from-cyan-50 to-sky-50", gradDark: "dark:from-cyan-600/20 dark:to-sky-600/20", borderL: "border-cyan-200", borderD: "dark:border-cyan-500/20", iconColor: "text-cyan-500 dark:text-cyan-400", prefix: "" },
                    { label: isAr ? "طلبات محسوبة" : "Orders Analyzed", value: analytics.orderCount.toString(), icon: TrendingUp, gradLight: "from-amber-50 to-yellow-50", gradDark: "dark:from-amber-600/20 dark:to-yellow-600/20", borderL: "border-amber-200", borderD: "dark:border-amber-500/20", iconColor: "text-amber-500 dark:text-amber-400", prefix: "" },
                ].map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradLight} ${card.gradDark} border ${card.borderL} ${card.borderD} p-5 group hover:scale-[1.02] transition-transform`}>
                        <div className={`w-10 h-10 rounded-xl bg-white/50 dark:bg-black/20 flex items-center justify-center ${card.iconColor} mb-3`}>
                            <card.icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{card.prefix}{card.value}</h3>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 font-bold mt-1">{card.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Profit Breakdown Visual */}
            {analytics.totalRevenue > 0 && (
                <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50 p-5">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase mb-4">{isAr ? "توزيع الإيرادات" : "Revenue Breakdown"}</h3>
                    <div className="flex rounded-xl overflow-hidden h-8">
                        <div style={{ width: `${analytics.totalRevenue > 0 ? (analytics.totalCost / analytics.totalRevenue) * 100 : 0}%` }}
                            className="bg-red-400 dark:bg-red-500/80 transition-all flex items-center justify-center text-[10px] font-bold text-white">
                            {analytics.totalRevenue > 0 ? `${((analytics.totalCost / analytics.totalRevenue) * 100).toFixed(0)}% ${isAr ? "تكاليف" : "Cost"}` : ""}
                        </div>
                        <div style={{ width: `${analytics.totalRevenue > 0 ? (analytics.totalProfit / analytics.totalRevenue) * 100 : 0}%` }}
                            className="bg-emerald-400 dark:bg-emerald-500/80 transition-all flex items-center justify-center text-[10px] font-bold text-white">
                            {analytics.totalRevenue > 0 ? `${((analytics.totalProfit / analytics.totalRevenue) * 100).toFixed(0)}% ${isAr ? "ربح" : "Profit"}` : ""}
                        </div>
                    </div>
                </div>
            )}

            {/* Product Profitability Table */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{isAr ? "ربحية المنتجات" : "Product Profitability"}</h2>
                {productProfits.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-zinc-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-bold">{isAr ? "لا توجد بيانات تكاليف بعد" : "No cost data yet"}</p>
                        <p className="text-sm mt-1">{isAr ? "ستظهر البيانات بعد حساب تكاليف الطلبات" : "Data will appear after order costs are calculated"}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                    {[isAr ? "المنتج" : "Product", isAr ? "المبيعات" : "Sales", isAr ? "الإيرادات" : "Revenue", isAr ? "التكلفة" : "Cost", isAr ? "الربح" : "Profit", isAr ? "الهامش" : "Margin"]
                                        .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {productProfits.map((p, i) => (
                                    <tr key={i} className="border-b border-slate-100 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-zinc-200">{p.title}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{p.orderCount}</td>
                                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.totalRevenue)}</td>
                                        <td className="px-4 py-3 font-bold text-red-500 dark:text-red-400">{formatCurrency(p.totalCost)}</td>
                                        <td className={`px-4 py-3 font-extrabold ${p.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            <span className="flex items-center gap-1">
                                                {p.totalProfit >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                                {formatCurrency(Math.abs(p.totalProfit))}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${p.margin >= 50 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : p.margin >= 20 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                                                {p.margin}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Top/Bottom Performers */}
            {productProfits.length >= 4 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50 p-5">
                        <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-3 flex items-center gap-2"><ArrowUp className="w-4 h-4" /> {isAr ? "الأكثر ربحية" : "Most Profitable"}</h3>
                        <div className="space-y-2">
                            {productProfits.slice(0, 5).map((p, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800/30 last:border-0">
                                    <span className="font-bold text-slate-700 dark:text-zinc-300">{i + 1}. {p.title}</span>
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.totalProfit)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50 p-5">
                        <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase mb-3 flex items-center gap-2"><ArrowDown className="w-4 h-4" /> {isAr ? "الأقل ربحية" : "Least Profitable"}</h3>
                        <div className="space-y-2">
                            {[...productProfits].sort((a, b) => a.totalProfit - b.totalProfit).slice(0, 5).map((p, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800/30 last:border-0">
                                    <span className="font-bold text-slate-700 dark:text-zinc-300">{i + 1}. {p.title}</span>
                                    <span className={`font-extrabold ${p.totalProfit >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(p.totalProfit)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
