import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key since this is a public API that needs to query tenants
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name')
      .order('name');

    if (error) throw error;

    return NextResponse.json({ restaurants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
