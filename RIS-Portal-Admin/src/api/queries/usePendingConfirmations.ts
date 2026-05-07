import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { Appointment } from '@/types/appointment';

export interface AppointmentFilters {
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
  scan_type?: string;
  search?: string;
}

export interface PaginatedAppointments {
  items: Appointment[];
  total: number;
  page: number;
  page_size: number;
}

export function usePendingConfirmations(filters: AppointmentFilters = {}) {
  return useQuery<PaginatedAppointments>({
    queryKey: ['admin-pending-confirmations', filters],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedAppointments>(ENDPOINTS.APPOINTMENTS_PENDING, {
        params: filters,
      });
      return res.data;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}
