import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Haversine distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenant_id, employee_id, action, // 'check_in' | 'check_out'
      latitude, longitude, face_verified
    } = body;

    if (!tenant_id || !employee_id || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate location against authorized locations
    const { data: locations } = await supabase
      .from("hr_locations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true);

    let matchedLocation = null;
    if (locations && locations.length > 0 && latitude && longitude) {
      for (const loc of locations) {
        const dist = getDistanceMeters(latitude, longitude, loc.latitude, loc.longitude);
        if (dist <= loc.radius_meters) {
          matchedLocation = loc;
          break;
        }
      }
      if (!matchedLocation) {
        return NextResponse.json(
          { error: "خارج نطاق العمل المسموح — Outside allowed work area" },
          { status: 403 }
        );
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    if (action === "check_in") {
      // Check if already checked in
      const { data: existing } = await supabase
        .from("hr_attendance")
        .select("id")
        .eq("employee_id", employee_id)
        .eq("date", today)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "تم تسجيل الحضور مسبقاً — Already checked in" }, { status: 409 });
      }

      const { data, error } = await supabase.from("hr_attendance").insert([{
        tenant_id,
        employee_id,
        date: today,
        check_in: now,
        check_in_lat: latitude,
        check_in_lng: longitude,
        check_in_location_id: matchedLocation?.id || null,
        face_verified_in: !!face_verified,
        status: "present",
      }]).select().single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "check_out") {
      const { data: existing } = await supabase
        .from("hr_attendance")
        .select("id, check_in")
        .eq("employee_id", employee_id)
        .eq("date", today)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: "لم يتم تسجيل الحضور — No check-in found" }, { status: 404 });
      }

      const checkInTime = new Date(existing.check_in);
      const workedHours = Math.round(((Date.now() - checkInTime.getTime()) / 3600000) * 100) / 100;

      const { data, error } = await supabase.from("hr_attendance").update({
        check_out: now,
        check_out_lat: latitude,
        check_out_lng: longitude,
        check_out_location_id: matchedLocation?.id || null,
        face_verified_out: !!face_verified,
        worked_hours: workedHours,
      }).eq("id", existing.id).select().single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("HR Attendance API Error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenant_id = searchParams.get("tenant_id");
    const employee_id = searchParams.get("employee_id");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");

    if (!tenant_id) {
      return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
    }

    let query = supabase
      .from("hr_attendance")
      .select("*, hr_employees(full_name)")
      .eq("tenant_id", tenant_id)
      .order("date", { ascending: false });

    if (employee_id) query = query.eq("employee_id", employee_id);
    if (date_from) query = query.gte("date", date_from);
    if (date_to) query = query.lte("date", date_to);

    const { data, error } = await query.limit(100);
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
