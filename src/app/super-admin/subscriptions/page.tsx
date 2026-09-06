"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  DollarSign,
  TrendingUp,
  Crown,
  Save,
  Settings,
  Calculator,
  ChevronDown,
  ChevronUp,
  Edit2,
  X,
  RotateCcw,
  Sparkles,
  Layers,
  Receipt,
  History,
  Trash2,
  Clock,
  Filter,
  ArrowDownCircle,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

interface Restaurant {
  id: string;
  name: string;
  email: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

interface ClientPaymentData {
  totalPaid: number;
  history: PaymentRecord[];
}

const subTypeMap: Record<string, string> = {
  monthly: "شهري",
  semi_annual: "نصف سنوي",
  "semi-annual": "نصف سنوي",
  yearly: "سنوي",
  lifetime: "مدى الحياة",
  custom: "مخصص",
  free: "مجاني",
  Free: "مجاني",
};

const PLAN_TYPES = ["monthly", "semi_annual", "yearly", "lifetime"] as const;

export default function SubscriptionsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
  const [clientPayments, setClientPayments] = useState<Record<string, ClientPaymentData>>({});
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingPrices, setSavingPrices] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "debt" | "paid" | "unpaid">("all");
  const [showPricing, setShowPricing] = useState(false);

  // Modal for individual client custom price
  const [selectedClientForPrice, setSelectedClientForPrice] = useState<Restaurant | null>(null);
  const [clientCustomPriceInput, setClientCustomPriceInput] = useState("");
  const [savingClientPrice, setSavingClientPrice] = useState(false);

  // Modal for recording payments (partial/installments)
  const [selectedClientForPayment, setSelectedClientForPayment] = useState<Restaurant | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentNote, setNewPaymentNote] = useState("");
  const [newPaymentDate, setNewPaymentDate] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [directPaidInput, setDirectPaidInput] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: restData, error: restError } = await supabase
        .from("restaurants")
        .select("id, name, email, subscription_plan, subscription_expires_at, created_at")
        .order("created_at", { ascending: false });

      if (restError) throw restError;

      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("plan_name, price, features");

      if (plansError) throw plansError;

      const priceMap: Record<string, number> = {};
      const paymentsMap: Record<string, ClientPaymentData> = {};
      const editMap: Record<string, string> = {};

      if (plansData) {
        plansData.forEach((plan: any) => {
          const pName = plan.plan_name as string;

          if (pName.startsWith("client_payments_")) {
            const clientId = pName.replace("client_payments_", "");
            paymentsMap[clientId] = {
              totalPaid: Number(plan.price) || 0,
              history: Array.isArray(plan.features) ? plan.features : [],
            };
          } else {
            priceMap[pName] = Number(plan.price) || 0;
            if (PLAN_TYPES.includes(pName as any)) {
              editMap[pName] = String(plan.price || 0);
            }
          }
        });
      }

      PLAN_TYPES.forEach((type) => {
        if (!(type in editMap)) {
          editMap[type] = "0";
        }
      });

      setRestaurants(restData || []);
      setPlanPrices(priceMap);
      setClientPayments(paymentsMap);
      setEditPrices(editMap);
    } catch (error: any) {
      toast.error("حدث خطأ أثناء جلب البيانات");
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Save general plan prices
  const handleSavePrices = async () => {
    setSavingPrices(true);
    try {
      const upsertData = PLAN_TYPES.map((type) => ({
        plan_name: type,
        price: Number(editPrices[type]) || 0,
        billing_cycle: type,
      }));

      const { error } = await supabase
        .from("subscription_plans")
        .upsert(upsertData, { onConflict: "plan_name" });

      if (error) throw error;

      const newPriceMap: Record<string, number> = { ...planPrices };
      PLAN_TYPES.forEach((type) => {
        newPriceMap[type] = Number(editPrices[type]) || 0;
      });
      setPlanPrices(newPriceMap);

      toast.success("تم حفظ أسعار الباقات بنجاح");
    } catch (error: any) {
      console.error("Error saving prices:", error);
      toast.error("حدث خطأ أثناء حفظ الأسعار");
    } finally {
      setSavingPrices(false);
    }
  };

  // Save specific client custom price
  const handleSaveClientCustomPrice = async () => {
    if (!selectedClientForPrice) return;
    setSavingClientPrice(true);
    const planKey = `client_price_${selectedClientForPrice.id}`;
    const newPrice = parseFloat(clientCustomPriceInput);

    try {
      if (isNaN(newPrice) || newPrice < 0) {
        toast.error("يرجى إدخال سعر صحيح");
        setSavingClientPrice(false);
        return;
      }

      const { error } = await supabase.from("subscription_plans").upsert(
        {
          plan_name: planKey,
          price: newPrice,
          billing_cycle: "custom_client",
        },
        { onConflict: "plan_name" }
      );

      if (error) throw error;

      setPlanPrices((prev) => ({
        ...prev,
        [planKey]: newPrice,
      }));

      toast.success(`تم تخصيص سعر ${newPrice} ج.م لمطعم ${selectedClientForPrice.name}`);
      setSelectedClientForPrice(null);
    } catch (err: any) {
      console.error(err);
      toast.error("فشل حفظ السعر المخصص للعميل");
    } finally {
      setSavingClientPrice(false);
    }
  };

  // Reset client custom price
  const handleResetClientCustomPrice = async () => {
    if (!selectedClientForPrice) return;
    setSavingClientPrice(true);
    const planKey = `client_price_${selectedClientForPrice.id}`;

    try {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("plan_name", planKey);

      if (error) throw error;

      setPlanPrices((prev) => {
        const next = { ...prev };
        delete next[planKey];
        return next;
      });

      toast.success(`تمت استعادة السعر الافتراضي للباقة لمطعم ${selectedClientForPrice.name}`);
      setSelectedClientForPrice(null);
    } catch (err: any) {
      console.error(err);
      toast.error("فشل استعادة السعر الافتراضي");
    } finally {
      setSavingClientPrice(false);
    }
  };

  // Record a payment installment for a client
  const handleAddPayment = async () => {
    if (!selectedClientForPayment) return;
    const amount = parseFloat(newPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("يرجى إدخال مبلغ دفعة صحيح أكبر من صفر");
      return;
    }

    setSavingPayment(true);
    const clientId = selectedClientForPayment.id;
    const planKey = `client_payments_${clientId}`;

    const currentData = clientPayments[clientId] || { totalPaid: 0, history: [] };
    const newRecord: PaymentRecord = {
      id: Math.random().toString(36).substring(2, 9),
      amount: amount,
      date: newPaymentDate || new Date().toISOString().split("T")[0],
      note: newPaymentNote.trim() || "دفعة اشتراك",
    };

    const updatedHistory = [newRecord, ...currentData.history];
    const updatedTotalPaid = currentData.totalPaid + amount;

    try {
      const { error } = await supabase.from("subscription_plans").upsert(
        {
          plan_name: planKey,
          price: updatedTotalPaid,
          billing_cycle: "payment_tracking",
          features: updatedHistory,
        },
        { onConflict: "plan_name" }
      );

      if (error) throw error;

      setClientPayments((prev) => ({
        ...prev,
        [clientId]: {
          totalPaid: updatedTotalPaid,
          history: updatedHistory,
        },
      }));

      toast.success(`تم تسجيل دفعة بقيمة ${amount} ج.م لمطعم ${selectedClientForPayment.name}`);
      setNewPaymentAmount("");
      setNewPaymentNote("");
      setNewPaymentDate("");
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تسجيل الدفعة");
    } finally {
      setSavingPayment(false);
    }
  };

  // Quick action: Pay full remaining balance in one click
  const handlePayFullRemaining = async (remainingAmount: number) => {
    if (!selectedClientForPayment || remainingAmount <= 0) return;
    setSavingPayment(true);
    const clientId = selectedClientForPayment.id;
    const planKey = `client_payments_${clientId}`;

    const currentData = clientPayments[clientId] || { totalPaid: 0, history: [] };
    const newRecord: PaymentRecord = {
      id: Math.random().toString(36).substring(2, 9),
      amount: remainingAmount,
      date: new Date().toISOString().split("T")[0],
      note: "تسوية وسداد كامل المتبقي",
    };

    const updatedHistory = [newRecord, ...currentData.history];
    const updatedTotalPaid = currentData.totalPaid + remainingAmount;

    try {
      const { error } = await supabase.from("subscription_plans").upsert(
        {
          plan_name: planKey,
          price: updatedTotalPaid,
          billing_cycle: "payment_tracking",
          features: updatedHistory,
        },
        { onConflict: "plan_name" }
      );

      if (error) throw error;

      setClientPayments((prev) => ({
        ...prev,
        [clientId]: {
          totalPaid: updatedTotalPaid,
          history: updatedHistory,
        },
      }));

      toast.success(`تم سداد كامل المتبقي (${remainingAmount} ج.م) لمطعم ${selectedClientForPayment.name}`);
    } catch (err: any) {
      console.error(err);
      toast.error("فشل سداد المتبقي");
    } finally {
      setSavingPayment(false);
    }
  };

  // Directly set total paid amount
  const handleSetDirectPaidAmount = async () => {
    if (!selectedClientForPayment) return;
    const amount = parseFloat(directPaidInput);
    if (isNaN(amount) || amount < 0) {
      toast.error("يرجى إدخال مبلغ مدفوع صحيح");
      return;
    }

    setSavingPayment(true);
    const clientId = selectedClientForPayment.id;
    const planKey = `client_payments_${clientId}`;
    const newRecord: PaymentRecord = {
      id: Math.random().toString(36).substring(2, 9),
      amount: amount,
      date: new Date().toISOString().split("T")[0],
      note: "تسجيل إجمالي المدفوع مباشرة",
    };

    try {
      const { error } = await supabase.from("subscription_plans").upsert(
        {
          plan_name: planKey,
          price: amount,
          billing_cycle: "payment_tracking",
          features: [newRecord],
        },
        { onConflict: "plan_name" }
      );

      if (error) throw error;

      setClientPayments((prev) => ({
        ...prev,
        [clientId]: {
          totalPaid: amount,
          history: [newRecord],
        },
      }));

      toast.success(`تم تحديث المدفوع إلى ${amount} ج.م لمطعم ${selectedClientForPayment.name}`);
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تحديث المدفوع");
    } finally {
      setSavingPayment(false);
    }
  };

  // Reset paid to 0
  const handleResetPaidToZero = async () => {
    if (!selectedClientForPayment) return;
    setSavingPayment(true);
    const clientId = selectedClientForPayment.id;
    const planKey = `client_payments_${clientId}`;

    try {
      const { error } = await supabase.from("subscription_plans").delete().eq("plan_name", planKey);
      if (error) throw error;

      setClientPayments((prev) => {
        const next = { ...prev };
        delete next[clientId];
        return next;
      });

      setDirectPaidInput("0");
      toast.success("تم تصفير المدفوع وحساب كامل قيمة الاشتراك كمتبقي");
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تصفير المدفوع");
    } finally {
      setSavingPayment(false);
    }
  };

  // Delete a specific payment record
  const handleDeletePaymentRecord = async (recordId: string) => {
    if (!selectedClientForPayment) return;
    const clientId = selectedClientForPayment.id;
    const planKey = `client_payments_${clientId}`;

    const currentData = clientPayments[clientId];
    if (!currentData) return;

    const recordToDelete = currentData.history.find((h) => h.id === recordId);
    if (!recordToDelete) return;

    const updatedHistory = currentData.history.filter((h) => h.id !== recordId);
    const updatedTotalPaid = Math.max(0, currentData.totalPaid - recordToDelete.amount);

    setSavingPayment(true);
    try {
      const { error } = await supabase.from("subscription_plans").upsert(
        {
          plan_name: planKey,
          price: updatedTotalPaid,
          billing_cycle: "payment_tracking",
          features: updatedHistory,
        },
        { onConflict: "plan_name" }
      );

      if (error) throw error;

      setClientPayments((prev) => ({
        ...prev,
        [clientId]: {
          totalPaid: updatedTotalPaid,
          history: updatedHistory,
        },
      }));

      toast.success("تم حذف الدفعة وتحديث الرصيد");
    } catch (err: any) {
      console.error(err);
      toast.error("فشل حذف الدفعة");
    } finally {
      setSavingPayment(false);
    }
  };

  // Price for client
  const getClientPriceInfo = (r: Restaurant) => {
    const clientCustomKey = `client_price_${r.id}`;
    const isCustomClientPrice = clientCustomKey in planPrices;

    if (isCustomClientPrice) {
      return {
        price: planPrices[clientCustomKey],
        isCustom: true,
        source: "سعر مخصص للعميل",
      };
    }

    const plan = r.subscription_plan || "free";

    if (plan === "custom" && r.subscription_expires_at) {
      const monthlyPrice = planPrices["monthly"] || 0;
      if (monthlyPrice > 0) {
        const dailyRate = monthlyPrice / 30;
        const start = new Date(r.created_at);
        const end = new Date(r.subscription_expires_at);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          price: Math.round(dailyRate * days),
          isCustom: false,
          source: `حسبة يومية (${days} يوم)`,
        };
      }
    }

    const basePrice = planPrices[plan] || 0;
    return {
      price: basePrice,
      isCustom: false,
      source: "سعر الباقة الافتراضي",
    };
  };

  const getStatus = (r: Restaurant) => {
    if (r.subscription_plan === "lifetime") return "lifetime";
    if (!r.subscription_expires_at) return "none";
    return new Date(r.subscription_expires_at) > new Date() ? "active" : "expired";
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return { label: "نشط", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400", icon: CheckCircle2 };
      case "expired":
        return { label: "منتهي", color: "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400", icon: XCircle };
      case "lifetime":
        return { label: "مدى الحياة", color: "text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400", icon: Crown };
      default:
        return { label: "غير محدد", color: "text-stone-600 bg-stone-50 dark:bg-stone-500/10 dark:text-stone-400", icon: AlertCircle };
    }
  };

  const getRemainingDays = (r: Restaurant) => {
    if (r.subscription_plan === "lifetime") return "مدى الحياة";
    if (!r.subscription_expires_at) return "غير محدد";
    const days = Math.ceil(
      (new Date(r.subscription_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 0) return "منتهي";
    return `${days} يوم متبقي`;
  };

  // Comprehensive financial breakdown for each client including payments & remaining
  const getClientFinancialSummary = (r: Restaurant) => {
    const { price, isCustom, source } = getClientPriceInfo(r);
    const status = getStatus(r);
    const isExpired = status === "expired" || status === "none";
    const plan = r.subscription_plan || "free";
    const requiredAmount = price;

    // Recorded paid data
    const paymentData = clientPayments[r.id];
    let amountPaid = 0;

    if (paymentData !== undefined) {
      amountPaid = paymentData.totalPaid;
    } else {
      // Default: If no payment has been recorded yet, amountPaid is 0 EGP,
      // so the entire subscription price is outstanding/remaining!
      amountPaid = 0;
    }

    const remainingAmount = Math.max(0, requiredAmount - amountPaid);

    // Payment Status
    let paymentStatus: "paid" | "partial" | "unpaid" = "paid";
    if (requiredAmount === 0) {
      paymentStatus = "paid";
    } else if (amountPaid >= requiredAmount) {
      paymentStatus = "paid";
    } else if (amountPaid > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "unpaid";
    }

    // Active revenue: Strictly 0 if subscription is expired!
    const activeRevenue = isExpired ? 0 : amountPaid;

    return {
      price,
      isCustom,
      source,
      status,
      isExpired,
      requiredAmount,
      amountPaid,
      remainingAmount,
      paymentStatus,
      activeRevenue,
      paymentHistory: paymentData?.history || [],
    };
  };

  // Filter list
  const filtered = restaurants.filter((r) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(search) ||
      r.email?.toLowerCase().includes(search) ||
      (r.subscription_plan || "").toLowerCase().includes(search);

    if (!matchesSearch) return false;

    if (paymentStatusFilter === "debt") {
      const fin = getClientFinancialSummary(r);
      return fin.remainingAmount > 0;
    }
    if (paymentStatusFilter === "paid") {
      const fin = getClientFinancialSummary(r);
      return fin.paymentStatus === "paid" && fin.requiredAmount > 0;
    }
    if (paymentStatusFilter === "unpaid") {
      const fin = getClientFinancialSummary(r);
      return fin.paymentStatus === "unpaid" && fin.requiredAmount > 0;
    }

    return true;
  });

  // Calculate totals
  const totals = useMemo(() => {
    let totalActiveRev = 0;
    let totalCollectedCash = 0;
    let totalOutstandingDebt = 0;
    let clientsWithDebtCount = 0;
    let activeSubs = 0;
    let expiredSubs = 0;

    restaurants.forEach((r) => {
      const fin = getClientFinancialSummary(r);
      if (fin.status === "active" || fin.status === "lifetime") {
        activeSubs++;
      } else if (fin.status === "expired") {
        expiredSubs++;
      }

      totalActiveRev += fin.activeRevenue;
      totalCollectedCash += fin.amountPaid;
      totalOutstandingDebt += fin.remainingAmount;

      if (fin.remainingAmount > 0) {
        clientsWithDebtCount++;
      }
    });

    return {
      totalActiveRev,
      totalCollectedCash,
      totalOutstandingDebt,
      clientsWithDebtCount,
      activeSubs,
      expiredSubs,
      totalClients: restaurants.length,
    };
  }, [restaurants, planPrices, clientPayments]);

  const monthlyPrice = Number(editPrices["monthly"]) || 0;
  const dailyRate = monthlyPrice > 0 ? monthlyPrice / 30 : 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-600" />
            إدارة الاشتراكات والتحصيلات
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            تسجيل دفعات الاشتراكات، متابعة المتبقي على العملاء، وتخصيص الأسعار
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPricing(!showPricing)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4" />
            <span>أسعار الباقات العامة</span>
            {showPricing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Pricing Editor Section */}
      {showPricing && (
        <div className="bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm p-6 space-y-6 transition-all animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900 dark:text-white">الأسعار العامة للباقات</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  تطبق على المشتركين ما لم يتم تحديد سعر مخصص لعميل بعينه
                </p>
              </div>
            </div>
            <button
              onClick={handleSavePrices}
              disabled={savingPrices}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {savingPrices ? "جاري الحفظ..." : "حفظ الأسعار"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_TYPES.map((type) => (
              <div key={type} className="bg-stone-50 dark:bg-[#0a0f16] rounded-xl border border-stone-100 dark:border-stone-800/50 p-4">
                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-2 block">
                  {subTypeMap[type]}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editPrices[type] || "0"}
                    onChange={(e) => setEditPrices({ ...editPrices, [type]: e.target.value })}
                    className="w-full pl-12 pr-4 py-2 bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-700 rounded-lg text-lg font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-400">ج.م</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <Calculator className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">طريقة احتساب الاشتراكات المخصصة</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                سعر اليوم = {monthlyPrice.toLocaleString()} ج.م ÷ 30 يوم ={" "}
                <span className="font-bold">{dailyRate.toFixed(2)} ج.م/يوم</span>. ويتم الضرب في عدد أيام الاشتراك.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Revenue */}
        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                الإيراد النشط المحصل
              </p>
              <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                {totals.totalActiveRev.toLocaleString()} ج.م
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-stone-400 mt-2">
            ✓ المبالغ المحصلة من الاشتراكات النشطة فقط
          </p>
        </div>

        {/* Total Collected Cash */}
        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                إجمالي المدفوع فعلياً
              </p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {totals.totalCollectedCash.toLocaleString()} ج.م
              </h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-stone-400 mt-2">
            مجموع كل الدفعات النقدية المسجلة حتى الآن
          </p>
        </div>

        {/* Total Outstanding Debt */}
        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                إجمالي المتبقي (مستحقات)
              </p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {totals.totalOutstandingDebt.toLocaleString()} ج.م
              </h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-amber-600/80 mt-2 font-medium">
            مبالغ متبقية على {totals.clientsWithDebtCount} عميل
          </p>
        </div>

        {/* Expired Uncounted */}
        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                اشتراكات منتهية
              </p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {totals.expiredSubs} <span className="text-xs font-normal text-stone-400">من {totals.totalClients}</span>
              </h3>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-rose-500/80 mt-2 font-medium">
            مستبعدة من الإيراد الجاري (0 ج.م)
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="البحث بالعميل أو الباقة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all dark:text-white placeholder:text-stone-400"
            />
          </div>

          {/* Quick Filters for Payments */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-[#0a0f16] p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setPaymentStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                paymentStatusFilter === "all"
                  ? "bg-white dark:bg-[#131b26] text-stone-900 dark:text-white shadow-sm"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              الكل ({restaurants.length})
            </button>
            <button
              onClick={() => setPaymentStatusFilter("debt")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                paymentStatusFilter === "debt"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              عليهم متبقي ({totals.clientsWithDebtCount})
            </button>
            <button
              onClick={() => setPaymentStatusFilter("paid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                paymentStatusFilter === "paid"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              مدفوع بالكامل
            </button>
            <button
              onClick={() => setPaymentStatusFilter("unpaid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                paymentStatusFilter === "unpaid"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              غير مدفوع
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-stone-50 dark:bg-[#0a0f16] text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="px-5 py-4 font-semibold">العميل</th>
                <th className="px-5 py-4 font-semibold">نوع الباقة</th>
                <th className="px-5 py-4 font-semibold">سعر الاشتراك</th>
                <th className="px-5 py-4 font-semibold">المدفوع</th>
                <th className="px-5 py-4 font-semibold">المتبقي عليه</th>
                <th className="px-5 py-4 font-semibold">حالة السداد</th>
                <th className="px-5 py-4 font-semibold">حالة الاشتراك</th>
                <th className="px-5 py-4 font-semibold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-stone-500 dark:text-stone-400">
                    جاري تحميل البيانات...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-stone-500 dark:text-stone-400">
                    لا يوجد عملاء مطابقين للبحث أو الفلتر
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const fin = getClientFinancialSummary(r);
                  const statusInfo = getStatusInfo(fin.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-[#0a0f16]/50 transition-colors">
                      {/* Name & email */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                          {r.name}
                          {fin.isCustom && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> سعر خاص
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{r.email || "بدون بريد"}</div>
                      </td>

                      {/* Plan type */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 font-medium">
                          {r.subscription_plan === "lifetime" && <Crown className="w-3.5 h-3.5 text-purple-500" />}
                          {subTypeMap[r.subscription_plan || "free"] || r.subscription_plan || "مجاني"}
                        </span>
                      </td>

                      {/* Required Price */}
                      <td className="px-5 py-4 font-bold text-stone-900 dark:text-white">
                        {fin.requiredAmount > 0 ? (
                          <div>
                            <span>{fin.requiredAmount.toLocaleString()} ج.م</span>
                            <div className="text-[10px] text-stone-400 font-normal">{fin.source}</div>
                          </div>
                        ) : (
                          <span className="text-stone-400 font-normal">مجاني</span>
                        )}
                      </td>

                      {/* Amount Paid */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {fin.amountPaid.toLocaleString()} ج.م
                        </div>
                        {fin.paymentHistory.length > 0 && (
                          <div className="text-[10px] text-stone-400">
                            {fin.paymentHistory.length} دفعات مسجلة
                          </div>
                        )}
                      </td>

                      {/* Remaining Balance */}
                      <td className="px-5 py-4">
                        {fin.remainingAmount > 0 ? (
                          <div className="inline-flex flex-col">
                            <span className="font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md text-xs">
                              باقي: {fin.remainingAmount.toLocaleString()} ج.م
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            0 ج.م (خالص)
                          </span>
                        )}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="px-5 py-4">
                        {fin.requiredAmount === 0 ? (
                          <span className="text-xs text-stone-400 font-medium">مجاني</span>
                        ) : fin.paymentStatus === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            مدفوع بالكامل
                          </span>
                        ) : fin.paymentStatus === "partial" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3" />
                            مدفوع جزئياً
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3 h-3" />
                            غير مدفوع
                          </span>
                        )}
                      </td>

                      {/* Subscription Status */}
                      <td className="px-5 py-4">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{statusInfo.label}</span>
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          {fin.isExpired ? "0 ج.م إيراد نشط" : getRemainingDays(r)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Record Payment Button */}
                          <button
                            onClick={() => {
                              setSelectedClientForPayment(r);
                              const rem = fin.remainingAmount;
                              setNewPaymentAmount("");
                              setDirectPaidInput(String(fin.amountPaid));
                              setNewPaymentDate(new Date().toISOString().split("T")[0]);
                              setNewPaymentNote("");
                            }}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                            title="تسجيل دفعة نقدية جديدة"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>تسجيل دفعة</span>
                          </button>

                          {/* Custom Price Button */}
                          <button
                            onClick={() => {
                              setSelectedClientForPrice(r);
                              setClientCustomPriceInput(String(fin.price));
                            }}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                              fin.isCustom
                                ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400"
                                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
                            }`}
                            title="تخصيص سعر محدد لهذا العميل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Record Payment & View History */}
      {selectedClientForPayment && (() => {
        const fin = getClientFinancialSummary(selectedClientForPayment);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-white">
                      تسجيل دفعة اشتراك
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      العميل: {selectedClientForPayment.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClientForPayment(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-stone-50 dark:bg-[#0a0f16] rounded-xl text-center border border-stone-100 dark:border-stone-800">
                <div>
                  <span className="text-[11px] text-stone-400 block mb-1">قيمة الاشتراك المطلوبة</span>
                  <span className="text-base font-bold text-stone-800 dark:text-white">
                    {fin.requiredAmount.toLocaleString()} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mb-1">المدفوع حالياً</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {fin.amountPaid.toLocaleString()} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 block mb-1">المتبقي عليه</span>
                  <span className={`text-base font-black ${fin.remainingAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {fin.remainingAmount.toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-800 rounded-xl">
                <div className="text-xs text-stone-600 dark:text-stone-300">
                  {fin.remainingAmount > 0 ? (
                    <span>باقي عليه: <strong className="text-amber-600 font-bold">{fin.remainingAmount.toLocaleString()} ج.م</strong></span>
                  ) : (
                    <span className="text-emerald-600 font-bold">✓ الحساب خالص ومسدد بالكامل</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {fin.remainingAmount > 0 && (
                    <button
                      onClick={() => handlePayFullRemaining(fin.remainingAmount)}
                      disabled={savingPayment}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                      title="تسديد كامل المتبقي ليصبح الباقي 0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      سداد كامل المتبقي
                    </button>
                  )}
                  {fin.amountPaid > 0 && (
                    <button
                      onClick={handleResetPaidToZero}
                      disabled={savingPayment}
                      className="px-2.5 py-1.5 bg-stone-200 hover:bg-rose-100 text-stone-600 hover:text-rose-600 dark:bg-stone-800 dark:hover:bg-rose-950 dark:text-stone-300 dark:hover:text-rose-400 rounded-lg text-xs font-medium transition-all"
                      title="تصفير المدفوع واعتبار الاشتراك غير مدفوع بالكامل"
                    >
                      تصفير
                    </button>
                  )}
                </div>
              </div>

              {/* Section 1: Add New Payment Installment (Deducts from remaining) */}
              <div className="space-y-3 pt-2 bg-stone-50/50 dark:bg-stone-900/30 p-4 rounded-xl border border-stone-200/80 dark:border-stone-800">
                <h4 className="text-sm font-bold text-stone-800 dark:text-white flex items-center gap-1.5">
                  <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                  تسجيل دفعة جديدة (تُخصم من المتبقي عليه)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                      مبلغ الدفعة المستلمة (ج.م) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="مثال: 150"
                      value={newPaymentAmount}
                      onChange={(e) => setNewPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                      تاريخ الاستلام
                    </label>
                    <input
                      type="date"
                      value={newPaymentDate}
                      onChange={(e) => setNewPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    طريقة التحويل / ملاحظة
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: فودافون كاش، إنستاباي، نقدي، دفعة ثانية..."
                    value={newPaymentNote}
                    onChange={(e) => setNewPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                {/* LIVE CALCULATION PREVIEW BOX */}
                {Number(newPaymentAmount) > 0 && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-xs space-y-1.5 transition-all animate-in fade-in">
                    <div className="flex justify-between text-stone-600 dark:text-stone-300">
                      <span>الدفعة المستلمة:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +{Number(newPaymentAmount).toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-600 dark:text-stone-300">
                      <span>إجمالي المدفوع الجديد:</span>
                      <span className="font-bold text-stone-900 dark:text-white">
                        {(fin.amountPaid + Number(newPaymentAmount)).toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200/60 dark:border-emerald-500/20 pt-1 text-stone-800 dark:text-white font-bold">
                      <span>المتبقي عليه بعد خصم هذه الدفعة:</span>
                      <span className={`text-sm ${Math.max(0, fin.remainingAmount - Number(newPaymentAmount)) === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {Math.max(0, fin.remainingAmount - Number(newPaymentAmount)).toLocaleString()} ج.م
                        {Math.max(0, fin.remainingAmount - Number(newPaymentAmount)) === 0 && " (خالص بالكامل ✓)"}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddPayment}
                  disabled={savingPayment || !newPaymentAmount}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {savingPayment ? "جاري الحفظ والخصم..." : "خصم الدفعة من المتبقي وحفظ"}
                </button>
              </div>

              {/* Section 2: Direct Edit of Total Paid */}
              <div className="p-4 bg-stone-50 dark:bg-[#0a0f16] rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    أو تعيين إجمالي المدفوع مباشرة (تعديل سريع)
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="أدخل إجمالي المدفوع..."
                      value={directPaidInput}
                      onChange={(e) => setDirectPaidInput(e.target.value)}
                      className="w-full pl-12 pr-3 py-2 bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">
                      ج.م
                    </span>
                  </div>
                  <button
                    onClick={handleSetDirectPaidAmount}
                    disabled={savingPayment || directPaidInput === ""}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    تحديث
                  </button>
                </div>
                {directPaidInput !== "" && !isNaN(parseFloat(directPaidInput)) && (
                  <p className="text-[11px] text-stone-400">
                    سيصبح المتبقي عليه تلقائياً:{" "}
                    <strong className="text-amber-600">
                      {Math.max(0, fin.requiredAmount - parseFloat(directPaidInput)).toLocaleString()} ج.م
                    </strong>
                  </p>
                )}
              </div>

              {/* Payment History List */}
              <div className="border-t border-stone-100 dark:border-stone-800 pt-4 space-y-3">
                <h4 className="text-sm font-bold text-stone-800 dark:text-white flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  سجل الدفعات المستلمة ({fin.paymentHistory.length})
                </h4>

                {fin.paymentHistory.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-4 bg-stone-50 dark:bg-[#0a0f16] rounded-xl">
                    لم يتم تسجيل أي دفعات بعد لهذا العميل (المتبقي كامل قيمة الاشتراك)
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {fin.paymentHistory.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-3 bg-stone-50 dark:bg-[#0a0f16] rounded-xl border border-stone-100 dark:border-stone-800/50 text-xs"
                      >
                        <div>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            +{rec.amount.toLocaleString()} ج.م
                          </div>
                          <div className="text-stone-500 mt-0.5">
                            {rec.note || "دفعة"} • {rec.date}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeletePaymentRecord(rec.id)}
                          disabled={savingPayment}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="حذف هذه الدفعة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal 2: Custom Price for Individual Client */}
      {selectedClientForPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-white">
                    تخصيص سعر الاشتراك
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    العميل: {selectedClientForPrice.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientForPrice(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-stone-50 dark:bg-[#0a0f16] rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">نوع الباقة الحالية:</span>
                  <span className="font-bold text-stone-800 dark:text-white">
                    {subTypeMap[selectedClientForPrice.subscription_plan || "free"] || "مجاني"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">السعر الافتراضي للباقة:</span>
                  <span className="font-bold text-stone-800 dark:text-white">
                    {(planPrices[selectedClientForPrice.subscription_plan || "free"] || 0).toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  السعر المخصص لهذا العميل (ج.م)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={clientCustomPriceInput}
                    onChange={(e) => setClientCustomPriceInput(e.target.value)}
                    placeholder="أدخل السعر المخصص..."
                    autoFocus
                    className="w-full pl-12 pr-4 py-2.5 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-lg font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-400">
                    ج.م
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  هذا السعر يطبق فقط على هذا العميل ولا يغير أسعار باقي المشتركين على نفس الباقة.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveClientCustomPrice}
                disabled={savingClientPrice}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingClientPrice ? "جاري الحفظ..." : "حفظ السعر المخصص"}
              </button>

              {`client_price_${selectedClientForPrice.id}` in planPrices && (
                <button
                  onClick={handleResetClientCustomPrice}
                  disabled={savingClientPrice}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl text-sm transition-colors flex items-center gap-1.5"
                  title="إلغاء السعر المخصص واستعادة سعر الباقة الافتراضي"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>الافتراضي</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
