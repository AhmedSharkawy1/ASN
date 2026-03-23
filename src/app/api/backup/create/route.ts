import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// All tables to back up per tenant (using restaurant_id or tenant_id)
const TENANT_TABLES = [
    { name: 'categories', fk: 'restaurant_id' },
    { name: 'items', fk: null, via: 'category_id', parentTable: 'categories', parentFk: 'restaurant_id' },
    { name: 'orders', fk: 'restaurant_id' },
    { name: 'order_logs', fk: null, via: 'order_id', parentTable: 'orders', parentFk: 'restaurant_id' },
    { name: 'order_costs', fk: null, via: 'order_id', parentTable: 'orders', parentFk: 'restaurant_id' },
    { name: 'customers', fk: 'restaurant_id' },
    { name: 'team_members', fk: 'restaurant_id' },
    { name: 'inventory_items', fk: 'restaurant_id' },
    { name: 'inventory_transactions', fk: 'restaurant_id' },
    { name: 'delivery_zones', fk: 'restaurant_id' },
    { name: 'branches', fk: 'tenant_id' },
    { name: 'tables', fk: 'restaurant_id' },
    { name: 'supplies', fk: 'restaurant_id' },
    { name: 'supply_items', fk: null, via: 'supply_id', parentTable: 'supplies', parentFk: 'restaurant_id' },
    { name: 'supply_payments', fk: null, via: 'supply_id', parentTable: 'supplies', parentFk: 'restaurant_id' },
    { name: 'recipes', fk: 'restaurant_id' },
    { name: 'recipe_items', fk: null, via: 'recipe_id', parentTable: 'recipes', parentFk: 'restaurant_id' },
    { name: 'production_requests', fk: 'restaurant_id' },
    { name: 'print_settings', fk: 'restaurant_id' },
    { name: 'client_page_access', fk: 'tenant_id' },
    { name: 'notifications', fk: 'restaurant_id' },
    { name: 'subscriptions', fk: 'tenant_id' },
    { name: 'financial_accounts', fk: 'restaurant_id' },
    { name: 'financial_transactions', fk: 'restaurant_id' },
];

