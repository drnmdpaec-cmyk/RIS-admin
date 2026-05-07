/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

declare const self: ServiceWorkerGlobalScope;

interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  priority: 'normal' | 'high';
}

// ─── Lifecycle — take control immediately, never cache anything ───────────────

self.addEventListener('install', () => {
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim existing clients so the new SW handles them without a reload
  event.waitUntil(self.clients.claim());
});

// Intercept no fetch events — admin staff need fresh authenticated data always.
// If a fetch listener were added, it could accidentally serve stale medical data.

// ─── Push Notifications — GENERIC payloads only, never PHI ──────────────────
//
// Backend sends only category-level strings such as:
//   "3 new online bookings awaiting confirmation"
//   "5 signed reports pending delivery"
//   "Critical finding requires urgent review"
//   "System alert: backup failure detected"
//
// Patient names, civil IDs, scan types, or any clinical content are NEVER
// included in push payloads. Tapping the notification opens the portal
// where staff authenticate and fetch fresh data through normal channels.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = {
      title: 'Admin Portal',
      body: 'You have a new update. Open the portal to review.',
      tag: 'general',
      url: '/admin/dashboard',
      priority: 'normal',
    };
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: '/admin/notification-icon.png',
    badge: '/admin/notification-badge.png',
    tag: payload.tag,
    data: { url: payload.url },
    // requireInteraction for high-priority (critical findings) so it stays
    // visible until the admin explicitly dismisses it
    requireInteraction: payload.priority === 'high',
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// ─── Notification click — focus existing tab or open new one ─────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = (event.notification.data as { url?: string } | null)?.url ?? '';
  // Scope guard: only navigate within /admin/ — prevents open-redirect if a malicious push
  // payload supplies an external URL (e.g. "https://phishing.example.com")
  const targetUrl = rawUrl.startsWith('/admin/') ? rawUrl : '/admin/dashboard';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing admin portal tab
        for (const client of clientList) {
          if (client.url.includes('/admin') && 'focus' in client) {
            void client.focus();
            // Tell the tab to navigate to the relevant section
            client.postMessage({ type: 'SW_NAVIGATE', url: targetUrl });
            return;
          }
        }
        // No existing tab — open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ─── Subscription rotation ────────────────────────────────────────────────────

self.addEventListener('pushsubscriptionchange', () => {
  // Browser rotated the push subscription (e.g. after 60 days).
  // The next time the frontend loads it will detect a stale/missing
  // subscription and re-register automatically via pushNotifications.ts.
});
