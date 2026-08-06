import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/revalidate-menu
 * Body: { restaurantId: string }
 *
 * Purges the Next.js data cache for a restaurant's public menu so changes
 * (item visibility, prices, etc.) are reflected immediately instead of
 * waiting for the 60-second revalidation window.
 */
export async function POST(req: NextRequest) {
  try {
    const { restaurantId } = await req.json();
    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.from('restaurants').select('slug').eq('id', restaurantId).single();
    const slug = data?.slug;

    // Purge the Data Cache for the UUID
    revalidateTag(`menu-${restaurantId}`);
    revalidatePath(`/menu/${restaurantId}`);
    revalidatePath(`/menu/${restaurantId}`, 'page');

    if (slug) {
      // Purge the Data Cache for the slug
      revalidateTag(`menu-${slug}`);
      revalidatePath(`/menu/${slug}`);
      revalidatePath(`/menu/${slug}`, 'page');
    }

    return NextResponse.json({ revalidated: true, slug });
  } catch {
    return NextResponse.json({ error: "Failed to revalidate" }, { status: 500 });
  }
}
