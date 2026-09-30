import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const tenantId = searchParams.get("tenant_id");
    const actionFilter = searchParams.get("action");
    const search = searchParams.get("search");

    let query = supabaseAdmin
      .from("activity_logs")
      .select("*, restaurants(name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tenantId && tenantId !== "all") {
      query = query.eq("tenant_id", tenantId);
    }

    if (actionFilter && actionFilter !== "الكل" && actionFilter !== "all") {
      query = query.ilike("action", `%${actionFilter}%`);
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[API /admin/logs GET] Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logs: data || [],
      total: count || 0,
    });
  } catch (err: any) {
    console.error("[API /admin/logs GET] Exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, description, target_type, target_id, tenant_id, user_id } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: "Action is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("activity_logs")
      .insert({
        action,
        description: description || null,
        target_type: target_type || "system",
        target_id: target_id || null,
        tenant_id: tenant_id || null,
        user_id: user_id || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[API /admin/logs POST] Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log: data });
  } catch (err: any) {
    console.error("[API /admin/logs POST] Exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to insert activity log" },
      { status: 500 }
    );
  }
}
