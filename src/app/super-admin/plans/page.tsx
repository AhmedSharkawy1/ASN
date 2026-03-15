"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Layers, Plus, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";

export default function SuperAdminPlansPage() {
    const { language } = useLanguage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (err: any) {
            console.error(err);
            toast.error(language === "ar" ? `خطأ: ${err?.message || 'تعذر جلب الباقات'}` : `Error: ${err?.message || 'Failed to load plans'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDefaultPlans = async () => {
        try {
            const defaultPlans = [
                { plan_name: 'Free', price: 0, max_branches: 1, max_users: 2, max_products: 50 },
                { plan_name: 'Pro', price: 49.99, max_branches: 3, max_users: 10, max_products: 1000 },
                { plan_name: 'Enterprise', price: 199.99, max_branches: 10, max_users: 50, max_products: 10000 }
            ];
            
            const { error } = await supabase.from('subscription_plans').insert(defaultPlans);
            if (error) throw error;
            
            toast.success(language === "ar" ? "تم إنشاء الباقات الافتراضية" : "Default plans created");
            fetchPlans();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to create plans');
        }
    }

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Pricing Plans</h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">Manage subscription tiers and limits</p>
                </div>
                {plans.length === 0 && !loading && (
                    <button 
                        onClick={handleCreateDefaultPlans}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors w-fit"
                    >
                        <Plus className="w-4 h-4" />
                        Create Default Plans
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-3 text-center py-20 text-slate-500">Loading plans...</div>
                ) : plans.length === 0 ? (
                    <div className="col-span-3 text-center py-20 bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 text-slate-500">
                        No plans found. Create some to get started.
                    </div>
                ) : (
                    plans.map((plan) => (
                        <div key={plan.id} className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col p-6 hover:shadow-md transition-shadow relative">
                            {plan.plan_name === 'Pro' && (
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                                    Popular
                                </div>
                            )}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white capitalize">{plan.plan_name}</h3>
                                    <div className="text-sm font-bold text-slate-500 dark:text-zinc-400">${plan.price} / {plan.billing_cycle}</div>
                                </div>
                            </div>
                            
                            <div className="space-y-3 flex-1 mb-6">
                                <div className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-stone-800 py-2">
                                    <span className="text-slate-500 dark:text-zinc-400">Max Branches</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{plan.max_branches}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-stone-800 py-2">
                                    <span className="text-slate-500 dark:text-zinc-400">Max Users</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{plan.max_users}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-stone-800 py-2">
                                    <span className="text-slate-500 dark:text-zinc-400">Max Products</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{plan.max_products}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm py-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="text-slate-700 dark:text-zinc-300">Basic features included</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-auto">
                                <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors text-sm">
                                    <Edit className="w-4 h-4" /> Edit
                                </button>
                                <button className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
