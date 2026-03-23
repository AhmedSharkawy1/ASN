import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: "No backup file provided" }, { status: 400 });
        }

        const text = await file.text();
        const backupData = JSON.parse(text);

        if (!backupData._meta || !backupData._meta.tenant_id) {
            return NextResponse.json({ error: "Invalid backup file: Missing tenant metadata" }, { status: 400 });
        }

        const tenantId = backupData._meta.tenant_id;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

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

        // Create a system_backups record to log this manual restore
        await supabaseAdmin.from('system_backups').insert({
            tenant_id: tenantId,
            backup_name: `MANUAL_UPLOAD_${file.name}_${Date.now()}`,
            backup_type: 'full',
            file_size_bytes: file.size,
            status: 'completed',
            completed_at: new Date().toISOString(),
            tables_included: Object.keys(restoreResults),
            record_counts: Object.fromEntries(Object.entries(restoreResults).map(([k, v]) => [k, v.restored]))
        });

        return NextResponse.json({
            success: true,
            tenant_id: tenantId,
            results: restoreResults,
        });

    } catch (err) {
        console.error("[Backup] Upload Restore API Error:", err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
