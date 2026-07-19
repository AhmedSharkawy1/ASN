import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { restaurant_id, name, phone } = body;

        if (!restaurant_id || !name || !phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('customers')
            .insert([{ restaurant_id, name, phone }])
            .select()
            .single();

        if (error) {
            console.error('Error inserting customer lead:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error('Customer lead API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
