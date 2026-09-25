import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CORS_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurant_id');
    const range = searchParams.get('range') || 'today';
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const includeCancelled = searchParams.get('include_cancelled') === 'true';

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Missing restaurant_id' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const batchSize = 1000;
    let offset = 0;
    const allOrders: any[] = [];
    let cancelledCount = 0;

    while (true) {
      let query = supabaseAdmin
        .from('orders')
        .select('id, order_number, status, is_draft, total, subtotal, deposit_amount, delivery_fee, discount, payment_method, cashier_name, source, items, created_at, order_type')
        .eq('restaurant_id', restaurantId)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });

      if (dateFrom && dateFrom.trim() !== '') {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo && dateTo.trim() !== '') {
        query = query.lte('created_at', dateTo);
      }

      if (!includeCancelled) {
        // We still fetch status to count cancelled if needed, but if excluded:
        // Note: we can fetch all non-draft orders and separate cancelled in memory
        // so we can give accurate counts of both active and cancelled!
      }

      const { data, error } = await query.range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching orders in /api/reports:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500, headers: CORS_HEADERS }
        );
      }

      if (!data || data.length === 0) break;

      allOrders.push(...data);

      if (data.length < batchSize) break;
      offset += batchSize;
    }

    // Separate active vs cancelled
    const activeOrders: any[] = [];
    for (const o of allOrders) {
      if (o.status === 'cancelled') {
        cancelledCount++;
      } else {
        activeOrders.push(o);
      }
    }

    const returnedOrders = includeCancelled ? allOrders : activeOrders;

    return NextResponse.json({
      success: true,
      orders: returnedOrders,
      totalCount: allOrders.length,
      activeCount: activeOrders.length,
      cancelledCount: cancelledCount,
    }, { headers: CORS_HEADERS });

  } catch (err: any) {
    console.error('Reports API fatal error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
