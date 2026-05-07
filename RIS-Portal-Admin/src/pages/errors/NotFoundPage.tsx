import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation('errors');
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <p className="text-7xl font-bold text-[var(--color-border)]">404</p>
      <h1 className="text-xl font-semibold">{t('notFound')}</h1>
      <p className="text-[var(--color-text-muted)]">{t('notFoundDescription')}</p>
      <Link
        to="/dashboard"
        className="px-4 py-2 bg-primary-600 text-white rounded-md text-[13px] hover:bg-primary-700 transition-colors"
      >
        {t('goHome')}
      </Link>
    </div>
  );
}
