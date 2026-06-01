'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type {
  GanttData,
  GanttLink,
  GanttLinkType,
  GanttTask,
  GanttTaskInput,
} from '@/types/gantt';

export type { GanttData, GanttLink, GanttTask, GanttTaskInput } from '@/types/gantt';

export function useGantt(projectId: string | undefined) {
  return useQuery<GanttData>({
    queryKey: ['gantt', projectId],
    queryFn: () => apiGet<GanttData>(`/gantt/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateGanttTask(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<GanttTask, Error, GanttTaskInput>({
    mutationFn: (payload) => apiPost<GanttTask>(`/gantt/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['wbs', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateGanttTask(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<GanttTask, Error, { id: number } & GanttTaskInput>({
    mutationFn: (payload) => apiPatch<GanttTask>(`/gantt/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['wbs', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteGanttTask(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<{ id: number }, Error, { id: number }>({
    mutationFn: ({ id }) => apiDelete<{ id: number }>(`/gantt/${projectId}`, { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['wbs', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// PR-3.5 — Dedicated dependency CRUD hooks. The new dependency UI uses
// these instead of the task-edit form's `predecessors[]` array, so a
// dependency can be added/edited/removed without re-validating the
// entire task body.

export function useCreateGanttDependency(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    GanttLink,
    Error,
    { predecessorId: number; successorId: number; type?: GanttLinkType; lagDays?: number }
  >({
    mutationFn: (payload) =>
      apiPost<GanttLink>(`/gantt-dependencies/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useUpdateGanttDependency(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    GanttLink,
    Error,
    { id: number; type?: GanttLinkType; lagDays?: number }
  >({
    mutationFn: (payload) =>
      apiPatch<GanttLink>(`/gantt-dependencies/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useDeleteGanttDependency(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<GanttLink, Error, { id: number }>({
    mutationFn: ({ id }) =>
      apiDelete<GanttLink>(`/gantt-dependencies/${projectId}`, { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
