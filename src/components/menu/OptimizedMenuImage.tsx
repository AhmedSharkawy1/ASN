'use client';

import React, { useMemo, useRef, useCallback } from 'react';
import { getOriginalUrl } from '@/lib/imageUtils';
import { logImageDebug, logImageFallback, logImageMount } from '@/lib/imageDebug';

interface OptimizedMenuImageProps {
  src?: string | null;           // Legacy support
  thumbnailSrc?: string | null;  // New optimized 400px thumbnail
  originalSrc?: string | null;   // Original 1600px image
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

/**
 * Optimized menu image component.
 * 
 * KEY BEHAVIOR: Uses the exact URLs provided from the database.
 * Does NOT fabricate thumbnail URLs.
 * 
 * Fallback chain (one-shot, no loops):
 *   thumbnailSrc (if provided & not useOriginal) → originalSrc / src → default fallback → placeholder
 * 
 * Each fallback step happens at most ONCE.
 */
export default function OptimizedMenuImage({
  src,
  thumbnailSrc,
  originalSrc,
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
  // Track fallback stage with a ref to prevent re-render loops
  // 0 = try primary (thumb or original), 1 = try secondary (original if thumb failed), 2 = default fallback
  const fallbackStageRef = useRef(0);
  const currentSrcRef = useRef<string>('');

  const primarySrc = useMemo(() => {
    fallbackStageRef.current = 0;

    // Determine the absolute best source to use first
    let bestSrc = '';
    
    if (useOriginal) {
      bestSrc = originalSrc || src || '';
    } else {
      bestSrc = thumbnailSrc || originalSrc || src || '';
    }

    if (!bestSrc) {
      fallbackStageRef.current = 2;
      logImageMount(DEFAULT_FALLBACK, 'OptimizedMenuImage[no-src]');
      return DEFAULT_FALLBACK;
    }

    // Convert legacy/thumbnail paths to original if useOriginal is strictly requested
    const targetUrl = useOriginal ? getOriginalUrl(bestSrc) : bestSrc;
    
    logImageMount(targetUrl);
    logImageDebug({
      imageSource: bestSrc,
      thumbnailAvailable: !!thumbnailSrc && !useOriginal,
      finalSrc: targetUrl,
      fallbackTriggered: false,
      fallbackStage: 0,
    });

    currentSrcRef.current = targetUrl;
    return targetUrl;
  }, [src, thumbnailSrc, originalSrc, useOriginal]);

  // One-shot error handler — each stage fires at most once
  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const currentStage = fallbackStageRef.current;

    if (currentStage === 0) {
      // Stage 0 failed (which was likely thumbnailSrc) → try originalSrc
      const fallbackUrl = originalSrc || src;
      const targetFallbackUrl = useOriginal && fallbackUrl ? getOriginalUrl(fallbackUrl) : fallbackUrl;
      
      if (targetFallbackUrl && targetFallbackUrl !== currentSrcRef.current) {
        fallbackStageRef.current = 1;
        currentSrcRef.current = targetFallbackUrl;
        img.src = targetFallbackUrl;
        logImageFallback(primarySrc, targetFallbackUrl, 1);
        return;
      }
      fallbackStageRef.current = 1;
    }

    if (fallbackStageRef.current <= 1) {
      // Stage 1 failed (or skipped) → use default fallback
      fallbackStageRef.current = 2;
      currentSrcRef.current = DEFAULT_FALLBACK;
      img.src = DEFAULT_FALLBACK;
      logImageFallback(primarySrc, DEFAULT_FALLBACK, 2);
      return;
    }

    // Stage 2+ → nothing more to try, show placeholder via CSS
    logImageFallback(primarySrc, 'placeholder', 3);
  }, [src, thumbnailSrc, originalSrc, primarySrc, useOriginal]);

  const isFilled = fill && !width && !height;

  return (
    <div 
      className={`relative overflow-hidden ${className}`} 
      onClick={onClick}
      style={style}
    >
      {primarySrc ? (
        <img
          src={primarySrc}
          alt={alt}
          className={`object-cover transition-opacity duration-300 ${isFilled ? 'w-full h-full absolute inset-0' : ''}`}
          onError={handleError}
          loading={priority ? undefined : 'lazy'}
          decoding="async"
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
