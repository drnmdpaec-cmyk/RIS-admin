import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

interface UnreadCounts {
  pending_confirmations: number;
  reports_awaiting_delivery: number;
  critical_findings_pending: number;
  unread_messages: number;
}

const BASE_TITLE = 'Admin Portal — Nuclear Medicine';

export function useTabTitleBadge(): UnreadCounts | undefined {
  const { data } = useQuery<UnreadCounts>({
    queryKey: ['admin-unread-counts'],
    queryFn: async () => {
      const res = await apiClient.get<UnreadCounts>(ENDPOINTS.UNREAD_COUNTS);
      return res.data;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    staleTime: 15_000,
  });

  useEffect(() => {
    const critical = data?.critical_findings_pending ?? 0;
    const pending = data?.pending_confirmations ?? 0;
    const reports = data?.reports_awaiting_delivery ?? 0;
    const messages = data?.unread_messages ?? 0;
    const total = critical + pending + reports + messages;

    if (total > 0) {
      const prefix = critical > 0 ? `\u{1F534} (${total})` : `(${total})`;
      document.title = `${prefix} ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    return () => {
      document.title = BASE_TITLE;
    };
  }, [data]);

  return data;
}
