'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { LoginCandidate } from '@/app/api/auth/login-options/route';

export function useLoginCandidates() {
  return useQuery<LoginCandidate[]>({
    queryKey: ['login-candidates'],
    queryFn: () => apiGet<LoginCandidate[]>('/auth/login-options'),
  });
}
