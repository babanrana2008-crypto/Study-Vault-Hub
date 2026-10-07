import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import App from './App.tsx';
import './index.css';

const NATIVE_BACKEND_ORIGIN = 'https://ais-pre-w3eilfsiu6bgskrqwaueau-208888461367.asia-east1.run.app';

if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return originalFetch(`${NATIVE_BACKEND_ORIGIN}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);
