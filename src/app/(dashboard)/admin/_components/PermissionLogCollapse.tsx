'use client';

import { Collapse, Timeline, Typography } from 'antd';

import { formatThaiDateShort } from '@/lib/date-utils';
import type { AuditLog } from '@/types/admin';

const { Text } = Typography;

export function PermissionLogCollapse({
  permissionLogs,
}: {
  permissionLogs: AuditLog[];
}) {
  return (
    <Collapse
      style={{ marginTop: 16 }}
      items={[
        {
          key: 'permission-log',
          label: 'ประวัติการเปลี่ยนแปลงสิทธิ์ (Permission Change Log)',
          children: (
            <Timeline
              items={permissionLogs.map((log) => ({
                color: 'blue',
                children: (
                  <div>
                    <Text strong>{log.userName}</Text>
                    <Text type="secondary"> — </Text>
                    <Text>{log.action}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatThaiDateShort(log.timestamp)} | IP: {log.ip}
                    </Text>
                  </div>
                ),
              }))}
            />
          ),
        },
      ]}
    />
  );
}
