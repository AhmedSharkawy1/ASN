"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  DollarSign, Calculator, Download, CheckCircle2, Clock,
  Users, AlertTriangle, FileText, X, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";

interface Employee {
  id: string;
  full_name: string;
  base_salary: number;
  department: string;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  base_salary: number;
  total_bonuses: number;
  total_deductions: number;
  net_salary: number;
  working_days: number;
  attended_days: number;
  absent_days: number;
  late_days: number;
  total_hours: number;
  status: string;
  hr_employees?: { full_name: string; department: string };
}

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function PayrollPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null);

  const fetchData = useCallback(async (rId: string) => {
    setLoading(true);
    try {
      const [{ data: emps }, { data: payroll }] = await Promise.all([
        supabase.from('hr_employees').select('id, full_name, base_salary, department').eq('tenant_id', rId).eq('is_active', true),
        supabase.from('hr_payroll').select('*, hr_employees(full_name, department)').eq('tenant_id', rId).eq('period_month', selectedMonth).eq('period_year', selectedYear).order('created_at', { ascending: false }),
      ]);
      setEmployees(emps || []);
      setPayrollRecords(payroll || []);
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
      const { data: rest } = await supabase
        .from('restaurants').select('id')
        .eq(imp ? 'id' : 'email', imp || session.user.email).single();
      if (rest) {
        setRestaurantId(rest.id);
        fetchData(rest.id);
      }
    };
    init();
  }, [fetchData]);

  const generatePayroll = async () => {
    if (!restaurantId) return;
    setGenerating(true);
    try {
      // Calculate working days in the month
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      let workingDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(selectedYear, selectedMonth - 1, d).getDay();
        if (day !== 5) workingDays++; // Friday off
      }

      for (const emp of employees) {
        // Check if already exists
        const { data: existing } = await supabase.from('hr_payroll')
          .select('id').eq('employee_id', emp.id).eq('period_month', selectedMonth).eq('period_year', selectedYear).maybeSingle();

        if (existing) continue;

        // Get attendance for this month
        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`;

        const { data: attendance } = await supabase.from('hr_attendance')
          .select('*')
          .eq('employee_id', emp.id)
          .gte('date', startDate)
          .lte('date', endDate);

        const presentDays = attendance?.filter(a => a.status === 'present').length || 0;
        const lateDays = attendance?.filter(a => a.status === 'late').length || 0;
        const totalHours = attendance?.reduce((sum, a) => sum + (a.worked_hours || 0), 0) || 0;
        const absentDays = workingDays - presentDays - lateDays;

        // Apply deduction rules
        const { data: rules } = await supabase.from('hr_deduction_rules')
          .select('*')
          .eq('tenant_id', restaurantId)
          .eq('is_active', true);

        let totalDeductions = 0;
        const deductionItems: { description: string; amount: number }[] = [];

        if (rules) {
          for (const rule of rules) {
            let deductionAmount = 0;
            if (rule.rule_type === 'absence' && absentDays > rule.threshold_days) {
              const extraDays = absentDays - rule.threshold_days;
              if (rule.per_occurrence) {
                deductionAmount = extraDays * rule.deduction_amount;
              } else {
                deductionAmount = rule.deduction_amount;
              }
              if (rule.deduction_percentage > 0) {
                deductionAmount = (emp.base_salary * rule.deduction_percentage / 100) * extraDays;
              }
            } else if (rule.rule_type === 'late' && lateDays > rule.threshold_days) {
              const extraLate = lateDays - rule.threshold_days;
              deductionAmount = rule.per_occurrence ? extraLate * rule.deduction_amount : rule.deduction_amount;
            }

            if (deductionAmount > 0) {
              totalDeductions += deductionAmount;
              deductionItems.push({
                description: rule.name_ar || rule.name_en || '',
                amount: deductionAmount,
              });

              // Save to hr_deductions
              await supabase.from('hr_deductions').insert([{
                tenant_id: restaurantId,
                employee_id: emp.id,
                rule_id: rule.id,
                period_month: selectedMonth,
                period_year: selectedYear,
                amount: deductionAmount,
                reason: `${rule.name_ar}: ${rule.rule_type === 'absence' ? `${absentDays} يوم غياب` : `${lateDays} يوم تأخير`}`,
                applied_automatically: true,
              }]);
            }
          }
        }

        const netSalary = emp.base_salary - totalDeductions;

        // Insert payroll
        const { data: payroll } = await supabase.from('hr_payroll').insert([{
          tenant_id: restaurantId,
          employee_id: emp.id,
          period_month: selectedMonth,
          period_year: selectedYear,
          base_salary: emp.base_salary,
          total_bonuses: 0,
          total_deductions: totalDeductions,
          net_salary: netSalary,
          working_days: workingDays,
          attended_days: presentDays,
          absent_days: absentDays < 0 ? 0 : absentDays,
          late_days: lateDays,
          total_hours: totalHours,
          status: 'draft',
        }]).select().single();

        // Insert payroll items
        if (payroll) {
          const items = [
            { payroll_id: payroll.id, item_type: 'salary', description: isAr ? 'الراتب الأساسي' : 'Base Salary', amount: emp.base_salary },
            ...deductionItems.map(d => ({ payroll_id: payroll.id, item_type: 'deduction' as const, description: d.description, amount: -d.amount })),
          ];
          await supabase.from('hr_payroll_items').insert(items);
        }
      }

      toast.success(isAr ? "✅ تم إنشاء كشف المرتبات" : "✅ Payroll generated");
      fetchData(restaurantId);
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "فشل إنشاء الرواتب" : "Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  };

  const approvePayroll = async (id: string) => {
    await supabase.from('hr_payroll').update({ status: 'approved' }).eq('id', id);
    toast.success(isAr ? "تم اعتماد الراتب" : "Payroll approved");
    if (restaurantId) fetchData(restaurantId);
  };

  const markPaid = async (id: string) => {
    await supabase.from('hr_payroll').update({ status: 'paid' }).eq('id', id);
    toast.success(isAr ? "تم تسجيل الدفع" : "Marked as paid");
    if (restaurantId) fetchData(restaurantId);
  };

  const totalNet = payrollRecords.reduce((sum, r) => sum + r.net_salary, 0);
  const totalDeductions = payrollRecords.reduce((sum, r) => sum + r.total_deductions, 0);

  const statusBadge = (s: string) => {
    const map: Record<string, { ar: string; cls: string }> = {
      draft: { ar: "مسودة", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
      approved: { ar: "معتمد", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
      paid: { ar: "مدفوع", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
    };
    const item = map[s] || map.draft;
    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${item.cls}`}>{item.ar}</span>;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {isAr ? "كشف المرتبات" : "Payroll Management"}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            {isAr ? "إنشاء ومراجعة الراوتب الشهرية مع الخصومات التلقائية" : "Generate and review monthly payroll with automatic deductions"}
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
          <button onClick={generatePayroll} disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50">
            <Calculator className="w-4 h-4" />
            {generating ? (isAr ? "جاري الحساب..." : "Calculating...") : (isAr ? "إنشاء الرواتب" : "Generate")}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">{isAr ? "إجمالي الرواتب الصافية" : "Total Net Payroll"}</p>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{totalNet.toLocaleString()} ج.م</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">{isAr ? "إجمالي الخصومات" : "Total Deductions"}</p>
              <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">{totalDeductions.toLocaleString()} ج.م</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">{isAr ? "عدد الموظفين" : "Employees"}</p>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{payrollRecords.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-500" />
            {isAr ? `رواتب ${MONTHS_AR[selectedMonth - 1]} ${selectedYear}` : `Payroll ${selectedMonth}/${selectedYear}`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الموظف" : "Employee"}</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الراتب الأساسي" : "Base"}</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "أيام الحضور" : "Present"}</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "أيام الغياب" : "Absent"}</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الخصومات" : "Deductions"}</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الصافي" : "Net"}</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الحالة" : "Status"}</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase text-right">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {payrollRecords.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                  {isAr ? "لا توجد رواتب لهذا الشهر. اضغط 'إنشاء الرواتب' للبدء" : "No payroll for this month. Click 'Generate' to start"}
                </td></tr>
              ) : payrollRecords.map(rec => (
                <tr key={rec.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-900 dark:text-white">{rec.hr_employees?.full_name || "—"}</div>
                    <div className="text-xs text-slate-400">{rec.hr_employees?.department || ""}</div>
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-slate-700 dark:text-zinc-300">{rec.base_salary.toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm text-emerald-600 dark:text-emerald-400 font-bold">{rec.attended_days} / {rec.working_days}</td>
                  <td className="px-5 py-3 text-sm text-red-600 dark:text-red-400 font-bold">{rec.absent_days}</td>
                  <td className="px-5 py-3 text-sm text-red-600 dark:text-red-400 font-bold">{rec.total_deductions > 0 ? `-${rec.total_deductions.toLocaleString()}` : "0"}</td>
                  <td className="px-5 py-3 text-sm font-extrabold text-slate-800 dark:text-white">{rec.net_salary.toLocaleString()} ج.م</td>
                  <td className="px-5 py-3">{statusBadge(rec.status)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {rec.status === 'draft' && (
                        <button onClick={() => approvePayroll(rec.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                          {isAr ? "اعتماد" : "Approve"}
                        </button>
                      )}
                      {rec.status === 'approved' && (
                        <button onClick={() => markPaid(rec.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                          {isAr ? "تم الدفع" : "Mark Paid"}
                        </button>
                      )}
                      <button onClick={() => { setDetailRecord(rec); setShowDetail(true); }}
                        className="px-3 py-1.5 text-xs font-bold bg-stone-50 text-stone-600 dark:bg-white/5 dark:text-zinc-400 rounded-lg hover:bg-stone-100 dark:hover:bg-white/10 transition-colors">
                        {isAr ? "تفاصيل" : "Details"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && detailRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131b26] w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">{isAr ? "تفاصيل الراتب" : "Payroll Details"}</h2>
              <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">{detailRecord.hr_employees?.full_name}</h3>
                <p className="text-sm text-slate-400">{MONTHS_AR[detailRecord.period_month - 1]} {detailRecord.period_year}</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-zinc-400">{isAr ? "الراتب الأساسي" : "Base Salary"}</span>
                  <span className="font-bold text-slate-800 dark:text-white">{detailRecord.base_salary.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between p-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-zinc-400">{isAr ? "أيام العمل" : "Working Days"}</span>
                  <span className="font-bold text-slate-800 dark:text-white">{detailRecord.working_days}</span>
                </div>
                <div className="flex justify-between p-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-zinc-400">{isAr ? "أيام الحضور" : "Present Days"}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{detailRecord.attended_days}</span>
                </div>
                <div className="flex justify-between p-3 bg-stone-50 dark:bg-white/5 rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-zinc-400">{isAr ? "أيام الغياب" : "Absent Days"}</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{detailRecord.absent_days}</span>
                </div>
                <div className="flex justify-between p-3 bg-red-50 dark:bg-red-500/5 rounded-xl">
                  <span className="text-sm text-red-600 dark:text-red-400">{isAr ? "إجمالي الخصومات" : "Total Deductions"}</span>
                  <span className="font-bold text-red-600 dark:text-red-400">-{detailRecord.total_deductions.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 rounded-xl border border-violet-200 dark:border-violet-500/20">
                  <span className="text-sm font-extrabold text-violet-700 dark:text-violet-400">{isAr ? "الصافي" : "Net Salary"}</span>
                  <span className="text-lg font-extrabold text-violet-700 dark:text-violet-400">{detailRecord.net_salary.toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
