'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import type { User } from '@/types/admin';
import type { ProjectTeamMember } from '@/types/team';

export function useProjectTeam(projectId: string | undefined) {
  return useQuery<ProjectTeamMember[]>({
    queryKey: ['projectTeam', projectId],
    queryFn: () => apiGet<ProjectTeamMember[]>(`/team/${projectId}`),
    enabled: !!projectId,
  });
}

export function useProjectTeamInviteCandidates(projectId: string | undefined) {
  return useQuery<User[]>({
    queryKey: ['projectTeamCandidates', projectId],
    queryFn: () => apiGet<User[]>(`/team/${projectId}?mode=candidates`),
    enabled: !!projectId,
  });
}

export function useAddProjectTeamMember(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<{ userId: string }, Error, { userId: string }>({
    mutationFn: ({ userId }) => apiPost<{ userId: string }>(`/team/${projectId}`, { userId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projectTeam', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projectTeamCandidates', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useRemoveProjectTeamMember(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    { userId: string; remainingAssignedProjects: number },
    Error,
    { userId: string }
  >({
    mutationFn: ({ userId }) =>
      apiDelete<{ userId: string; remainingAssignedProjects: number }>(
        `/team/${projectId}`,
        { userId },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projectTeam', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projectTeamCandidates', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
