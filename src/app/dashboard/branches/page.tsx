"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Search, Plus, MapPin, Store, Settings, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";

export default function BranchesPage() {
    const { language } = useLanguage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    const fetchBranches = useCallback(async (tId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('branches')
                .select('*')
                .eq('tenant_id', tId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBranches(data || []);
        } catch (err: unknown) {
            console.error(err);
            toast.error(language === "ar" ? "فشل في تحميل الفروع" : "Failed to load branches");
        } finally {
            setLoading(false);
        }
    }, [language]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if(!session) return;
            
            const rId = sessionStorage.getItem('impersonating_tenant') || null;
            if (rId) {
                setRestaurantId(rId);
                fetchBranches(rId);
            } else {
                // Fetch normally if not impersonating (Admin owner or staff with permissions)
                const impTenant = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;
                const { data: rest } = await supabase.from('restaurants').select('id').eq(impTenant ? 'id' : 'email', impTenant || session.user.email).single();
                if(rest) {
                    setRestaurantId(rest.id);
                    fetchBranches(rest.id);
                } else {
                    const { data: staff } = await supabase.from('team_members').select('restaurant_id').eq('auth_id', session.user.id).single();
                    if(staff) {
                        setRestaurantId(staff.restaurant_id);
                        fetchBranches(staff.restaurant_id);
                    }
                }
            }
        };
        init();
    }, [fetchBranches]);

    const handleCreateBranch = async () => {
        if (!restaurantId) return;
        try {
            // Check limits first based on active subscription plan
            const { data: rest } = await supabase.from('restaurants').select('subscription_plan').eq('id', restaurantId).single();
            if (rest && rest.subscription_plan) {
                const { data: plan } = await supabase.from('subscription_plans').select('max_branches').eq('plan_name', rest.subscription_plan).single();
                if (plan && branches.length >= plan.max_branches) {
                    toast.error(language === "ar" ? `لقد وصلت للحد الأقصى للفروع (${plan.max_branches}) في باقتك الحالية.` : `You have reached the maximum branches limit (${plan.max_branches}) for your current plan.`);
                    return;
                }
            }

            const { error } = await supabase.from('branches').insert([
                {
                    tenant_id: restaurantId,
                    branch_name: `New Branch ${branches.length + 1}`,
                    address: "Branch Address"
                }
            ]);

            if (error) throw error;
            toast.success(language === "ar" ? "تم إنشاء فرع جديد" : "New branch created");
            fetchBranches(restaurantId);
        } catch (err: unknown) {
            console.error(err);
            toast.error(language === "ar" ? "تعذر إنشاء الفرع" : "Failed to create branch");
        }
    };

    const filtered = branches.filter(b => 
        b.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (b.address && b.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                        {language === "ar" ? "إدارة الفروع" : "Branch Management"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">
                        {language === "ar" ? "إدارة نقاط البيع وعناوين الفروع" : "Manage your selling nodes and addresses"}
                    </p>
                </div>
                <button 
                    onClick={handleCreateBranch}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-colors w-fit"
                >
                    <Plus className="w-4 h-4" />
                    {language === "ar" ? "إضافة فرع جديد" : "Add New Branch"}
                </button>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={language === "ar" ? "ابحث برقم أو إسم الفرع..." : "Search branches..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{language === "ar" ? "الفرع" : "Branch Name"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{language === "ar" ? "العنوان" : "Address"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{language === "ar" ? "رقم الهاتف" : "Phone"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{language === "ar" ? "تاريخ الإضافة" : "Added"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">{language === "ar" ? "إجراءات" : "Actions"}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">{language === "ar" ? "جاري التحميل..." : "Loading branches..."}</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">{language === "ar" ? "لم يتم العثور على فروع" : "No branches found."}</td>
                                </tr>
                            ) : (
                                filtered.map((branch) => (
                                    <tr key={branch.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                    <Store className="w-5 h-5 text-teal-600 dark:text-emerald-400" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">{branch.branch_name}</div>
                                                    <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{branch.is_main ? (language === "ar" ? "الفرع الرئيسي" : "Main Branch") : "Sub-branch"}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-zinc-300 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-slate-400" /> {branch.address || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-zinc-300">
                                            {branch.phone || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-zinc-400">
                                            {new Date(branch.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-stone-400 hover:text-teal-600 dark:hover:text-emerald-400 transition-colors" title={language === "ar" ? "الإعدادات" : "Settings"}>
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
