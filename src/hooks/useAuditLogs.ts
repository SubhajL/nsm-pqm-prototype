'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { AuditLog } from '@/types/admin';

export function useAuditLogs(filters?: {
  module?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.module) params.set('module', filters.module);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);

  const queryString = params.toString();
  const path = queryString ? `/audit-logs?${queryString}` : '/audit-logs';

  return useQuery<AuditLog[]>({
    queryKey: ['audit-logs', filters],
    queryFn: () => apiGet<AuditLog[]>(path),
  });
}
