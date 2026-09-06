'use client';

import { supabase } from '@/lib/supabase/client';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  CreditCard,
  GitBranch,
  Award,
  Search,
  Crown,
  Sparkles,
  CheckCircle2,
  XCircle,
  Receipt,
  Wallet,
  Clock,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

interface Restaurant {
  id: string;
  name: string;
  email: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  created_at: string;
}

const subTypeMap: Record<string, string> = {
  monthly: 'شهري',
  semi_annual: 'نصف سنوي',
  'semi-annual': 'نصف سنوي',
  yearly: 'سنوي',
  lifetime: 'مدى الحياة',
  custom: 'مخصص',
  free: 'مجاني',
  Free: 'مجاني',
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
  const [clientPayments, setClientPayments] = useState<Record<string, number>>({});
  const [branchCount, setBranchCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [
        { data: restData, error: restError },
        { data: plansData, error: plansError },
        { count: branches, error: branchError },
      ] = await Promise.all([
        supabase
          .from('restaurants')
          .select('id, name, email, subscription_plan, subscription_expires_at, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('subscription_plans')
          .select('plan_name, price, features'),
        supabase
          .from('branches')
          .select('id', { count: 'exact', head: true }),
      ]);

      if (restError) throw restError;
      if (plansError) throw plansError;

      const priceMap: Record<string, number> = {};
      const paymentsMap: Record<string, number> = {};

      if (plansData) {
        plansData.forEach((p: any) => {
          const pName = p.plan_name as string;
          if (pName.startsWith('client_payments_')) {
            const clientId = pName.replace('client_payments_', '');
            paymentsMap[clientId] = Number(p.price) || 0;
          } else {
            priceMap[pName] = Number(p.price) || 0;
          }
        });
      }

      setRestaurants(restData || []);
      setPlanPrices(priceMap);
      setClientPayments(paymentsMap);
      setBranchCount(branches || 0);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error('حدث خطأ أثناء جلب بيانات التحليلات');
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (r: Restaurant) => {
    if (r.subscription_plan === 'lifetime') return 'active';
    if (!r.subscription_expires_at) return 'none';
    return new Date(r.subscription_expires_at) > new Date() ? 'active' : 'expired';
  };

  const getClientPriceInfo = (r: Restaurant) => {
    const clientCustomKey = `client_price_${r.id}`;
    if (clientCustomKey in planPrices) {
      return {
        price: planPrices[clientCustomKey],
        isCustom: true,
      };
    }

    const plan = r.subscription_plan || 'free';

    if (plan === 'custom' && r.subscription_expires_at) {
      const monthlyPrice = planPrices['monthly'] || 0;
      if (monthlyPrice > 0) {
        const dailyRate = monthlyPrice / 30;
        const start = new Date(r.created_at);
        const end = new Date(r.subscription_expires_at);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          price: Math.round(dailyRate * days),
          isCustom: false,
        };
      }
    }

    return {
      price: planPrices[plan] || 0,
      isCustom: false,
    };
  };

  // Process all analytics with payment & debt calculations
  const analytics = useMemo(() => {
    const totalClients = restaurants.length;

    let activeCount = 0;
    let expiredCount = 0;
    let noneCount = 0;

    let totalActiveRevenue = 0;
    let totalCollectedCash = 0;
    let totalOutstandingDebt = 0;
    let clientsWithDebtCount = 0;

    const planDist: Record<string, { count: number; activeRevenue: number; totalCollected: number }> = {};
    const typeCounts: Record<string, number> = { monthly: 0, yearly: 0, semi_annual: 0, lifetime: 0, free: 0, custom: 0 };
    const clientFinancials: {
      name: string;
      plan: string;
      required: number;
      paid: number;
      remaining: number;
      activeRevenue: number;
      isExpired: boolean;
      isCustom: boolean;
    }[] = [];

    restaurants.forEach((r) => {
      const status = getStatus(r);
      const isExpired = status === 'expired' || status === 'none';
      const { price, isCustom } = getClientPriceInfo(r);
      const plan = r.subscription_plan || 'free';

      if (status === 'active') activeCount++;
      else if (status === 'expired') expiredCount++;
      else noneCount++;

      if (plan in typeCounts) typeCounts[plan]++;
      else if (plan === 'semi-annual') typeCounts.semi_annual++;
      else typeCounts.free++;

      // Paid vs Remaining
      const required = price;
      let paid = 0;
      if (clientPayments[r.id] !== undefined) {
        paid = clientPayments[r.id];
      } else {
        paid = 0;
      }

      const remaining = Math.max(0, required - paid);
      if (remaining > 0) clientsWithDebtCount++;

      totalCollectedCash += paid;
      totalOutstandingDebt += remaining;

      // Active revenue: Strictly 0 if expired!
      const currentActiveRev = isExpired ? 0 : paid;
      totalActiveRevenue += currentActiveRev;

      // Plan distribution
      if (!planDist[plan]) {
        planDist[plan] = { count: 0, activeRevenue: 0, totalCollected: 0 };
      }
      planDist[plan].count++;
      planDist[plan].activeRevenue += currentActiveRev;
      planDist[plan].totalCollected += paid;

      clientFinancials.push({
        name: r.name,
        plan,
        required,
        paid,
        remaining,
        activeRevenue: currentActiveRev,
        isExpired,
        isCustom,
      });
    });

    const avgActiveRevenue = activeCount > 0 ? totalActiveRevenue / activeCount : 0;

    const topClients = [...clientFinancials]
      .sort((a, b) => b.paid - a.paid)
      .filter((c) => c.paid > 0)
      .slice(0, 10);

    const revenueByPlan = Object.entries(planDist)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.activeRevenue - a.activeRevenue);

    return {
      totalClients,
      activeCount,
      expiredCount,
      noneCount,
      totalActiveRevenue,
      totalCollectedCash,
      totalOutstandingDebt,
      clientsWithDebtCount,
      avgActiveRevenue,
      typeCounts,
      topClients,
      revenueByPlan,
      clientFinancials,
    };
  }, [restaurants, planPrices, clientPayments]);

  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.subscription_plan || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pct = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-emerald-500" />
          التحليلات الشاملة للاشتراكات والإيرادات
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          تحليل مالي مفصل: الدفعات المحصلة، المتبقي من الاشتراكات، واستبعاد الاشتراكات المنتهية
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="إجمالي العملاء"
          value={analytics.totalClients}
          icon={<Users className="w-5 h-5" />}
          color="bg-blue-500/10 text-blue-500"
        />
        <KpiCard
          title="الاشتراكات النشطة"
          value={analytics.activeCount}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <KpiCard
          title="الإيراد النشط الجاري"
          value={analytics.totalActiveRevenue}
          isCurrency
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-emerald-500/10 text-emerald-500"
          subtitle="المنتهي = 0 ج.م"
        />
        <KpiCard
          title="إجمالي المدفوع الفعلي"
          value={analytics.totalCollectedCash}
          isCurrency
          icon={<Wallet className="w-5 h-5" />}
          color="bg-blue-500/10 text-blue-500"
          subtitle="كاش محصل"
        />
        <KpiCard
          title="المتبقي (مستحقات)"
          value={analytics.totalOutstandingDebt}
          isCurrency
          icon={<Receipt className="w-5 h-5" />}
          color="bg-amber-500/10 text-amber-500"
          subtitle={`${analytics.clientsWithDebtCount} عميل عليه متبقي`}
        />
        <KpiCard
          title="اشتراكات منتهية"
          value={analytics.expiredCount}
          icon={<XCircle className="w-5 h-5" />}
          color="bg-rose-500/10 text-rose-500"
          subtitle="غير محسوبة بالإيراد"
        />
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">
            توزيع العملاء حسب حالة الاشتراك
          </h2>
          <div className="space-y-4">
            <ProgressBar
              label="نشط (يدر إيراداً حالياً)"
              count={analytics.activeCount}
              percentage={pct(analytics.activeCount, analytics.totalClients)}
              colorClass="bg-emerald-500"
            />
            <ProgressBar
              label="منتهي (0 ج.م إيراد نشط)"
              count={analytics.expiredCount}
              percentage={pct(analytics.expiredCount, analytics.totalClients)}
              colorClass="bg-rose-500"
            />
            <ProgressBar
              label="غير محدد / مجاني"
              count={analytics.noneCount}
              percentage={pct(analytics.noneCount, analytics.totalClients)}
              colorClass="bg-stone-400"
            />
            <div className="pt-4 mt-4 border-t border-stone-200 dark:border-stone-800 text-sm font-medium text-slate-500 dark:text-slate-400 flex justify-between">
              <span>الإجمالي</span>
              <span>{analytics.totalClients} عميل</span>
            </div>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">
            توزيع العملاء حسب نوع الباقة
          </h2>
          <div className="space-y-4">
            <ProgressBar
              label="شهري"
              count={analytics.typeCounts.monthly}
              percentage={pct(analytics.typeCounts.monthly, analytics.totalClients)}
              colorClass="bg-blue-500"
            />
            <ProgressBar
              label="سنوي"
              count={analytics.typeCounts.yearly}
              percentage={pct(analytics.typeCounts.yearly, analytics.totalClients)}
              colorClass="bg-purple-500"
            />
            <ProgressBar
              label="نصف سنوي"
              count={analytics.typeCounts.semi_annual}
              percentage={pct(analytics.typeCounts.semi_annual, analytics.totalClients)}
              colorClass="bg-indigo-500"
            />
            <ProgressBar
              label="مدى الحياة"
              count={analytics.typeCounts.lifetime}
              percentage={pct(analytics.typeCounts.lifetime, analytics.totalClients)}
              colorClass="bg-amber-500"
            />
            <ProgressBar
              label="مجاني"
              count={analytics.typeCounts.free}
              percentage={pct(analytics.typeCounts.free, analytics.totalClients)}
              colorClass="bg-stone-400"
            />
          </div>
        </div>
      </div>

      {/* Revenue by Plan & Top Spenders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">
            الإيراد النشط والتحصيلات حسب الباقة
          </h2>
          <div className="space-y-4">
            {analytics.revenueByPlan.map((plan, idx) => {
              const maxRev = Math.max(...analytics.revenueByPlan.map((p) => p.activeRevenue), 1);
              const percentage = pct(plan.activeRevenue, maxRev);
              return (
                <div key={idx} className="bg-slate-50 dark:bg-[#0a0f16] p-4 rounded-xl border border-stone-100 dark:border-stone-800/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                      {plan.name === 'lifetime' && <Crown className="w-3.5 h-3.5 text-purple-500" />}
                      {subTypeMap[plan.name] || plan.name}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">
                      {plan.activeRevenue.toLocaleString()} ج.م نشط
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>{plan.count} عميل مسجل</span>
                    <span>إجمالي المحصل: {plan.totalCollected.toLocaleString()} ج.م</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Spenders */}
        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">
            أعلى العملاء من حيث إجمالي المدفوع
          </h2>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800">
                  <th className="pb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">#</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">العميل</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">الباقة</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">المدفوع</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topClients.map((client, idx) => (
                  <tr key={idx} className="border-b border-stone-100 dark:border-stone-800/50 last:border-0">
                    <td className="py-3">
                      <span
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-600'
                            : idx === 1
                            ? 'bg-slate-100 text-slate-600'
                            : idx === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-800 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        {client.name}
                        {client.isCustom && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 px-1 py-0.2 rounded font-bold">
                            خاص
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-xs text-slate-500 dark:text-slate-400">
                      {subTypeMap[client.plan] || client.plan}
                    </td>
                    <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {client.paid.toLocaleString()} ج.م
                    </td>
                    <td className="py-3 text-xs">
                      {client.remaining > 0 ? (
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {client.remaining.toLocaleString()} ج.م
                        </span>
                      ) : (
                        <span className="text-slate-400">خالص</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Full Table */}
      <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              تفاصيل حسابات العملاء والدفعات والمتبقي
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              يوضح المطلوب، المدفوع، والمتبقي على كل عميل بالتفصيل
            </p>
          </div>
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="البحث عن عميل أو باقة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-white placeholder-slate-400 text-sm"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 bg-slate-50 dark:bg-[#0a0f16]">
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">العميل</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">نوع الباقة</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">المطلوب</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">المدفوع</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">المتبقي</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">الحالة</th>
                <th className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">تاريخ الانتهاء</th>
              </tr>
            </thead>
            <tbody>
              {filteredRestaurants.map((r) => {
                const status = getStatus(r);
                const isExpired = status === 'expired' || status === 'none';
                const { price, isCustom } = getClientPriceInfo(r);
                const required = price;

                let paid = 0;
                if (clientPayments[r.id] !== undefined) {
                  paid = clientPayments[r.id];
                } else {
                  paid = 0;
                }

                const remaining = Math.max(0, required - paid);

                return (
                  <tr
                    key={r.id}
                    className="border-b border-stone-100 dark:border-stone-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-[#0a0f16]/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        {r.name}
                        {isCustom && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> مخصص
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-normal">{r.email || 'بدون بريد'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {subTypeMap[r.subscription_plan || 'free'] || r.subscription_plan || 'مجاني'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {required > 0 ? `${required.toLocaleString()} ج.م` : 'مجاني'}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {paid.toLocaleString()} ج.م
                    </td>
                    <td className="py-3 px-4 font-bold">
                      {remaining > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded text-xs">
                          {remaining.toLocaleString()} ج.م
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-normal">خالص</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : status === 'expired'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                            : 'bg-stone-100 text-stone-600 dark:bg-stone-900/30 dark:text-stone-400'
                        }`}
                      >
                        {status === 'active' ? 'نشط' : status === 'expired' ? 'منتهي' : 'غير محدد'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                      {r.subscription_plan === 'lifetime'
                        ? 'مدى الحياة'
                        : r.subscription_expires_at
                        ? new Date(r.subscription_expires_at).toLocaleDateString('ar-EG')
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  color,
  isCurrency = false,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  isCurrency?: boolean;
  subtitle?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#131b26] p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-2 rounded-xl flex-shrink-0 ${color}`}>{icon}</div>
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-1">{title}</h3>
        </div>
        <div className="text-xl font-black text-slate-800 dark:text-white mt-1">
          {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          {isCurrency && <span className="text-xs font-semibold text-slate-400 mr-1">ج.م</span>}
        </div>
      </div>
      {subtitle && <p className="text-[10px] text-slate-400 mt-2 font-medium">{subtitle}</p>}
    </div>
  );
}

function ProgressBar({
  label,
  count,
  percentage,
  colorClass,
}: {
  label: string;
  count: number;
  percentage: number;
  colorClass: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <div className="text-slate-500 dark:text-slate-400 space-x-2 space-x-reverse">
          <span className="font-semibold text-slate-800 dark:text-white">{count}</span>
          <span>({percentage}%)</span>
        </div>
      </div>
      <div className="w-full bg-slate-100 dark:bg-[#0a0f16] rounded-lg h-6 md:h-7 border border-stone-100 dark:border-stone-800/50 overflow-hidden">
        <div
          className={`h-full rounded-lg transition-all duration-700 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
