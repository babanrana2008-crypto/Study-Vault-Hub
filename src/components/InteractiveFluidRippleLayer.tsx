import React, { useEffect, useRef } from 'react';

interface FluidPillMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

/**
 * Global Inertial Smooth Fluid Pill Tab Controller
 * (Supports both Web & Android APK at 90Hz-144Hz):
 *
 * - Inertial Smooth Fluid Pill Tab (Preserved):
 *   Tracks any container using `useInertialFluidPill` and smoothly glides
 *   and morphs an active indicator pill across `[data-svh-fluid-active="true"]` items
 *   using spring physics (`cubic-bezier(0.16, 1, 0.3, 1)`).
 * - Crucial Exclusion: Zero tap ripple, bubble, or expanding circular ring effects
 *   are rendered upon tap, click, or interaction.
 */
export const InteractiveFluidRippleLayer: React.FC = React.memo(() => {
  return null;
});

/**
 * Schedules a tab transition or button click callback inside requestAnimationFrame
 * so UI updates synchronize cleanly with 90Hz-144Hz display frames without main-thread lag.
 */
export function scheduleRafAction(callback: () => void): void {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      callback();
    });
  } else {
    callback();
  }
}

/**
 * Reusable hook to power an Inertial Smooth Fluid Pill Indicator inside any tab/filter container.
 * Uses `transform: translate3d(x, y, 0)` and width/height with `cubic-bezier(0.16, 1, 0.3, 1)`.
 */
export function useInertialFluidPill<T extends HTMLElement>(
  activeDependency: unknown
): {
  containerRef: React.RefObject<T | null>;
  pillMetrics: FluidPillMetrics;
} {
  const containerRef = useRef<T | null>(null);
  const [pillMetrics, setPillMetrics] = React.useState<FluidPillMetrics>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    let rafId: number | null = null;

    const measureActiveTab = () => {
      const el = containerRef.current;
      if (!el) return;
      const activeBtn = el.querySelector<HTMLElement>('[data-svh-fluid-active="true"]');
      if (!activeBtn) {
        setPillMetrics((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const x = activeBtn.offsetLeft;
      const y = activeBtn.offsetTop;
      const width = activeBtn.offsetWidth;
      const height = activeBtn.offsetHeight;

      if (width <= 0 || height <= 0) return;

      setPillMetrics((prev) => {
        if (
          prev.visible &&
          Math.abs(prev.x - x) < 0.5 &&
          Math.abs(prev.y - y) < 0.5 &&
          Math.abs(prev.width - width) < 0.5 &&
          Math.abs(prev.height - height) < 0.5
        ) {
          return prev;
        }
        return { x, y, width, height, visible: true };
      });
    };

    rafId = window.requestAnimationFrame(measureActiveTab);

    const handleResize = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(measureActiveTab);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [activeDependency]);

  return { containerRef, pillMetrics };
}
