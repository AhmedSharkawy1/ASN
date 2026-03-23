import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const euclideanDistance = (a: number[], b: number[]): number => {
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
};

export async function POST(req: Request) {
  try {
    const { restaurant_id, descriptor, latitude, longitude } = await req.json();

    if (!restaurant_id || !descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // 1. Fetch employees for this restaurant who have a face descriptor
    const { data: employees, error: empError } = await supabase
      .from('hr_employees')
      .select('id, full_name, face_descriptor')
      .eq('tenant_id', restaurant_id)
      .eq('is_active', true)
      .not('face_descriptor', 'is', null);

    if (empError) throw empError;
    if (!employees || employees.length === 0) {
      return NextResponse.json({ error: 'No registered faces in this restaurant' }, { status: 404 });
    }

    // 2. Find the closest match
    let bestMatch = null;
    let minDistance = Infinity;

    for (const emp of employees) {
      if (emp.face_descriptor && Array.isArray(emp.face_descriptor)) {
        const dist = euclideanDistance(descriptor, emp.face_descriptor);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = emp;
        }
      }
    }

    // Convert to similarity %
    const similarity = Math.round((1 - Math.min(minDistance, 1)) * 100);

    // Require 70% match exactly like dashboard
    if (!bestMatch || similarity < 70) {
      return NextResponse.json({ 
        error: 'Face not matched', 
        message: `عذراً، لم يتم التعرف على وجهك (التطابق: ${similarity}%)` 
      }, { status: 400 });
    }

    // 3. Match found! Check location
    let locationVerified = false;
    let authLocationId = null;

    if (latitude && longitude) {
      const { data: locations } = await supabase
        .from('hr_locations')
        .select('*')
        .eq('tenant_id', restaurant_id)
        .eq('is_active', true);

      if (locations && locations.length > 0) {
        for (const loc of locations) {
          const R = 6371e3; // Earth radius in meters
          const lat1 = latitude * Math.PI / 180;
          const lat2 = loc.latitude * Math.PI / 180;
          const dLat = (loc.latitude - latitude) * Math.PI / 180;
          const dLng = (loc.longitude - longitude) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1) * Math.cos(lat2) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distanceMeters = R * c;

          if (distanceMeters <= loc.radius_meters) {
            locationVerified = true;
            authLocationId = loc.id;
            break;
          }
        }
        
        if (!locationVerified) {
          return NextResponse.json({ 
            error: 'Outside allowed location', 
            message: `عذراً يا ${bestMatch.full_name}، أنت لست داخل النطاق الجغرافي المسموح به للعمل!` 
          }, { status: 403 });
        }
      } else {
        locationVerified = true; // No locations defined = ignore
      }
    } else {
      // Missing latitude/longitude entirely. Check if restaurant actually requires it.
      const { data: locations } = await supabase.from('hr_locations').select('id').eq('tenant_id', restaurant_id).eq('is_active', true).limit(1);
      if (locations && locations.length > 0) {
        return NextResponse.json({ 
          error: 'Location required', 
          message: `عذراً، يجب السماح بتحديد الموقع الجغرافي لتسجيل الحضور!` 
        }, { status: 403 });
      }
    }

    // 4. Check today's attendance for this employee
    const today = new Date().toISOString().split('T')[0];
    const { data: records, error: recError } = await supabase
      .from('hr_attendance')
      .select('*')
      .eq('employee_id', bestMatch.id)
      .eq('date', today)
      .maybeSingle();

    if (recError && recError.code !== 'PGRST116') throw recError;

    const now = new Date().toISOString();

    if (!records) {
      // Create CHECK IN
      const { error: insertErr } = await supabase.from('hr_attendance').insert({
        tenant_id: restaurant_id,
        employee_id: bestMatch.id,
        date: today,
        check_in: now,
        check_in_lat: latitude || null,
        check_in_lng: longitude || null,
        check_in_location_id: authLocationId,
        face_verified_in: true,
        status: 'present'
      });
      if (insertErr) throw insertErr;
      
      return NextResponse.json({ 
        action: 'check-in', 
        employee: bestMatch.full_name,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        message: `تم تسجيل حضورك بنجاح يا ${bestMatch.full_name}`
      });
      
    } else if (records && !records.check_out) {
      // Create CHECK OUT
      const checkInTime = new Date(records.check_in!).getTime();
      const checkOutTime = new Date(now).getTime();
      const workedHours = Number(((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2));

      const { error: updateErr } = await supabase.from('hr_attendance').update({
        check_out: now,
        check_out_lat: latitude || null,
        check_out_lng: longitude || null,
        check_out_location_id: authLocationId,
        face_verified_out: true,
        worked_hours: workedHours
      }).eq('id', records.id);
      
      if (updateErr) throw updateErr;

      return NextResponse.json({ 
        action: 'check-out', 
        employee: bestMatch.full_name,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        hours: workedHours,
        message: `تم تسجيل انصرافك. عدد الساعات حتى الآن: ${workedHours} ساعة`
      });

    } else {
      // Already checked out
      return NextResponse.json({ 
        action: 'already-done', 
        employee: bestMatch.full_name,
        message: `لقد قمت بتسجيل الحضور والانصراف مسبقاً اليوم يا ${bestMatch.full_name}`
      });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
