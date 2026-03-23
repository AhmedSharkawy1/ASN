import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { backup_id } = body;

        if (!backup_id) {
            return NextResponse.json({ error: "Missing backup_id" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Get backup record
        const { data: backup, error: fetchErr } = await supabaseAdmin
            .from('system_backups')
            .select('*')
            .eq('id', backup_id)
            .single();

        if (fetchErr || !backup) {
            return NextResponse.json({ error: "Backup not found" }, { status: 404 });
        }

        if (!backup.backup_file) {
            return NextResponse.json({ error: "Backup file path not found" }, { status: 404 });
        }

        // Download backup data
        const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
            .from('client-backups')
            .download(backup.backup_file);

        if (downloadErr || !fileData) {
            return NextResponse.json({ error: `Failed to download backup: ${downloadErr?.message}` }, { status: 500 });
        }

        const text = await fileData.text();
        const backupData = JSON.parse(text);
        const tenantId = backup.tenant_id;

        if (!tenantId) {
            return NextResponse.json({ error: "Cannot restore system-level backups (no tenant_id)" }, { status: 400 });
        }

        const restoreResults: Record<string, { restored: number; errors: string[] }> = {};

        // Tables we can safely upsert (in dependency order)
        const restoreTables = [
            'categories',
            'items',
            'customers',
            'team_members',
            'inventory_items',
            'delivery_zones',
            'tables',
            'recipes',
            'recipe_items',
            'print_settings',
            'supplies',
            'supply_items',
            'supply_payments',
            'orders',
            'order_logs',
            'notifications',
            'inventory_transactions',
            'production_requests',
            'financial_accounts',
            'financial_transactions',
        ];

        for (const tableName of restoreTables) {
            const tableData = backupData[tableName];
            if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
                continue;
            }

            restoreResults[tableName] = { restored: 0, errors: [] };

            // Upsert in batches of 50
            for (let i = 0; i < tableData.length; i += 50) {
                const batch = tableData.slice(i, i + 50);
                const { error } = await supabaseAdmin
                    .from(tableName)
                    .upsert(batch, { onConflict: 'id' });

                if (error) {
                    restoreResults[tableName].errors.push(`Batch ${i}: ${error.message}`);
                } else {
                    restoreResults[tableName].restored += batch.length;
                }
            }
        }

        // Update restaurant record
        if (backupData.restaurant) {
            const { error } = await supabaseAdmin
                .from('restaurants')
                .upsert(backupData.restaurant);
            if (error) {
                restoreResults['restaurants'] = { restored: 0, errors: [error.message] };
            } else {
                restoreResults['restaurants'] = { restored: 1, errors: [] };
            }
        }

        return NextResponse.json({
            success: true,
            backup_id: backup.id,
            tenant_id: tenantId,
            results: restoreResults,
        });

    } catch (err) {
        console.error("[Backup] Restore API Error:", err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
