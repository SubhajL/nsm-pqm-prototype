'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';

export interface BOQItem {
  id: string;
  wbsId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface CreateBOQItemInput {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export function useBOQ(wbsId: string | undefined) {
  return useQuery<BOQItem[]>({
    queryKey: ['boq', wbsId],
    queryFn: () => apiGet<BOQItem[]>(`/boq/${wbsId}`),
    enabled: !!wbsId,
  });
}

export function useCreateBOQItem(wbsId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<BOQItem, Error, CreateBOQItemInput>({
    mutationFn: (payload) => apiPost<BOQItem>(`/boq/${wbsId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['boq', wbsId] });
    },
  });
}
