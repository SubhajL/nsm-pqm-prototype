'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Project } from '@/types/project';

export function useProjects(filters?: {
  search?: string;
  status?: string;
  projectClass?: string;
}) {
  const authReady = useAuthStore((s) => s.authReady);
  const currentUserId = useAuthStore((s) => s.currentUser?.id ?? 'anonymous');
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.projectClass) params.set('projectClass', filters.projectClass);

  const queryString = params.toString();
  const path = queryString ? `/projects?${queryString}` : '/projects';

  const query = useQuery<Project[]>({
    queryKey: ['projects', currentUserId, filters],
    queryFn: () => apiGet<Project[]>(path),
    enabled: authReady,
  });

  return {
    ...query,
    isLoading: !authReady || query.isLoading,
  };
}

export function useProject(id: string | undefined) {
  const authReady = useAuthStore((s) => s.authReady);
  const currentUserId = useAuthStore((s) => s.currentUser?.id ?? 'anonymous');

  const query = useQuery<Project>({
    queryKey: ['project', currentUserId, id],
    queryFn: () => apiGet<Project>(`/projects/${id}`),
    enabled: authReady && !!id,
  });

  return {
    ...query,
    isLoading: !authReady || query.isLoading,
  };
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, Partial<Project>>({
    mutationFn: (newProject) => apiPost<Project>('/projects', newProject),
    onSuccess: (created) => {
      // Seed every cached projects list before invalidating: the Sidebar
      // resets currentProjectId whenever it is missing from the cached
      // visible-projects list, so a create followed by setCurrentProject
      // would be clobbered back to visibleProjects[0] during the refetch
      // window (the "stay in the new project context" invariant).
      queryClient.setQueriesData<Project[]>({ queryKey: ['projects'] }, (old) =>
        old && !old.some((project) => project.id === created.id)
          ? [...old, created]
          : old,
      );
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, Partial<Project>>({
    mutationFn: (payload) => apiPatch<Project>(`/projects/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['project', undefined, id] });
      void queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });
}
