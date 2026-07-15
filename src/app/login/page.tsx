"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Lock, LogIn } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/context/LanguageContext";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

// Lazy load heavy components - they're purely decorative and not needed for first paint
const StarsBackground = lazy(() => import("@/components/ui/StarsBackground"));
const LightBackgroundAnimation = lazy(() => import("@/components/ui/LightBackgroundAnimation"));

// Lazy load posDb only when needed (offline scenarios)
let posDbPromise: Promise<typeof import("@/lib/pos-db")> | null = null;
function getPosDb() {
    if (!posDbPromise) {
        posDbPromise = import("@/lib/pos-db");
    }
    return posDbPromise;
}

// Simple CSS-based fade-in instead of framer-motion (~40KB saved)
const fadeInStyle = (delay: number = 0): React.CSSProperties => ({
    animation: `loginFadeIn 0.5s ease-out ${delay}s both`,
});

function LoginContent() {
    const { language } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const rid = searchParams.get("r");

    const [usernameOrEmail, setUsernameOrEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isHovered, setIsHovered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resData, setResData] = useState<{ name: string; logo: string } | null>(null);
    const [bgReady, setBgReady] = useState(false);

    // Fetch restaurant data properly with useEffect
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

    // Defer background animations - load after main content is interactive
    useEffect(() => {
        const timer = setTimeout(() => setBgReady(true), 150);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
            setLoading(true);
            setError(null);

            // Clear any lingering impersonation or offline sessions to ensure clean login
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('impersonating_tenant');
            }

        try {
            const input = usernameOrEmail.trim();

            // ═══════════════════════════════════════════
            // OFFLINE-FIRST: Try local login first when offline
            // ═══════════════════════════════════════════
            if (!navigator.onLine) {
                const { posDb } = await getPosDb();
                // Try by username
                let staff = await posDb.pos_users.where('username').equals(input).first();
                // Also try by email stored in username field
                if (!staff) {
                    staff = await posDb.pos_users.filter(u => 
                        u.username === input || u.name === input
                    ).first();
                }
                
                // Also try from cached offline_session (same password re-login)
                const cachedSession = localStorage.getItem('offline_session');
                if (!staff && cachedSession) {
                    const parsed = JSON.parse(cachedSession);
                    const cachedPw = localStorage.getItem('offline_pw');
                    if (
                        (parsed.user.email === input || parsed.user.username === input) &&
                        cachedPw === password
                    ) {
                        // Re-use cached session
                        parsed.logged_at = new Date().toISOString();
                        localStorage.setItem('offline_session', JSON.stringify(parsed));
                        router.push('/dashboard');
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
                    router.push('/dashboard');
                    return;
                }

                setError(language === "ar" 
                    ? "أنت أوفلاين. تأكد من البيانات أو اتصل بالإنترنت أولاً." 
                    : "You are offline. Check your credentials or connect to the internet first.");
                return;
            }

            // ═══════════════════════════════════════════
            // ONLINE: Normal Supabase login
            // ═══════════════════════════════════════════
            let loginEmail = input;

            if (!loginEmail.includes('@')) {
                // It's a staff username, look up the internal email
                const res = await fetch("/api/auth/lookup", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: loginEmail })
                });
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.error || "اسم المستخدم غير صحيح");
                }
                loginEmail = data.email;
            }

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password,
            });

            if (authError) {
                throw authError;
            }

            // ═══════════════════════════════════════════
            // CACHE for offline: Save credentials locally
            // ═══════════════════════════════════════════
            try {
                // Cache the login credentials for offline use
                const userId = authData.user.id;
                const userEmail = authData.user.email || loginEmail;
                
                // Get restaurant info for the session
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', userId)
                    .maybeSingle();

                let restaurantId = null;
                let role = 'admin';

                if (roleData?.role === 'super_admin') {
                    router.push('/super-admin');
                    return;
                }

                // Check if staff
                if (userEmail.endsWith('.asn') || roleData?.role === 'staff') {
                    const { data: staff } = await supabase
                        .from('team_members')
                        .select('restaurant_id, role')
                        .eq('auth_id', userId)
                        .maybeSingle();
                    if (staff) {
                        restaurantId = staff.restaurant_id;
                        role = staff.role || 'staff';
                    }
                } else {
                    const { data: rest } = await supabase
                        .from('restaurants')
                        .select('id')
                        .ilike('email', userEmail)
                        .maybeSingle();
                    if (rest) {
                        restaurantId = rest.id;
                        role = 'admin';
                    }
                }

                // Save to pos_users for offline login
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

                // Always save offline session
                localStorage.setItem('offline_session', JSON.stringify({
                    user: { id: userId, email: userEmail, username: input, role },
                    restaurant_id: restaurantId,
                    logged_at: new Date().toISOString()
                }));
                localStorage.setItem('offline_pw', password);

            } catch (cacheErr) {
                console.warn('[Login] Failed to cache credentials for offline:', cacheErr);
            }

            router.push('/dashboard');

        } catch (err: unknown) {
            console.error("Login attempt failed:", err);
            
            // Try offline fallback even if online login failed (network issue)
            try {
                const { posDb } = await getPosDb();
                let staff = await posDb.pos_users.where('username').equals(usernameOrEmail.trim()).first();
                if (!staff) {
                    staff = await posDb.pos_users.filter(u => u.name === usernameOrEmail.trim()).first();
                }
                if (staff && staff.password === password) {
                    localStorage.setItem('offline_session', JSON.stringify({
                        user: { id: staff.id, email: staff.username, role: staff.role },
                        restaurant_id: staff.restaurant_id,
                        logged_at: new Date().toISOString()
                    }));
                    localStorage.setItem('offline_pw', password);
                    router.push('/dashboard');
                    return;
                }

                // Check cached session password
                const cachedSession = localStorage.getItem('offline_session');
                const cachedPw = localStorage.getItem('offline_pw');
                if (cachedSession && cachedPw === password) {
                    const parsed = JSON.parse(cachedSession);
                    if (parsed.user.email === usernameOrEmail.trim() || 
                        parsed.user.username === usernameOrEmail.trim()) {
                        parsed.logged_at = new Date().toISOString();
                        localStorage.setItem('offline_session', JSON.stringify(parsed));
                        router.push('/dashboard');
                        return;
                    }
                }
            } catch { /* ignore fallback errors */ }
            
            setError(err instanceof Error ? err.message : "Failed to login. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    }, [usernameOrEmail, password, language, router]);


    return (
        <main className="min-h-screen bg-slate-300/80 dark:bg-background relative overflow-hidden flex items-center justify-center p-6">
            {/* Defer background animations - load after form is interactive */}
            {bgReady && (
                <Suspense fallback={null}>
                    <StarsBackground />
                    <LightBackgroundAnimation />
                </Suspense>
            )}

            {/* Cinematic Background Elements - pure CSS, renders immediately */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] bg-blue/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-80 animate-pulse-glow" />
                <div className="absolute bottom-1/4 right-1/4 w-[30%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-40 dark:opacity-70" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(46,163,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(46,163,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:[mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#fff_70%,transparent_100%)]" />
            </div>

            <div className="w-full max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row items-stretch min-h-[600px] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-glass-border">

                {/* Left Side: Branding / Visual (Hidden on mobile) */}
                <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-blue-900/80 via-blue/40 to-cyan-900/60 p-12 relative overflow-hidden backdrop-blur-xl border-r border-glass-border">
                    <div className="absolute inset-0 bg-black/20" />

                    {/* Animated grid background */}
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:2rem_2rem]" />

                    {/* Top Branding */}
                    <Link href="/" className="relative z-10 w-fit">
                        <div
                            className="flex items-center gap-3 group login-hover-scale"
                            style={fadeInStyle(0)}
                        >
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.3)] bg-white/10 flex items-center justify-center">
                                {resData?.logo ? (
                                    <img src={resData.logo} alt={resData.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Image
                                        src="/logo.png"
                                        alt="ASN Technology Logo"
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                )}
                            </div>
                            <span className="text-2xl font-bold tracking-tighter text-white drop-shadow-md">
                                {resData?.name || "ASN Technology"}
                            </span>
                        </div>
                    </Link>

                    {/* Middle Content */}
                    <div className="relative z-10 mt-auto mb-auto">
                        <h1
                            style={fadeInStyle(0.15)}
                            className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6 drop-shadow-lg"
                        >
                            {language === "ar" ? (
                                <span dir="rtl" className="block text-right">
                                    مرحباً بك مجدداً في <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-light drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                                        {resData?.name || "نظامك الرقمي"}
                                    </span>
                                </span>
                            ) : (
                                <span>
                                    Welcome back to <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-light drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                                        {resData?.name || "your Digital Hub"}
                                    </span>
                                </span>
                            )}
                        </h1>
                        <p
                            style={fadeInStyle(0.3)}
                            className={`text-lg text-white/80 font-light ${language === "ar" ? "text-right" : "text-left"}`}
                        >
                            {language === "ar"
                                ? "قم بتسجيل الدخول للوصول إلى لوحة التحكم والبيانات الخاصة بك، وإدارة أعمالك بسلاسة."
                                : "Log in to access your dashboard, data analytics, and manage your business operations seamlessly."}
                        </p>
                    </div>

                    {/* Bottom Links */}
                    <div className="relative z-10 mt-8">
                        <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium">
                            <ArrowLeft className="w-4 h-4" />
                            {language === "ar" ? "العودة للرئيسية" : "Back to Home"}
                        </Link>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="w-full md:w-1/2 bg-background/60 backdrop-blur-2xl p-8 md:p-12 flex flex-col justify-center relative">

                    {/* Mobile Logo & Back Link */}
                    <div className="md:hidden flex justify-between items-center mb-8">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-blue/30 shadow-[0_0_15px_rgba(46,163,255,0.3)] bg-white/10 flex items-center justify-center">
                            {resData?.logo ? (
                                <img src={resData.logo} alt={resData.name} className="w-full h-full object-cover" />
                            ) : (
                                <Image src="/logo.png" alt="Logo" fill className="object-cover" priority />
                            )}
                        </div>
                        <Link href="/" className="text-sm font-medium text-silver hover:text-foreground flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" />
                            {language === "ar" ? "العودة" : "Back"}
                        </Link>
                    </div>

                    <div className="max-w-md w-full mx-auto">
                        <div
                            style={fadeInStyle(0)}
                            className="mb-10 text-center"
                        >
                            <h2 className="text-3xl font-bold mb-3 text-foreground tracking-tight">
                                {language === "ar" ? "تسجيل الدخول" : "Sign In"}
                            </h2>
                            <p className="text-silver/80">
                                {language === "ar" ? "أدخل بياناتك للمتابعة إلى حسابك" : "Enter your credentials to access your account"}
                            </p>
                        </div>

                        {error && (
                            <div
                                style={fadeInStyle(0)}
                                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium"
                            >
                                {error}
                            </div>
                        )}

                        <form
                            style={fadeInStyle(0.1)}
                            onSubmit={handleSubmit}
                            className="space-y-6"
                        >
                            <div className="space-y-2 relative group">
                                <label className={`text-sm font-medium text-silver px-1 block ${language === "ar" ? "text-right" : "text-left"}`} htmlFor="email">
                                    {language === "ar" ? "البريد الإلكتروني أو اسم المستخدم" : "Email or Username"}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-silver group-focus-within:text-blue transition-colors">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        id="email"
                                        required
                                        autoComplete="username"
                                        value={usernameOrEmail}
                                        onChange={(e) => setUsernameOrEmail(e.target.value)}
                                        dir="ltr"
                                        className="w-full pl-11 pr-5 py-3.5 rounded-xl bg-glass-dark border border-glass-border focus:border-blue focus:bg-background focus:outline-none focus:ring-1 focus:ring-blue transition-all text-foreground placeholder-silver/30 shadow-inner"
                                        placeholder={language === "ar" ? "admin@website.com أو admin1" : "user@example.com or admin1"}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 relative group">
                                <label className={`text-sm font-medium text-silver px-1 block ${language === "ar" ? "text-right" : "text-left"}`} htmlFor="password">
                                    {language === "ar" ? "كلمة المرور" : "Password"}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-silver group-focus-within:text-blue transition-colors">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="password"
                                        id="password"
                                        required
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        dir="ltr"
                                        className="w-full pl-11 pr-5 py-3.5 rounded-xl bg-glass-dark border border-glass-border focus:border-blue focus:bg-background focus:outline-none focus:ring-1 focus:ring-blue transition-all text-foreground placeholder-silver/30 shadow-inner tracking-widest"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className={`flex ${language === "ar" ? "justify-start" : "justify-end"} mt-2`}>
                                    <Link href="#" className="text-sm font-medium text-blue hover:text-blue-light transition-colors">
                                        {language === "ar" ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                                    </Link>
                                </div>
                            </div>

                            <button
                                disabled={loading}
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                                className={`group relative w-full py-4 mt-6 rounded-xl overflow-hidden bg-gradient-to-r from-blue to-cyan-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(46,163,255,0.4)] ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-[0_0_30px_rgba(46,163,255,0.6)] active:scale-[0.98]'} border border-blue-light/30`}
                            >
                                {!loading && <div className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>}
                                <span className="relative flex items-center gap-2 text-lg tracking-wide drop-shadow-md">
                                    {loading ? (
                                        <span className="animate-pulse">{language === "ar" ? "جاري الدخول..." : "Signing In..."}</span>
                                    ) : (
                                        <>
                                            {language === "ar" ? "دخول" : "Sign In"}
                                            <span
                                                className="inline-block transition-transform duration-200"
                                                style={{ transform: isHovered ? `translateX(${language === "ar" ? "-5px" : "5px"})` : "translateX(0)" }}
                                            >
                                                <LogIn className={`w-5 h-5 ${language === "ar" ? "scale-x-[-1]" : ""}`} />
                                            </span>
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>

                        <div className="mt-10 text-center border-t border-glass-border pt-6">
                            <p className="text-silver/80 text-sm">
                                {language === "ar" ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
                                <Link href="#" className="font-bold text-blue hover:text-blue-light transition-colors underline underline-offset-4">
                                    {language === "ar" ? "تواصل معنا لإنشاء حساب" : "Contact us to register"}
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* CSS animations - replaces framer-motion entirely */}
            <style jsx>{`
                @keyframes loginFadeIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .login-hover-scale {
                    transition: transform 0.2s ease;
                }
                .login-hover-scale:hover {
                    transform: scale(1.05);
                }
            `}</style>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-300/80 dark:bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
