import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

const schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await apiClient.post(ENDPOINTS.FORGOT_PASSWORD, data);
    } catch {
      toast.error('Failed to send reset link. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-primary-50 dark:from-neutral-950 dark:to-neutral-900 px-4">
      <div className="w-full max-w-[380px]">
        <div className="bg-[var(--color-card)] rounded-xl shadow-lg border border-[var(--color-border)] p-8">
          <h1 className="text-lg font-semibold mb-1">{t('forgotPasswordTitle')}</h1>
          <p className="text-[12px] text-[var(--color-text-muted)] mb-6">
            {t('forgotPasswordDescription')}
          </p>

          {isSubmitSuccessful ? (
            <p className="text-[13px] text-accent-700 bg-accent-50 px-3 py-2 rounded-md">
              If an account exists for that email, a reset link has been sent.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="block text-[12px] font-medium text-[var(--color-text)] mb-1">
                  {t('email')}
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="w-full px-3 py-2 text-[13px] border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
                {errors.email && (
                  <p className="text-[11px] text-danger-600 mt-1">{errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-[13px] font-medium rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                {t('sendResetLink')}
              </button>
            </form>
          )}

          <Link
            to="/login"
            className="mt-4 text-[12px] text-primary-600 hover:underline block text-center"
          >
            ← {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
