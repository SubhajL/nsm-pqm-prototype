'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, apiPostForm } from '@/lib/api-client';
import type { DailyReport, DailyReportStatus } from '@/types/daily-report';

export function useDailyReports(projectId: string | undefined) {
  const path = projectId
    ? `/daily-reports?projectId=${projectId}`
    : '/daily-reports';

  return useQuery<DailyReport[]>({
    queryKey: ['dailyReports', projectId],
    queryFn: () => apiGet<DailyReport[]>(path),
    enabled: !!projectId,
  });
}

export function useDailyReport(id: string | undefined) {
  return useQuery<DailyReport>({
    queryKey: ['dailyReport', id],
    queryFn: () => apiGet<DailyReport>(`/daily-reports/${id}`),
    enabled: !!id,
  });
}

export function useCreateDailyReport() {
  const queryClient = useQueryClient();

  return useMutation<DailyReport, Error, Partial<DailyReport> | FormData>({
    mutationFn: (newReport) =>
      newReport instanceof FormData
        ? apiPostForm<DailyReport>('/daily-reports', newReport)
        : apiPost<DailyReport>('/daily-reports', newReport),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dailyReports', data.projectId] });
    },
  });
}

export function useUpdateDailyReportStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    DailyReport,
    Error,
    { id: string; status: DailyReportStatus; note?: string }
  >({
    mutationFn: ({ id, ...payload }) => apiPatch<DailyReport>(`/daily-reports/${id}`, payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['dailyReports', data.projectId] });
      void queryClient.invalidateQueries({ queryKey: ['dailyReport', data.id] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
