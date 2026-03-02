"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";

export default function StarsBackground() {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Generate elements once with useMemo — pure CSS animations, no framer-motion
    const { stars, shootingStars, glowingStars } = useMemo(() => {
        // Reduced to 50 stars (CSS animated)
        const starsArr = Array.from({ length: 50 }).map((_, i) => ({
            id: `star-${i}`,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2.5 + 0.5,
            duration: Math.random() * 6 + 4,
            delay: Math.random() * 5,
        }));

        // Reduced from 8 → 3 shooting stars, and made them slower
        const shootingStarsArr = Array.from({ length: 3 }).map((_, i) => ({
            id: `shooting-${i}`,
            bottom: `${Math.random() * 50}%`,
            right: `${Math.random() * 50}%`,
            delay: Math.random() * 15 + i * 8, // Slower respawn (more delay)
            duration: Math.random() * 1.5 + 2.5, // Slower crossing (2.5s to 4s instead of 0.8s to 2.3s)
        }));

        // 5 glowing stars
        const glowingStarsArr = Array.from({ length: 5 }).map((_, i) => ({
            id: `glowing-${i}`,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 2,
            duration: Math.random() * 8 + 4,
            delay: Math.random() * 5,
        }));

        return { stars: starsArr, shootingStars: shootingStarsArr, glowingStars: glowingStarsArr };
    }, []);

    // Only render if mounted and we are in dark mode
    if (!mounted || theme !== "dark") return null;

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#020617]">
            {/* Nebula Layer — pure CSS, no JS animations */}
            <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/30 blur-[150px] mix-blend-screen animate-nebula1" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-fuchsia-900/20 blur-[120px] mix-blend-screen animate-nebula2" />
            <div className="absolute top-[30%] left-[30%] w-[50vw] h-[50vw] rounded-full bg-blue-900/40 blur-[180px] mix-blend-screen animate-nebula3" />

            {/* Stars — pure CSS twinkle */}
            {stars.map((star) => (
                <div
                    key={star.id}
                    className="absolute rounded-full bg-white animate-twinkle"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                        boxShadow: `0 0 ${star.size + 2}px rgba(255,255,255,0.8)`,
                        animationDuration: `${star.duration}s`,
                        animationDelay: `${star.delay}s`,
                    }}
                />
            ))}

            {/* Glowing Stars — pure CSS pulse */}
            {glowingStars.map((glowing) => (
                <div
                    key={glowing.id}
                    className="absolute rounded-full bg-white animate-glow-pulse"
                    style={{
                        left: `${glowing.x}%`,
                        top: `${glowing.y}%`,
                        width: glowing.size,
                        height: glowing.size,
                        boxShadow: `0 0 ${glowing.size * 3}px 1px rgba(255,255,255,1), 0 0 ${glowing.size * 8}px 4px rgba(96,165,250,0.8)`,
                        animationDuration: `${glowing.duration}s`,
                        animationDelay: `${glowing.delay}s`,
                    }}
                />
            ))}

            {/* Shooting Stars — pure CSS */}
            {shootingStars.map((shooting) => (
                <div
                    key={shooting.id}
                    className="absolute h-[2px] w-[200px] bg-gradient-to-l from-transparent via-white to-transparent animate-shoot origin-left"
                    style={{
                        bottom: shooting.bottom,
                        right: shooting.right,
                        transform: "rotate(35deg)",
                        filter: "drop-shadow(0 0 10px rgba(255,255,255,1))",
                        animationDuration: `${shooting.duration}s`,
                        animationDelay: `${shooting.delay}s`,
                    }}
                >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[6px] h-[6px] rounded-full bg-white shadow-[0_0_20px_6px_#fff]"></div>
                </div>
            ))}

            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] opacity-80 mix-blend-multiply"></div>

            <style jsx>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.1; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                .animate-twinkle {
                    animation: twinkle ease-in-out infinite;
                }
                @keyframes glow-pulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.4); }
                }
                .animate-glow-pulse {
                    animation: glow-pulse ease-in-out infinite;
                }
                @keyframes shoot {
                    0% { transform: rotate(35deg) translateX(0) scaleX(0); opacity: 0; }
                    10% { opacity: 1; transform: rotate(35deg) translateX(-200px) scaleX(2); }
                    30% { opacity: 1; transform: rotate(35deg) translateX(-800px) scaleX(3); }
                    50%, 100% { opacity: 0; transform: rotate(35deg) translateX(-1500px) scaleX(0); }
                }
                .animate-shoot {
                    animation: shoot ease-in infinite;
                    animation-fill-mode: both;
                }
                @keyframes nebula1 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
                    50% { transform: translate(100px, -50px) scale(1.2); opacity: 0.6; }
                }
                .animate-nebula1 { animation: nebula1 40s ease-in-out infinite; }
                @keyframes nebula2 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
                    50% { transform: translate(-100px, 50px) scale(1.3); opacity: 0.5; }
                }
                .animate-nebula2 { animation: nebula2 35s ease-in-out infinite 5s; }
                @keyframes nebula3 {
                    0% { transform: rotate(0deg) scale(1); opacity: 0.3; }
                    50% { transform: rotate(180deg) scale(1.1); opacity: 0.7; }
                    100% { transform: rotate(360deg) scale(1); opacity: 0.3; }
                }
                .animate-nebula3 { animation: nebula3 50s linear infinite; }
            `}</style>
        </div>
    );
}
