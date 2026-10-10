import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, PlusSquare, Check } from 'lucide-react';
import { APP_LOGO } from '../data/sampleData';
import {
  ANDROID_APK_DOWNLOAD_URL,
  WINDOWS_INSTALLER_DOWNLOAD_URL,
  MACOS_INSTALLER_DOWNLOAD_URL,
  hasConfiguredWindowsInstallerUrl,
  hasConfiguredMacosInstallerUrl,
  detectDevicePlatform,
  isRunningInNativeAndroidApk,
  isRunningInStandaloneMode,
  DetectedDevicePlatform,
} from '../config/apkDownload';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = React.memo(() => {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandaloneInstalled, setIsStandaloneInstalled] = useState<boolean>(() =>
    isRunningInStandaloneMode()
  );

  const isNativeAndroid = useMemo(() => isRunningInNativeAndroidApk(), []);
  const devicePlatform: DetectedDevicePlatform = useMemo(() => detectDevicePlatform(), []);

  const isAndroidDevice =
    devicePlatform === 'android-phone' || devicePlatform === 'android-tablet';
  const isIOSDevice = devicePlatform === 'iphone' || devicePlatform === 'ipad';
  const isWindowsDevice = devicePlatform === 'windows';
  const isMacosDevice = devicePlatform === 'macos';

  const hasWindowsInstaller = hasConfiguredWindowsInstallerUrl();
  const hasMacosInstaller = hasConfiguredMacosInstallerUrl();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      if (!isAndroidDevice) {
        e.preventDefault();
        setDeferredPwaPrompt(e as BeforeInstallPromptEvent);
      }
    };

    const handleAppInstalled = () => {
      setIsStandaloneInstalled(true);
      setDeferredPwaPrompt(null);
      setIsConfirmModalOpen(false);
      setStatusMessage('Study Vault Hub has been installed.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isAndroidDevice]);

  // Auto-dismiss status messages
  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => {
      setStatusMessage(null);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  // Lock background page scrolling and support Escape key while the confirmation popup is open
  useEffect(() => {
    if (!isConfirmModalOpen || typeof document === 'undefined') return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsConfirmModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isConfirmModalOpen]);

  const handleOpenConfirmModal = useCallback(() => {
    setStatusMessage(null);
    setIsConfirmModalOpen(true);
  }, []);

  const handleCancelInstall = useCallback(() => {
    setIsConfirmModalOpen(false);
  }, []);

  // Direct external anchor click handler for Android APK / verified desktop installer:
  // Never calls e.preventDefault() so the browser natively follows <a href={...}>
  // and closes the modal right after the browser initiates the download.
  const handleDirectDownloadClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, confirmationMsg: string) => {
      e.stopPropagation();
      window.setTimeout(() => {
        setIsConfirmModalOpen(false);
        setStatusMessage(confirmationMsg);
      }, 100);
    },
    []
  );

  const handleIOSConfirm = useCallback(() => {
    setIsConfirmModalOpen(false);
    setStatusMessage(
      'In Safari, tap the Share button and select "Add to Home Screen" to install Study Vault Hub on your iPhone/iPad.'
    );
  }, []);

  const handleDesktopFallbackInstall = useCallback(async () => {
    setIsConfirmModalOpen(false);
    if (deferredPwaPrompt) {
      try {
        await deferredPwaPrompt.prompt();
        const choice = await deferredPwaPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPwaPrompt(null);
          setStatusMessage('Study Vault Hub desktop app installation started.');
        }
        return;
      } catch {
        // fall through to status message
      }
    }
    if (isWindowsDevice) {
      setStatusMessage(
        'Study-Vault-Hub-Setup.exe is not published yet. You can install Study Vault Hub now via your browser address bar install icon or continue using the web app.'
      );
    } else if (isMacosDevice) {
      setStatusMessage(
        'Study-Vault-Hub.dmg is not published yet. In Safari, choose File → "Add to Dock" (or use your browser install icon) to install Study Vault Hub on your Mac.'
      );
    } else {
      setStatusMessage(
        'You can install Study Vault Hub from your browser address bar or continue using the full web experience.'
      );
    }
  }, [deferredPwaPrompt, isWindowsDevice, isMacosDevice]);

  // Hide the Install button when already running inside the installed native Android APK
  // or when already launched as an installed standalone app
  if (isNativeAndroid || isStandaloneInstalled) {
    return null;
  }

  const buttonLabel = 'Install App';

  let modalTitle = 'Install Study Vault Hub';
  let modalDescription =
    'Download the official Android app (Study.Vault.Hub.apk) for a better study experience.';

  if (isAndroidDevice) {
    modalTitle = 'Install Study Vault Hub';
    modalDescription =
      'Download the official Android app (Study.Vault.Hub.apk) for your device.';
  } else if (isIOSDevice) {
    modalTitle = 'Add to Home Screen';
    modalDescription =
      'Install Study Vault Hub on your iPhone or iPad Home Screen for a full-screen app experience.';
  } else if (isWindowsDevice) {
    modalTitle = 'Install Study Vault Hub for Windows';
    modalDescription = hasWindowsInstaller
      ? 'Download the official Windows desktop installer (Study-Vault-Hub-Setup.exe).'
      : deferredPwaPrompt
      ? 'Install Study Vault Hub as a standalone desktop app on your Windows PC.'
      : 'Native Windows installer (Study-Vault-Hub-Setup.exe) is not published yet. You can install the standalone desktop web app from your browser.';
  } else if (isMacosDevice) {
    modalTitle = 'Install Study Vault Hub for macOS';
    modalDescription = hasMacosInstaller
      ? 'Download the official macOS installer (Study-Vault-Hub.dmg) for your Mac.'
      : deferredPwaPrompt
      ? 'Install Study Vault Hub as a standalone desktop app on your Mac.'
      : 'Native macOS installer (Study-Vault-Hub.dmg) is not published yet. You can add Study Vault Hub to your Mac Dock from your browser.';
  } else {
    modalTitle = 'Install Study Vault Hub';
    modalDescription = deferredPwaPrompt
      ? 'Install Study Vault Hub as a standalone app on your device.'
      : 'Use Study Vault Hub directly in your browser or install it from your browser menu.';
  }

  return (
    <div className="pt-2 pb-1 flex flex-col items-start">
      <a
        href="https://github.com/babanrana2008-crypto/Study-Vault-Hub/releases/download/v4.0.0/Latest.SVH.apk"
        target="_blank"
        rel="noopener noreferrer"
        download
        aria-label={buttonLabel}
        className="install-btn inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm tracking-wide shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer border border-[#d4af37]/40 no-underline"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{buttonLabel}</span>
      </a>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mt-2 px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/35 text-xs font-medium text-[#fbf9f4] shadow-sm animate-in fade-in duration-150 max-w-md"
        >
          <span className="leading-relaxed">{statusMessage}</span>
        </div>
      )}

      {/* Platform-Aware Install Confirmation Popup rendered at document.body via Portal */}
      {isConfirmModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overscroll-contain"
            role="dialog"
            aria-modal="true"
            aria-labelledby="svh-install-modal-title"
            onClick={handleCancelInstall}
          >
            <div
              className="w-full max-w-[340px] sm:max-w-sm max-h-[90vh] max-h-[90dvh] overflow-hidden rounded-2xl bg-[#0c1428] border border-[#d4af37]/40 shadow-2xl p-4 sm:p-6 text-center space-y-3 sm:space-y-4 flex flex-col justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Official Study Vault Hub Logo */}
              <div className="w-12 h-12 sm:w-15 sm:h-15 rounded-full overflow-hidden mx-auto aspect-square flex items-center justify-center border border-[#d4af37]/35 shadow-md shrink-0">
                <img
                  src={APP_LOGO}
                  alt="Study Vault Hub Logo"
                  className="w-full h-full rounded-full object-contain aspect-square"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Title & Description */}
              <div className="space-y-1 shrink-0">
                <h3
                  id="svh-install-modal-title"
                  className="font-display text-base sm:text-xl font-bold tracking-tight text-[#fbf9f4] leading-snug"
                >
                  {modalTitle}
                </h3>
                <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed">
                  {modalDescription}
                </p>
              </div>

              {/* iPhone / iPad Step-by-Step Add to Home Screen Instructions */}
              {isIOSDevice && (
                <div className="rounded-xl bg-[#131b2e] border border-[#d4af37]/25 p-3 text-left space-y-2 text-xs text-[#cbd5e1] shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-[#080d1a] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] font-bold shrink-0">
                      1
                    </span>
                    <span className="flex items-center gap-1.5">
                      Tap <Share className="w-3.5 h-3.5 text-[#d4af37] inline shrink-0" />{' '}
                      <strong className="text-[#fbf9f4]">Share</strong> in Safari&apos;s toolbar.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-[#080d1a] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] font-bold shrink-0">
                      2
                    </span>
                    <span className="flex items-center gap-1.5">
                      Select <PlusSquare className="w-3.5 h-3.5 text-[#d4af37] inline shrink-0" />{' '}
                      <strong className="text-[#fbf9f4]">Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons: Cancel & Platform-Specific Install Action */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1 shrink-0">
                <button
                  type="button"
                  onClick={handleCancelInstall}
                  className="w-full py-2.5 px-3 sm:px-4 rounded-xl bg-[#131b2e] hover:bg-[#1a253f] border border-[#d4af37]/30 text-xs sm:text-sm font-semibold text-[#cbd5e1] hover:text-[#fbf9f4] transition-all cursor-pointer"
                >
                  Cancel
                </button>

                {isAndroidDevice ? (
                  /* ANDROID: Direct external <a> download of Latest.SVH.apk */
                  <a
                    href="https://github.com/babanrana2008-crypto/Study-Vault-Hub/releases/download/v4.0.0/Latest.SVH.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    download="Latest.SVH.apk"
                    onClick={(e) =>
                      handleDirectDownloadClick(e, 'Study Vault Hub APK download started.')
                    }
                    className="w-full py-2.5 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer border border-[#d4af37]/40 no-underline"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Install</span>
                  </a>
                ) : isWindowsDevice && hasWindowsInstaller ? (
                  /* WINDOWS (when real Study-Vault-Hub-Setup.exe is available): Direct external <a> download */
                  <a
                    href={WINDOWS_INSTALLER_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer external"
                    download="Study-Vault-Hub-Setup.exe"
                    onClick={(e) =>
                      handleDirectDownloadClick(
                        e,
                        'Study Vault Hub Windows installer download started.'
                      )
                    }
                    className="w-full py-2.5 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer border border-[#d4af37]/40 no-underline"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Install</span>
                  </a>
                ) : isMacosDevice && hasMacosInstaller ? (
                  /* MACOS (when real Study-Vault-Hub.dmg is available): Direct external <a> download */
                  <a
                    href={MACOS_INSTALLER_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer external"
                    download="Study-Vault-Hub.dmg"
                    onClick={(e) =>
                      handleDirectDownloadClick(
                        e,
                        'Study Vault Hub macOS installer download started.'
                      )
                    }
                    className="w-full py-2.5 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer border border-[#d4af37]/40 no-underline"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Install</span>
                  </a>
                ) : isIOSDevice ? (
                  /* IPHONE / IPAD: Confirm Add to Home Screen PWA guide */
                  <button
                    type="button"
                    onClick={handleIOSConfirm}
                    className="w-full py-2.5 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer border border-[#d4af37]/40"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Got It</span>
                  </button>
                ) : (
                  /* WINDOWS / MACOS (without native binary artifact yet) or OTHER DESKTOP: Native PWA install or clean web experience */
                  <button
                    type="button"
                    onClick={handleDesktopFallbackInstall}
                    className="w-full py-2.5 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer border border-[#d4af37]/40"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Install</span>
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
});

