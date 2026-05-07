import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  Inbox,
  AlertTriangle,
} from 'lucide-react';
import { cn, maskName } from '@/lib/utils';
import { useOperationsDashboard } from '@/api/queries/useOperations';
import { LastRefreshedIndicator } from '@/components/shared/LastRefreshedIndicator';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'text-primary-600 bg-primary-50',
  PENDING: 'text-warning-700 bg-warning-50',
  IN_PROGRESS: 'text-accent-700 bg-accent-50',
  COMPLETED: 'text-neutral-600 bg-neutral-100',
  CANCELLED: 'text-danger-600 bg-danger-50',
};

function useHighlightOnIncrease(count: number) {
  const prevCount = useRef(count);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (count > prevCount.current) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 2000);
      prevCount.current = count;
      return () => clearTimeout(timer);
    }
    prevCount.current = count;
  }, [count]);

  return highlight;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  href,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      to={href}
      className={cn(
        'bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4 flex items-start gap-3 hover:border-primary-300 transition-all cursor-pointer',
        highlight && 'ring-2 ring-primary-500 shadow-lg'
      )}
    >
      <div className={cn('p-2 rounded-lg', color)}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
        <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{label}</p>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { t } = useTranslation(['operations', 'appointments', 'reports', 'common']);
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  const { data, isLoading, isFetching, dataUpdatedAt, refetch } = useOperationsDashboard();

  const pendingHighlight = useHighlightOnIncrease(data?.pending_confirmation_count ?? 0);
  const criticalHighlight = useHighlightOnIncrease(data?.critical_findings_count ?? 0);
  const deliveryHighlight = useHighlightOnIncrease(data?.awaiting_delivery_count ?? 0);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-[var(--color-text)]">
            {t('operations:dashboard')}
          </h1>
          <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{today}</p>
        </div>
        <LastRefreshedIndicator
          dataUpdatedAt={dataUpdatedAt}
          isFetching={isFetching}
          onManualRefresh={() => void refetch()}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-20 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            icon={Calendar}
            label={t('operations:todayAppointments')}
            value={data?.today_appointment_count ?? 0}
            color="text-primary-700 bg-primary-100"
            href="/appointments"
          />
          <KpiCard
            icon={CheckCircle2}
            label={t('operations:pendingConfirmations')}
            value={data?.pending_confirmation_count ?? 0}
            color="text-warning-700 bg-warning-100"
            href="/appointments/pending"
            highlight={pendingHighlight}
          />
          <KpiCard
            icon={Inbox}
            label={t('operations:awaitingDelivery')}
            value={data?.awaiting_delivery_count ?? 0}
            color="text-accent-700 bg-accent-100"
            href="/reports/pending"
            highlight={deliveryHighlight}
          />
          <KpiCard
            icon={AlertTriangle}
            label={t('operations:criticalFindings')}
            value={data?.critical_findings_count ?? 0}
            color="text-danger-700 bg-danger-100"
            href="/reports"
            highlight={criticalHighlight}
          />
        </div>
      )}

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-[13px] font-semibold text-[var(--color-text)]">
            {t('operations:todaySchedule')}
          </h2>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-8 bg-[var(--color-border)] rounded animate-pulse" />
            ))}
          </div>
        ) : !data?.today_appointments?.length ? (
          <div className="p-8 text-center text-[var(--color-text-muted)] text-[13px]">
            No appointments scheduled for today
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <th className="px-4 py-2 text-start text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Time
                </th>
                <th className="px-4 py-2 text-start text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Patient
                </th>
                <th className="px-4 py-2 text-start text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Scan Type
                </th>
                <th className="px-4 py-2 text-start text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.today_appointments.map((appt) => (
                <tr
                  key={appt.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] cursor-pointer"
                >
                  <td className="px-4 py-2.5 font-mono text-[12px]">
                    {format(new Date(appt.scheduled_at), 'HH:mm')}
                  </td>
                  {/* PHI masked by default — HIPAA 45 CFR §164.502(a) */}
                  <td className="px-4 py-2.5 font-mono text-[12px]">{maskName(appt.patient_name)}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{appt.scan_type}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[11px] font-medium',
                        STATUS_COLORS[appt.status] ?? 'text-neutral-600 bg-neutral-100'
                      )}
                    >
                      {appt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
