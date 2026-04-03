'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { User } from '@/types/admin';

export function useUsers(filters?: { department?: string }) {
  const params = new URLSearchParams();
  if (filters?.department) params.set('department', filters.department);

  const queryString = params.toString();
  const path = queryString ? `/users?${queryString}` : '/users';

  return useQuery<User[]>({
    queryKey: ['users', filters],
    queryFn: () => apiGet<User[]>(path),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<User, 'id' | 'projectCount'>) =>
      apiPost('/users', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      void queryClient.invalidateQueries({ queryKey: ['org-structure'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      id: string;
      updates: Partial<Omit<User, 'id' | 'projectCount'>>;
    }) => apiPatch('/users', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      void queryClient.invalidateQueries({ queryKey: ['org-structure'] });
    },
  });
}
