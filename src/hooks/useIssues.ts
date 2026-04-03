'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { Issue } from '@/types/risk';

export function useIssues(projectId: string | undefined, filters?: { status?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);

  const queryString = params.toString();
  const path = queryString
    ? `/issues/${projectId}?${queryString}`
    : `/issues/${projectId}`;

  return useQuery<Issue[]>({
    queryKey: ['issues', projectId, filters],
    queryFn: () => apiGet<Issue[]>(path),
    enabled: !!projectId,
  });
}

export function useUpdateIssueStatus(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<Issue, Error, { issueId: string; status: string }>({
    mutationFn: (payload) =>
      apiPatch<Issue>(`/issues/${projectId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', projectId] });
    },
  });
}

export function useCreateIssue(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<Issue, Error, Partial<Issue>>({
    mutationFn: (payload) => apiPost<Issue>(`/issues/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['issues', projectId] });
    },
  });
}
