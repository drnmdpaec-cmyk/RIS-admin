import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enGB } from 'date-fns/locale';

interface Props {
  dataUpdatedAt: number;
  isFetching: boolean;
  onManualRefresh?: () => void;
}

export function LastRefreshedIndicator({ dataUpdatedAt, isFetching, onManualRefresh }: Props) {
  const { t, i18n } = useTranslation('common');
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const locale = i18n.language === 'ar' ? ar : enGB;
  const relative = dataUpdatedAt > 0
    ? formatDistanceToNow(dataUpdatedAt, { addSuffix: true, locale })
    : '—';

  return (
    <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
      <span>
        {t('lastUpdated')}: {relative}
      </span>
      {onManualRefresh && (
        <button
          type="button"
          onClick={onManualRefresh}
          disabled={isFetching}
          className="hover:text-[var(--color-text)] disabled:opacity-40 transition-colors"
          aria-label={t('refreshNow')}
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
}
