'use client';

import { useEffect } from 'react';
import { Spin } from 'antd';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useAppStore } from '@/stores/useAppStore';

export default function ProjectRouteLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const projectId = useRouteProjectId();
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const { isLoading, isError } = useProject(projectId);

  useEffect(() => {
    setCurrentProject(projectId ?? null);
  }, [projectId, setCurrentProject]);

  useEffect(() => {
    if (!isLoading && isError) {
      router.replace('/dashboard');
    }
  }, [isError, isLoading, router]);

  if (!projectId || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return null;
  }

  return children;
}
