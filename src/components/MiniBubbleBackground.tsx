import React, { useEffect, useRef } from 'react';

export type BubbleColorVariant =
  | 'cyan'
  | 'purple'
  | 'gold'
  | 'pink'
  | 'lime'
  | 'orange';

interface MiniBubbleItem {
  id: number;
  color: BubbleColorVariant;
}

const MINI_BUBBLES: MiniBubbleItem[] = [
  { id: 1, color: 'cyan' },
  { id: 2, color: 'purple' },
  { id: 3, color: 'gold' },
  { id: 4, color: 'cyan' },
  { id: 5, color: 'purple' },
  { id: 6, color: 'gold' },
  { id: 7, color: 'pink' },
  { id: 8, color: 'cyan' },
  { id: 9, color: 'purple' },
  { id: 10, color: 'gold' },
  { id: 11, color: 'lime' },
  { id: 12, color: 'cyan' },
  { id: 13, color: 'purple' },
  { id: 14, color: 'gold' },
  { id: 15, color: 'pink' },
  { id: 16, color: 'cyan' },
  { id: 17, color: 'purple' },
  { id: 18, color: 'gold' },
  { id: 19, color: 'cyan' },
  { id: 20, color: 'purple' },
  { id: 21, color: 'gold' },
  { id: 22, color: 'lime' },
  { id: 23, color: 'cyan' },
  { id: 24, color: 'purple' },
  { id: 25, color: 'gold' },
  { id: 26, color: 'pink' },
  { id: 27, color: 'cyan' },
  { id: 28, color: 'purple' },
  { id: 29, color: 'gold' },
  { id: 30, color: 'cyan' },
  { id: 31, color: 'purple' },
  { id: 32, color: 'gold' },
  { id: 33, color: 'pink' },
  { id: 34, color: 'cyan' },
  { id: 35, color: 'purple' },
  { id: 36, color: 'gold' },
];

/**
 * Standalone Background Floating Bubble Animation Layer optimized for Web and Android APK builds.
 *
 * Features:
 * - Distinct, visible yet gentle watermark bubbles (15px to 58px) with a soft, slightly defined outer edge
 * - Highly translucent pastel iridescent fills (muted cyan, soft purple, faint gold, soft rose) at 0.25–0.35 opacity
 * - No blur or heavy gloss — crisp, calm, non-distracting watermark spheres
 * - Enforces position: fixed; inset: 0; z-index: -10; pointer-events: none;
 * - Smooth GPU-accelerated ambient floating motion via will-change: transform;
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
      const rawDpr = window.devicePixelRatio || 1;
      const clampedDpr = Math.min(Math.max(rawDpr, 1), 2);
      const borderWidthPx = clampedDpr >= 1.5 ? '1px' : '1.15px';
      const travelDistancePx = Math.round((window.innerHeight || 800) * 1.16);

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
          className={`svh-mini-bubble-particle svh-bubble-color-${bubble.color} svh-mini-bubble-item-${bubble.id}`}
        />
      ))}
    </div>
  );
});
