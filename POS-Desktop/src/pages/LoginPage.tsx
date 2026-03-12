import { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { AppUser } from '../App';
import type { PosUser } from '../lib/db';

type Props = { onLogin: (u: AppUser) => void };

export default function LoginPage({ onLogin }: Props) {
    const [users, setUsers] = useState<PosUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadUsers = async () => {
            const allUsers = await db.pos_users.filter(u => !!u.is_active).toArray();
            setUsers(allUsers);
        };
        loadUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) { setError('اختر اسم المستخدم'); return; }
        setLoading(true); setError('');
        try {
            const user = await db.pos_users.get(selectedUserId);
            if (!user || user.password !== password.trim() || !user.is_active) {
                setError('كلمة المرور غلط أو الحساب موقوف');
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
        <div style={{
            height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #c06080 0%, #d070a0 25%, #a08060 50%, #806090 75%, #c06080 100%)',
            backgroundSize: '400% 400%',
        }}>
            <form onSubmit={handleSubmit} style={{
                width: 420, background: '#f0ece0', border: '2px solid #888',
                boxShadow: '4px 4px 16px rgba(0,0,0,0.4)',
            }} dir="rtl">
                {/* Title bar */}
                <div style={{
                    background: 'linear-gradient(90deg, #405880 0%, #506890 100%)',
                    padding: '6px 12px', color: '#fff', fontSize: 13, fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <span>شاشة الدخول</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                        <span style={{ width: 16, height: 14, background: '#c0c0c0', border: '1px solid #999', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer', color: '#333' }}>−</span>
                        <span style={{ width: 16, height: 14, background: '#c0c0c0', border: '1px solid #999', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer', color: '#333' }}>□</span>
                        <span style={{ width: 16, height: 14, background: '#c05050', border: '1px solid #a03030', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer', color: '#fff' }}>×</span>
                    </div>
                </div>

                <div style={{ padding: 32 }}>
                    {/* Header */}
                    <div style={{
                        textAlign: 'center', marginBottom: 28, padding: '12px 20px',
                        border: '2px solid #999', background: '#f8f4e8',
                    }}>
                        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#405880', fontFamily: "'Cairo', sans-serif" }}>
                            شاشة دخول النظام
                        </h1>
                    </div>

                    {/* Username dropdown */}
                    <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label style={{ fontSize: 16, fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap', minWidth: 120 }}>
                            اسم المستخدم
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <span style={{ fontSize: 14, color: '#333', fontWeight: 'bold' }}>اختر</span>
                            <select
                                value={selectedUserId}
                                onChange={e => { setSelectedUserId(e.target.value ? Number(e.target.value) : ''); setError(''); }}
                                style={{
                                    flex: 1, padding: '6px 8px', border: '1px solid #999',
                                    fontSize: 14, background: '#fff', cursor: 'pointer',
                                }}
                            >
                                <option value="">▼</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label style={{ fontSize: 16, fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap', minWidth: 120 }}>
                            كلمة السر
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            style={{
                                flex: 1, padding: '6px 8px', border: '1px solid #999',
                                fontSize: 14, background: '#fff',
                            }}
                        />
                    </div>

                    {error && <p style={{ color: '#dc3545', fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>{error}</p>}

                    {/* Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '10px 40px', fontSize: 16, fontWeight: 'bold',
                                background: '#f0ece0', border: '2px solid #4080c0',
                                color: '#333', cursor: 'pointer', minWidth: 120,
                            }}
                        >
                            {loading ? 'جاري...' : 'موافق'}
                        </button>
                        <button
                            type="button"
                            onClick={() => window.close()}
                            style={{
                                padding: '10px 40px', fontSize: 16, fontWeight: 'bold',
                                background: '#e0dcd0', border: '2px solid #80b0d0',
                                color: '#333', cursor: 'pointer', minWidth: 120,
                            }}
                        >
                            خروج
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
