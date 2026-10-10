import React, { useState, useEffect, useRef } from 'react';
import { APP_LOGO } from '../data/sampleData';

interface SplashScreenProps {
  onFinish: () => void;
  isAppReady?: boolean;
}

export const SPLASH_TOTAL_DURATION_MS = 4000;
export const SPLASH_EXIT_START_MS = 3200;
export const SPLASH_EXIT_TRANSITION_MS =
  SPLASH_TOTAL_DURATION_MS - SPLASH_EXIT_START_MS;
export const SPLASH_VISIBLE_BEFORE_EXIT_MS = SPLASH_EXIT_START_MS;

export const SplashScreen: React.FC<SplashScreenProps> = React.memo(({ onFinish }) => {
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [currentLogoSrc, setCurrentLogoSrc] = useState<string>(APP_LOGO);
  const hasTriggeredExitRef = useRef<boolean>(false);
  const onFinishRef = useRef<() => void>(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    // Start the ultra-smooth 800ms exit fade at 3,200ms (3.2s) so the splash screen
    // completes at exactly 4,000ms (4.0s) from its first appearance.
    const exitStartTimer = setTimeout(() => {
      if (hasTriggeredExitRef.current) return;
      hasTriggeredExitRef.current = true;
      setIsExiting(true);
    }, SPLASH_EXIT_START_MS);

    const finishTimer = setTimeout(() => {
      hasTriggeredExitRef.current = true;
      onFinishRef.current();
    }, SPLASH_TOTAL_DURATION_MS);

    return () => {
      clearTimeout(exitStartTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[1100] w-full max-w-[100vw] h-full min-h-[100dvh] flex flex-col items-center justify-center pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:py-12 sm:px-6 svh-splash-multicomp-bg svh-splash-overlay select-none overflow-hidden box-border ${
        isExiting ? 'svh-splash-overlay-exit' : 'opacity-100'
      }`}
      aria-label="Study Vault Hub Splash Screen"
    >
      {/* PHASE 1: Soft Cream/White Background with Gentle Sweet Rose Wavy Animations Rippling Across */}
      <div className="svh-splash-wavy-stage" aria-hidden="true">
        {/* Soft Sweet Rose & Rose-Green Ambient Silk Glows */}
        <div className="svh-splash-ambient-glow svh-splash-ambient-glow-1" />
        <div className="svh-splash-ambient-glow svh-splash-ambient-glow-2" />
        <div className="svh-splash-ambient-glow svh-splash-ambient-glow-3" />

        {/* Top & Mid-Screen Gentle Sweet Rose Rippling Silk Waves */}
        <svg
          className="svh-splash-rose-ribbon-top"
          viewBox="0 0 1440 420"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="svhSweetRoseTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fce4ec" stopOpacity="0.72" />
              <stop offset="50%" stopColor="#f8bbd0" stopOpacity="0.46" />
              <stop offset="100%" stopColor="#fdeef4" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <path
            fill="url(#svhSweetRoseTopGrad)"
            d="M0,0 L1440,0 L1440,180 C1180,260 940,95 660,175 C380,255 180,140 0,210 Z"
          />
        </svg>

        {/* Bottom Multi-Layered Sweet Rose Rippling Waves */}
        <div className="svh-splash-rose-waves-container">
          {/* Back Wave: Soft Blush Rose */}
          <svg
            className="svh-splash-rose-wave-svg svh-splash-rose-wave-back"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="svhSweetRoseWaveBack" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fde8ef" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#f9cadb" stopOpacity="0.62" />
                <stop offset="100%" stopColor="#fce4ec" stopOpacity="0.75" />
              </linearGradient>
            </defs>
            <path
              fill="url(#svhSweetRoseWaveBack)"
              d="M0,144 C260,224 480,64 740,138 C1000,212 1220,82 1440,144 L1440,320 L0,320 Z"
            />
          </svg>

          {/* Mid Wave: Warm Sweet Rose with Subtle Sage-Mint Tint */}
          <svg
            className="svh-splash-rose-wave-svg svh-splash-rose-wave-mid"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="svhSweetRoseWaveMid" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f8c6d8" stopOpacity="0.58" />
                <stop offset="55%" stopColor="#fbd8e5" stopOpacity="0.68" />
                <stop offset="100%" stopColor="#d8f3e5" stopOpacity="0.52" />
              </linearGradient>
            </defs>
            <path
              fill="url(#svhSweetRoseWaveMid)"
              d="M0,192 C240,118 510,248 780,176 C1050,104 1260,220 1440,168 L1440,320 L0,320 Z"
            />
          </svg>

          {/* Front Wave: Luminous Sweet Rose Petal Wave */}
          <svg
            className="svh-splash-rose-wave-svg svh-splash-rose-wave-front"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="svhSweetRoseWaveFront" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fcebf1" stopOpacity="0.88" />
                <stop offset="50%" stopColor="#f6bfd2" stopOpacity="0.66" />
                <stop offset="100%" stopColor="#fdf2f6" stopOpacity="0.88" />
              </linearGradient>
            </defs>
            <path
              fill="url(#svhSweetRoseWaveFront)"
              d="M0,228 C300,284 560,164 860,224 C1120,276 1300,196 1440,228 L1440,320 L0,320 Z"
            />
          </svg>
        </div>
      </div>

      {/* CENTRAL STAGE: Phase 2 (Frosted Glassmorphic Logo Card) & Phase 3 (Staggered Typography) */}
      <div className="svh-splash-central-stage relative z-10 w-full max-w-[min(100%,32rem)] mx-auto px-3 sm:px-4 flex flex-col items-center justify-center text-center box-border">
        {/* PHASE 2: Frosted Glassmorphic SVH Logo Card with Beveled Edges, Deep Reflections & Rose-Green Gradient Pop (Zero expanding rings/ripples) */}
        <div className="svh-splash-logo-stage relative flex items-center justify-center mx-auto shrink-0">
          {/* Material-Designed Frosted Glassmorphic Card with Polished Beveled Edges */}
          <div className="svh-splash-glass-card svh-splash-logo-entry relative w-28 h-28 min-[375px]:w-32 min-[375px]:h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-[1.85rem] sm:rounded-[2.35rem] p-2.5 sm:p-3.5 flex items-center justify-center shrink-0 mx-auto">
            {/* Dynamic Specular Lighting Reflection */}
            <div
              aria-hidden="true"
              className="svh-splash-glass-reflection pointer-events-none"
            />

            {/* Rose-Green Gradient Pop Frame Surrounding the Central SVH Logo */}
            <div className="svh-splash-logo-rose-green-ring relative z-10 w-full h-full rounded-full p-1.5 sm:p-2 flex items-center justify-center aspect-square">
              <div className="w-full h-full rounded-full overflow-hidden aspect-square flex items-center justify-center bg-white/90 shadow-inner">
                <img
                  src={currentLogoSrc}
                  alt="Study Vault Hub"
                  width={160}
                  height={160}
                  decoding="async"
                  className="w-full h-full rounded-full object-contain aspect-square select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (currentLogoSrc !== '/official_logo.jpg') {
                      setCurrentLogoSrc('/official_logo.jpg');
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 3: Staggered Text Reveal — Title, Tagline, and Preserved Developer Credit */}
        <div className="mt-5 sm:mt-8 w-full max-w-full flex flex-col items-center justify-center text-center mx-auto">
          {/* Primary Title: "Study Vault Hub" in crisp serif font with high-contrast dark rose-to-gold gradient */}
          <h1 className="svh-splash-title-gradient svh-splash-fade-stagger-1 font-display text-[1.6rem] min-[375px]:text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center max-w-full px-1 leading-tight sm:whitespace-nowrap">
            Study Vault Hub
          </h1>

          {/* Main Academic Tagline */}
          <p className="svh-splash-tagline svh-splash-fade-stagger-2 text-[10px] min-[375px]:text-[11px] sm:text-sm tracking-[0.07em] min-[390px]:tracking-[0.11em] sm:tracking-[0.14em] uppercase font-semibold mt-2.5 sm:mt-3 text-center max-w-[92vw] sm:max-w-none px-1 leading-relaxed sm:whitespace-nowrap">
            Curated Academic Excellence &amp; Smart Preparation
          </p>

          {/* Prominent Developer Credit: "Developed by Soumyadip Rana" positioned below the main tagline */}
          <div className="svh-splash-credit-badge svh-splash-fade-stagger-3 relative inline-flex flex-col items-center justify-center max-w-[92vw] sm:max-w-full px-4 min-[375px]:px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl mt-4 sm:mt-6 mx-auto pointer-events-none box-border">
            <span className="svh-splash-credit-text text-sm min-[375px]:text-base sm:text-lg font-bold tracking-[0.02em] sm:tracking-[0.04em] text-center leading-snug sm:whitespace-nowrap">
              Developed by{' '}
              <strong className="svh-splash-credit-name font-display font-extrabold tracking-[0.03em] sm:tracking-[0.05em]">
                Soumyadip Rana
              </strong>
            </span>
            <span
              aria-hidden="true"
              className="svh-splash-credit-underline mt-1.5 h-[2.5px] w-4/5 rounded-full mx-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
