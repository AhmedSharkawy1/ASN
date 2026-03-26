import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { restaurantName: string } }
) {
  try {
    const decodedName = decodeURIComponent(params.restaurantName);
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('name', decodedName)
      .single();

    if (error) throw error;

    return NextResponse.json({ restaurant });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
