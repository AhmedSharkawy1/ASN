"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Mail, Lock, LogIn } from "lucide-react";
import StarsBackground from "@/components/ui/StarsBackground";
import LightBackgroundAnimation from "@/components/ui/LightBackgroundAnimation";
import Image from "next/image";
import { useLanguage } from "@/lib/context/LanguageContext";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const { language } = useLanguage();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isHovered, setIsHovered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            // Route user based on successful login (for now, generically to dashboard)
            router.push("/dashboard");

        } catch (err: unknown) {
            console.error("Login attempt failed:", err);
            setError(err instanceof Error ? err.message : "Failed to login. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-100/80 dark:bg-background relative overflow-hidden flex items-center justify-center p-6">
            <StarsBackground />
            <LightBackgroundAnimation />

            {/* Cinematic Background Elements */}
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
                        <motion.div
                            className="flex items-center gap-3 group"
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                <Image
                                    src="/logo.png"
                                    alt="ASN Technology Logo"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <span className="text-2xl font-bold tracking-tighter text-white drop-shadow-md">
                                ASN Technology
                            </span>
                        </motion.div>
                    </Link>

                    {/* Middle Content */}
                    <div className="relative z-10 mt-auto mb-auto">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6 drop-shadow-lg"
                        >
                            {language === "ar" ? (
                                <span dir="rtl" className="block text-right">مرحباً بك مجدداً في <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-light drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">نظامك الرقمي</span></span>
                            ) : (
                                <span>Welcome back to your <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-light drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">Digital Hub</span></span>
                            )}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className={`text-lg text-white/80 font-light ${language === "ar" ? "text-right" : "text-left"}`}
                        >
                            {language === "ar"
                                ? "قم بتسجيل الدخول للوصول إلى لوحة التحكم والبيانات الخاصة بك، وإدارة أعمالك بسلاسة."
                                : "Log in to access your dashboard, data analytics, and manage your business operations seamlessly."}
                        </motion.p>
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
                        <Link href="/" className="relative w-10 h-10 rounded-full overflow-hidden border border-blue/30 shadow-[0_0_15px_rgba(46,163,255,0.3)]">
                            <Image src="/logo.png" alt="Logo" fill className="object-cover" />
                        </Link>
                        <Link href="/" className="text-sm font-medium text-silver hover:text-foreground flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" />
                            {language === "ar" ? "العودة" : "Back"}
                        </Link>
                    </div>

                    <div className="max-w-md w-full mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-10 text-center"
                        >
                            <h2 className="text-3xl font-bold mb-3 text-foreground tracking-tight">
                                {language === "ar" ? "تسجيل الدخول" : "Sign In"}
                            </h2>
                            <p className="text-silver/80">
                                {language === "ar" ? "أدخل بياناتك للمتابعة إلى حسابك" : "Enter your credentials to access your account"}
                            </p>
                        </motion.div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium"
                            >
                                {error}
                            </motion.div>
                        )}

                        <motion.form
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            onSubmit={handleSubmit}
                            className="space-y-6"
                        >
                            <div className="space-y-2 relative group">
                                <label className={`text-sm font-medium text-silver px-1 block ${language === "ar" ? "text-right" : "text-left"}`} htmlFor="email">
                                    {language === "ar" ? "البريد الإلكتروني" : "Email Address"}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-silver group-focus-within:text-blue transition-colors">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        dir="ltr"
                                        className="w-full pl-11 pr-5 py-3.5 rounded-xl bg-glass-dark border border-glass-border focus:border-blue focus:bg-background focus:outline-none focus:ring-1 focus:ring-blue transition-all text-foreground placeholder-silver/30 shadow-inner"
                                        placeholder="user@example.com"
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
                                            <motion.span
                                                animate={{ x: isHovered ? (language === "ar" ? -5 : 5) : 0 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                            >
                                                <LogIn className={`w-5 h-5 ${language === "ar" ? "scale-x-[-1]" : ""}`} />
                                            </motion.span>
                                        </>
                                    )}
                                </span>
                            </button>
                        </motion.form>

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
        </main>
    );
}
