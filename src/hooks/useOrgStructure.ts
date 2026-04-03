'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { OrgUnit } from '@/types/admin';

export function useOrgStructure() {
  return useQuery<OrgUnit[]>({
    queryKey: ['org-structure'],
    queryFn: () => apiGet<OrgUnit[]>('/org-structure'),
  });
}

export function useCreateOrgUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<OrgUnit, 'id' | 'userCount'>) =>
      apiPost('/org-structure', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['org-structure'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useUpdateOrgUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      id: string;
      updates: Partial<Omit<OrgUnit, 'id' | 'userCount'>>;
    }) => apiPatch('/org-structure', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['org-structure'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useDeleteOrgUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { id: string }) => apiDelete('/org-structure', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['org-structure'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
