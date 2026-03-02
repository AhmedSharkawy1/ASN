"use client";

import { useEffect, useState } from "react";

export default function CustomCursor() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(true);

    useEffect(() => {
        // Skip on mobile/touch devices
        const mq = window.matchMedia("(pointer: fine)");
        if (!mq.matches) return;
        setIsMobile(false);

        let rafId: number;
        let mouseX = 0;
        let mouseY = 0;
        let currentX = 0;
        let currentY = 0;

        const onMouseMove = (e: MouseEvent) => {
            if (!isVisible) setIsVisible(true);
            mouseX = e.clientX;
            mouseY = e.clientY;

            const target = e.target as HTMLElement;
            setIsHovering(
                window.getComputedStyle(target).cursor === 'pointer' ||
                target.tagName.toLowerCase() === 'button' ||
                target.closest('a') !== null ||
                target.closest('button') !== null
            );
        };

        // Use requestAnimationFrame for smooth lerp instead of framer-motion
        const glowEl = document.getElementById('cursor-glow');
        const dotEl = document.getElementById('cursor-dot');

        const animate = () => {
            currentX += (mouseX - currentX) * 0.12;
            currentY += (mouseY - currentY) * 0.12;

            if (glowEl) {
                glowEl.style.transform = `translate(${currentX - 192}px, ${currentY - 192}px) scale(${isHovering ? 1.2 : 1})`;
                glowEl.style.opacity = isHovering ? '0.8' : '0.3';
            }
            if (dotEl) {
                dotEl.style.transform = `translate(${mouseX - 16}px, ${mouseY - 16}px) scale(${isHovering ? 1.5 : 1})`;
            }

            rafId = requestAnimationFrame(animate);
        };

        window.addEventListener("mousemove", onMouseMove);
        rafId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            cancelAnimationFrame(rafId);
        };
    }, [isVisible, isHovering]);

    if (isMobile || !isVisible) return null;

    return (
        <>
            {/* Large soft ambient glow — no framer-motion, uses RAF */}
            <div
                id="cursor-glow"
                className="fixed top-0 left-0 w-96 h-96 rounded-full pointer-events-none z-0 mix-blend-screen hidden md:block will-change-transform transition-opacity duration-300"
                style={{
                    background: "radial-gradient(circle, rgba(46,163,255,0.12) 0%, rgba(46,163,255,0) 70%)",
                }}
            />
            {/* Small bright point light */}
            <div
                id="cursor-dot"
                className="fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[100] mix-blend-screen hidden md:block will-change-transform"
                style={{
                    background: "radial-gradient(circle, rgba(46,163,255,0.8) 0%, rgba(46,163,255,0) 70%)",
                }}
            />
        </>
    );
}
