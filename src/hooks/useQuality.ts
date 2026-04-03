'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { QualityGate, InspectionsData, InspectionRecord, WorkflowStatus } from '@/types/quality';

export function useQualityGates(projectId: string | undefined) {
  return useQuery<QualityGate[]>({
    queryKey: ['qualityGates', projectId],
    queryFn: () => apiGet<QualityGate[]>(`/quality/gates/${projectId}`),
    enabled: !!projectId,
  });
}

export function useITPItems(projectId: string | undefined) {
  const params = projectId ? `?projectId=${projectId}` : '';

  return useQuery<InspectionsData>({
    queryKey: ['inspections', projectId],
    queryFn: () => apiGet<InspectionsData>(`/quality/inspections${params}`),
    enabled: !!projectId,
  });
}

export function useInspection(id: string | undefined) {
  return useQuery<InspectionRecord | undefined>({
    queryKey: ['inspection', id],
    queryFn: async () => {
      const data = await apiGet<InspectionsData>('/quality/inspections');
      return data.inspectionRecords.find((r) => r.id === id);
    },
    enabled: !!id,
  });
}

interface CreateInspectionInput {
  projectId: string;
  itpId: string;
  title: string;
  date: string;
  time: string;
  inspectors: string[];
  wbsLink: string;
  standards: string[];
  overallResult: 'pass' | 'conditional';
  failReason?: string;
}

export function useCreateInspection(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<InspectionRecord, Error, CreateInspectionInput>({
    mutationFn: (payload) => apiPost<InspectionRecord>('/quality/inspections', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspections', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['inspection'] });
      void queryClient.invalidateQueries({ queryKey: ['qualityGates', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['issues', projectId] });
    },
  });
}

export function useResolveChecklistItem(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<InspectionRecord, Error, { id: string; checklistItemId: string }>({
    mutationFn: (payload) =>
      apiPatch<InspectionRecord>('/quality/inspections', {
        id: payload.id,
        checklistItemId: payload.checklistItemId,
        resolveAsPass: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspections', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['inspection'] });
      void queryClient.invalidateQueries({ queryKey: ['issues', projectId] });
    },
  });
}

export function useUpdateInspectionStatus(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<InspectionRecord, Error, { id: string; workflowStatus: WorkflowStatus }>({
    mutationFn: (payload) => apiPatch<InspectionRecord>('/quality/inspections', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspections', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['inspection'] });
    },
  });
}

export function useDeleteInspection(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, Error, { id: string }>({
    mutationFn: ({ id }) => apiDelete<{ id: string }>('/quality/inspections', { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inspections', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['inspection'] });
      void queryClient.invalidateQueries({ queryKey: ['qualityGates', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['issues', projectId] });
    },
  });
}
