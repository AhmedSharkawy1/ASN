import { supabase } from '@/lib/supabase/client';

export interface LogActivityParams {
  action: string;
  description?: string | null;
  targetType?: 'client' | 'backup' | 'plan' | 'auth' | 'settings' | 'order' | 'system' | string | null;
  targetId?: string | null;
  tenantId?: string | null;
  userId?: string | null;
}

/**
 * Universal activity logger for client and server actions.
 * Never throws errors to avoid interrupting user flows.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const isBrowser = typeof window !== 'undefined';

    let currentUserId = params.userId || null;
    if (isBrowser && !currentUserId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          currentUserId = session.user.id;
        }
      } catch {
        // Ignore session read error
      }
    }

    const payload = {
      action: params.action,
      description: params.description || null,
      target_type: params.targetType || 'system',
      target_id: params.targetId || null,
      tenant_id: params.tenantId || null,
      user_id: currentUserId,
      created_at: new Date().toISOString()
    };

    if (isBrowser) {
      const { error } = await supabase.from('activity_logs').insert(payload);
      if (error) {
        // Fallback to API route if client insert is blocked by any RLS nuance
        await fetch('/api/admin/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    } else {
      // Server-side: use dynamic import of supabaseAdmin to avoid circular bundling issues
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      await supabaseAdmin.from('activity_logs').insert(payload);
    }
  } catch (err) {
    console.warn('[ActivityLogger] Warning: failed to log activity:', err);
  }
}
