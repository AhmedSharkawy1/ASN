"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Users, Search, Plus, X, Check, Camera, Trash2,
  Edit3, DollarSign, Calendar, Briefcase, Phone, CreditCard, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";

interface Employee {
  id: string;
  full_name: string;
  phone: string | null;
  national_id: string | null;
  department: string;
  job_title: string | null;
  hire_date: string | null;
  base_salary: number;
  face_descriptor: number[] | null;
  profile_photo_url: string | null;
  is_active: boolean;
}

export default function EmployeesPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", national_id: "", department: "عام",
    job_title: "", hire_date: "", base_salary: 0,
  });

  // Face registration
  const [showCamera, setShowCamera] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceapiRef = useRef<any>(null);

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
        console.log('ASN_LOG: Face-api.js models loaded in Employees Page ✅');
      } catch (err) {
        console.error('ASN_LOG: Failed to load face models', err);
      }
    };
    loadModels();
  }, []);

  const fetchEmployees = useCallback(async (rId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('*')
        .eq('tenant_id', rId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "فشل تحميل الموظفين" : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const imp = sessionStorage.getItem('impersonating_tenant');
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id')
        .eq(imp ? 'id' : 'email', imp || session.user.email)
        .single();
      if (rest) {
        setRestaurantId(rest.id);
        fetchEmployees(rest.id);
      }
    };
    init();
  }, [fetchEmployees]);

  const openAddModal = () => {
    setEditingEmployee(null);
    setForm({ full_name: "", phone: "", national_id: "", department: "عام", job_title: "", hire_date: "", base_salary: 0 });
    setFaceDescriptor(null);
    setFaceRegistered(false);
    setPhotoUrl(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      full_name: emp.full_name,
      phone: emp.phone || "",
      national_id: emp.national_id || "",
      department: emp.department || "عام",
      job_title: emp.job_title || "",
      hire_date: emp.hire_date || "",
      base_salary: emp.base_salary || 0,
    });
    setFaceDescriptor(emp.face_descriptor);
    setFaceRegistered(!!emp.face_descriptor);
    setPhotoUrl(emp.profile_photo_url || null);
    setIsModalOpen(true);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      streamRef.current = stream;
      // Show camera UI first (this renders the <video> element)
      setShowCamera(true);
    } catch {
      toast.error(isAr ? "لا يمكن الوصول للكاميرا" : "Cannot access camera");
    }
  };

  // Attach stream to video element AFTER it's rendered in the DOM
  useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showCamera]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Wait for video to have actual frames (up to 3 seconds)
    let retries = 0;
    while ((!video.videoWidth || !video.videoHeight) && retries < 15) {
      await new Promise(r => setTimeout(r, 200));
      retries++;
    }
    if (!video.videoWidth || !video.videoHeight) {
      toast.error(isAr ? "الكاميرا لم تبدأ بعد. أغلق وافتح مرة أخرى" : "Camera not ready. Close and try again");
      return;
    }

    // Step 1: ALWAYS capture the photo first
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL('image/jpeg', 0.7);
    setPhotoUrl(photoData);

    // Step 2: Try to extract face descriptor (best-effort)
    const faceapi = faceapiRef.current;
    if (faceapi && modelsLoaded) {
      const toastId = toast.loading(isAr ? "جاري تحليل ملامح الوجه..." : "Analyzing face features...");
      try {
        // Try multiple detection approaches for best results
        let detection = await faceapi
          .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        // If first attempt fails, try with different inputSize
        if (!detection) {
          detection = await faceapi
            .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.1 }))
            .withFaceLandmarks()
            .withFaceDescriptor();
        }

        if (detection) {
          setFaceDescriptor(Array.from(detection.descriptor));
          setFaceRegistered(true);
          toast.success(isAr ? "تم تسجيل الصورة وبصمة الوجه بنجاح ✅" : "Photo and face features saved ✅", { id: toastId });
        } else {
          // Photo saved but no face descriptor
          setFaceRegistered(true);
          toast.success(isAr ? "📸 تم حفظ الصورة (بدون بصمة ذكية — يمكنك إعادة المحاولة)" : "📸 Photo saved (no AI face — you can retry)", { id: toastId });
        }
      } catch (err: any) {
        console.error("ASN_LOG: Face descriptor extraction error:", err);
        setFaceRegistered(true);
        toast.success(isAr ? "📸 تم حفظ الصورة بنجاح" : "📸 Photo saved", { id: toastId });
      }
    } else {
      // Models not loaded — just save photo
      setFaceRegistered(true);
      toast.success(isAr ? "📸 تم حفظ الصورة بنجاح" : "📸 Photo saved");
    }
    stopCamera();
  };

  const handleSave = async () => {
    if (!form.full_name) {
      toast.error(isAr ? "يرجى إدخال اسم الموظف" : "Please enter employee name");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenant_id: restaurantId,
        full_name: form.full_name,
        phone: form.phone || null,
        national_id: form.national_id || null,
        department: form.department,
        job_title: form.job_title || null,
        hire_date: form.hire_date || null,
        base_salary: form.base_salary,
        face_descriptor: faceDescriptor,
        profile_photo_url: photoUrl,
      };

      if (editingEmployee) {
        const { error } = await supabase.from('hr_employees').update(payload).eq('id', editingEmployee.id);
        if (error) throw error;
        toast.success(isAr ? "تم تحديث بيانات الموظف" : "Employee updated");
      } else {
        const { error } = await supabase.from('hr_employees').insert([payload]);
        if (error) throw error;
        toast.success(isAr ? "تمت إضافة الموظف بنجاح" : "Employee added");
      }
      setIsModalOpen(false);
      if (restaurantId) fetchEmployees(restaurantId);
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "فشل في حفظ البيانات" : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (emp: Employee) => {
    const { error } = await supabase.from('hr_employees').update({ is_active: !emp.is_active }).eq('id', emp.id);
    if (!error) {
      toast.success(isAr ? "تم التحديث" : "Updated");
      if (restaurantId) fetchEmployees(restaurantId);
    }
  };

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.department && e.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const DEPARTMENTS = ["عام", "المطبخ", "الخدمة", "الإدارة", "المحاسبة", "التوصيل", "التنظيف", "الأمن"];

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {isAr ? "إدارة الموظفين" : "Employee Management"}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">
            {isAr ? "إضافة وتعديل بيانات الموظفين وتسجيل بصمة الوجه" : "Add, edit employees and register face recognition"}
          </p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all w-fit">
          <Plus className="w-4 h-4" />
          {isAr ? "إضافة موظف" : "Add Employee"}
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 dark:border-stone-800">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={isAr ? "ابحث بالاسم أو القسم..." : "Search by name or department..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all dark:text-white"
            />
          </div>
        </div>

        {/* Employees Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الموظف" : "Employee"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "القسم" : "Department"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "المسمى الوظيفي" : "Job Title"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الراتب" : "Salary"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "بصمة الوجه" : "Face"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{isAr ? "الحالة" : "Status"}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase text-right">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">{isAr ? "جاري التحميل..." : "Loading..."}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">{isAr ? "لا يوجد موظفين" : "No employees found"}</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {emp.profile_photo_url ? (
                        <img src={emp.profile_photo_url} alt={emp.full_name} className="w-10 h-10 rounded-xl object-cover shadow-md" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                          {emp.full_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{emp.full_name}</div>
                        {emp.phone && <div className="text-xs text-slate-400">{emp.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-zinc-300">{emp.department}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-zinc-300">{emp.job_title || "—"}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">{emp.base_salary?.toLocaleString()} ج.م</td>
                  <td className="px-6 py-4">
                    {emp.face_descriptor ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <UserCheck className="w-3 h-3" /> {isAr ? "مسجل" : "Registered"}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        {isAr ? "غير مسجل" : "Not Set"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(emp)} className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${emp.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                      {emp.is_active ? (isAr ? "نشط" : "Active") : (isAr ? "معطل" : "Inactive")}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(emp)} className="p-2 text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors bg-stone-50 dark:bg-stone-800 rounded-lg opacity-0 group-hover:opacity-100">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131b26] w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-white/5">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
                {editingEmployee ? (isAr ? "تعديل بيانات الموظف" : "Edit Employee") : (isAr ? "إضافة موظف جديد" : "Add New Employee")}
              </h2>
              <button onClick={() => { setIsModalOpen(false); stopCamera(); }} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "الاسم الكامل *" : "Full Name *"}</label>
                <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "رقم الهاتف" : "Phone"}</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "الرقم القومي" : "National ID"}</label>
                  <input type="text" value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "القسم" : "Department"}</label>
                  <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "المسمى الوظيفي" : "Job Title"}</label>
                  <input type="text" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "تاريخ التعيين" : "Hire Date"}</label>
                  <input type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">{isAr ? "الراتب الأساسي (ج.م)" : "Base Salary (EGP)"}</label>
                  <input type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 dark:text-white" />
                </div>
              </div>

              {/* Face Registration */}
              <div className="border border-stone-200 dark:border-stone-700 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-extrabold text-slate-700 dark:text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-teal-500" />
                    {isAr ? "تسجيل بصمة الوجه" : "Face Registration"}
                  </h3>
                  {faceRegistered ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Check className="w-3 h-3" /> {isAr ? "تم التسجيل" : "Registered"}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-500">{isAr ? "غير مسجل" : "Not registered"}</span>
                  )}
                </div>

                {showCamera ? (
                  <div className="space-y-3">
                    <div className="relative w-full max-w-xs mx-auto rounded-xl overflow-hidden border-2 border-teal-500/30">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
                      <div className="absolute inset-0 border-4 border-teal-400/20 rounded-xl pointer-events-none" />
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-2 justify-center">
                      <button onClick={capturePhoto} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl text-sm transition-colors">
                        {isAr ? "📸 التقاط" : "📸 Capture"}
                      </button>
                      <button onClick={stopCamera} className="px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-white font-bold rounded-xl text-sm transition-colors">
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={startCamera}
                    className="w-full py-3 border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl text-sm font-bold text-stone-500 dark:text-zinc-400 hover:border-teal-500 hover:text-teal-500 transition-colors">
                    {faceRegistered ? (isAr ? "📷 إعادة تسجيل الوجه" : "📷 Re-register Face") : (isAr ? "📷 فتح الكاميرا لتسجيل الوجه" : "📷 Open Camera to Register Face")}
                  </button>
                )}
                {photoUrl && !showCamera && (
                  <div className="mt-4 flex justify-center">
                    <img src={photoUrl} alt="Captured face" className="w-24 h-24 object-cover rounded-xl border-2 border-stone-200 shadow-sm" />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-white/5 flex gap-3">
              <button onClick={() => { setIsModalOpen(false); stopCamera(); }}
                className="flex-1 py-3 px-4 rounded-2xl bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold hover:bg-stone-50 dark:hover:bg-white/10 transition-colors">
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-[2] py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold shadow-xl shadow-teal-500/20 transition-all disabled:opacity-50">
                {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
