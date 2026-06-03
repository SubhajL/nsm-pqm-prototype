'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Grid, Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  FolderOpenOutlined,
  TeamOutlined,
  ApartmentOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  DollarOutlined,
  FileDoneOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  BugOutlined,
  FolderOutlined,
  PieChartOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { memo, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { apiPost } from '@/lib/api-client';
import { getAgencyBrand } from '@/lib/branding';
import { useProjects } from '@/hooks/useProjects';
import { useThemePreference } from '@/hooks/useThemePreference';
import { isRidPaymentFlowClientEnabled } from '@/lib/feature-flags-client';
import { canAccessMenuItem, isProjectScopedMenuItem, type AppMenuKey } from '@/lib/project-access-pure';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS } from '@/theme/antd-theme';
import { DARK_COLORS } from '@/theme/dark-theme';
import type { UserRole } from '@/types/admin';

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

interface AppMenuItem {
  menuKey: AppMenuKey;
  key: string;
  icon: ReactNode;
  href: string;
  label: string;
}

function buildMenuItems(role: UserRole | null, projectId: string | null): MenuItem[] {
  const items: AppMenuItem[] = [
    { menuKey: 'dashboard', key: '/dashboard', icon: <DashboardOutlined />, href: '/dashboard', label: 'แดชบอร์ด (Dashboard)' },
    { menuKey: 'projects', key: projectId ? `/projects/${projectId}` : '/projects', icon: <FolderOpenOutlined />, href: projectId ? `/projects/${projectId}` : '/dashboard', label: 'โครงการ (Projects)' },
    { menuKey: 'team', key: projectId ? `/projects/${projectId}/team` : '/projects/team', icon: <TeamOutlined />, href: projectId ? `/projects/${projectId}/team` : '/dashboard', label: 'ทีมโครงการ (Team)' },
    { menuKey: 'wbs', key: projectId ? `/projects/${projectId}/wbs` : '/projects/wbs', icon: <ApartmentOutlined />, href: projectId ? `/projects/${projectId}/wbs` : '/dashboard', label: 'WBS/BOQ' },
    { menuKey: 'gantt', key: projectId ? `/projects/${projectId}/gantt` : '/projects/gantt', icon: <ScheduleOutlined />, href: projectId ? `/projects/${projectId}/gantt` : '/dashboard', label: 'แผนงาน (Gantt)' },
    { menuKey: 'daily-report', key: projectId ? `/projects/${projectId}/daily-report` : '/projects/daily-report', icon: <FileTextOutlined />, href: projectId ? `/projects/${projectId}/daily-report` : '/dashboard', label: 'รายงานประจำวัน' },
    { menuKey: 's-curve', key: projectId ? `/projects/${projectId}/s-curve` : '/projects/s-curve', icon: <DollarOutlined />, href: projectId ? `/projects/${projectId}/s-curve` : '/dashboard', label: 'งบประมาณ (EVM)' },
    { menuKey: 'work-periods', key: projectId ? `/projects/${projectId}/work-periods` : '/projects/work-periods', icon: <FileDoneOutlined />, href: projectId ? `/projects/${projectId}/work-periods` : '/dashboard', label: 'งวดงาน (Work Periods)' },
    { menuKey: 'quality', key: projectId ? `/projects/${projectId}/quality` : '/projects/quality', icon: <SafetyCertificateOutlined />, href: projectId ? `/projects/${projectId}/quality` : '/dashboard', label: 'คุณภาพ (Quality)' },
    { menuKey: 'risk', key: projectId ? `/projects/${projectId}/risk` : '/projects/risk', icon: <WarningOutlined />, href: projectId ? `/projects/${projectId}/risk` : '/dashboard', label: 'ความเสี่ยง (Risk)' },
    { menuKey: 'issues', key: projectId ? `/projects/${projectId}/issues` : '/projects/issues', icon: <BugOutlined />, href: projectId ? `/projects/${projectId}/issues` : '/dashboard', label: 'ปัญหา (Issues)' },
    { menuKey: 'documents', key: projectId ? `/projects/${projectId}/documents` : '/projects/documents', icon: <FolderOutlined />, href: projectId ? `/projects/${projectId}/documents` : '/dashboard', label: 'เอกสาร (Documents)' },
    {
      menuKey: 'reports',
      key: '/executive',
      icon: <PieChartOutlined />,
      href: '/executive',
      label: 'รายงาน (Reports)',
    },
    {
      menuKey: 'admin',
      key: '/admin',
      icon: <SettingOutlined />,
      href: '/admin',
      label: 'ผู้ดูแลระบบ (Admin)',
    },
  ];

  return [
    ...items
      .filter((item) => canAccessMenuItem(role, item.menuKey))
      .filter((item) => !isProjectScopedMenuItem(item.menuKey) || Boolean(projectId))
      // งวดงาน is gated by the client mirror of FEATURE_RID_PAYMENT_FLOW so
      // prod (flag-off) sees no nav change until the env var is set.
      .filter((item) => item.menuKey !== 'work-periods' || isRidPaymentFlowClientEnabled())
      .map((item) => ({
        key: item.key,
        icon: item.icon,
        label: <Link href={item.href} prefetch>{item.label}</Link>,
      })),
  ];
}

