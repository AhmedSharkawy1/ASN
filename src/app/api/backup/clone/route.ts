import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

// ── Full Module Map — every page the user sees in the sidebar ──
const COLONABLE_MODULES: Record<string, string[]> = {
    menu:               ['categories', 'items'],
    orders:             ['orders', 'order_logs', 'order_costs'],
    kitchen:            ['recipes', 'recipe_items'],
    factory:            ['production_requests'],
    inventory:          ['inventory_items', 'inventory_transactions'],
    supplies:           ['supplies', 'supply_items', 'supply_payments'],
    tables:             ['tables'],
    delivery:           ['delivery_zones'],
    customers:          ['customers'],
    team:               ['team_members'],
    branches:           ['branches'],
    finance:            ['financial_accounts', 'financial_transactions'],
    notifications:      ['notifications'],
    settings:           ['print_settings', 'client_page_access'],
};

// ── Foreign key columns that must be remapped to new IDs ──
const FK_MAPPINGS: Record<string, string[]> = {
    items:                   ['category_id'],
    recipe_items:            ['recipe_id', 'item_id'],
    supply_items:            ['supply_id', 'item_id'],
    supply_payments:         ['supply_id'],
    order_logs:              ['order_id'],
    order_costs:             ['order_id'],
    production_requests:     ['recipe_id'],
    inventory_transactions:  ['inventory_item_id'],
    financial_transactions:  ['account_id'],
    orders:                  ['customer_id', 'table_id', 'delivery_zone_id'],
};

// ── Singleton tables (unique per restaurant_id) — must be cleared before insert ──
const SINGLETON_TABLES = ['print_settings'];

// ── Strict dependency order — parents must be cloned before their children ──
const DEPENDENCY_ORDER = [
    // Menu
    'categories', 'items',
    // Inventory
    'inventory_items', 'inventory_transactions',
    // Supplies
    'supplies', 'supply_items', 'supply_payments',
    // Kitchen & Factory
    'recipes', 'recipe_items', 'production_requests',
    // Operations
    'tables', 'delivery_zones', 'customers',
    // Orders (depend on customers, tables, delivery_zones)
    'orders', 'order_logs', 'order_costs',
    // Finance
    'financial_accounts', 'financial_transactions',
    // Team & Admin
    'team_members', 'branches', 'notifications',
    // Settings
    'print_settings', 'client_page_access',
];

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const targetTenantId = formData.get('target_tenant_id') as string | null;
        const rawModules = formData.get('modules') as string | null;

        if (!file || !targetTenantId || !rawModules) {
            return NextResponse.json({ error: "Missing file, target_tenant_id, or modules" }, { status: 400 });
        }

        const selectedModules: string[] = JSON.parse(rawModules);
        if (selectedModules.length === 0) {
            return NextResponse.json({ error: "No modules selected to clone" }, { status: 400 });
        }

        const text = await file.text();
        const backupData = JSON.parse(text);

        if (!backupData._meta || !backupData._meta.tenant_id) {
            return NextResponse.json({ error: "Invalid backup file: Missing tenant metadata" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Calculate all tables we need to process based on requested modules
        const tablesToClone: string[] = [];
        for (const mod of selectedModules) {
            if (COLONABLE_MODULES[mod]) {
                tablesToClone.push(...COLONABLE_MODULES[mod]);
            }
        }

        // Filter the execution order by what the user actually asked to clone
        const orderedExecution = DEPENDENCY_ORDER.filter(t => tablesToClone.includes(t));

        const idMap: Record<string, string> = {};
        const cloneResults: Record<string, { cloned: number; errors: string[] }> = {};

        for (const tableName of orderedExecution) {
            const tableData = backupData[tableName];
            if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
                continue;
            }

            cloneResults[tableName] = { cloned: 0, errors: [] };

            // Generate translated payload
            const clonedRows = [];

            for (const row of tableData) {
                const oldId = row.id;
                const newId = crypto.randomUUID();
                idMap[oldId] = newId;

                const clonedRow = { ...row, id: newId };

                // Redirect the ownership to the target tenant
                if ('restaurant_id' in clonedRow) clonedRow.restaurant_id = targetTenantId;
                if ('tenant_id' in clonedRow) clonedRow.tenant_id = targetTenantId;

                // Strip timestamps so the DB can generate fresh ones
                delete clonedRow.created_at;
                delete clonedRow.updated_at;

                // Strip auth-linked fields from team_members (they must register fresh)
                if (tableName === 'team_members') {
                    delete clonedRow.auth_id;
                }

                // Remap any foreign keys if they exist in our idMap
                if (FK_MAPPINGS[tableName]) {
                    for (const fkCol of FK_MAPPINGS[tableName]) {
                        if (clonedRow[fkCol] && idMap[clonedRow[fkCol]]) {
                            clonedRow[fkCol] = idMap[clonedRow[fkCol]];
                        } else if (clonedRow[fkCol]) {
                            // Parent wasn't cloned — nullify to avoid FK constraint errors
                            clonedRow[fkCol] = null;
                        }
                    }
                }

                clonedRows.push(clonedRow);
            }

            // Pre-clear singleton tables to prevent unique constraint crashes
            if (SINGLETON_TABLES.includes(tableName)) {
                await supabaseAdmin.from(tableName).delete().eq('restaurant_id', targetTenantId);
            }

            // Insert in batches of 50
            for (let i = 0; i < clonedRows.length; i += 50) {
                const batch = clonedRows.slice(i, i + 50);
                const { error } = await supabaseAdmin
                    .from(tableName)
                    .insert(batch);

                if (error) {
                    cloneResults[tableName].errors.push(`Batch ${i}: ${error.message}`);
                } else {
                    cloneResults[tableName].cloned += batch.length;
                }
            }
        }

        // Record completion
        const { error: logErr } = await supabaseAdmin.from('system_backups').insert({
            tenant_id: targetTenantId,
            backup_name: `TEMPLATE_CLONE_${file.name}_${Date.now()}`,
            backup_type: 'auto',
            backup_file: 'TEMPLATE_CLONE_INTERNAL',
            file_size_bytes: file.size,
            status: 'completed',
            completed_at: new Date().toISOString(),
            tables_included: Object.keys(cloneResults),
            record_counts: Object.fromEntries(Object.entries(cloneResults).map(([k, v]) => [k, v.cloned]))
        });

        return NextResponse.json({
            success: true,
            target_tenant_id: targetTenantId,
            results: cloneResults,
            log_error: logErr ? logErr.message : null
        });

    } catch (err) {
        console.error("[Backup] Clone API Error:", err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
