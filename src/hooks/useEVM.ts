'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import type { EVMDataPoint } from '@/types/evm';

export function useEVM(projectId: string | undefined) {
  return useQuery<EVMDataPoint[]>({
    queryKey: ['evm', projectId],
    queryFn: () => apiGet<EVMDataPoint[]>(`/evm/${projectId}`),
    enabled: !!projectId,
  });
}

interface CreateEVMPointInput {
  month: string;
  monthThai: string;
  pv: number;
  ev: number;
  ac?: number;
  paidToDate?: number;
}

export function useCreateEVMPoint(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<EVMDataPoint, Error, CreateEVMPointInput>({
    mutationFn: (payload) => apiPost<EVMDataPoint>(`/evm/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['evm', projectId] });
    },
  });
}

export function useDeleteEVMPoint(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, Error, { id: string }>({
    mutationFn: ({ id }) => apiDelete<{ id: string }>(`/evm/${projectId}`, { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['evm', projectId] });
    },
  });
}
