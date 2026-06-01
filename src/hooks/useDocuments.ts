'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
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

/**
 * PR-Docs1 — rename a folder or a file. Accepts a discriminated payload so
 * the call sites in `FolderTreePanel` and `FilesTablePanel` share a single
 * mutation rather than maintaining two near-identical hooks.
 */
export function useRenameDocumentEntry(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      payload:
        | { kind: 'rename_folder'; id: string; name: string }
        | { kind: 'rename_file'; id: string; name: string },
    ) => apiPatch(`/documents/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

/**
 * PR-Docs1 — move a file across folders within the same project. The route
 * validates `toFolderId` exists before persisting so the cache invalidation
 * here is always backed by a consistent server state.
 */
export function useMoveDocumentFile(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { id: string; toFolderId: string }) =>
      apiPatch(`/documents/${projectId}`, { kind: 'move_file', ...payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
