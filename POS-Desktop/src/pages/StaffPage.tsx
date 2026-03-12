import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import type { PosUser, Order } from '../lib/db';
import { AppUser, UserRole } from '../App';
import { formatCurrency } from '../lib/helpers';

type Props = { user: AppUser };

export default function StaffPage({ user }: Props) {
    const [staff, setStaff] = useState<PosUser[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', username: '', password: '', role: 'staff' as UserRole });
    const [reportRange, setReportRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [u, o] = await Promise.all([db.pos_users.toArray(), db.orders.where('status').equals('completed').toArray()]);
        setStaff(u); setOrders(o); setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const resetForm = () => { setForm({ name: '', username: '', password: '', role: 'staff' }); setShowForm(false); setEditingId(null); };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.username.trim() || (!editingId && !form.password.trim())) return;
        if (editingId) { const up: Partial<PosUser> = { name: form.name, username: form.username, role: form.role }; if (form.password) up.password = form.password; await db.pos_users.update(editingId, up); }
        else { await db.pos_users.add({ name: form.name, username: form.username, password: form.password, role: form.role, is_active: true }); }
        resetForm(); fetchData();
    };

    const startEdit = (s: PosUser) => { setEditingId(s.id!); setForm({ name: s.name, username: s.username, password: '', role: s.role }); setShowForm(true); };
    const toggleActive = async (s: PosUser) => { await db.pos_users.update(s.id!, { is_active: !s.is_active }); setStaff(prev => prev.map(p => p.id === s.id ? { ...p, is_active: !p.is_active } : p)); };
    const deleteUser = async (id: number) => { await db.pos_users.delete(id); setStaff(prev => prev.filter(p => p.id !== id)); };

    const roleLabel = (r: string) => ({ admin: 'مدير', staff: 'موظف', delivery: 'دليفري' }[r] || r);

    const getCashierStats = (cashierId: number) => {
        let fo = orders.filter(o => o.cashier_id === cashierId);
        const now = new Date();
        if (reportRange === 'today') { const ts = now.toISOString().split('T')[0]; fo = fo.filter(o => o.created_at.startsWith(ts)); }
        else if (reportRange === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); fo = fo.filter(o => new Date(o.created_at) >= w); }
        else if (reportRange === 'month') { const m = new Date(now); m.setMonth(m.getMonth() - 1); fo = fo.filter(o => new Date(o.created_at) >= m); }
        else if (reportRange === 'custom' && customStart && customEnd) { const s = new Date(customStart); s.setHours(0, 0, 0, 0); const e = new Date(customEnd); e.setHours(23, 59, 59, 999); fo = fo.filter(o => { const d = new Date(o.created_at); return d >= s && d <= e; }); }
        return { orders: fo.sort((a, b) => b.created_at.localeCompare(a.created_at)), totalRevenue: fo.reduce((s, o) => s + o.total, 0) };
    };

    const getDriverName = (id?: number) => !id ? '-' : (staff.find(s => s.id === id)?.name || '-');
    const rangeLabels: Record<string, string> = { today: 'اليوم', week: 'الأسبوع', month: 'الشهر', all: 'الكل', custom: 'مخصص' };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }} dir="rtl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h1 style={{ fontSize: 18, fontWeight: 'bold' }}>👤 إدارة الموظفين</h1>
                <button onClick={() => { resetForm(); setShowForm(true); }} className="classic-btn-green" style={{ fontSize: 12, padding: '4px 16px' }}>➕ إضافة موظف</button>
            </div>

            {showForm && (
                <div style={{ background: '#f0ece0', border: '2px solid #4080c0', padding: 16, marginBottom: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 10 }}>{editingId ? 'تعديل موظف' : 'إضافة موظف جديد'}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                        <div><label style={{ fontSize: 11, fontWeight: 'bold', display: 'block', marginBottom: 2 }}>الاسم</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', padding: '5px 8px', border: '1px solid #999', fontSize: 13 }} /></div>
                        <div><label style={{ fontSize: 11, fontWeight: 'bold', display: 'block', marginBottom: 2 }}>اسم المستخدم</label><input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} dir="ltr" style={{ width: '100%', padding: '5px 8px', border: '1px solid #999', fontSize: 13 }} /></div>
                        <div><label style={{ fontSize: 11, fontWeight: 'bold', display: 'block', marginBottom: 2 }}>{editingId ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ width: '100%', padding: '5px 8px', border: '1px solid #999', fontSize: 13 }} /></div>
                        <div><label style={{ fontSize: 11, fontWeight: 'bold', display: 'block', marginBottom: 2 }}>الدور</label><select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} style={{ width: '100%', padding: '5px 8px', border: '1px solid #999', fontSize: 13 }}><option value="admin">مدير</option><option value="staff">موظف (كاشير)</option><option value="delivery">دليفري</option></select></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={resetForm} className="classic-btn" style={{ fontSize: 12 }}>إلغاء</button>
                        <button onClick={handleSubmit} className="classic-btn-green" style={{ fontSize: 12, padding: '4px 16px' }}>✓ {editingId ? 'حفظ' : 'إضافة'}</button>
                    </div>
                </div>
            )}

            {loading ? <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>جاري التحميل...</p> : staff.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#999' }}><p style={{ fontWeight: 'bold' }}>لا يوجد موظفين</p></div>
            ) : (
                <div style={{ background: '#f0ece0', border: '2px solid #999' }}>
                    <table className="classic-table">
                        <thead><tr><th>الاسم</th><th>المستخدم</th><th style={{ textAlign: 'center' }}>الدور</th><th style={{ textAlign: 'center' }}>الحالة</th><th style={{ width: 120 }}></th></tr></thead>
                        <tbody>
                            {staff.map(s => (<>
                                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === s.id! ? null : s.id!)}>
                                    <td style={{ fontWeight: 'bold' }}>{s.name}</td>
                                    <td dir="ltr" style={{ color: '#666' }}>@{s.username}</td>
                                    <td style={{ textAlign: 'center' }}><span style={{ fontSize: 10, fontWeight: 'bold', padding: '1px 6px', border: '1px solid', background: s.role === 'admin' ? '#e8daef' : s.role === 'delivery' ? '#d1ecf1' : '#cce5ff', color: s.role === 'admin' ? '#6c3483' : s.role === 'delivery' ? '#0c5460' : '#004085', borderColor: s.role === 'admin' ? '#d2b4de' : s.role === 'delivery' ? '#bee5eb' : '#b8daff' }}>{roleLabel(s.role)}</span></td>
                                    <td style={{ textAlign: 'center' }}><button onClick={e => { e.stopPropagation(); toggleActive(s); }} style={{ fontSize: 10, fontWeight: 'bold', padding: '1px 8px', border: '1px solid', cursor: 'pointer', background: s.is_active ? '#d4edda' : '#f8d7da', color: s.is_active ? '#155724' : '#721c24', borderColor: s.is_active ? '#c3e6cb' : '#f5c6cb' }}>{s.is_active ? 'نشط' : 'موقوف'}</button></td>
                                    <td><div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}><button onClick={e => { e.stopPropagation(); startEdit(s); }} className="classic-btn" style={{ fontSize: 10, padding: '1px 8px' }}>تعديل</button>{s.id !== user.id && <button onClick={e => { e.stopPropagation(); deleteUser(s.id!); }} className="classic-btn-red" style={{ fontSize: 10, padding: '1px 8px' }}>حذف</button>}</div></td>
                                </tr>
                                {expandedId === s.id && (() => {
                                    const st = getCashierStats(s.id!);
                                    return (
                                        <tr key={`${s.id}-exp`}><td colSpan={5} style={{ padding: 12, background: '#f8f4e8' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <span style={{ fontWeight: 'bold', fontSize: 13 }}>📊 تقرير أعمال الموظف</span>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {reportRange === 'custom' && <><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ border: '1px solid #ccc', padding: '1px 4px', fontSize: 10 }} /><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ border: '1px solid #ccc', padding: '1px 4px', fontSize: 10 }} /></>}
                                                    {(['today', 'week', 'month', 'all', 'custom'] as const).map(r => <button key={r} onClick={() => setReportRange(r)} className={reportRange === r ? 'classic-btn-green' : 'classic-btn'} style={{ fontSize: 10, padding: '1px 6px' }}>{rangeLabels[r]}</button>)}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                                                <div style={{ background: '#fff', border: '1px solid #ccc', padding: '6px 16px', textAlign: 'center' }}><p style={{ fontSize: 10, color: '#666' }}>الطلبات</p><p style={{ fontSize: 18, fontWeight: 'bold', color: '#4080c0' }}>{st.orders.length}</p></div>
                                                <div style={{ background: '#fff', border: '1px solid #ccc', padding: '6px 16px', textAlign: 'center' }}><p style={{ fontSize: 10, color: '#666' }}>الإيرادات</p><p style={{ fontSize: 18, fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(st.totalRevenue)}</p></div>
                                            </div>
                                            {st.orders.length > 0 ? <div style={{ maxHeight: 200, overflow: 'auto' }}><table className="classic-table" style={{ fontSize: 11 }}><thead><tr><th>#</th><th>العميل</th><th style={{ textAlign: 'center' }}>الأصناف</th><th>الدليفري</th><th>التاريخ</th><th style={{ textAlign: 'center' }}>الإجمالي</th></tr></thead><tbody>{st.orders.map(o => <tr key={o.id}><td>#{o.order_number}</td><td style={{ fontWeight: 'bold' }}>{o.customer_name || '-'}</td><td style={{ textAlign: 'center' }}>{o.items.reduce((s, i) => s + i.qty, 0)}</td><td>{o.delivery_driver_id ? getDriverName(o.delivery_driver_id) : 'استلام'}</td><td style={{ fontSize: 10, color: '#666' }}>{new Date(o.created_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td style={{ textAlign: 'center', fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(o.total)}</td></tr>)}</tbody></table></div> : <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>لا توجد طلبات في هذه الفترة</p>}
                                        </td></tr>
                                    );
                                })()}
                            </>))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
