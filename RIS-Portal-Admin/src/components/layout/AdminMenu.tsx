import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { isSubscribed } from '@/services/pushNotifications';

export function AdminMenu() {
  const { user, logout } = useAuth();
  const { t } = useTranslation('settings');
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void isSubscribed().then(setPushEnabled);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const initials = user.full_name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('');

  const snoozeFor = (minutes: number) => async () => {
    try {
      await apiClient.post(ENDPOINTS.PREFERENCES_SNOOZE, { duration_minutes: minutes });
      toast.success(t('notifications.snoozeConfirm', { minutes }));
    } catch {
      toast.error(t('notifications.snoozeError'));
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--color-border)] transition-colors"
      >
        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-[11px] font-bold flex items-center justify-center">
          {initials}
        </span>
        <span className="text-[13px] text-[var(--color-text)] max-w-[120px] truncate">
          {user.full_name}
        </span>
        <ChevronDown size={13} className="text-[var(--color-text-muted)]" />
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-1 w-52 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-1">
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <p className="text-[12px] font-medium text-[var(--color-text)]">{user.full_name}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">{user.email}</p>
          </div>

          {pushEnabled && (
            <>
              <button
                type="button"
                onClick={() => void snoozeFor(60)()}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
              >
                <BellOff size={13} className="text-[var(--color-text-muted)]" />
                {t('notifications.snoozeOneHour')}
              </button>
              <button
                type="button"
                onClick={() => void snoozeFor(240)()}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors border-b border-[var(--color-border)]"
              >
                <BellOff size={13} className="text-[var(--color-text-muted)]" />
                {t('notifications.snoozeFourHours')}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => void logout()}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-danger-600 hover:bg-danger-50 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
