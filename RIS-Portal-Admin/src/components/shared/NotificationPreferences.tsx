import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  isPushSupported,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentPermission,
} from '@/services/pushNotifications';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

interface EventPreferences {
  newPendingBookings: boolean;
  reportsAwaitingDelivery: boolean;
  criticalFindingsFlagged: boolean;
  systemAlerts: boolean;
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <div className="text-[13px] font-medium text-[var(--color-text)]">{label}</div>
        <div className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{description}</div>
      </div>
      <Toggle checked={checked} onChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function NotificationPreferences() {
  const { t } = useTranslation('settings');
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [masterLoading, setMasterLoading] = useState(true);
  const [prefLoading, setPrefLoading] = useState(false);

  const [preferences, setPreferences] = useState<EventPreferences>({
    newPendingBookings: true,
    reportsAwaitingDelivery: true,
    criticalFindingsFlagged: true,
    systemAlerts: true,
  });

  const [quietStart, setQuietStart] = useState('18:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [skipFridays, setSkipFridays] = useState(true);

  useEffect(() => {
    void (async () => {
      const support = await isPushSupported();
      setSupported(support);
      if (support) {
        setPermission(await getCurrentPermission());
        setEnabled(await isSubscribed());
      }
      setMasterLoading(false);
    })();
  }, []);

  const handleMasterToggle = async (next: boolean) => {
    setMasterLoading(true);
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
      setMasterLoading(false);
    }
  };

  const savePreferences = async () => {
    setPrefLoading(true);
    try {
      await apiClient.patch(ENDPOINTS.PREFERENCES, {
        notification_preferences: preferences,
        quiet_hours: { start: quietStart, end: quietEnd },
        skip_fridays: skipFridays,
        timezone: 'Asia/Kuwait',
      });
      toast.success(t('notifications.preferencesSaved'));
    } catch {
      toast.error(t('notifications.preferencesSaveError'));
    } finally {
      setPrefLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-warning-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--color-text)]">
              {t('notifications.unsupportedTitle')}
            </h3>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
              {t('notifications.unsupportedDescription')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {enabled ? (
              <Bell size={18} className="text-primary-600 shrink-0 mt-0.5" />
            ) : (
              <BellOff size={18} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--color-text)]">
                {t('notifications.masterTitle')}
              </h3>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1 max-w-prose">
                {t('notifications.masterDescription')}
              </p>
              {permission === 'denied' && (
                <p className="text-[12px] text-danger-600 mt-2 flex items-start gap-1.5">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  {t('notifications.permissionBlocked')}
                </p>
              )}
            </div>
          </div>
          <Toggle
            checked={enabled}
            onChange={(v) => void handleMasterToggle(v)}
            disabled={masterLoading || permission === 'denied'}
          />
        </div>
      </div>

      {/* Per-event-type toggles */}
      {enabled && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-5">
          <h4 className="text-[13px] font-semibold text-[var(--color-text)] mb-3">
            {t('notifications.eventTypesTitle')}
          </h4>
          <div className="space-y-1 divide-y divide-[var(--color-border)]">
            <ToggleRow
              label={t('notifications.eventNewBookings')}
              description={t('notifications.eventNewBookingsDesc')}
              checked={preferences.newPendingBookings}
              onCheckedChange={(v) => setPreferences((p) => ({ ...p, newPendingBookings: v }))}
            />
            <ToggleRow
              label={t('notifications.eventReportsDelivery')}
              description={t('notifications.eventReportsDeliveryDesc')}
              checked={preferences.reportsAwaitingDelivery}
              onCheckedChange={(v) => setPreferences((p) => ({ ...p, reportsAwaitingDelivery: v }))}
            />
            <ToggleRow
              label={t('notifications.eventCritical')}
              description={t('notifications.eventCriticalDesc')}
              checked={preferences.criticalFindingsFlagged}
              onCheckedChange={(v) =>
                setPreferences((p) => ({ ...p, criticalFindingsFlagged: v }))
              }
            />
            <ToggleRow
              label={t('notifications.eventSystem')}
              description={t('notifications.eventSystemDesc')}
              checked={preferences.systemAlerts}
              onCheckedChange={(v) => setPreferences((p) => ({ ...p, systemAlerts: v }))}
            />
          </div>
        </div>
      )}

      {/* Quiet hours */}
      {enabled && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-5">
          <h4 className="text-[13px] font-semibold text-[var(--color-text)] mb-1">
            {t('notifications.quietHoursTitle')}
          </h4>
          <p className="text-[12px] text-[var(--color-text-muted)] mb-4">
            {t('notifications.quietHoursDescription')}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-text)] mb-1">
                {t('notifications.quietStart')}
              </label>
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-text)] mb-1">
                {t('notifications.quietEnd')}
              </label>
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-[var(--color-text)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
            <span className="text-[13px] text-[var(--color-text)]">
              {t('notifications.respectFridays')}
            </span>
            <Toggle checked={skipFridays} onChange={setSkipFridays} />
          </div>

          <button
            type="button"
            onClick={() => void savePreferences()}
            disabled={prefLoading}
            className="mt-4 w-full px-4 py-2 text-[13px] font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {prefLoading ? '…' : t('notifications.savePreferences')}
          </button>
        </div>
      )}
    </div>
  );
}
