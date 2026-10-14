"use client";

import React, { useState } from "react";
import { UserX, AlertTriangle, CheckCircle, Loader2, Mail, Building2, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AccountDeletionPage() {
  const [email, setEmail] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "confirming" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === "idle") {
      setStatus("confirming");
      return;
    }

    if (status !== "confirming") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, restaurantId, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "حدث خطأ غير متوقع");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMessage("فشل الاتصال بالخادم. حاول مرة أخرى لاحقاً.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 font-cairo" dir="rtl">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-6 text-green-600 dark:text-green-400">
              <CheckCircle size={48} className="stroke-[1.5]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              تم حذف حسابك بنجاح
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
              تم إزالة جميع بياناتك الشخصية من أنظمتنا.
            </p>
            <p className="text-slate-500 dark:text-slate-500 mb-8">
              إذا كان لديك أي استفسارات إضافية، يمكنك التواصل معنا عبر البريد الإلكتروني:
              <a href="mailto:asntechnology1@gmail.com" className="text-blue-600 dark:text-blue-400 mx-1 hover:underline">
                asntechnology1@gmail.com
              </a>
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              <span>العودة للصفحة الرئيسية</span>
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 font-cairo" dir="rtl">
      <div className="container mx-auto px-4 md:px-6 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4 text-red-600 dark:text-red-400">
            <UserX size={40} className="stroke-[1.5]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            طلب حذف الحساب
          </h1>
          <h2 className="text-lg text-slate-500 dark:text-slate-400 mb-2">
            Account Deletion Request
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            يمكنك طلب حذف حسابك وجميع بياناتك الشخصية المرتبطة به من خلال النموذج أدناه.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-1">تنبيه مهم</h3>
              <p className="text-amber-700 dark:text-amber-400 text-sm leading-relaxed">
                عملية حذف الحساب <strong>لا يمكن التراجع عنها</strong>. سيتم حذف جميع بياناتك الشخصية بشكل نهائي، 
                بما في ذلك معلومات تسجيل الدخول وسجلات النشاط المرتبطة بحسابك.
              </p>
            </div>
          </div>
        </div>

        {/* What gets deleted */}
        <div className="bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-6 mb-8">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3">ما الذي سيتم حذفه:</h3>
          <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
              بيانات تسجيل الدخول (البريد الإلكتروني وكلمة المرور)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
              معلومات الملف الشخصي (الاسم، بيانات الاتصال)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
              صلاحيات الوصول للوحة التحكم
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
              سجلات النشاط المرتبطة بحسابك
            </li>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              <Mail size={16} />
              البريد الإلكتروني أو اسم المستخدم *
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="أدخل بريدك الإلكتروني أو اسم المستخدم"
              disabled={status === "confirming" || status === "loading"}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              <Building2 size={16} />
              معرف المطعم (Restaurant ID) *
            </label>
            <input
              type="text"
              required
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              placeholder="أدخل معرف المطعم الخاص بك"
              disabled={status === "confirming" || status === "loading"}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              <MessageSquare size={16} />
              سبب الحذف (اختياري)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="أخبرنا لماذا تريد حذف حسابك (اختياري)"
              rows={3}
              disabled={status === "confirming" || status === "loading"}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none transition-all"
            />
          </div>

          {/* Confirmation warning */}
          {status === "confirming" && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={22} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-800 dark:text-red-300 mb-1">
                    هل أنت متأكد؟
                  </h3>
                  <p className="text-red-700 dark:text-red-400 text-sm">
                    سيتم حذف جميع بياناتك بشكل نهائي ولا يمكن استعادتها. اضغط &quot;تأكيد الحذف&quot; للمتابعة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {status === "error" && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl p-4 text-red-700 dark:text-red-400 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-3">
            {status === "confirming" && (
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                إلغاء
              </button>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                status === "confirming"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : status === "loading"
                    ? "bg-red-400 text-white cursor-not-allowed"
                    : status === "error"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>جاري الحذف...</span>
                </>
              ) : status === "confirming" ? (
                <>
                  <UserX size={20} />
                  <span>تأكيد الحذف نهائياً</span>
                </>
              ) : (
                <>
                  <UserX size={20} />
                  <span>طلب حذف الحساب</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Alternative contact */}
        <div className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            يمكنك أيضاً طلب حذف حسابك عبر إرسال بريد إلكتروني إلى{" "}
            <a href="mailto:asntechnology1@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              asntechnology1@gmail.com
            </a>
          </p>
          <p className="mt-2">
            <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
              اطلع على سياسة الخصوصية
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
