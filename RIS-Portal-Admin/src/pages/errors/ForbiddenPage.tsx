import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldX } from 'lucide-react';
import { PATIENT_PORTAL_URL } from '@/lib/constants';

export function ForbiddenPage() {
  const { t } = useTranslation('errors');
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center gap-4 bg-[var(--color-bg)]">
      <ShieldX size={48} className="text-danger-500" />
      <h1 className="text-xl font-semibold">{t('forbidden')}</h1>
      <p className="text-[var(--color-text-muted)] max-w-sm">{t('forbiddenDescription')}</p>
      <p className="text-[13px] text-[var(--color-text-muted)]">
        Patient or doctor?{' '}
        <a href={PATIENT_PORTAL_URL} className="text-primary-600 underline">
          {PATIENT_PORTAL_URL}
        </a>
      </p>
      <Link
        to="/login"
        className="px-4 py-2 bg-primary-600 text-white rounded-md text-[13px] hover:bg-primary-700 transition-colors"
      >
        Sign in with a different account
      </Link>
    </div>
  );
}
