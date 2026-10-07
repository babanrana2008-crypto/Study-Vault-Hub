/**
 * Centralized Android APK Download Configuration for Study Vault Hub.
 *
 * Insert the real Android APK download URL below once the APK is generated and hosted
 * (or set VITE_ANDROID_APK_URL in environment variables).
 * Leave empty ('') until the real APK download URL is available.
 */
export const ANDROID_APK_DOWNLOAD_URL: string =
  (import.meta.env.VITE_ANDROID_APK_URL as string | undefined)?.trim() || '';

export function hasConfiguredApkUrl(): boolean {
  return Boolean(
    ANDROID_APK_DOWNLOAD_URL &&
      /^https?:\/\/.+/i.test(ANDROID_APK_DOWNLOAD_URL)
  );
}

/**
 * Centralized APK download handler.
 * Returns true if a real APK download was initiated, or false if no APK URL is configured yet.
 */
export function triggerAndroidApkDownload(): boolean {
  if (!hasConfiguredApkUrl()) {
    return false;
  }

  const link = document.createElement('a');
  link.href = ANDROID_APK_DOWNLOAD_URL;
  link.setAttribute('download', 'StudyVaultHub.apk');
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
