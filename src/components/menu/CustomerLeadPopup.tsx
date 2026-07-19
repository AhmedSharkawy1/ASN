'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, ArrowRight, ArrowLeft } from 'lucide-react';

interface CustomerLeadPopupProps {
    config: any;
    isAr: boolean;
    isDark: boolean;
    primaryColor: string;
    bgBody: string;
    textMain: string;
    textMuted: string;
    onComplete: () => void;
}

export default function CustomerLeadPopup({
    config,
    isAr,
    isDark,
    primaryColor,
    bgBody,
    textMain,
    textMuted,
    onComplete
}: CustomerLeadPopupProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const logoUrl = config.logo_url || config.vicino_logo_url;

    // Prevent scrolling behind popup
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            setError(isAr ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please enter your name and phone number');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/customers/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurant_id: config.id,
                    name: name.trim(),
                    phone: phone.trim()
                })
            });

            if (!res.ok) {
                throw new Error('Failed to submit');
            }

            // Save to localStorage so it doesn't show again
            localStorage.setItem(`lead_captured_${config.id}`, 'true');
            onComplete();
        } catch (err) {
            console.error(err);
            setError(isAr ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : 'An error occurred, please try again');
            setLoading(false);
        }
    };

    const handleSkip = () => {
        localStorage.setItem(`lead_captured_${config.id}`, 'skipped');
        onComplete();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md"
                style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)' }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative"
                    style={{ backgroundColor: bgBody, color: textMain }}
                    dir={isAr ? 'rtl' : 'ltr'}
                >
                    {/* Skip Button */}
                    <button
                        onClick={handleSkip}
                        className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                        style={{ color: textMuted, right: isAr ? 'auto' : '1rem', left: isAr ? '1rem' : 'auto' }}
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8">
                        {/* Logo */}
                        <div className="flex justify-center mb-6">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-full shadow-lg border-4 border-white/10" />
                            ) : (
                                <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: primaryColor, color: '#fff' }}>
                                    <span className="text-2xl font-bold">{config.name?.charAt(0)}</span>
                                </div>
                            )}
                        </div>

                        {/* Title & Description */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold mb-2">
                                {isAr ? 'أهلاً بك في' : 'Welcome to'} <span style={{ color: primaryColor }}>{config.name}</span>
                            </h2>
                            <p className="text-sm opacity-80" style={{ color: textMuted }}>
                                {isAr 
                                    ? 'سجل بياناتك لتصلك أحدث عروضنا وأخبارنا أولاً بأول!' 
                                    : 'Enter your details to receive our latest offers and news!'}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <div className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'}`} style={{ color: textMuted }}>
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={isAr ? 'الاسم' : 'Full Name'}
                                    className={`w-full py-3.5 px-12 rounded-xl border outline-none transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/40' : 'bg-black/5 border-black/10 text-black placeholder-black/40'}`}
                                    style={{ 
                                        color: textMain,
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = primaryColor;
                                        e.target.style.boxShadow = `0 0 0 2px ${primaryColor}40`;
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            <div className="relative">
                                <div className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'}`} style={{ color: textMuted }}>
                                    <Phone size={18} />
                                </div>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder={isAr ? 'رقم التلفون' : 'Phone Number'}
                                    className={`w-full py-3.5 px-12 rounded-xl border outline-none transition-all duration-300 focus:ring-2 focus:ring-opacity-50 text-left ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/40' : 'bg-black/5 border-black/10 text-black placeholder-black/40'}`}
                                    style={{ 
                                        color: textMain,
                                        direction: 'ltr'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = primaryColor;
                                        e.target.style.boxShadow = `0 0 0 2px ${primaryColor}40`;
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            {error && (
                                <motion.p 
                                    initial={{ opacity: 0, y: -10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="text-red-500 text-sm text-center"
                                >
                                    {error}
                                </motion.p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 mt-4 hover:opacity-90 transition-opacity disabled:opacity-70"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {loading ? (
                                    <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        {isAr ? 'متابعة للمنيو' : 'Continue to Menu'}
                                        {isAr ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleSkip}
                                className="w-full py-2 text-sm text-center transition-colors hover:underline mt-2"
                                style={{ color: textMuted }}
                            >
                                {isAr ? 'تخطي' : 'Skip'}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
