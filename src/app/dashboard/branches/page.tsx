"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Building2, Search, ArrowRight, Store, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";
import { useRouter } from "next/navigation";

interface BranchRestaurant {
    id: string;
    name: string;
    email: string | null;
    created_at: string;
    subscription_plan?: string | null;
}

export default function DashboardBranchesPage() {
    const { language } = useLanguage();
    const isAr = language === "ar";
    const router = useRouter();

    const [branches, setBranches] = useState<BranchRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    const fetchChildBranches = useCallback(async (parentId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select('id, name, email, created_at, subscription_plan')
                .eq('parent_id', parentId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setBranches((data as BranchRestaurant[]) || []);
        } catch (err: unknown) {
            console.error(err);
            toast.error(isAr ? "فشل في تحميل الفروع" : "Failed to load branches");
        } finally {
            setLoading(false);
        }
    }, [isAr]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Find root owner ID
            const { data: rootRest } = await supabase
                .from('restaurants')
                .select('id, parent_id')
                .ilike('email', session.user.email)
                .maybeSingle();

            if (rootRest) {
                // Determine the true parent ID
                // If this is the parent, use its ID. If we are currently in a child, use its parent_id
                const parentId = rootRest.parent_id || rootRest.id;
                setRestaurantId(parentId);
                fetchChildBranches(parentId);
            } else {
                setLoading(false);
            }
        };
        init();
    }, [fetchChildBranches]);

    const handleSwitchToBranch = (branchId: string) => {
        sessionStorage.setItem('impersonating_tenant', branchId);
        window.location.reload();
    };

    const filtered = branches.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full" dir={isAr ? "rtl" : "ltr"}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        {isAr ? "الفروع التابعة" : "Linked Branches"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm font-bold">
                        {isAr ? "قائمة الحسابات والمطاعم المرتبطة بهذا المطعم كفروع تابعة له" : "List of accounts and restaurants linked to this restaurant as branches"}
                    </p>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {isAr ? "ملاحظة: لإنشاء فرع جديد، قم بإنشاء حساب جديد تماماً للمطعم، ثم تواصل مع الإدارة (Super Admin) لربطه كفرع تابع لمطعمك الرئيسي." 
                        : "Note: To create a new branch, create a fresh account for the restaurant, then contact the Super Admin to link it as a branch to your main restaurant."}
                </p>
            </div>

            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder={isAr ? "ابحث عن فرع..." : "Search branches..."}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/30 outline-none transition-all text-slate-900 dark:text-white"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50">
                    <Store className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-zinc-700" />
                    <p className="text-slate-500 dark:text-zinc-500 font-bold text-lg">{isAr ? "لا توجد فروع مرتبطة" : "No linked branches found"}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(branch => (
                        <div key={branch.id} className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/30 transition-all flex flex-col">
                            <div className="p-5 flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                                        <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg truncate">{branch.name}</h3>
                                        <p className="text-xs text-slate-400 dark:text-zinc-500 font-bold max-w-full truncate">
                                            {branch.email || "No email"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-zinc-800/50">
                                <button
                                    onClick={() => handleSwitchToBranch(branch.id)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 font-bold rounded-xl transition active:scale-95"
                                >
                                    {isAr ? "دخول إلى الفرع" : "Switch to Branch"}
                                    <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
