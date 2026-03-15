"use client";

import { useState } from "react";
import { Shield, Sparkles, MessageSquare, ShoppingBag, Globe } from "lucide-react";

export default function SuperAdminFeaturesPage() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [features, setFeatures] = useState([
        { id: 1, name: "AI Recommendations", description: "Enable smart product suggestions for end customers", icon: Sparkles, enabled: true },
        { id: 2, name: "WhatsApp Integration", description: "Allow clients to connect their WhatsApp Business API", icon: MessageSquare, enabled: false },
        { id: 3, name: "Advanced Inventory", description: "Multi-warehouse and supply chain tracking", icon: ShoppingBag, enabled: true },
        { id: 4, name: "Multi-Language", description: "Allow clients to translate their menus dynamically", icon: Globe, enabled: true },
    ]);

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Feature Controls</h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">Global feature flags and early access rollouts</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {features.map(f => (
                    <div key={f.id} className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-start gap-4 hover:shadow-md transition-all">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${f.enabled ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-stone-100 dark:bg-stone-800'}`}>
                            <f.icon className={`w-6 h-6 ${f.enabled ? 'text-blue-600 dark:text-blue-400' : 'text-stone-400 dark:text-stone-500'}`} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{f.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">{f.description}</p>
                            
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked={f.enabled} />
                                <div className="w-11 h-6 bg-stone-200 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                <span className="ml-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {f.enabled ? 'Active Globally' : 'Disabled'}
                                </span>
                            </label>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-6 flex items-start gap-4">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1">About Feature Flags</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">These settings override individual client configurations. Disabling a feature here immediately removes the functionality from all tenants across the platform regardless of their active subscription plan.</p>
                </div>
            </div>
        </div>
    );
}
