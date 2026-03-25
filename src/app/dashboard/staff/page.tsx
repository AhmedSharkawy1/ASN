"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Search, Plus, Shield, CheckCircle2, UserCog, KeySquare, Delete, Trash2, Key, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";
import { X, Check, LayoutGrid } from "lucide-react";

interface StaffMember {
    id: string;
    auth_id: string;
    name: string;
    email: string | null;
    phone?: string;
    role: string;
    is_active: boolean;
}

interface TenantLink {
    id: string;
    name: string;
}

export default function StaffPage() {
    const { language } = useLanguage();
    const isAr = language === "ar";
    
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [tenantLinks, setTenantLinks] = useState<TenantLink[]>([]);

    // Modals
    const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [isEditCredsModalOpen, setIsEditCredsModalOpen] = useState(false);
    
    // States
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [saving, setSaving] = useState(false);

    // Form: Permissions
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});

    // Form: Add Staff
    const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", role: "staff", targetBranchId: "" });
    const [adding, setAdding] = useState(false);

    // Form: Edit Creds
    const [editCreds, setEditCreds] = useState({ email: "", password: "", role: "staff" });
    const [updatingCreds, setUpdatingCreds] = useState(false);

    const fetchStaff = useCallback(async (tId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .eq('restaurant_id', tId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStaffList((data as StaffMember[]) || []);
        } catch (err: unknown) {
            console.error(err);
            toast.error(isAr ? "فشل في تحميل الموظفين" : "Failed to load staff");
        } finally {
            setLoading(false);
        }
    }, [isAr]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if(!session) return;
            
            let activeResId = sessionStorage.getItem('impersonating_tenant');
            const { data: myRest } = await supabase.from('restaurants').select('id, parent_id').eq('email', session.user.email).maybeSingle();

            if (!activeResId && myRest) {
                activeResId = myRest.id;
            }

            if (activeResId) {
                setRestaurantId(activeResId);
                fetchStaff(activeResId);
                
                // Fetch branch list for the dropdown
                const rootId = myRest?.parent_id || myRest?.id || activeResId;
                const { data: allBranches } = await supabase.from('restaurants').select('id, name').or(`id.eq.${rootId},parent_id.eq.${rootId}`);
                if (allBranches) setTenantLinks(allBranches);
                
                setNewStaff(prev => ({ ...prev, targetBranchId: activeResId! }));
            }
        };
        init();
    }, [fetchStaff]);

    // ----------------------------------------------------------------------
    // Add Staff (Uses API to create Auth User)
    // ----------------------------------------------------------------------
    const handleCreateStaff = async () => {
        if (!newStaff.name || !newStaff.email || !newStaff.password || !newStaff.targetBranchId) {
            toast.error(isAr ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
            return;
        }
        if (newStaff.password.length < 6) {
            toast.error(isAr ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
            return;
        }

        setAdding(true);
        try {
            const username = newStaff.email.split('@')[0] + Math.floor(Math.random() * 1000);
            
            const res = await fetch('/api/team/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    email: newStaff.email,
                    password: newStaff.password,
                    role: newStaff.role,
                    name: newStaff.name,
                    restaurant_id: newStaff.targetBranchId,
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create user");

            toast.success(isAr ? "تمت إضافة الموظف بنجاح" : "Staff added successfully");
            setIsAddStaffModalOpen(false);
            
            // Only refresh if we added them to the current branch
            if (newStaff.targetBranchId === restaurantId) {
                fetchStaff(restaurantId);
            } else {
                toast.info(isAr ? "تم إضافة الموظف للفرع المحدد. لن يظهر هنا." : "Employee added to target branch. You won't see them here.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || (isAr ? "فشل في الإضافة" : "Failed to add staff"));
        } finally {
            setAdding(false);
        }
    };

    // ----------------------------------------------------------------------
    // Update Staff Credentials
    // ----------------------------------------------------------------------
    const openEditCredsModal = (staff: StaffMember) => {
        setSelectedStaff(staff);
        setEditCreds({ email: staff.email || "", password: "", role: staff.role });
        setIsEditCredsModalOpen(true);
    };

    const handleUpdateCreds = async () => {
        if (!selectedStaff) return;
        setUpdatingCreds(true);
        try {
            const payload: any = { user_id: selectedStaff.auth_id, role: editCreds.role };
            if (editCreds.email && editCreds.email !== selectedStaff.email) payload.email = editCreds.email;
            if (editCreds.password) payload.password = editCreds.password;

            const res = await fetch('/api/team/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(isAr ? "تم تحديث البيانات بنجاح" : "Credentials updated successfully");
            setIsEditCredsModalOpen(false);
            if(restaurantId) fetchStaff(restaurantId);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to update");
        } finally {
            setUpdatingCreds(false);
        }
    };

    // ----------------------------------------------------------------------
    // Delete Staff
    // ----------------------------------------------------------------------
    const handleDeleteStaff = async (staff: StaffMember) => {
        if (!confirm(isAr ? `هل أنت متأكد من حذف ${staff.name}؟` : `Are you sure you want to delete ${staff.name}?`)) return;
        
        try {
            const res = await fetch('/api/team/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: staff.auth_id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(isAr ? "تم حذف الموظف" : "Staff deleted");
            if(restaurantId) fetchStaff(restaurantId);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to delete");
        }
    };

    // ----------------------------------------------------------------------
    // Permissions (Per-Page)
    // ----------------------------------------------------------------------
    const openPermissionsModal = async (staff: StaffMember) => {
        setSelectedStaff(staff);
        
        // Fetch current permissions
        const { data: pp } = await supabase.from('page_permissions').select('page_key, can_view').eq('user_id', staff.id);
        const permMap: Record<string, boolean> = {};
        if (pp) pp.forEach(p => permMap[p.page_key] = p.can_view);
        setPermissions(permMap);
        setIsPermissionsModalOpen(true);
    };

    const savePermissions = async () => {
        if (!selectedStaff) return;
        setSaving(true);
        try {
            const ppPayload = Object.keys(permissions).map(key => ({
                user_id: selectedStaff.id,
                page_key: key,
                can_view: permissions[key]
            }));
            await supabase.from('page_permissions').upsert(ppPayload, { onConflict: 'user_id,page_key' });

            toast.success(isAr ? "تم تحديث الصلاحيات بدقة للصفحات" : "Page permissions updated perfectly");
            setIsPermissionsModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save permissions");
        } finally {
            setSaving(false);
        }
    };

    const AVAILABLE_PAGES = [
        { key: 'dashboard', nameEn: 'Dashboard (Main)', nameAr: 'الرئيسية' },
        { key: 'orders', nameEn: 'Orders System', nameAr: 'نظام الطلبيات' },
        { key: 'pos', nameEn: 'POS Terminal', nameAr: 'نقطة البيع (POS)' },
        { key: 'kitchen', nameEn: 'Kitchen Display', nameAr: 'شاشة المطبخ' },
        { key: 'reports', nameEn: 'Reports', nameAr: 'التقارير' },
        { key: 'menu', nameEn: 'Products (Menu)', nameAr: 'المنتجات والقائمة' },
        { key: 'tables', nameEn: 'Tables', nameAr: 'الطاولات' },
        { key: 'delivery', nameEn: 'Delivery', nameAr: 'الدليفري' },
        { key: 'inventory', nameEn: 'Inventory', nameAr: 'المخزون' },
        { key: 'recipes', nameEn: 'Recipes', nameAr: 'الوصفات' },
        { key: 'factory', nameEn: 'Factory', nameAr: 'المصنع' },
        { key: 'inventory_movements', nameEn: 'Inventory Movements', nameAr: 'حركات المخزون' },
        { key: 'costs', nameEn: 'Costs & Profits', nameAr: 'التكاليف والأرباح' },
        { key: 'supplies', nameEn: 'Supplies', nameAr: 'التوريدات' },
        { key: 'branch_supplies', nameEn: 'Branch Supplies', nameAr: 'توريدات الفروع' },
        { key: 'accounting', nameEn: 'Accounting', nameAr: 'المالية والحسابات' },
        { key: 'hr_dashboard', nameEn: 'HR Dashboard', nameAr: 'لوحة الموارد البشرية (HR)' },
        { key: 'hr_employees', nameEn: 'HR Employees', nameAr: 'الموظفين' },
        { key: 'hr_attendance', nameEn: 'Attendance', nameAr: 'الحضور والانصراف' },
        { key: 'hr_payroll', nameEn: 'Payroll', nameAr: 'كشف المرتبات' },
        { key: 'hr_deductions', nameEn: 'Deductions', nameAr: 'الخصومات' },
        { key: 'hr_reports', nameEn: 'HR Reports', nameAr: 'تقارير HR' },
        { key: 'customers', nameEn: 'Customers', nameAr: 'العملاء' },
        { key: 'staff', nameEn: 'Team & Staff', nameAr: 'الفريق' },
        { key: 'customer_notifications', nameEn: 'Customer Notifications', nameAr: 'إشعارات العملاء' },
        { key: 'printer_settings', nameEn: 'Printer Settings', nameAr: 'إعدادات الطابعة' },
        { key: 'branches', nameEn: 'Branches', nameAr: 'الفروع' },
        { key: 'theme', nameEn: 'Theme Customization', nameAr: 'تخصيص المظهر' },
        { key: 'qr', nameEn: 'QR Code', nameAr: 'الـ QR' },
        { key: 'settings', nameEn: 'Settings', nameAr: 'الإعدادات' },
    ];

    const filtered = staffList.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full" dir={isAr ? "rtl" : "ltr"}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                        {isAr ? "فريق العمل والصلاحيات" : "Staff & Permissions"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1 font-bold">
                        {isAr ? "إدارة العاملين بهذا الفرع بدقة وتحديد الصلاحيات الحرفية لكل صفحة" : "Manage branch employees and set exact per-page access permissions"}
                    </p>
                </div>
                <button 
                    onClick={() => {
                        setNewStaff({ name: "", email: "", password: "", role: "staff", targetBranchId: restaurantId! });
                        setIsAddStaffModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 w-fit"
                >
                    <Plus className="w-5 h-5" />
                    {isAr ? "إضافة موظف جديد" : "Add Employee"}
                </button>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={isAr ? "ابحث بالاسم أو البريد..." : "Search staff..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left rtl:text-right border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{isAr ? "الاسم" : "Name"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{isAr ? "الإيميل" : "Email"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{isAr ? "الوظيفة" : "Role"}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-center">{isAr ? "الأدوات" : "Actions"}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-bold">{isAr ? "جاري التحميل..." : "Loading staff..."}</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-bold">{isAr ? "لا يوجد موظفين مسجلين بهذا الفرع." : "No staff found in this branch."}</td>
                                </tr>
                            ) : (
                                filtered.map((staff) => (
                                    <tr key={staff.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div className="font-extrabold text-slate-900 dark:text-white">{staff.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-zinc-300">
                                            {staff.email || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 uppercase">
                                                <Shield className="w-3.5 h-3.5" /> 
                                                {isAr && staff.role === 'admin' ? 'مدير' : 
                                                 isAr && staff.role === 'cashier' ? 'كاشير' : 
                                                 isAr && staff.role === 'delivery' ? 'دليفري' :
                                                 isAr ? 'موظف' : staff.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => openPermissionsModal(staff)}
                                                    className="p-2 text-stone-500 hover:text-indigo-600 dark:text-stone-400 dark:hover:text-indigo-400 transition-colors bg-stone-100 hover:bg-indigo-50 dark:bg-stone-800 dark:hover:bg-indigo-500/20 rounded-xl font-bold flex items-center gap-2 text-sm" 
                                                >
                                                    <KeySquare className="w-4 h-4" />
                                                    <span className="hidden lg:inline">{isAr ? "الصفحات" : "Pages"}</span>
                                                </button>
                                                <button 
                                                    onClick={() => openEditCredsModal(staff)}
                                                    className="p-2 text-stone-500 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400 transition-colors bg-stone-100 hover:bg-amber-50 dark:bg-stone-800 dark:hover:bg-amber-500/20 rounded-xl font-bold flex items-center gap-2 text-sm" 
                                                >
                                                    <UserCog className="w-4 h-4" />
                                                    <span className="hidden lg:inline">{isAr ? "البيانات" : "Credentials"}</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteStaff(staff)}
                                                    className="p-2 text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400 transition-colors bg-stone-100 hover:bg-red-50 dark:bg-stone-800 dark:hover:bg-red-500/20 rounded-xl"
                                                    title={isAr ? "حذف نهائي" : "Delete"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
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

            {/* ADD STAFF MODAL */}
            {isAddStaffModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#131b26] w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-500" />
                                {isAr ? "موظف جديد" : "New Employee"}
                            </h2>
                            <button onClick={() => setIsAddStaffModalOpen(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-extrabold text-slate-600 dark:text-slate-400 mb-1.5">{isAr ? "اسم الموظف" : "Name"}</label>
                                <input type="text" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="w-full px-4 py-3 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-extrabold text-slate-600 dark:text-slate-400 mb-1.5">{isAr ? "البريد الإلكتروني للإدخول (يجب أن يكون فريداً)" : "Login Email (Must be unique globally)"}</label>
                                <input type="email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} className="w-full px-4 py-3 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-extrabold text-slate-600 dark:text-slate-400 mb-1.5">{isAr ? "كلمة المرور القوية (6 أحرف على الأقل)" : "Strong Password (min 6 chars)"}</label>
                                <input type="password" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} className="w-full px-4 py-3 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-extrabold text-slate-600 dark:text-slate-400 mb-1.5">{isAr ? "تعيين في فرع" : "Assign to Branch"}</label>
                                    <select value={newStaff.targetBranchId} onChange={e => setNewStaff({...newStaff, targetBranchId: e.target.value})} className="w-full px-4 py-3 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                                        {tenantLinks.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-extrabold text-slate-600 dark:text-slate-400 mb-1.5">{isAr ? "الدور العام" : "Role"}</label>
                                    <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} className="w-full px-4 py-3 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                                        <option value="staff">{isAr ? "موظف عادي" : "Staff"}</option>
                                        <option value="cashier">{isAr ? "كاشير محترف" : "Cashier"}</option>
                                        <option value="delivery">{isAr ? "توصيل (دليفري)" : "Delivery"}</option>
                                        <option value="admin">{isAr ? "مدير فرع" : "Branch Admin"}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button onClick={() => setIsAddStaffModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-extrabold hover:bg-stone-50 dark:hover:bg-white/10 transition-colors">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleCreateStaff} disabled={adding} className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {adding ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"/> : (isAr ? "إنشاء الصلاحيات والحساب" : "Create Account")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT CREDENTIALS MODAL */}
            {isEditCredsModalOpen && selectedStaff && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#131b26] w-full max-w-sm rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                                <Key className="w-5 h-5 text-amber-500" />
                                {isAr ? "تعديل البيانات" : "Edit Details"}
                            </h2>
                            <button onClick={() => setIsEditCredsModalOpen(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-extrabold text-slate-600 dark:text-slate-400 mb-1.5">{isAr ? "تغيير الإيميل" : "Change Email"}</label>
                                <input type="email" value={editCreds.email} onChange={e => setEditCreds({...editCreds, email: e.target.value})} className="w-full px-4 py-3 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-500 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-extrabold text-slate-600 dark:text-slate-400 mb-1.5">{isAr ? "تعيين كلمة مرور جديدة" : "Set New Password"}</label>
                                <input type="password" placeholder={isAr ? "اتركه فارغاً إذا لا تريد تغييره" : "Leave blank to keep current"} value={editCreds.password} onChange={e => setEditCreds({...editCreds, password: e.target.value})} className="w-full px-4 py-3 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-500 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-extrabold text-slate-600 dark:text-slate-400 mb-1.5">{isAr ? "تغيير الدور" : "Change Role"}</label>
                                <select value={editCreds.role} onChange={e => setEditCreds({...editCreds, role: e.target.value})} className="w-full px-4 py-3 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-500 dark:text-white">
                                    <option value="staff">{isAr ? "موظف عادي" : "Staff"}</option>
                                    <option value="cashier">{isAr ? "كاشير محترف" : "Cashier"}</option>
                                    <option value="delivery">{isAr ? "توصيل (دليفري)" : "Delivery"}</option>
                                    <option value="admin">{isAr ? "مدير فرع" : "Branch Admin"}</option>
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button onClick={() => setIsEditCredsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-extrabold hover:bg-stone-50 dark:hover:bg-white/10 transition-colors">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleUpdateCreds} disabled={updatingCreds} className="flex-[2] py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50">
                                    {updatingCreds ? "..." : (isAr ? "حفظ التعديلات" : "Save Changes")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PERMISSIONS MODAL (Per-Page Isolation) */}
            {isPermissionsModalOpen && selectedStaff && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#131b26] w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <LayoutGrid className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
                                    {isAr ? `صلاحيات الصفحات لـ ${selectedStaff.name}` : `Page Permissions - ${selectedStaff.name}`}
                                </h2>
                            </div>
                            <button onClick={() => setIsPermissionsModalOpen(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 CustomScrollbar bg-slate-50/50 dark:bg-[#0a0f16]">
                            <p className="text-sm font-bold text-slate-500 dark:text-zinc-400">
                                {isAr ? "قم بتفعيل الصفحات التي يُسمح لهذا الموظف برؤيتها والتعامل معها بداخل هذا الفرع فقط." : "Toggle the specific pages this employee is allowed to view and interact with exclusively in this branch."}
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {AVAILABLE_PAGES.map(page => (
                                    <button
                                        key={page.key}
                                        onClick={() => setPermissions(prev => ({ ...prev, [page.key]: !prev[page.key] }))}
                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                                            permissions[page.key]
                                            ? 'bg-white dark:bg-[#131b26] border-indigo-500 shadow-md shadow-indigo-500/10 scale-[1.02]'
                                            : 'bg-white/50 dark:bg-[#131b26]/50 border-stone-200 dark:border-stone-800 hover:border-indigo-300'
                                        }`}
                                    >
                                        <span className={`font-extrabold transition-colors ${permissions[page.key] ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-zinc-500'}`}>
                                            {isAr ? page.nameAr : page.nameEn}
                                        </span>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                            permissions[page.key] ? 'bg-indigo-500 shadow-lg shadow-indigo-500/30' : 'bg-stone-200 dark:bg-zinc-800'
                                        }`}>
                                            {permissions[page.key] && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-5 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-[#131b26] flex gap-3 shrink-0">
                            <button onClick={() => setIsPermissionsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl border border-stone-200 dark:border-stone-800 text-slate-600 dark:text-slate-300 font-extrabold hover:bg-stone-50 dark:hover:bg-white/5 transition-colors">
                                {isAr ? "تجاهل" : "Cancel"}
                            </button>
                            <button onClick={savePermissions} disabled={saving} className="flex-[2] py-3 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50">
                                {saving ? "..." : (isAr ? "تطبيق الصلاحيات بدقة" : "Apply Granular Permissions")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
