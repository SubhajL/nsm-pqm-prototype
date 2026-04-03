'use client';

import { Grid, Layout } from 'antd';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAppStore } from '@/stores/useAppStore';
import DashboardLoading from './loading';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const marginLeft = isMobile ? 0 : collapsed ? 64 : 240;
  const router = useRouter();
  const activeProjectId = currentProjectId ?? 'proj-001';

  // Pre-warm all routes after initial mount so dev compilation happens in background
  useEffect(() => {
    const prewarmRoutes = [
      '/dashboard',
      `/projects/${activeProjectId}`,
      `/projects/${activeProjectId}/wbs`,
      `/projects/${activeProjectId}/gantt`,
      `/projects/${activeProjectId}/daily-report`,
      `/projects/${activeProjectId}/s-curve`,
      `/projects/${activeProjectId}/quality`,
      `/projects/${activeProjectId}/risk`,
      `/projects/${activeProjectId}/issues`,
      `/projects/${activeProjectId}/documents`,
      '/executive',
      '/admin',
    ];
    const timer = setTimeout(() => {
      prewarmRoutes.forEach((route) => router.prefetch(route));
    }, 1000); // Wait 1s after mount, then prefetch all
    return () => clearTimeout(timer);
  }, [activeProjectId, router]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft, transition: 'margin-left 0.2s' }}>
        <Header />
        <Content style={{ padding: isMobile ? 12 : 24, background: '#F5F7FA', minHeight: 'calc(100vh - 60px)' }}>
          <Suspense fallback={<DashboardLoading />}>
            {children}
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
}
