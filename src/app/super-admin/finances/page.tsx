"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Server,
  Globe,
  Cloud,
  Users,
  Megaphone,
  Wrench,
  HelpCircle,
  Check,
  Edit2,
  Trash2,
  X,
  Save,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Layers,
  ChevronRight,
  BarChart3,
  PieChart,
  FileText,
  BadgeDollarSign,
  Palette,
  Film,
  Sparkles,
  Code2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

// =================== TYPES ===================

export type ExpenseCategory =
  | "server"
  | "domain"
  | "service"
  | "salary"
  | "marketing"
  | "maintenance"
  | "other";

export interface ExpenseRecord {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  dueDate?: string;
  recurrence: "monthly" | "yearly" | "once";
  status: "paid" | "pending";
  notes?: string;
}

export type TaskType =
  | "paper_menu_design"
  | "social_media_design"
  | "video_editing"
  | "ai_video_creation"
  | "website_dev"
  | "social_media_management"
  | "marketing_and_management"
  | "other";

export interface TaskRecord {
  id: string;
  title: string;
  taskType: TaskType;
  clientName: string;
  clientId?: string;
  price: number;
  paidAmount: number;
  status: "completed" | "in_progress" | "pending";
  date: string;
  notes?: string;
}

interface Restaurant {
  id: string;
  name: string;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
}

// Category Config
const CATEGORY_MAP: Record<
  ExpenseCategory,
  { label: string; icon: any; color: string; bgColor: string }
