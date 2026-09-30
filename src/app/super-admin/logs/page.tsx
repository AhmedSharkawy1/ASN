"use client";

import { supabase } from '@/lib/supabase/client';
import {
  Activity, Clock, Search, AlertCircle, Shield, Filter, Calendar,
  Hash, RefreshCw, Download, Building2, Database, Layers, CheckCircle2,
  FileText, ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect, useCallback, useMemo } from 'react';

interface ActivityLog {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  description: string | null;
  created_at: string;
  restaurants?: { name: string } | null;
}

interface RestaurantOption {
  id: string;
  name: string;
}

function getRelativeTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 0) return 'الآن';
    if (diffInSeconds < 60) return 'الآن';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `منذ ${diffInDays} يوم`;

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `منذ ${diffInMonths} شهر`;

    return `منذ ${Math.floor(diffInMonths / 12)} سنة`;
  } catch {
    return '-';
  }
}

function getActionIcon(action: string, targetType: string | null) {
  const act = action.toLowerCase();
  const type = (targetType || '').toLowerCase();

  if (act.includes('login') || act.includes('auth') || act.includes('دخول') || type === 'auth') {
    return <Shield className="w-4 h-4 text-indigo-500" />;
  }
  if (act.includes('backup') || act.includes('نسخ') || act.includes('استعادة') || type === 'backup') {
    return <Database className="w-4 h-4 text-amber-500" />;
  }
  if (type === 'client' || act.includes('عميل') || act.includes('مطعم')) {
    return <Building2 className="w-4 h-4 text-blue-500" />;
  }
  if (type === 'plan' || act.includes('خطة') || act.includes('باقة')) {
    return <Layers className="w-4 h-4 text-purple-500" />;
  }
  if (act.includes('delete') || act.includes('حذف')) {
    return <AlertCircle className="w-4 h-4 text-rose-500" />;
  }
  return <Activity className="w-4 h-4 text-emerald-500" />;
}

