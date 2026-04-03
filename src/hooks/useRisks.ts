'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import type { Risk } from '@/types/risk';

export function useRisks(projectId: string | undefined, filters?: { status?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);

  const queryString = params.toString();
  const path = queryString
    ? `/risks/${projectId}?${queryString}`
    : `/risks/${projectId}`;

  return useQuery<Risk[]>({
    queryKey: ['risks', projectId, filters],
    queryFn: () => apiGet<Risk[]>(path),
    enabled: !!projectId,
  });
}

export function useCreateRisk(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<Risk, Error, Partial<Risk>>({
    mutationFn: (payload) => apiPost<Risk>(`/risks/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['issues', projectId] });
    },
  });
}
