"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";

export default function LightBackgroundAnimation() {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Generate floating particles — pure CSS animations, no framer-motion
    const { particles, glassShapes } = useMemo(() => {
        const particlesArr = Array.from({ length: 10 }).map((_, i) => ({
            id: `particle-${i}`,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 6 + 2,
            duration: Math.random() * 20 + 20,
            delay: Math.random() * 10,
            driftDir: Math.random() > 0.5 ? 1 : -1,
        }));

        const shapesArr = Array.from({ length: 2 }).map((_, i) => {
            const size = Math.random() * 150 + 100;
            return {
                id: `glass-${i}`,
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10,
                size: size,
                type: Math.random() > 0.5 ? 'circle' : 'square',
                duration: Math.random() * 30 + 40,
                delay: Math.random() * 10,
                rotation: Math.random() * 360,
            }
        });

        return { particles: particlesArr, glassShapes: shapesArr };
    }, []);

    if (!mounted || theme !== "light") return null;

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Base ambient glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.7)_0%,transparent_100%)] z-[-1] blur-3xl"></div>

            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100/70"></div>

            {/* Glowing Orbs — pure CSS */}
            <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-400/30 blur-2xl md:blur-[130px] mix-blend-normal md:mix-blend-multiply animate-orb1" />
            <div className="absolute top-[40%] right-[-10%] w-[50vw] h-[50vw] rounded-[40%] bg-cyan-400/30 blur-3xl md:blur-[140px] mix-blend-normal md:mix-blend-multiply animate-orb2" />
            <div className="absolute bottom-[-10%] left-[30%] w-[70vw] h-[70vw] rounded-[45%] bg-indigo-500/20 blur-3xl md:blur-[160px] mix-blend-normal md:mix-blend-multiply animate-orb3" />

            {/* Glass Shapes — CSS animated */}
            {glassShapes.map((shape) => (
                <div
                    key={shape.id}
                    className={`absolute border-[1.5px] border-white/60 shadow-[0_8px_32px_0_rgba(14,165,233,0.15)] backdrop-blur-md bg-white/30 animate-float ${shape.type === 'circle' ? 'rounded-full' : 'rounded-[3rem]'}`}
                    style={{
                        width: shape.size,
                        height: shape.size,
                        left: `${shape.x}%`,
                        top: `${shape.y}%`,
                        rotate: `${shape.rotation}deg`,
                        animationDuration: `${shape.duration}s`,
                        animationDelay: `${shape.delay}s`,
                    }}
                />
            ))}

            {/* Tech Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_50%,#000_40%,transparent_100%)]"></div>

            {/* Micro Particles — CSS animated */}
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute rounded-full bg-blue-400/40 animate-drift"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: particle.size,
                        height: particle.size,
                        boxShadow: `0 0 ${particle.size * 2}px rgba(56,189,248,0.5)`,
                        animationDuration: `${particle.duration}s`,
                        animationDelay: `${particle.delay}s`,
                        // @ts-expect-error CSS custom property
                        '--drift-dir': particle.driftDir,
                    }}
                />
            ))}

            <style jsx>{`
                @keyframes orb1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(200px, 100px) scale(1.3); }
                }
                .animate-orb1 { animation: orb1 25s ease-in-out infinite; }
                @keyframes orb2 {
                    0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
                    50% { transform: translate(-200px, -150px) rotate(180deg) scale(1.4); }
                }
                .animate-orb2 { animation: orb2 22s ease-in-out infinite 2s; }
                @keyframes orb3 {
                    0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
                    50% { transform: translate(150px, -200px) rotate(180deg) scale(1.3); }
                }
                .animate-orb3 { animation: orb3 30s linear infinite 5s; }
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    50% { transform: translateY(-50%) translateX(30%); }
                }
                .animate-float { animation: float linear infinite; }
                @keyframes drift {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(-1000%) translateX(-400%); opacity: 0; }
                }
                .animate-drift { animation: drift linear infinite; }
            `}</style>
        </div>
    );
}
