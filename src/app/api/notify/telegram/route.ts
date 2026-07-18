import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { restaurantId, orderId, customerName, total, itemsCount } = body;

        if (!restaurantId || !orderId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch telegram credentials securely on the server
        const { data: restaurant, error } = await supabaseAdmin
            .from('restaurants')
            .select('name, telegram_bot_token, telegram_chat_id')
            .eq('id', restaurantId)
            .single();

        if (error || !restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        const { telegram_bot_token, telegram_chat_id, name } = restaurant;

        if (!telegram_bot_token || !telegram_chat_id) {
            // Notifications not configured, which is fine
            return NextResponse.json({ success: true, message: 'Telegram not configured for this restaurant' });
        }

        // Prepare the message
        const message = `
🛍️ *New Order Received!*
🏪 *Restaurant:* ${name}
🆔 *Order ID:* #${orderId.split('-')[0].toUpperCase()}
👤 *Customer:* ${customerName || 'Guest'}
📦 *Items:* ${itemsCount}
💰 *Total:* ${total}

Log in to your ASN Dashboard to process this order!
`.trim();

        // Send to Telegram API
        const telegramUrl = `https://api.telegram.org/bot${telegram_bot_token}/sendMessage`;
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegram_chat_id,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Telegram API error:', errorText);
            return NextResponse.json({ error: 'Failed to send Telegram message' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('API /notify/telegram error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
