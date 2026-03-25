"use client";

import { useEffect, useState, useRef } from "react";
import { Camera, MapPin, CheckCircle2, XCircle, Search, Clock, Upload, ScanFace } from "lucide-react";
import { toast } from "sonner";
import * as faceapi from '@vladmandic/face-api';

interface Restaurant {
  id: string;
  name: string;
}

export default function PublicAttendancePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ status: 'success'|'error', message: string, hours?: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<any>(null);

  useEffect(() => {
    // 1. Fetch restaurants
    fetch('/api/hr/kiosk/restaurants')
      .then(r => r.json())
      .then(data => {
        if (data.restaurants) setRestaurants(data.restaurants);
      })
      .catch(() => toast.error("أخفق تحميل قائمة المطاعم"));

    // 2. Load face models
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        faceapiRef.current = faceapi;
        setModelsLoaded(true);
      } catch (error) {
        console.error("Failed to load models", error);
        toast.error("فشل في تحميل نماذج الذكاء الاصطناعي");
      }
    };
    loadModels();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    if (!selectedRestaurantId) {
      toast.error("الرجاء اختيار المطعم أولاً");
      return;
    }
    setResult(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("الكاميرا غير مدعومة هنا. الرجاء استخدام (التقاط من تطبيق الهاتف/صورة)");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      toast.error("لا يمكن الوصول للكاميرا");
    }
  };

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const getPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
    });
  };

  const processImage = async (imageElement: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) => {
    if (!faceapiRef.current || !modelsLoaded) {
      toast.error("يرجى الانتظار حتى يتم تحميل النماذج الذكية");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    let lat, lng;
    try {
      const pos = await getPosition();
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      toast.error("تعذر تحديد موقعك بدقة، سنحاول بدون تحديد الموقع");
    }

    try {
      const faceapiObj = faceapiRef.current;
      
      let detection = await faceapiObj
        .detectSingleFace(imageElement, new faceapiObj.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        detection = await faceapiObj
          .detectSingleFace(imageElement, new faceapiObj.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.1 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      if (!detection) {
        setIsProcessing(false);
        setResult({ status: 'error', message: "عذراً، لم يتم العثور على وجه فى الصورة، يرجى المحاولة مرة أخرى وتأكد من جودة الصورة والإضاءة." });
        return;
      }

      const descriptor = Array.from(detection.descriptor);

      const res = await fetch('/api/hr/kiosk/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: selectedRestaurantId,
          descriptor: descriptor,
          latitude: lat,
          longitude: lng
        })
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ status: 'success', message: data.message, hours: data.hours });
        toast.success(data.message);
      } else {
        setResult({ status: 'error', message: data.message || data.error });
        toast.error(data.message || data.error);
      }

    } catch (error) {
      console.error(error);
      setResult({ status: 'error', message: "حدث خطأ غير متوقع" });
    } finally {
      setIsProcessing(false);
      stopCamera();
    }
  };

  const captureAndVerify = async () => {
    if (!videoRef.current) return;
    await processImage(videoRef.current);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRestaurantId) {
      if (!selectedRestaurantId) toast.error("الرجاء اختيار المطعم أولاً");
      return;
    }

    stopCamera();
    
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(resolve => { img.onload = resolve; });
    
    const canvas = document.createElement('canvas');
    if (canvasRef.current) {
        const MAX_WIDTH = 800;
        let scale = 1;
        if (img.width > MAX_WIDTH) scale = MAX_WIDTH / img.width;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        await processImage(canvas);
    }
  };

  const filteredRestaurants = restaurants.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0a0a0a] flex items-center justify-center p-4 dir-rtl font-sans">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-white/10 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-6 text-white text-center">
          <ScanFace className="w-12 h-12 mx-auto mb-3 text-white/90" />
          <h1 className="text-2xl font-black">بوابة الحضور والانصراف</h1>
          <p className="text-teal-100 mt-1 font-medium text-sm">تسجيل البصمة بواسطة الذكاء الاصطناعي</p>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Step 1: Restaurant Selection */}
          {!selectedRestaurantId ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">1. اختر مكان العمل</h2>
              
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="ابحث عن مطعمك..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-stone-50 dark:bg-black/20 border-2 border-stone-200 dark:border-white/10 rounded-xl outline-none focus:border-teal-500 text-slate-800 dark:text-white font-bold"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {filteredRestaurants.map(r => (
                  <button 
                    key={r.id}
                    onClick={() => setSelectedRestaurantId(r.id)}
                    className="w-full text-right p-4 rounded-xl border-2 border-transparent bg-stone-50 hover:bg-teal-50 hover:border-teal-200 dark:bg-white/5 dark:hover:bg-teal-900/20 dark:hover:border-teal-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-zinc-200 group-hover:text-teal-600 dark:group-hover:text-teal-400">{r.name}</span>
                    </div>
                  </button>
                ))}
                {filteredRestaurants.length === 0 && (
                  <p className="text-center text-stone-500 py-4 font-bold">لا يوجد مطاعم مطابقة</p>
                )}
              </div>
            </div>
          ) : (
            
            <div className="space-y-5">
              
              <div className="flex items-center justify-between bg-stone-100 dark:bg-black/30 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-500" />
                  <span className="font-bold text-sm text-slate-700 dark:text-zinc-300">
                    {restaurants.find(r => r.id === selectedRestaurantId)?.name}
                  </span>
                </div>
                <button onClick={() => { setSelectedRestaurantId(""); setResult(null); }} className="text-xs font-bold text-teal-600 hover:underline">
                  تغيير المطعم
                </button>
              </div>

              {/* Status Display */}
              {result && (
                <div className={`p-5 rounded-2xl border-2 text-center animate-in fade-in zoom-in-95 duration-300 ${
                  result.status === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400' 
                    : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-400'
                }`}>
                  {result.status === 'success' ? (
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                  ) : (
                    <XCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
                  )}
                  <h3 className="font-black text-lg mb-1">{result.status === 'success' ? 'نجاح' : 'عذراً!'}</h3>
                  <p className="font-bold text-sm opacity-90">{result.message}</p>
                  
                  {result.status === 'success' && (
                     <button onClick={() => setResult(null)} className="mt-4 px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:bg-emerald-600 transition-colors">
                       تسجيل موظف آخر
                     </button>
                  )}
                  {result.status === 'error' && (
                     <button onClick={() => setResult(null)} className="mt-4 px-6 py-2 bg-red-500 text-white font-bold rounded-xl text-sm hover:bg-red-600 transition-colors">
                       حاول مرة أخرى
                     </button>
                  )}
                </div>
              )}

              {/* Camera Area */}
              {!result && (
                <div className="space-y-4">
                  {cameraActive ? (
                    <div className="space-y-3">
                      <div className="relative w-full rounded-2xl overflow-hidden border-2 border-teal-500/30 bg-black aspect-square">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <div className="absolute inset-0 border-[6px] border-teal-500/20 rounded-2xl border-dashed opacity-50 pointer-events-none" />
                        
                        {isProcessing && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mb-3" />
                            <p className="text-white font-bold text-sm animate-pulse">جاري فحص الوجه...</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={captureAndVerify} disabled={isProcessing}
                          className="flex-[2] py-4 bg-teal-500 hover:bg-teal-600 text-white font-black rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-50">
                          <ScanFace className="w-6 h-6" />
                          تسجيل البصمة الآن
                        </button>
                        <button onClick={stopCamera} disabled={isProcessing}
                          className="flex-1 py-4 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold rounded-xl hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors">
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      
                      <button onClick={startCamera} disabled={!modelsLoaded}
                        className="w-full py-6 border-2 border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-white/5 rounded-2xl text-slate-700 dark:text-white font-black hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all flex flex-col items-center justify-center gap-3 disabled:opacity-50 group">
                        <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                          <Camera className="w-8 h-8" />
                        </div>
                        {modelsLoaded ? "فتح الكاميرا المباشرة" : "جاري تجهيز النظام..."}
                      </button>

                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                        <span className="flex-shrink-0 mx-4 text-stone-400 text-xs font-bold">أو</span>
                        <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                      </div>

                      <input type="file" accept="image/*" capture="user" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                      <button onClick={() => fileInputRef.current?.click()} disabled={!modelsLoaded || isProcessing}
                        className="w-full py-4 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-600 dark:text-stone-300 hover:border-teal-500 hover:text-teal-600 transition-colors flex items-center justify-center gap-2">
                        <Upload className="w-5 h-5" />
                        التقاط صورة باستخدام كاميرا الهاتف
                      </button>

                      {isProcessing && (
                        <div className="text-center text-teal-600 dark:text-teal-400 font-bold text-sm animate-pulse flex items-center justify-center gap-2 mt-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          جاري الفحص...
                        </div>
                      )}
                      
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
