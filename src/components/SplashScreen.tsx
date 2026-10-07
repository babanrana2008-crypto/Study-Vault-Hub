import React, { useState, useEffect } from 'react';
import { APP_LOGO } from '../data/sampleData';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'enter' | 'identity' | 'exit'>('enter');
  const [currentLogoSrc, setCurrentLogoSrc] = useState<string>(APP_LOGO);

  useEffect(() => {
    // Stage 1: Gentle logo + identity reveal
    const identityTimer = setTimeout(() => {
      setStage('identity');
    }, 50);

    // Stage 2: Smooth exit transition into Home
    const exitTimer = setTimeout(() => {
      setStage('exit');
    }, 1450);

    // Stage 3: Unmount cleanly
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 1820);

    return () => {
      clearTimeout(identityTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between py-10 sm:py-14 px-4 bg-[#060b18] select-none transition-opacity duration-350 ease-out cursor-pointer will-change-[opacity] ${
        stage === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Loading Screen"
    >
      <div className="h-4" />

      {/* Center Container: Logo -> App Identity with smooth GPU transform/opacity easing */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center text-center transition-all duration-700 ease-out will-change-[transform,opacity] ${
          stage === 'enter'
            ? 'opacity-0 scale-[0.96] translate-y-2'
            : stage === 'identity'
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[1.01] -translate-y-1'
        }`}
      >
        {/* Clean Perfectly Circular Official Logo (No artificial border or square background) */}
        <div className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full overflow-hidden aspect-square flex items-center justify-center shrink-0">
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

        {/* App Identity */}
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#fbf9f4] mt-5 whitespace-nowrap">
          Study Vault Hub
        </h1>
      </div>

      {/* Official Founder & Creator Attribution (Large, centered, two-line layout, never truncated) */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center text-center px-4 transition-all duration-700 ease-out pointer-events-none ${
          stage === 'enter' ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
        }`}
      >
        <span className="text-xs sm:text-sm uppercase tracking-[0.18em] text-[#d4af37] font-mono font-semibold whitespace-nowrap">
          Founded &amp; Created by
        </span>
        <span className="text-lg sm:text-xl md:text-2xl font-display font-bold text-[#fbf9f4] tracking-wide mt-1 whitespace-nowrap">
          Soumyadip Rana
        </span>
      </div>
    </div>
  );
};
