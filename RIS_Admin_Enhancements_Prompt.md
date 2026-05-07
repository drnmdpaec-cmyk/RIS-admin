# Claude Code Prompt — RIS-Portal-Admin Enhancements

> **Nuclear Medicine Department — Admin Portal Live-Operations Layer**
> Paste this entire file content into the Claude Code terminal inside your existing `RIS-Portal-Admin` folder, OR tell Claude Code: `Read ADMIN_ENHANCEMENTS.md and execute it phase by phase`.

---

## Context

You are a senior frontend engineer adding live-operations enhancements to an existing React + Vite + TypeScript administrative portal for a Nuclear Medicine Department in Kuwait. The portal already exists at `RIS-Portal-Admin/` and is deployed at `https://ris.yourdomain.com/admin/`.

These enhancements are NOT a PWA conversion. The admin portal stays a standard web application — no installable home screen icon, no offline mode. Admin staff use this from workstations all day; it lives in a browser tab alongside the desktop RIS app. Adding full PWA machinery would be over-engineering.

What we ARE adding:

1. **Auto-refresh for live dashboard data** — operations dashboard updates without manual F5
2. **Browser tab title badge** — shows pending counts so staff notice activity from other tabs
3. **Optional browser notifications for new pending bookings** — opt-in, generic payload, no install required
4. **Smart polling intervals** — different freshness per page (dashboard fast, settings slow)
5. **Visual freshness indicators** — staff can see at a glance how current the data is

This is a focused enhancement layer. The only service worker we register is a minimal one used solely as the receiver target for Web Push (for the optional notification feature). It does NOT cache anything. It does NOT enable offline mode.

---

## Critical Medical Software Rules — Read First

These rules override everything else. If anything below conflicts, follow these:

1. **Never include PHI in push notification payloads** — generic strings only ("3 new bookings awaiting confirmation" not "Booking from Ahmed K. for FDG PET/CT").
2. **Service worker scope is `/admin/`** — must not interfere with patient portal at `/` or doctor portal at `/doctor/`.
3. **No PHI in localStorage, IndexedDB, or any browser storage** — only generic preferences (notification toggle, theme, language, saved view names).
4. **No offline data caching** — admin staff need accurate, current data; never serve stale information.
5. **Idle timeout still applies** — the existing 15-minute idle timeout (strictest of all three portals) must continue working. Service worker activity must NOT reset the idle timer.
6. **Auto-refresh respects PHI masking rules** — when data refreshes in background, it must come back through the same masked endpoints (last 4 of civil ID, initials only, etc.). Never bypass masking for "convenience".
7. **All export/refresh/notification activity is audit-logged on backend** — even passive polling requests should be cheap but trackable.

---

## Tech Stack — additions only

The admin portal already uses Vite 5 + React 18 + TypeScript 5 + Tailwind + i18next + axios + TanStack Query. Add only:

```bash
pnpm add -D vite-plugin-pwa workbox-window
```

We use `vite-plugin-pwa` only as the most reliable way to register a minimal service worker for Web Push. Configure it minimally — no manifest, no precaching.

Do NOT install: `firebase-messaging`, `pusher`, `socket.io`, or any third-party push/realtime service. Use native Web Push + VAPID + TanStack Query polling.

---

## Phase 1 — Minimal Service Worker for Push Only

### Step 1: Configure vite-plugin-pwa in push-only mode

Update `vite.config.ts` (preserve existing `base: '/admin/'` and port `5175`):

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      // No manifest — we are NOT building a PWA
      manifest: false,
      injectManifest: {
        // No precaching — admin needs always-fresh data
        globPatterns: [],
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: false,
        type: 'module',
      }
    })
  ],
  base: '/admin/',
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      // Preserve existing manualChunks config
    }
  }
});
```

Key points:
- `manifest: false` — no installable app
- `globPatterns: []` — no precaching, never serve stale data
- Existing `base: '/admin/'` preserved so paths stay correct

### Step 2: Write the minimal service worker

Create `src/service-worker.ts`. Identical pattern to doctor portal but admin-scoped:

```typescript
/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

declare const self: ServiceWorkerGlobalScope;

