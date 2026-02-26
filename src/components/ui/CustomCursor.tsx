"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function CustomCursor() {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const updateCursorPosition = (e: MouseEvent) => {
            if (!isVisible) setIsVisible(true);
            setPosition({ x: e.clientX, y: e.clientY });

            const target = e.target as HTMLElement;
            setIsHovering(
                window.getComputedStyle(target).cursor === 'pointer' ||
                target.tagName.toLowerCase() === 'button' ||
                target.closest('a') !== null ||
                target.closest('button') !== null
            );
        };

        window.addEventListener("mousemove", updateCursorPosition);
        return () => window.removeEventListener("mousemove", updateCursorPosition);
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <>
            {/* Large soft ambient glow */}
            <motion.div
                className="fixed top-0 left-0 w-96 h-96 rounded-full pointer-events-none z-0 mix-blend-screen hidden md:block"
                animate={{
                    x: position.x - 192,
                    y: position.y - 192,
                    scale: isHovering ? 1.2 : 1,
                    opacity: isHovering ? 0.8 : 0.3,
                }}
                transition={{ type: "tween", ease: "backOut", duration: 0.8 }}
                style={{
                    background: "radial-gradient(circle, rgba(46,163,255,0.12) 0%, rgba(46,163,255,0) 70%)",
                }}
            />
            {/* Small bright point light */}
            <motion.div
                className="fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[100] mix-blend-screen hidden md:block"
                animate={{
                    x: position.x - 16,
                    y: position.y - 16,
                    scale: isHovering ? 1.5 : 1,
                }}
                transition={{ type: "tween", ease: "backOut", duration: 0.15 }}
                style={{
                    background: "radial-gradient(circle, rgba(46,163,255,0.8) 0%, rgba(46,163,255,0) 70%)",
                }}
            />
        </>
    );
}