function getTargetBadge(targetType: string | null) {
  switch (targetType) {
    case 'client':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">عميل</span>;
    case 'backup':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">نسخة احتياطية</span>;
    case 'plan':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">باقة</span>;
    case 'auth':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">أمان</span>;
    case 'settings':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">إعدادات</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">نظام</span>;
  }
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('الكل');
  const [filterRestaurant, setFilterRestaurant] = useState('الكل');
  const [displayLimit, setDisplayLimit] = useState(50);

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Try fetching via client Supabase with joined restaurant name
      let fetchedLogs: ActivityLog[] = [];

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, restaurants(name)')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && data) {
        fetchedLogs = data as ActivityLog[];
      } else {
        // Fallback to API route only if direct client query failed (e.g. RLS blocked)
        const apiRes = await fetch('/api/admin/logs?limit=300');
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.success && json.logs) {
            fetchedLogs = json.logs;
          }
        }
      }

      setLogs(fetchedLogs);

      // Collect unique restaurants from logs for quick filtering
      const restMap = new Map<string, string>();
      fetchedLogs.forEach((l) => {
        if (l.tenant_id && l.restaurants?.name) {
          restMap.set(l.tenant_id, l.restaurants.name);
        }
      });
      setRestaurants(
        Array.from(restMap.entries()).map(([id, name]) => ({ id, name }))
      );

      if (isSilent) {
        toast.success('تم تحديث السجلات بنجاح');
      }
    } catch (err: any) {
      console.error('[ActivityLogsPage] Fetch error:', err);
      toast.error('حدث خطأ أثناء جلب سجلات النشاط');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const restaurantName = log.restaurants?.name || '';
      const matchesSearch =
        !searchQuery ||
        (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.description && log.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        restaurantName.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesAction = true;
      if (filterAction !== 'الكل') {
        const act = (log.action || '').toLowerCase();
        const type = (log.target_type || '').toLowerCase();

        if (filterAction === 'إنشاء') {
          matchesAction = act.includes('إنشاء') || act.includes('create') || act.includes('إضافة');
        } else if (filterAction === 'تعديل') {
          matchesAction = act.includes('تعديل') || act.includes('update') || act.includes('تحديث');
        } else if (filterAction === 'حذف') {
          matchesAction = act.includes('حذف') || act.includes('delete');
        } else if (filterAction === 'تسجيل دخول') {
          matchesAction = act.includes('دخول') || act.includes('login') || type === 'auth';
        } else if (filterAction === 'نسخ احتياطي') {
          matchesAction = act.includes('نسخ') || act.includes('backup') || act.includes('استعادة') || type === 'backup';
        } else if (filterAction === 'الباقات') {
          matchesAction = act.includes('خطة') || act.includes('باقة') || act.includes('اشتراك') || type === 'plan';
        } else if (filterAction === 'أخرى') {
          matchesAction = !['إنشاء', 'تعديل', 'حذف', 'دخول', 'نسخ', 'باقة', 'اشتراك'].some((k) =>
            act.includes(k)
          );
        }
      }

      let matchesRestaurant = true;
      if (filterRestaurant !== 'الكل') {
        if (filterRestaurant === 'system') {
          matchesRestaurant = !log.tenant_id;
        } else {
          matchesRestaurant = log.tenant_id === filterRestaurant;
        }
      }

      return matchesSearch && matchesAction && matchesRestaurant;
    });
  }, [logs, searchQuery, filterAction, filterRestaurant]);

  const stats = useMemo(() => {
    const total = logs.length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = logs.filter((l) => l.created_at?.startsWith(today)).length;
    const backupCount = logs.filter((l) => l.target_type === 'backup' || l.action?.includes('نسخ')).length;
    const lastActivity = logs.length > 0 ? getRelativeTime(logs[0].created_at) : 'لا يوجد';

    return { total, todayCount, backupCount, lastActivity };
  }, [logs]);

  const exportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('لا توجد سجلات لتصديرها');
      return;
    }

    const headers = ['المعرف', 'النشاط', 'العميل', 'النوع', 'الوصف', 'التاريخ'];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.restaurants?.name || 'النظام').replace(/"/g, '""')}"`,
      `"${l.target_type || '-'}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${new Date(l.created_at).toLocaleString('ar-EG')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('تم تصدير السجلات بنجاح');
  };

  const visibleLogs = useMemo(() => {
    return filteredLogs.slice(0, displayLimit);
  }, [filteredLogs, displayLimit]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            سجل النشاطات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            سجل التدقيق وتاريخ نشاطات النظام والعملاء
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#131b26] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm font-medium disabled:opacity-50"
            title="تحديث السجلات"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131b26] p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي السجلات</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <Hash className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131b26] p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">سجلات اليوم</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.todayCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131b26] p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">عمليات النسخ الاحتياطي</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.backupCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Database className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131b26] p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">آخر نشاط</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 truncate" title={stats.lastActivity}>
              {stats.lastActivity}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالنشاط، الوصف أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-gray-50 dark:bg-[#0a0f16] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Action Type Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-[#0a0f16] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                {['الكل', 'إنشاء', 'تعديل', 'حذف', 'تسجيل دخول', 'نسخ احتياطي', 'الباقات', 'أخرى'].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'الكل' ? 'جميع العمليات' : opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Restaurant Filter */}
            {restaurants.length > 0 && (
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <Building2 className="w-4 h-4 text-gray-400" />
                <select
                  value={filterRestaurant}
                  onChange={(e) => setFilterRestaurant(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-[#0a0f16] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm max-w-[200px] truncate"
                >
                  <option value="الكل">جميع العملاء</option>
                  <option value="system">النظام العام</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-stone-100 dark:border-stone-800">
          <span>
            عرض {visibleLogs.length} من أصل {filteredLogs.length} سجل
          </span>
          {(searchQuery || filterAction !== 'الكل' || filterRestaurant !== 'الكل') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterAction('الكل');
                setFilterRestaurant('الكل');
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              إعادة تعيين الفلاتر
            </button>
          )}
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="text-sm text-gray-500">جاري تحميل سجلات النشاط...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">لا توجد سجلات نشاط مطابقة</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              جرب تغيير معايير البحث أو الفلاتر لعرض نتائج أخرى
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">النشاط</th>
                  <th className="py-3 px-4">العميل / المطعم</th>
                  <th className="py-3 px-4">النوع</th>
                  <th className="py-3 px-4">الوصف والتفاصيل</th>
                  <th className="py-3 px-4">التوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-sm">
                {visibleLogs.map((log) => {
                  const clientName = log.restaurants?.name;
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#0a0f16]/50 transition-colors"
                    >
                      {/* Action */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800">
                            {getActionIcon(log.action, log.target_type)}
                          </div>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {log.action}
                          </span>
                        </div>
                      </td>

                      {/* Client / Restaurant */}
                      <td className="py-3 px-4">
                        {clientName ? (
                          <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium">{clientName}</span>
                          </div>
                        ) : log.tenant_id ? (
                          <span className="text-gray-400 font-mono text-xs">
                            {log.tenant_id.substring(0, 8)}...
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-stone-800">
                            النظام العام
                          </span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        {getTargetBadge(log.target_type)}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 max-w-md">
                        <span className="line-clamp-2" title={log.description || ''}>
                          {log.description || '-'}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {getRelativeTime(log.created_at)}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(log.created_at).toLocaleString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Load More Button */}
            {filteredLogs.length > displayLimit && (
              <div className="mt-4 py-3 text-center border-t border-stone-100 dark:border-stone-800">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 50)}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                >
                  عرض المزيد ({filteredLogs.length - displayLimit} سجل إضافي)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
