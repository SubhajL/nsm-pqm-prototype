'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Col,
  Row,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';

import { useNotifications, useMarkAsRead } from '@/hooks/useNotifications';
import { COLORS } from '@/theme/antd-theme';

import { PAGE_SIZE, TAB_ITEMS } from './_components/helpers';
import { NotificationList } from './_components/NotificationList';
import {
  NotificationSettingsCard,
  type NotificationSettingsState,
} from './_components/NotificationSettingsCard';

const { Title } = Typography;

export default function NotificationCenterPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  /* notification settings state */
  const [settings, setSettings] = useState<NotificationSettingsState>({
    inApp: true,
    email: true,
    mobilePush: true,
    line: false,
  });

  /* derived filtered list */
  const filtered = useMemo(() => {
    if (!notifications) return [];
    const tabDef = TAB_ITEMS.find((t) => t.key === activeTab);
    if (!tabDef || !tabDef.filter) return notifications;
    return notifications.filter((n) => n.type === tabDef.filter);
  }, [notifications, activeTab]);

  /* pagination slice */
  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  /* count unread */
  const unreadCount = useMemo(() => {
    if (!notifications) return 0;
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  /* mark all as read handler */
  const handleMarkAllRead = () => {
    if (!notifications) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      markAsRead.mutate(unreadIds);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ====== Title Row ====== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          ศูนย์แจ้งเตือน (Notification Center)
        </Title>
        <Tag
          color={COLORS.accentTeal}
          style={{ fontSize: 13, padding: '2px 10px' }}
        >
          {unreadCount} รายการใหม่
        </Tag>
      </div>

      {/* ====== Filter Tabs ====== */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setCurrentPage(1);
        }}
        items={TAB_ITEMS.map((t) => ({ key: t.key, label: t.label }))}
        tabBarExtraContent={
          <Button type="link" onClick={handleMarkAllRead}>
            ทำเครื่องหมายอ่านแล้วทั้งหมด
          </Button>
        }
      />

      {/* ====== Two-Column Layout ====== */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <NotificationList
            paged={paged}
            filteredLength={filtered.length}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </Col>

        <Col xs={24} lg={8}>
          <NotificationSettingsCard settings={settings} onChange={setSettings} />
        </Col>
      </Row>
    </div>
  );
}
