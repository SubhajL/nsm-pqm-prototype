'use client';

import { Layout, Badge, Avatar, Breadcrumb, Button, Grid, Space, Typography } from 'antd';
import { BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useProject } from '@/hooks/useProjects';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';

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
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const currentUser = useAuthStore((s) => s.currentUser);

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
        background: '#fff',
        padding: isMobile ? '0 12px' : '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E8ECF1',
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
          <Breadcrumb items={breadcrumbItems} />
        )}
      </Space>

      <Space size={isMobile ? 'small' : 'middle'}>
        <Badge count={unreadCount} size="small">
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            onClick={() => router.push('/notifications')}
          />
        </Badge>
        <Space size="small">
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#00B894' }} />
          <span style={{ fontSize: isMobile ? 12 : 14, color: '#2C3E50', maxWidth: isMobile ? 84 : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser?.name ?? 'ผู้ใช้ทดลอง'}
          </span>
        </Space>
      </Space>
    </AntHeader>
  );
}
