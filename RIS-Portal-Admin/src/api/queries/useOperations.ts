import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

export interface OperationsDashboard {
  today_appointment_count: number;
  pending_confirmation_count: number;
  awaiting_delivery_count: number;
  critical_findings_count: number;
  today_appointments: {
    id: string;
    patient_name: string;
    scan_type: string;
    scheduled_at: string;
    status: string;
  }[];
  load_next_7_days: { date: string; count: number }[];
}

export function useOperationsDashboard() {
  return useQuery<OperationsDashboard>({
    queryKey: ['admin-operations-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<OperationsDashboard>(ENDPOINTS.DASHBOARD);
      return res.data;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}
