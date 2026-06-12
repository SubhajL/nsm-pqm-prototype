'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { Dt6Area, KnowledgeAreaNote } from '@/types/knowledge-area-note';
import type { ItSprint } from '@/types/sprint';
import type {
  CreateItSprintRequest,
  UpdateItSprintRequest,
} from '@/types/sprint.schema';
import type { SowState, VendorSow } from '@/types/vendor-sow';
import type { CreateVendorSowRequest } from '@/types/vendor-sow.schema';

/* ── Vendor SOWs (สัญญาผู้ขาย) ────────────────────────────────────────── */

export function useVendorSows(projectId: string | undefined) {
  return useQuery<VendorSow[]>({
    queryKey: ['vendor-sows', projectId],
    queryFn: () => apiGet<VendorSow[]>(`/vendor-sows/by-project/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateVendorSow(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<VendorSow, Error, CreateVendorSowRequest>({
    mutationFn: (payload) =>
      apiPost<VendorSow>(`/vendor-sows/by-project/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vendor-sows', projectId] });
    },
  });
}

export function useTransitionVendorSow(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<VendorSow, Error, { sowId: string; targetState: SowState }>({
    mutationFn: ({ sowId, targetState }) =>
      apiPost<VendorSow>(`/vendor-sows/${sowId}/transition`, { targetState }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vendor-sows', projectId] });
    },
  });
}

/* ── IT sprints (สปรินต์) ─────────────────────────────────────────────── */

export function useItSprints(projectId: string | undefined) {
  return useQuery<ItSprint[]>({
    queryKey: ['it-sprints', projectId],
    queryFn: () => apiGet<ItSprint[]>(`/it-sprints/by-project/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateItSprint(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<ItSprint, Error, CreateItSprintRequest>({
    mutationFn: (payload) =>
      apiPost<ItSprint>(`/it-sprints/by-project/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['it-sprints', projectId] });
    },
  });
}

export function useUpdateItSprint(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    ItSprint,
    Error,
    { sprintId: string } & UpdateItSprintRequest
  >({
    mutationFn: ({ sprintId, ...payload }) =>
      apiPatch<ItSprint>(`/it-sprints/${sprintId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['it-sprints', projectId] });
    },
  });
}

/* ── DT6 knowledge-area notes ─────────────────────────────────────────── */

export function useKnowledgeAreaNotes(
  projectId: string | undefined,
  area: Dt6Area,
) {
  return useQuery<KnowledgeAreaNote[]>({
    queryKey: ['knowledge-area-notes', projectId, area],
    queryFn: () =>
      apiGet<KnowledgeAreaNote[]>(
        `/knowledge-area-notes/by-project/${projectId}?area=${area}`,
      ),
    enabled: !!projectId,
  });
}

export function useCreateKnowledgeAreaNote(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<KnowledgeAreaNote, Error, { area: Dt6Area; content: string }>({
    mutationFn: (payload) =>
      apiPost<KnowledgeAreaNote>(
        `/knowledge-area-notes/by-project/${projectId}`,
        payload,
      ),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({
        queryKey: ['knowledge-area-notes', projectId, created.area],
      });
    },
  });
}
