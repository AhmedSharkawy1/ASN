import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { restaurantId, phone, message } = body;

        if (!restaurantId || !phone || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch whatsapp credentials securely on the server
        const { data: restaurant, error } = await supabaseAdmin
            .from('restaurants')
            .select('whatsapp_api_token, whatsapp_phone_number_id')
            .eq('id', restaurantId)
            .single();

        if (error || !restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        const { whatsapp_api_token, whatsapp_phone_number_id } = restaurant;

        if (!whatsapp_api_token || !whatsapp_phone_number_id) {
            return NextResponse.json({ 
                success: false, 
                error: 'لم يتم ضبط إعدادات بوابة واتساب. يرجى إدخال بيانات الربط في صفحة إعدادات الواتساب.' 
            }, { status: 400 });
        }

        // Clean phone number (keep digits only)
        let cleanPhone = phone.replace(/[^\d]/g, '');
        // If Egyptian number starting with 01, add country code 20
        if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
            cleanPhone = '2' + cleanPhone;
        }

        // Strip VS16 Unicode characters that can break message text
        const cleanMessage = message.replace(/\uFE0F/g, '');

        // 1. UltraMsg / QR Gateway Provider (when phone_number_id contains "instance")
        if (whatsapp_phone_number_id.toLowerCase().includes('instance')) {
            const url = `https://api.ultramsg.com/${whatsapp_phone_number_id}/messages/chat`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: whatsapp_api_token,
                    to: cleanPhone,
                    body: cleanMessage
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.error) {
                console.error('UltraMsg API error:', data);
                return NextResponse.json({ 
                    success: false, 
                    error: data.error || data.message || 'فشل الإرسال عبر بوابة واتساب' 
                }, { status: 500 });
            }

            return NextResponse.json({ 
                success: true, 
                messageId: String(data.id || data.messageId || 'sent') 
            });
        }

        // 2. Meta WhatsApp Cloud API Provider
        const url = `https://graph.facebook.com/v18.0/${whatsapp_phone_number_id}/messages`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${whatsapp_api_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: cleanPhone,
                type: 'text',
                text: { body: cleanMessage }
            })
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('WhatsApp Cloud API error:', responseData);
            return NextResponse.json({ 
                success: false, 
                error: responseData.error?.message || 'فشل الإرسال عبر WhatsApp Cloud API' 
            }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            messageId: responseData.messages?.[0]?.id 
        });
    } catch (err: unknown) {
        console.error('API /whatsapp/send error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
