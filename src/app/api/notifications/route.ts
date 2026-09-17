import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurant_id');
        const filter = searchParams.get('filter');

        if (!restaurantId) {
            return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        let query = supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(200);

        if (filter === 'unread') {
            query = query.eq('is_read', false);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ notifications: data || [] });
    } catch (err: any) {
        console.error("Notifications GET API error:", err);
        return NextResponse.json({ error: err.message || "Failed to fetch notifications" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { restaurant_id, title, body: notifBody, type, target } = body;

        if (!restaurant_id || !title?.trim()) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { data, error } = await supabaseAdmin
            .from('notifications')
            .insert({
                restaurant_id,
                title: title.trim(),
                body: notifBody ? notifBody.trim() : null,
                type: type || 'info',
                target: target || 'broadcast',
                is_read: false
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, notification: data });
    } catch (err: any) {
        console.error("Notifications POST API error:", err);
        return NextResponse.json({ error: err.message || "Failed to create notification" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, is_read, mark_all_read, restaurant_id } = body;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        if (mark_all_read && restaurant_id) {
            const { error } = await supabaseAdmin
                .from('notifications')
                .update({ is_read: true })
                .eq('restaurant_id', restaurant_id)
                .eq('is_read', false);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (id !== undefined) {
            const { error } = await supabaseAdmin
                .from('notifications')
                .update({ is_read })
                .eq('id', id);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    } catch (err: any) {
        console.error("Notifications PATCH API error:", err);
        return NextResponse.json({ error: err.message || "Failed to update notification" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { error } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Notifications DELETE API error:", err);
        return NextResponse.json({ error: err.message || "Failed to delete notification" }, { status: 500 });
    }
}
