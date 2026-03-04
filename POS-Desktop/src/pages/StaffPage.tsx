import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import type { PosUser, Order } from '../lib/db';
import { AppUser, UserRole } from '../App';
import { formatCurrency } from '../lib/helpers';
import { UserCog, Plus, Edit3, Trash2, Check, Shield, Truck, User, ChevronDown, ChevronUp, Calendar, Receipt, DollarSign, Wallet } from 'lucide-react';

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
        const [usersData, ordersData] = await Promise.all([
            db.pos_users.toArray(),
            db.orders.where('status').equals('completed').toArray()
        ]);
        setStaff(usersData);
        setOrders(ordersData);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const resetForm = () => { setForm({ name: '', username: '', password: '', role: 'staff' }); setShowForm(false); setEditingId(null); };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.username.trim() || (!editingId && !form.password.trim())) return;
        if (editingId) {
            const update: Partial<PosUser> = { name: form.name, username: form.username, role: form.role };
            if (form.password) update.password = form.password;
            await db.pos_users.update(editingId, update);
        } else {
            await db.pos_users.add({ name: form.name, username: form.username, password: form.password, role: form.role, is_active: true });
        }
        resetForm();
        fetchData();
    };

    const startEdit = (s: PosUser, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(s.id!);
        setForm({ name: s.name, username: s.username, password: '', role: s.role });
        setShowForm(true);
    };

    const toggleActive = async (s: PosUser, e: React.MouseEvent) => {
        e.stopPropagation();
        await db.pos_users.update(s.id!, { is_active: !s.is_active });
        setStaff(prev => prev.map(p => p.id === s.id ? { ...p, is_active: !p.is_active } : p));
    };

    const deleteUser = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        await db.pos_users.delete(id);
        setStaff(prev => prev.filter(p => p.id !== id));
    };

    const roleIcon = (role: string) => {
        if (role === 'admin') return <Shield className="w-3.5 h-3.5" />;
        if (role === 'delivery') return <Truck className="w-3.5 h-3.5" />;
        return <User className="w-3.5 h-3.5" />;
    };
    const roleLabel = (role: string) => ({ admin: 'مدير', staff: 'موظف', delivery: 'دليفري' }[role] || role);
    const roleColor = (role: string) => ({ admin: 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30', staff: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30', delivery: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30' }[role] || '');

    const getCashierStats = (cashierId: number) => {
        let filteredOrders = orders.filter(o => o.cashier_id === cashierId);
        const now = new Date();
        if (reportRange === 'today') { const ts = now.toISOString().split('T')[0]; filteredOrders = filteredOrders.filter(o => o.created_at.startsWith(ts)); }
        else if (reportRange === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); filteredOrders = filteredOrders.filter(o => new Date(o.created_at) >= w); }
        else if (reportRange === 'month') { const m = new Date(now); m.setMonth(m.getMonth() - 1); filteredOrders = filteredOrders.filter(o => new Date(o.created_at) >= m); }
        else if (reportRange === 'custom' && customStart && customEnd) {
            const start = new Date(customStart); start.setHours(0, 0, 0, 0);
            const end = new Date(customEnd); end.setHours(23, 59, 59, 999);
            filteredOrders = filteredOrders.filter(o => { const d = new Date(o.created_at); return d >= start && d <= end; });
        }

        const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
        return { orders: filteredOrders.sort((a, b) => b.created_at.localeCompare(a.created_at)), totalRevenue };
    };

    const getDriverName = (driverId?: number) => {
        if (!driverId) return '-';
        return staff.find(s => s.id === driverId)?.name || 'سائق غير معروف';
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-3"><UserCog className="w-7 h-7 text-emerald-500" /> إدارة الموظفين</h1>
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold text-sm rounded-xl border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition">
                    <Plus className="w-4 h-4" /> إضافة موظف
                </button>
            </div>

            {showForm && (
                <div className="bg-white dark:bg-dark-700 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-5 animate-fade-in space-y-4 shadow-sm">
                    <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{editingId ? 'تعديل موظف' : 'إضافة موظف جديد'}</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] text-zinc-500 font-bold block mb-1">الاسم</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl text-sm text-zinc-900 dark:text-white" placeholder="اسم الموظف" /></div>
                        <div><label className="text-[10px] text-zinc-500 font-bold block mb-1">اسم المستخدم</label>
                            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl text-sm text-zinc-900 dark:text-white" placeholder="username" dir="ltr" /></div>
                        <div><label className="text-[10px] text-zinc-500 font-bold block mb-1">{editingId ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}</label>
                            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl text-sm text-zinc-900 dark:text-white" placeholder="••••••" /></div>
                        <div><label className="text-[10px] text-zinc-500 font-bold block mb-1">الدور</label>
                            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl text-sm text-zinc-900 dark:text-white cursor-pointer">
                                <option value="admin">مدير</option><option value="staff">موظف (كاشير)</option><option value="delivery">دليفري</option>
                            </select></div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={resetForm} className="px-4 py-2 bg-zinc-100 dark:bg-dark-600 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-200 dark:hover:text-white transition">إلغاء</button>
                        <button onClick={handleSubmit} className="px-4 py-2 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition flex items-center gap-1"><Check className="w-3 h-3" /> {editingId ? 'حفظ' : 'إضافة'}</button>
                    </div>
                </div>
            )}

            {loading ? <div className="text-center py-12 text-zinc-500 animate-pulse">جاري التحميل...</div> : staff.length === 0 ? (
                <div className="text-center py-16 text-zinc-500"><UserCog className="w-16 h-16 mx-auto mb-3 opacity-30" /><p className="font-bold">لا يوجد موظفين</p></div>
            ) : (
                <div className="space-y-3">
                    {staff.map(s => {
                        const isExpanded = expandedId === s.id;
                        const stats = isExpanded ? getCashierStats(s.id!) : null;

                        return (
                            <div key={s.id} className={`bg-white dark:bg-dark-700 border rounded-xl overflow-hidden shadow-sm transition ${s.is_active ? 'border-zinc-200 dark:border-white/[0.04]' : 'border-red-200 dark:border-red-500/20 opacity-80'}`}>
                                <div onClick={() => setExpandedId(isExpanded ? null : s.id!)} className="flex items-center gap-4 p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">{s.name.charAt(0)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-extrabold text-zinc-900 dark:text-white">{s.name}</p>
                                        <p className="text-[11px] text-zinc-500" dir="ltr">@{s.username}</p>
                                    </div>
                                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${roleColor(s.role)}`}>{roleIcon(s.role)} {roleLabel(s.role)}</span>
                                    <button onClick={(e) => toggleActive(s, e)}
                                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${s.is_active ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' : 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'}`}>
                                        {s.is_active ? 'نشط' : 'موقوف'}
                                    </button>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => startEdit(s, e)} className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition"><Edit3 className="w-4 h-4" /></button>
                                        {s.id !== user.id && <button onClick={(e) => deleteUser(s.id!, e)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>}
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                                </div>
                                {isExpanded && stats && (
                                    <div className="border-t border-zinc-200 dark:border-white/[0.04] p-5 bg-zinc-50/50 dark:bg-dark-800/50 cursor-default" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-200 flex items-center gap-2"><Receipt className="w-4 h-4 text-emerald-500" /> تقرير أعمال الموظف</h4>
                                            <div className="flex flex-wrap items-center bg-zinc-200/50 dark:bg-dark-900 p-1 rounded-lg border border-zinc-200 dark:border-white/[0.04] gap-1">
                                                {reportRange === 'custom' && (
                                                    <div className="flex gap-2 items-center px-2">
                                                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-[10px] font-bold text-zinc-900 dark:text-white outline-none" />
                                                        <span className="text-zinc-500 text-[10px]">-</span>
                                                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-[10px] font-bold text-zinc-900 dark:text-white mr-2 outline-none" />
                                                    </div>
                                                )}
                                                {(['today', 'week', 'month', 'all', 'custom'] as const).map(r => (
                                                    <button key={r} onClick={() => setReportRange(r)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${reportRange === r ? 'bg-white dark:bg-dark-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>
                                                        {{ today: 'اليوم', week: 'الأسبوع', month: 'الشهر', all: 'الكل', custom: 'مخصص' }[r]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-b border-zinc-200 dark:border-white/[0.04] pb-4 mb-4">
                                            <div className="bg-white dark:bg-dark-700 p-4 rounded-xl border border-zinc-200 dark:border-white/[0.04] flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500"><Receipt className="w-5 h-5" /></div>
                                                <div><p className="text-[10px] text-zinc-500 font-bold mb-0.5">عدد الطلبات</p><p className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{stats.orders.length}</p></div>
                                            </div>
                                            <div className="bg-white dark:bg-dark-700 p-4 rounded-xl border border-zinc-200 dark:border-white/[0.04] flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500"><DollarSign className="w-5 h-5" /></div>
                                                <div><p className="text-[10px] text-zinc-500 font-bold mb-0.5">إجمالي الإيرادات</p><p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalRevenue)}</p></div>
                                            </div>
                                        </div>

                                        {stats.orders.length > 0 ? (
                                            <div className="max-h-64 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                                                <table className="w-full text-xs">
                                                    <thead><tr className="border-b border-zinc-200 dark:border-white/[0.04] bg-white dark:bg-dark-700 sticky top-0 shadow-sm">
                                                        <th className="text-right p-3 text-[10px] text-zinc-500 font-bold">رقم الطلب</th>
                                                        <th className="text-right p-3 text-[10px] text-zinc-500 font-bold">العميل</th>
                                                        <th className="text-center p-3 text-[10px] text-zinc-500 font-bold">الأصناف</th>
                                                        <th className="text-right p-3 text-[10px] text-zinc-500 font-bold">الدليفري المُسلم</th>
                                                        <th className="text-right p-3 text-[10px] text-zinc-500 font-bold">التاريخ</th>
                                                        <th className="text-left p-3 text-[10px] text-zinc-500 font-bold">الإجمالي</th>
                                                    </tr></thead>
                                                    <tbody>{stats.orders.map(o => (
                                                        <tr key={o.id} className="border-b border-zinc-100 dark:border-white/[0.02] hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] transition">
                                                            <td className="p-3 font-bold text-zinc-500 dark:text-zinc-400">#{o.order_number}</td>
                                                            <td className="p-3 font-bold text-zinc-800 dark:text-zinc-200">{o.customer_name || '-'}</td>
                                                            <td className="p-3 text-center text-zinc-600 dark:text-zinc-400">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                                                            <td className="p-3 font-bold text-cyan-600 dark:text-cyan-500 flex items-center gap-1.5 pt-3.5"><Truck className="w-3 h-3 text-cyan-500/50" /> {o.delivery_driver_id ? getDriverName(o.delivery_driver_id) : 'استلام'}</td>
                                                            <td className="p-3 text-zinc-500 text-[10px]">{new Date(o.created_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                            <td className="p-3 text-left font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(o.total)}</td>
                                                        </tr>
                                                    ))}</tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-zinc-400 text-xs flex flex-col items-center"><Wallet className="w-8 h-8 mb-2 opacity-20" /> لا توجد طلبات مسجلة لهذا الموظف في هذه الفترة</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
