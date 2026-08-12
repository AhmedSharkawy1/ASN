require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clean() {
    // 2. Clean order_logs
    const { error: logsError } = await supabase
        .from('order_logs')
        .delete()
        .eq('performed_by', 'system')
        .not('action', 'like', 'status_%')
        .not('action', 'like', 'payment_%');

    if (logsError) {
        console.error('Failed to delete order_logs:', logsError.message);
    } else {
        console.log('✅ Cleaned order_logs table');
    }

    // 3. Clean notifications
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { error: notifError } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', threeMonthsAgo.toISOString());

    if (notifError) {
        console.error('Failed to delete old notifications:', notifError.message);
    } else {
        console.log('✅ Cleaned old notifications');
    }
}

clean().catch(console.error);
