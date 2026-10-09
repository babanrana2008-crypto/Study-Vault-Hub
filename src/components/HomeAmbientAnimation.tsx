import React from 'react';

interface HomeAmbientAnimationProps {
  variant?: 'home' | 'splash';
}

/**
 * Subtle, GPU-composited ambient wave, soft gradient aura, and floating particle layer.
 * Uses only theme-consistent gold and cosmic navy/dusty-blue tones, never blocks pointer events,
 * and strictly honors prefers-reduced-motion.
 *
 * Mobile APK & High-Refresh-Rate Optimization:
 * - Splash screen renders 4 subtle particles; Home screen delegates bubble particles to
 *   the global MiniBubbleBackground so total active animated nodes stay strictly <= 14.
 */
export const HomeAmbientAnimation: React.FC<HomeAmbientAnimationProps> = React.memo(
  ({ variant = 'home' }) => {
    const isSplash = variant === 'splash';

    return (
      <div
        aria-hidden="true"
        className={`svh-ambient-layer pointer-events-none select-none overflow-hidden ${
          isSplash ? 'fixed inset-0 z-0' : 'fixed inset-0 z-0'
        }`}
      >
        {/* Soft flowing gradient mesh aura (zero runtime filter:blur — pure soft radial gradients) */}
        <div
          className={`svh-ambient-orb svh-ambient-orb-1 ${
            isSplash ? 'opacity-65' : 'opacity-40'
          }`}
        />
        <div
          className={`svh-ambient-orb svh-ambient-orb-2 ${
            isSplash ? 'opacity-60' : 'opacity-35'
          }`}
        />
        <div
          className={`svh-ambient-orb svh-ambient-orb-3 ${
            isSplash ? 'opacity-55' : 'opacity-30'
          }`}
        />

        {/* Layered flowing SVG waves */}
        <div className="svh-wave-container">
          <svg
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            className="svh-wave-svg svh-wave-back"
          >
            <defs>
              <linearGradient id={`svhWaveGradBack-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(212, 175, 55, 0.14)" />
                <stop offset="50%" stopColor="rgba(56, 189, 248, 0.12)" />
                <stop offset="100%" stopColor="rgba(212, 175, 55, 0.14)" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#svhWaveGradBack-${variant})`}
              d="M0,192L60,181.3C120,171,240,149,360,154.7C480,160,600,192,720,197.3C840,203,960,181,1080,165.3C1200,149,1320,139,1380,133.3L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
            />
          </svg>

          <svg
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            className="svh-wave-svg svh-wave-mid"
          >
            <defs>
              <linearGradient id={`svhWaveGradMid-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.12)" />
                <stop offset="50%" stopColor="rgba(212, 175, 55, 0.16)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0.10)" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#svhWaveGradMid-${variant})`}
              d="M0,224L80,213.3C160,203,320,181,480,186.7C640,192,800,224,960,224C1120,224,1280,192,1360,176L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            />
          </svg>

          <svg
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            className="svh-wave-svg svh-wave-front"
          >
            <defs>
              <linearGradient id={`svhWaveGradFront-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(212, 175, 55, 0.12)" />
                <stop offset="50%" stopColor="rgba(99, 102, 241, 0.10)" />
                <stop offset="100%" stopColor="rgba(212, 175, 55, 0.12)" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#svhWaveGradFront-${variant})`}
              d="M0,256L60,245.3C120,235,240,213,360,208C480,203,600,213,720,229.3C840,245,960,267,1080,261.3C1200,256,1320,224,1380,208L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
            />
          </svg>
        </div>

        {/* Delicate floating glowing particles on Splash screen */}
        {isSplash && (
          <>
            <span className="svh-ambient-bubble svh-bubble-1" />
            <span className="svh-ambient-bubble svh-bubble-2" />
            <span className="svh-ambient-bubble svh-bubble-3" />
            <span className="svh-ambient-bubble svh-bubble-4" />
          </>
        )}
      </div>
    );
  }
);
