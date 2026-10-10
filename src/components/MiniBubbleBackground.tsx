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

/**
 * Minimal count (11 floating soft micro-particles/dots) distributed across the viewport
 */
const MINI_BUBBLES: MiniBubbleItem[] = [
  { id: 1, color: 'pink' },
  { id: 4, color: 'cyan' },
  { id: 7, color: 'gold' },
  { id: 10, color: 'pink' },
  { id: 13, color: 'cyan' },
  { id: 16, color: 'lime' },
  { id: 19, color: 'purple' },
  { id: 22, color: 'pink' },
  { id: 25, color: 'cyan' },
  { id: 28, color: 'lime' },
  { id: 31, color: 'gold' },
];

/**
 * Ultra-Lightweight, High-Performance Combined Background Animation Layer
 * for the entire Study Vault Hub application wrapper (supporting both Web & Android APK):
 *
 * 1. Base Layer: Ultra-soft, slow-morphing Aurora gradient transitioning smoothly
 *    between light sweet rose, pearl white, and subtle teal hues (30-second cycle).
 * 2. Ambient Mesh Gradient Blob Motion (Feature 4): Soft, slow-moving ambient mesh/gradient
 *    blobs shifting delicately every few seconds at 10%-15% opacity for zero eye strain.
 * 3. Glow Layer: Gentle, breathing ambient glowing orbs placed subtly at the
 *    top-right and bottom-left edges with very low opacity (10% - 15%).
 * 4. Wave & Particle Overlay: Smooth CSS-based ambient wave effect at the lower
 *    section combined with 11 floating soft micro-particles/dots rising slowly.
 * 5. 90Hz-144Hz GPU hardware acceleration (`transform: translate3d(0,0,0)` & `will-change: transform, opacity`).
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
      }, 150);
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
      {/* 1. BASE LAYER: Ultra-soft slow-morphing Aurora gradient (30-second cycle: light sweet rose, pearl white & subtle teal) */}
      <div className="svh-app-aurora-base" />

      {/* 1B. AMBIENT MESH GRADIENT BLOB MOTION: Soft slow-moving mesh blobs shifting delicately at 10%-15% opacity */}
      <div className="svh-ambient-mesh-blob svh-ambient-mesh-blob-1" />
      <div className="svh-ambient-mesh-blob svh-ambient-mesh-blob-2" />
      <div className="svh-ambient-mesh-blob svh-ambient-mesh-blob-3" />

      {/* 2. GLOW LAYER: Gentle breathing ambient glowing orbs at top-right and bottom-left edges */}
      <div className="svh-app-glow-orb svh-app-glow-orb-top-right" />
      <div className="svh-app-glow-orb svh-app-glow-orb-bottom-left" />

      {/* 3A. LOWER AMBIENT WAVE OVERLAY: Smooth CSS-based ambient wave effect at the lower section */}
      <div className="svh-app-lower-wave-wrap">
        <svg
          className="svh-app-lower-wave svh-app-lower-wave-back"
          viewBox="0 0 1440 240"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,112 C280,180 540,48 840,118 C1110,182 1290,74 1440,116 L1440,240 L0,240 Z"
          />
        </svg>
        <svg
          className="svh-app-lower-wave svh-app-lower-wave-front"
          viewBox="0 0 1440 240"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,156 C320,96 620,198 940,142 C1190,98 1340,164 1440,148 L1440,240 L0,240 Z"
          />
        </svg>
      </div>

      {/* 3B. FLOATING MICRO-PARTICLES OVERLAY: 11 soft micro-particles/dots rising slowly in the background */}
      {MINI_BUBBLES.map((bubble) => (
        <span
          key={bubble.id}
          className={`svh-mini-bubble-particle svh-bubble-color-${bubble.color} svh-mini-bubble-item-${bubble.id}`}
        />
      ))}
    </div>
  );
});
