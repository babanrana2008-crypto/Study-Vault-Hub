import React, { useState, useEffect } from 'react';

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // UTC+05:30 (Asia/Kolkata)
const FIRST_ELIGIBLE_YEAR = 2026;
const ANNIVERSARY_MONTH = 10; // October
const ANNIVERSARY_DAY = 15;
const MAX_SAFE_TIMEOUT_MS = 2147483647; // ~24.85 days (32-bit signed integer limit for setTimeout)

export interface ISTDateComponents {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Extracts calendar components in the Asia/Kolkata (IST, UTC+05:30) timezone
 * from any UTC epoch timestamp, independent of the user's local device timezone.
 */
export function getISTDateComponents(nowMs: number = Date.now()): ISTDateComponents {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(nowMs));
    let year = 0;
    let month = 0;
    let day = 0;
    let hour = 0;
    let minute = 0;
    let second = 0;

    for (const part of parts) {
      if (part.type === 'year') year = Number(part.value);
      else if (part.type === 'month') month = Number(part.value);
      else if (part.type === 'day') day = Number(part.value);
      else if (part.type === 'hour') hour = Number(part.value) % 24;
      else if (part.type === 'minute') minute = Number(part.value);
      else if (part.type === 'second') second = Number(part.value);
    }

    if (year > 0 && month > 0 && day > 0) {
      return { year, month, day, hour, minute, second };
    }
  } catch {
    // Fallback to exact UTC+05:30 mathematical offset if Intl timeZone is unavailable
  }

  const istDate = new Date(nowMs + IST_OFFSET_MS);
  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth() + 1,
    day: istDate.getUTCDate(),
    hour: istDate.getUTCHours(),
    minute: istDate.getUTCMinutes(),
    second: istDate.getUTCSeconds(),
  };
}

/**
 * Returns true if and only if the current moment in Asia/Kolkata (IST)
 * is on 15 October of 2026 or any subsequent year.
 */
export function isStudyVaultHubAnniversaryIST(nowMs: number = Date.now()): boolean {
  const { year, month, day } = getISTDateComponents(nowMs);
  return (
    year >= FIRST_ELIGIBLE_YEAR &&
    month === ANNIVERSARY_MONTH &&
    day === ANNIVERSARY_DAY
  );
}

/**
 * Computes the exact milliseconds until the next relevant IST midnight boundary
 * (or the next safe timeout checkpoint if further than 24.8 days away).
 * Because Asia/Kolkata is a fixed UTC+05:30 offset with no daylight saving time,
 * 00:00:00.000 IST on (Y, M, D) is strictly Date.UTC(Y, M - 1, D) - IST_OFFSET_MS.
 */
export function getMsUntilNextAnniversaryBoundaryIST(nowMs: number = Date.now()): number {
  const { year, month, day } = getISTDateComponents(nowMs);

  let targetUtcMs: number;

  if (year >= FIRST_ELIGIBLE_YEAR && month === ANNIVERSARY_MONTH && day === ANNIVERSARY_DAY) {
    // Currently 15 October IST -> schedule exact dismissal at 16 October 00:00:00 IST
    targetUtcMs = Date.UTC(year, ANNIVERSARY_MONTH - 1, ANNIVERSARY_DAY + 1, 0, 0, 0, 50) - IST_OFFSET_MS;
  } else {
    // Not currently anniversary -> schedule next 15 October 00:00:00 IST (or next IST midnight)
    const nextIstMidnightUtcMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 50) - IST_OFFSET_MS;
    targetUtcMs = nextIstMidnightUtcMs;
  }

  const diffMs = targetUtcMs - nowMs;
  if (diffMs <= 0) {
    return 1000;
  }
  return Math.min(diffMs, MAX_SAFE_TIMEOUT_MS);
}

