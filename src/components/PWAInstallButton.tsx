import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Download } from 'lucide-react';
import { triggerAndroidApkDownload } from '../config/apkDownload';

export const PWAInstallButton: React.FC = React.memo(() => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const isNativeApp = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const handleInstallClick = useCallback(() => {
    const started = triggerAndroidApkDownload();
    if (!started) {
      setStatusMessage('Android app download will be available soon');
    } else {
      setStatusMessage(null);
    }
  }, []);

  if (isNativeApp) {
    return null;
  }

  return (
    <div className="pt-2 pb-1 flex flex-col items-start">
      <button
        type="button"
        onClick={handleInstallClick}
        aria-label="Install Study Vault Hub App"
        className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm tracking-wide shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer border border-[#d4af37]/40"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>

      {statusMessage && (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 px-3 py-1.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/35 text-xs font-medium text-[#fbf9f4] shadow-sm animate-in fade-in duration-150"
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
});