// ──────────────────────────────────────────────────────────────
// Lifecycle — take over immediately, no caching
// ──────────────────────────────────────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ──────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS — generic payloads only, never PHI
// ──────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'Admin Portal',
      body: 'You have a new update',
      tag: 'general',
      url: '/admin/dashboard',
      priority: 'normal'
    };
  }

  // SECURITY: payload must NEVER contain PHI.
  // Backend sends only generic templated strings:
  //   "3 new online bookings awaiting confirmation"
  //   "5 reports awaiting delivery"
  //   "Critical finding flagged — review needed"
  //   "1 new staff message"
  // Tap → opens portal → fetch fresh authenticated data.

  const options: NotificationOptions = {
    body: payload.body,
    icon: '/admin/notification-icon.png',
    badge: '/admin/notification-badge.png',
    tag: payload.tag,
    data: { url: payload.url },
    requireInteraction: payload.priority === 'high',
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/admin/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Browser rotates subscription; frontend re-registers on next page load
});

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────
interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  priority: 'normal' | 'high';
}
```

### Step 3: Notification icons

Create `public/notification-icon.png` (192×192) and `public/notification-badge.png` (72×72). Same pattern as doctor portal but with admin-themed visual (a settings cog or operations chart icon on the brand primary color `#2E75B6`).

If user provides no logo, generate a simple placeholder with `sharp` from a placeholder SVG.

---

## Phase 2 — Push Subscription Frontend

### Step 4: Create push notification service

Create `src/services/pushNotifications.ts`. Same as doctor portal but pointing at admin endpoints:

```typescript
import { apiClient } from '@/api/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export async function isPushSupported(): Promise<boolean> {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getCurrentPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function isSubscribed(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

export async function subscribeToPush(): Promise<{ success: boolean; reason?: string }> {
  try {
    if (!await isPushSupported()) return { success: false, reason: 'unsupported' };
    if (!VAPID_PUBLIC_KEY) return { success: false, reason: 'misconfigured' };

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { success: false, reason: 'permission_denied' };

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    await apiClient.post('/admin/push-subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth')),
      },
      user_agent: navigator.userAgent,
    });

    return { success: true };
  } catch (error) {
    console.error('Push subscription failed:', error);
    return { success: false, reason: 'error' };
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    await apiClient.post('/admin/push-unsubscribe', {
      endpoint: subscription.endpoint,
    });

    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.error('Push unsubscribe failed:', error);
    return false;
  }
}

// ─── Utilities ──────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}
```

### Step 5: Register service worker on app startup

Create `src/services/registerServiceWorker.ts`:

```typescript
import { registerSW } from 'virtual:pwa-register';

export function setupServiceWorker() {
  if (import.meta.env.DEV) return;

  registerSW({
    onRegisteredSW(swUrl) {
      console.log('Admin portal SW registered:', swUrl);
    },
    onRegisterError(error) {
      console.error('Admin portal SW registration error:', error);
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NAVIGATE' && event.data.url) {
        window.location.href = event.data.url;
      }
    });
  }
}
```

Update `src/main.tsx`:

```typescript
import { setupServiceWorker } from './services/registerServiceWorker';

// Existing imports and code...

setupServiceWorker();
```

### Step 6: Add notification toggle to Settings

Locate the user's personal preferences in Settings (or create if it doesn't exist as a sub-page). Add a notification preferences section that mirrors the doctor portal pattern but with admin-specific event types:

