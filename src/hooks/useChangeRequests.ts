'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { ChangeRequest } from '@/types/document';

export function useChangeRequests(projectId: string | undefined) {
  const path = projectId
    ? `/change-requests?projectId=${projectId}`
    : '/change-requests';

  return useQuery<ChangeRequest[]>({
    queryKey: ['changeRequests', projectId],
    queryFn: () => apiGet<ChangeRequest[]>(path),
    enabled: !!projectId,
  });
}

export function useCreateChangeRequest(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      title: string;
      reason: string;
      budgetImpact: number;
      scheduleImpact: number;
      linkedWbs: string;
      priority: ChangeRequest['priority'];
    }) =>
      apiPost('/change-requests', {
        projectId,
        ...payload,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['changeRequests', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useUpdateChangeRequestStatus(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { id: string; action: 'approve' | 'reject' | 'return' }) =>
      apiPatch('/change-requests', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['changeRequests', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
