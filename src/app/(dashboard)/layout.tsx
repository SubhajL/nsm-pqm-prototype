'use client';

import { Grid, Layout } from 'antd';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { LiveRegion, SKIP_LINK_TARGET_ID, SkipLink } from '@/components/a11y';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useThemePreference } from '@/hooks/useThemePreference';
import { useAppStore } from '@/stores/useAppStore';
import { COLORS } from '@/theme/antd-theme';
import { DARK_COLORS } from '@/theme/dark-theme';
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
  // Sprint 4 (E1) — Content background is inline-styled, so darkAlgorithm
  // won't reach it. Pick the matching token bag manually.
  const { resolved } = useThemePreference();
  const contentBg = resolved === 'dark' ? DARK_COLORS.bgLayout : COLORS.bgLayout;

  // Pre-warm all routes after initial mount so dev compilation happens in background.
  // Dev-only: this is a dev-speedup; running it in prod would prefetch 12 routes on
  // every user's first dashboard render, inflating bundle/network for no benefit.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
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
      {/* PR-A2 — keyboard users must be able to bypass the sidebar/
          header on every page. SkipLink is first in tab order. */}
      <SkipLink />
      <Sidebar />
      <Layout style={{ marginLeft, transition: 'margin-left 0.2s' }}>
        <Header />
        <Content style={{ padding: isMobile ? 12 : 24, background: contentBg, minHeight: 'calc(100vh - 60px)' }}>
          {/* PR-A2 — `<main>` landmark + tabIndex=-1 so the skip-link
              can programmatically move focus here without making the
              element a regular tab stop. */}
          <main id={SKIP_LINK_TARGET_ID} tabIndex={-1} style={{ outline: 'none' }}>
            <Suspense fallback={<DashboardLoading />}>
              {children}
            </Suspense>
          </main>
        </Content>
      </Layout>
      {/* PR-A2 — global ARIA live regions; one per politeness. Render
          AFTER the main shell so they sit at the end of the DOM, the
          ARIA APG-recommended placement for status announcements. */}
      <LiveRegion politeness="polite" />
      <LiveRegion politeness="assertive" />
    </Layout>
  );
}
