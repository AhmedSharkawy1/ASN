import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { db, seedIfEmpty } from './lib/db';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import OrdersPage from './pages/OrdersPage';
import ReportsPage from './pages/ReportsPage';
import CustomersPage from './pages/CustomersPage';
import MenuPage from './pages/MenuPage';
import StaffPage from './pages/StaffPage';
import DeliveryPage from './pages/DeliveryPage';
import SettingsPage from './pages/SettingsPage';
import { Monitor, KeyRound } from 'lucide-react';

export type UserRole = 'admin' | 'staff' | 'delivery';
export type AppUser = { id: number; name: string; role: UserRole };

function ActivationPage({ onActivate }: { onActivate: () => void }) {
    const [key, setKey] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim() === 'ASN380') {
            localStorage.setItem('pos_activated', 'true');
            onActivate();
        } else {
            setError('مفتاح التفعيل غير صحيح');
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-dark-900 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px]" />
            <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-sm animate-fade-in">
                <div className="bg-dark-700 border border-white/[0.06] rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-4 animate-pulse-brand">
                            <Monitor className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-white">ASN POS</h1>
                        <p className="text-xs text-zinc-500 mt-1">تفعيل البرنامج</p>
                    </div>
                    <div>
                        <label className="text-[11px] text-zinc-500 font-bold mb-1.5 block flex items-center gap-1"><KeyRound className="w-3 h-3" /> مفتاح التفعيل</label>
                        <input value={key} onChange={e => { setKey(e.target.value); setError(''); }}
                            className="w-full px-4 py-3 bg-dark-900 border border-white/[0.06] rounded-xl text-sm text-white text-center tracking-widest font-bold placeholder:text-zinc-600 focus:border-emerald-500/40 transition"
                            placeholder="ادخل مفتاح التفعيل" autoFocus dir="ltr" />
                    </div>
                    {error && <p className="text-red-400 text-xs font-bold mt-3 text-center">{error}</p>}
                    <button type="submit"
                        className="w-full mt-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                        <KeyRound className="w-4 h-4" /> تفعيل
                    </button>
                </div>
                <p className="text-center text-[10px] text-zinc-700 mt-6">ASN Technology © 2026</p>
            </form>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState<AppUser | null>(null);
    const [restaurantName, setRestaurantName] = useState('');
    const [restaurantPhone, setRestaurantPhone] = useState('');
    const [ready, setReady] = useState(false);
    const [activated, setActivated] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const init = async () => {
            const isActivated = localStorage.getItem('pos_activated') === 'true';
            setActivated(isActivated);
            await seedIfEmpty();
            const settings = await db.settings.toCollection().first();
            if (settings) {
                setRestaurantName(settings.restaurant_name);
                setRestaurantPhone(settings.restaurant_phone || '');
                if (settings.theme) setTheme(settings.theme);
            }
            const stored = localStorage.getItem('pos_user');
            if (stored) { try { setUser(JSON.parse(stored)); } catch { /* ignore */ } }
            setReady(true);
        };
        init();
    }, []);

    // Apply theme to html element
    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
    }, [theme]);

    const handleThemeChange = async (newTheme: 'dark' | 'light') => {
        setTheme(newTheme);
        const settings = await db.settings.toCollection().first();
        if (settings?.id) await db.settings.update(settings.id, { theme: newTheme });
    };

    const handleLogin = async (u: AppUser) => {
        setUser(u);
        localStorage.setItem('pos_user', JSON.stringify(u));
        const settings = await db.settings.toCollection().first();
        if (settings) {
            setRestaurantName(settings.restaurant_name);
            setRestaurantPhone(settings.restaurant_phone || '');
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('pos_user');
    };

    const handleSettingsChange = (name: string, phone: string) => {
        setRestaurantName(name);
        setRestaurantPhone(phone);
    };

    if (!ready) return <div className="h-screen flex items-center justify-center bg-dark-900 text-zinc-600 animate-pulse text-sm font-bold">جاري التحميل...</div>;
    if (!activated) return <ActivationPage onActivate={() => setActivated(true)} />;
    if (!user) return <LoginPage onLogin={handleLogin} />;

    return (
        <HashRouter>
            <div className={`flex h-screen overflow-hidden ${theme === 'light' ? 'bg-zinc-100 text-zinc-900' : 'bg-dark-900 text-white'}`}>
                <Sidebar user={user} restaurantName={restaurantName} onLogout={handleLogout} theme={theme} />
                <main className="flex-1 overflow-hidden flex flex-col">
                    <div className="drag-region h-9 shrink-0" />
                    <div className="flex-1 overflow-auto p-4">
                        <Routes>
                            <Route path="/" element={<Navigate to="/pos" />} />
                            <Route path="/pos" element={<POSPage user={user} restaurantName={restaurantName} restaurantPhone={restaurantPhone} />} />
                            <Route path="/orders" element={<OrdersPage />} />
                            <Route path="/reports" element={user.role === 'admin' ? <ReportsPage /> : <Navigate to="/pos" />} />
                            <Route path="/customers" element={user.role !== 'delivery' ? <CustomersPage user={user} /> : <Navigate to="/pos" />} />
                            <Route path="/menu" element={user.role === 'admin' ? <MenuPage /> : <Navigate to="/pos" />} />
                            <Route path="/delivery" element={user.role === 'admin' ? <DeliveryPage /> : <Navigate to="/pos" />} />
                            <Route path="/settings" element={user.role === 'admin' ? <SettingsPage onSettingsChange={handleSettingsChange} onThemeChange={handleThemeChange} currentTheme={theme} /> : <Navigate to="/pos" />} />
                            <Route path="/staff" element={user.role === 'admin' ? <StaffPage user={user} /> : <Navigate to="/pos" />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </HashRouter>
    );
}
