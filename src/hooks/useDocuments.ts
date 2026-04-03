'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import type { DocumentData } from '@/types/document';

export function useDocuments(projectId: string | undefined) {
  return useQuery<DocumentData>({
    queryKey: ['documents', projectId],
    queryFn: () => apiGet<DocumentData>(`/documents/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateDocumentFolder(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; parentId: string | null }) =>
      apiPost(`/documents/${projectId}`, { kind: 'folder', ...payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useUploadDocument(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { folderId: string; name: string; type: string; size: string }) =>
      apiPost(`/documents/${projectId}`, { kind: 'file', ...payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useUploadDocumentVersion(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { fileId: string; note: string }) =>
      apiPost(`/documents/${projectId}`, { kind: 'version', ...payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useDeleteDocumentEntry(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { kind: 'folder' | 'file'; id: string }) =>
      apiDelete(`/documents/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
