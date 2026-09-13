import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { restaurantId } = body;

        if (!restaurantId) {
            return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });
        }

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
                connected: false, 
                error: 'بيانات الربط غير مكتملة (يرجى إدخال Instance ID و Token)' 
            });
        }

        // 1. UltraMsg / QR Gateway Test
        if (whatsapp_phone_number_id.toLowerCase().includes('instance')) {
            const url = `https://api.ultramsg.com/${whatsapp_phone_number_id}/instance/status?token=${whatsapp_api_token}`;
            const response = await fetch(url);
            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.error) {
                return NextResponse.json({ 
                    connected: false, 
                    error: data.error || 'فشل الاتصال ببوابة UltraMsg' 
                });
            }

            const status = data.status?.account_status || data.account_status || 'connected';
            const phone = data.status?.phone || data.phone || '';

            return NextResponse.json({ 
                connected: status === 'authenticated' || status === 'connected' || !data.error,
                provider: 'ultramsg',
                phone: phone,
                status: status
            });
        }

        // 2. Meta WhatsApp Cloud API Test
        const url = `https://graph.facebook.com/v18.0/${whatsapp_phone_number_id}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${whatsapp_api_token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json({ 
                connected: false, 
                error: data.error?.message || 'فشل الاتصال بـ WhatsApp Cloud API' 
            });
        }

        return NextResponse.json({ 
            connected: true,
            provider: 'meta_cloud',
            phone: data.display_phone_number || data.verified_name || ''
        });
    } catch (err: unknown) {
        console.error('API /whatsapp/test error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ connected: false, error: errorMessage }, { status: 500 });
    }
}
