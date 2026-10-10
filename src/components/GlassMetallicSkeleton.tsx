import React, { useEffect, useState } from 'react';

interface GlassMetallicSkeletonProps {
  variant?: 'notes' | 'exam-cards' | 'vp-history' | 'books' | 'community';
  count?: number;
  className?: string;
}

/**
 * Glass-Metallic Skeleton Shimmer Loading Component.
 * Provides a subtle glossy shimmer wave animation for content loading states
 * across study notes, exam cards, VP history, books, and community feeds.
 */
export const GlassMetallicSkeleton: React.FC<GlassMetallicSkeletonProps> = React.memo(
  ({ variant = 'notes', count = 4, className = '' }) => {
    const items = Array.from({ length: count }, (_, i) => i);

    if (variant === 'vp-history') {
      return (
        <div
          role="status"
          aria-label="Loading VP activity history"
          className={`space-y-2 ${className}`}
        >
          {items.map((idx) => (
            <div
              key={idx}
              className="svh-skeleton-card p-2.5 rounded-lg border flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="svh-skeleton-shimmer h-3.5 w-3/5 rounded-md" />
                <div className="svh-skeleton-shimmer h-2.5 w-2/5 rounded-md" />
              </div>
              <div className="svh-skeleton-shimmer h-5 w-14 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      );
    }

    if (variant === 'exam-cards') {
      return (
        <div
          role="status"
          aria-label="Loading exam blueprint cards"
          className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}
        >
          {items.map((idx) => (
            <div
              key={idx}
              className="svh-skeleton-card p-4 rounded-2xl border space-y-2.5"
            >
              <div className="svh-skeleton-shimmer h-3 w-24 rounded-md" />
              <div className="svh-skeleton-shimmer h-7 w-32 rounded-lg" />
              <div className="space-y-1.5 pt-0.5">
                <div className="svh-skeleton-shimmer h-3 w-full rounded-md" />
                <div className="svh-skeleton-shimmer h-3 w-4/5 rounded-md" />
              </div>
              <div className="svh-skeleton-shimmer h-3.5 w-28 rounded-md pt-1" />
            </div>
          ))}
        </div>
      );
    }

    if (variant === 'books') {
      return (
        <div
          role="status"
          aria-label="Loading reference books"
          className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}
        >
          {items.map((idx) => (
            <div
              key={idx}
              className="svh-skeleton-card rounded-2xl border p-4 flex flex-col justify-between space-y-4"
            >
              <div className="flex gap-4">
                <div className="svh-skeleton-shimmer w-24 sm:w-28 shrink-0 aspect-[3/4] rounded-xl" />
                <div className="flex-1 space-y-2.5 py-1">
                  <div className="svh-skeleton-shimmer h-3 w-28 rounded-md" />
                  <div className="svh-skeleton-shimmer h-4 w-4/5 rounded-md" />
                  <div className="svh-skeleton-shimmer h-3 w-1/2 rounded-md" />
                  <div className="svh-skeleton-shimmer h-3 w-2/3 rounded-md" />
                  <div className="space-y-1.5 pt-1">
                    <div className="svh-skeleton-shimmer h-3 w-full rounded-md" />
                    <div className="svh-skeleton-shimmer h-3 w-5/6 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-[#1e293b]/40 flex items-center justify-between">
                <div className="svh-skeleton-shimmer h-7 w-24 rounded-lg" />
                <div className="svh-skeleton-shimmer h-7 w-32 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (variant === 'community') {
      return (
        <div
          role="status"
          aria-label="Loading community discussions"
          className={`space-y-3.5 ${className}`}
        >
          {items.map((idx) => (
            <div
              key={idx}
              className="svh-skeleton-card p-4 sm:p-5 rounded-2xl border space-y-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="svh-skeleton-shimmer w-9 h-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="svh-skeleton-shimmer h-3.5 w-36 rounded-md" />
                  <div className="svh-skeleton-shimmer h-2.5 w-24 rounded-md" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="svh-skeleton-shimmer h-3.5 w-full rounded-md" />
                <div className="svh-skeleton-shimmer h-3.5 w-4/5 rounded-md" />
              </div>
              <div className="pt-2.5 border-t border-[#1e293b]/40 flex items-center justify-between">
                <div className="svh-skeleton-shimmer h-3.5 w-20 rounded-md" />
                <div className="svh-skeleton-shimmer h-3.5 w-32 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Default: 'notes'
    return (
      <div
        role="status"
        aria-label="Loading study notes"
        className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}
      >
        {items.map((idx) => (
          <div
            key={idx}
            className="svh-skeleton-card rounded-2xl border p-4 sm:p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="svh-skeleton-shimmer h-3.5 w-36 rounded-md" />
                <div className="flex items-center gap-1.5">
                  <div className="svh-skeleton-shimmer w-7 h-7 rounded-lg" />
                  <div className="svh-skeleton-shimmer w-7 h-7 rounded-lg" />
                </div>
              </div>
              <div className="svh-skeleton-shimmer h-5 w-4/5 rounded-md" />
              <div className="space-y-1.5 pt-1">
                <div className="svh-skeleton-shimmer h-3.5 w-full rounded-md" />
                <div className="svh-skeleton-shimmer h-3.5 w-3/4 rounded-md" />
              </div>
              <div className="svh-skeleton-shimmer h-3.5 w-44 rounded-md pt-1" />
            </div>
            <div className="pt-3 border-t border-[#1e293b]/40 flex items-center justify-between">
              <div className="svh-skeleton-shimmer h-3.5 w-24 rounded-md" />
              <div className="flex items-center gap-2">
                <div className="svh-skeleton-shimmer h-6 w-20 rounded-lg" />
                <div className="svh-skeleton-shimmer h-4 w-14 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
);

/**
 * Global Card Tilt controller (Disabled):
 * All 3D card tilt animations, perspective distortions, and rotation-on-touch/hover
 * effects are disabled so cards remain 100% flat, stable, and non-wobbly across
 * both Web and Android APK WebViews.
 */
export function useGlobalCardTiltEffect() {
  // Intentionally a no-op to guarantee zero 3D rotation or directional lifting on touch/hover.
}

/**
 * Instant Page & Section Transition Hook:
 * Returns false immediately so tab/filter/section switches execute instantaneously
 * without artificial skeleton delay while preserving hook call sites.
 */
export function useBriefShimmerTransition(_deps: React.DependencyList, _durationMs = 0): boolean {
  return false;
}

