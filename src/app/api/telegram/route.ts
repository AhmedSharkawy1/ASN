import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Sends a restaurant's Telegram notification.
 *
 * The caller passes restaurantId, never the credentials. The browser used to
 * read telegram_bot_token straight out of the restaurants table and post it
 * here, which meant the token was readable by anyone holding the anon key —
 * that is, anyone who opened the site. The token is now looked up here with
 * the service role and never leaves the server.
 *
 * botToken/chatId in the body are still accepted so an older deployed client
 * keeps working during a rollout, but restaurantId is preferred.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { restaurantId, message } = body;
        let { botToken, chatId } = body;

        if (restaurantId) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!supabaseUrl || !serviceKey) {
                return NextResponse.json(
                    { success: false, error: 'Server is missing Supabase credentials' },
                    { status: 500 }
                );
            }

            const admin = createClient(supabaseUrl, serviceKey, {
                auth: { persistSession: false, autoRefreshToken: false },
            });
            const { data } = await admin
                .from('restaurants')
                .select('telegram_bot_token, telegram_chat_id')
                .eq('id', restaurantId)
                .maybeSingle();

            // Not configured for this restaurant is a normal state, not an error.
            if (!data?.telegram_bot_token || !data?.telegram_chat_id) {
                return NextResponse.json({ success: true, skipped: 'not-configured' });
            }
            botToken = data.telegram_bot_token;
            chatId = data.telegram_chat_id;
        }

        if (!botToken || !chatId || !message) {
            return NextResponse.json(
                { success: false, error: 'Missing restaurantId/credentials, or message' },
                { status: 400 }
            );
        }

        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('Telegram API error:', data);
            return NextResponse.json(
                { success: false, error: data.description || 'Telegram API error' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Telegram route error:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
