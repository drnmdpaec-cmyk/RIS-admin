import { useEffect, useRef } from 'react';
import { INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS } from '@/lib/constants';

interface UseIdleTimerOptions {
  onIdle: () => void;
  onWarning?: () => void;
  enabled?: boolean;
}

// Excluded: 'visibilitychange' — tab-switching must NOT reset the idle clock.
// Resetting on visibility would allow a user to bypass the 15-minute auto-logout
// by simply switching tabs, violating HIPAA 45 CFR §164.312(a)(2)(i).
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function useIdleTimer({ onIdle, onWarning, enabled = true }: UseIdleTimerOptions) {
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store callbacks in refs so the reset function never needs to change,
  // preventing the infinite-rerender loop that arises from inline callbacks.
  const onIdleRef = useRef(onIdle);
  const onWarningRef = useRef(onWarning);
  onIdleRef.current = onIdle;
  onWarningRef.current = onWarning;

  useEffect(() => {
    if (!enabled) return;

    function reset() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);

      const warnDelay = INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS;
      if (warnDelay > 0 && onWarningRef.current) {
        warnTimer.current = setTimeout(() => onWarningRef.current?.(), warnDelay);
      }
      idleTimer.current = setTimeout(() => onIdleRef.current(), INACTIVITY_TIMEOUT_MS);
    }

    reset();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled]);
}
