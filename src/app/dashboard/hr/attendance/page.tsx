"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  MapPin, Camera, Clock, CalendarCheck, UserCheck, UserX,
  Search, Filter, ChevronDown, AlertTriangle, CheckCircle2, X, Scan
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";

interface Employee {
  id: string;
  full_name: string;
  face_descriptor: number[] | null;
  profile_photo_url: string | null;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_lat: number | null;
  status: string;
  worked_hours: number;
  face_verified_in: boolean;
  face_verified_out: boolean;
  notes: string | null;
  hr_employees: { full_name: string } | null;
}

interface WorkLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

// Haversine distance calculation
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function AttendancePage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");

  // Check-in modal
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [checkInMode, setCheckInMode] = useState<'in' | 'out'>('in');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMatch, setLocationMatch] = useState<WorkLocation | null>(null);
  const [faceStatus, setFaceStatus] = useState<'idle' | 'scanning' | 'verified' | 'failed'>('idle');
  const [processing, setProcessing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<any>(null);

  // Location Management
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locForm, setLocForm] = useState({ name: "", latitude: 0, longitude: 0, radius_meters: 200 });

  // Load face-api.js models once
  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapi = await import('face-api.js');
        faceapiRef.current = faceapi;
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
          ]);
        }
        setModelsLoaded(true);
        console.log('ASN_LOG: Face-api.js models loaded ✅');
      } catch (err) {
        console.error('ASN_LOG: Failed to load face models', err);
      }
    };
    loadModels();
  }, []);

  const fetchData = useCallback(async (rId: string) => {
    setLoading(true);
    try {
      const [{ data: emps }, { data: att }, { data: locs }] = await Promise.all([
        supabase.from('hr_employees').select('id, full_name, face_descriptor, profile_photo_url').eq('tenant_id', rId).eq('is_active', true),
        supabase.from('hr_attendance').select('*, hr_employees(full_name)').eq('tenant_id', rId).eq('date', selectedDate).order('created_at', { ascending: false }),
        supabase.from('hr_locations').select('*').eq('tenant_id', rId).eq('is_active', true),
      ]);
      setEmployees(emps || []);
      setRecords(att || []);
      setLocations(locs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const imp = sessionStorage.getItem('impersonating_tenant');
      const { data: rest } = await supabase
        .from('restaurants').select('id')
        .eq(imp ? 'id' : 'email', imp || session.user.email).single();
      if (rest) {
        setRestaurantId(rest.id);
        fetchData(rest.id);
      }
    };
    init();
  }, [fetchData]);

  const openCheckIn = async (emp: Employee, mode: 'in' | 'out') => {
    setSelectedEmployee(emp);
    setCheckInMode(mode);
    setGpsStatus('idle');
    setGpsCoords(null);
    setLocationMatch(null);
    setFaceStatus('idle');
    setMatchScore(null);
    setIsCheckInOpen(true);

    // Start GPS
    setGpsStatus('loading');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setGpsCoords(coords);

      // Check if within any authorized location
      const match = locations.find(loc => {
        const dist = getDistanceMeters(coords.lat, coords.lng, loc.latitude, loc.longitude);
        return dist <= loc.radius_meters;
      });

      if (match) {
        setLocationMatch(match);
        setGpsStatus('success');
      } else {
        setGpsStatus('error');
        toast.error(isAr ? "⚠️ أنت خارج نطاق العمل المسموح!" : "⚠️ You are outside allowed work area!");
      }
    } catch {
      setGpsStatus('error');
      toast.error(isAr ? "فشل في تحديد الموقع" : "Failed to get location");
    }

    // Start camera for face scan
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error(isAr ? "الكاميرا غير مدعومة. يرجى التأكد من استخدام (HTTPS)" : "Camera not supported. Please ensure you use (HTTPS)");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err: any) {
      console.error(err);
      toast.error(isAr ? "لا يمكن فتح الكاميرا: " + (err.message || "") : "Cannot open camera: " + (err.message || ""));
    }
  };

  // Euclidean distance between two face descriptors
  const euclideanDistance = (a: number[], b: number[]): number => {
    return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
  };

  const verifyFace = async () => {
    setFaceStatus('scanning');

    if (!selectedEmployee?.face_descriptor) {
      // No face registered — allow but warn
      setFaceStatus('verified');
      toast.info(isAr ? "⚠️ لم يتم تسجيل بصمة وجه لهذا الموظف — التحقق مؤجل" : "⚠️ No face registered — verification skipped");
      return;
    }

    const faceapi = faceapiRef.current;
    if (!faceapi || !modelsLoaded) {
      toast.error(isAr ? "نماذج التعرف على الوجه لم تُحمّل بعد" : "Face models not loaded yet");
      setFaceStatus('idle');
      return;
    }

    try {
      // Capture frame from video to canvas
      if (!videoRef.current || !canvasRef.current) {
        toast.error(isAr ? "الكاميرا غير متاحة" : "Camera not available");
        setFaceStatus('idle');
        return;
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;

      // Detect face directly from the video element to preserve aspect ratios
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error(isAr ? "❌ لم يتم اكتشاف وجه. أقترب قليلاً وتأكد من الإضاءة" : "❌ No face detected. Get closer and check lighting");
        setFaceStatus('failed');
        return;
      }

      // Compare descriptors
      const liveDescriptor = Array.from(detection.descriptor) as number[];
      const storedDescriptor = selectedEmployee.face_descriptor;
      const distance = euclideanDistance(liveDescriptor, storedDescriptor);
      const similarity = Math.round((1 - Math.min(distance, 1)) * 100);
      setMatchScore(similarity);

      console.log(`ASN_LOG: Face match distance=${distance.toFixed(4)}, similarity=${similarity}%`);

      // Threshold: distance < 0.6 = same person (face-api.js standard)
      if (distance < 0.6) {
        setFaceStatus('verified');
        toast.success(isAr ? `✅ تم التحقق من الوجه بنجاح (${similarity}% تطابق)` : `✅ Face verified (${similarity}% match)`);
      } else {
        setFaceStatus('failed');
        toast.error(isAr ? `❌ الوجه لا يتطابق مع الموظف المسجل (${similarity}% تطابق)` : `❌ Face does not match (${similarity}% match)`);
      }
    } catch (err) {
      console.error('ASN_LOG: Face verification error', err);
      toast.error(isAr ? "حدث خطأ أثناء التحقق من الوجه" : "Face verification error");
      setFaceStatus('failed');
    }
  };

  const submitAttendance = async () => {
    if (!selectedEmployee || !restaurantId) return;
    if (gpsStatus !== 'success') {
      toast.error(isAr ? "يجب أن تكون داخل نطاق العمل" : "Must be within work area");
      return;
    }
    if (faceStatus !== 'verified') {
      toast.error(isAr ? "يرجى التحقق من الوجه أولاً" : "Please verify face first");
      return;
    }

    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];

      if (checkInMode === 'in') {
        // Check if already checked in today
        const { data: existing } = await supabase.from('hr_attendance')
          .select('id').eq('employee_id', selectedEmployee.id).eq('date', today).maybeSingle();

        if (existing) {
          toast.error(isAr ? "تم تسجيل الحضور مسبقاً اليوم" : "Already checked in today");
          setProcessing(false);
          return;
        }

        await supabase.from('hr_attendance').insert([{
          tenant_id: restaurantId,
          employee_id: selectedEmployee.id,
          date: today,
          check_in: now,
          check_in_lat: gpsCoords?.lat,
          check_in_lng: gpsCoords?.lng,
          check_in_location_id: locationMatch?.id,
          face_verified_in: true,
          status: 'present',
        }]);
        toast.success(isAr ? "✅ تم تسجيل الحضور" : "✅ Check-in recorded");
      } else {
        // Check out
        const { data: existing } = await supabase.from('hr_attendance')
          .select('id, check_in').eq('employee_id', selectedEmployee.id).eq('date', today).maybeSingle();

        if (!existing) {
          toast.error(isAr ? "لم يتم تسجيل الحضور اليوم" : "No check-in found today");
          setProcessing(false);
          return;
        }

        const checkInTime = new Date(existing.check_in);
        const workedHours = Math.round(((Date.now() - checkInTime.getTime()) / 3600000) * 100) / 100;

        await supabase.from('hr_attendance').update({
          check_out: now,
          check_out_lat: gpsCoords?.lat,
          check_out_lng: gpsCoords?.lng,
          check_out_location_id: locationMatch?.id,
          face_verified_out: true,
          worked_hours: workedHours,
        }).eq('id', existing.id);
        toast.success(isAr ? `✅ تم تسجيل الانصراف (${workedHours} ساعة)` : `✅ Check-out recorded (${workedHours}h)`);
      }

      closeCheckIn();
      fetchData(restaurantId);
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "حدث خطأ" : "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const closeCheckIn = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCheckInOpen(false);
  };

  const addLocation = async () => {
    if (!locForm.name || !restaurantId) return;
    const { error } = await supabase.from('hr_locations').insert([{ ...locForm, tenant_id: restaurantId }]);
    if (error) { toast.error(isAr ? "فشل الإضافة" : "Failed"); return; }
    toast.success(isAr ? "تمت إضافة الموقع" : "Location added");
    setShowLocationModal(false);
    fetchData(restaurantId);
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      setLocForm(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
      toast.success(isAr ? "تم تحديد الموقع" : "Location captured");
    }, () => toast.error(isAr ? "فشل تحديد الموقع" : "Location failed"));
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { ar: string; cls: string }> = {
      present: { ar: "حاضر", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
      absent: { ar: "غائب", cls: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" },
      late: { ar: "متأخر", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
      early_leave: { ar: "انصراف مبكر", cls: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" },
      holiday: { ar: "إجازة", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
      excused: { ar: "عذر", cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400" },
    };
    const item = map[s] || map.absent;
    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${item.cls}`}>{item.ar}</span>;
  };

  const checkedInIds = new Set(records.map(r => r.employee_id));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500" />
          <span className="text-slate-500 text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {isAr ? "نظام الحضور والانصراف" : "Attendance Tracking"}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            {isAr ? "تسجيل الحضور ببصمة الوجه والتحقق من الموقع" : "Check-in with face recognition & location verification"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setLocForm({ name: "", latitude: 0, longitude: 0, radius_meters: 200 }); setShowLocationModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-700 text-slate-700 dark:text-white font-bold rounded-xl shadow-sm transition-colors hover:bg-stone-50 dark:hover:bg-white/5">
            <MapPin className="w-4 h-4 text-teal-500" />
            {isAr ? "مواقع العمل" : "Locations"}
          </button>
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); }}
            className="px-4 py-2.5 bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      </div>

      {/* Employee Cards for Check-in */}
      <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm p-4">
        <h2 className="text-lg font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Scan className="w-5 h-5 text-teal-500" />
          {isAr ? "تسجيل الحضور السريع" : "Quick Attendance"}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {employees.map(emp => {
            const isCheckedIn = checkedInIds.has(emp.id);
            const record = records.find(r => r.employee_id === emp.id);
            const hasCheckedOut = record?.check_out;

            return (
              <div key={emp.id} className={`p-4 rounded-2xl border transition-all duration-300 ${isCheckedIn ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20' : 'bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-stone-700'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {emp.profile_photo_url ? (
                    <img src={emp.profile_photo_url} alt={emp.full_name} className={`w-10 h-10 rounded-xl object-cover shadow-md ${isCheckedIn ? 'ring-2 ring-emerald-500' : ''}`} />
                  ) : (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-md ${isCheckedIn ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-stone-400 to-stone-500'}`}>
                      {emp.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{emp.full_name}</div>
                    {isCheckedIn && record?.check_in && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {new Date(record.check_in).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
                {!isCheckedIn ? (
                  <button onClick={() => openCheckIn(emp, 'in')}
                    className="w-full py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs font-extrabold rounded-xl transition-all hover:shadow-lg">
                    {isAr ? "📸 تسجيل حضور" : "📸 Check In"}
                  </button>
                ) : !hasCheckedOut ? (
                  <button onClick={() => openCheckIn(emp, 'out')}
                    className="w-full py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-extrabold rounded-xl transition-all hover:shadow-lg">
                    {isAr ? "🔴 تسجيل انصراف" : "🔴 Check Out"}
                  </button>
                ) : (
                  <div className="w-full py-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ✅ {isAr ? "مكتمل" : "Complete"} ({record?.worked_hours}h)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Locations List */}
      {locations.length > 0 && (
        <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm p-4">
          <h3 className="text-sm font-extrabold text-slate-500 dark:text-zinc-400 uppercase mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> {isAr ? "مواقع العمل المسجلة" : "Registered Locations"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {locations.map(loc => (
              <div key={loc.id} className="px-3 py-2 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm">
                <span className="font-bold text-slate-800 dark:text-white">{loc.name}</span>
                <span className="text-xs text-slate-400 mr-2"> ({loc.radius_meters}{isAr ? "م" : "m"})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-teal-500" />
            {isAr ? `سجل الحضور — ${selectedDate}` : `Attendance — ${selectedDate}`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الموظف" : "Employee"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الحضور" : "Check In"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الانصراف" : "Check Out"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "ساعات العمل" : "Hours"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "التحقق" : "Verify"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {records.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">{isAr ? "لا توجد سجلات لهذا اليوم" : "No records for this date"}</td></tr>
              ) : records.map(rec => (
                <tr key={rec.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3 font-bold text-slate-800 dark:text-white">{rec.hr_employees?.full_name || "—"}</td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-zinc-300">
                    {rec.check_in ? new Date(rec.check_in).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-zinc-300">
                    {rec.check_out ? new Date(rec.check_out).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-slate-800 dark:text-white">{rec.worked_hours || 0} {isAr ? "ساعة" : "h"}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      {rec.face_verified_in && <span className="text-emerald-500" title={isAr ? "وجه محقق" : "Face verified"}>📸</span>}
                      {rec.check_in_lat && <span className="text-blue-500" title={isAr ? "موقع محقق" : "Location verified"}>📍</span>}
                    </div>
                  </td>
                  <td className="px-6 py-3">{statusLabel(rec.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Check-In Modal */}
      {isCheckInOpen && selectedEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131b26] w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-teal-500 to-emerald-600 text-white">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                {checkInMode === 'in' ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                {checkInMode === 'in' ? (isAr ? "تسجيل حضور" : "Check In") : (isAr ? "تسجيل انصراف" : "Check Out")}
              </h2>
              <button onClick={closeCheckIn} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Employee name */}
              <div className="text-center">
                {selectedEmployee.profile_photo_url ? (
                  <img src={selectedEmployee.profile_photo_url} alt={selectedEmployee.full_name} className="w-14 h-14 rounded-2xl object-cover shadow-lg mx-auto mb-2" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg mx-auto mb-2">
                    {selectedEmployee.full_name.charAt(0)}
                  </div>
                )}
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">{selectedEmployee.full_name}</h3>
              </div>

              {/* GPS Status */}
              <div className={`p-4 rounded-2xl border ${gpsStatus === 'success' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : gpsStatus === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20' : 'bg-stone-50 border-stone-200 dark:bg-white/5 dark:border-stone-700'}`}>
                <div className="flex items-center gap-3">
                  <MapPin className={`w-5 h-5 ${gpsStatus === 'success' ? 'text-emerald-500' : gpsStatus === 'error' ? 'text-red-500' : 'text-slate-400'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700 dark:text-white">
                      {gpsStatus === 'loading' ? (isAr ? "جاري تحديد الموقع..." : "Getting location...") :
                        gpsStatus === 'success' ? (isAr ? `✅ داخل نطاق: ${locationMatch?.name}` : `✅ Inside: ${locationMatch?.name}`) :
                          gpsStatus === 'error' ? (isAr ? "❌ خارج نطاق العمل" : "❌ Outside work area") :
                            (isAr ? "في الانتظار..." : "Waiting...")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Camera for Face Verification */}
              <div className="space-y-3">
                <div className="relative w-full rounded-2xl overflow-hidden border-2 border-stone-200 dark:border-stone-700 bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  {faceStatus === 'scanning' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-400" />
                    </div>
                  )}
                  {faceStatus === 'verified' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30">
                      <CheckCircle2 className="w-16 h-16 text-white drop-shadow-lg" />
                    </div>
                  )}
                  {faceStatus === 'failed' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                      <X className="w-16 h-16 text-white drop-shadow-lg" />
                    </div>
                  )}
                </div>

                {faceStatus === 'verified' ? (
                  <div className="text-center py-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    ✅ {isAr ? "تم التحقق من الوجه" : "Face Verified"} {matchScore !== null && `(${matchScore}%)`}
                  </div>
                ) : faceStatus === 'failed' ? (
                  <div className="space-y-2">
                    <div className="text-center py-1 text-red-500 font-bold text-sm">
                      ❌ {isAr ? "فشل التحقق" : "Verification Failed"} {matchScore !== null && `(${matchScore}%)`}
                    </div>
                    <button onClick={verifyFace}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2">
                      <Camera className="w-5 h-5" />
                      {isAr ? "🔄 إعادة المحاولة" : "🔄 Retry"}
                    </button>
                  </div>
                ) : (
                  <button onClick={verifyFace} disabled={faceStatus === 'scanning'}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-extrabold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    <Camera className="w-5 h-5" />
                    {faceStatus === 'scanning' ? (isAr ? "جاري المسح..." : "Scanning...") : (isAr ? "📸 التحقق من الوجه" : "📸 Verify Face")}
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-white/5 flex gap-3">
              <button onClick={closeCheckIn}
                className="flex-1 py-3 px-4 rounded-2xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold hover:bg-stone-50 dark:hover:bg-white/10 transition-colors">
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={submitAttendance} disabled={processing || gpsStatus !== 'success' || faceStatus !== 'verified'}
                className="flex-[2] py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-extrabold shadow-xl shadow-teal-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {processing ? (isAr ? "جاري التسجيل..." : "Recording...") : checkInMode === 'in' ? (isAr ? "✅ تسجيل الحضور" : "✅ Confirm Check In") : (isAr ? "✅ تسجيل الانصراف" : "✅ Confirm Check Out")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131b26] w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">{isAr ? "إضافة موقع عمل" : "Add Work Location"}</h2>
              <button onClick={() => setShowLocationModal(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "اسم الموقع" : "Location Name"}</label>
                <input type="text" value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.target.value })}
                  placeholder={isAr ? "مثال: الفرع الرئيسي" : "e.g. Main Branch"}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "خط العرض" : "Latitude"}</label>
                  <input type="number" step="any" value={locForm.latitude} onChange={e => setLocForm({ ...locForm, latitude: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "خط الطول" : "Longitude"}</label>
                  <input type="number" step="any" value={locForm.longitude} onChange={e => setLocForm({ ...locForm, longitude: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white text-sm" />
                </div>
              </div>
              <button onClick={getCurrentLocation}
                className="w-full py-2.5 border-2 border-dashed border-teal-300 dark:border-teal-700 rounded-xl text-sm font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/5 transition-colors">
                📍 {isAr ? "استخدام موقعي الحالي" : "Use My Current Location"}
              </button>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "نطاق السماح (متر)" : "Radius (meters)"}</label>
                <input type="number" value={locForm.radius_meters} onChange={e => setLocForm({ ...locForm, radius_meters: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowLocationModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold transition-colors">
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button onClick={addLocation}
                  className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-extrabold shadow-xl shadow-teal-500/20 transition-all">
                  {isAr ? "حفظ الموقع" : "Save Location"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
