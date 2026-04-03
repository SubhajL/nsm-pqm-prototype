'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { User } from '@/types/admin';

interface SessionResponse {
  user: User | null;
}

export function AuthBootstrap() {
  const pathname = usePathname();
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const clearCurrentUser = useAuthStore((s) => s.clearCurrentUser);
  const setAuthReady = useAuthStore((s) => s.setAuthReady);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      setAuthReady(false);

      try {
        const session = await apiGet<SessionResponse>('/auth/session');
        if (cancelled) return;

        if (session.user) {
          setCurrentUser(session.user);
          return;
        }

        clearCurrentUser();
      } catch {
        if (!cancelled) {
          clearCurrentUser();
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [clearCurrentUser, pathname, setAuthReady, setCurrentUser]);

  return null;
}
