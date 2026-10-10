import React, { useState, useEffect, useRef } from 'react';
import { APP_LOGO } from '../data/sampleData';
import { HomeAmbientAnimation } from './HomeAmbientAnimation';

interface SplashScreenProps {
  onFinish: () => void;
  isAppReady?: boolean;
}

export const SPLASH_TOTAL_DURATION_MS = 5000;
export const SPLASH_EXIT_TRANSITION_MS = 420;
export const SPLASH_VISIBLE_BEFORE_EXIT_MS =
  SPLASH_TOTAL_DURATION_MS - SPLASH_EXIT_TRANSITION_MS;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [currentLogoSrc, setCurrentLogoSrc] = useState<string>(APP_LOGO);
  const hasTriggeredExitRef = useRef<boolean>(false);
  const onFinishRef = useRef<() => void>(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    // Begin the smooth 420ms curtain fade-out at 4,580ms so the splash screen
    // remains visible for exactly 5,000ms (5.00 seconds) from its first appearance
    const exitStartTimer = setTimeout(() => {
      if (hasTriggeredExitRef.current) return;
      hasTriggeredExitRef.current = true;
      setIsExiting(true);
    }, SPLASH_VISIBLE_BEFORE_EXIT_MS);

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
      className={`fixed inset-0 z-[1100] flex flex-col items-center justify-center py-8 sm:py-12 px-4 svh-splash-multicomp-bg svh-splash-overlay select-none overflow-hidden ${
        isExiting ? 'svh-splash-overlay-exit' : 'opacity-100'
      }`}
      aria-label="Study Vault Hub Splash Screen"
    >
      {/* Ambient Background Layer */}
      <HomeAmbientAnimation variant="splash" />

      {/* 1. BACKGROUND LEAF STENCIL WATERMARK (12-18% opacity, soft desaturated blue/grey tint) */}
      <div className="svh-splash-leaf-watermark" aria-hidden="true">
        {/* Subtle repeating botanical paper stencil tile */}
        <svg
          className="svh-splash-leaf-stencil w-full h-full"
           xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern
              id="svhLeafStencilPattern"
              width="260"
              height="260"
              patternUnits="userSpaceOnUse"
            >
              {/* Botanical Branch Stencil 1 */}
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M28 232 C68 180, 118 130, 196 42" />
                <path d="M64 192 C48 166, 54 140, 82 132 C88 158, 78 182, 64 192 Z" />
                <path d="M64 192 C58 168, 66 150, 82 132" />
                <path d="M98 154 C126 148, 148 160, 156 184 C130 186, 108 172, 98 154 Z" />
                <path d="M98 154 C118 164, 136 172, 156 184" />
                <path d="M126 122 C108 96, 114 70, 142 62 C148 88, 138 112, 126 122 Z" />
                <path d="M126 122 C120 98, 128 80, 142 62" />
                <path d="M158 86 C184 80, 206 92, 214 114 C188 116, 168 104, 158 86 Z" />
                <path d="M196 42 C188 24, 202 12, 222 16 C218 34, 206 42, 196 42 Z" />
              </g>
              {/* Delicate Secondary Fern Leaf Stencil */}
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                 opacity="0.75"
              >
                <path d="M18 68 C46 52, 74 44, 106 46" />
                <path d="M38 58 C34 42, 46 30, 62 34 C58 48, 48 56, 38 58 Z" />
                <path d="M68 48 C76 34, 92 28, 104 36 C94 46, 80 50, 68 48 Z" />
                <path d="M198 238 C216 216, 232 198, 250 188" />
                <path d="M214 220 C206 202, 216 186, 234 186 C232 204, 224 214, 214 220 Z" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#svhLeafStencilPattern)" />
        </svg>

        {/* Prominent Top-Left Corner Botanical Leaf Stencil Accent */}
        <svg
          viewBox="0 0 320 320"
          className="svh-splash-leaf-stencil absolute -top-8 -left-8 w-56 h-56 sm:w-80 sm:h-80 md:w-96 md:h-96"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 300 C70 210, 150 120, 290 20" />
          <path d="M68 230 C42 184, 58 134, 112 120 C118 172, 96 212, 68 230 Z" />
          <path d="M68 230 C76 190, 92 154, 112 120" />
          <path d="M116 176 C166 162, 210 184, 228 230 C178 234, 138 208, 116 176 Z" />
          <path d="M116 176 C154 192, 190 210, 228 230" />
          <path d="M168 122 C144 82, 160 38, 208 26 C214 72, 192 106, 168 122 Z" />
          <path d="M168 122 C176 88, 192 56, 208 26" />
          <path d="M218 76 C258 66, 292 84, 306 122 C266 124, 236 102, 218 76 Z" />
        </svg>

        {/* Prominent Bottom-Right Corner Botanical Leaf Stencil Accent */}
        <svg
          viewBox="0 0 320 320"
          className="svh-splash-leaf-stencil absolute -bottom-8 -right-8 w-56 h-56 sm:w-80 sm:h-80 md:w-96 md:h-96 rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 300 C70 210, 150 120, 290 20" />
          <path d="M68 230 C42 184, 58 134, 112 120 C118 172, 96 212, 68 230 Z" />
          <path d="M68 230 C76 190, 92 154, 112 120" />
          <path d="M116 176 C166 162, 210 184, 228 230 C178 234, 138 208, 116 176 Z" />
          <path d="M116 176 C154 192, 190 210, 228 230" />
          <path d="M168 122 C144 82, 160 38, 208 26 C214 72, 192 106, 168 122 Z" />
          <path d="M168 122 C176 88, 192 56, 208 26" />
          <path d="M218 76 C258 66, 292 84, 306 122 C266 124, 236 102, 218 76 Z" />
        </svg>
      </div>

      {/* 2. CENTER LOGO ANIMATION & STAGGERED TEXT REVEAL */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto px-4">
        {/* Center Logo with Subtle Pulsing Radial Aura */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="svh-splash-radial-aura absolute -inset-6 sm:-inset-10 rounded-full pointer-events-none"
          />
          <div className="svh-splash-logo-entry relative w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full overflow-hidden aspect-square flex items-center justify-center shrink-0 shadow-[0_0_40px_rgba(212,175,55,0.22)]">
            <img
              src={currentLogoSrc}
              alt="Study Vault Hub"
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

        {/* Primary Title: Metallic Shimmer Pass & Stagger 1 over "Study Vault Hub" */}
        <div className="mt-5 sm:mt-6">
          <h1 className="svh-splash-shimmer-text svh-splash-fade-stagger-1 font-display text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight inline-block whitespace-nowrap">
            Study Vault Hub
          </h1>
        </div>

        {/* Stagger 2: "Developed by Soumyadip Rana" */}
        <div className="svh-splash-fade-stagger-2 flex flex-col items-center justify-center text-center mt-5 sm:mt-7 pointer-events-none">
          <span className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#d4af37] font-mono font-semibold whitespace-nowrap leading-[1.2]">
            Developed by
          </span>
          <span className="text-base sm:text-lg md:text-xl font-display font-bold text-[#fbf9f4] tracking-wide mt-1 whitespace-nowrap leading-[1.2]">
            Soumyadip Rana
          </span>
        </div>
      </div>
    </div>
  );
};