export const StudyVaultHubAnniversaryBanner: React.FC = React.memo(() => {
  const [isVisible, setIsVisible] = useState<boolean>(() =>
    isStudyVaultHubAnniversaryIST()
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timerId: number | null = null;

    const clearScheduledTimer = () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    };

    const evaluateAndSchedule = () => {
      clearScheduledTimer();
      const now = Date.now();
      const shouldShow = isStudyVaultHubAnniversaryIST(now);
      setIsVisible((prev) => (prev === shouldShow ? prev : shouldShow));

      const delayMs = getMsUntilNextAnniversaryBoundaryIST(now);
      timerId = window.setTimeout(evaluateAndSchedule, delayMs);
    };

    // Initial evaluation & schedule next midnight boundary
    evaluateAndSchedule();

    const handleVisibilityOrResume = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      evaluateAndSchedule();
    };

    window.addEventListener('focus', handleVisibilityOrResume);
    window.addEventListener('pageshow', handleVisibilityOrResume);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrResume);
      document.addEventListener('resume', handleVisibilityOrResume);
    }

    return () => {
      clearScheduledTimer();
      window.removeEventListener('focus', handleVisibilityOrResume);
      window.removeEventListener('pageshow', handleVisibilityOrResume);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrResume);
        document.removeEventListener('resume', handleVisibilityOrResume);
      }
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <section
      role="region"
      aria-label="Study Vault Hub Anniversary"
      className="svh-anniversary-banner rounded-2xl border px-4 sm:px-5 py-3.5 sm:py-4 relative overflow-hidden"
    >
      <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4 min-w-0">
        {/* Left & Center Content */}
        <div className="flex flex-col items-start gap-1.5 min-w-0 flex-1">
          {/* Small Date Label Pill: Gold background with dark navy text */}
          <div className="inline-flex items-center gap-1.5 max-w-full">
            <span className="svh-anniversary-date-pill inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase leading-tight">
              OUR SPECIAL DAY • 15 OCTOBER
            </span>
          </div>

          {/* Main Heading: Bright gold with strong contrast */}
          <h2 className="svh-anniversary-heading font-display text-sm sm:text-lg font-bold tracking-tight leading-snug break-words">
            Study Vault Hub Anniversary!
          </h2>

          {/* Description: White or very light grey */}
          <p className="svh-anniversary-description text-xs sm:text-sm leading-relaxed break-words">
            Celebrating our journey of learning, growth and dreams together.
          </p>
        </div>

        {/* Right Compact Celebratory Cake & Gold Stars Illustration */}
        <div
          aria-hidden="true"
          className="svh-anniversary-illustration-box w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center shrink-0"
        >
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-9 h-9 sm:w-11 sm:h-11 shrink-0"
          >
            {/* Subtle Gold Stars / Sparkles */}
            <path
              d="M12 14L13.2 17.3L16.5 18.5L13.2 19.7L12 23L10.8 19.7L7.5 18.5L10.8 17.3L12 14Z"
              fill="#FDE08D"
            />
            <path
              d="M53 12L53.9 14.6L56.5 15.5L53.9 16.4L53 19L52.1 16.4L49.5 15.5L52.1 14.6L53 12Z"
              fill="#FDE08D"
            />
            <circle cx="10" cy="34" r="1.4" fill="#D4AF37" />
            <circle cx="55" cy="30" r="1.5" fill="#D4AF37" />

            {/* Candle Flames */}
            <path
              d="M25 13C25 13 27.5 16.2 27.5 18.2C27.5 19.6 26.4 20.8 25 20.8C23.6 20.8 22.5 19.6 22.5 18.2C22.5 16.2 25 13 25 13Z"
              fill="#FDE08D"
            />
            <path
              d="M32 10.5C32 10.5 34.8 14.2 34.8 16.5C34.8 18.1 33.5 19.4 32 19.4C30.5 19.4 29.2 18.1 29.2 16.5C29.2 14.2 32 10.5 32 10.5Z"
              fill="#FDE08D"
            />
            <path
              d="M39 13C39 13 41.5 16.2 41.5 18.2C41.5 19.6 40.4 20.8 39 20.8C37.6 20.8 36.5 19.6 36.5 18.2C36.5 16.2 39 13 39 13Z"
              fill="#FDE08D"
            />

            {/* Three Candles */}
            <rect x="23.5" y="21" width="3" height="8" rx="1.2" fill="#FBF9F4" stroke="#D4AF37" strokeWidth="1" />
            <rect x="30.5" y="19.5" width="3" height="9.5" rx="1.2" fill="#FBF9F4" stroke="#D4AF37" strokeWidth="1" />
            <rect x="37.5" y="21" width="3" height="8" rx="1.2" fill="#FBF9F4" stroke="#D4AF37" strokeWidth="1" />

            {/* Top Cake Tier */}
            <rect
              x="19"
              y="28.5"
              width="26"
              height="10.5"
              rx="3"
              fill="#132347"
              stroke="#D4AF37"
              strokeWidth="1.6"
            />
            {/* Gold Frosting Scallops on Top Tier */}
            <path
              d="M19.5 32.5C21.6 34.8 24.4 34.8 26.5 32.5C28.6 34.8 31.4 34.8 33.5 32.5C35.6 34.8 38.4 34.8 40.5 32.5C42 34.2 43.5 34.2 44.5 32.5"
              stroke="#FDE08D"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Bottom Cake Tier */}
            <rect
              x="14"
              y="39"
              width="36"
              height="13"
              rx="3.5"
              fill="#0E1B38"
              stroke="#D4AF37"
              strokeWidth="1.8"
            />
            {/* Gold Frosting Details on Bottom Tier */}
            <path
              d="M15 43.5C18 46.2 21.5 46.2 24.5 43.5C27.5 46.2 31 46.2 34 43.5C37 46.2 40.5 46.2 43.5 43.5C46 45.8 48 45.8 49 43.5"
              stroke="#D4AF37"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="22" cy="48.2" r="1.2" fill="#FDE08D" />
            <circle cx="32" cy="48.2" r="1.2" fill="#FDE08D" />
            <circle cx="42" cy="48.2" r="1.2" fill="#FDE08D" />

            {/* Gold Cake Stand / Plate */}
            <path
              d="M10 52.5H54"
              stroke="#FDE08D"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </section>
  );
});
