'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getThumbUrl, getOriginalUrl, getPlaceholderUrl, BLUR_PLACEHOLDER } from '@/lib/imageUtils';

interface OptimizedMenuImageProps {
  src?: string;
  alt?: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  useOriginal?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500';

export default function OptimizedMenuImage({
  src,
  alt = 'Menu item',
  className = '',
  fill = true,
  width,
  height,
  sizes = '(max-width: 768px) 100vw, 400px',
  priority = false,
  useOriginal = false,
  onClick,
  style,
}: OptimizedMenuImageProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [fallbackStage, setFallbackStage] = useState<number>(0); // 0: target, 1: original, 2: default fallback

  useEffect(() => {
    setFallbackStage(0);
    if (!src) {
      setImgSrc(DEFAULT_FALLBACK);
      setFallbackStage(2);
      return;
    }

    // Determine whether to use original or thumbnail
    const targetUrl = useOriginal ? getOriginalUrl(src) : getThumbUrl(src);
    setImgSrc(targetUrl);
  }, [src, useOriginal]);

  const handleError = () => {
    if (fallbackStage === 0 && !useOriginal) {
      // If thumbnail fails to load, try loading the original version
      setFallbackStage(1);
      setImgSrc(getOriginalUrl(src));
    } else if (fallbackStage < 2) {
      // If original fails to load, use the Unsplash placeholder
      setFallbackStage(2);
      setImgSrc(DEFAULT_FALLBACK);
    }
  };

  // If using width/height, we must disable fill
  const isFilled = fill && !width && !height;

  // Next.js Image component wrapper to handle styling and click events properly
  return (
    <div 
      className={`relative overflow-hidden ${className}`} 
      onClick={onClick}
      style={style}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={alt}
          className={`object-cover transition-opacity duration-300 ${isFilled ? 'w-full h-full absolute inset-0' : ''}`}
          onError={handleError}
          loading={priority ? undefined : 'lazy'}
          style={!isFilled ? { width: width || '100%', height: height || '100%' } : {}}
        />
      ) : (
        <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center absolute inset-0">
          <svg className="w-6 h-6 text-zinc-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );
}
