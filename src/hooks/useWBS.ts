'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

export interface WBSNode {
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  name: string;
  weight: number;
  progress: number;
  level: number;
  hasBOQ: boolean;
}

export interface CreateWBSNodeInput {
  name: string;
  parentId?: string | null;
}

export function useWBS(projectId: string | undefined) {
  return useQuery<WBSNode[]>({
    queryKey: ['wbs', projectId],
    queryFn: () => apiGet<WBSNode[]>(`/wbs/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateWBSNode(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<WBSNode, Error, CreateWBSNodeInput>({
    mutationFn: (payload) => apiPost<WBSNode>(`/wbs/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wbs', projectId] });
    },
  });
}

/** PR-C2 — edit a WBS node (name, weight, progress). */
export function useUpdateWBSNode(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    WBSNode,
    Error,
    { id: string; name?: string; weight?: number; progress?: number }
  >({
    mutationFn: (payload) => apiPatch<WBSNode>(`/wbs/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wbs', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

/** PR-C2 — delete a WBS node (cascades to descendants + BOQ rows). */
export function useDeleteWBSNode(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<WBSNode, Error, { id: string }>({
    mutationFn: (payload) => apiDelete<WBSNode>(`/wbs/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wbs', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['boq'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
