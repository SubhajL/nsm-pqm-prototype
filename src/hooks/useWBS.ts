'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';

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
