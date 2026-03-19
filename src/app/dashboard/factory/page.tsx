"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
    Factory as FactoryIcon, Printer, CheckCircle2, PlayCircle,
    XCircle, Package, AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatQuantity } from "@/lib/helpers/formatters";

type RecipeIngredient = { inventory_item_id: string; quantity: number; unit: string; inventory_items?: { name: string; quantity: number; unit: string } };
type ProductionRequest = {
    id: string; product_name: string; quantity: number; unit: string;
    status: string; production_date: string; notes: string | null; created_at: string;
    recipe_id: string | null;
    order_id: string | null;
    recipes?: { id: string; product_name: string; recipe_ingredients: RecipeIngredient[] };
    orders?: { id: string; order_number: number; customer_name: string | null; order_type: string; notes: string | null; };
};
type ProductionBatch = {
    id: string; product_name: string; quantity: number; unit: string;
    produced_by: string | null; produced_at: string;
};

export default function FactoryPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [requests, setRequests] = useState<ProductionRequest[]>([]);
    const [batches, setBatches] = useState<ProductionBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    const fetchData = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);
        const [{ data: reqs }, { data: batchData }] = await Promise.all([
            supabase.from('production_requests')
                .select('*, recipes(id, product_name, recipe_ingredients(inventory_item_id, quantity, unit, inventory_items(name, quantity, unit))), orders(id, order_number, customer_name, order_type, notes)')
                .eq('restaurant_id', restaurantId)
                .order('production_date', { ascending: false }),
            supabase.from('production_batches')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .order('produced_at', { ascending: false })
                .limit(50)
        ]);
        setRequests((reqs as ProductionRequest[]) || []);
        setBatches((batchData as ProductionBatch[]) || []);
        setLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Realtime
    useEffect(() => {
        if (!restaurantId) return;
        const channel = supabase.channel(`production-${restaurantId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'production_requests', filter: `restaurant_id=eq.${restaurantId}` }, () => fetchData())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [restaurantId, fetchData]);

    const updateStatus = async (id: string, newStatus: string) => {
        if (newStatus === 'completed') {
            toast.loading(isAr ? "جاري الخصم والإضافة..." : "Processing...", { id: `complete-${id}` });
            try {
                const res = await fetch('/api/factory/complete-bulk', {
                        method: 'POST',
                        body: JSON.stringify({ restaurantId, requestIds: [id] })
                });
                const json = await res.json();
                if (json.success) {
                    toast.success(isAr ? "تم إكمال الإنتاج وتحديث المخزون" : "Production completed & inventory updated", { id: `complete-${id}` });
                } else {
                    toast.error(isAr ? "خطأ في إكمال الإنتاج" : "Error completing production", { id: `complete-${id}` });
                }
            } catch {
                toast.error("Network error", { id: `complete-${id}` });
            }
            fetchData();
        } else if (newStatus === 'in_progress') {
            try {
                const res = await fetch('/api/factory/start-bulk', {
                        method: 'POST',
                        body: JSON.stringify({ restaurantId, requestIds: [id] })
                });
                const json = await res.json();
                if (json.success) {
                   toast.success(isAr ? "بدأ التنفيذ وتم خصم الخامات" : "Started & Materials Deducted");
                } else {
                   toast.error(isAr ? "خطأ: قد لا تتوفر كمية كافية من الخامات" : "Error: Insufficient raw materials");
                }
            } catch {
                toast.error("Network error");
            }
            fetchData();
        } else if (newStatus === 'cancelled') {
            toast.loading(isAr ? "جاري الإلغاء..." : "Cancelling...", { id: `cancel-${id}` });
            try {
                const res = await fetch('/api/factory/cancel', {
                        method: 'POST',
                        body: JSON.stringify({ restaurantId, requestIds: [id] })
                });
                const json = await res.json();
                if (json.success) {
                    toast.success(isAr ? "تم الإلغاء وإرجاع الخامات إن وجدت" : "Cancelled & materials refunded if needed", { id: `cancel-${id}` });
                } else {
                    toast.error(isAr ? "خطأ في الإلغاء" : "Error cancelling", { id: `cancel-${id}` });
                }
            } catch {
                toast.error("Network error", { id: `cancel-${id}` });
            }
            fetchData();
        } else {
            await supabase.from('production_requests').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
            toast.success(isAr ? "تم التحديث" : "Status updated");
            fetchData();
        }
    };

    const statusColor = (s: string) => {
        switch (s) {
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
            case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
            case 'cancelled': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
            default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
        }
    };

    const statusLabel = (s: string) => {
        const labels: Record<string, [string, string]> = {
            pending: ["قيد الانتظار", "Pending"],
            in_progress: ["قيد التنفيذ", "In Progress"],
            completed: ["مكتمل", "Completed"],
            cancelled: ["ملغي", "Cancelled"],
        };
        return isAr ? labels[s]?.[0] || s : labels[s]?.[1] || s;
    };

    const displayQty = (qty: number, unit: string) => {
        const fmt = formatQuantity(qty, unit, isAr);
        return `${fmt.qty} ${fmt.unit}`;
    };

    // Filter by date
    const filteredRequests = dateFilter
        ? requests.filter(r => r.production_date === dateFilter)
        : requests;

    const todayRequests = requests.filter(r => r.production_date === new Date().toISOString().split('T')[0]);
    const pendingCount = todayRequests.filter(r => r.status === 'pending').length;
    const inProgressCount = todayRequests.filter(r => r.status === 'in_progress').length;

    // Compute aggregated ingredient needs for today's pending+in_progress requests
    const ingredientNeeds = new Map<string, { name: string; qty: number; unit: string; available: number }>();
    todayRequests.filter(r => ['pending', 'in_progress'].includes(r.status)).forEach(req => {
        if (!req.recipes?.recipe_ingredients) return;
        req.recipes.recipe_ingredients.forEach(ing => {
            const name = ing.inventory_items?.name || 'Unknown';
            const needed = ing.quantity * req.quantity;
            const existing = ingredientNeeds.get(ing.inventory_item_id);
            if (existing) {
                existing.qty += needed;
            } else {
                ingredientNeeds.set(ing.inventory_item_id, { name, qty: needed, unit: ing.unit, available: ing.inventory_items?.quantity || 0 });
            }
        });
    });

    // Print handler
    const printProduction = async (printType: 'pending' | 'in_progress') => {
        const active = todayRequests.filter(r => r.status === printType);

        if (active.length === 0) { 
            toast.error(isAr 
                ? (printType === 'pending' ? "لا يوجد طلبات جديدة للطباعة" : "لا يوجد طلبات قيد التنفيذ للطباعة") 
                : (printType === 'pending' ? "No pending requests to print" : "No in-progress requests to print")
            ); 
            return; 
        }

        if (printType === 'pending') {
            const pendingIds = active.map(r => r.id);
            toast.loading(isAr ? "جاري الخصم وبدء الإنتاج..." : "Starting production...");
            try {
                const res = await fetch('/api/factory/start-bulk', {
                    method: 'POST',
                    body: JSON.stringify({ restaurantId, requestIds: pendingIds })
                });
                const json = await res.json();
                toast.dismiss();
                if (!json.success) {
                    toast.error(isAr ? "حدث خطأ في خصم بعض الخامات" : "Error starting some items");
                } else {
                    toast.success(isAr ? "تم خصم الخامات للمواد المطلوبة" : "Materials deducted for pending tasks");
                }
                await fetchData();
            } catch {
                 toast.dismiss();
                 toast.error("Network error");
                 return;
            }
        }

        // Recompute ingredients only for the printed batch
        const batchIngredients = new Map<string, { name: string; qty: number; unit: string; available: number }>();
        active.forEach(req => {
            if (!req.recipes?.recipe_ingredients) return;
            req.recipes.recipe_ingredients.forEach(ing => {
                const name = ing.inventory_items?.name || 'Unknown';
                const needed = ing.quantity * req.quantity;
                const existing = batchIngredients.get(ing.inventory_item_id);
                if (existing) {
                    existing.qty += needed;
                } else {
                    batchIngredients.set(ing.inventory_item_id, { name, qty: needed, unit: ing.unit, available: ing.inventory_items?.quantity || 0 });
                }
            });
        });

        // Group requests by order for the printed sheet
        const orderGroups = new Map<string, { orderNumber: number; customerName: string | null; orderType: string; notes: string | null; items: typeof active }>();
        const noOrderItems: typeof active = [];
        active.forEach(r => {
            if (r.order_id && r.orders) {
                const key = r.order_id;
                if (!orderGroups.has(key)) {
                    orderGroups.set(key, { orderNumber: r.orders.order_number, customerName: r.orders.customer_name, orderType: r.orders.order_type, notes: r.orders.notes, items: [] });
                }
                orderGroups.get(key)!.items.push(r);
            } else {
                noOrderItems.push(r);
            }
        });

        // Build per-order sections for print
        let orderSectionsHtml = '';
        orderGroups.forEach(group => {
            const typeLabel = group.orderType === 'takeaway' ? (isAr ? 'تيك أواي' : 'Takeaway') : group.orderType === 'delivery' ? (isAr ? 'دليفري' : 'Delivery') : (isAr ? 'صالة' : 'Dine-in');
            orderSectionsHtml += `<div style="margin-bottom:25px;border:2px solid #000;border-radius:12px;padding:16px;page-break-inside:avoid;color:#000;font-weight:900">`;
            orderSectionsHtml += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px dashed #000">`;
            orderSectionsHtml += `<div><span style="font-size:22px;font-weight:900">#${group.orderNumber}</span>`;
            if (group.customerName) orderSectionsHtml += ` <span style="font-size:14px;color:#000;margin-right:8px;font-weight:900">👤 ${group.customerName}</span>`;
            orderSectionsHtml += `</div>`;
            orderSectionsHtml += `<span style="font-size:13px;padding:4px 12px;background:transparent;border-radius:8px;font-weight:900;border:2px solid #000">${typeLabel}</span>`;
            orderSectionsHtml += `</div>`;
            if (group.notes) orderSectionsHtml += `<p style="font-size:13px;color:#000;font-weight:900;margin:0 0 10px 0;background:transparent;padding:6px 10px;border-radius:6px;border:2px solid #000">📝 ${group.notes}</p>`;
            orderSectionsHtml += `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:8px 12px;background:transparent;text-align:${isAr ? 'right' : 'left'};font-size:13px;border-bottom:2px solid #000;color:#000;font-weight:900">${isAr ? 'الصنف' : 'Product'}</th><th style="padding:8px 12px;background:transparent;text-align:center;font-size:13px;border-bottom:2px solid #000;color:#000;font-weight:900">${isAr ? 'الكمية' : 'Qty'}</th></tr></thead><tbody>`;
            group.items.forEach(r => {
                orderSectionsHtml += `<tr><td style="padding:8px 12px;border-bottom:1.5px solid #000;font-size:15px;font-weight:900;color:#000">${r.product_name}</td><td style="padding:8px 12px;border-bottom:1.5px solid #000;text-align:center;font-weight:900;font-size:16px;color:#000">${displayQty(r.quantity, r.unit)}</td></tr>`;
            });
            orderSectionsHtml += `</tbody></table></div>`;
        });

        // Add items without orders
        if (noOrderItems.length > 0) {
            orderSectionsHtml += `<div style="margin-bottom:25px;border:2px solid #000;border-radius:12px;padding:16px;color:#000;font-weight:900">`;
            orderSectionsHtml += `<div style="font-size:18px;font-weight:900;margin-bottom:12px;padding-bottom:10px;border-bottom:2px dashed #000">${isAr ? 'بدون أوردر محدد' : 'No Specific Order'}</div>`;
            orderSectionsHtml += `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:8px 12px;background:transparent;text-align:${isAr ? 'right' : 'left'};font-size:13px;border-bottom:2px solid #000;color:#000;font-weight:900">${isAr ? 'الصنف' : 'Product'}</th><th style="padding:8px 12px;background:transparent;text-align:center;font-size:13px;border-bottom:2px solid #000;color:#000;font-weight:900">${isAr ? 'الكمية' : 'Qty'}</th></tr></thead><tbody>`;
            noOrderItems.forEach(r => {
                orderSectionsHtml += `<tr><td style="padding:8px 12px;border-bottom:1.5px solid #000;font-size:15px;font-weight:900;color:#000">${r.product_name}</td><td style="padding:8px 12px;border-bottom:1.5px solid #000;text-align:center;font-weight:900;font-size:16px;color:#000">${displayQty(r.quantity, r.unit)}</td></tr>`;
            });
            orderSectionsHtml += `</tbody></table></div>`;
        }

        // Build summary of total production needed for each product
        const productTotals = new Map<string, { qty: number; unit: string }>();
        active.forEach(r => {
            const key = r.product_name;
            const current = productTotals.get(key);
            if (current) {
                current.qty += r.quantity;
            } else {
                productTotals.set(key, { qty: r.quantity, unit: r.unit });
            }
        });

        let summaryHtml = `<div style="margin-bottom:25px;border:3px solid #000;border-radius:12px;padding:16px;background:transparent;color:#000;font-weight:900">
            <h2 style="margin-top:0;color:#000;border-bottom:3px solid #000;padding-bottom:8px;font-weight:900">📦 ${isAr ? 'إجمالي مطلوب تصنيعه' : 'Total Production Summary'}</h2>
            <table style="width:100%;border-collapse:collapse">
                <thead>
                    <tr>
                        <th style="padding:10px;text-align:${isAr ? 'right' : 'left'};border-bottom:2px solid #000;font-size:14px;color:#000;font-weight:900">${isAr ? 'الصنف' : 'Product'}</th>
                        <th style="padding:10px;text-align:center;border-bottom:2px solid #000;font-size:14px;color:#000;font-weight:900">${isAr ? 'إجمالي الكمية' : 'Total Qty'}</th>
                    </tr>
                </thead>
                <tbody>`;
        
        productTotals.forEach((data, name) => {
            summaryHtml += `<tr>
                <td style="padding:10px;border-bottom:1.5px solid #000;font-size:16px;font-weight:900;color:#000">${name}</td>
                <td style="padding:10px;border-bottom:1.5px solid #000;text-align:center;font-size:18px;font-weight:900;color:#000">${displayQty(data.qty, data.unit)}</td>
            </tr>`;
        });
        summaryHtml += `</tbody></table></div>`;

        const ingRows = Array.from(batchIngredients.values()).map(i => `<tr><td style="padding:6px 12px;border-bottom:2px solid #000;color:#000;font-weight:900">${i.name}</td><td style="padding:6px 12px;border-bottom:2px solid #000;text-align:center;color:#000;font-weight:900">${displayQty(i.qty, i.unit)}</td><td style="padding:6px 12px;border-bottom:2px solid #000;text-align:center;color:#000;font-weight:900;${i.available < i.qty ? 'text-decoration:underline' : ''}">${displayQty(i.available, i.unit)}</td></tr>`).join('');
        const today = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const titleText = isAr 
            ? (printType === 'pending' ? 'ورقة الإنتاج (جديد)' : 'ورقة الإنتاج (قيد التنفيذ)')
            : (printType === 'pending' ? 'Production Sheet (New)' : 'Production Sheet (In Progress)');

        const win = window.open('', '_blank', 'width=800,height=600');
        if (!win) return;
        const { getFactoryPrintStyles } = await import('@/lib/helpers/printerSettings');
        win.document.write(`<!DOCTYPE html><html><head><title>${titleText}</title>
            <style>${getFactoryPrintStyles(isAr ? 'rtl' : 'ltr')}</style></head><body>
            <div class="header">
                <div><h1 style="font-weight: 900; color: #000;">🏭 ${isAr ? 'ورقة الإنتاج' : 'Production Sheet'}</h1><p class="date" style="font-weight: 900; color: #000;">${today}</p></div>
                <div style="text-align:left;font-size:13px;color:#000;font-weight:900">${isAr ? 'عدد الطلبات' : 'Orders'}: <strong style="font-weight:900">${orderGroups.size}</strong><br>${isAr ? 'عدد الأصناف' : 'Items'}: <strong style="font-weight:900">${active.length}</strong></div>
            </div>
            <div style="page-break-after: always">
                ${summaryHtml}
            </div>

            <div style="page-break-after: always">
                <h2 style="margin-bottom:15px;border-bottom:3px solid #000;padding-bottom:8px;font-weight:900">📋 ${isAr ? 'الأصناف حسب الأوردر' : 'Items by Order'}</h2>
                ${orderSectionsHtml}
            </div>

            <div style="padding-top: 10px">
                <h2 style="margin-top:0;border-bottom:3px solid #000;padding-bottom:8px;font-weight:900">🧪 ${isAr ? 'المواد المطلوبة' : 'Ingredients Needed'}</h2>
                <table><thead><tr><th style="font-weight:900;color:#000;border-bottom:2px solid #000;padding:10px">${isAr ? 'المادة' : 'Ingredient'}</th><th style="text-align:center;font-weight:900;color:#000;border-bottom:2px solid #000;padding:10px">${isAr ? 'المطلوب' : 'Needed'}</th><th style="text-align:center;font-weight:900;color:#000;border-bottom:2px solid #000;padding:10px">${isAr ? 'المتوفر' : 'Available'}</th></tr></thead><tbody>${ingRows}</tbody></table>
            </div>
            <div style="margin-top:40px;padding-top:20px;border-top:2px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px">
                ${isAr ? 'تم التوليد بواسطة نظام ASN' : 'Generated by ASN System'} — ${new Date().toLocaleTimeString()}
            </div>
            </body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
    };

    const completeAllInProgress = async () => {
        const activeIds = todayRequests.filter(r => r.status === 'in_progress').map(r => r.id);
        if (activeIds.length === 0) {
            toast.error(isAr ? "لا توجد طلبات قيد التنفيذ للانتهاء منها" : "No in-progress requests to complete");
            return;
        }

        toast.loading(isAr ? "جاري إنهاء الطلبات..." : "Completing requests...");
        try {
            const res = await fetch('/api/factory/complete-bulk', {
                method: 'POST',
                body: JSON.stringify({ restaurantId, requestIds: activeIds })
            });
            const json = await res.json();
            toast.dismiss();
            
            if (json.success) {
                toast.success(isAr ? "تم إكمال العمل بنجاح" : "Successfully completed batches");
            } else {
                toast.error(isAr ? "حدث خطأ في جزء من العملية" : "Error completing some items");
            }
            await fetchData();
        } catch {
            toast.dismiss();
            toast.error("Network error");
        }
    };

    if (loading && requests.length === 0) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <FactoryIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                        {isAr ? "إدارة المصنع" : "Factory Management"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">{isAr ? "متابعة طلبات الإنتاج وإدارة المصنع" : "Track production requests and manage factory"}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={completeAllInProgress}
                        disabled={inProgressCount === 0}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                        <CheckCircle2 className="w-5 h-5" /> {isAr ? "اكتمال كل التحضير" : "Complete All In-Progress"}
                    </button>
                    {/* Updated Print Options */}
                    <div className="flex gap-2 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-zinc-700">
                        <button onClick={() => printProduction('pending')}
                            disabled={pendingCount === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-bold rounded-lg shadow-sm hover:text-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            <Printer className="w-4 h-4" /> {isAr ? "طباعة الجديد" : "Print New"}
                        </button>
                        <button onClick={() => printProduction('in_progress')}
                            disabled={inProgressCount === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-bold rounded-lg shadow-sm hover:text-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            <Printer className="w-4 h-4" /> {isAr ? "إعادة طباعة (قيد التنفيذ)" : "Reprint Active"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: isAr ? "طلبات اليوم" : "Today's Requests", value: todayRequests.length, color: "text-slate-700 dark:text-zinc-300" },
                    { label: isAr ? "قيد الانتظار" : "Pending", value: pendingCount, color: "text-amber-600 dark:text-amber-400" },
                    { label: isAr ? "قيد التنفيذ" : "In Progress", value: inProgressCount, color: "text-blue-600 dark:text-blue-400" },
                    { label: isAr ? "دفعات مكتملة" : "Completed Batches", value: batches.length, color: "text-emerald-600 dark:text-emerald-400" },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-1">{s.label}</p>
                        <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-3">
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                <button onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold text-sm rounded-xl border border-slate-200 dark:border-zinc-700/50 transition hover:bg-slate-200 dark:hover:bg-zinc-700/50">
                    {isAr ? "اليوم" : "Today"}
                </button>
                <button onClick={() => setDateFilter("")}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold text-sm rounded-xl border border-slate-200 dark:border-zinc-700/50 transition hover:bg-slate-200 dark:hover:bg-zinc-700/50">
                    {isAr ? "الكل" : "All"}
                </button>
            </div>

            {/* Ingredient Needs Panel */}
            {ingredientNeeds.size > 0 && (
                <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50 p-5">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> {isAr ? "المواد المطلوبة اليوم" : "Ingredients Needed Today"}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Array.from(ingredientNeeds.values()).map((i, idx) => {
                            const isLow = i.available < i.qty;
                            return (
                                <div key={idx} className={`p-3 rounded-lg border ${isLow ? 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-zinc-700/50'}`}>
                                    <p className="font-bold text-slate-700 dark:text-zinc-300 text-sm flex items-center gap-1">{isLow && <AlertTriangle className="w-3 h-3 text-red-500" />} {i.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{isAr ? "مطلوب" : "Need"}: <span className="font-bold">{displayQty(i.qty, i.unit)}</span></p>
                                    <p className={`text-xs mt-0.5 ${isLow ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-zinc-500'}`}>{isAr ? "متوفر" : "Available"}: {displayQty(i.available, i.unit)}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Production Queue */}
            {filteredRequests.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-zinc-500">
                    <FactoryIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">{isAr ? "لا توجد طلبات إنتاج" : "No production requests"}</p>
                </div>
            ) : (() => {
                // Group filtered requests by order
                const orderGroupsDisplay = new Map<string, { orderNumber: number; customerName: string | null; orderType: string; notes: string | null; items: ProductionRequest[] }>();
                const noOrderDisplay: ProductionRequest[] = [];
                filteredRequests.forEach(r => {
                    if (r.order_id && r.orders) {
                        const key = r.order_id;
                        if (!orderGroupsDisplay.has(key)) {
                            orderGroupsDisplay.set(key, { orderNumber: r.orders.order_number, customerName: r.orders.customer_name, orderType: r.orders.order_type, notes: r.orders.notes, items: [] });
                        }
                        orderGroupsDisplay.get(key)!.items.push(r);
                    } else {
                        noOrderDisplay.push(r);
                    }
                });

                const sortedGroups = Array.from(orderGroupsDisplay.entries()).sort((a, b) => b[1].orderNumber - a[1].orderNumber);

                return (
                    <div className="flex flex-col gap-4">
                        {sortedGroups.map(([orderId, group]) => (
                            <motion.div key={orderId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-card rounded-xl border-2 border-slate-200 dark:border-zinc-800/50 overflow-hidden">
                                {/* Order Header */}
                                <div className="bg-slate-50 dark:bg-zinc-900/50 border-b-2 border-slate-200 dark:border-zinc-800/50 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">#{group.orderNumber}</span>
                                        <span className="text-xs font-bold px-2.5 py-1 bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg border border-slate-300 dark:border-zinc-700">
                                            {group.orderType === 'takeaway' ? (isAr ? '🥡 تيك أواي' : '🥡 Takeaway') : group.orderType === 'delivery' ? (isAr ? '🚚 دليفري' : '🚚 Delivery') : (isAr ? '🍽️ صالة' : '🍽️ Dine-in')}
                                        </span>
                                        {group.customerName && (
                                            <span className="text-sm font-bold text-slate-600 dark:text-zinc-400">👤 {group.customerName}</span>
                                        )}
                                    </div>
                                    <span className="text-xs font-extrabold text-slate-500 dark:text-zinc-500">{group.items.length} {isAr ? 'أصناف' : 'items'}</span>
                                </div>
                                {group.notes && (
                                    <div className="px-5 py-2 bg-amber-50 dark:bg-amber-500/5 border-b border-amber-200 dark:border-amber-500/20">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">📝 {isAr ? 'ملاحظة:' : 'Note:'} {group.notes}</p>
                                    </div>
                                )}
                                {/* Items List */}
                                <div className="divide-y divide-slate-100 dark:divide-zinc-800/30">
                                    {group.items.map(req => (
                                        <div key={req.id} className="px-5 py-4">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{req.product_name}</h4>
                                                    <span className="text-lg font-black text-slate-700 dark:text-zinc-300">{displayQty(req.quantity, req.unit)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${statusColor(req.status)}`}>{statusLabel(req.status)}</span>
                                                    {req.status !== 'completed' && req.status !== 'cancelled' && (
                                                        <div className="flex gap-1.5">
                                                            {req.status === 'pending' && (
                                                                <button onClick={() => updateStatus(req.id, 'in_progress')}
                                                                    className="p-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg hover:bg-blue-100 transition" title={isAr ? 'بدء' : 'Start'}>
                                                                    <PlayCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => updateStatus(req.id, 'completed')}
                                                                className="p-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg hover:bg-emerald-100 transition" title={isAr ? 'إكمال' : 'Complete'}>
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => updateStatus(req.id, 'cancelled')}
                                                                className="p-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 transition" title={isAr ? 'إلغاء' : 'Cancel'}>
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Ingredients */}
                                            {req.recipes?.recipe_ingredients && req.recipes.recipe_ingredients.length > 0 && (
                                                <div className="bg-slate-50 dark:bg-black/20 rounded-lg p-3">
                                                    <p className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase mb-2">{isAr ? 'المكونات' : 'Ingredients'}</p>
                                                    {req.recipes.recipe_ingredients.map((ing, i) => {
                                                        const needed = ing.quantity * req.quantity;
                                                        const avail = ing.inventory_items?.quantity || 0;
                                                        return (
                                                            <div key={i} className="flex items-center justify-between text-sm py-1">
                                                                <span className="text-slate-600 dark:text-zinc-400">{ing.inventory_items?.name || "?"}</span>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-bold text-slate-700 dark:text-zinc-300">{displayQty(needed, ing.unit)}</span>
                                                                    <span className={`text-xs ${avail < needed ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}`}>({isAr ? "متوفر" : "avail"}: {displayQty(avail, ing.unit)})</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}

                        {/* Items without order */}
                        {noOrderDisplay.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-card rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 overflow-hidden">
                                <div className="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800/50 px-5 py-4">
                                    <span className="text-lg font-extrabold text-slate-600 dark:text-zinc-400">{isAr ? '🏭 بدون أوردر محدد' : '🏭 No Specific Order'}</span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-zinc-800/30">
                                    {noOrderDisplay.map(req => (
                                        <div key={req.id} className="px-5 py-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{req.product_name}</h4>
                                                <span className="text-lg font-black text-slate-700 dark:text-zinc-300">{displayQty(req.quantity, req.unit)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${statusColor(req.status)}`}>{statusLabel(req.status)}</span>
                                                {req.status !== 'completed' && req.status !== 'cancelled' && (
                                                    <div className="flex gap-1.5">
                                                        {req.status === 'pending' && (
                                                            <button onClick={() => updateStatus(req.id, 'in_progress')} className="p-1.5 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"><PlayCircle className="w-4 h-4" /></button>
                                                        )}
                                                        <button onClick={() => updateStatus(req.id, 'completed')} className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"><CheckCircle2 className="w-4 h-4" /></button>
                                                        <button onClick={() => updateStatus(req.id, 'cancelled')} className="p-1.5 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"><XCircle className="w-4 h-4" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                );
            })()}

            {/* Recent Batches */}
            {batches.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {isAr ? "دفعات الإنتاج المكتملة" : "Completed Production Batches"}
                    </h2>
                    <div className="overflow-x-auto bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                    {[isAr ? "المنتج" : "Product", isAr ? "الكمية" : "Qty", isAr ? "بواسطة" : "By", isAr ? "التاريخ" : "Date"]
                                        .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {batches.slice(0, 10).map(b => (
                                    <tr key={b.id} className="border-b border-slate-100 dark:border-zinc-800/30">
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-zinc-200">{b.product_name}</td>
                                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{displayQty(b.quantity, b.unit)}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{b.produced_by || "—"}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{new Date(b.produced_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
