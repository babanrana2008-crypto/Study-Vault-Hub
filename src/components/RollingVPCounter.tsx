import React, { useEffect, useRef, useState } from 'react';

interface RollingVPCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  formatLocale?: boolean;
  durationMs?: number;
  className?: string;
}

/**
 * Smooth rolling counter / odometer effect for Vault Points (VP) and numerical metrics.
 * Animates from 0 -> target on initial mount (when target > 0) and smoothly counts up
 * whenever VP Points increase or load, with a subtle vertical odometer roll transition.
 */
export const RollingVPCounter: React.FC<RollingVPCounterProps> = React.memo(
  ({
    value,
    suffix = '',
    prefix = '',
    formatLocale = false,
    durationMs = 680,
    className = '',
  }) => {
    const safeTarget = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    const [displayValue, setDisplayValue] = useState<number>(safeTarget);
    const [isRolling, setIsRolling] = useState<boolean>(false);
    const currentValRef = useRef<number>(safeTarget);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
      if (typeof window === 'undefined') {
        setDisplayValue(safeTarget);
        currentValRef.current = safeTarget;
        return;
      }

      const prefersReducedMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (prefersReducedMotion || currentValRef.current === safeTarget) {
        setDisplayValue(safeTarget);
        currentValRef.current = safeTarget;
        setIsRolling(false);
        return;
      }

      const startValue = currentValRef.current;
      const delta = safeTarget - startValue;

      if (delta === 0) {
        setDisplayValue(safeTarget);
        setIsRolling(false);
        return;
      }

      const startTime = performance.now();
      setIsRolling(true);

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        // Smooth cubic ease-out curve for crisp odometer deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextVal = Math.round(startValue + delta * eased);

        currentValRef.current = nextVal;
        setDisplayValue(nextVal);

        if (progress < 1) {
          rafRef.current = window.requestAnimationFrame(step);
        } else {
          currentValRef.current = safeTarget;
          setDisplayValue(safeTarget);
          setIsRolling(false);
          rafRef.current = null;
        }
      };

      rafRef.current = window.requestAnimationFrame(step);

      return () => {
        if (rafRef.current !== null) {
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }, [safeTarget, durationMs]);

    const formattedNumber = formatLocale
      ? displayValue.toLocaleString()
      : String(displayValue);

    return (
      <span
        className={`svh-rolling-vp-counter tabular-nums inline-flex items-baseline ${
          isRolling ? 'svh-rolling-vp-active' : ''
        } ${className}`.trim()}
      >
        {prefix && <span>{prefix}</span>}
        <span className="svh-rolling-vp-digits">{formattedNumber}</span>
        {suffix && <span>{suffix}</span>}
      </span>
    );
  }
);
