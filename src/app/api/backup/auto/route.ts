import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SETTINGS_KEY = 'BACKUP_SCHEDULE_SETTINGS';
const DEFAULT_INTERVAL_HOURS = 168; // Weekly

export async function POST() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // ── Read the configurable interval from settings ──
        let intervalHours = DEFAULT_INTERVAL_HOURS;
        let scheduleEnabled = true;

        const { data: settingsRow } = await supabaseAdmin
            .from('system_backups')
            .select('record_counts')
            .eq('backup_name', SETTINGS_KEY)
            .single();

        if (settingsRow?.record_counts) {
            const settings = settingsRow.record_counts as unknown as { enabled?: boolean; interval_hours?: number };
            intervalHours = settings.interval_hours ?? DEFAULT_INTERVAL_HOURS;
            scheduleEnabled = settings.enabled ?? true;
        }

        if (!scheduleEnabled) {
            return NextResponse.json({
                success: true,
                message: "Auto-backup is disabled in settings.",
                timestamp: new Date().toISOString(),
                tenants_processed: 0,
                results: [],
            });
        }

        // Get all tenants
        const { data: restaurants } = await supabaseAdmin
            .from('restaurants')
            .select('id, name');

        if (!restaurants || restaurants.length === 0) {
            return NextResponse.json({ message: "No tenants found." }, { status: 200 });
        }

        const results = [];

        for (const restaurant of restaurants) {
            // Check last backup for this tenant
            const { data: lastBackup } = await supabaseAdmin
                .from('system_backups')
                .select('created_at')
                .eq('tenant_id', restaurant.id)
                .eq('status', 'completed')
                .neq('backup_name', SETTINGS_KEY)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const lastBackupTime = lastBackup?.created_at ? new Date(lastBackup.created_at).getTime() : 0;
            const now = Date.now();
            const hoursSinceLastBackup = (now - lastBackupTime) / (1000 * 60 * 60);

            // Only create backup if last backup exceeds the configured interval
            if (hoursSinceLastBackup < intervalHours) {
                results.push({
                    tenant_id: restaurant.id,
                    restaurant_name: restaurant.name,
                    status: 'skipped',
                    reason: `Last backup was ${hoursSinceLastBackup.toFixed(1)}h ago (< ${intervalHours}h interval)`,
                });
                continue;
            }

            // Trigger backup creation
            try {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

                const res = await fetch(`${baseUrl}/api/backup/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tenant_id: restaurant.id,
                        backup_type: 'auto',
                    }),
                });

                const result = await res.json();
                results.push({
                    tenant_id: restaurant.id,
                    restaurant_name: restaurant.name,
                    status: result.success ? 'created' : 'failed',
                    details: result,
                });
            } catch (err) {
                results.push({
                    tenant_id: restaurant.id,
                    restaurant_name: restaurant.name,
                    status: 'failed',
                    error: err instanceof Error ? err.message : 'Unknown error',
                });
            }
        }

        // Update last_auto_run timestamp in settings
        const { data: existing } = await supabaseAdmin
            .from('system_backups')
            .select('id, record_counts')
            .eq('backup_name', SETTINGS_KEY)
            .single();

        if (existing) {
            const updatedSettings = {
                ...(existing.record_counts as object),
                last_auto_run: new Date().toISOString(),
            };
            await supabaseAdmin
                .from('system_backups')
                .update({ record_counts: updatedSettings as unknown as Record<string, number> })
                .eq('id', existing.id);
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            interval_hours: intervalHours,
            tenants_processed: restaurants.length,
            results,
        });

    } catch (err) {
        console.error("[Backup] Auto API Error:", err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
