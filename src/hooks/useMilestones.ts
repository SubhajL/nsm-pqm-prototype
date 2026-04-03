'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { Milestone } from '@/types/project';

export function useMilestones(projectId: string | undefined) {
  return useQuery<Milestone[]>({
    queryKey: ['milestones', projectId],
    queryFn: () => apiGet<Milestone[]>(`/milestones/${projectId}`),
    enabled: !!projectId,
  });
}
