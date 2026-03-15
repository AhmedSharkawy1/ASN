import { NextResponse } from 'next/server';
import { createBranchSupply } from '@/lib/helpers/branchSupplyService';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        
        // Ensure valid payload
        if (!payload.restaurant_id || !payload.customer_name || !payload.items || payload.items.length === 0) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const result = await createBranchSupply(payload);

        if (result.success) {
            return NextResponse.json({ success: true, order: result.order });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }

    } catch (error: unknown) {
        console.error("Branch supply API error:", error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
