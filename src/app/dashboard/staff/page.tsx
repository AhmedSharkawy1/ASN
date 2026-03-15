"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Search, Plus, Shield, CheckCircle2, UserCog, KeySquare } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";
import { X, Check, LayoutGrid, Building } from "lucide-react";

export default function StaffPage() {
    const { language } = useLanguage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    // Modal States
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [branches, setBranches] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    // Form States
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if(!session) return;
            
            const rId = sessionStorage.getItem('impersonating_tenant') || null;
            if (rId) {
                setRestaurantId(rId);
                fetchStaff(rId);
            } else {
                const { data: rest } = await supabase.from('restaurants').select('id').eq('email', session.user.email).single();
                if(rest) {
                    setRestaurantId(rest.id);
                    fetchStaff(rest.id);
                    fetchBranches(rest.id);
                }
            }
        };
        init();
    }, []);

    const fetchBranches = async (tId: string) => {
        const { data } = await supabase.from('branches').select('*').eq('tenant_id', tId);
        if (data) setBranches(data);
    };

    const fetchStaff = async (tId: string) => {
        setLoading(true);
        try {
            // Re-using team_members for backward compatibility, but enhanced for the scoped dashboard system
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .eq('restaurant_id', tId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStaffList(data || []);
        } catch (err: unknown) {
            console.error(err);
            toast.error(language === "ar" ? "فشل في تحميل الموظفين" : "Failed to load staff");
        } finally {
            setLoading(false);
        }
    };

    // Modal States
    const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: "", email: "", phone: "", role: "staff" });
    const [adding, setAdding] = useState(false);

    const handleCreateStaff = async () => {
        if (!newStaff.name || !newStaff.email) {
            toast.error(language === "ar" ? "يرجى ملء الاسم والبريد" : "Please fill name and email");
            return;
        }
        setAdding(true);
        try {
            const { error } = await supabase.from('team_members').insert([{
                restaurant_id: restaurantId,
                name: newStaff.name,
                email: newStaff.email,
                phone: newStaff.phone,
                role: newStaff.role,
                is_active: true
            }]);
            if (error) throw error;
            toast.success(language === "ar" ? "تمت إضافة الموظف بنجاح" : "Staff added successfully");
            setIsAddStaffModalOpen(false);
            if(restaurantId) fetchStaff(restaurantId);
        } catch (err) {
            console.error(err);
            toast.error("Failed to add staff");
        } finally {
            setAdding(false);
        }
    };

    const openPermissionsModal = async (staff: any) => {
        setSelectedStaff(staff);
        
        // Fetch current permissions
        const { data: pp } = await supabase.from('page_permissions').select('page_key, can_view').eq('user_id', staff.id);
        const permMap: Record<string, boolean> = {};
        if (pp) pp.forEach(p => permMap[p.page_key] = p.can_view);
        setPermissions(permMap);

        // Fetch current branch access
        const { data: sba } = await supabase.from('staff_branch_access').select('branch_id').eq('user_id', staff.id);
        if (sba) setSelectedBranches(sba.map(b => b.branch_id));
        
        setIsPermissionsModalOpen(true);
    };

    const savePermissions = async () => {
        if (!selectedStaff) return;
        setSaving(true);
        try {
            // Save Page Permissions
            const ppPayload = Object.keys(permissions).map(key => ({
                user_id: selectedStaff.id,
                page_key: key,
                can_view: permissions[key]
            }));
            await supabase.from('page_permissions').upsert(ppPayload, { onConflict: 'user_id,page_key' });

            // Save Branch Access
            await supabase.from('staff_branch_access').delete().eq('user_id', selectedStaff.id);
            const sbaPayload = selectedBranches.map(bid => ({
                user_id: selectedStaff.id,
                branch_id: bid
            }));
            await supabase.from('staff_branch_access').insert(sbaPayload);

            toast.success(language === "ar" ? "تم تحديث الصلاحيات بنجاح" : "Permissions updated successfully");
            setIsPermissionsModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save permissions");
        } finally {
            setSaving(false);
        }
    };

    const AVAILABLE_PAGES = [
        { key: 'pos', nameEn: 'POS', nameAr: 'نقطة البيع' },
        { key: 'orders', nameEn: 'Orders', nameAr: 'الطلبات' },
        { key: 'kitchen', nameEn: 'Kitchen Display', nameAr: 'شاشة المطبخ' },
        { key: 'menu', nameEn: 'Menu & Products', nameAr: 'القائمة والمنتجات' },
        { key: 'reports', nameEn: 'Reports', nameAr: 'التقارير' },
        { key: 'inventory', nameEn: 'Inventory', nameAr: 'المخزن' },
        { key: 'factory', nameEn: 'Production', nameAr: 'الإنتاج' },
        { key: 'costs', nameEn: 'Costs', nameAr: 'التكاليف' },
        { key: 'customers', nameEn: 'Customers', nameAr: 'العملاء' },
    ];

    const filtered = staffList.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                        {language === "ar" ? "لوحة الموظفين" : "Staff & Permissions"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">
                        {language === "ar" ? "أضف أفراد الفريق وخصص الصلاحيات" : "Add team members and assign access permissions"}
                    </p>
                </div>
                <button 
                    onClick={() => {
                        setNewStaff({ name: "", email: "", phone: "", role: "staff" });
                        setIsAddStaffModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors w-fit"
                >
                    <Plus className="w-4 h-4" />
                    {language === "ar" ? "دعوة موظف" : "Invite Staff"}
                </button>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={language === "ar" ? "ابحث بالاسم أو البريد..." : "Search staff..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{language === "ar" ? "الإسم" : "Name"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{language === "ar" ? "البريد الإلكتروني" : "Email"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{language === "ar" ? "الدور" : "Role"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{language === "ar" ? "الحالة" : "Status"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">{language === "ar" ? "إعدادات" : "Manage"}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">{language === "ar" ? "جاري التحميل..." : "Loading staff..."}</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">{language === "ar" ? "لم يتم العثور على موظفين" : "No staff found."}</td>
                                </tr>
                            ) : (
                                filtered.map((staff) => (
                                    <tr key={staff.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-white">{staff.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-zinc-300">
                                            {staff.email || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 capitalize">
                                                <Shield className="w-3.5 h-3.5" /> Staff
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {staff.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-500 dark:bg-stone-800/50 dark:text-stone-400">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => openPermissionsModal(staff)}
                                                    className="p-2 text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-stone-50 dark:bg-stone-800 rounded-lg" 
                                                    title={language === "ar" ? "صلاحيات الوصول" : "Page Permissions"}
                                                >
                                                    <KeySquare className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors bg-stone-50 dark:bg-stone-800 rounded-lg" title={language === "ar" ? "تعديل الموظف" : "Edit Profile"}>
                                                    <UserCog className="w-4 h-4" />
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

            {/* Permissions Modal */}
            {isPermissionsModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#131b26] w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <KeySquare className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
                                    {language === "ar" ? `صلاحيات ${selectedStaff?.name}` : `Permissions for ${selectedStaff?.name}`}
                                </h2>
                            </div>
                            <button onClick={() => setIsPermissionsModalOpen(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8 CustomScrollbar">
                            {/* Page Access */}
                            <div>
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                                    <LayoutGrid className="w-4 h-4" />
                                    {language === "ar" ? "الوصول للصفحات" : "Page Access"}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {AVAILABLE_PAGES.map(page => (
                                        <button
                                            key={page.key}
                                            onClick={() => setPermissions(prev => ({ ...prev, [page.key]: !prev[page.key] }))}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
                                                permissions[page.key]
                                                ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30'
                                                : 'bg-stone-50 border-stone-100 dark:bg-white/5 dark:border-white/5'
                                            }`}
                                        >
                                            <span className={`font-bold transition-colors ${permissions[page.key] ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {language === "ar" ? page.nameAr : page.nameEn}
                                            </span>
                                            {permissions[page.key] && <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20"><Check className="w-4 h-4 text-white" /></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Branch Access */}
                            <div>
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                                    <Building className="w-4 h-4" />
                                    {language === "ar" ? "الوصول للفروع" : "Branch Access"}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {branches.map(branch => (
                                        <button
                                            key={branch.id}
                                            onClick={() => {
                                                if (selectedBranches.includes(branch.id)) {
                                                    setSelectedBranches(prev => prev.filter(id => id !== branch.id));
                                                } else {
                                                    setSelectedBranches(prev => [...prev, branch.id]);
                                                }
                                            }}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
                                                selectedBranches.includes(branch.id)
                                                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                                                : 'bg-stone-50 border-stone-100 dark:bg-white/5 dark:border-white/5'
                                            }`}
                                        >
                                            <span className={`font-bold transition-colors ${selectedBranches.includes(branch.id) ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {branch.branch_name}
                                            </span>
                                            {selectedBranches.includes(branch.id) && <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"><Check className="w-4 h-4 text-white" /></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-white/5 flex gap-3">
                            <button
                                onClick={() => setIsPermissionsModalOpen(false)}
                                className="flex-1 py-3 px-4 rounded-2xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold hover:bg-stone-50 dark:hover:bg-white/10 transition-colors"
                            >
                                {language === "ar" ? "إلغاء" : "Cancel"}
                            </button>
                            <button
                                onClick={savePermissions}
                                disabled={saving}
                                className="flex-[2] py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50"
                            >
                                {saving ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ التغييرات" : "Save Changes")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Staff Modal */}
            {isAddStaffModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#131b26] w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
                                {language === "ar" ? "إضافة موظف جديد" : "Add New Staff"}
                            </h2>
                            <button onClick={() => setIsAddStaffModalOpen(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">{language === "ar" ? "الاسم كامل" : "Full Name"}</label>
                                <input 
                                    type="text" 
                                    value={newStaff.name}
                                    onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">{language === "ar" ? "البريد الإلكتروني" : "Email"}</label>
                                <input 
                                    type="email" 
                                    value={newStaff.email}
                                    onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsAddStaffModalOpen(false)}
                                    className="flex-1 py-3 px-4 rounded-2xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold hover:bg-stone-50 dark:hover:bg-white/10 transition-colors"
                                >
                                    {language === "ar" ? "إلغاء" : "Cancel"}
                                </button>
                                <button
                                    onClick={handleCreateStaff}
                                    disabled={adding}
                                    className="flex-[2] py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50"
                                >
                                    {adding ? "..." : (language === "ar" ? "إضافة" : "Add Member")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
