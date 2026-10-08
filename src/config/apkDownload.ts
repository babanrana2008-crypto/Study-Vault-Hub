import { Capacitor } from '@capacitor/core';

/**
 * Centralized Android APK Download Configuration & Universal Platform Detection
 * for Study Vault Hub.
 *
 * Official published Android APK release URL:
 * https://github.com/babanrana2008-crypto/Study-Vault-Hub/releases/download/v1.1.0/Best.app-debug.apk
 */
export const OFFICIAL_ANDROID_APK_URL =
  'https://github.com/babanrana2008-crypto/Study-Vault-Hub/releases/download/v1.1.0/Best.app-debug.apk';

function resolveExternalApkUrl(): string {
  const envUrl = ((import.meta as { env?: Record<string, string> })?.env?.VITE_ANDROID_APK_URL || '').trim();
  if (envUrl && /^https:\/\/.+/i.test(envUrl)) {
    return envUrl;
  }
  return OFFICIAL_ANDROID_APK_URL;
}

export const ANDROID_APK_DOWNLOAD_URL: string = resolveExternalApkUrl();

/**
 * Real Windows Desktop Installer URL (`Study-Vault-Hub-Setup.exe` / `.msi`).
 * Only active when a verified external Windows installer URL is configured and points to a real `.exe` or `.msi` artifact.
 * Never renames or substitutes the Android APK.
 */
function resolveWindowsInstallerUrl(): string {
  const envUrl = ((import.meta as { env?: Record<string, string> })?.env?.VITE_WINDOWS_INSTALLER_URL || '').trim();
  if (
    envUrl &&
    /^https:\/\/.+/i.test(envUrl) &&
    /\.(exe|msi)(\?.*)?$/i.test(envUrl) &&
    !/\.apk/i.test(envUrl)
  ) {
    return envUrl;
  }
  return '';
}

export const WINDOWS_INSTALLER_DOWNLOAD_URL: string = resolveWindowsInstallerUrl();

/**
 * Real macOS Desktop Installer URL (`Study-Vault-Hub.dmg` / `.pkg` / `.app.zip`).
 * Only active when a verified external macOS installer URL is configured and points to a real `.dmg`, `.pkg`, or `.zip` artifact.
 * Never renames or substitutes the Android APK.
 */
function resolveMacosInstallerUrl(): string {
  const envUrl = ((import.meta as { env?: Record<string, string> })?.env?.VITE_MACOS_INSTALLER_URL || '').trim();
  if (
    envUrl &&
    /^https:\/\/.+/i.test(envUrl) &&
    /\.(dmg|pkg|zip)(\?.*)?$/i.test(envUrl) &&
    !/\.apk/i.test(envUrl)
  ) {
    return envUrl;
  }
  return '';
}

export const MACOS_INSTALLER_DOWNLOAD_URL: string = resolveMacosInstallerUrl();

export function hasConfiguredWindowsInstallerUrl(): boolean {
  return Boolean(WINDOWS_INSTALLER_DOWNLOAD_URL);
}

export function hasConfiguredMacosInstallerUrl(): boolean {
  return Boolean(MACOS_INSTALLER_DOWNLOAD_URL);
}

export type DetectedDevicePlatform =
  | 'android-phone'
  | 'android-tablet'
  | 'iphone'
  | 'ipad'
  | 'windows'
  | 'macos'
  | 'linux'
  | 'unknown';

interface NavigatorUAData {
  platform?: string;
  mobile?: boolean;
  brands?: Array<{ brand: string; version: string }>;
}

export function hasConfiguredApkUrl(): boolean {
  return Boolean(
    ANDROID_APK_DOWNLOAD_URL && /^https?:\/\/.+/i.test(ANDROID_APK_DOWNLOAD_URL)
  );
}

/**
 * Detects whether the app is currently running inside the installed native Android APK.
 */