async function fetchTableData(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseAdmin: any,
    tableName: string,
    fk: string | null,
    tenantId: string,
    tableConfig: typeof TENANT_TABLES[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ data: any[]; count: number }> {
    try {
        if (fk) {
            // Direct FK relationship
            const { data, error } = await supabaseAdmin
                .from(tableName)
                .select('*')
                .eq(fk, tenantId);

            if (error) {
                console.error(`[Backup] Error fetching ${tableName}:`, error.message);
                return { data: [], count: 0 };
            }
            return { data: data || [], count: (data || []).length };
        } else if (tableConfig.via && tableConfig.parentTable && tableConfig.parentFk) {
            // Indirect FK — need to fetch parent IDs first
            const { data: parents } = await supabaseAdmin
                .from(tableConfig.parentTable)
                .select('id')
                .eq(tableConfig.parentFk, tenantId);

            if (!parents || parents.length === 0) return { data: [], count: 0 };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parentIds = parents.map((p: any) => p.id);

            // Fetch in batches of 100 to avoid URL length limits
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let allData: any[] = [];
            for (let i = 0; i < parentIds.length; i += 100) {
                const batch = parentIds.slice(i, i + 100);
                const { data, error } = await supabaseAdmin
                    .from(tableName)
                    .select('*')
                    .in(tableConfig.via, batch);

                if (error) {
                    console.error(`[Backup] Error fetching ${tableName} (batch):`, error.message);
                } else {
                    allData = allData.concat(data || []);
                }
            }
            return { data: allData, count: allData.length };
        }
        return { data: [], count: 0 };
    } catch (err) {
        console.error(`[Backup] Exception fetching ${tableName}:`, err);
        return { data: [], count: 0 };
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tenant_id, backup_type } = body;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Ensure the storage bucket exists (idempotent — doesn't error if it already exists)
        try {
            const { error: bucketError } = await supabaseAdmin.storage.createBucket('client-backups', {
                public: false,
            });
            // Ignore "already exists" errors
            if (bucketError && !bucketError.message?.includes('already exists')) {
                console.log('[Backup] Bucket creation note:', bucketError.message);
            }
        } catch (e) {
            console.log('[Backup] Bucket check:', e);
        }

        // Determine which tenants to back up
        let tenantIds: string[] = [];
        if (tenant_id) {
            tenantIds = [tenant_id];
        } else {
            // Back up ALL tenants
            const { data: restaurants } = await supabaseAdmin
                .from('restaurants')
                .select('id');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tenantIds = (restaurants || []).map((r: any) => r.id);
        }

        if (tenantIds.length === 0) {
            return NextResponse.json({ error: "No tenants found." }, { status: 404 });
        }

        const results = [];

        for (const tid of tenantIds) {
            // Get restaurant info
            const { data: restaurant } = await supabaseAdmin
                .from('restaurants')
                .select('*')
                .eq('id', tid)
                .single();

            if (!restaurant) continue;

            // Create backup record
            const timestamp = `${new Date().toISOString().split('T')[0]}_${Date.now()}`;
            const backupName = `${restaurant.name || 'Unknown'}_${timestamp}`;
            const storagePath = `backups/${tid}/backup_${timestamp}.json`;
            const { data: backupRecord, error: insertErr } = await supabaseAdmin
                .from('system_backups')
                .insert({
                    tenant_id: tid,
                    backup_name: backupName,
                    backup_type: backup_type || (tenant_id ? 'per_client' : 'full'),
                    backup_file: storagePath,
                    status: 'pending',
                })
                .select()
                .single();

            if (insertErr || !backupRecord) {
                console.error('[Backup] Failed to create backup record:', insertErr);
                continue;
            }

            try {
                // Fetch ALL data for this tenant
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const backupData: Record<string, any> = {
                    _meta: {
                        backup_id: backupRecord.id,
                        tenant_id: tid,
                        restaurant_name: restaurant.name,
                        created_at: new Date().toISOString(),
                        version: '1.0',
                        system: 'ASN POS Backup System',
                    },
                    restaurant: restaurant,
                };

                const recordCounts: Record<string, number> = {};
                const tablesIncluded: string[] = ['restaurants'];

                for (const tableConfig of TENANT_TABLES) {
                    const { data, count } = await fetchTableData(
                        supabaseAdmin, tableConfig.name, tableConfig.fk, tid, tableConfig
                    );
                    backupData[tableConfig.name] = data;
                    recordCounts[tableConfig.name] = count;
                    if (count > 0) tablesIncluded.push(tableConfig.name);
                }

                // Convert to JSON
                const jsonStr = JSON.stringify(backupData, null, 2);
                const fileSizeBytes = new Blob([jsonStr]).size;

                // Upload to Supabase Storage
                const { error: uploadErr } = await supabaseAdmin.storage
                    .from('client-backups')
                    .upload(storagePath, jsonStr, {
                        contentType: 'application/json',
                        upsert: true,
                    });

                if (uploadErr) {
                    // If bucket doesn't exist, try to create it first
                    if (uploadErr.message?.includes('not found') || uploadErr.message?.includes('Bucket')) {
                        await supabaseAdmin.storage.createBucket('client-backups', {
                            public: false,
                        });
                        // Retry upload
                        const { error: retryErr } = await supabaseAdmin.storage
                            .from('client-backups')
                            .upload(storagePath, jsonStr, {
                                contentType: 'application/json',
                                upsert: true,
                            });
                        if (retryErr) throw retryErr;
                    } else {
                        throw uploadErr;
                    }
                }

                // Update backup record as completed
                await supabaseAdmin.from('system_backups').update({
                    status: 'completed',
                    backup_file: storagePath,
                    file_size_bytes: fileSizeBytes,
                    tables_included: tablesIncluded,
                    record_counts: recordCounts,
                    completed_at: new Date().toISOString(),
                }).eq('id', backupRecord.id);

                results.push({
                    backup_id: backupRecord.id,
                    tenant_id: tid,
                    restaurant_name: restaurant.name,
                    status: 'completed',
                    file_size_bytes: fileSizeBytes,
                    record_counts: recordCounts,
                });

            } catch (err) {
                const errMsg = err instanceof Error ? err.message : 'Unknown error';
                console.error(`[Backup] Failed for tenant ${tid}:`, err);
                import('fs').then(fs => fs.writeFileSync('f:/ASN/ASN/backup_err2.txt', errMsg));

                await supabaseAdmin.from('system_backups').update({
                    status: 'failed',
                    error_message: errMsg,
                    completed_at: new Date().toISOString(),
                }).eq('id', backupRecord.id);

                results.push({
                    backup_id: backupRecord.id,
                    tenant_id: tid,
                    status: 'failed',
                    error: errMsg,
                });
            }
        }

        return NextResponse.json({
            success: true,
            backups_created: results.length,
            results,
        });

    } catch (err) {
        console.error("[Backup] Create API Error:", err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
