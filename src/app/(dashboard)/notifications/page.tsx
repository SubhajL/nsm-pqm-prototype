'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Typography,
  Tag,
  Tabs,
  List,
  Button,
  Switch,
  Pagination,
  Space,
  Spin,
} from 'antd';
import {
  WarningOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  BellOutlined,
  MailOutlined,
  MobileOutlined,
  MessageOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useNotifications, useMarkAsRead } from '@/hooks/useNotifications';
import type { Notification, NotificationType, NotificationSeverity } from '@/types/notification';
import { COLORS } from '@/theme/antd-theme';

const { Title, Text } = Typography;

/* ---------- severity → left border color ---------- */
const SEVERITY_BORDER: Record<NotificationSeverity, string> = {
  error: COLORS.error,
  warning: COLORS.warning,
  success: COLORS.success,
  info: COLORS.info,
};

/* ---------- type → icon ---------- */
function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'task':
      return <WarningOutlined style={{ color: COLORS.warning }} />;
    case 'milestone':
      return <ClockCircleOutlined style={{ color: COLORS.info }} />;
    case 'approval':
      return <CheckCircleOutlined style={{ color: COLORS.success }} />;
    case 'mention':
      return <MessageOutlined style={{ color: COLORS.info }} />;
    case 'quality':
      return <SafetyCertificateOutlined style={{ color: COLORS.error }} />;
    case 'risk':
      return <ExclamationCircleOutlined style={{ color: COLORS.warning }} />;
    case 'system':
      return <ToolOutlined style={{ color: '#8c8c8c' }} />;
    default:
      return <BellOutlined />;
  }
}

/* ---------- relative timestamp ---------- */
function formatRelativeTime(isoDate: string): string {
  const now = new Date('2026-07-15T18:00:00'); // demo "now"
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'เมื่อสักครู่';
  if (diffMin < 60) return `${diffMin} นาทีก่อน`;
  if (diffHr < 24) return `${diffHr} ชม.ก่อน`;
  if (diffDay === 1) return 'เมื่อวาน';
  if (diffDay < 7) return `${diffDay} วันก่อน`;
  return `${Math.floor(diffDay / 7)} สัปดาห์ก่อน`;
}

/* ---------- tab definitions ---------- */
const TAB_ITEMS: { key: string; label: string; filter?: NotificationType }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'task', label: 'งานมอบหมาย', filter: 'task' },
  { key: 'milestone', label: 'Milestone', filter: 'milestone' },
  { key: 'approval', label: 'อนุมัติ', filter: 'approval' },
  { key: 'system', label: 'ระบบ', filter: 'system' },
];

const PAGE_SIZE = 8;

export default function NotificationCenterPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  /* notification settings state */
  const [settings, setSettings] = useState({
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
        {/* Left — Notification List */}
        <Col xs={24} lg={16}>
          <Card
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            }}
            styles={{ body: { padding: 0 } }}
          >
            <List
              dataSource={paged}
              renderItem={(item: Notification) => {
                const borderColor = SEVERITY_BORDER[item.severity];
                const isUnread = !item.isRead;

                return (
                  <List.Item
                    key={item.id}
                    style={{
                      borderLeft: `4px solid ${borderColor}`,
                      backgroundColor: isUnread ? '#f0f7ff' : '#ffffff',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                    actions={[
                      item.actionUrl ? (
                        <Button
                          key="detail"
                          type="link"
                          size="small"
                          href={item.actionUrl}
                        >
                          ดูรายละเอียด
                        </Button>
                      ) : null,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div
                          style={{
                            fontSize: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: `${borderColor}14`,
                          }}
                        >
                          {getTypeIcon(item.type)}
                        </div>
                      }
                      title={
                        <Text strong={isUnread} style={{ fontSize: 14 }}>
                          {item.title}
                        </Text>
                      }
                      description={
                        <div>
                          <Text
                            type="secondary"
                            style={{ fontSize: 13, display: 'block' }}
                          >
                            {item.message}
                          </Text>
                          <Text
                            type="secondary"
                            style={{ fontSize: 12, marginTop: 4, display: 'block' }}
                          >
                            {formatRelativeTime(item.timestamp)}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />

            {/* Pagination */}
            <div
              style={{
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: `1px solid ${COLORS.borderLight}`,
              }}
            >
              <Text type="secondary" style={{ fontSize: 13 }}>
                แสดง {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}
                -{Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก{' '}
                {filtered.length} รายการ
              </Text>
              <Pagination
                current={currentPage}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onChange={setCurrentPage}
                size="small"
                showSizeChanger={false}
              />
            </div>
          </Card>
        </Col>

        {/* Right — Settings */}
        <Col xs={24} lg={8}>
          <Card
            title="การตั้งค่าแจ้งเตือน (Settings)"
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* In-App */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Space>
                  <BellOutlined style={{ fontSize: 18, color: COLORS.primary }} />
                  <Text>In-App Notification</Text>
                </Space>
                <Switch
                  checked={settings.inApp}
                  onChange={(v) => setSettings((s) => ({ ...s, inApp: v }))}
                  style={
                    settings.inApp
                      ? { backgroundColor: COLORS.accentTeal }
                      : undefined
                  }
                />
              </div>

              {/* Email */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Space>
                  <MailOutlined style={{ fontSize: 18, color: COLORS.primary }} />
                  <Text>Email Notification</Text>
                </Space>
                <Switch
                  checked={settings.email}
                  onChange={(v) => setSettings((s) => ({ ...s, email: v }))}
                  style={
                    settings.email
                      ? { backgroundColor: COLORS.accentTeal }
                      : undefined
                  }
                />
              </div>

              {/* Mobile Push */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Space>
                  <MobileOutlined style={{ fontSize: 18, color: COLORS.primary }} />
                  <Text>Mobile Push</Text>
                </Space>
                <Switch
                  checked={settings.mobilePush}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, mobilePush: v }))
                  }
                  style={
                    settings.mobilePush
                      ? { backgroundColor: COLORS.accentTeal }
                      : undefined
                  }
                />
              </div>

              {/* LINE Notify */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Space>
                  <MessageOutlined style={{ fontSize: 18, color: COLORS.primary }} />
                  <Text>LINE Notify</Text>
                </Space>
                <Switch
                  checked={settings.line}
                  onChange={(v) => setSettings((s) => ({ ...s, line: v }))}
                  style={
                    settings.line
                      ? { backgroundColor: COLORS.accentTeal }
                      : undefined
                  }
                />
              </div>

              {/* Settings link */}
              <Button
                type="link"
                icon={<SettingOutlined />}
                style={{ padding: 0, marginTop: 8 }}
              >
                จัดการตั้งค่า
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
