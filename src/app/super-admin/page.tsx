"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  CreditCard,
  Activity,
  GitBranch,
  DollarSign,
  Clock,
  Crown,
  CalendarDays,
} from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  email: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [branchCount, setBranchCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all restaurants (clients) with subscription info
        const { data: restData } = await supabase
          .from("restaurants")
          .select("id, name, email, subscription_plan, subscription_expires_at, created_at")
          .order("created_at", { ascending: false });

        // Fetch branches count
        const { count: branches } = await supabase
          .from("branches")
          .select("id", { count: "exact", head: true });

        // Fetch subscription plans prices
        const { data: plans } = await supabase
          .from("subscription_plans")
          .select("plan_name, price");

        // Fetch recent activity
        const { data: activityData } = await supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        const priceMap: Record<string, number> = {};
        if (plans) {
          plans.forEach((p: any) => {
            priceMap[p.plan_name] = p.price || 0;
          });
        }

        setRestaurants(restData || []);
        setBranchCount(branches || 0);
        setPlanPrices(priceMap);
        setRecentActivity(activityData || []);
      } catch (error) {
        console.error("Error fetching super admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats from restaurants data
  const totalClients = restaurants.length;

  const activeClients = restaurants.filter((r) => {
    if (r.subscription_plan === "lifetime") return true;
    if (!r.subscription_expires_at) return false;
    return new Date(r.subscription_expires_at) > new Date();
  }).length;

  const expiredClients = restaurants.filter((r) => {
    if (r.subscription_plan === "lifetime") return false;
    if (!r.subscription_expires_at) return true;
    return new Date(r.subscription_expires_at) <= new Date();
  }).length;

  // Price calculation considering client-specific price and custom plan
  const getClientPrice = (r: Restaurant) => {
    const clientCustomKey = `client_price_${r.id}`;
    if (clientCustomKey in planPrices) {
      return planPrices[clientCustomKey];
    }
    const plan = r.subscription_plan || "free";
    if (plan === "custom" && r.subscription_expires_at) {
      const monthlyPrice = planPrices["monthly"] || 0;
      if (monthlyPrice > 0) {
        const dailyRate = monthlyPrice / 30;
        const start = new Date(r.created_at);
        const end = new Date(r.subscription_expires_at);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return Math.round(dailyRate * days);
      }
    }
    return planPrices[plan] || 0;
  };

  // Active revenue excludes expired subscriptions completely (0 EGP if expired)
  const totalActiveRevenue = restaurants.reduce((sum, r) => {
    const isLifetime = r.subscription_plan === "lifetime";
    const isExpired = !isLifetime && (!r.subscription_expires_at || new Date(r.subscription_expires_at) <= new Date());
    if (isExpired) return sum; // Expired = 0 EGP
    return sum + getClientPrice(r);
  }, 0);

  const getSubLabel = (plan: string | null) => {
    if (!plan || plan === "Free" || plan === "free") return "مجاني";
    if (plan === "monthly") return "شهري";
    if (plan === "semi_annual" || plan === "semi-annual") return "نصف سنوي";
    if (plan === "yearly") return "سنوي";
    if (plan === "lifetime") return "مدى الحياة";
    if (plan === "custom") return "مخصص";
    return plan;
  };

  const getStatusInfo = (r: Restaurant) => {
    if (r.subscription_plan === "lifetime")
      return { label: "مدى الحياة", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" };
    if (!r.subscription_expires_at)
      return { label: "غير محدد", color: "bg-stone-100 text-stone-600 dark:bg-stone-500/10 dark:text-stone-400" };
    const daysLeft = Math.ceil(
      (new Date(r.subscription_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 0)
      return { label: "منتهي", color: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" };
    if (daysLeft <= 7)
      return { label: `${daysLeft} يوم متبقي`, color: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" };
    return { label: `${daysLeft} يوم متبقي`, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" };
  };

  const calculatePercentage = (count: number) => {
    if (totalClients === 0) return 0;
    return Math.round((count / totalClients) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" dir="rtl">
        <div>
          <div className="h-8 w-48 bg-stone-200 dark:bg-stone-800 rounded mb-2"></div>
          <div className="h-4 w-64 bg-stone-200 dark:bg-stone-800 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  // Recent clients (last 5)
  const recentClients = restaurants.slice(0, 5);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">نظرة عامة على المنصة</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">لوحة تحكم السوبر أدمن</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500 dark:text-stone-400">إجمالي العملاء</p>
              <h3 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">{totalClients}</h3>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500 dark:text-stone-400">الاشتراكات النشطة</p>
              <h3 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">{activeClients}</h3>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500 dark:text-stone-400">إجمالي الفروع</p>
              <h3 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">{branchCount}</h3>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <GitBranch className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500 dark:text-stone-400">الإيرادات النشطة</p>
              <h3 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">{totalActiveRevenue.toLocaleString()} ج.م</h3>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Clients with Subscriptions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-4">آخر العملاء والاشتراكات</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400">
                    <th className="pb-3 font-medium px-4">العميل</th>
                    <th className="pb-3 font-medium px-4">الباقة</th>
                    <th className="pb-3 font-medium px-4">الحالة</th>
                    <th className="pb-3 font-medium px-4">تاريخ الانضمام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {recentClients.map((r) => {
                    const status = getStatusInfo(r);
                    return (
                      <tr key={r.id} className="text-stone-700 dark:text-stone-300">
                        <td className="py-3 px-4 font-medium text-stone-900 dark:text-white">{r.name}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1">
                            {r.subscription_plan === "lifetime" && <Crown className="w-3 h-3 text-purple-500" />}
                            {getSubLabel(r.subscription_plan)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {new Date(r.created_at).toLocaleDateString("ar-EG")}
                        </td>
                      </tr>
                    );
                  })}
                  {recentClients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-stone-500">لا يوجد عملاء</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-4">أحدث النشاطات</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={activity.id || i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-white">
                      {activity.action || "-"}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                      {activity.description || ""}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{activity.created_at ? new Date(activity.created_at).toLocaleString("ar-EG") : "-"}</span>
                    </div>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-center text-sm text-stone-500 py-4">لا توجد نشاطات حديثة</p>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Distribution */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-6">توزيع الاشتراكات</h2>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-stone-700 dark:text-stone-300">نشطة</span>
                  <span className="text-stone-500">{activeClients} ({calculatePercentage(activeClients)}%)</span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-700"
                    style={{ width: `${calculatePercentage(activeClients)}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-stone-700 dark:text-stone-300">منتهية</span>
                  <span className="text-stone-500">{expiredClients} ({calculatePercentage(expiredClients)}%)</span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full transition-all duration-700"
                    style={{ width: `${calculatePercentage(expiredClients)}%` }}></div>
                </div>
              </div>
            </div>

            {/* Plan distribution */}
            <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 mt-6 mb-3">حسب نوع الباقة</h3>
            <div className="space-y-2">
              {(() => {
                const planCounts: Record<string, number> = {};
                restaurants.forEach((r) => {
                  const plan = r.subscription_plan || "free";
                  planCounts[plan] = (planCounts[plan] || 0) + 1;
                });
                return Object.entries(planCounts).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between text-sm">
                    <span className="text-stone-600 dark:text-stone-400">{getSubLabel(plan)}</span>
                    <span className="font-bold text-stone-900 dark:text-white">{count}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
