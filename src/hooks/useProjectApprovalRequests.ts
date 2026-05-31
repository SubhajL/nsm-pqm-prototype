'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api-client';
import type {
  ApprovalDecision,
  ProjectApprovalRequest,
} from '@/types/project-approval-request';

/**
 * PR-D2 — React Query hooks for the PR-27 project-approval workflow.
 *
 * The Approval page previously rendered hardcoded steps + attachments
 * (UX gap G12 "demo data in UI"). With PR-27's API in place, this hook
 * exposes the real data. The page falls back to demo content when no
 * approval request exists yet, so the screen remains useful for
 * projects that haven't started the approval flow.
 */

export function useProjectApprovalRequests(projectId: string | undefined) {
  return useQuery<ProjectApprovalRequest[]>({
    queryKey: ['projectApprovalRequests', projectId],
    queryFn: () =>
      apiGet<ProjectApprovalRequest[]>(
        `/project-approval-requests/by-project/${projectId}`,
      ),
    enabled: !!projectId,
  });
}

export function useCreateProjectApprovalRequest(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { notes?: string }) =>
      apiPost<ProjectApprovalRequest>(
        `/project-approval-requests/by-project/${projectId}`,
        payload,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projectApprovalRequests', projectId],
      });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useRecordProjectApprovalDecision(
  projectId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      approvalRequestId: string;
      decision: ApprovalDecision['decision'];
      comment: string;
    }) =>
      apiPost<ProjectApprovalRequest>(
        `/project-approval-requests/${args.approvalRequestId}/decision`,
        { decision: args.decision, comment: args.comment },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projectApprovalRequests', projectId],
      });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
