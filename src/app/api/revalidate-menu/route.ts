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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId);
    const query = supabase.from('restaurants').select('id, slug');
    const { data } = isUuid
      ? await query.eq('id', restaurantId).maybeSingle()
      : await query.eq('slug', restaurantId).maybeSingle();

    const actualId = data?.id || (isUuid ? restaurantId : null);
    const slug = data?.slug || (!isUuid ? restaurantId : null);

    if (actualId) {
      revalidateTag(`menu-${actualId}`);
      revalidatePath(`/menu/${actualId}`);
      revalidatePath(`/menu/${actualId}`, 'page');
    }

    if (slug) {
      revalidateTag(`menu-${slug}`);
      revalidatePath(`/menu/${slug}`);
      revalidatePath(`/menu/${slug}`, 'page');
    }

    return NextResponse.json({ revalidated: true, slug });
  } catch {
    return NextResponse.json({ error: "Failed to revalidate" }, { status: 500 });
  }
}
