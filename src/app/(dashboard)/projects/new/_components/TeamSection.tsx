'use client';

import { Avatar, Button, Divider, message, Space, Tag, Typography } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

const { Text } = Typography;

type TeamMember = {
  name: string;
  role: string;
  confirmed: boolean;
  avatar: string;
};

export function TeamSection({
  defaultTeamMembers,
}: {
  defaultTeamMembers: TeamMember[];
}) {
  return (
    <>
      <Divider orientation="left" orientationMargin={0}>
        <Text strong style={{ fontSize: 16 }}>
          ทีมโครงการ (Project Team)
        </Text>
      </Divider>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {defaultTeamMembers.map((member) => (
          <div
            key={member.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: 8,
              background: COLORS.surfaceSubtle,
            }}
          >
            <Space size={12}>
              <Avatar
                style={{
                  backgroundColor: COLORS.primary,
                  verticalAlign: 'middle',
                }}
                size={40}
              >
                {member.avatar}
              </Avatar>
              <div>
                <Text strong>{member.name}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {member.role}
                </Text>
              </div>
            </Space>
            <Tag color={member.confirmed ? 'success' : 'warning'}>
              {member.confirmed
                ? 'ยืนยันแล้ว (Confirmed)'
                : 'รอยืนยัน (Pending)'}
            </Tag>
          </div>
        ))}
      </div>

      <Button
        type="dashed"
        icon={<UserAddOutlined />}
        style={{ marginTop: 12, width: '100%' }}
        onClick={() => message.info('สร้างโครงการก่อน แล้วจึงเชิญสมาชิกในหน้า Team')}
      >
        + เชิญสมาชิก (Invite Member)
      </Button>
    </>
  );
}
