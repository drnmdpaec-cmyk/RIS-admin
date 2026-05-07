import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { isAdminUserType } from '@/lib/security';
import { PATIENT_PORTAL_URL } from '@/lib/constants';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import type { User } from '@/types/user';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember_device: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

interface LoginResponse {
  requires_mfa: boolean;
  challenge_token?: string;
  user?: User;
  access_token?: string;
}

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await apiClient.post<LoginResponse>(ENDPOINTS.LOGIN, data);
      const { requires_mfa, challenge_token, user, access_token } = res.data;

      if (requires_mfa && challenge_token) {
        navigate('/mfa', { state: { challenge_token } });
        return;
      }

      if (user && access_token) {
        if (!isAdminUserType(user.user_type)) {
          navigate('/forbidden', { replace: true });
          return;
        }
        setAuth(user, access_token);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('auth:invalidCredentials')));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-primary-50 dark:from-neutral-950 dark:to-neutral-900 px-4">
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[380px]">
        <div className="bg-[var(--color-card)] rounded-xl shadow-lg border border-[var(--color-border)] p-8">
          <div className="text-center mb-7">
            <div className="inline-flex w-12 h-12 rounded-xl bg-primary-100 items-center justify-center mb-3">
              <span className="text-primary-700 font-bold text-lg">NM</span>
            </div>
            <h1 className="text-lg font-semibold text-[var(--color-text)]">Admin Portal</h1>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-1">Nuclear Medicine Department</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-text)] mb-1">
                {t('auth:email')}
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="w-full px-3 py-2 text-[13px] border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400"
                placeholder="you@hospital.com"
              />
              {errors.email && (
                <p className="text-[11px] text-danger-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--color-text)] mb-1">
                {t('auth:password')}
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 pe-10 text-[13px] border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-danger-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                {...register('remember_device')}
                id="remember-device"
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-[var(--color-border)] text-primary-600"
              />
              <label
                htmlFor="remember-device"
                className="text-[12px] text-[var(--color-text-muted)] cursor-pointer"
              >
                {t('auth:rememberDevice')}
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-[13px] font-medium rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {t('auth:signIn')}
            </button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <Link
              to="/forgot-password"
              className="text-[12px] text-primary-600 hover:text-primary-700"
            >
              {t('auth:forgotPassword')}
            </Link>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {t('auth:patientDoctorLink', { url: PATIENT_PORTAL_URL })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
