"use client";
import { useState, useCallback, useEffect, createContext, useContext } from "react";

type Toast = { id: string; message: string; type: "success" | "error" | "info" | "warning" };

const ToastContext = createContext<{ addToast: (message: string, type?: Toast["type"]) => void }>({ addToast: () => { } });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onDone={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
    useEffect(() => { const timer = setTimeout(onDone, 3000); return () => clearTimeout(timer); }, [onDone]);

    const colors: Record<string, string> = {
        success: "bg-emerald-500",
        error: "bg-red-500",
        warning: "bg-amber-500",
        info: "bg-blue-500",
    };
    const icons: Record<string, string> = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };

    return (
        <div className={`pointer-events-auto px-5 py-3 rounded-xl ${colors[toast.type]} text-white font-bold text-sm shadow-2xl flex items-center gap-2 animate-[slideUp_0.3s_ease-out]`}>
            <span className="text-lg">{icons[toast.type]}</span>
            {toast.message}
        </div>
    );
}
