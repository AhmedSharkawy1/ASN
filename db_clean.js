require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clean() {
    // 1. Delete duplicate video
    const { error: storageError } = await supabase.storage
        .from('menu-images')
        .remove(['vicino/video/1784342524238.mp4']);
    if (storageError) {
        console.error('Failed to delete duplicate video:', storageError.message);
    } else {
        console.log('✅ Deleted duplicate video: vicino/video/1784342524238.mp4');
    }

    // 2. Clean order_logs
    const { error: logsError } = await supabase.rpc('exec_sql', {
        query: `
            DELETE FROM order_logs 
            WHERE action NOT LIKE 'status_%' 
              AND action NOT LIKE 'payment_%' 
              AND performed_by = 'system';
        `
    });
    if (logsError) {
        console.error('Failed to delete order_logs via RPC:', logsError.message);
    } else {
        console.log('✅ Cleaned order_logs table');
    }

    // 3. Clean notifications
    const { error: notifError } = await supabase.rpc('exec_sql', {
        query: `
            DELETE FROM notifications 
            WHERE created_at < NOW() - INTERVAL '3 months';
        `
    });
    if (notifError) {
        console.error('Failed to delete old notifications via RPC:', notifError.message);
    } else {
        console.log('✅ Cleaned old notifications');
    }
}

clean().catch(console.error);