```typescript
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  isPushSupported,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentPermission
} from '@/services/pushNotifications';
import toast from 'react-hot-toast';

export function NotificationPreferences() {
  const { t } = useTranslation('settings');
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Per-event-type toggles (stored on backend in user preferences)
  const [preferences, setPreferences] = useState({
    newPendingBookings: true,
    reportsAwaitingDelivery: true,
    criticalFindingsFlagged: true,
    systemAlerts: true,
  });

  useEffect(() => {
    (async () => {
      const support = await isPushSupported();
      setSupported(support);
      if (support) {
        setPermission(await getCurrentPermission());
        setEnabled(await isSubscribed());
      }
      setLoading(false);
    })();
  }, []);

  const handleMasterToggle = async (next: boolean) => {
    setLoading(true);
    try {
      if (next) {
        const result = await subscribeToPush();
        if (result.success) {
          setEnabled(true);
          setPermission('granted');
          toast.success(t('notifications.enabled'));
        } else if (result.reason === 'permission_denied') {
          toast.error(t('notifications.permissionDenied'));
        } else {
          toast.error(t('notifications.errorEnabling'));
        }
      } else {
        const ok = await unsubscribeFromPush();
        if (ok) {
          setEnabled(false);
          toast.success(t('notifications.disabled'));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium">{t('notifications.unsupportedTitle')}</h3>
            <p className="text-sm text-neutral-600 mt-1">{t('notifications.unsupportedDescription')}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {enabled ? (
              <Bell className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            ) : (
              <BellOff className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="font-medium">{t('notifications.masterTitle')}</h3>
              <p className="text-sm text-neutral-600 mt-1 max-w-prose">
                {t('notifications.masterDescription')}
              </p>
              {permission === 'denied' && (
                <p className="text-sm text-danger-600 mt-2 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {t('notifications.permissionBlocked')}
                </p>
              )}
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleMasterToggle}
            disabled={loading || permission === 'denied'}
          />
        </div>
      </Card>

      {/* Per-event-type toggles (only when master is on) */}
      {enabled && (
        <Card className="p-6">
          <h4 className="font-medium mb-4">{t('notifications.eventTypesTitle')}</h4>
          <div className="space-y-3">
            <ToggleRow
              label={t('notifications.eventNewBookings')}
              description={t('notifications.eventNewBookingsDesc')}
              checked={preferences.newPendingBookings}
              onCheckedChange={(v) => setPreferences(p => ({ ...p, newPendingBookings: v }))}
            />
            <ToggleRow
              label={t('notifications.eventReportsDelivery')}
              description={t('notifications.eventReportsDeliveryDesc')}
              checked={preferences.reportsAwaitingDelivery}
              onCheckedChange={(v) => setPreferences(p => ({ ...p, reportsAwaitingDelivery: v }))}
            />
            <ToggleRow
              label={t('notifications.eventCritical')}
              description={t('notifications.eventCriticalDesc')}
              checked={preferences.criticalFindingsFlagged}
              onCheckedChange={(v) => setPreferences(p => ({ ...p, criticalFindingsFlagged: v }))}
            />
            <ToggleRow
              label={t('notifications.eventSystem')}
              description={t('notifications.eventSystemDesc')}
              checked={preferences.systemAlerts}
              onCheckedChange={(v) => setPreferences(p => ({ ...p, systemAlerts: v }))}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function ToggleRow({ label, description, checked, onCheckedChange }: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-neutral-600 mt-0.5">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
```

When per-event preferences change, persist to backend:
```
PATCH /api/v1/admin/preferences
Body: { notification_preferences: { newPendingBookings: true, ... } }
```

### Step 7: Add translations

`src/i18n/locales/en/settings.json`:
```json
{
  "notifications": {
    "masterTitle": "Browser Notifications",
    "masterDescription": "Receive desktop notifications for new bookings, pending deliveries, and critical alerts. Notifications contain no patient details — click to open the portal and view full information.",
    "enabled": "Notifications enabled",
    "disabled": "Notifications disabled",
    "permissionDenied": "Browser blocked notification permission. Enable in your browser site settings.",
    "permissionBlocked": "Notifications blocked by browser. Click the lock icon in the address bar and allow notifications, then refresh.",
    "errorEnabling": "Could not enable notifications. Please try again.",
    "unsupportedTitle": "Notifications not supported",
    "unsupportedDescription": "Your browser does not support push notifications. Try Chrome, Edge, Firefox, or Safari 16.4+.",
    "eventTypesTitle": "What to notify me about",
    "eventNewBookings": "New pending bookings",
    "eventNewBookingsDesc": "When a patient submits a new online booking awaiting confirmation",
    "eventReportsDelivery": "Reports awaiting delivery",
    "eventReportsDeliveryDesc": "When signed reports accumulate beyond a threshold (15+ pending)",
    "eventCritical": "Critical finding flagged",
    "eventCriticalDesc": "When a radiologist marks a finding as critical and requires urgent administrative attention",
    "eventSystem": "System alerts",
    "eventSystemDesc": "Backup failures, service health degradation, security events"
  }
}
```

