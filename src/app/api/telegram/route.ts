import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { botToken, chatId, message } = await req.json();

        if (!botToken || !chatId || !message) {
            return NextResponse.json(
                { success: false, error: 'Missing botToken, chatId, or message' },
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
