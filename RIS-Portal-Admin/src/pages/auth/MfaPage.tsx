import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { isAdminUserType } from '@/lib/security';
import type { User } from '@/types/user';

interface MfaResponse {
  user: User;
  access_token: string;
}

interface LocationState {
  challenge_token?: string;
}

const DIGIT_COUNT = 6;

export function MfaPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const challengeToken = (location.state as LocationState)?.challenge_token ?? '';

  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect immediately if there is no challenge token — user navigated here directly.
  useEffect(() => {
    if (!challengeToken) {
      navigate('/login', { replace: true });
    }
  }, [challengeToken, navigate]);

  useEffect(() => {
    if (!isBackupMode) inputRefs.current[0]?.focus();
  }, [isBackupMode]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    // Renamed from `t` to avoid shadowing the i18n `t` function
    const timerId = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timerId);
  }, [resendCountdown]);

  const handlePostAuth = (user: User, access_token: string) => {
    if (!isAdminUserType(user.user_type)) {
      navigate('/forbidden', { replace: true });
      return;
    }
    setAuth(user, access_token);
    navigate('/dashboard', { replace: true });
  };

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d) && next.join('').length === DIGIT_COUNT) {
      void submitCode(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Paste handler: accept pasted OTP codes (e.g. from email)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    if (!pasted) return;
    const next = [...Array(DIGIT_COUNT).fill('')];
    [...pasted].forEach((char, i) => { next[i] = char; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, DIGIT_COUNT - 1)]?.focus();
    if (pasted.length === DIGIT_COUNT) void submitCode(pasted);
  };

  const submitCode = async (code: string) => {
    setLoading(true);
    try {
      const res = await apiClient.post<MfaResponse>(ENDPOINTS.MFA_VERIFY, {
        challenge_token: challengeToken,
        code,
      });
      handlePostAuth(res.data.user, res.data.access_token);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('mfaFailed', { remaining: '?' })));
      setDigits(Array(DIGIT_COUNT).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const submitBackupCode = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post<MfaResponse>(ENDPOINTS.MFA_BACKUP, {
        challenge_token: challengeToken,
        backup_code: backupCode,
      });
      // Apply the same user-type guard as the TOTP path (21 CFR Part 11 §11.2(a))
      handlePostAuth(res.data.user, res.data.access_token);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Invalid backup code'));
    } finally {
      setLoading(false);
    }
  };

  const sendEmailOtp = async () => {
    try {
      await apiClient.post(ENDPOINTS.MFA_EMAIL_OTP, { challenge_token: challengeToken });
      setResendCountdown(60);
      toast.success('Code sent to your email');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to send code'));
    }
  };

  if (!challengeToken) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-primary-50 dark:from-neutral-950 dark:to-neutral-900 px-4">
      <div className="w-full max-w-[380px]">
        <div className="bg-[var(--color-card)] rounded-xl shadow-lg border border-[var(--color-border)] p-8 text-center">
          <h1 className="text-lg font-semibold mb-1">{t('mfaTitle')}</h1>
          <p className="text-[12px] text-[var(--color-text-muted)] mb-6">{t('mfaDescription')}</p>

          {!isBackupMode ? (
            <>
              <div className="flex gap-2 justify-center mb-5" role="group" aria-label="MFA code input">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    autoComplete="one-time-code"
                    aria-label={`Digit ${i + 1} of ${DIGIT_COUNT}`}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    disabled={loading}
                    className="w-10 h-12 text-center font-mono border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-primary-400"
                    style={{ fontSize: '18px' }}
                  />
                ))}
              </div>

              {loading && (
                <div className="flex justify-center mb-4">
                  <Loader2 size={20} className="animate-spin text-primary-600" />
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => setIsBackupMode(true)}
                  className="text-[12px] text-primary-600 hover:underline block w-full"
                >
                  {t('useBackupCode')}
                </button>
                <button
                  onClick={() => void sendEmailOtp()}
                  disabled={resendCountdown > 0}
                  className="text-[12px] text-primary-600 hover:underline disabled:text-[var(--color-text-muted)] disabled:no-underline block w-full"
                >
                  {resendCountdown > 0
                    ? t('resendIn', { seconds: resendCountdown })
                    : t('sendEmailCode')}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-warning-50 border border-warning-200 rounded-md text-start">
                <AlertTriangle size={14} className="text-warning-600 mt-0.5 shrink-0" />
                <p className="text-[12px] text-warning-700">
                  Backup codes are single-use. It will be invalidated after use.
                </p>
              </div>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                placeholder="Enter backup code"
                autoComplete="off"
                className="w-full px-3 py-2 text-[13px] border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] font-mono focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
              <button
                onClick={() => void submitBackupCode()}
                disabled={loading || !backupCode.trim()}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-[13px] font-medium rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {t('verifyCode')}
              </button>
              <button
                onClick={() => setIsBackupMode(false)}
                className="text-[12px] text-primary-600 hover:underline block w-full"
              >
                Use authenticator app instead
              </button>
            </div>
          )}

          <Link
            to="/login"
            className="mt-5 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] block"
          >
            ← {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
