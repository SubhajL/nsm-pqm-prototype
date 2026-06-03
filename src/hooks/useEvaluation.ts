'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api-client';
import type { EvaluationCategory, ProjectEvaluation } from '@/types/evaluation';
import type { UpsertEvaluationRequest } from '@/types/evaluation.schema';

// Canonical types now live in `@/types/evaluation`; re-export for existing
// consumers that import them from this hook.
export type { EvaluationCategory, ProjectEvaluation };
/** @deprecated use `ProjectEvaluation`. Retained for back-compat. */
export type EvaluationData = ProjectEvaluation;

export function useEvaluation(projectId: string | undefined) {
  return useQuery<ProjectEvaluation>({
    queryKey: ['evaluation', projectId],
    queryFn: () => apiGet<ProjectEvaluation>(`/evaluation/${projectId}`),
    enabled: !!projectId,
  });
}

/** Create or update the canonical evaluation for a project. */
export function useUpsertEvaluation(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<ProjectEvaluation, Error, UpsertEvaluationRequest>({
    mutationFn: (payload) =>
      apiPost<ProjectEvaluation>(`/evaluation/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['evaluation', projectId] });
    },
  });
}
