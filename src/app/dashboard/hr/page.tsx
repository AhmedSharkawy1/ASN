"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Users, Clock, DollarSign, CalendarCheck, AlertTriangle,
  ArrowUpRight, TrendingUp, UserCheck, UserX, Briefcase
} from "lucide-react";
import { useLanguage } from "@/lib/context/LanguageContext";

interface Stats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  monthlyPayroll: number;
  pendingDeductions: number;
}

export default function HRDashboard() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0, presentToday: 0, absentToday: 0,
    lateToday: 0, monthlyPayroll: 0, pendingDeductions: 0
  });
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const fetchData = useCallback(async (rId: string) => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Fetch employees
      const { data: employees } = await supabase
        .from('hr_employees')
        .select('id, full_name, base_salary')
        .eq('tenant_id', rId)
        .eq('is_active', true);

      // Fetch today's attendance
      const { data: todayAttendance } = await supabase
        .from('hr_attendance')
        .select('*, hr_employees(full_name)')
        .eq('tenant_id', rId)
        .eq('date', today);

      // Fetch payroll for current month
      const { data: payroll } = await supabase
        .from('hr_payroll')
        .select('net_salary')
        .eq('tenant_id', rId)
        .eq('period_month', currentMonth)
        .eq('period_year', currentYear);

      const totalEmps = employees?.length || 0;
      const present = todayAttendance?.filter(a => a.status === 'present').length || 0;
      const late = todayAttendance?.filter(a => a.status === 'late').length || 0;
      const absent = totalEmps - present - late;
      const monthlyTotal = payroll?.reduce((sum, p) => sum + (p.net_salary || 0), 0) || 0;

      setStats({
        totalEmployees: totalEmps,
        presentToday: present,
        absentToday: absent < 0 ? 0 : absent,
        lateToday: late,
        monthlyPayroll: monthlyTotal,
        pendingDeductions: 0,
      });

      // Recent attendance
      const { data: recent } = await supabase
        .from('hr_attendance')
        .select('*, hr_employees(full_name)')
        .eq('tenant_id', rId)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentAttendance(recent || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const impTenant = sessionStorage.getItem('impersonating_tenant');
      if (impTenant) {
        setRestaurantId(impTenant);
        fetchData(impTenant);
      } else {
        const { data: rest } = await supabase
          .from('restaurants')
          .select('id')
          .eq('email', session.user.email)
          .single();
        if (rest) {
          setRestaurantId(rest.id);
          fetchData(rest.id);
        } else {
          // Fallback for staff users
          const { data: staff } = await supabase.from('team_members').select('restaurant_id').eq('auth_id', session.user.id).single();
          if (staff) {
            setRestaurantId(staff.restaurant_id);
            fetchData(staff.restaurant_id);
          }
        }
      }
    };
    init();
  }, [fetchData]);

  const statCards = [
    {
      icon: Users,
      label: isAr ? "إجمالي الموظفين" : "Total Employees",
      value: stats.totalEmployees,
      color: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50",
      bgDark: "dark:bg-blue-500/10",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: UserCheck,
      label: isAr ? "حاضرون اليوم" : "Present Today",
      value: stats.presentToday,
      color: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50",
      bgDark: "dark:bg-emerald-500/10",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: UserX,
      label: isAr ? "غائبون اليوم" : "Absent Today",
      value: stats.absentToday,
      color: "from-red-500 to-rose-600",
      bgLight: "bg-red-50",
      bgDark: "dark:bg-red-500/10",
      textColor: "text-red-600 dark:text-red-400",
    },
    {
      icon: Clock,
      label: isAr ? "متأخرون اليوم" : "Late Today",
      value: stats.lateToday,
      color: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50",
      bgDark: "dark:bg-amber-500/10",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: DollarSign,
      label: isAr ? "رواتب الشهر" : "Monthly Payroll",
      value: `${stats.monthlyPayroll.toLocaleString()} ج.م`,
      color: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-50",
      bgDark: "dark:bg-violet-500/10",
      textColor: "text-violet-600 dark:text-violet-400",
    },
    {
      icon: AlertTriangle,
      label: isAr ? "خصومات معلقة" : "Pending Deductions",
      value: stats.pendingDeductions,
      color: "from-rose-500 to-pink-600",
      bgLight: "bg-rose-50",
      bgDark: "dark:bg-rose-500/10",
      textColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  const statusLabel = (s: string) => {
    const map: Record<string, { ar: string; en: string; cls: string }> = {
      present: { ar: "حاضر", en: "Present", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
      absent: { ar: "غائب", en: "Absent", cls: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" },
      late: { ar: "متأخر", en: "Late", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
      early_leave: { ar: "انصراف مبكر", en: "Early Leave", cls: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" },
      holiday: { ar: "إجازة", en: "Holiday", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
      excused: { ar: "عذر مقبول", en: "Excused", cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400" },
    };
    const item = map[s] || map.absent;
    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${item.cls}`}>{isAr ? item.ar : item.en}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500" />
          <span className="text-slate-500 text-sm font-medium">{isAr ? "جاري التحميل..." : "Loading..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          {isAr ? "نظام الموارد البشرية" : "HR System"}
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 mt-1">
          {isAr ? "لوحة تحكم شاملة لإدارة الموظفين والحضور والرواتب" : "Comprehensive dashboard for employee, attendance & payroll management"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className={`w-10 h-10 rounded-xl ${card.bgLight} ${card.bgDark} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <card.icon className={`w-5 h-5 ${card.textColor}`} />
            </div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{card.value}</p>
            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/dashboard/hr/attendance" className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-between group">
          <div>
            <h3 className="text-lg font-extrabold">{isAr ? "تسجيل الحضور" : "Mark Attendance"}</h3>
            <p className="text-sm opacity-80 mt-1">{isAr ? "بصمة الوجه + الموقع" : "Face + Location"}</p>
          </div>
          <ArrowUpRight className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </a>
        <a href="/dashboard/hr/payroll" className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-between group">
          <div>
            <h3 className="text-lg font-extrabold">{isAr ? "كشف المرتبات" : "Payroll"}</h3>
            <p className="text-sm opacity-80 mt-1">{isAr ? "حساب ومراجعة الرواتب" : "Calculate & Review"}</p>
          </div>
          <ArrowUpRight className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </a>
        <a href="/dashboard/hr/employees" className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-between group">
          <div>
            <h3 className="text-lg font-extrabold">{isAr ? "إدارة الموظفين" : "Manage Employees"}</h3>
            <p className="text-sm opacity-80 mt-1">{isAr ? "إضافة وتعديل البيانات" : "Add & Edit Data"}</p>
          </div>
          <ArrowUpRight className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </a>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-teal-500" />
            {isAr ? "آخر سجلات الحضور" : "Recent Attendance"}
          </h2>
          <a href="/dashboard/hr/attendance" className="text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline">
            {isAr ? "عرض الكل" : "View All"}
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الموظف" : "Employee"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "التاريخ" : "Date"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الحضور" : "Check In"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الانصراف" : "Check Out"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {recentAttendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    {isAr ? "لا توجد سجلات حضور بعد" : "No attendance records yet"}
                  </td>
                </tr>
              ) : (
                recentAttendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 font-bold text-slate-800 dark:text-white">{rec.hr_employees?.full_name || "—"}</td>
                    <td className="px-6 py-3 text-sm text-slate-600 dark:text-zinc-300">{rec.date}</td>
                    <td className="px-6 py-3 text-sm text-slate-600 dark:text-zinc-300">
                      {rec.check_in ? new Date(rec.check_in).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600 dark:text-zinc-300">
                      {rec.check_out ? new Date(rec.check_out).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "—"}
                    </td>
                    <td className="px-6 py-3">{statusLabel(rec.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
