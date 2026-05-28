'use client';

import { Button, Card, Space, Switch, Typography } from 'antd';
import {
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  MobileOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

const { Text } = Typography;

export interface NotificationSettingsState {
  inApp: boolean;
  email: boolean;
  mobilePush: boolean;
  line: boolean;
}

export function NotificationSettingsCard({
  settings,
  onChange,
}: {
  settings: NotificationSettingsState;
  onChange: (next: NotificationSettingsState) => void;
}) {
  return (
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
            onChange={(v) => onChange({ ...settings, inApp: v })}
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
            onChange={(v) => onChange({ ...settings, email: v })}
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
            onChange={(v) => onChange({ ...settings, mobilePush: v })}
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
            onChange={(v) => onChange({ ...settings, line: v })}
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
  );
}
