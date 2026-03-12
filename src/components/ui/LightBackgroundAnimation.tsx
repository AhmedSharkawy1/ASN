"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";

export default function LightBackgroundAnimation() {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Very subtle, gentle floating elements
    const orbs = useMemo(() => {
        return Array.from({ length: 4 }).map((_, i) => ({
            id: `orb-${i}`,
            x: 10 + Math.random() * 80,
            y: 10 + Math.random() * 80,
            size: 200 + Math.random() * 250,
            duration: 40 + Math.random() * 30,
            delay: Math.random() * 10,
            // Very gentle, muted colors: sage, lavender, peach, sky
            color: [
                'hsla(170, 25%, 80%, 0.2)',
                'hsla(260, 20%, 85%, 0.15)',
                'hsla(30, 25%, 85%, 0.18)',
                'hsla(200, 20%, 82%, 0.15)',
            ][i],
        }));
    }, []);

    if (!mounted || theme !== "light") return null;

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Clean warm base */}
            <div className="absolute inset-0 bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100/50" />

            {/* Very soft floating orbs — GPU-accelerated */}
            {orbs.map((orb) => (
                <div
                    key={orb.id}
                    className="absolute rounded-full will-change-transform animate-gentleDrift"
                    style={{
                        left: `${orb.x}%`,
                        top: `${orb.y}%`,
                        width: orb.size,
                        height: orb.size,
                        background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
                        filter: 'blur(60px)',
                        animationDuration: `${orb.duration}s`,
                        animationDelay: `${orb.delay}s`,
                    }}
                />
            ))}

            {/* Subtle dot texture */}
            <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                    backgroundImage: 'radial-gradient(circle, #78716c 0.8px, transparent 0.8px)',
                    backgroundSize: '28px 28px',
                }}
            />

            <style jsx>{`
                @keyframes gentleDrift {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(8px, -12px) scale(1.02); }
                    66% { transform: translate(-6px, 6px) scale(0.98); }
                }
                .animate-gentleDrift { animation: gentleDrift ease-in-out infinite; }
            `}</style>
        </div>
    );
}
