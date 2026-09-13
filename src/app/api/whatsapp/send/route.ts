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
            return NextResponse.json({ success: false, error: 'WhatsApp API not configured' });
        }

        // Clean phone number (remove +, spaces, etc. as required by Cloud API)
        const cleanPhone = phone.replace(/[^\d]/g, '');

        // Call WhatsApp Cloud API
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
                text: { body: message }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('WhatsApp Cloud API error:', errorText);
            return NextResponse.json({ error: 'Failed to send WhatsApp message via Cloud API' }, { status: 500 });
        }

        const responseData = await response.json();

        return NextResponse.json({ 
            success: true, 
            messageId: responseData.messages?.[0]?.id 
        });
    } catch (err) {
        console.error('API /whatsapp/send error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
