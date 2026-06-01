'use client';

import { Layout, Badge, Avatar, Breadcrumb, Button, Grid, Space, Typography } from 'antd';
import { BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useProject } from '@/hooks/useProjects';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemePreference } from '@/hooks/useThemePreference';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS } from '@/theme/antd-theme';
import { DARK_COLORS } from '@/theme/dark-theme';

import { ThemeToggle } from './ThemeToggle';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: 'แดชบอร์ด',
  projects: 'โครงการ',
  new: 'สร้างโครงการใหม่',
  wbs: 'WBS/BOQ',
  gantt: 'แผนภูมิแกนต์',
  approval: 'ขออนุมัติแผนงาน',
  'daily-report': 'รายงานประจำวัน',
  progress: 'อัปเดตความก้าวหน้า',
  's-curve': 'EVM Dashboard',
  quality: 'การควบคุมคุณภาพ',
  inspection: 'ตรวจสอบคุณภาพ',
  risk: 'บริหารความเสี่ยง',
  issues: 'ติดตามปัญหา',
  documents: 'เอกสาร',
  'change-request': 'Change Request',
  notifications: 'แจ้งเตือน',
  executive: 'แดชบอร์ดผู้บริหาร',
  evaluation: 'แบบประเมินโครงการ',
  admin: 'ผู้ดูแลระบบ',
  audit: 'Audit Log',
};

export function Header() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleMobileSidebar = useAppStore((s) => s.toggleMobileSidebar);
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const currentUser = useAuthStore((s) => s.currentUser);
  // Sprint 4 (E1) — shell surfaces are inline-styled, so they don't
  // pick up AntD's darkAlgorithm automatically. Pick the right token
  // bag based on the resolved theme.
  const { resolved } = useThemePreference();
  const isDark = resolved === 'dark';
  const headerBg = isDark ? DARK_COLORS.surfaceMuted : COLORS.white;
  const headerBorder = isDark ? DARK_COLORS.borderSoft : COLORS.borderLight;
  const headerText = isDark ? DARK_COLORS.textDark : COLORS.textDark;

  const segments = pathname.split('/').filter(Boolean);
  const projectIdSegment =
    segments[0] === 'projects' && segments[1] && segments[1] !== 'new'
      ? segments[1]
      : undefined;
  const { data: currentProject } = useProject(projectIdSegment);
  const breadcrumbItems = segments.map((seg, i) => ({
    title:
      seg === projectIdSegment
        ? currentProject?.name ?? 'รายละเอียดโครงการ'
        : (BREADCRUMB_MAP[seg] || seg),
    ...(i < segments.length - 1
      ? { href: '/' + segments.slice(0, i + 1).join('/') }
      : {}),
  }));
  const currentTitle = String(
    breadcrumbItems[breadcrumbItems.length - 1]?.title ?? 'แดชบอร์ด',
  );

  return (
    <AntHeader
      style={{
        background: headerBg,
        padding: isMobile ? '0 12px' : '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${headerBorder}`,
        position: 'sticky',
        top: 0,
        zIndex: 99,
      }}
    >
      <Space>
        <Button
          type="text"
          aria-label={isMobile ? 'เปิดเมนูนำทาง' : 'ย่อหรือขยายเมนูด้านข้าง'}
          icon={
            isMobile ? <MenuUnfoldOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
          }
          onClick={isMobile ? toggleMobileSidebar : toggleSidebar}
        />
        {isMobile ? (
          <Text strong ellipsis style={{ maxWidth: 180 }}>
            {currentTitle}
          </Text>
        ) : (
          // PR-A2 — breadcrumb is a navigation landmark (WAI-ARIA APG).
          // `display: contents` keeps the AntD `<Space>` flex centering
          // intact — the nav adds semantics without an extra box.
          <nav aria-label="เส้นทาง (Breadcrumb)" style={{ display: 'contents' }}>
            <Breadcrumb items={breadcrumbItems} />
          </nav>
        )}
      </Space>

      <Space size={isMobile ? 'small' : 'middle'}>
        <ThemeToggle />
        <Badge count={unreadCount} size="small">
          <Button
            type="text"
            // PR-A2 — pronounce the unread count to assistive tech so
            // the badge isn't a silent visual decoration.
            aria-label={
              unreadCount > 0
                ? `การแจ้งเตือน ${unreadCount} รายการที่ยังไม่อ่าน (Notifications: ${unreadCount} unread)`
                : 'การแจ้งเตือน (Notifications)'
            }
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            onClick={() => router.push('/notifications')}
          />
        </Badge>
        <Space size="small">
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: COLORS.accentTeal }} />
          <span style={{ fontSize: isMobile ? 12 : 14, color: headerText, maxWidth: isMobile ? 84 : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser?.name ?? 'ผู้ใช้ทดลอง'}
          </span>
        </Space>
      </Space>
    </AntHeader>
  );
}
