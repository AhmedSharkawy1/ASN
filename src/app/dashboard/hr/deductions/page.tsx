"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  AlertTriangle, Plus, X, Edit3, Trash2, Settings,
  FileText, DollarSign, Clock, UserX
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";

interface DeductionRule {
  id: string;
  name_ar: string;
  name_en: string | null;
  rule_type: string;
  threshold_days: number;
  deduction_amount: number;
  deduction_percentage: number;
  per_occurrence: boolean;
  is_active: boolean;
}

interface DeductionRecord {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  amount: number;
  reason: string;
  applied_automatically: boolean;
  created_at: string;
  hr_employees?: { full_name: string };
  hr_deduction_rules?: { name_ar: string };
}

interface Employee {
  id: string;
  full_name: string;
}

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function DeductionsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [rules, setRules] = useState<DeductionRule[]>([]);
  const [deductions, setDeductions] = useState<DeductionRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');

  // Rule Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DeductionRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name_ar: "", name_en: "", rule_type: "absence",
    threshold_days: 0, deduction_amount: 0, deduction_percentage: 0, per_occurrence: false,
  });

  // Manual deduction modal
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    employee_id: "", amount: 0, reason: "",
    period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(),
  });

  const fetchData = useCallback(async (rId: string) => {
    setLoading(true);
    try {
      const [{ data: r }, { data: d }, { data: e }] = await Promise.all([
        supabase.from('hr_deduction_rules').select('*').eq('tenant_id', rId).order('created_at', { ascending: false }),
        supabase.from('hr_deductions').select('*, hr_employees(full_name), hr_deduction_rules(name_ar)').eq('tenant_id', rId).order('created_at', { ascending: false }).limit(50),
        supabase.from('hr_employees').select('id, full_name').eq('tenant_id', rId).eq('is_active', true),
      ]);
      setRules(r || []);
      setDeductions(d || []);
      setEmployees(e || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const imp = sessionStorage.getItem('impersonating_tenant');
      const { data: rest } = await supabase.from('restaurants').select('id').eq(imp ? 'id' : 'email', imp || session.user.email).single();
      if (rest) { setRestaurantId(rest.id); fetchData(rest.id); }
    };
    init();
  }, [fetchData]);

  const openRuleModal = (rule?: DeductionRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({
        name_ar: rule.name_ar, name_en: rule.name_en || "", rule_type: rule.rule_type,
        threshold_days: rule.threshold_days, deduction_amount: rule.deduction_amount,
        deduction_percentage: rule.deduction_percentage, per_occurrence: rule.per_occurrence,
      });
    } else {
      setEditingRule(null);
      setRuleForm({ name_ar: "", name_en: "", rule_type: "absence", threshold_days: 0, deduction_amount: 0, deduction_percentage: 0, per_occurrence: false });
    }
    setIsRuleModalOpen(true);
  };

  const saveRule = async () => {
    if (!ruleForm.name_ar) { toast.error(isAr ? "يرجى إدخال اسم القاعدة" : "Enter rule name"); return; }
    setSaving(true);
    try {
      const payload = { ...ruleForm, tenant_id: restaurantId };
      if (editingRule) {
        await supabase.from('hr_deduction_rules').update(payload).eq('id', editingRule.id);
      } else {
        await supabase.from('hr_deduction_rules').insert([payload]);
      }
      toast.success(isAr ? "تم حفظ القاعدة" : "Rule saved");
      setIsRuleModalOpen(false);
      if (restaurantId) fetchData(restaurantId);
    } catch { toast.error(isAr ? "فشل الحفظ" : "Failed"); } finally { setSaving(false); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من الحذف؟" : "Are you sure?")) return;
    await supabase.from('hr_deduction_rules').delete().eq('id', id);
    toast.success(isAr ? "تم الحذف" : "Deleted");
    if (restaurantId) fetchData(restaurantId);
  };

  const saveManualDeduction = async () => {
    if (!manualForm.employee_id || !manualForm.amount || !manualForm.reason) {
      toast.error(isAr ? "يرجى ملء جميع الحقول" : "Fill all fields");
      return;
    }
    try {
      await supabase.from('hr_deductions').insert([{
        tenant_id: restaurantId,
        employee_id: manualForm.employee_id,
        amount: manualForm.amount,
        reason: manualForm.reason,
        period_month: manualForm.period_month,
        period_year: manualForm.period_year,
        applied_automatically: false,
      }]);
      toast.success(isAr ? "تمت إضافة الخصم" : "Deduction added");
      setIsManualOpen(false);
      if (restaurantId) fetchData(restaurantId);
    } catch { toast.error(isAr ? "فشل" : "Failed"); }
  };

  const ruleTypeLabel = (t: string) => {
    const map: Record<string, string> = {
      absence: isAr ? "غياب" : "Absence",
      late: isAr ? "تأخير" : "Late",
      early_leave: isAr ? "انصراف مبكر" : "Early Leave",
      custom: isAr ? "مخصص" : "Custom",
    };
    return map[t] || t;
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
            {isAr ? "نظام الخصومات" : "Deductions System"}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            {isAr ? "إعداد قواعد الخصم التلقائي ومراجعة سجل الخصومات" : "Configure automatic deduction rules and review history"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openRuleModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all">
            <Plus className="w-4 h-4" /> {isAr ? "قاعدة جديدة" : "New Rule"}
          </button>
          <button onClick={() => { setManualForm({ employee_id: "", amount: 0, reason: "", period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() }); setIsManualOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-700 text-slate-700 dark:text-white font-bold rounded-xl shadow-sm transition-colors">
            <DollarSign className="w-4 h-4 text-red-500" /> {isAr ? "خصم يدوي" : "Manual Deduction"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 dark:border-stone-700 pb-0">
        <button onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 text-sm font-extrabold rounded-t-xl transition-colors border-b-2 ${activeTab === 'rules' ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
          <Settings className="w-4 h-4 inline mr-1.5" />{isAr ? "قواعد الخصم" : "Rules"}
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-sm font-extrabold rounded-t-xl transition-colors border-b-2 ${activeTab === 'history' ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'}`}>
          <FileText className="w-4 h-4 inline mr-1.5" />{isAr ? "سجل الخصومات" : "History"}
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-bold">{isAr ? "لم يتم إعداد قواعد خصم بعد" : "No deduction rules set up yet"}</p>
              <p className="text-sm mt-1">{isAr ? "أنشئ قاعدة لتطبيق الخصومات تلقائياً" : "Create a rule to apply deductions automatically"}</p>
            </div>
          ) : rules.map(rule => (
            <div key={rule.id} className={`bg-white dark:bg-[#131b26] rounded-2xl border shadow-sm p-5 transition-all ${rule.is_active ? 'border-stone-200 dark:border-stone-800' : 'border-stone-200/50 dark:border-stone-800/50 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-lg">{rule.name_ar}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${rule.rule_type === 'absence' ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' : rule.rule_type === 'late' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-zinc-400'}`}>
                    {ruleTypeLabel(rule.rule_type)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openRuleModal(rule)} className="p-1.5 text-slate-400 hover:text-teal-500 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                  <Clock className="w-4 h-4" />
                  {isAr ? `الحد المسموح: ${rule.threshold_days} أيام` : `Threshold: ${rule.threshold_days} days`}
                </div>
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                  <DollarSign className="w-4 h-4" />
                  {rule.deduction_amount > 0
                    ? `${rule.deduction_amount.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'} ${rule.per_occurrence ? (isAr ? 'لكل يوم إضافي' : 'per extra day') : (isAr ? 'مرة واحدة' : 'once')}`
                    : `${rule.deduction_percentage}% ${isAr ? 'من الراتب' : 'of salary'}`
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الموظف" : "Employee"}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "السبب" : "Reason"}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "المبلغ" : "Amount"}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الفترة" : "Period"}</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "النوع" : "Type"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {deductions.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">{isAr ? "لا توجد خصومات" : "No deductions"}</td></tr>
                ) : deductions.map(d => (
                  <tr key={d.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-800 dark:text-white">{d.hr_employees?.full_name || "—"}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-zinc-300">{d.reason}</td>
                    <td className="px-5 py-3 text-sm font-bold text-red-600 dark:text-red-400">-{d.amount.toLocaleString()} ج.م</td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-zinc-300">{MONTHS_AR[d.period_month - 1]} {d.period_year}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${d.applied_automatically ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                        {d.applied_automatically ? (isAr ? "تلقائي" : "Auto") : (isAr ? "يدوي" : "Manual")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131b26] w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
                {editingRule ? (isAr ? "تعديل قاعدة الخصم" : "Edit Rule") : (isAr ? "إضافة قاعدة خصم جديدة" : "Add Deduction Rule")}
              </h2>
              <button onClick={() => setIsRuleModalOpen(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "اسم القاعدة (عربي) *" : "Rule Name (AR) *"}</label>
                <input type="text" value={ruleForm.name_ar} onChange={e => setRuleForm({ ...ruleForm, name_ar: e.target.value })}
                  placeholder={isAr ? "مثال: خصم الغياب بعد يومين" : "e.g. Absence deduction after 2 days"}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "نوع القاعدة" : "Rule Type"}</label>
                <select value={ruleForm.rule_type} onChange={e => setRuleForm({ ...ruleForm, rule_type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white">
                  <option value="absence">{isAr ? "غياب" : "Absence"}</option>
                  <option value="late">{isAr ? "تأخير" : "Late"}</option>
                  <option value="early_leave">{isAr ? "انصراف مبكر" : "Early Leave"}</option>
                  <option value="custom">{isAr ? "مخصص" : "Custom"}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "الحد المسموح (أيام)" : "Threshold (days)"}</label>
                <input type="number" value={ruleForm.threshold_days} onChange={e => setRuleForm({ ...ruleForm, threshold_days: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
                <p className="text-xs text-slate-400 mt-1">{isAr ? "مثال: 2 = يُطبق الخصم بعد يومين غياب" : "e.g. 2 = deduction applies after 2 absence days"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "مبلغ الخصم (ج.م)" : "Amount (EGP)"}</label>
                  <input type="number" value={ruleForm.deduction_amount} onChange={e => setRuleForm({ ...ruleForm, deduction_amount: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "أو نسبة (%)" : "Or Percentage (%)"}</label>
                  <input type="number" value={ruleForm.deduction_percentage} onChange={e => setRuleForm({ ...ruleForm, deduction_percentage: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-white/5 rounded-xl cursor-pointer">
                <input type="checkbox" checked={ruleForm.per_occurrence} onChange={e => setRuleForm({ ...ruleForm, per_occurrence: e.target.checked })}
                  className="w-5 h-5 rounded-md accent-teal-500" />
                <span className="text-sm font-bold text-slate-700 dark:text-white">{isAr ? "خصم لكل يوم إضافي (وليس مرة واحدة)" : "Deduct per extra day (not once)"}</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsRuleModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold transition-colors">
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button onClick={saveRule} disabled={saving}
                  className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-extrabold shadow-xl shadow-teal-500/20 transition-all disabled:opacity-50">
                  {saving ? "..." : (isAr ? "حفظ القاعدة" : "Save Rule")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Deduction Modal */}
      {isManualOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131b26] w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">{isAr ? "خصم يدوي" : "Manual Deduction"}</h2>
              <button onClick={() => setIsManualOpen(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "الموظف" : "Employee"}</label>
                <select value={manualForm.employee_id} onChange={e => setManualForm({ ...manualForm, employee_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white">
                  <option value="">{isAr ? "اختر الموظف" : "Select employee"}</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "المبلغ (ج.م)" : "Amount (EGP)"}</label>
                <input type="number" value={manualForm.amount} onChange={e => setManualForm({ ...manualForm, amount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "السبب *" : "Reason *"}</label>
                <textarea value={manualForm.reason} onChange={e => setManualForm({ ...manualForm, reason: e.target.value })} rows={2}
                  placeholder={isAr ? "مثال: تأخر ٣ ساعات يوم ١٥/٣" : "e.g. Late 3 hours on 3/15"}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsManualOpen(false)} className="flex-1 py-3 rounded-2xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold transition-colors">{isAr ? "إلغاء" : "Cancel"}</button>
                <button onClick={saveManualDeduction} className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-extrabold shadow-xl shadow-red-500/20 transition-all">{isAr ? "تطبيق الخصم" : "Apply Deduction"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
