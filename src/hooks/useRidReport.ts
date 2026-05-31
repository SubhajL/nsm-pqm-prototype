'use client';

import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  RidReportData,
  RidReportKind,
} from '@/lib/rid/reporting/reporting-types';

/**
 * PR-29 — React Query hook for the `/api/reports` endpoint.
 *
 * The hook is `enabled` only when the auth store has hydrated AND the
 * caller's required query params for the chosen kind are present —
 * matches the imperative-fetch pattern in PR-28's `usePmqa()`.
 */
export interface UseRidReportOptions {
  projectId: string | null | undefined;
  kind: RidReportKind;
  periodStart?: string;
  periodEnd?: string;
  workPeriodId?: string;
  evaluationDate?: string;
  enabled?: boolean;
}

export function useRidReport(options: UseRidReportOptions) {
  const authReady = useAuthStore((s) => s.authReady);
  const currentUserId = useAuthStore((s) => s.currentUser?.id ?? 'anonymous');

  const params = new URLSearchParams();
  if (options.projectId) params.set('projectId', options.projectId);
  params.set('kind', options.kind);
  if (options.periodStart) params.set('periodStart', options.periodStart);
  if (options.periodEnd) params.set('periodEnd', options.periodEnd);
  if (options.workPeriodId) params.set('workPeriodId', options.workPeriodId);
  if (options.evaluationDate) params.set('evaluationDate', options.evaluationDate);

  const path = `/reports?${params.toString()}`;

  // Required-param gating per kind.
  const hasRequiredParams = (() => {
    if (!options.projectId) return false;
    if (options.kind === 'monthly') {
      return Boolean(options.periodStart && options.periodEnd);
    }
    if (options.kind === 'work_period') {
      return Boolean(options.workPeriodId);
    }
    return true;
  })();

  const query = useQuery<RidReportData>({
    queryKey: [
      'rid-report',
      currentUserId,
      options.projectId ?? null,
      options.kind,
      options.periodStart ?? null,
      options.periodEnd ?? null,
      options.workPeriodId ?? null,
      options.evaluationDate ?? null,
    ],
    queryFn: () => apiGet<RidReportData>(path),
    enabled: authReady && hasRequiredParams && options.enabled !== false,
  });

  return {
    ...query,
    isLoading: !authReady || query.isLoading,
  };
}
