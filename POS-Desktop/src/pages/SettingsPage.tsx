import { useState, useEffect } from 'react';
import { db } from '../lib/db';
import type { AppSettings } from '../lib/db';
import { Settings, Save, CheckCircle2, Store, Phone, Download, Upload } from 'lucide-react';

type Props = { onSettingsChange: (name: string, phone: string) => void; onThemeChange: (theme: 'dark' | 'light') => void; currentTheme: 'dark' | 'light' };

export default function SettingsPage({ onSettingsChange, onThemeChange, currentTheme }: Props) {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [currency, setCurrency] = useState('ج.م');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const s = await db.settings.toCollection().first();
            if (s) { setSettings(s); setName(s.restaurant_name); setPhone(s.restaurant_phone || ''); setCurrency(s.currency); }
        };
        load();
    }, []);

    const handleSave = async () => {
        if (!settings?.id) return;
        await db.settings.update(settings.id, { restaurant_name: name.trim(), restaurant_phone: phone.trim() || undefined, currency, theme: currentTheme });
        onSettingsChange(name.trim(), phone.trim());
        setSaved(true); setTimeout(() => setSaved(false), 2000);
    };

    const handleExportBackup = async () => {
        try {
            const data = {
                settings: await db.settings.toArray(),
                categories: await db.categories.toArray(),
                menu_items: await db.menu_items.toArray(),
                orders: await db.orders.toArray(),
                customers: await db.customers.toArray(),
                pos_users: await db.pos_users.toArray(),
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ASN_POS_Backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('حدث خطأ أثناء النسخ الاحتياطي');
        }
    };

    const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);

                // Clear old data
                await db.settings.clear();
                await db.categories.clear();
                await db.menu_items.clear();
                await db.orders.clear();
                await db.customers.clear();
                await db.pos_users.clear();

                // Restore
                if (data.settings?.length) await db.settings.bulkAdd(data.settings);
                if (data.categories?.length) await db.categories.bulkAdd(data.categories);
                if (data.menu_items?.length) await db.menu_items.bulkAdd(data.menu_items);
                if (data.orders?.length) await db.orders.bulkAdd(data.orders);
                if (data.customers?.length) await db.customers.bulkAdd(data.customers);
                if (data.pos_users?.length) await db.pos_users.bulkAdd(data.pos_users);

                alert('تم استعادة البيانات بنجاح! سيتم إعادة تحميل البرنامج.');
                window.location.reload();
            } catch (err) {
                alert('ملف غير صالح أو حدث خطأ أثناء الاستعادة');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-3"><Settings className="w-7 h-7 text-emerald-500" /> إعدادات المطعم</h1>

            <div className="bg-white dark:bg-dark-700 border border-zinc-200 dark:border-white/[0.04] rounded-2xl p-6 space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> اسم المطعم</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-emerald-500 transition" />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> رقم المطعم</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" placeholder="01001234567"
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-emerald-500 transition" />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500">العملة</label>
                    <input value={currency} onChange={e => setCurrency(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-emerald-500 transition" />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500">المظهر</label>
                    <div className="flex gap-3">
                        <button onClick={() => onThemeChange('dark')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition border ${currentTheme === 'dark' ? 'bg-zinc-900 text-white border-emerald-500' : 'bg-zinc-100 dark:bg-dark-600 text-zinc-500 border-zinc-200 dark:border-white/[0.06] hover:border-zinc-400'}`}>🌙 داكن</button>
                        <button onClick={() => onThemeChange('light')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition border ${currentTheme === 'light' ? 'bg-white text-zinc-900 border-emerald-500 shadow-md' : 'bg-zinc-100 dark:bg-dark-600 text-zinc-500 border-zinc-200 dark:border-white/[0.06] hover:border-zinc-400'}`}>☀️ فاتح</button>
                    </div>
                </div>

                <button onClick={handleSave}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition active:scale-95">
                    {saved ? <><CheckCircle2 className="w-4 h-4" /> تم الحفظ!</> : <><Save className="w-4 h-4" /> حفظ الإعدادات</>}
                </button>
            </div>

            {/* Backup & Restore */}
            <div className="bg-white dark:bg-dark-700 border border-zinc-200 dark:border-white/[0.04] rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">النسخ الاحتياطي والاستعادة</h2>
                <div className="flex gap-4">
                    <button onClick={handleExportBackup} className="flex-1 px-4 py-3 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 rounded-xl font-bold flex items-center justify-center gap-2 transition">
                        <Download className="w-5 h-5" /> أخذ نسخة احتياطية
                    </button>

                    <label className="flex-1 px-4 py-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer">
                        <Upload className="w-5 h-5" /> استعادة بيانات
                        <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                    </label>
                </div>
                <p className="text-xs text-zinc-500 mt-2">ملاحظة: استعادة البيانات ستقوم بمسح البيانات الحالية واستبدالها بالملف المرفوع.</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">💡 اسم المطعم ورقم الهاتف سيظهران في الفاتورة المطبوعة</p>
            </div>
        </div>
    );
}
