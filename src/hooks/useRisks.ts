'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
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

/** PR-L — full-edit PATCH (server recomputes score/level when L/I change). */
export function useUpdateRisk(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    Risk,
    Error,
    {
      id: string;
      title?: string;
      description?: string;
      likelihood?: number;
      impact?: number;
      status?: Risk['status'];
      owner?: string;
      mitigation?: string;
    }
  >({
    mutationFn: (payload) => apiPatch<Risk>(`/risks/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

/** PR-L — DELETE a risk. Auto-mitigation issues are intentionally not cascaded. */
export function useDeleteRisk(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<Risk, Error, { id: string }>({
    mutationFn: (payload) => apiDelete<Risk>(`/risks/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

/** PR-L — shortcut: PATCH `{ id, status: 'closed' }`. */
export function useCloseRisk(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<Risk, Error, { id: string }>({
    mutationFn: (payload) =>
      apiPatch<Risk>(`/risks/${projectId}`, { ...payload, status: 'closed' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
