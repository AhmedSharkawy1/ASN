"use client";

import React from 'react';
import { motion } from 'framer-motion';

type SharedMarqueeProps = {
    text: string;
    bgColor?: string;
    textColor?: string;
    direction?: 'ltr' | 'rtl';
};

export default function SharedMarquee({
    text,
    bgColor = '#e74c3c',
    textColor = '#ffffff',
    direction = 'rtl'
}: SharedMarqueeProps) {
    if (!text) return null;

    return (
        <div
            className="w-full overflow-hidden flex items-center py-2"
            style={{ backgroundColor: bgColor, color: textColor }}
            dir="ltr" // Always LTR for consistent animation math
        >
            <motion.div
                className="whitespace-nowrap font-bold text-sm flex items-center"
                initial={{ x: direction === 'rtl' ? '100%' : '-100%' }}
                animate={{ x: direction === 'rtl' ? '-100%' : '100%' }}
                transition={{
                    repeat: Infinity,
                    duration: 15,
                    ease: 'linear',
                }}
            >
                <span className="px-8">{text}</span>
                <span className="px-8">{text}</span>
                <span className="px-8">{text}</span>
            </motion.div>
        </div>
    );
}
