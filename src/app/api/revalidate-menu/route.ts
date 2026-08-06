import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

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

    // Purge the cached page for this restaurant's menu
    revalidatePath(`/menu/${restaurantId}`);

    return NextResponse.json({ revalidated: true });
  } catch {
    return NextResponse.json({ error: "Failed to revalidate" }, { status: 500 });
  }
}