`src/i18n/locales/ar/settings.json`:
```json
{
  "notifications": {
    "masterTitle": "إشعارات المتصفح",
    "masterDescription": "احصل على إشعارات سطح المكتب للحجوزات الجديدة والتقارير في انتظار التسليم والتنبيهات الحرجة. لا تحتوي الإشعارات على بيانات المريض — اضغط لفتح البوابة وعرض المعلومات الكاملة.",
    "enabled": "تم تفعيل الإشعارات",
    "disabled": "تم إيقاف الإشعارات",
    "permissionDenied": "المتصفح حظر إذن الإشعارات. فعّله من إعدادات الموقع في المتصفح.",
    "permissionBlocked": "الإشعارات محظورة من المتصفح. اضغط على رمز القفل في شريط العنوان واسمح بالإشعارات، ثم أعد التحميل.",
    "errorEnabling": "تعذّر تفعيل الإشعارات. يرجى المحاولة مرة أخرى.",
    "unsupportedTitle": "الإشعارات غير مدعومة",
    "unsupportedDescription": "متصفحك لا يدعم الإشعارات الفورية. جرّب Chrome أو Edge أو Firefox أو Safari 16.4 أو أحدث.",
    "eventTypesTitle": "ما الذي تريد أن يتم إشعارك به",
    "eventNewBookings": "حجوزات جديدة في الانتظار",
    "eventNewBookingsDesc": "عند تقديم مريض حجزاً جديداً عبر الإنترنت في انتظار التأكيد",
    "eventReportsDelivery": "تقارير في انتظار التسليم",
    "eventReportsDeliveryDesc": "عند تراكم التقارير الموقعة فوق حد معين (15+ في الانتظار)",
    "eventCritical": "تحديد نتيجة حرجة",
    "eventCriticalDesc": "عند تحديد طبيب الأشعة لنتيجة كحرجة وتتطلب اهتماماً إدارياً عاجلاً",
    "eventSystem": "تنبيهات النظام",
    "eventSystemDesc": "إخفاقات النسخ الاحتياطي، تدهور صحة الخدمة، الأحداث الأمنية"
  }
}
```

---

## Phase 3 — Browser Tab Title Badge

### Step 8: Build the tab title badge hook

Create `src/hooks/useTabTitleBadge.ts`:

```typescript
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface UnreadCounts {
  pending_confirmations: number;        // Online bookings awaiting confirmation
  reports_awaiting_delivery: number;    // Signed reports not yet delivered
  critical_findings_pending: number;    // Critical findings awaiting admin review
  unread_messages: number;              // New staff messages
}

const BASE_TITLE = 'Admin Portal — Nuclear Medicine';

export function useTabTitleBadge() {
  const { data } = useQuery<UnreadCounts>({
    queryKey: ['admin-unread-counts'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/unread-counts');
      return res.data;
    },
    refetchInterval: 30_000,           // 30 seconds — admin needs faster than doctor portal
    refetchIntervalInBackground: true,
    staleTime: 15_000,
  });

  useEffect(() => {
    const critical = data?.critical_findings_pending || 0;
    const pending = data?.pending_confirmations || 0;
    const reports = data?.reports_awaiting_delivery || 0;
    const messages = data?.unread_messages || 0;
    const total = critical + pending + reports + messages;

    if (total > 0) {
      // Critical findings get red dot priority
      const prefix = critical > 0 ? `🔴 (${total})` : `(${total})`;
      document.title = `${prefix} ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    return () => {
      document.title = BASE_TITLE;
    };
  }, [data]);

  return data;
}
```

### Step 9: Wire into AppShell

In `src/components/layout/AppShell.tsx`:

```typescript
import { useTabTitleBadge } from '@/hooks/useTabTitleBadge';

export function AppShell({ children }: { children: React.ReactNode }) {
  // Run tab badge tracker globally (only when authenticated)
  useTabTitleBadge();

  // Existing AppShell code...
}
```

### Step 10: Backend contract

```
GET /api/v1/admin/unread-counts
Auth: required (ADMIN/STAFF/RADIOLOGIST)
Response: {
  "pending_confirmations": 3,
  "reports_awaiting_delivery": 7,
  "critical_findings_pending": 1,
  "unread_messages": 0
}

Behavior:
- pending_confirmations: appointments where status=PENDING AND booking_source=ONLINE
- reports_awaiting_delivery: reports where status=SIGNED and not yet DELIVERED
- critical_findings_pending: signed critical reports without admin acknowledgment
- unread_messages: messages from referring doctors not yet read by any staff

Permissions:
- If user lacks 'appointments:manage', return 0 for pending_confirmations
- If user lacks 'reports:deliver', return 0 for reports_awaiting_delivery
- (etc — backend tailors counts to what this user can act on)

