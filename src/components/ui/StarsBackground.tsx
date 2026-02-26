"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export default function StarsBackground() {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Memoize the elements so they don't jump on re-renders
    const { stars, shootingStars, stardust, glowingStars } = useMemo(() => {
        // 1. Static/Twinkling Stars (Increased to 300)
        const starsArr = Array.from({ length: 300 }).map((_, i) => ({
            id: `star-${i}`,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2.5 + 0.5,
            duration: Math.random() * 10 + 10, // Faster twinkle
            delay: Math.random() * 5,
        }));

        // 2. Shooting Stars (From right to left, bottom to top)
        const shootingStarsArr = Array.from({ length: 8 }).map((_, i) => ({
            id: `shooting-${i}`,
            bottom: `${Math.random() * 50}%`, // Start in lower half
            right: `${Math.random() * 50}%`, // Start in right half
            delay: Math.random() * 15 + i * 5, // Randomly staggered
            duration: Math.random() * 1.5 + 0.8, // Fast burst
        }));

        // 3. Stardust (tiny floating universe dust)
        const stardustArr = Array.from({ length: 150 }).map((_, i) => ({
            id: `dust-${i}`,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 1 + 0.2, // Extremely tiny
            duration: Math.random() * 60 + 40, // Very slow drift
        }));

        // 4. Glowing Stars (Hyper-Luminous "Hero" Stars)
        const glowingStarsArr = Array.from({ length: 25 }).map((_, i) => ({
            id: `glowing-${i}`,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 2, // Larger base size
            duration: Math.random() * 8 + 4, // Fast pulsing
            delay: Math.random() * 5,
        }));

        return { stars: starsArr, shootingStars: shootingStarsArr, stardust: stardustArr, glowingStars: glowingStarsArr };
    }, []);

    // Only render if mounted and we are in dark mode
    if (!mounted || theme !== "dark") return null;

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#020617]">
            {/* 0. Nebula / Cosmic Core / Aurora Layer (Huge blurred floating gradients) */}
            <motion.div
                className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/30 blur-[150px] mix-blend-screen"
                animate={{
                    scale: [1, 1.2, 0.9, 1],
                    x: [0, 100, -50, 0],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-fuchsia-900/20 blur-[120px] mix-blend-screen"
                animate={{
                    scale: [1, 1.3, 0.8, 1],
                    y: [0, -100, 50, 0],
                    opacity: [0.2, 0.5, 0.2]
                }}
                transition={{ duration: 35, repeat: Infinity, ease: "easeInOut", delay: 5 }}
            />
            <motion.div
                className="absolute top-[30%] left-[30%] w-[50vw] h-[50vw] rounded-full bg-blue-900/40 blur-[180px] mix-blend-screen"
                animate={{
                    rotate: [0, 90, 180, 270, 360],
                    scale: [1, 1.1, 0.9, 1],
                    opacity: [0.3, 0.7, 0.3]
                }}
                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            />


            {/* 1. Standard Twinkling Stars */}
            {stars.map((star) => (
                <motion.div
                    key={star.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                        boxShadow: `0 0 ${star.size + 2}px rgba(255,255,255,0.8)`
                    }}
                    animate={{
                        opacity: [0.1, 1, 0.1], // Strong twinkle
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: star.duration,
                        delay: star.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}

            {/* 2. Stardust Parallax Layer */}
            {stardust.map((dust) => (
                <motion.div
                    key={dust.id}
                    className="absolute rounded-full bg-blue-100/40"
                    style={{
                        left: `${dust.x}%`,
                        top: `${dust.y}%`,
                        width: dust.size,
                        height: dust.size,
                    }}
                    animate={{
                        y: ["0%", "-1000%"], // Drifting upwards
                        x: ["0%", "-500%"],  // Drifting leftwards
                        opacity: [0, 0.8, 0] // Fade in and out
                    }}
                    transition={{
                        duration: dust.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 20
                    }}
                />
            ))}

            {/* 3. Glowing "Hero" Stars (Hyper-Luminous) */}
            {glowingStars.map((glowing) => (
                <motion.div
                    key={glowing.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        left: `${glowing.x}%`,
                        top: `${glowing.y}%`,
                        width: glowing.size,
                        height: glowing.size,
                        // Intense double shadow: sharp white core, diffuse cyan-blue halo
                        boxShadow: `0 0 ${glowing.size * 3}px 1px rgba(255,255,255,1), 0 0 ${glowing.size * 8}px 4px rgba(96,165,250,0.8)`
                    }}
                    animate={{
                        opacity: [0.5, 1, 0.5], // Pulsing
                        scale: [1, 1.4, 1],
                    }}
                    transition={{
                        duration: glowing.duration,
                        delay: glowing.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}

            {/* 4. Shooting Stars (Meteor Shower: Right-to-Left, Bottom-to-Top) */}
            {shootingStars.map((shooting) => (
                <motion.div
                    key={shooting.id}
                    className="absolute h-[2px] w-[200px] bg-gradient-to-l from-transparent via-white to-transparent opacity-0 origin-left"
                    style={{
                        bottom: shooting.bottom,
                        right: shooting.right,
                        transform: "rotate(35deg)", // Diagonal angle pointing top-left when moving left/up (adjusted from 45 to 35 for sharper crossing)
                        filter: "drop-shadow(0 0 10px rgba(255,255,255,1))"
                    }}
                    animate={{
                        x: [0, -1500],   // Move aggressively left (increase distance)
                        y: [0, -1500],   // Move aggressively up (increase distance)
                        opacity: [0, 1, 1, 0, 0], // Flash, speed, vanish
                        scaleX: [0, 2, 3, 0, 0] // Stretch vastly and shrink
                    }}
                    transition={{
                        duration: shooting.duration,
                        delay: shooting.delay,
                        repeat: Infinity,
                        repeatDelay: Math.random() * 6 + 3, // Faster respawns
                        ease: "easeIn",
                    }}
                >
                    {/* Meteor Head Glowing Core (on the leading edge i.e. left) */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[6px] h-[6px] rounded-full bg-white shadow-[0_0_20px_6px_#fff]"></div>
                </motion.div>
            ))}

            {/* Vignette Layer to anchor focus to center */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] opacity-80 mix-blend-multiply"></div>
        </div>
    );
}