export function isRunningInNativeAndroidApk(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    Capacitor.isNativePlatform() ||
      Capacitor.getPlatform?.() === 'android' ||
      window.location.origin === 'https://localhost' ||
      window.location.protocol === 'capacitor:'
  );
}

/**
 * Detects whether the app is already running as an installed standalone PWA
 * (on iOS Home Screen, macOS Dock, Windows/Linux desktop window).
 */
export function isRunningInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneDisplay =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches);
  const isIOSStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(isStandaloneDisplay || isIOSStandalone);
}

/**
 * Reliably detects the user's device and operating system using Client Hints
 * (`navigator.userAgentData`), hardware touch points (`navigator.maxTouchPoints`),
 * screen geometry, and platform/UA signals.
 */
export function detectDevicePlatform(): DetectedDevicePlatform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unknown';
  }

  const nav = navigator as Navigator & { userAgentData?: NavigatorUAData };
  const uaData = nav.userAgentData;
  const uaPlatform = (uaData?.platform || '').toLowerCase();
  const legacyPlatform = (navigator.platform || '').toLowerCase();
  const ua = navigator.userAgent || '';
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);

  // 1. iPad & iPhone detection (including iPadOS 13+ which reports MacIntel + multi-touch)
  const isIPadOS =
    /iPad/i.test(ua) ||
    uaPlatform === 'ipados' ||
    ((legacyPlatform.includes('mac') || /Macintosh/i.test(ua)) && maxTouchPoints > 1);
  if (isIPadOS) {
    return 'ipad';
  }

  if (/iPhone|iPod/i.test(ua) || uaPlatform === 'ios') {
    return 'iphone';
  }

  // 2. Android Phone vs Android Tablet detection
  if (uaPlatform === 'android' || /Android/i.test(ua)) {
    const minScreenDim =
      typeof window.screen !== 'undefined'
        ? Math.min(window.screen.width || 0, window.screen.height || 0)
        : 0;
    const isTabletByClientHint = uaData?.mobile === false;
    const isTabletByUA = !/Mobile/i.test(ua) || /Tablet|SM-T|Tab/i.test(ua);
    const isTabletByScreen = minScreenDim >= 600 && !/Mobile/i.test(ua);

    if (isTabletByClientHint || isTabletByUA || isTabletByScreen) {
      return 'android-tablet';
    }
    return 'android-phone';
  }

  // 3. Windows PC / Laptop
  if (
    uaPlatform.includes('win') ||
    legacyPlatform.includes('win') ||
    /Windows NT|Win64|Win32/i.test(ua)
  ) {
    return 'windows';
  }

  // 4. macOS MacBook / iMac (non-touch)
  if (
    uaPlatform.includes('mac') ||
    legacyPlatform.includes('mac') ||
    /Macintosh|Mac OS X/i.test(ua)
  ) {
    return 'macos';
  }

  // 5. Linux Desktop / Laptop
  if (
    uaPlatform.includes('linux') ||
    uaPlatform.includes('chrome os') ||
    legacyPlatform.includes('linux') ||
    /Linux|X11|CrOS/i.test(ua)
  ) {
    return 'linux';
  }

  return 'unknown';
}

/**
 * Direct native browser download helper for `ANDROID_APK_DOWNLOAD_URL`.
 * Uses a standard HTML anchor element without `fetch()`, `Blob`, proxy, or API checks.
 */
export function triggerAndroidApkDownload(): boolean {
  if (!hasConfiguredApkUrl() || typeof document === 'undefined') {
    return false;
  }

  try {
    const link = document.createElement('a');
    link.href = ANDROID_APK_DOWNLOAD_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer external';
    link.setAttribute('download', 'Best.app-debug.apk');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      } catch {
        // ignore cleanup error
      }
    }, 1000);
    return true;
  } catch {
    try {
      window.location.href = ANDROID_APK_DOWNLOAD_URL;
      return true;
    } catch {
      return false;
    }
  }
}
