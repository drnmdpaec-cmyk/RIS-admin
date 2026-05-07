import { useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

export function ErrorPage() {
  const { t } = useTranslation('errors');
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center gap-4 bg-[var(--color-bg)]">
      <AlertTriangle size={48} className="text-warning-500" />
      <h1 className="text-xl font-semibold">{t('serverError')}</h1>
      <p className="text-[var(--color-text-muted)] max-w-sm text-sm font-mono">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary-600 text-white rounded-md text-[13px] hover:bg-primary-700 transition-colors"
      >
        {t('tryAgain')}
      </button>
    </div>
  );
}
