"use client";

import { useEffect } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function MenuErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Menu Error Boundary Caught]:", error);
  }, [error]);

  const handleHardRefresh = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("_reload", String(Date.now()));
    window.location.href = url.toString();
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold mb-2">تعذر تحميل المنيو حالياً</h2>
      <p className="text-stone-400 text-sm max-w-sm mb-6">
        قد يكون المتصفح يحتفظ بنسخة مؤقتة قديمة في الذاكرة. يرجى الضغط على زر التحديث أدناه لتحديث الصفحة مباشرة.
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleHardRefresh}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-sm transition-all shadow-lg active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث الصفحة الآن
        </button>
      </div>
    </div>
  );
}
