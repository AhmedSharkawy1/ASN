"use client";

import { useEffect, useState, useRef } from "react";
import { Camera, MapPin, CheckCircle2, XCircle, Search, Clock, Upload, ScanFace } from "lucide-react";
import { toast } from "sonner";
import * as faceapi from '@vladmandic/face-api';
import { useParams } from 'next/navigation';

interface Restaurant {
  id: string;
  name: string;
}

export default function TenantAttendancePage() {
  const params = useParams();
  const selectedRestaurantName = params.restaurantName ? decodeURIComponent(params.restaurantName as string) : "";
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  
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
    // 1. Fetch restaurant details
    if (selectedRestaurantName) {
      fetch(`/api/hr/kiosk/restaurants/${encodeURIComponent(selectedRestaurantName)}`)
        .then(r => r.json())
        .then(data => {
          if (data.restaurant) setRestaurant(data.restaurant);
          else toast.error("لم يتم العثور على مكان العمل");
        })
        .catch(() => toast.error("أخفق تحميل بيانات مكان العمل"));
    }

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
  }, [selectedRestaurantName]);

  const startCamera = async () => {
    if (!restaurant) {
      toast.error("الرابط غير صالح أو المطعم غير موجود");
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
      
      // Sped up verification by avoiding the double check and using a faster inputSize 224
      let detection = await faceapiObj
        .detectSingleFace(imageElement, new faceapiObj.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.2 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

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
          restaurant_id: restaurant?.id,
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

  // Removed handleFileUpload to enforce live camera check

  if (!restaurant && selectedRestaurantName) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 dir-rtl font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mb-3" />
        <p className="text-stone-500 font-bold">جاري تحميل مكان العمل...</p>
      </div>
    );
  }

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
          
          <div className="space-y-5">
            
            <div className="flex items-center justify-between bg-stone-100 dark:bg-black/30 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-500" />
                <span className="font-bold text-base text-slate-700 dark:text-zinc-300">
                  {restaurant?.name || 'جاري التحميل...'}
                </span>
              </div>
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
                      {modelsLoaded ? "أفتح الكاميرا المباشرة" : "جاري تجهيز النظام بشكل أسرع..."}
                    </button>

                    <p className="text-center text-xs font-bold text-stone-500 mt-2 px-4 leading-relaxed">
                      نظام الحماية مفعل 🛡️<br/>سجل الحضور بالكاميرا المباشرة حصراً و انظر للكاميرا.
                    </p>

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
        </div>
      </div>
    </div>
  );
}
