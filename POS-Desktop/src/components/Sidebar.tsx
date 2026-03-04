import { NavLink, useLocation } from 'react-router-dom';
import { AppUser } from '../App';
import {
    LayoutGrid, ClipboardList, BarChart3, Users, UtensilsCrossed,
    UserCog, LogOut, Monitor, Truck, Settings
} from 'lucide-react';

import logoImg from '../assets/logo.png';

type Props = { user: AppUser; restaurantName: string; onLogout: () => void; theme: 'dark' | 'light' };

const links = [
    { to: '/pos', icon: LayoutGrid, label: 'نقطة البيع', roles: ['admin', 'staff', 'delivery'] },
    { to: '/orders', icon: ClipboardList, label: 'الطلبات', roles: ['admin', 'staff', 'delivery'] },
    { to: '/reports', icon: BarChart3, label: 'التقارير', roles: ['admin'] },
    { to: '/customers', icon: Users, label: 'العملاء', roles: ['admin', 'staff'] },
    { to: '/menu', icon: UtensilsCrossed, label: 'المنيو', roles: ['admin'] },
    { to: '/delivery', icon: Truck, label: 'الدليفري', roles: ['admin'] },
    { to: '/staff', icon: UserCog, label: 'الموظفين', roles: ['admin'] },
    { to: '/settings', icon: Settings, label: 'الإعدادات', roles: ['admin'] },
];

export default function Sidebar({ user, restaurantName, onLogout, theme }: Props) {
    const location = useLocation();
    const filtered = links.filter(l => l.roles.includes(user.role));
    const isLight = theme === 'light';

    return (
        <aside className={`w-[220px] ${isLight ? 'bg-white border-l border-zinc-200' : 'bg-dark-800 border-l border-white/[0.04]'} flex flex-col h-full shrink-0`}>
            {/* Drag + Logo */}
            <div className="drag-region h-9" />
            <div className={`px-4 pb-4 ${isLight ? 'border-b border-zinc-200' : 'border-b border-white/[0.04]'}`}>
                <div className="flex items-center gap-2.5 no-drag">
                    <img src={logoImg} alt="Logo" className="w-10 h-10 object-contain drop-shadow-lg" />
                    <div>
                        <h1 className={`text-sm font-extrabold ${isLight ? 'text-zinc-900' : 'text-white'} leading-tight`}>ASN POS</h1>
                        <p className="text-[10px] text-zinc-500 truncate max-w-[140px]">{restaurantName || '...'}</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
                {filtered.map(link => {
                    const active = location.pathname === link.to;
                    return (
                        <NavLink key={link.to} to={link.to}
                            className={`no-drag flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group ${active
                                ? 'bg-emerald-500/10 text-emerald-500 shadow-sm shadow-emerald-500/5'
                                : isLight
                                    ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                                }`}>
                            <link.icon className={`w-[18px] h-[18px] transition ${active ? 'text-emerald-500' : isLight ? 'text-zinc-400 group-hover:text-zinc-600' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                            {link.label}
                        </NavLink>
                    );
                })}
            </nav>

            {/* User info */}
            <div className={`p-3 ${isLight ? 'border-t border-zinc-200' : 'border-t border-white/[0.04]'}`}>
                <div className="flex items-center gap-2 mb-2 px-1">
                    <div className={`w-7 h-7 rounded-full ${isLight ? 'bg-zinc-100' : 'bg-dark-600'} flex items-center justify-center text-xs font-bold text-emerald-500`}>
                        {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold ${isLight ? 'text-zinc-800' : 'text-zinc-300'} truncate`}>{user.name}</p>
                        <p className="text-[10px] text-zinc-500 capitalize">{user.role}</p>
                    </div>
                </div>
                <button onClick={onLogout}
                    className="no-drag w-full flex items-center justify-center gap-1.5 py-2 bg-red-500/8 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/15 transition">
                    <LogOut className="w-3.5 h-3.5" /> تسجيل خروج
                </button>
            </div>
        </aside>
    );
}
