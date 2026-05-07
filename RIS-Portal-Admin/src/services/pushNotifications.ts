import { apiClient } from '@/api/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

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
    if (!(await isPushSupported())) return { success: false, reason: 'unsupported' };
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
    // Log structure only — never log subscription keys or user data
    // eslint-disable-next-line no-console
    console.error('[RIS Admin] Push subscription failed:', error instanceof Error ? error.message : 'unknown');
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
    // eslint-disable-next-line no-console
    console.error('[RIS Admin] Push unsubscribe failed:', error instanceof Error ? error.message : 'unknown');
    return false;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
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
