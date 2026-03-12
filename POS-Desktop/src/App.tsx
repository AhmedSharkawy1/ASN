import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { db, seedIfEmpty } from './lib/db';
import TopBar from './components/TopBar';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import OrdersPage from './pages/OrdersPage';
import ReportsPage from './pages/ReportsPage';
import CustomersPage from './pages/CustomersPage';
import MenuPage from './pages/MenuPage';
import StaffPage from './pages/StaffPage';
import DeliveryPage from './pages/DeliveryPage';
import SettingsPage from './pages/SettingsPage';
import { KeyRound } from 'lucide-react';

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
        <div style={{
            height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #708090 0%, #506070 50%, #405060 100%)',
        }}>
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 380 }}>
                <div style={{
                    background: '#f0ece0', border: '2px solid #999', padding: 32,
                    boxShadow: '4px 4px 12px rgba(0,0,0,0.3)',
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <div style={{
                            width: 48, height: 48, margin: '0 auto 12px', background: '#28a745',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1e7e34',
                        }}>
                            <KeyRound style={{ width: 24, height: 24, color: '#fff' }} />
                        </div>
                        <h1 style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>ASN POS</h1>
                        <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>تفعيل البرنامج</p>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 'bold', color: '#555', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                            <KeyRound style={{ width: 12, height: 12 }} /> مفتاح التفعيل
                        </label>
                        <input value={key} onChange={e => { setKey(e.target.value); setError(''); }}
                            style={{
                                width: '100%', padding: '8px 12px', border: '1px solid #999', fontSize: 14,
                                textAlign: 'center', letterSpacing: 4, fontWeight: 'bold', background: '#fff',
                            }}
                            placeholder="ادخل مفتاح التفعيل" autoFocus dir="ltr" />
                    </div>
                    {error && <p style={{ color: '#dc3545', fontSize: 12, fontWeight: 'bold', marginTop: 8, textAlign: 'center' }}>{error}</p>}
                    <button type="submit" className="classic-btn-green"
                        style={{ width: '100%', marginTop: 16, padding: '10px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <KeyRound style={{ width: 16, height: 16 }} /> تفعيل
                    </button>
                </div>
                <p style={{ textAlign: 'center', fontSize: 10, color: '#ccc', marginTop: 16 }}>ASN Technology © 2026</p>
            </form>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState<AppUser | null>(null);
    const [restaurantName, setRestaurantName] = useState('');
    const [restaurantPhone, setRestaurantPhone] = useState('');
    const [restaurantAddress, setRestaurantAddress] = useState('');
    const [ready, setReady] = useState(false);
    const [activated, setActivated] = useState(false);

    useEffect(() => {
        const init = async () => {
            const isActivated = localStorage.getItem('pos_activated') === 'true';
            setActivated(isActivated);
            await seedIfEmpty();
            const settings = await db.settings.toCollection().first();
            if (settings) {
                setRestaurantName(settings.restaurant_name);
                setRestaurantPhone(settings.restaurant_phone || '');
                setRestaurantAddress(settings.restaurant_address || '');
            }
            const stored = localStorage.getItem('pos_user');
            if (stored) { try { setUser(JSON.parse(stored)); } catch { /* ignore */ } }
            setReady(true);
        };
        init();
    }, []);

    const handleLogin = async (u: AppUser) => {
        setUser(u);
        localStorage.setItem('pos_user', JSON.stringify(u));
        const settings = await db.settings.toCollection().first();
        if (settings) {
            setRestaurantName(settings.restaurant_name);
            setRestaurantPhone(settings.restaurant_phone || '');
            setRestaurantAddress(settings.restaurant_address || '');
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('pos_user');
    };

    const handleSettingsChange = (name: string, phone: string, address: string) => {
        setRestaurantName(name);
        setRestaurantPhone(phone);
        setRestaurantAddress(address);
    };

    if (!ready) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#b8b8a0', color: '#666', fontSize: 14, fontWeight: 'bold' }}>جاري التحميل...</div>;
    if (!activated) return <ActivationPage onActivate={() => setActivated(true)} />;
    if (!user) return <LoginPage onLogin={handleLogin} />;

    return (
        <HashRouter>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#b8b8a0' }}>
                <div className="drag-region" style={{ height: 30, flexShrink: 0 }} />
                <TopBar user={user} restaurantName={restaurantName} onLogout={handleLogout} />
                <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#c8c080' }}>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        <Routes>
                            <Route path="/" element={<Navigate to="/pos" />} />
                            <Route path="/pos" element={<POSPage user={user} restaurantName={restaurantName} restaurantPhone={restaurantPhone} restaurantAddress={restaurantAddress} />} />
                            <Route path="/orders" element={<OrdersPage />} />
                            <Route path="/reports" element={user.role === 'admin' ? <ReportsPage /> : <Navigate to="/pos" />} />
                            <Route path="/customers" element={user.role !== 'delivery' ? <CustomersPage user={user} /> : <Navigate to="/pos" />} />
                            <Route path="/menu" element={user.role === 'admin' ? <SettingsPage onSettingsChange={handleSettingsChange} /> : <Navigate to="/pos" />} />
                            <Route path="/delivery" element={user.role === 'admin' ? <DeliveryPage /> : <Navigate to="/pos" />} />
                            <Route path="/settings" element={user.role === 'admin' ? <SettingsPage onSettingsChange={handleSettingsChange} /> : <Navigate to="/pos" />} />
                            <Route path="/staff" element={user.role === 'admin' ? <StaffPage user={user} /> : <Navigate to="/pos" />} />
                        </Routes>
                    </div>
                </main>
                {/* Bottom status bar */}
                <div className="classic-statusbar no-drag" style={{ justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 11 }}>المستخدم الحالي</span>
                    <span style={{ fontWeight: 'bold', fontSize: 11 }}>{user.name}</span>
                    <span style={{ border: '1px solid #999', background: '#fff', padding: '0 8px', fontSize: 11, marginRight: 8 }}>{user.id}</span>
                </div>
            </div>
        </HashRouter>
    );
}
