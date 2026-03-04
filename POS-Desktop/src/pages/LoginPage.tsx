import { useState } from 'react';
import { db } from '../lib/db';
import { AppUser } from '../App';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logoUrl from '../../logo.png';

type Props = { onLogin: (u: AppUser) => void };

export default function LoginPage({ onLogin }: Props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) { setError('ادخل اسم المستخدم وكلمة المرور'); return; }
        setLoading(true); setError('');
        try {
            const user = await db.pos_users
                .where('username').equals(username.trim())
                .first();
            if (!user || user.password !== password.trim() || !user.is_active) {
                setError('بيانات الدخول غلط أو الحساب موقوف');
                setLoading(false);
                return;
            }
            onLogin({ id: user.id!, name: user.name, role: user.role });
        } catch {
            setError('حدث خطأ');
        }
        setLoading(false);
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-dark-900 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]" />
            <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-sm animate-fade-in">
                <div className="bg-dark-700 border border-white/[0.06] rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-4 animate-pulse-brand overflow-hidden">
                            <img src={logoUrl} alt="ASN Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-white">ASN POS</h1>
                        <p className="text-xs text-zinc-500 mt-1">نظام نقاط البيع — يعمل بدون إنترنت</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[11px] text-zinc-500 font-bold mb-1.5 block">اسم المستخدم</label>
                            <input value={username} onChange={e => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-900 border border-white/[0.06] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/40 transition"
                                placeholder="admin" autoFocus />
                        </div>
                        <div>
                            <label className="text-[11px] text-zinc-500 font-bold mb-1.5 block">كلمة المرور</label>
                            <div className="relative">
                                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-dark-900 border border-white/[0.06] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/40 transition"
                                    placeholder="••••••" />
                                <button type="button" onClick={() => setShowPwd(!showPwd)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-xs font-bold mt-3 text-center">{error}</p>}
                    <button type="submit" disabled={loading}
                        className="w-full mt-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                    </button>


                </div>
                <p className="text-center text-[10px] text-zinc-700 mt-6">ASN Technology © 2026 — Offline Mode</p>
            </form>
        </div>
    );
}
