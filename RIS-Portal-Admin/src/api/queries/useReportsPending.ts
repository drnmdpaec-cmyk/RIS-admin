import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { Report } from '@/types/report';

export interface ReportFilters {
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
  is_critical?: boolean;
  search?: string;
}

export interface PaginatedReports {
  items: Report[];
  total: number;
  page: number;
  page_size: number;
}

export function useReportsPendingDelivery(filters: ReportFilters = {}) {
  return useQuery<PaginatedReports>({
    queryKey: ['admin-reports-pending', filters],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedReports>(ENDPOINTS.REPORTS_PENDING, { params: filters });
      return res.data;
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
