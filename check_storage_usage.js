require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listFilesRecursive(bucket, path = '') {
    const { data, error } = await supabase.storage.from(bucket).list(path, { limit: 1000 });
    if (error) {
        console.error(`Error listing ${bucket}/${path}:`, error.message);
        return [];
    }

    let files = [];
    for (const item of data) {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        if (!item.id) {
            // folder
            const sub = await listFilesRecursive(bucket, fullPath);
            files = files.concat(sub);
        } else {
            if (item.name !== '.emptyFolderPlaceholder') {
                files.push({
                    path: fullPath,
                    size: item.metadata?.size || 0,
                    mimetype: item.metadata?.mimetype || 'unknown',
                    created: item.created_at
                });
            }
        }
    }
    return files;
}

async function checkDatabaseTables() {
    console.log('\n========================================');
    console.log('📊 DATABASE TABLE SIZES');
    console.log('========================================\n');

    // Query to get table sizes
    const { data, error } = await supabase.rpc('exec_sql', {
        query: `
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
                pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes,
                (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema = t.schemaname AND c.table_name = t.tablename) as col_count
            FROM pg_tables t
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
        `
    });

    if (error) {
        // Fallback: query individual tables
        console.log('(Cannot run raw SQL via RPC, checking row counts instead...)\n');
        
        const tables = [
            'restaurants', 'categories', 'items', 'orders', 'order_logs', 'order_costs',
            'customers', 'team_members', 'inventory_items', 'inventory_transactions',
            'delivery_zones', 'branches', 'tables', 'supplies', 'supply_items',
            'supply_payments', 'recipes', 'recipe_items', 'production_requests',
            'print_settings', 'client_page_access', 'notifications', 'subscriptions',
            'financial_accounts', 'financial_transactions', 'system_backups',
            'hr_employees', 'hr_attendance', 'hr_salary_payments', 'hr_deduction_rules',
            'promotions', 'waiter_calls', 'addon_groups', 'addon_items',
            'factory_order_tracking'
        ];

        const results = [];
        for (const table of tables) {
            const { count, error: countError } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (!countError) {
                results.push({ table, count });
            }
        }

        results.sort((a, b) => b.count - a.count);
        
        console.log('Table Name                    | Row Count');
        console.log('------------------------------|----------');
        for (const r of results) {
            console.log(`${r.table.padEnd(30)}| ${r.count}`);
        }
        
        console.log(`\nTotal tables checked: ${results.length}`);
        console.log(`Total rows: ${results.reduce((s, r) => s + r.count, 0)}`);

        // Highlight tables with lots of data
        const bigTables = results.filter(r => r.count > 100);
        if (bigTables.length > 0) {
            console.log('\n⚠️  Tables with 100+ rows (potential candidates for cleanup):');
            for (const t of bigTables) {
                console.log(`   - ${t.table}: ${t.count} rows`);
            }
        }
    } else {
        for (const row of data) {
            console.log(`${row.tablename.padEnd(30)} ${row.total_size}`);
        }
    }
}

async function checkStorageBuckets() {
    console.log('\n========================================');
    console.log('🗄️  STORAGE BUCKETS');
    console.log('========================================\n');

    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error listing buckets:', error.message);
        return;
    }

    console.log(`Found ${buckets.length} bucket(s):\n`);

    for (const bucket of buckets) {
        console.log(`\n--- Bucket: "${bucket.name}" (public: ${bucket.public}) ---`);
        
        const files = await listFilesRecursive(bucket.name);
        
        const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
        
        // Group by folder
        const folders = {};
        for (const file of files) {
            const folder = file.path.includes('/') ? file.path.split('/')[0] : '(root)';
            if (!folders[folder]) folders[folder] = { count: 0, size: 0 };
            folders[folder].count++;
            folders[folder].size += (file.size || 0);
        }

        console.log(`  Total files: ${files.length}`);
        console.log(`  Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`\n  Breakdown by folder:`);
        
        const sortedFolders = Object.entries(folders).sort((a, b) => b[1].size - a[1].size);
        for (const [folder, stats] of sortedFolders) {
            console.log(`    ${folder.padEnd(25)} ${stats.count} files, ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        }

        // Find large files (> 500KB)
        const largeFiles = files.filter(f => f.size > 500 * 1024);
        if (largeFiles.length > 0) {
            console.log(`\n  ⚠️  Large files (> 500KB): ${largeFiles.length}`);
            largeFiles.sort((a, b) => b.size - a.size);
            for (const f of largeFiles.slice(0, 10)) {
                console.log(`    ${f.path} - ${(f.size / 1024).toFixed(0)} KB`);
            }
            if (largeFiles.length > 10) {
                console.log(`    ... and ${largeFiles.length - 10} more`);
            }
        }
    }
}

async function checkBackupData() {
    console.log('\n========================================');
    console.log('💾 BACKUP DATA');
    console.log('========================================\n');

    const { data: backups, error } = await supabase
        .from('system_backups')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.log('No system_backups table or error:', error.message);
        return;
    }

    console.log(`Found ${backups.length} backup record(s):`);
    let totalBackupSize = 0;
    for (const b of backups) {
        const sizeMB = ((b.file_size_bytes || 0) / 1024 / 1024).toFixed(2);
        totalBackupSize += (b.file_size_bytes || 0);
        console.log(`  - ${b.backup_name} | ${b.status} | ${sizeMB} MB | ${b.created_at}`);
    }
    console.log(`\n  Total backup size: ${(totalBackupSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (backups.length > 3) {
        console.log(`\n  ⚠️  You have ${backups.length} backups. Consider deleting old ones to free space.`);
    }
}

async function checkOldOrders() {
    console.log('\n========================================');
    console.log('📦 OLD ORDERS CHECK');
    console.log('========================================\n');

    // Check orders older than 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { count: oldOrderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', sixMonthsAgo.toISOString());

    const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

    console.log(`  Total orders: ${totalOrders}`);
    console.log(`  Orders older than 6 months: ${oldOrderCount}`);
    
    if (oldOrderCount > 0) {
        console.log(`  ⚠️  ${oldOrderCount} old orders could potentially be archived/deleted.`);
    }

    // Check order_logs
    const { count: totalLogs } = await supabase
        .from('order_logs')
        .select('*', { count: 'exact', head: true });
    
    console.log(`  Order logs: ${totalLogs}`);
    
    // Check notifications
    const { count: totalNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });
    
    console.log(`  Notifications: ${totalNotifications}`);
}

async function main() {
    console.log('🔍 ASN STORAGE & DATABASE USAGE ANALYZER');
    console.log('=========================================');
    console.log(`Time: ${new Date().toISOString()}\n`);

    await checkDatabaseTables();
    await checkStorageBuckets();
    await checkBackupData();
    await checkOldOrders();

    console.log('\n\n========================================');
    console.log('✅ ANALYSIS COMPLETE');
    console.log('========================================');
}

main().catch(console.error);
