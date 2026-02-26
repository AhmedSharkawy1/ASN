"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export default function LightBackgroundAnimation() {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Generate floating particles and geometric glass shapes
    const { particles, glassShapes } = useMemo(() => {
        // Reduce particle count significantly for mobile performance (was 40, now 15)
        const particlesArr = Array.from({ length: 15 }).map((_, i) => ({
            id: `particle-${i}`,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 6 + 2,
            duration: Math.random() * 20 + 20,
            delay: Math.random() * 10,
        }));

        // Reduce heavy glass shapes (was 6, now 3)
        const shapesArr = Array.from({ length: 3 }).map((_, i) => {
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
            {/* Base ambient day glow layer (Central burst) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.7)_0%,transparent_100%)] z-[-1] blur-3xl"></div>

            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100/70"></div>

            {/* Glowing Tech Orbs (Vibrant colors heavily blurred, deeper contrast) */}
            <motion.div
                className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-400/30 blur-2xl md:blur-[130px] mix-blend-normal md:mix-blend-multiply"
                animate={{
                    x: [0, 200, -100, 0],
                    y: [0, 100, 200, 0],
                    scale: [1, 1.3, 0.8, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute top-[40%] right-[-10%] w-[50vw] h-[50vw] rounded-[40%] bg-cyan-400/30 blur-3xl md:blur-[140px] mix-blend-normal md:mix-blend-multiply"
                animate={{
                    x: [0, -200, 100, 0],
                    y: [0, -150, 50, 0],
                    rotate: [360, 180, 0],
                    scale: [1, 1.4, 0.9, 1],
                }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
            <motion.div
                className="absolute bottom-[-10%] left-[30%] w-[70vw] h-[70vw] rounded-[45%] bg-indigo-500/20 blur-3xl md:blur-[160px] mix-blend-normal md:mix-blend-multiply"
                animate={{
                    x: [0, 150, -200, 0],
                    y: [0, -200, 150, 0],
                    rotate: [0, 180, 360],
                    scale: [1, 0.8, 1.3, 1]
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear", delay: 5 }}
            />

            {/* Glassmorphism Floating Geometry (Sharper borders, highly visible glass) */}
            {glassShapes.map((shape) => (
                <motion.div
                    key={shape.id}
                    className={`absolute border-[1.5px] border-white/60 shadow-[0_8px_32px_0_rgba(14,165,233,0.15)] backdrop-blur-md bg-white/30 ${shape.type === 'circle' ? 'rounded-full' : 'rounded-[3rem]'}`}
                    style={{
                        width: shape.size,
                        height: shape.size,
                        left: `${shape.x}%`,
                        top: `${shape.y}%`,
                        rotate: `${shape.rotation}deg`
                    }}
                    animate={{
                        y: ["0%", "-50%", "0%"],
                        x: ["0%", "30%", "0%"],
                        rotate: shape.type === 'square' ? [shape.rotation, shape.rotation + 180, shape.rotation + 360] : undefined,
                    }}
                    transition={{
                        duration: shape.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: shape.delay
                    }}
                />
            ))}

            {/* Connecting Tech Lines (CSS Grid representation - slightly sharper) */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_50%,#000_40%,transparent_100%)]"></div>

            {/* Micro Particles drifting up (Brighter) */}
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full bg-blue-400/40"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: particle.size,
                        height: particle.size,
                        boxShadow: `0 0 ${particle.size * 2}px rgba(56,189,248,0.5)`
                    }}
                    animate={{
                        y: ["0%", "-1000%"],
                        x: ["0%", `${Math.random() > 0.5 ? '' : '-'}400%`], // drift left or right
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: particle.delay
                    }}
                />
            ))}

        </div>
    );
}
