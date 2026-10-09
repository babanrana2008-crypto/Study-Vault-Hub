import { useEffect } from 'react';

/**
 * Triggers a lightweight 15ms haptic tap vibration on supported touch devices and Android APK builds.
 * Safely falls back to a no-op if the Vibration API is unsupported or blocked prior to user gesture.
 */
export function triggerHapticTap(durationMs = 15): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(durationMs);
    }
  } catch {
    // Ignore vibration errors on browsers that restrict navigator.vibrate
  }
}

/**
 * Global hook that attaches a passive pointerdown listener to provide subtle 15ms haptic feedback
 * whenever any button, navigation item, or interactive badge is tapped on touch devices / Android APK.
 */
export function useGlobalHapticFeedback(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let lastVibrateTimestamp = 0;

    const handlePointerDown = (e: PointerEvent) => {
      // Only trigger on touch or pen interactions (or mobile/APK webviews)
      if (e.pointerType === 'mouse' && !('ontouchstart' in window)) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') return;

      const interactiveEl = target.closest(
        'button, [role="button"], a[href], input[type="submit"], input[type="button"], input[type="checkbox"], select, [data-haptic="true"]'
      ) as HTMLElement | null;

      if (!interactiveEl) return;
      if (
        (interactiveEl as HTMLButtonElement).disabled ||
        interactiveEl.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }

      const now = performance.now();
      if (now - lastVibrateTimestamp < 45) return;
      lastVibrateTimestamp = now;

      triggerHapticTap(15);
    };

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);
}
