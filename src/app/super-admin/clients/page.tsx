"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Building2, Search, ExternalLink, ShieldCheck, MoreVertical, LogIn, X, LayoutList, Eye, Megaphone, Key, Crown, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/context/LanguageContext";

interface Client {
    id: string;
    name: string;
    slug: string | null;
    email: string | null;
    subscription_plan: string | null;
    subscription_expires_at: string | null;
    created_at: string;
    parent_id: string | null;
    is_marketing_account: boolean;
}

interface PageAccess {
    page_key: string;
    enabled: boolean;
}

export default function SuperAdminClientsPage() {
    const { language } = useLanguage();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientPermissions, setClientPermissions] = useState<Record<string, boolean>>({});
    const [savingAccess, setSavingAccess] = useState(false);
    const [showAsnBranding, setShowAsnBranding] = useState(true);

    // Parent Link Modal Options
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [selectedParentId, setSelectedParentId] = useState<string>("");
    const [savingLink, setSavingLink] = useState(false);

    // Password Update Modal Options
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // Subscription Modal Options
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [subType, setSubType] = useState<string>("monthly");
    const [savingSub, setSavingSub] = useState(false);

    const PAGE_GROUPS = [
        {
            titleEn: 'Main', titleAr: 'الرئيسية',
            pages: [
                { key: 'dashboard', nameEn: 'Main Dashboard', nameAr: 'الرئيسية' },
            ]
        },
        {
            titleEn: 'Orders', titleAr: 'الطلبات',
            pages: [
                { key: 'orders', nameEn: 'Orders Management', nameAr: 'نظام الطلبيات' },
                { key: 'pos', nameEn: 'POS System', nameAr: 'نقطة البيع (POS)' },
                { key: 'kitchen', nameEn: 'Kitchen Display', nameAr: 'شاشة المطبخ' },
                { key: 'reports', nameEn: 'Statistics & Reports', nameAr: 'التقارير والإحصائيات' },
            ]
        },
        {
            titleEn: 'Menu', titleAr: 'القائمة',
            pages: [
                { key: 'products', nameEn: 'Products & Categories', nameAr: 'المنتجات والأقسام' },
                { key: 'tables', nameEn: 'Tables Management', nameAr: 'إدارة الطاولات' },
                { key: 'delivery', nameEn: 'Delivery Setup', nameAr: 'إعدادات الدليفري' },
            ]
        },
        {
            titleEn: 'Inventory & Factory', titleAr: 'المخزون والمصنع',
            pages: [
                { key: 'inventory', nameEn: 'Inventory Management', nameAr: 'المخزون' },
                { key: 'recipes', nameEn: 'Recipes & Formulas', nameAr: 'الوصفات' },
                { key: 'factory', nameEn: 'Factory Management', nameAr: 'المصنع' },
                { key: 'transactions', nameEn: 'Stock Transactions', nameAr: 'حركات المخزون' },
                { key: 'costs', nameEn: 'Cost Analytics', nameAr: 'التكاليف والأرباح' },
                { key: 'supplies', nameEn: 'Purchase Supplies', nameAr: 'التوريدات' },
                { key: 'branch_supplies', nameEn: 'Branch Supplies', nameAr: 'توريدات الفروع' },
            ]
        },
        {
            titleEn: 'Finance', titleAr: 'المالية',
            pages: [
                { key: 'accounts', nameEn: 'Financial Accounts', nameAr: 'الحسابات المالية' },
            ]
        },
        {
            titleEn: 'HR & Payroll', titleAr: 'الموارد البشرية',
            pages: [
                { key: 'hr', nameEn: 'HR Dashboard', nameAr: 'لوحة الموارد البشرية' },
                { key: 'hr_employees', nameEn: 'Employees', nameAr: 'إدارة الموظفين' },
                { key: 'hr_attendance', nameEn: 'Attendance', nameAr: 'الحضور والانصراف' },
                { key: 'hr_payroll', nameEn: 'Payroll', nameAr: 'كشف المرتبات' },
                { key: 'hr_deductions', nameEn: 'Deductions & Bonuses', nameAr: 'الخصومات والمكافآت' },
                { key: 'hr_reports', nameEn: 'HR Reports', nameAr: 'تقارير الموارد البشرية' },
            ]
        },
        {
            titleEn: 'Admin & Team', titleAr: 'المسؤول والتسويق',
            pages: [
                { key: 'marketing_links', nameEn: 'Marketing Links', nameAr: 'روابط العرض للتسويق' },
                { key: 'customers', nameEn: 'Customers database', nameAr: 'قاعدة بيانات العملاء' },
                { key: 'team', nameEn: 'Staff & Roles', nameAr: 'إدارة الفريق' },
                { key: 'notifications', nameEn: 'Client Notifications', nameAr: 'إشعارات العملاء' },
            ]
        },
        {
            titleEn: 'Tools & Settings', titleAr: 'الأدوات والإعدادات',
            pages: [
                { key: 'printer', nameEn: 'Printer Settings', nameAr: 'إعدادات الطابعة' },
                { key: 'branches', nameEn: 'Branches Management', nameAr: 'إدارة الفروع' },
                { key: 'theme', nameEn: 'Appearance Customization', nameAr: 'تخصيص المظهر' },
                { key: 'qr', nameEn: 'QR Code Generator', nameAr: 'مولد QR' },
                { key: 'settings_page', nameEn: 'Restaurant Settings', nameAr: 'الإعدادات' },
            ]
        }
    ];

    const ALL_PAGE_KEYS = PAGE_GROUPS.flatMap(g => g.pages.map(p => p.key));

    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select('id, name, slug, email, subscription_plan, subscription_expires_at, created_at, parent_id, is_marketing_account')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClients((data as Client[]) || []);
        } catch (err: unknown) {
            console.error("Fetch clients error:", err);
            const message = err instanceof Error ? err.message : 'Failed to load clients';
            toast.error(language === "ar" ? `خطأ: ${message}` : `Error: ${message}`);
        } finally {
            setLoading(false);
        }
    }, [language]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleImpersonate = async (tenantId: string) => {
        sessionStorage.setItem('impersonating_tenant', tenantId);
        toast.success("Impersonation started");
        router.push('/dashboard');
    };

    const handleOpenAccess = async (client: Client) => {
        setSelectedClient(client);
        setClientPermissions({});
        setIsAccessModalOpen(true);
        
        try {
            const { data, error } = await supabase
                .from('client_page_access')
                .select('page_key, enabled')
                .eq('tenant_id', client.id);
                
            if (error) throw error;
            
            const perms: Record<string, boolean> = {};
            if (data && data.length > 0) {
                (data as PageAccess[]).forEach(p => { perms[p.page_key] = p.enabled });
            } else {
                ALL_PAGE_KEYS.forEach(k => { perms[k] = true });
            }
            setClientPermissions(perms);

            // Also fetch ASN branding flag
            const { data: restData } = await supabase
                .from('restaurants')
                .select('show_asn_branding')
                .eq('id', client.id)
                .single();
            setShowAsnBranding(restData?.show_asn_branding !== false);
        } catch (err: unknown) {
            console.error(err);
            toast.error("Failed to load permissions");
        }
    };

    const handleSaveAccess = async () => {
        if (!selectedClient) return;
        setSavingAccess(true);
        try {
            const formattedData = Object.keys(clientPermissions).map(key => ({
                tenant_id: selectedClient.id,
                page_key: key,
                enabled: clientPermissions[key]
            }));
            
            if (formattedData.length > 0) {
               const { error } = await supabase.from('client_page_access').upsert(formattedData, { onConflict: 'tenant_id, page_key' });
               if (error) throw error;
            }
            
            toast.success(language === "ar" ? "تم حفظ صلاحيات الصفحات" : "Page access updated successfully");

            // Save ASN branding flag
            const { error: brandingError } = await supabase
                .from('restaurants')
                .update({ show_asn_branding: showAsnBranding })
                .eq('id', selectedClient.id);
            if (brandingError) {
                console.error('Branding save error:', brandingError);
                toast.error('Failed to save branding setting');
            }

            setIsAccessModalOpen(false);
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Failed to save';
            toast.error(message);
        } finally {
            setSavingAccess(false);
        }
    };

    const handleOpenParentLink = (client: Client) => {
        setSelectedClient(client);
        setSelectedParentId(client.parent_id || "");
        setIsLinkModalOpen(true);
    };

    const handleSaveParentLink = async () => {
        if (!selectedClient) return;
        setSavingLink(true);
        try {
            const newParentId = selectedParentId === "" ? null : selectedParentId;
            const { error } = await supabase
                .from('restaurants')
                .update({ parent_id: newParentId })
                .eq('id', selectedClient.id);
                
            if (error) throw error;
            toast.success(language === "ar" ? "تم ربط الفرع بنجاح" : "Branch linked successfully");
            setIsLinkModalOpen(false);
            fetchClients(); // refresh list
        } catch (err: unknown) {
            console.error(err);
            toast.error(language === "ar" ? "حدث خطأ أثناء الربط" : "Failed to link branch");
        } finally {
            setSavingLink(false);
        }
    };

    const handleToggleMarketing = async (client: Client) => {
        try {
            const newValue = !client.is_marketing_account;
            const { error } = await supabase
                .from('restaurants')
                .update({ is_marketing_account: newValue })
                .eq('id', client.id);
            if (error) throw error;
            setClients(clients.map(c => c.id === client.id ? { ...c, is_marketing_account: newValue } : c));
            toast.success(newValue ? "Marketing account Enabled" : "Marketing account Disabled");
        } catch (err: unknown) {
            console.error(err);
            toast.error("Failed to toggle marketing status");
        }
    };

    const handleOpenPasswordModal = (client: Client) => {
        setSelectedClient(client);
        setNewPassword("");
        setIsPasswordModalOpen(true);
    };

    const handleUpdatePassword = async () => {
        if (!selectedClient || !selectedClient.email) {
            toast.error(language === "ar" ? "هذا العميل لا يمتلك بريد إلكتروني" : "This client has no email");
            return;
        }
        if (newPassword.length < 6) {
            toast.error(language === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
            return;
        }

        setUpdatingPassword(true);
        try {
            const res = await fetch("/api/auth/update-client-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: selectedClient.email,
                    password: newPassword
                })
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || "Failed to update password");
            }
            
            toast.success(language === "ar" ? "تم تغيير الرقم السري بنجاح" : "Password updated successfully");
            setIsPasswordModalOpen(false);
            setNewPassword("");
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Error updating password";
            toast.error(message);
        } finally {
            setUpdatingPassword(false);
        }
    };

    // Subscription Modal Handlers
    const handleOpenSubscription = (client: Client) => {
        setSelectedClient(client);
        setSubType(client.subscription_plan || "monthly");
        setIsSubModalOpen(true);
    };

    const handleSaveSubscription = async () => {
        if (!selectedClient) return;
        setSavingSub(true);
        try {
            let expiresAt: string | null = null;
            const now = new Date();

            if (subType === 'monthly') {
                const expiry = new Date(now);
                expiry.setDate(expiry.getDate() + 30);
                expiresAt = expiry.toISOString();
            } else if (subType === 'yearly') {
                const expiry = new Date(now);
                expiry.setFullYear(expiry.getFullYear() + 1);
                expiresAt = expiry.toISOString();
            } else {
                // lifetime
                expiresAt = null;
            }

            const { error } = await supabase
                .from('restaurants')
                .update({
                    subscription_plan: subType,
                    subscription_expires_at: expiresAt,
                })
                .eq('id', selectedClient.id);

            if (error) throw error;

            toast.success(language === "ar" ? "تم تحديث الاشتراك بنجاح" : "Subscription updated successfully");
            setIsSubModalOpen(false);
            fetchClients();
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Failed to update subscription';
            toast.error(message);
        } finally {
            setSavingSub(false);
        }
    };

    const getRemainingDays = (expiresAt: string | null, plan: string | null) => {
        if (plan === 'lifetime') return { days: Infinity, label: language === 'ar' ? 'مدى الحياة' : 'Lifetime' };
        if (!expiresAt) return { days: 0, label: language === 'ar' ? 'غير محدد' : 'Not set' };
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 0) return { days: 0, label: language === 'ar' ? 'منتهي' : 'Expired' };
        return { days: diff, label: language === 'ar' ? `${diff} يوم متبقي` : `${diff} days left` };
    };

    const getSubTypeLabel = (plan: string | null) => {
        if (!plan || plan === 'Free') return language === 'ar' ? 'مجاني' : 'Free';
        if (plan === 'monthly') return language === 'ar' ? 'شهري' : 'Monthly';
        if (plan === 'yearly') return language === 'ar' ? 'سنوي' : 'Yearly';
        if (plan === 'lifetime') return language === 'ar' ? 'مدى الحياة' : 'Lifetime';
        return plan;
    };

    const filtered = clients.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Clients & Tenants</h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">Manage platform accounts and businesses</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Client / Tenant Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Plan</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Joined Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading clients...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        No clients found matching &quot;{searchQuery}&quot;
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((client) => {
                                    const isExpired = client.subscription_expires_at && new Date(client.subscription_expires_at) < new Date();
                                    return (
                                        <tr key={client.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                                                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">{client.name}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono italic">{client.id.split('-')[0]}...</div>
                                                            {client.slug && (
                                                                <div className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-bold">
                                                                    @{client.slug}
                                                                </div>
                                                            )}
                                                            {client.is_marketing_account && (
                                                                <div className="text-[10px] px-1.5 py-0.5 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300 rounded font-bold uppercase flex items-center gap-1">
                                                                    <Megaphone className="w-2.5 h-2.5" /> Promo
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-zinc-300">
                                                {client.email || 'N/A'}
                                                {client.parent_id && (
                                                    <div className="mt-1 text-xs text-orange-500 font-bold">
                                                        ↳ Branch of: {clients.find(c => c.id === client.parent_id)?.name || 'Unknown'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider w-fit
                                                        ${client.subscription_plan === 'lifetime' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' :
                                                          client.subscription_plan === 'yearly' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                                                          client.subscription_plan === 'monthly' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400' :
                                                          'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}
                                                    `}>
                                                        {client.subscription_plan === 'lifetime' && <Crown className="w-3 h-3" />}
                                                        {getSubTypeLabel(client.subscription_plan)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const remaining = getRemainingDays(client.subscription_expires_at, client.subscription_plan);
                                                    if (client.subscription_plan === 'lifetime') {
                                                        return (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                                                                <Crown className="w-3 h-3" />{language === 'ar' ? 'مدى الحياة' : 'Lifetime'}
                                                            </span>
                                                        );
                                                    }
                                                    if (isExpired || remaining.days <= 0) {
                                                        return (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{language === 'ar' ? 'منتهي' : 'Expired'}
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                                                                ${remaining.days <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'}
                                                            `}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${remaining.days <= 7 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                                {remaining.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-zinc-400">
                                                {new Date(client.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenPasswordModal(client)} className="p-2 text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Change Password">
                                                        <Key className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleImpersonate(client.id)} className="p-2 text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="Login as Client">
                                                        <LogIn className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleOpenAccess(client)} className="p-2 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Manage Page Access">
                                                        <LayoutList className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleToggleMarketing(client)} className={`p-2 rounded-lg transition-colors ${client.is_marketing_account ? 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-500/10' : 'text-stone-400 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10'}`} title="Toggle Marketing Status">
                                                        <Megaphone className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleOpenSubscription(client)} className="p-2 text-stone-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors" title="Manage Subscription">
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleOpenParentLink(client)} className="p-2 text-stone-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors" title="Link as Branch">
                                                        <Building2 className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors" title="View Details">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Access Control Modal */}
            {isAccessModalOpen && selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAccessModalOpen(false)} />
                    <div className="bg-white dark:bg-[#131b26] rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-stone-800 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Page Access Control</h3>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Tenant: {selectedClient.name}</p>
                            </div>
                            <button onClick={() => setIsAccessModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-[#1a2433] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8">
                            <p className="text-sm text-slate-600 dark:text-zinc-300">Select which dashboard pages this client is permitted to access. Permission is applied to both Admin and Staff users.</p>
                            
                            {PAGE_GROUPS.map(group => (
                                <div key={group.titleEn} className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                                            {language === 'ar' ? group.titleAr : group.titleEn}
                                        </h4>
                                        <button 
                                            onClick={() => {
                                                const allEnabled = group.pages.every(p => clientPermissions[p.key]);
                                                const newPerms = {...clientPermissions};
                                                group.pages.forEach(p => newPerms[p.key] = !allEnabled);
                                                setClientPermissions(newPerms);
                                            }}
                                            className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-tight"
                                        >
                                            {group.pages.every(p => clientPermissions[p.key]) ? (language === 'ar' ? 'إلغاء الكل' : 'Disable All') : (language === 'ar' ? 'تفعيل الكل' : 'Enable All')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {group.pages.map(page => (
                                            <div key={page.key} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-[#0a0f16] group/item hover:border-blue-500/30 transition-colors">
                                                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{language === 'ar' ? page.nameAr : page.nameEn}</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={clientPermissions[page.key] ?? false}
                                                        onChange={(e) => setClientPermissions({...clientPermissions, [page.key]: e.target.checked})}
                                                    />
                                                    <div className="w-11 h-6 bg-stone-200 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                            {/* ASN Branding Section */}
                            <div className="space-y-3 border-t border-stone-200 dark:border-stone-700 pt-6">
                                <h4 className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Eye className="w-3.5 h-3.5" />
                                    {language === 'ar' ? 'إعدادات البراندينج' : 'Branding Settings'}
                                </h4>
                                <div className="flex items-center justify-between p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-[#0a0f16] hover:border-blue-500/30 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                            {language === 'ar' ? 'عرض "Powered by ASN Technology"' : 'Show "Powered by ASN Technology"'}
                                        </span>
                                        <span className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                                            {language === 'ar' ? 'التحكم في ظهور علامة ASN في المنيو الإلكتروني' : 'Control ASN branding visibility on the electronic menu'}
                                        </span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={showAsnBranding}
                                            onChange={(e) => setShowAsnBranding(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-stone-200 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>
                            </div>

                        <div className="p-6 border-t border-stone-100 dark:border-stone-800 shrink-0 bg-stone-50 dark:bg-black/20 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsAccessModalOpen(false)}
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveAccess}
                                disabled={savingAccess}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                            >
                                {savingAccess ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> : null}
                                Save Permissions
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Parent Branch Link Modal */}
            {isLinkModalOpen && selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLinkModalOpen(false)} />
                    <div className="bg-white dark:bg-[#131b26] rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-stone-800 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-orange-500" />
                                    Link as Branch
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Tenant: {selectedClient.name}</p>
                            </div>
                            <button onClick={() => setIsLinkModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-[#1a2433] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Parent Restaurant</label>
                            <select 
                                value={selectedParentId} 
                                onChange={(e) => setSelectedParentId(e.target.value)}
                                className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                            >
                                <option value="">-- None (Standalone Restaurant) --</option>
                                {clients.filter(c => c.id !== selectedClient.id && !c.parent_id).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-3 font-bold">
                                By linking this restaurant to a parent, the parent owner will be able to switch into this account easily.
                            </p>
                        </div>
                        <div className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-black/20 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsLinkModalOpen(false)}
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveParentLink}
                                disabled={savingLink}
                                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                            >
                                {savingLink ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> : null}
                                Save Link
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Subscription Modal */}
            {isSubModalOpen && selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSubModalOpen(false)} />
                    <div className="bg-white dark:bg-[#131b26] rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-stone-800 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Crown className="w-5 h-5 text-purple-500" />
                                    {language === 'ar' ? 'إدارة الاشتراك' : 'Manage Subscription'}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{selectedClient.name}</p>
                            </div>
                            <button onClick={() => setIsSubModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-[#1a2433] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Current Status */}
                            {selectedClient.subscription_plan && (
                                <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#0a0f16] border border-stone-100 dark:border-stone-800">
                                    <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                                        {language === 'ar' ? 'الحالة الحالية' : 'Current Status'}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                            {getSubTypeLabel(selectedClient.subscription_plan)}
                                        </span>
                                        <span className="text-sm text-slate-500 dark:text-zinc-400">
                                            {selectedClient.subscription_plan === 'lifetime'
                                                ? (language === 'ar' ? '∞ مدى الحياة' : '∞ Lifetime')
                                                : selectedClient.subscription_expires_at
                                                    ? getRemainingDays(selectedClient.subscription_expires_at, selectedClient.subscription_plan).label
                                                    : (language === 'ar' ? 'غير محدد' : 'Not set')
                                            }
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Subscription Type Selection */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                    {language === 'ar' ? 'نوع الاشتراك' : 'Subscription Type'}
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'monthly', labelAr: 'شهري', labelEn: 'Monthly', icon: '📅', duration: language === 'ar' ? '30 يوم' : '30 days', color: 'cyan' },
                                        { value: 'yearly', labelAr: 'سنوي', labelEn: 'Yearly', icon: '📆', duration: language === 'ar' ? '365 يوم' : '365 days', color: 'blue' },
                                        { value: 'lifetime', labelAr: 'مدى الحياة', labelEn: 'Lifetime', icon: '👑', duration: language === 'ar' ? '∞ غير محدود' : '∞ Unlimited', color: 'purple' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSubType(opt.value)}
                                            className={`p-4 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-2 hover:scale-[1.02] active:scale-95
                                                ${subType === opt.value
                                                    ? opt.color === 'cyan'
                                                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 shadow-md shadow-cyan-500/10'
                                                        : opt.color === 'blue'
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-md shadow-blue-500/10'
                                                        : 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 shadow-md shadow-purple-500/10'
                                                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                                                }
                                            `}
                                        >
                                            <span className="text-2xl">{opt.icon}</span>
                                            <span className="font-bold text-sm text-slate-800 dark:text-white">
                                                {language === 'ar' ? opt.labelAr : opt.labelEn}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                                                {opt.duration}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
                                <CalendarDays className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-700 dark:text-blue-400 font-bold leading-relaxed">
                                    {subType === 'monthly'
                                        ? (language === 'ar' ? 'سيتم تفعيل الاشتراك لمدة 30 يوم بدءاً من الآن' : 'Subscription will be activated for 30 days starting now')
                                        : subType === 'yearly'
                                        ? (language === 'ar' ? 'سيتم تفعيل الاشتراك لمدة سنة كاملة بدءاً من الآن' : 'Subscription will be activated for 1 full year starting now')
                                        : (language === 'ar' ? 'سيتم تفعيل الاشتراك بشكل دائم بدون تاريخ انتهاء' : 'Subscription will be activated permanently with no expiry date')
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-black/20 flex justify-end gap-3">
                            <button
                                onClick={() => setIsSubModalOpen(false)}
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors"
                            >
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleSaveSubscription}
                                disabled={savingSub}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                            >
                                {savingSub ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> : <Crown className="w-4 h-4" />}
                                {language === 'ar' ? 'تفعيل الاشتراك' : 'Activate Subscription'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Update Modal */}
            {isPasswordModalOpen && selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)} />
                    <div className="bg-white dark:bg-[#131b26] rounded-2xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-stone-800 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Key className="w-5 h-5 text-red-500" />
                                    {language === 'ar' ? "تغيير كلمة المرور" : "Change Password"}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{selectedClient.email}</p>
                            </div>
                            <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-[#1a2433] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                {language === 'ar' ? "كلمة المرور الجديدة" : "New Password"}
                            </label>
                            <input 
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="off"
                                className="w-full pl-4 pr-4 py-3 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all dark:text-white font-mono tracking-widest"
                            />
                            <p className="text-xs text-slate-500 mt-3">
                                {language === 'ar' 
                                  ? "هذا الإجراء سيقوم بتغيير الرقم السري لحساب العميل فوراً ولن يحتاج إلى تأكيد عبر الإيميل." 
                                  : "This will instantly change the client's password without needing email confirmation."}
                            </p>
                        </div>
                        <div className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-black/20 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors"
                            >
                                {language === 'ar' ? "إلغاء" : "Cancel"}
                            </button>
                            <button 
                                onClick={handleUpdatePassword}
                                disabled={updatingPassword || !newPassword || newPassword.length < 6}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                            >
                                {updatingPassword ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> : null}
                                {language === 'ar' ? "حفظ وتغيير" : "Update Password"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
