import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// We store backup schedule settings in system_backups as a special meta-row
const SETTINGS_KEY = 'BACKUP_SCHEDULE_SETTINGS';

interface BackupScheduleSettings {
    enabled: boolean;
    interval_hours: number; // e.g., 24 = daily, 168 = weekly, 720 = monthly
    last_auto_run?: string;
}

const DEFAULT_SETTINGS: BackupScheduleSettings = {
    enabled: true,
    interval_hours: 168, // Default: weekly
};

function getAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseServiceKey) throw new Error("Missing SERVICE_ROLE_KEY");
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

// GET — Read current schedule settings
export async function GET() {
    try {
        const supabaseAdmin = getAdmin();

        const { data } = await supabaseAdmin
            .from('system_backups')
            .select('record_counts, created_at')
            .eq('backup_name', SETTINGS_KEY)
            .single();

        if (data) {
            return NextResponse.json({
                success: true,
                settings: data.record_counts as unknown as BackupScheduleSettings,
            });
        }

        // Return defaults if no settings stored yet
        return NextResponse.json({
            success: true,
            settings: DEFAULT_SETTINGS,
        });
    } catch (err) {
        console.error("[Backup Settings] GET Error:", err);
        return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS });
    }
}

// POST — Save schedule settings
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { enabled, interval_hours } = body;

        const settings: BackupScheduleSettings = {
            enabled: enabled ?? DEFAULT_SETTINGS.enabled,
            interval_hours: interval_hours ?? DEFAULT_SETTINGS.interval_hours,
        };

        const supabaseAdmin = getAdmin();

        // Check if settings row exists
        const { data: existing } = await supabaseAdmin
            .from('system_backups')
            .select('id')
            .eq('backup_name', SETTINGS_KEY)
            .single();

        if (existing) {
            // Update existing
            await supabaseAdmin
                .from('system_backups')
                .update({
                    record_counts: settings as unknown as Record<string, number>,
                })
                .eq('id', existing.id);
        } else {
            // Create new settings row
            await supabaseAdmin
                .from('system_backups')
                .insert({
                    backup_name: SETTINGS_KEY,
                    backup_type: 'auto',
                    backup_file: 'SETTINGS_META',
                    file_size_bytes: 0,
                    status: 'completed',
                    tables_included: [],
                    record_counts: settings as unknown as Record<string, number>,
                });
        }

        return NextResponse.json({ success: true, settings });
    } catch (err) {
        console.error("[Backup Settings] POST Error:", err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
