'use client';

import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PmqaScore } from '@/lib/pmqa/pmqa-types';

/**
 * PR-28 — Fetches the rolled-up PMQA score for the current user's
 * visible portfolio. Pass `projectId` to scope to a single project.
 */
export function usePmqa(options?: { projectId?: string }) {
  const authReady = useAuthStore((s) => s.authReady);
  const currentUserId = useAuthStore((s) => s.currentUser?.id ?? 'anonymous');
  const projectId = options?.projectId;

  const path = projectId
    ? `/pmqa?projectId=${encodeURIComponent(projectId)}`
    : '/pmqa';

  const query = useQuery<PmqaScore>({
    queryKey: ['pmqa', currentUserId, projectId ?? null],
    queryFn: () => apiGet<PmqaScore>(path),
    enabled: authReady,
  });

  return {
    ...query,
    isLoading: !authReady || query.isLoading,
  };
}
