import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Convert body to URLSearchParams which Google Apps Script expects
        const formBody = new URLSearchParams();
        Object.entries(body).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formBody.append(key, String(value));
            }
        });

        const scriptUrl = "https://script.google.com/macros/s/AKfycbx0omypsdzVX-X5KoY4aLv3RF44-KT5PSZ66ZpFUdFsEQVasxyxb2dVlSfwCT3g0QRW/exec";
        
        const response = await fetch(scriptUrl, {
            method: 'POST',
            body: formBody,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const textResponse = await response.text();
        console.log("Google Apps Script response:", textResponse);

        if (!response.ok) {
            console.error("Failed Google Apps Script:", response.status, textResponse);
            return NextResponse.json({ success: false, error: "Failed response from Google" }, { status: response.status });
        }

        // Send Telegram Notification
        const botToken = process.env.TELEGRAM_BOT_TOKEN_CONTACT;
        const chatId = process.env.TELEGRAM_CHAT_ID_CONTACT;

        if (botToken && chatId) {
            const telegramMessage = `🔔 *رسالة جديدة من تواصل معنا*\n\n` +
                                    `👤 *الاسم:* ${body.firstName} ${body.lastName || ''}\n` +
                                    `📞 *الهاتف:* ${body.phone}\n` +
                                    `✉️ *البريد:* ${body.email || 'لم يتم توفيره'}\n\n` +
                                    `💬 *الرسالة:*\n${body.message}`;

            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: telegramMessage,
                    parse_mode: 'Markdown',
                }),
            }).catch(telegramErr => console.error("Error sending Telegram config:", telegramErr));
        }

        return NextResponse.json({ success: true, data: textResponse });
    } catch (error: any) {
        console.error("Error in contact API route:", error.message || error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