export const Sidebar = memo(function Sidebar() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const mobileSidebarOpen = useAppStore((s) => s.mobileSidebarOpen);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const closeMobileSidebar = useAppStore((s) => s.closeMobileSidebar);
  const currentUser = useAuthStore((s) => s.currentUser);
  const clearCurrentUser = useAuthStore((s) => s.clearCurrentUser);
  const currentRole = currentUser?.role ?? null;
  // Sprint 4 (E1) — Sider/Drawer backgrounds are inline-styled and so
  // don't auto-react to AntD's darkAlgorithm; pick the right token bag.
  const { resolved } = useThemePreference();
  const sidebarBg = resolved === 'dark' ? DARK_COLORS.sidebarDark : COLORS.primary;
  const { data: visibleProjects } = useProjects();
  const hasCurrentProjectAccess = Boolean(
    currentProjectId && visibleProjects?.some((project) => project.id === currentProjectId),
  );
  const activeProjectId =
    (hasCurrentProjectAccess ? currentProjectId : null) ?? visibleProjects?.[0]?.id ?? null;

  useEffect(() => {
    if (!visibleProjects) {
      return;
    }

    if (!currentProjectId && activeProjectId) {
      setCurrentProject(activeProjectId);
      return;
    }

    if (currentProjectId && !hasCurrentProjectAccess) {
      setCurrentProject(activeProjectId);
    }
  }, [
    activeProjectId,
    currentProjectId,
    hasCurrentProjectAccess,
    setCurrentProject,
    visibleProjects,
  ]);

  useEffect(() => {
    if (isMobile) {
      closeMobileSidebar();
    }
  }, [closeMobileSidebar, isMobile, pathname]);

  const menuItems = useMemo(
    () => buildMenuItems(currentRole, activeProjectId),
    [activeProjectId, currentRole],
  );
  const menuKeys = useMemo(
    () => menuItems.map((item) => (item as { key: string }).key),
    [menuItems],
  );

  const selectedKey = useMemo(() => {
    return menuKeys
      .filter((key) => pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0] || '/dashboard';
  }, [menuKeys, pathname]);

  const handleLogout = async () => {
    await apiPost('/auth/logout', {});
    queryClient.clear();
    setCurrentProject(null);
    closeMobileSidebar();
    clearCurrentUser();
    router.replace('/login');
    router.refresh();
  };

  const menuNode = (
    <>
      <div
        style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
          padding: collapsed && !isMobile ? '0' : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ color: COLORS.accentTeal, fontWeight: 700, fontSize: 20 }}>
          {collapsed && !isMobile ? 'P' : 'PQM'}
        </div>
        {(!collapsed || isMobile) && (
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 8 }}>
            {getAgencyBrand().name}
          </span>
        )}
      </div>

      <nav
        // PR-A2 — primary navigation landmark. The Thai label is
        // surfaced first because screen readers running in a Thai
        // locale read it directly; the English suffix aids QA tooling.
        aria-label="เมนูหลัก (Main navigation)"
        style={{ flex: 1, overflowY: 'auto' }}
      >
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={() => {
            if (isMobile) {
              closeMobileSidebar();
            }
          }}
          // Sprint 4 (E2) — tighter inline indent so the new teal
          // left-border accent (injected via <style jsx> below) reads
          // as the primary "active row" signal.
          inlineIndent={16}
          style={{ background: 'transparent', borderRight: 0, marginTop: 8 }}
        />
      </nav>
      {/* Sprint 4 (E2) — teal left-border + bold selected row. The
          :global rule targets AntD's generated `.ant-menu-item-selected`
          class which scoped-CSS won't transform. Reuses the
          COLORS.accentTeal accent pattern established by PR-A3 +
          EmptyState. */}
      <style jsx global>{`
        .ant-menu-dark .ant-menu-item-selected {
          position: relative;
          font-weight: 600;
        }
        .ant-menu-dark .ant-menu-item-selected::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 3px;
          background-color: ${COLORS.accentTeal};
          border-radius: 0 2px 2px 0;
        }
      `}</style>

      {currentUser && (
        <div
          style={{
            marginTop: 'auto',
            padding: isMobile ? '12px 16px 24px' : collapsed ? '12px 8px 32px' : '12px 16px 32px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Button
            type="text"
            icon={<LogoutOutlined style={{ fontSize: 18 }} />}
            onClick={handleLogout}
            style={{
              width: '100%',
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
              color: 'rgba(255,255,255,0.85)',
              paddingInline: collapsed && !isMobile ? 0 : 12,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {(!collapsed || isMobile) && 'ออกจากระบบ'}
          </Button>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        placement="left"
        width={240}
        open={mobileSidebarOpen}
        onClose={closeMobileSidebar}
        closable={false}
        // AntD 5.x Drawer doesn't surface a documented `aria-label`
        // pass-through to the dialog wrapper, so we rely on the inner
        // `<nav aria-label="…">` inside menuNode to identify the
        // region to assistive tech instead.
        rootClassName="pqm-mobile-nav-drawer"
        styles={{
          body: {
            padding: 0,
            background: sidebarBg,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {menuNode}
      </Drawer>
    );
  }

  return (
    <Sider
      width={240}
      collapsedWidth={64}
      collapsed={collapsed}
      style={{
        background: sidebarBg,
        minHeight: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {menuNode}
    </Sider>
  );
});
