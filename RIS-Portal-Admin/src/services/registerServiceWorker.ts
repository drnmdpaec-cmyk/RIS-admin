/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register';

export function setupServiceWorker(): void {
  if (import.meta.env.DEV) return;

  registerSW({
    onRegisteredSW(swUrl) {
      // eslint-disable-next-line no-console
      console.info('[RIS Admin] Service worker registered:', swUrl);
    },
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.error('[RIS Admin] Service worker registration failed:', error instanceof Error ? error.message : 'unknown');
    },
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent<{ type: string; url: string }>) => {
      if (event.data?.type === 'SW_NAVIGATE' && event.data.url) {
        window.location.href = event.data.url;
      }
    });
  }
}
