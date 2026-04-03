'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

export interface EvaluationCategory {
  name: string;
  nameEn: string;
  score: number;
  note: string;
}

export interface EvaluationData {
  projectId: string;
  projectName: string;
  overallScore: number;
  maxScore: number;
  level: string;
  percentage: number;
  evaluatedBy: string;
  evaluatedAt: string;
  categories: EvaluationCategory[];
  recommendation: string;
}

export function useEvaluation(projectId: string | undefined) {
  return useQuery<EvaluationData>({
    queryKey: ['evaluation', projectId],
    queryFn: () => apiGet<EvaluationData>(`/evaluation/${projectId}`),
    enabled: !!projectId,
  });
}
