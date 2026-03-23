"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  BarChart3, Users, Calendar, Clock, TrendingDown,
  TrendingUp, Download, Filter
} from "lucide-react";
import { useLanguage } from "@/lib/context/LanguageContext";

interface AttendanceSummary {
  employee_id: string;
  full_name: string;
  department: string;
  total_present: number;
  total_absent: number;
  total_late: number;
  total_hours: number;
  attendance_rate: number;
}

interface MonthlyPayrollSummary {
  month: number;
  year: number;
  total_base: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
}

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function HRReportsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<'attendance' | 'payroll' | 'absence'>('attendance');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<MonthlyPayrollSummary[]>([]);
  const [absenceAlerts, setAbsenceAlerts] = useState<any[]>([]);

  const fetchReports = useCallback(async (rId: string) => {
    setLoading(true);
    try {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      let workingDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(selectedYear, selectedMonth - 1, d).getDay();
        if (day !== 5) workingDays++;
      }

      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`;

      // Employees
      const { data: emps } = await supabase
        .from('hr_employees')
        .select('id, full_name, department')
        .eq('tenant_id', rId)
        .eq('is_active', true);

      // Attendance for the month
      const { data: attendance } = await supabase
        .from('hr_attendance')
        .select('employee_id, status, worked_hours')
        .eq('tenant_id', rId)
        .gte('date', startDate)
        .lte('date', endDate);

      // Build attendance summary
      const summaries: AttendanceSummary[] = (emps || []).map(emp => {
        const empAtt = attendance?.filter(a => a.employee_id === emp.id) || [];
        const present = empAtt.filter(a => a.status === 'present').length;
        const late = empAtt.filter(a => a.status === 'late').length;
        const totalHrs = empAtt.reduce((s, a) => s + (a.worked_hours || 0), 0);
        const absent = workingDays - present - late;
        const rate = workingDays > 0 ? Math.round(((present + late) / workingDays) * 100) : 0;

        return {
          employee_id: emp.id,
          full_name: emp.full_name,
          department: emp.department,
          total_present: present,
          total_absent: absent < 0 ? 0 : absent,
          total_late: late,
          total_hours: Math.round(totalHrs * 10) / 10,
          attendance_rate: rate,
        };
      });

      setAttendanceSummary(summaries.sort((a, b) => b.attendance_rate - a.attendance_rate));

      // Absence alerts (employees with high absence)
      setAbsenceAlerts(summaries.filter(s => s.total_absent >= 3).sort((a, b) => b.total_absent - a.total_absent));

      // Payroll summary by month (last 6 months)
      const { data: payroll } = await supabase
        .from('hr_payroll')
        .select('period_month, period_year, base_salary, total_deductions, net_salary')
        .eq('tenant_id', rId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      const monthlyMap = new Map<string, MonthlyPayrollSummary>();
      (payroll || []).forEach(p => {
        const key = `${p.period_year}-${p.period_month}`;
        const existing = monthlyMap.get(key);
        if (existing) {
          existing.total_base += p.base_salary;
          existing.total_deductions += p.total_deductions;
          existing.total_net += p.net_salary;
          existing.employee_count += 1;
        } else {
          monthlyMap.set(key, {
            month: p.period_month, year: p.period_year,
            total_base: p.base_salary, total_deductions: p.total_deductions,
            total_net: p.net_salary, employee_count: 1,
          });
        }
      });
      setPayrollSummary(Array.from(monthlyMap.values()).slice(0, 6));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const imp = sessionStorage.getItem('impersonating_tenant');
      const { data: rest } = await supabase.from('restaurants').select('id').eq(imp ? 'id' : 'email', imp || session.user.email).single();
      if (rest) { setRestaurantId(rest.id); fetchReports(rest.id); }
    };
    init();
  }, [fetchReports]);

  const rateColor = (rate: number) => {
    if (rate >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const rateBar = (rate: number) => {
    const color = rate >= 90 ? "bg-emerald-500" : rate >= 70 ? "bg-amber-500" : "bg-red-500";
    return (
      <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${rate}%` }} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500" />
          <span className="text-slate-500 text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {isAr ? "تقارير الموارد البشرية" : "HR Reports"}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            {isAr ? "تحليلات الحضور والرواتب ومستويات الأداء" : "Attendance, payroll analytics & performance levels"}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2.5 bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold dark:text-white outline-none">
            {MONTHS_AR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2.5 bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold dark:text-white outline-none">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 border-b border-stone-200 dark:border-stone-700 pb-0">
        {[
          { key: 'attendance' as const, icon: Calendar, label: isAr ? "تقرير الحضور" : "Attendance" },
          { key: 'payroll' as const, icon: TrendingUp, label: isAr ? "تقرير الرواتب" : "Payroll" },
          { key: 'absence' as const, icon: TrendingDown, label: isAr ? "تنبيهات الغياب" : "Absence Alerts" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveReport(tab.key)}
            className={`px-4 py-2.5 text-sm font-extrabold rounded-t-xl transition-colors border-b-2 ${activeReport === tab.key ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
            <tab.icon className="w-4 h-4 inline mr-1.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* Attendance Report */}
      {activeReport === 'attendance' && (
        <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 dark:border-stone-800">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">
              {isAr ? `تقرير الحضور — ${MONTHS_AR[selectedMonth - 1]} ${selectedYear}` : `Attendance Report — ${selectedMonth}/${selectedYear}`}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الموظف" : "Employee"}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "القسم" : "Dept"}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "حضور" : "Present"}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "غياب" : "Absent"}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "تأخير" : "Late"}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "ساعات" : "Hours"}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase w-40">{isAr ? "نسبة الحضور" : "Rate"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {attendanceSummary.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">{isAr ? "لا توجد بيانات" : "No data"}</td></tr>
                ) : attendanceSummary.map(s => (
                  <tr key={s.employee_id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-800 dark:text-white">{s.full_name}</td>
                    <td className="px-5 py-3 text-sm text-slate-500 dark:text-zinc-400">{s.department}</td>
                    <td className="px-5 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">{s.total_present}</td>
                    <td className="px-5 py-3 text-sm font-bold text-red-600 dark:text-red-400">{s.total_absent}</td>
                    <td className="px-5 py-3 text-sm font-bold text-amber-600 dark:text-amber-400">{s.total_late}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-zinc-300">{s.total_hours}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-extrabold ${rateColor(s.attendance_rate)}`}>{s.attendance_rate}%</span>
                        <div className="flex-1">{rateBar(s.attendance_rate)}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll Report */}
      {activeReport === 'payroll' && (
        <div className="space-y-4">
          {payrollSummary.length === 0 ? (
            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center text-slate-400">
              {isAr ? "لا توجد بيانات رواتب" : "No payroll data"}
            </div>
          ) : payrollSummary.map((p, i) => (
            <div key={i} className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">
                  {MONTHS_AR[p.month - 1]} {p.year}
                </h3>
                <span className="text-sm font-bold text-slate-400">{p.employee_count} {isAr ? "موظف" : "employees"}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/5 rounded-xl text-center">
                  <p className="text-xs font-bold text-blue-500 uppercase mb-1">{isAr ? "إجمالي الرواتب" : "Total Base"}</p>
                  <p className="text-lg font-extrabold text-blue-700 dark:text-blue-400">{p.total_base.toLocaleString()} ج.م</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-500/5 rounded-xl text-center">
                  <p className="text-xs font-bold text-red-500 uppercase mb-1">{isAr ? "إجمالي الخصومات" : "Total Deductions"}</p>
                  <p className="text-lg font-extrabold text-red-700 dark:text-red-400">{p.total_deductions.toLocaleString()} ج.م</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/5 rounded-xl text-center">
                  <p className="text-xs font-bold text-emerald-500 uppercase mb-1">{isAr ? "الصافي" : "Net Total"}</p>
                  <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">{p.total_net.toLocaleString()} ج.م</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Absence Alerts */}
      {activeReport === 'absence' && (
        <div className="space-y-4">
          {absenceAlerts.length === 0 ? (
            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center">
              <div className="text-emerald-500 text-4xl mb-3">✅</div>
              <p className="text-lg font-extrabold text-slate-800 dark:text-white">{isAr ? "لا توجد تنبيهات غياب" : "No absence alerts"}</p>
              <p className="text-sm text-slate-400 mt-1">{isAr ? "جميع الموظفين ضمن الحدود المقبولة" : "All employees within acceptable limits"}</p>
            </div>
          ) : absenceAlerts.map((a, i) => (
            <div key={i} className="bg-white dark:bg-[#131b26] rounded-2xl border border-red-200 dark:border-red-500/20 shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-800 dark:text-white">{a.full_name}</h3>
                <p className="text-sm text-slate-500">{a.department}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">{a.total_absent}</p>
                <p className="text-xs text-slate-400">{isAr ? "أيام غياب" : "absent days"}</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-extrabold ${rateColor(a.attendance_rate)}`}>{a.attendance_rate}%</p>
                <p className="text-xs text-slate-400">{isAr ? "نسبة الحضور" : "attendance"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
