'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api-client';
import type { Notification } from '@/types/notification';

export function useNotifications(filters?: { isRead?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.isRead !== undefined) params.set('isRead', String(filters.isRead));

  const queryString = params.toString();
  const path = queryString ? `/notifications?${queryString}` : '/notifications';

  return useQuery<Notification[]>({
    queryKey: ['notifications', filters],
    queryFn: () => apiGet<Notification[]>(path),
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation<Notification[], Error, string[]>({
    mutationFn: (ids) => apiPatch<Notification[]>('/notifications', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
