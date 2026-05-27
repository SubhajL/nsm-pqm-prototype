'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { OrgUnit, OrgUnitWithUserCount } from '@/types/admin';

/**
 * Distributive `Omit` — when applied to a discriminated union, this preserves
 * each branch separately instead of collapsing them into a single object
 * type that drops branch-specific fields like `constructionTier`.
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/**
 * PR-17: the GET response returns `OrgUnitWithUserCount` — the canonical
 * RidOrgUnit shape plus a derived `userCount` (not persisted on the unit).
 */
export function useOrgStructure() {
  return useQuery<OrgUnitWithUserCount[]>({
    queryKey: ['org-structure'],
    queryFn: () => apiGet<OrgUnitWithUserCount[]>('/org-structure'),
  });
}

export function useCreateOrgUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DistributiveOmit<OrgUnit, 'id'>) =>
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
      updates: Partial<DistributiveOmit<OrgUnit, 'id'>>;
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
