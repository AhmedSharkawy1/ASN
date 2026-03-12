import { NextResponse } from 'next/server';
import { completeProduction } from '@/lib/helpers/inventoryService';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { restaurantId, requestIds, producedBy = 'admin' } = body;

        if (!restaurantId || !Array.isArray(requestIds)) {
            return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
        }

        const results = [];
        let allSuccess = true;

        for (const id of requestIds) {
            const res = await completeProduction(restaurantId, id, producedBy);
            results.push({ id, ...res });
            if (!res?.success) {
                allSuccess = false;
            }
        }

        return NextResponse.json({ success: allSuccess, results });

    } catch (err: unknown) {
        console.error("Bulk Complete Production API Error:", err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
