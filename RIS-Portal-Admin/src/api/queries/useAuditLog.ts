import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { AuditLog } from '@/types/audit';

export interface AuditFilters {
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
  user_id?: string;
  action?: string;
  resource_type?: string;
  result?: 'SUCCESS' | 'FAILURE';
  search?: string;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

// Audit log must NOT auto-refresh — admins are actively investigating,
// data shifting mid-review would be disorienting and could cause errors.
export function useAuditLog(filters: AuditFilters = {}) {
  return useQuery<PaginatedAuditLogs>({
    queryKey: ['admin-audit-log', filters],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedAuditLogs>(ENDPOINTS.AUDIT_LOGS, { params: filters });
      return res.data;
    },
    refetchInterval: false,
    staleTime: 5 * 60_000,
  });
}
