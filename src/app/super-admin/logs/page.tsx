"use client";

import { supabase } from '@/lib/supabase/client';
import { Activity, Clock, Search, AlertCircle, Shield, Filter, Calendar, Hash } from 'lucide-react';
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
}

function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'الآن';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `منذ ${diffInMinutes} دقيقة`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `منذ ${diffInHours} ساعة`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `منذ ${diffInDays} يوم`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `منذ ${diffInMonths} شهر`;
  }

  return `منذ ${Math.floor(diffInMonths / 12)} سنة`;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('الكل');
  
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      toast.error('حدث خطأ أثناء جلب سجلات النشاط');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = 
        log.action?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        log.description?.toLowerCase().includes(searchQuery.toLowerCase());
        
      let matchesFilter = true;
      if (filterAction !== 'الكل') {
        if (filterAction === 'إنشاء') matchesFilter = log.action.includes('إنشاء') || log.action.toLowerCase().includes('create');
        else if (filterAction === 'تعديل') matchesFilter = log.action.includes('تعديل') || log.action.toLowerCase().includes('update');
        else if (filterAction === 'حذف') matchesFilter = log.action.includes('حذف') || log.action.toLowerCase().includes('delete');
        else if (filterAction === 'تسجيل دخول') matchesFilter = log.action.includes('دخول') || log.action.toLowerCase().includes('login');
        else if (filterAction === 'أخرى') matchesFilter = !['create', 'update', 'delete', 'login', 'إنشاء', 'تعديل', 'حذف', 'دخول'].some(k => log.action.toLowerCase().includes(k));
      }

      return matchesSearch && matchesFilter;
    });
  }, [logs, searchQuery, filterAction]);

  const stats = useMemo(() => {
    const total = logs.length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = logs.filter(l => l.created_at.startsWith(today)).length;
    const lastActivity = logs.length > 0 ? getRelativeTime(logs[0].created_at) : 'لا يوجد';
    
    return { total, todayCount, lastActivity };
  }, [logs]);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-600" />
          سجل النشاطات
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">سجل التدقيق وتاريخ نشاطات النظام</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي السجلات</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <Hash className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">سجلات اليوم</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.todayCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">آخر نشاط</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.lastActivity}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في السجلات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-gray-50 dark:bg-[#0a0f16] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-[#0a0f16] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {['الكل', 'إنشاء', 'تعديل', 'حذف', 'تسجيل دخول', 'أخرى'].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">لا توجد سجلات نشاط</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">ستظهر سجلات النشاط هنا عند إجراء أي عمليات في النظام</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800">
                  <th className="py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">النشاط</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">نوع الهدف</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">الهدف</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">الوصف</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">التوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#0a0f16]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {log.action.toLowerCase().includes('login') || log.action.toLowerCase().includes('auth') || log.action.includes('دخول') ? (
                          <Shield className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <Activity className="w-4 h-4 text-emerald-500" />
                        )}
                        <span className="text-gray-900 dark:text-white font-medium">{log.action}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{log.target_type || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="text-gray-500 dark:text-gray-400 font-mono text-sm">
                        {log.target_id ? `${log.target_id.substring(0, 8)}...` : 'النظام'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={log.description || ''}>
                      {log.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length > 50 && (
              <div className="mt-4 text-center">
                <button className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                  عرض المزيد
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
