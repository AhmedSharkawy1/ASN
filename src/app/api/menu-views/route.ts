import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Missing restaurant_id' }, { status: 400 });
    }

    const planKey = `menu_views_${restaurantId}`;
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('price, features')
      .eq('plan_name', planKey)
      .maybeSingle();

    if (error) {
      console.error('Error getting menu views:', error);
      return NextResponse.json({ views: 0, today: 0 });
    }

    const views = data?.price ? Number(data.price) : 0;
    const features = (data?.features && typeof data.features === 'object') ? (data.features as Record<string, any>) : {};
    const todayStr = new Date().toISOString().split('T')[0];
    const today = features.date === todayStr ? (Number(features.today) || 0) : 0;

    return NextResponse.json({
      views,
      today,
      last_viewed: features.last_viewed || null
    });
  } catch (err: any) {
    console.error('menu-views GET error:', err);
    return NextResponse.json({ views: 0, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { restaurant_id } = body;

    if (!restaurant_id || typeof restaurant_id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid restaurant_id' }, { status: 400 });
    }

    // Ignore demo or template previews
    if (restaurant_id === 'demo' || restaurant_id.length < 5) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const planKey = `menu_views_${restaurant_id}`;

    // Get current views count
    const { data: existing } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, price, features')
      .eq('plan_name', planKey)
      .maybeSingle();

    const currentViews = existing?.price ? Number(existing.price) : 0;
    const newViews = currentViews + 1;
    const todayStr = new Date().toISOString().split('T')[0];

    const currentFeatures = (existing?.features && typeof existing.features === 'object')
      ? (existing.features as Record<string, any>)
      : {};

    const currentToday = currentFeatures.date === todayStr ? (Number(currentFeatures.today) || 0) : 0;
    const updatedFeatures = {
      ...currentFeatures,
      today: currentToday + 1,
      date: todayStr,
      last_viewed: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseAdmin
      .from('subscription_plans')
      .upsert({
        plan_name: planKey,
        price: newViews,
        billing_cycle: 'views',
        features: updatedFeatures,
        is_active: true
      }, { onConflict: 'plan_name' });

    if (upsertError) {
      console.error('Error incrementing menu views:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, views: newViews });
  } catch (err: any) {
    console.error('menu-views POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