> = {
  server: {
    label: "سيرفرات واستضافات",
    icon: Server,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
  },
  domain: {
    label: "دومينات وDNS",
    icon: Globe,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
  },
  service: {
    label: "اشتراكات خدمات وسحابيات",
    icon: Cloud,
    color: "text-cyan-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-500/10",
  },
  salary: {
    label: "رواتب ومكافآت مبرمجين",
    icon: Users,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
  },
  marketing: {
    label: "تسويق وإعلانات",
    icon: Megaphone,
    color: "text-pink-500",
    bgColor: "bg-pink-50 dark:bg-pink-500/10",
  },
  maintenance: {
    label: "صيانة وتطوير",
    icon: Wrench,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  other: {
    label: "مصروفات أخرى",
    icon: HelpCircle,
    color: "text-stone-500",
    bgColor: "bg-stone-100 dark:bg-stone-800",
  },
};

const TASK_TYPE_MAP: Record<
  TaskType,
  { label: string; icon: any; color: string; bgColor: string }
> = {
  paper_menu_design: {
    label: "تصميم منيو ورقي",
    icon: FileText,
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20",
  },
  social_media_design: {
    label: "تصميمات سوشيال ميديا",
    icon: Palette,
    color: "text-pink-700 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200/50 dark:border-pink-500/20",
  },
  video_editing: {
    label: "مونتاج فيديو",
    icon: Film,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20",
  },
  ai_video_creation: {
    label: "إنشاء فيديو AI",
    icon: Sparkles,
    color: "text-cyan-700 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-500/20",
  },
  website_dev: {
    label: "تصميم وبرمجة موقع إلكتروني",
    icon: Code2,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20",
  },
  social_media_management: {
    label: "إدارة صفحات سوشيال ميديا",
    icon: Share2,
    color: "text-indigo-700 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20",
  },
  marketing_and_management: {
    label: "تسويق وإدارة صفحات",
    icon: Megaphone,
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20",
  },
  other: {
    label: "خدمة أخرى",
    icon: Wrench,
    color: "text-stone-700 dark:text-stone-300",
    bgColor: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200/50 dark:border-stone-700/50",
  },
};

export default function SuperAdminFinancesPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "tasks">("overview");

  // Expenses & Tasks state
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  // Subscriptions financial stats loaded directly
  const [subscriptionInflow, setSubscriptionInflow] = useState(0);
  const [subscriptionReceivables, setSubscriptionReceivables] = useState(0);

  // Search and filters
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>("all");
  const [expenseFilterStatus, setExpenseFilterStatus] = useState<string>("all");

  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("all");

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "server" as ExpenseCategory,
    amount: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    recurrence: "monthly" as "monthly" | "yearly" | "once",
    status: "paid" as "paid" | "pending",
    notes: "",
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    taskType: "paper_menu_design" as TaskType,
    clientName: "",
    clientId: "",
    price: "",
    paidAmount: "",
    status: "completed" as "completed" | "in_progress" | "pending",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [savingData, setSavingData] = useState(false);

  // Fetch all financial data
  useEffect(() => {
    fetchFinancesData();
  }, []);

  const fetchFinancesData = async () => {
    setLoading(true);
    try {
      const [
        { data: plansData, error: plansError },
        { data: restData, error: restError },
      ] = await Promise.all([
        supabase.from("subscription_plans").select("plan_name, price, features"),
        supabase.from("restaurants").select("id, name, subscription_plan, subscription_expires_at"),
      ]);

      if (plansError) throw plansError;
      if (restError) throw restError;

      // Extract expenses and tasks stored in subscription_plans rows
      let loadedExpenses: ExpenseRecord[] = [];
      let loadedTasks: TaskRecord[] = [];
      const clientPaymentsMap: Record<string, number> = {};
      const planPricesMap: Record<string, number> = {};

      if (plansData) {
        plansData.forEach((row: any) => {
          const pName = row.plan_name as string;
          if (pName === "platform_expenses") {
            loadedExpenses = Array.isArray(row.features) ? row.features : [];
          } else if (pName === "platform_custom_tasks") {
            loadedTasks = Array.isArray(row.features) ? row.features : [];
          } else if (pName.startsWith("client_payments_")) {
            const cId = pName.replace("client_payments_", "");
            clientPaymentsMap[cId] = Number(row.price) || 0;
          } else {
            planPricesMap[pName] = Number(row.price) || 0;
          }
        });
      }

      // Calculate subscription collections and receivables from active restaurants
      let subCollected = 0;
      let subPending = 0;

      if (restData) {
        restData.forEach((r: any) => {
          const clientCustomKey = `client_price_${r.id}`;
          const isCustom = clientCustomKey in planPricesMap;
          const plan = r.subscription_plan || "free";
          let price = isCustom ? planPricesMap[clientCustomKey] : planPricesMap[plan] || 0;

          // Check custom days
          if (plan === "custom" && r.subscription_expires_at) {
            const mp = planPricesMap["monthly"] || 0;
            if (mp > 0) {
              const start = new Date(r.created_at || Date.now());
              const end = new Date(r.subscription_expires_at);
              const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
              price = Math.round((mp / 30) * days);
            }
          }

          const isLifetime = plan === "lifetime";
          const isExpired = !isLifetime && (!r.subscription_expires_at || new Date(r.subscription_expires_at) <= new Date());

          const paid = clientPaymentsMap[r.id] !== undefined ? clientPaymentsMap[r.id] : 0;
          const remaining = Math.max(0, price - paid);

          // Only active count in ongoing subscription revenue
          if (!isExpired) {
            subCollected += paid;
            subPending += remaining;
          }
        });
      }

      setExpenses(loadedExpenses);
      setTasks(loadedTasks);
      setRestaurants(restData || []);
      setSubscriptionInflow(subCollected);
      setSubscriptionReceivables(subPending);
    } catch (err: any) {
      console.error("Error fetching finances:", err);
      toast.error("حدث خطأ أثناء تحميل بيانات الحسابات");
    } finally {
      setLoading(false);
    }
  };

  // Save expenses to Supabase
  const saveExpensesToDb = async (updated: ExpenseRecord[]) => {
    try {
      const { error } = await supabase.from("subscription_plans").upsert(
        {
          plan_name: "platform_expenses",
          price: updated.reduce((s, e) => s + (e.status === "paid" ? e.amount : 0), 0),
          billing_cycle: "finances",
          features: updated,
        },
        { onConflict: "plan_name" }
      );
      if (error) throw error;
      setExpenses(updated);
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error("فشل حفظ بيانات المصروفات في قاعدة البيانات");
      return false;
    }
  };

  // Save tasks to Supabase
  const saveTasksToDb = async (updated: TaskRecord[]) => {
    try {
      const { error } = await supabase.from("subscription_plans").upsert(
        {
          plan_name: "platform_custom_tasks",
          price: updated.reduce((s, t) => s + t.paidAmount, 0),
          billing_cycle: "finances",
          features: updated,
        },
        { onConflict: "plan_name" }
      );
      if (error) throw error;
      setTasks(updated);
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error("فشل حفظ بيانات التاسكات في قاعدة البيانات");
      return false;
    }
  };

  // Handle Save Expense
  const handleSaveExpense = async () => {
    const amountNum = parseFloat(expenseForm.amount);
    if (!expenseForm.title.trim() || isNaN(amountNum) || amountNum <= 0) {
      toast.error("يرجى إدخال اسم المصروف ومبلغ صحيح");
      return;
    }

    setSavingData(true);
    let updated: ExpenseRecord[];

    if (editingExpense) {
      updated = expenses.map((e) =>
        e.id === editingExpense.id
          ? {
              ...e,
              title: expenseForm.title.trim(),
              category: expenseForm.category,
              amount: amountNum,
              date: expenseForm.date,
              dueDate: expenseForm.dueDate || undefined,
              recurrence: expenseForm.recurrence,
              status: expenseForm.status,
              notes: expenseForm.notes.trim() || undefined,
            }
          : e
      );
    } else {
      const newExp: ExpenseRecord = {
        id: Math.random().toString(36).substring(2, 9),
        title: expenseForm.title.trim(),
        category: expenseForm.category,
        amount: amountNum,
        date: expenseForm.date,
        dueDate: expenseForm.dueDate || undefined,
        recurrence: expenseForm.recurrence,
        status: expenseForm.status,
        notes: expenseForm.notes.trim() || undefined,
      };
      updated = [newExp, ...expenses];
    }

    const success = await saveExpensesToDb(updated);
    if (success) {
      toast.success(editingExpense ? "تم تحديث بيانات المصروف بنجاح" : "تم تسجيل المصروف بنجاح");
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
    }
    setSavingData(false);
  };

  // Toggle Expense Status (Paid <-> Pending)
  const handleToggleExpenseStatus = async (expense: ExpenseRecord) => {
    const newStatus = expense.status === "paid" ? "pending" : "paid";
    const updated = expenses.map((e) =>
      e.id === expense.id ? { ...e, status: newStatus as "paid" | "pending" } : e
    );
    const success = await saveExpensesToDb(updated);
    if (success) {
      toast.success(newStatus === "paid" ? "تم تحديد المصروف كمدفوع ✓" : "تم تحديد المصروف كمستحق الدفع");
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;
    const updated = expenses.filter((e) => e.id !== id);
    const success = await saveExpensesToDb(updated);
    if (success) {
      toast.success("تم حذف المصروف بنجاح");
    }
  };

  // Handle Save Task
  const handleSaveTask = async () => {
    const priceNum = parseFloat(taskForm.price);
    const paidNum = parseFloat(taskForm.paidAmount) || 0;

    if (!taskForm.title.trim() || !taskForm.clientName.trim() || isNaN(priceNum) || priceNum <= 0) {
      toast.error("يرجى إدخال عنوان المهمة، اسم العميل، والمبلغ المطلوب");
      return;
    }

    setSavingData(true);
    let updated: TaskRecord[];

    if (editingTask) {
      updated = tasks.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: taskForm.title.trim(),
              taskType: taskForm.taskType,
              clientName: taskForm.clientName.trim(),
              clientId: taskForm.clientId || undefined,
              price: priceNum,
              paidAmount: Math.min(priceNum, paidNum),
              status: taskForm.status,
              date: taskForm.date,
              notes: taskForm.notes.trim() || undefined,
            }
          : t
      );
    } else {
      const newTask: TaskRecord = {
        id: Math.random().toString(36).substring(2, 9),
        title: taskForm.title.trim(),
        taskType: taskForm.taskType,
        clientName: taskForm.clientName.trim(),
        clientId: taskForm.clientId || undefined,
        price: priceNum,
        paidAmount: Math.min(priceNum, paidNum),
        status: taskForm.status,
        date: taskForm.date,
        notes: taskForm.notes.trim() || undefined,
      };
      updated = [newTask, ...tasks];
    }

    const success = await saveTasksToDb(updated);
    if (success) {
      toast.success(editingTask ? "تم تحديث المهمة بنجاح" : "تمت إضافة التاسك بنجاح");
      setIsTaskModalOpen(false);
      setEditingTask(null);
    }
    setSavingData(false);
  };

  // Quick Pay Task Balance
  const handlePayTaskFull = async (task: TaskRecord) => {
    const updated = tasks.map((t) =>
      t.id === task.id ? { ...t, paidAmount: t.price } : t
    );
    const success = await saveTasksToDb(updated);
    if (success) {
      toast.success(`تم سداد كامل حساب مهمة "${task.title}" بنجاح`);
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المهمة؟")) return;
    const updated = tasks.filter((t) => t.id !== id);
    const success = await saveTasksToDb(updated);
    if (success) {
      toast.success("تم حذف المهمة بنجاح");
    }
  };

  // =================== CALCULATIONS ===================

  const financials = useMemo(() => {
    // 1. Inflows
    const tasksPaidTotal = tasks.reduce((sum, t) => sum + t.paidAmount, 0);
    const totalInflow = subscriptionInflow + tasksPaidTotal;

    // 2. Outflows (Paid Expenses)
    const paidExpensesTotal = expenses
      .filter((e) => e.status === "paid")
      .reduce((sum, e) => sum + e.amount, 0);

    // 3. Pending Expenses (Upcoming Bills to Pay)
    const pendingExpensesTotal = expenses
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + e.amount, 0);

    // 4. Net Profit
    const netProfit = totalInflow - paidExpensesTotal;
    const profitMargin = totalInflow > 0 ? Math.round((netProfit / totalInflow) * 100) : 0;

    // 5. Receivables (Money owed by clients)
    const tasksPendingReceivables = tasks.reduce(
      (sum, t) => sum + Math.max(0, t.price - t.paidAmount),
      0
    );
    const totalReceivables = subscriptionReceivables + tasksPendingReceivables;

    // 6. Expense Breakdown by Category
    const categoryTotals: Record<ExpenseCategory, number> = {
      server: 0,
      domain: 0,
      service: 0,
      salary: 0,
      marketing: 0,
      maintenance: 0,
      other: 0,
    };
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    // 7. Tasks Breakdown by Type
    const taskTypeTotals: Record<TaskType, { count: number; totalRevenue: number }> = {
      paper_menu_design: { count: 0, totalRevenue: 0 },
      social_media_design: { count: 0, totalRevenue: 0 },
      video_editing: { count: 0, totalRevenue: 0 },
      ai_video_creation: { count: 0, totalRevenue: 0 },
      website_dev: { count: 0, totalRevenue: 0 },
      social_media_management: { count: 0, totalRevenue: 0 },
      marketing_and_management: { count: 0, totalRevenue: 0 },
      other: { count: 0, totalRevenue: 0 },
    };
    tasks.forEach((t) => {
      if (taskTypeTotals[t.taskType]) {
        taskTypeTotals[t.taskType].count++;
        taskTypeTotals[t.taskType].totalRevenue += t.paidAmount;
      }
    });

    return {
      totalInflow,
      tasksPaidTotal,
      paidExpensesTotal,
      pendingExpensesTotal,
      netProfit,
      profitMargin,
      totalReceivables,
      tasksPendingReceivables,
      categoryTotals,
      taskTypeTotals,
    };
  }, [expenses, tasks, subscriptionInflow, subscriptionReceivables]);

  // Filtered Expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      (e.notes || "").toLowerCase().includes(expenseSearch.toLowerCase());
    const matchesCat = expenseFilterCategory === "all" || e.category === expenseFilterCategory;
    const matchesStatus = expenseFilterStatus === "all" || e.status === expenseFilterStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  // Filtered Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.clientName.toLowerCase().includes(taskSearch.toLowerCase()) ||
      (t.notes || "").toLowerCase().includes(taskSearch.toLowerCase());
    const matchesStatus = taskFilterStatus === "all" || t.status === taskFilterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-12 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <span className="text-stone-500 text-sm font-medium">جاري تحميل المنظومة المالية والحسابات...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Wallet className="w-8 h-8" />
            </div>
            الحسابات والمصروفات وصافي الأرباح
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            إدارة تكاليف التشغيل، متابعة إيرادات المهام والتاسكات المدفوعة، واحتساب الأرباح بدقة
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              setEditingExpense(null);
              setExpenseForm({
                title: "",
                category: "server",
                amount: "",
                date: new Date().toISOString().split("T")[0],
                dueDate: "",
                recurrence: "monthly",
                status: "paid",
                notes: "",
              });
              setIsExpenseModalOpen(true);
            }}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل مصروف جديد</span>
          </button>

          <button
            onClick={() => {
              setEditingTask(null);
              setTaskForm({
                title: "",
                taskType: "paper_menu_design",
                clientName: "",
                clientId: "",
                price: "",
                paidAmount: "",
                status: "completed",
                date: new Date().toISOString().split("T")[0],
                notes: "",
              });
              setIsTaskModalOpen(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل تاسك / خدمة</span>
          </button>
        </div>
      </div>

      {/* 5 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Inflow */}
        <div className="bg-white dark:bg-[#131b26] p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                إجمالي الإيرادات المحصلة
              </p>
              <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                {financials.totalInflow.toLocaleString()} ج.م
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-stone-400 mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/80 flex justify-between">
            <span>اشتراكات: {subscriptionInflow.toLocaleString()}</span>
            <span>تاسكات: {financials.tasksPaidTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* 2. Total Outflow (Expenses) */}
        <div className="bg-white dark:bg-[#131b26] p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                إجمالي المصروفات المدفوعة
              </p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {financials.paidExpensesTotal.toLocaleString()} ج.م
              </h3>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-stone-400 mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/80">
            سيرفرات واستضافات ومرتبات وتشغيل
          </p>
        </div>

        {/* 3. Net Profit (HERO CARD) */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${
          financials.netProfit >= 0
            ? "bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/20 dark:to-[#131b26] border-emerald-200 dark:border-emerald-800/50"
            : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <BadgeDollarSign className="w-4 h-4 text-emerald-600" />
                صافي الربح الفعلي
              </p>
              <h3 className={`text-2xl font-black mt-1 ${
                financials.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}>
                {financials.netProfit.toLocaleString()} ج.م
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${
              financials.netProfit >= 0
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "bg-rose-500 text-white"
            }`}>
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="text-xs font-bold mt-3 pt-2 border-t border-emerald-200/60 dark:border-stone-800 flex justify-between text-slate-600 dark:text-slate-300">
            <span>هامش الربح:</span>
            <span className="text-emerald-600 dark:text-emerald-400">{financials.profitMargin}%</span>
          </div>
        </div>

        {/* 4. Pending Expenses (Bills to pay) */}
        <div className="bg-white dark:bg-[#131b26] p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                مصروفات مستحقة الدفع
              </p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {financials.pendingExpensesTotal.toLocaleString()} ج.م
              </h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-stone-400 mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/80">
            اشتراكات وفواتير مفروض تتدفع قريباً
          </p>
        </div>

        {/* 5. Client Receivables (Money to collect) */}
        <div className="bg-white dark:bg-[#131b26] p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                مستحقات معلقة عند العملاء
              </p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {financials.totalReceivables.toLocaleString()} ج.م
              </h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-stone-400 mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/80 flex justify-between">
            <span>اشتراكات: {subscriptionReceivables.toLocaleString()}</span>
            <span>تاسكات: {financials.tasksPendingReceivables.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/50"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>نظرة مالية وتحليل الأرباح</span>
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === "expenses"
              ? "bg-rose-600 text-white shadow-sm shadow-rose-600/20"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/50"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>المصروفات وتكاليف التشغيل ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === "tasks"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/50"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>التاسكات والخدمات المدفوعة ({tasks.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Income vs Expenses Progress Bar */}
          <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
              الميزان المالي العام (الإيرادات مقابل المصروفات)
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  إجمالي الدخل: {financials.totalInflow.toLocaleString()} ج.م (100%)
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  المصروفات: {financials.paidExpensesTotal.toLocaleString()} ج.م (
                  {financials.totalInflow > 0
                    ? Math.round((financials.paidExpensesTotal / financials.totalInflow) * 100)
                    : 0}
                  %)
                </span>
              </div>

              <div className="w-full bg-stone-100 dark:bg-[#0a0f16] rounded-xl h-7 overflow-hidden flex border border-stone-200 dark:border-stone-800 p-1">
                <div
                  className="bg-emerald-500 h-full rounded-lg transition-all duration-700 flex items-center justify-center text-[11px] font-bold text-white px-2"
                  style={{
                    width: `${
                      financials.totalInflow > 0
                        ? Math.max(10, Math.min(90, (financials.netProfit / financials.totalInflow) * 100))
                        : 50
                    }%`,
                  }}
                >
                  صافي الربح
                </div>
                <div
                  className="bg-rose-500 h-full rounded-lg transition-all duration-700 flex items-center justify-center text-[11px] font-bold text-white px-2"
                  style={{
                    width: `${
                      financials.totalInflow > 0
                        ? Math.min(90, (financials.paidExpensesTotal / financials.totalInflow) * 100)
                        : 50
                    }%`,
                  }}
                >
                  المصروفات
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Expenses Breakdown */}
            <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-rose-500" />
                  توزيع المصروفات حسب التصنيف
                </h3>
                <span className="text-xs text-stone-400 font-bold">
                  إجمالي: {financials.paidExpensesTotal.toLocaleString()} ج.م
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {(Object.keys(CATEGORY_MAP) as ExpenseCategory[]).map((cat) => {
                  const catData = CATEGORY_MAP[cat];
                  const Icon = catData.icon;
                  const catAmount = financials.categoryTotals[cat] || 0;
                  const pct =
                    financials.paidExpensesTotal > 0
                      ? Math.round((catAmount / financials.paidExpensesTotal) * 100)
                      : 0;

                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                          <Icon className={`w-4 h-4 ${catData.color}`} />
                          {catData.label}
                        </span>
                        <span className="text-stone-900 dark:text-white">
                          {catAmount.toLocaleString()} ج.م ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 dark:bg-[#0a0f16] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            cat === "server"
                              ? "bg-blue-500"
                              : cat === "salary"
                              ? "bg-amber-500"
                              : cat === "service"
                              ? "bg-cyan-500"
                              : cat === "domain"
                              ? "bg-purple-500"
                              : cat === "marketing"
                              ? "bg-pink-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Revenue Breakdown */}
            <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-500" />
                  أرباح التاسكات والخدمات المدفوعة
                </h3>
                <span className="text-xs text-stone-400 font-bold">
                  إجمالي: {financials.tasksPaidTotal.toLocaleString()} ج.م
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {(Object.keys(TASK_TYPE_MAP) as TaskType[]).map((type) => {
                  const typeData = TASK_TYPE_MAP[type];
                  const info = financials.taskTypeTotals[type];
                  const pct =
                    financials.tasksPaidTotal > 0
                      ? Math.round((info.totalRevenue / financials.tasksPaidTotal) * 100)
                      : 0;

                  return (
                    <div
                      key={type}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-[#0a0f16] border border-stone-100 dark:border-stone-800/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg border ${typeData.bgColor}`}>
                          <typeData.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-stone-800 dark:text-white block">
                            {typeData.label}
                          </span>
                          <div className="text-stone-400 text-[11px] mt-0.5">{info.count} مهمة مسجلة</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {info.totalRevenue.toLocaleString()} ج.م
                        </span>
                        <div className="text-stone-400 text-[10px]">{pct}% من إيراد الخدمات</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSES TABLE */}
      {activeTab === "expenses" && (
        <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden space-y-4">
          {/* Filter & Search */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="البحث في المصروفات..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <select
                value={expenseFilterCategory}
                onChange={(e) => setExpenseFilterCategory(e.target.value)}
                className="px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-300 outline-none"
              >
                <option value="all">كل التصنيفات</option>
                {(Object.keys(CATEGORY_MAP) as ExpenseCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_MAP[c].label}
                  </option>
                ))}
              </select>

              <select
                value={expenseFilterStatus}
                onChange={(e) => setExpenseFilterStatus(e.target.value)}
                className="px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-300 outline-none"
              >
                <option value="all">كل الحالات</option>
                <option value="paid">مدفوع بالفعل ✓</option>
                <option value="pending">مستحق الدفع (معلق) ⏳</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-stone-50 dark:bg-[#0a0f16] text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="px-5 py-4 font-bold">المصروف / البند</th>
                  <th className="px-5 py-4 font-bold">التصنيف</th>
                  <th className="px-5 py-4 font-bold">المبلغ</th>
                  <th className="px-5 py-4 font-bold">التكرار</th>
                  <th className="px-5 py-4 font-bold">التاريخ / الاستحقاق</th>
                  <th className="px-5 py-4 font-bold">الحالة</th>
                  <th className="px-5 py-4 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-stone-400">
                      لا توجد مصروفات مسجلة مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const cat = CATEGORY_MAP[exp.category];
                    const Icon = cat.icon;
                    return (
                      <tr key={exp.id} className="hover:bg-stone-50 dark:hover:bg-[#0a0f16]/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-stone-900 dark:text-white">{exp.title}</div>
                          {exp.notes && <div className="text-xs text-stone-400 mt-0.5">{exp.notes}</div>}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${cat.bgColor} ${cat.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {cat.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-black text-rose-600 dark:text-rose-400 text-base">
                          {exp.amount.toLocaleString()} ج.م
                        </td>

                        <td className="px-5 py-4 text-xs font-medium text-stone-500">
                          {exp.recurrence === "monthly" ? "شهري متكرر" : exp.recurrence === "yearly" ? "سنوي متكرر" : "دفعة لمرة واحدة"}
                        </td>

                        <td className="px-5 py-4 text-xs text-stone-500">
                          <div>صرف: {exp.date}</div>
                          {exp.dueDate && <div className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">استحقاق: {exp.dueDate}</div>}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleToggleExpenseStatus(exp)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                              exp.status === "paid"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                            }`}
                          >
                            {exp.status === "paid" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            {exp.status === "paid" ? "مدفوع بالفعل" : "مستحق الدفع"}
                          </button>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingExpense(exp);
                                setExpenseForm({
                                  title: exp.title,
                                  category: exp.category,
                                  amount: String(exp.amount),
                                  date: exp.date,
                                  dueDate: exp.dueDate || "",
                                  recurrence: exp.recurrence,
                                  status: exp.status,
                                  notes: exp.notes || "",
                                });
                                setIsExpenseModalOpen(true);
                              }}
                              className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
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
      )}

      {/* TAB 3: TASKS TABLE */}
      {activeTab === "tasks" && (
        <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden space-y-4">
          {/* Filter & Search */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="البحث في التاسكات والعملاء..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={taskFilterStatus}
                onChange={(e) => setTaskFilterStatus(e.target.value)}
                className="px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-300 outline-none"
              >
                <option value="all">كل حالات التنفيذ</option>
                <option value="completed">مكتملة ومسلمة ✓</option>
                <option value="in_progress">قيد التنفيذ ⏳</option>
                <option value="pending">معلقة</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-stone-50 dark:bg-[#0a0f16] text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="px-5 py-4 font-bold">المهمة / الخدمة</th>
                  <th className="px-5 py-4 font-bold">العميل</th>
                  <th className="px-5 py-4 font-bold">نوع المهمة</th>
                  <th className="px-5 py-4 font-bold">القيمة المطلوبة</th>
                  <th className="px-5 py-4 font-bold">المدفوع</th>
                  <th className="px-5 py-4 font-bold">المتبقي</th>
                  <th className="px-5 py-4 font-bold">حالة التنفيذ</th>
                  <th className="px-5 py-4 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-stone-400">
                      لا توجد مهام أو خدمات مسجلة مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const typeConfig = TASK_TYPE_MAP[t.taskType];
                    const remaining = Math.max(0, t.price - t.paidAmount);

                    return (
                      <tr key={t.id} className="hover:bg-stone-50 dark:hover:bg-[#0a0f16]/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-stone-900 dark:text-white">{t.title}</div>
                          <div className="text-xs text-stone-400 mt-0.5">{t.date}</div>
                        </td>

                        <td className="px-5 py-4 font-bold text-stone-800 dark:text-white">
                          {t.clientName}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${typeConfig.bgColor}`}>
                            <typeConfig.icon className="w-3.5 h-3.5" />
                            {typeConfig.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-bold text-stone-900 dark:text-white">
                          {t.price.toLocaleString()} ج.م
                        </td>

                        <td className="px-5 py-4 font-black text-emerald-600 dark:text-emerald-400">
                          {t.paidAmount.toLocaleString()} ج.م
                        </td>

                        <td className="px-5 py-4">
                          {remaining > 0 ? (
                            <span className="font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded text-xs">
                              باقي: {remaining.toLocaleString()} ج.م
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              خالص بالكامل ✓
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            t.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : t.status === "in_progress"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                              : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                          }`}>
                            {t.status === "completed" ? "مكتملة ✓" : t.status === "in_progress" ? "قيد التنفيذ ⏳" : "معلقة"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {remaining > 0 && (
                              <button
                                onClick={() => handlePayTaskFull(t)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                title="تسديد المتبقي بنقرة واحدة"
                              >
                                سداد المتبقي
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingTask(t);
                                setTaskForm({
                                  title: t.title,
                                  taskType: t.taskType,
                                  clientName: t.clientName,
                                  clientId: t.clientId || "",
                                  price: String(t.price),
                                  paidAmount: String(t.paidAmount),
                                  status: t.status,
                                  date: t.date,
                                  notes: t.notes || "",
                                });
                                setIsTaskModalOpen(true);
                              }}
                              className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
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
      )}

      {/* MODAL 1: ADD / EDIT EXPENSE */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-white">
                    {editingExpense ? "تعديل بيانات المصروف" : "تسجيل مصروف جديد"}
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">تكاليف السيرفرات والتشغيل والخدمات</p>
                </div>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  اسم / بيان المصروف *
                </label>
                <input
                  type="text"
                  placeholder="مثال: تجديد سيرفر Hetzner، اشتراك Supabase Pro، راتب مطور..."
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    تصنيف المصروف *
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white outline-none"
                  >
                    {(Object.keys(CATEGORY_MAP) as ExpenseCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_MAP[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    المبلغ (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="مثال: 750"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    التكرار
                  </label>
                  <select
                    value={expenseForm.recurrence}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recurrence: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white outline-none"
                  >
                    <option value="monthly">شهري متكرر</option>
                    <option value="yearly">سنوي متكرر</option>
                    <option value="once">دفعة لمرة واحدة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    حالة السداد
                  </label>
                  <select
                    value={expenseForm.status}
                    onChange={(e) => setExpenseForm({ ...expenseForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white outline-none"
                  >
                    <option value="paid">مدفوع بالفعل ✓</option>
                    <option value="pending">مستحق الدفع (مفروض يتدفع) ⏳</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    تاريخ الصرف
                  </label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    تاريخ الاستحقاق (اختياري)
                  </label>
                  <input
                    type="date"
                    value={expenseForm.dueDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  ملاحظات
                </label>
                <input
                  type="text"
                  placeholder="رقم الفاتورة، طريقة الدفع..."
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveExpense}
                disabled={savingData}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {savingData ? "جاري الحفظ..." : "حفظ المصروف"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT TASK */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-white">
                    {editingTask ? "تعديل بيانات المهمة / الخدمة" : "تسجيل تاسك / خدمة جديدة"}
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">تطوير وتخصيصات مدفوعة للعملاء</p>
                </div>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  عنوان المهمة / نوع الخدمة *
                </label>
                <input
                  type="text"
                  placeholder="مثال: تعديل وتخصيص ثيم Vicino، ربط دومين خاص، تصميم منيو..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    نوع التاسك *
                  </label>
                  <select
                    value={taskForm.taskType}
                    onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value as TaskType })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white outline-none"
                  >
                    {(Object.keys(TASK_TYPE_MAP) as TaskType[]).map((type) => (
                      <option key={type} value={type}>
                        {TASK_TYPE_MAP[type].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    العميل *
                  </label>
                  <input
                    type="text"
                    list="clients-list"
                    placeholder="اختر أو اكتب اسم العميل..."
                    value={taskForm.clientName}
                    onChange={(e) => setTaskForm({ ...taskForm, clientName: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white"
                  />
                  <datalist id="clients-list">
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    القيمة المطلوبة (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="مثال: 1500"
                    value={taskForm.price}
                    onChange={(e) => setTaskForm({ ...taskForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    المدفوع حتى الآن (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="مثال: 1000"
                    value={taskForm.paidAmount}
                    onChange={(e) => setTaskForm({ ...taskForm, paidAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Dynamic Task Preview */}
              {Number(taskForm.price) > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl text-xs flex justify-between items-center">
                  <span>
                    المتبقي على العميل:{" "}
                    <strong className="text-amber-600 dark:text-amber-400">
                      {Math.max(0, Number(taskForm.price) - (Number(taskForm.paidAmount) || 0)).toLocaleString()} ج.م
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setTaskForm({ ...taskForm, paidAmount: taskForm.price })}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    سداد كامل المبلغ
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    حالة التنفيذ
                  </label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white outline-none"
                  >
                    <option value="completed">مكتملة ومسلمة ✓</option>
                    <option value="in_progress">قيد التنفيذ ⏳</option>
                    <option value="pending">معلقة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    تاريخ المهمة
                  </label>
                  <input
                    type="date"
                    value={taskForm.date}
                    onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  ملاحظات وتفاصيل
                </label>
                <input
                  type="text"
                  placeholder="تفاصيل التعديل أو المتطلبات..."
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveTask}
                disabled={savingData}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {savingData ? "جاري الحفظ..." : "حفظ المهمة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
