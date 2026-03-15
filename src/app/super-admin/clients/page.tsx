"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Building2, Search, ExternalLink, ShieldCheck, MoreVertical, LogIn, X, LayoutList } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/context/LanguageContext";

interface Client {
    id: string;
    name: string;
    email: string | null;
    subscription_plan: string | null;
    subscription_expires_at: string | null;
    created_at: string;
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

    const AVAILABLE_PAGES = [
        { key: 'pos', nameEn: 'POS', nameAr: 'نقطة البيع' },
        { key: 'orders', nameEn: 'Orders', nameAr: 'الطلبات' },
        { key: 'kitchen', nameEn: 'Kitchen', nameAr: 'المطبخ' },
        { key: 'products', nameEn: 'Products & Categories', nameAr: 'المنتجات والأقسام' },
        { key: 'materials', nameEn: 'Materials & Recipes', nameAr: 'المواد والوصفات' },
        { key: 'factory', nameEn: 'Factory & Production', nameAr: 'المصنع والإنتاج' },
        { key: 'expenses', nameEn: 'Expenses', nameAr: 'المصروفات' },
        { key: 'reports', nameEn: 'Reports & Accounts', nameAr: 'التقارير والحسابات' },
        { key: 'customers', nameEn: 'Customers', nameAr: 'العملاء' },
        { key: 'team', nameEn: 'Team & Staff', nameAr: 'الفريق والموظفين' },
        { key: 'settings', nameEn: 'Settings & Printers', nameAr: 'الإعدادات والطابعات' },
    ];

    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select('id, name, email, subscription_plan, subscription_expires_at, created_at')
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
                AVAILABLE_PAGES.forEach(pg => { perms[pg.key] = true });
            }
            setClientPermissions(perms);
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
            setIsAccessModalOpen(false);
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Failed to save';
            toast.error(message);
        } finally {
            setSavingAccess(false);
        }
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
                                                        <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">{client.id.split('-')[0]}...</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-zinc-300">
                                                {client.email || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 uppercase tracking-wider">
                                                    {client.subscription_plan || 'Free'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isExpired ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>Expired
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-zinc-400">
                                                {new Date(client.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleImpersonate(client.id)} className="p-2 text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="Login as Client">
                                                        <LogIn className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleOpenAccess(client)} className="p-2 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Manage Page Access">
                                                        <LayoutList className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 text-stone-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors" title="Manage Subscription">
                                                        <ShieldCheck className="w-4 h-4" />
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

                        <div className="p-6 overflow-y-auto space-y-4">
                            <p className="text-sm text-slate-600 dark:text-zinc-300 mb-2">Select which dashboard pages this client is permitted to access.</p>
                            {AVAILABLE_PAGES.map(page => (
                                <div key={page.key} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-[#0a0f16]">
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
        </div>
    );
}
