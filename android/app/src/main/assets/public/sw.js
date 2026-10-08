// Study Vault Hub - Platform-Safe PWA Service Worker
// Provides standalone PWA installability on iPhone/iPad (Add to Home Screen) and desktop
// while NEVER intercepting Android APK downloads, desktop installers, cross-origin URLs,
// API routes, or WebSockets.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Never intercept cross-origin requests (e.g. GitHub Releases APK/EXE/DMG downloads)
  if (url.origin !== self.location.origin) return;

  // Never intercept API, WebSocket, or binary installer paths
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ws/') ||
    /\.(apk|exe|msi|dmg|pkg|zip)$/i.test(url.pathname)
  ) {
    return;
  }
});


