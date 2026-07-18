"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Lock, LogIn, ChevronRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/context/LanguageContext";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Lazy load heavy components
const StarsBackground = lazy(() => import("@/components/ui/StarsBackground"));
const LightBackgroundAnimation = lazy(() => import("@/components/ui/LightBackgroundAnimation"));

let posDbPromise: Promise<typeof import("@/lib/pos-db")> | null = null;
function getPosDb() {
    if (!posDbPromise) posDbPromise = import("@/lib/pos-db");
    return posDbPromise;
}

function LoginContent() {
    const { language } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const rid = searchParams.get("r");

    const [usernameOrEmail, setUsernameOrEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [resData, setResData] = useState<{ name: string; logo: string } | null>(null);
    const [bgReady, setBgReady] = useState(false);

    const isAr = language === "ar";

    useEffect(() => {
        if (rid) {
            supabase
                .from('restaurants')
                .select('name, logo_url, receipt_logo_url')
                .eq('id', rid)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setResData({
                            name: data.name,
                            logo: data.receipt_logo_url || data.logo_url
                        });
                    }
                });
        }
    }, [rid]);

    useEffect(() => {
        const timer = setTimeout(() => setBgReady(true), 150);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('impersonating_tenant');
        }

        try {
            const input = usernameOrEmail.trim();

            // ═══════════════════════════════════════════
            // OFFLINE FALLBACK
            // ═══════════════════════════════════════════
            if (!navigator.onLine) {
                const { posDb } = await getPosDb();
                let staff = await posDb.pos_users.where('username').equals(input).first();
                if (!staff) {
                    staff = await posDb.pos_users.filter(u => u.username === input || u.name === input).first();
                }
                
                const cachedSession = localStorage.getItem('offline_session');
                if (!staff && cachedSession) {
                    const parsed = JSON.parse(cachedSession);
                    const cachedPw = localStorage.getItem('offline_pw');
                    if ((parsed.user.email === input || parsed.user.username === input) && cachedPw === password) {
                        parsed.logged_at = new Date().toISOString();
                        localStorage.setItem('offline_session', JSON.stringify(parsed));
                        setSuccess(true);
                        setTimeout(() => router.push('/dashboard'), 800);
                        return;
                    }
                }

                if (staff && staff.password === password) {
                    localStorage.setItem('offline_session', JSON.stringify({
                        user: { id: staff.id, email: staff.username, role: staff.role },
                        restaurant_id: staff.restaurant_id,
                        logged_at: new Date().toISOString()
                    }));
                    localStorage.setItem('offline_pw', password);
                    setSuccess(true);
                    setTimeout(() => router.push('/dashboard'), 800);
                    return;
                }

                throw new Error(isAr ? "أنت أوفلاين. تأكد من البيانات أو اتصل بالإنترنت أولاً." : "You are offline. Check your credentials.");
            }

            // ═══════════════════════════════════════════
            // ONLINE LOGIN
            // ═══════════════════════════════════════════
            let loginEmail = input;
            if (!loginEmail.includes('@')) {
                const res = await fetch("/api/auth/lookup", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: loginEmail })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || (isAr ? "اسم المستخدم غير صحيح" : "Invalid username"));
                loginEmail = data.email;
            }

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password,
            });

            if (authError) throw authError;

            // Cache for offline
            try {
                const userId = authData.user.id;
                const userEmail = authData.user.email || loginEmail;
                const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle();

                let restaurantId = null;
                let role = 'admin';

                if (roleData?.role === 'super_admin') {
                    setSuccess(true);
                    setTimeout(() => router.push('/super-admin'), 800);
                    return;
                }

                if (userEmail.endsWith('.asn') || roleData?.role === 'staff') {
                    const { data: staff } = await supabase.from('team_members').select('restaurant_id, role').eq('auth_id', userId).maybeSingle();
                    if (staff) { restaurantId = staff.restaurant_id; role = staff.role || 'staff'; }
                } else {
                    const { data: rest } = await supabase.from('restaurants').select('id').ilike('email', userEmail).maybeSingle();
                    if (rest) { restaurantId = rest.id; role = 'admin'; }
                }

                if (restaurantId) {
                    const { posDb } = await getPosDb();
                    await posDb.pos_users.put({
                        id: userId,
                        restaurant_id: restaurantId,
                        name: input,
                        username: input.includes('@') ? input : loginEmail,
                        password: password,
                        role: role as 'admin' | 'staff' | 'delivery',
                        is_active: true,
                    });
                }

                localStorage.setItem('offline_session', JSON.stringify({
                    user: { id: userId, email: userEmail, username: input, role },
                    restaurant_id: restaurantId,
                    logged_at: new Date().toISOString()
                }));
                localStorage.setItem('offline_pw', password);

            } catch (cacheErr) {
                console.warn('[Login] Failed to cache credentials for offline:', cacheErr);
            }

            setSuccess(true);
            setTimeout(() => router.push('/dashboard'), 800);

        } catch (err: any) {
            console.error("Login attempt failed:", err);
            setError(err.message || (isAr ? "حدث خطأ أثناء تسجيل الدخول." : "Failed to login."));
        } finally {
            if (!success) setLoading(false);
        }
    }, [usernameOrEmail, password, isAr, router, success]);

    return (
        <main className="min-h-screen bg-[#020817] relative flex items-center justify-center p-4 sm:p-8 overflow-hidden font-sans" dir={isAr ? "rtl" : "ltr"}>
            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] bg-teal-600/20 rounded-full blur-[60px] md:blur-[120px] mix-blend-screen opacity-50 animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] bg-emerald-600/20 rounded-full blur-[60px] md:blur-[100px] mix-blend-screen opacity-50" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>

            {bgReady && (
                <Suspense fallback={null}>
                    <StarsBackground />
                </Suspense>
            )}

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[1000px] relative z-10 flex flex-col md:flex-row min-h-[600px] rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(2,20,30,0.5)] md:shadow-[0_0_80px_rgba(2,20,30,0.5)] border border-white/10 bg-black/40 backdrop-blur-md md:backdrop-blur-2xl"
            >
                {/* Left Side: Branding */}
                <div className="hidden md:flex flex-col w-1/2 p-12 relative overflow-hidden bg-gradient-to-br from-teal-900/40 to-emerald-900/40 border-r border-white/5">
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0,transparent_100%)]" />

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <Link href="/" className="flex items-center gap-4 group w-fit">
                            <div className="w-14 h-14 relative rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-black/30 p-2 flex items-center justify-center transition-transform group-hover:scale-105">
                                {resData?.logo ? (
                                    <img src={resData.logo} alt={resData.name} className="w-full h-full object-contain drop-shadow-md" />
                                ) : (
                                    <Image src="/logo.png" alt="ASN" fill className="object-contain p-2" priority />
                                )}
                            </div>
                            <span className="text-2xl font-black tracking-tight text-white drop-shadow-md">
                                {resData?.name || "ASN Tech"}
                            </span>
                        </Link>

                        <div className="mt-auto mb-10">
                            <motion.h1 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight mb-6"
                            >
                                {isAr ? (
                                    <>مرحباً بعودتك إلى<br/> <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">نظامك الإداري</span></>
                                ) : (
                                    <>Welcome back to<br/> <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">Your Digital Hub</span></>
                                )}
                            </motion.h1>
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-lg text-slate-300/90 font-medium leading-relaxed max-w-sm"
                            >
                                {isAr 
                                    ? "نظام متكامل لإدارة مطعمك، تتبع المبيعات، وإدارة فريقك بكل سهولة وأمان."
                                    : "An integrated system to manage your restaurant, track sales, and lead your team securely."}
                            </motion.p>
                        </div>

                        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold w-fit group">
                            <ArrowLeft className={`w-4 h-4 transition-transform ${isAr ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
                            {isAr ? "العودة للرئيسية" : "Back to Home"}
                        </Link>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center relative bg-gradient-to-br from-white/5 to-transparent">
                    <div className="md:hidden flex justify-between items-center mb-10">
                        <div className="w-12 h-12 relative rounded-xl overflow-hidden border border-white/20 shadow-xl bg-black/30 p-1">
                            {resData?.logo ? (
                                <img src={resData.logo} alt={resData.name} className="w-full h-full object-contain" />
                            ) : (
                                <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
                            )}
                        </div>
                        <Link href="/" className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1">
                            <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                            {isAr ? "العودة" : "Back"}
                        </Link>
                    </div>

                    <div className="w-full max-w-[360px] mx-auto">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                                {isAr ? "تسجيل الدخول" : "Sign In"}
                            </h2>
                            <p className="text-slate-400 font-medium text-sm">
                                {isAr ? "أدخل بياناتك للوصول إلى لوحة التحكم" : "Enter your credentials to access the dashboard"}
                            </p>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-start gap-3"
                                >
                                    <div className="mt-0.5">⚠️</div>
                                    <p>{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5 group">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block" htmlFor="email">
                                    {isAr ? "البريد أو اسم المستخدم" : "Email or Username"}
                                </label>
                                <div className="relative">
                                    <div className={`absolute inset-y-0 ${isAr ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none text-slate-500 group-focus-within:text-teal-400 transition-colors`}>
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        id="email"
                                        required
                                        value={usernameOrEmail}
                                        onChange={(e) => setUsernameOrEmail(e.target.value)}
                                        dir="ltr"
                                        className={`w-full ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-teal-500/50 focus:bg-black/60 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all text-white placeholder-slate-600 font-medium`}
                                        placeholder={isAr ? "admin@website.com" : "user@example.com"}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 group">
                                <div className="flex justify-between items-end">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block" htmlFor="password">
                                        {isAr ? "كلمة المرور" : "Password"}
                                    </label>
                                    <Link href="#" className="text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors">
                                        {isAr ? "نسيت الرمز؟" : "Forgot?"}
                                    </Link>
                                </div>
                                <div className="relative">
                                    <div className={`absolute inset-y-0 ${isAr ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none text-slate-500 group-focus-within:text-teal-400 transition-colors`}>
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="password"
                                        id="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        dir="ltr"
                                        className={`w-full ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-teal-500/50 focus:bg-black/60 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all text-white placeholder-slate-600 font-medium tracking-widest`}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                disabled={loading || success}
                                className={`group relative w-full py-4 mt-8 rounded-xl overflow-hidden font-black text-lg transition-all duration-300 flex items-center justify-center gap-2 
                                    ${success ? 'bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 
                                      loading ? 'bg-white/10 text-white/50 cursor-not-allowed border border-white/5' : 
                                      'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] hover:scale-[1.02] active:scale-95 border border-white/10'}`}
                            >
                                {!loading && !success && (
                                    <div className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                )}
                                
                                <span className="relative flex items-center gap-2 drop-shadow-md">
                                    {success ? (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5" />
                                            {isAr ? "تم بنجاح!" : "Success!"}
                                        </motion.div>
                                    ) : loading ? (
                                        <span className="animate-pulse">{isAr ? "جاري التحقق..." : "Authenticating..."}</span>
                                    ) : (
                                        <>
                                            {isAr ? "دخول للوحة التحكم" : "Enter Dashboard"}
                                            <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isAr ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>
                    </div>
                </div>
            </motion.div>

            <style jsx>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.05); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 8s ease-in-out infinite;
                }
            `}</style>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#020817] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