Performance:
- Called every 30 seconds per active admin session
- Must respond in <100ms
- Cache aggressively at backend (in-memory cache acceptable, 10-second TTL)
```

---

## Phase 4 — Auto-Refresh Live Data

The operations dashboard is the home page for admin staff. They expect it to feel "live" without having to refresh.

### Step 11: Configure TanStack Query refresh intervals

**Operations Dashboard (`src/api/queries/useOperations.ts`):**
```typescript
export function useOperationsDashboard() {
  return useQuery({
    queryKey: ['admin-operations-dashboard'],
    queryFn: async () => (await apiClient.get('/admin/dashboard')).data,
    refetchInterval: 30_000,                 // 30 seconds
    refetchIntervalInBackground: true,       // Keep refreshing in background tabs
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}
```

**Pending Confirmations (`src/api/queries/usePendingConfirmations.ts`):**
```typescript
export function usePendingConfirmations(filters: AppointmentFilters) {
  return useQuery({
    queryKey: ['admin-pending-confirmations', filters],
    queryFn: async () => (await apiClient.get('/admin/appointments/pending', { params: filters })).data,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,      // Foreground only — admin is actively working
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}
```

**Reports Pending Delivery (`src/api/queries/useReportsPending.ts`):**
```typescript
export function useReportsPendingDelivery(filters: ReportFilters) {
  return useQuery({
    queryKey: ['admin-reports-pending', filters],
    queryFn: async () => (await apiClient.get('/admin/reports/pending', { params: filters })).data,
    refetchInterval: 60_000,                 // Slower than appointments — reports change less
    refetchIntervalInBackground: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
```

**Today's Schedule (calendar / day view):**
```typescript
export function useTodaySchedule() {
  return useQuery({
    queryKey: ['admin-today-schedule'],
    queryFn: async () => (await apiClient.get('/admin/appointments/today')).data,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
```

**Audit log:**
```typescript
// Audit log MUST NOT auto-refresh — admin is actively investigating, page should not change underneath
export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ['admin-audit-log', filters],
    queryFn: async () => (await apiClient.get('/admin/audit', { params: filters })).data,
    refetchInterval: false,
    staleTime: 5 * 60_000,
  });
}
```

**Settings pages, Users management, Patient detail:**
- No auto-refresh — admin is editing or reviewing, should not see data shift mid-action
- Only refetch on window focus

### Step 12: Add LastRefreshedIndicator component

Create `src/components/shared/LastRefreshedIndicator.tsx`:

```typescript
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enGB } from 'date-fns/locale';

interface Props {
  dataUpdatedAt: number;
  isFetching: boolean;
  onManualRefresh?: () => void;
}

export function LastRefreshedIndicator({ dataUpdatedAt, isFetching, onManualRefresh }: Props) {
  const { t, i18n } = useTranslation('common');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, []);

  const locale = i18n.language === 'ar' ? ar : enGB;
  const relative = formatDistanceToNow(dataUpdatedAt, { addSuffix: true, locale });

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <span>{t('common.lastUpdated')}: {relative}</span>
      {onManualRefresh && (
        <button
          onClick={onManualRefresh}
          disabled={isFetching}
          className="hover:text-primary-600 disabled:opacity-50"
          aria-label={t('common.refreshNow')}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}
```

Add this component to:
- Operations Dashboard page header (top right)
- Pending Confirmations page header
- Reports Pending Delivery page header
- Today's Schedule page header

Translations:

`en/common.json`:
```json
{
  "common": {
    "lastUpdated": "Last updated",
    "refreshNow": "Refresh now"
  }
}
```

`ar/common.json`:
```json
{
  "common": {
    "lastUpdated": "آخر تحديث",
    "refreshNow": "تحديث الآن"
  }
}
```

### Step 13: Visual indicator when new pending items appear

When the dashboard polling detects new pending confirmations (count went up), briefly highlight the card with a subtle animation:

In the Operations Dashboard, track previous count and animate on increase:

```typescript
import { useEffect, useRef } from 'react';

function PendingConfirmationsCard() {
  const { data, isFetching } = useOperationsDashboard();
  const count = data?.pending_confirmations || 0;
  const prevCount = useRef(count);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (count > prevCount.current) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
    prevCount.current = count;
  }, [count]);

  return (
    <Card className={`p-4 transition-all ${highlight ? 'ring-2 ring-primary-500 shadow-lg' : ''}`}>
      {/* ... */}
    </Card>
  );
}
```

The 2-second ring highlight catches the eye when new bookings arrive without being annoying.

---

## Phase 5 — Snooze & Quiet Hours

Admin staff don't want notifications outside working hours. Add a "snooze" / "quiet hours" mechanism.

### Step 14: Quiet hours setting

Add to the notification preferences UI (Step 6):

```typescript
// Add below the per-event-type toggles:
<Card className="p-6">
  <h4 className="font-medium mb-4">{t('notifications.quietHoursTitle')}</h4>
  <p className="text-sm text-neutral-600 mb-4">{t('notifications.quietHoursDescription')}</p>

  <div className="space-y-3">
    <div>
      <label className="text-sm font-medium">{t('notifications.quietStart')}</label>
      <Input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
    </div>
    <div>
      <label className="text-sm font-medium">{t('notifications.quietEnd')}</label>
      <Input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
    </div>
  </div>

  <div className="mt-4 flex items-center justify-between">
    <span className="text-sm">{t('notifications.respectFridays')}</span>
    <Switch checked={skipFridays} onCheckedChange={setSkipFridays} />
  </div>

  <Button onClick={savePreferences} className="mt-4">
    {t('common.save')}
  </Button>
</Card>
```

Persist to backend:
```
PATCH /api/v1/admin/preferences
Body: {
  quiet_hours: { start: "18:00", end: "07:00" },
  skip_fridays: true,
  timezone: "Asia/Kuwait"
}
```

Backend respects these settings when sending push notifications. Quiet hours always honor Kuwait time zone unless user overrides.

Add translations:

`en/settings.json`:
```json
{
  "notifications": {
    "quietHoursTitle": "Quiet Hours",
    "quietHoursDescription": "Notifications will be paused during these hours. Critical findings can still break through quiet hours if marked urgent.",
    "quietStart": "Pause from",
    "quietEnd": "Resume at",
    "respectFridays": "Pause on Fridays (Kuwait weekend)"
  }
}
```

`ar/settings.json`:
```json
{
  "notifications": {
    "quietHoursTitle": "ساعات الهدوء",
    "quietHoursDescription": "سيتم إيقاف الإشعارات مؤقتاً خلال هذه الساعات. النتائج الحرجة المُعلَّمة كعاجلة قد تتجاوز ساعات الهدوء.",
    "quietStart": "الإيقاف من",
    "quietEnd": "الاستئناف في",
    "respectFridays": "الإيقاف يوم الجمعة (عطلة نهاية الأسبوع في الكويت)"
  }
}
```

### Step 15: Manual snooze action

In the global header / user menu, add a "Snooze notifications for 1 hour" quick action:

```typescript
<DropdownMenuItem onClick={snoozeFor(60)}>
  <BellOff className="w-4 h-4 me-2" />
  {t('notifications.snoozeOneHour')}
</DropdownMenuItem>
<DropdownMenuItem onClick={snoozeFor(240)}>
  <BellOff className="w-4 h-4 me-2" />
  {t('notifications.snoozeFourHours')}
</DropdownMenuItem>
```

Snooze sends:
```
POST /api/v1/admin/preferences/snooze
Body: { duration_minutes: 60 }
```

Backend stores `snooze_until` timestamp and skips notifications until then.

---

## Phase 6 — Environment Configuration

### Step 16: Update environment variables

Add to `.env.example`:

```env
# Web Push notifications
VITE_VAPID_PUBLIC_KEY=

# Existing variables remain unchanged
```

VAPID public key must match the same key pair used by patient and doctor portals (or use a separate key pair for admin if you want strict isolation — both approaches are acceptable; recommend separate key pair for admin since the privilege level is higher).

---

## Phase 7 — Backend Contract Documentation

Create `BACKEND_REQUIREMENTS.md` documenting all new endpoints needed:

```markdown
# Admin Portal Backend Requirements

## New endpoints to implement on RIS-Backend

### 1. POST /api/v1/admin/push-subscribe
Auth: ADMIN | STAFF | RADIOLOGIST
Body: { endpoint, keys: { p256dh, auth }, user_agent }
Response: { success: true, subscription_id }
Behavior: stores subscription, audit log: PUSH_SUBSCRIBE

### 2. POST /api/v1/admin/push-unsubscribe
Auth: required
Body: { endpoint }
Response: { success: true }
Behavior: deletes subscription, audit log: PUSH_UNSUBSCRIBE

### 3. GET /api/v1/admin/unread-counts
Auth: required
Response: { pending_confirmations, reports_awaiting_delivery, critical_findings_pending, unread_messages }
Performance: <100ms, called every 30s per session, cache 10s
Permission-aware: zero out fields user can't act on

### 4. PATCH /api/v1/admin/preferences
Auth: required
Body: { notification_preferences?, quiet_hours?, skip_fridays?, timezone? }
Response: { success: true }
Behavior: updates user prefs, audit log: PREFERENCES_UPDATE

### 5. POST /api/v1/admin/preferences/snooze
Auth: required
Body: { duration_minutes }
Response: { success: true, snooze_until: ISO8601 }
Behavior: sets snooze_until = now + duration_minutes

### 6. GET /api/v1/admin/preferences
Auth: required
Response: full preferences object including notification_preferences, quiet_hours, snooze_until

## Push notification trigger logic

When backend events occur, send pushes to admins who have:
- Subscribed to that event type in preferences
- Not currently in quiet hours
- Not currently snoozed
- Have permission to act on that event type

### Event: New online booking submitted
Trigger: appointment.status=PENDING AND booking_source=ONLINE created
Recipients: admins with 'appointments:manage' permission AND newPendingBookings=true
Payload:
{
  "title": "New Booking Awaiting Confirmation",
  "body": "1 new online booking needs review",  // or "{N} new bookings need review"
  "tag": "pending-bookings",                     // Dedup tag
  "url": "/admin/appointments/pending",
  "priority": "normal"
}

### Event: Reports backlog over threshold
Trigger: count(reports where status=SIGNED AND not delivered) > 15
Recipients: admins with 'reports:deliver' permission AND reportsAwaitingDelivery=true
Payload:
{
  "title": "Reports Awaiting Delivery",
  "body": "{N} signed reports pending delivery to patients",
  "tag": "reports-backlog",
  "url": "/admin/reports/pending",
  "priority": "normal"
}

### Event: Critical finding flagged
Trigger: report.is_critical=true AND signed
Recipients: admins with 'reports:deliver' permission AND criticalFindingsFlagged=true
Payload:
{
  "title": "Critical Finding Flagged",
  "body": "A critical finding requires urgent administrative review",
  "tag": "critical-finding-{report.id}",
  "url": "/admin/reports/pending?filter=critical",
  "priority": "high"
}

### Event: System alert
Trigger: backup_failed | service_health_degraded | security_event_high
Recipients: admins with 'system:admin' permission AND systemAlerts=true
Payload:
{
  "title": "System Alert",
  "body": "{generic description}",
  "tag": "system-{event_type}",
  "url": "/admin/system/health",
  "priority": "high"
}

## Critical: NO PHI in any payload
- Never include patient names
- Never include scan types
- Never include clinical content
- Counts and category labels only

## Rate limiting
- Max 1 notification per tag per hour (dedup)
- Max 20 notifications per admin per day
- Quiet hours and snooze respected
```

---

## Phase 8 — Testing & Validation

### Step 17: Test auto-refresh

1. Build & preview production: `pnpm build && pnpm preview`
2. Open admin portal, log in
3. Open Operations Dashboard
4. In a separate window, create a new pending booking via the patient portal
5. Within 30 seconds, dashboard should:
   - Pending confirmations card shows new count
   - Card briefly shows ring highlight animation
   - Tab title updates with badge count

### Step 18: Test push notifications

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add to `.env` (frontend public, backend private)
3. Build & preview
4. Log in, go to Settings → Notifications
5. Enable master toggle → grant permission
6. Enable "New pending bookings" event
7. Create a new pending booking via patient portal
8. Verify:
   - Browser notification appears within seconds
   - Notification body contains NO patient information
   - Tap notification → opens admin portal at `/admin/appointments/pending`

### Step 19: Test quiet hours

1. Set quiet hours: 18:00 → 07:00
2. Create test booking at 19:00 (or simulate)
3. Verify NO notification appears
4. Verify badge count still increments (visual cue only)

### Step 20: Verify no PHI leakage

DevTools audits:
- ✓ Cache Storage: empty
- ✓ Local Storage: only `ris-admin:` prefixed keys with non-PHI values
- ✓ Service Worker push event payload: generic strings only
- ✓ Network tab: all `/api/v1/admin/unread-counts` responses are aggregate counts only
- ❌ NO localStorage key contains patient names, civil IDs, scan types

---

## Phase 9 — Documentation

### Step 21: Update CLAUDE.md

Append:

```markdown
## Live-Operations Layer (Enhancement, not full PWA)

Admin portal uses a minimal service worker for Web Push only. NOT a PWA.
No installable manifest, no offline shell, no precaching.

### Auto-refresh strategy
- Operations dashboard: 30s background refresh (always)
- Pending confirmations: 30s foreground refresh
- Reports pending delivery: 60s foreground refresh
- Today's schedule: 60s background refresh
- Audit log: NEVER auto-refresh
- Settings/Users/Patient detail: refetch on focus only

### Tab title badge
- Polls /admin/unread-counts every 30 seconds (background-tab safe)
- Updates document.title with "(N) Admin Portal..." or "🔴 (N)..." when critical
- Counts respect user's permissions (backend filters)

### Push notifications (opt-in)
- Master toggle + per-event-type toggles
- Quiet hours: respects user-set time range and Kuwait Friday
- Snooze: 1hr / 4hr quick actions
- Backend rate-limits and deduplicates by tag
- All payloads are generic — never PHI

### Visual freshness
- LastRefreshedIndicator on every auto-refreshing page
- New-item ring highlight animation (2s) when pending counts increase
- Manual refresh button always available

### Critical PHI rules
- Push payloads NEVER contain patient names, scan types, or clinical content
- Tab title contains only counts (numbers and category labels)
- localStorage stores: theme, language, saved view names, user preferences
- All notification subscribe/unsubscribe events audit-logged
```

### Step 22: Update README.md

```markdown
## Live Updates & Notifications

The admin portal automatically refreshes operational data so you don't
need to press F5 to see new bookings, reports, or alerts.

### Auto-refresh behavior
- Operations dashboard: every 30 seconds
- Pending confirmations: every 30 seconds when tab is active
- Reports awaiting delivery: every 60 seconds
- Audit log and settings: refresh on demand only

### Browser notifications (optional)
1. Settings → Notifications → enable master toggle
2. Choose which event types to receive
3. Configure quiet hours if desired

You will receive browser notifications for:
- New pending bookings (online submissions)
- Reports awaiting delivery backlog
- Critical findings flagged
- System alerts (backup failures, security events)

All notifications are generic — they contain no patient information.
Click any notification to open the relevant section of the portal.

### Tab title badge
When the portal is open in a background tab, the tab title shows
counts of items needing attention: "(5) Admin Portal..." or
"🔴 (3) Admin Portal..." for critical items.
```

---

## Final checklist before deployment

- [ ] vite-plugin-pwa configured in push-only mode (manifest: false, no precache)
- [ ] Service worker handles push + click only, no caching logic
- [ ] Notification icons present
- [ ] Push subscription service implemented
- [ ] Settings → Notifications has master + per-event toggles
- [ ] Quiet hours configurable
- [ ] Snooze quick actions in user menu
- [ ] Tab title badge running globally in AppShell
- [ ] Auto-refresh configured per page (30s/60s/never)
- [ ] LastRefreshedIndicator on dashboard, pending pages, today's schedule
- [ ] New-item ring highlight on pending count increase
- [ ] VAPID public key in `.env`
- [ ] Backend endpoints documented in BACKEND_REQUIREMENTS.md
- [ ] Test push end-to-end (subscribe, receive, tap, navigate)
- [ ] Tab badge updates within 30s of count change
- [ ] Quiet hours suppress notifications correctly
- [ ] No PHI in any push payload
- [ ] No PHI in localStorage
- [ ] Cache Storage empty (no caches)
- [ ] CLAUDE.md updated
- [ ] README.md updated

---

## Start now

Execute the phases in order:

1. **Phase 1** — Minimal service worker for push (3 steps)
2. **Phase 2** — Push subscription frontend (4 steps)
3. **Phase 3** — Tab title badge (3 steps)
4. **Phase 4** — Auto-refresh live data (3 steps)
5. **Phase 5** — Snooze & quiet hours (2 steps)
6. **Phase 6** — Environment config (1 step)
7. **Phase 7** — Backend documentation
8. **Phase 8** — Testing (4 steps)
9. **Phase 9** — Documentation (2 steps)

After each phase, run `pnpm build && pnpm preview` and verify the previous phase still works. Report back after Phase 1 completes (build succeeds with no manifest output) so we can confirm the build pipeline before proceeding.

Begin with Phase 1, Step 1: install dependencies and configure `vite.config.ts` in push-only mode. Verify the build succeeds with no manifest.json file generated before continuing to Step 2.
