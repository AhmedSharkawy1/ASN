"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { Save, Globe, Database, Mail } from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminSettingsPage() {
    const { language } = useLanguage();

    const handleSave = () => {
        toast.success(language === "ar" ? "تم حفظ الإعدادات" : "Platform settings updated successfully");
    }

    return (
        <div className="space-y-6 lg:space-y-8 max-w-4xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Platform Settings</h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">Core system configurations and environments</p>
                </div>
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                >
                    <Save className="w-4 h-4" />
                    Save Changes
                </button>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center gap-3">
                    <Globe className="w-5 h-5 text-slate-400" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">General Information</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Platform Name</label>
                            <input type="text" defaultValue="Engine Architecture" className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#0a0f16] focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Support Email</label>
                            <input type="email" defaultValue="support@engine.local" className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#0a0f16] focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-inner" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Default Currency</label>
                        <select className="w-full md:w-1/2 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#0a0f16] focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-inner">
                            <option value="EGP">EGP - Egyptian Pound</option>
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="SAR">SAR - Saudi Riyal</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center gap-3">
                    <Database className="w-5 h-5 text-slate-400" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Database & Limits</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-800">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">Automatic Nightly Backups</h4>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Run full Postgres dump at 03:00 AM UTC</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-stone-200 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-800">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">Hard Data Retention Limit</h4>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Retain activity logs for maximum (days)</p>
                        </div>
                        <input type="number" defaultValue="90" className="w-24 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#0a0f16] focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-inner text-center font-bold" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">SMTP Configuration</h2>
                </div>
                <div className="p-6">
                    <p className="text-slate-500 dark:text-zinc-400 text-sm mb-4">SMTP credentials are currently managed securely via Supabase Auth settings. To change your mail provider, please refer to the Supabase dashboard directly to prevent credential leaks in the UI.</p>
                    <button className="px-4 py-2 border gap-2 border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors text-sm">
                        Refresh Connectors Status
                    </button>
                </div>
            </div>
        </div>
    );
}
