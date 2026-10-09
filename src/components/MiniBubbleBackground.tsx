import React, { useEffect, useRef } from 'react';

interface MiniBubbleItem {
  id: number;
  sizePx: number;
  leftPercent: number;
  durationSec: number;
  delaySec: number;
  driftPx: number;
}

const MINI_BUBBLES: MiniBubbleItem[] = [
  { id: 1, sizePx: 8, leftPercent: 6, durationSec: 11, delaySec: 0, driftPx: 14 },
  { id: 2, sizePx: 14, leftPercent: 15, durationSec: 16, delaySec: -4, driftPx: -18 },
  { id: 3, sizePx: 10, leftPercent: 25, durationSec: 9, delaySec: -2, driftPx: 12 },
  { id: 4, sizePx: 18, leftPercent: 34, durationSec: 19, delaySec: -9, driftPx: -20 },
  { id: 5, sizePx: 7, leftPercent: 44, durationSec: 8, delaySec: -1, driftPx: 10 },
  { id: 6, sizePx: 13, leftPercent: 53, durationSec: 14, delaySec: -6, driftPx: -14 },
  { id: 7, sizePx: 16, leftPercent: 63, durationSec: 17, delaySec: -11, driftPx: 18 },
  { id: 8, sizePx: 9, leftPercent: 72, durationSec: 10, delaySec: -3, driftPx: -12 },
  { id: 9, sizePx: 15, leftPercent: 81, durationSec: 15, delaySec: -7, driftPx: 16 },
  { id: 10, sizePx: 11, leftPercent: 89, durationSec: 12, delaySec: -5, driftPx: -15 },
  { id: 11, sizePx: 19, leftPercent: 95, durationSec: 20, delaySec: -13, driftPx: -16 },
];

/**
 * Standalone subtle Mini Bubble background animation layer optimized for 90Hz / 120Hz / 144Hz
 * mobile WebView (Android/iOS APK) and desktop displays.
 *
 * Performance & Battery Guarantees:
 * - Capped at 11 lightweight nodes (strictly within the 12-15 mobile budget).
 * - Pure GPU compositor layer promotion via translate3d(...) and will-change: transform, opacity.
 * - Zero layout thrashing: syncs viewport height/DPR metrics inside a debounced + requestAnimationFrame
 *   passive resize/orientation listener, and pauses animations when document.hidden is true.
 * - Enforces position: fixed, top: 0, left: 0, z-index: -1, pointer-events: none for zero touch latency.
 */
export const MiniBubbleBackground: React.FC = React.memo(() => {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || typeof window === 'undefined') return;

    let rafId: number | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const syncViewportAndDprMetrics = () => {
      rafId = null;
      if (!layer) return;
      // Clamp devicePixelRatio between 1 and 2 so high-DPI mobile screens stay crisp without GPU overdraw
      const rawDpr = window.devicePixelRatio || 1;
      const clampedDpr = Math.min(Math.max(rawDpr, 1), 2);
      const borderWidthPx = clampedDpr >= 1.5 ? '0.75px' : '1px';
      const travelDistancePx = Math.round((window.innerHeight || 800) * 1.12);

      layer.style.setProperty('--svh-bubble-border-w', borderWidthPx);
      layer.style.setProperty('--svh-bubble-travel-y', `-${travelDistancePx}px`);
      layer.style.setProperty('--svh-bubble-mid-y', `-${Math.round(travelDistancePx * 0.48)}px`);
    };

    const scheduleMetricsUpdate = () => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
        }
        rafId = window.requestAnimationFrame(syncViewportAndDprMetrics);
      }, 120);
    };

    const handleVisibilityChange = () => {
      if (!layer) return;
      layer.setAttribute('data-paused', document.hidden ? 'true' : 'false');
    };

    // Initial sync via rAF
    rafId = window.requestAnimationFrame(syncViewportAndDprMetrics);

    window.addEventListener('resize', scheduleMetricsUpdate, { passive: true });
    window.addEventListener('orientationchange', scheduleMetricsUpdate, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });

    return () => {
      window.removeEventListener('resize', scheduleMetricsUpdate);
      window.removeEventListener('orientationchange', scheduleMetricsUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className="svh-mini-bubble-layer"
      data-paused="false"
      aria-hidden="true"
    >
      {MINI_BUBBLES.map((bubble) => (
        <span
          key={bubble.id}
          className={`svh-mini-bubble-particle svh-mini-bubble-item-${bubble.id}`}
        />
      ))}
    </div>
  );
});
