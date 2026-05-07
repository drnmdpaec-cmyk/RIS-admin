import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { Appointment } from '@/types/appointment';

export function useTodaySchedule() {
  return useQuery<Appointment[]>({
    queryKey: ['admin-today-schedule'],
    queryFn: async () => {
      const res = await apiClient.get<Appointment[]>(ENDPOINTS.APPOINTMENTS_TODAY);
      return res.data;
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
