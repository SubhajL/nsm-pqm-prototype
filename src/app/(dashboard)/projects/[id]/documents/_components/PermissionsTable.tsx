'use client';

import { Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import type { PermissionEntry } from '@/types/document';

import { PERMISSION_KEYS } from './helpers';

type PermissionRow = Record<string, string | boolean>;

export function PermissionsTable({
  permissions,
}: {
  permissions: PermissionEntry[];
}) {
  const permissionColumns: ColumnsType<PermissionRow> = [
    {
      title: 'สิทธิ์ (Permission)',
      dataIndex: 'permission',
      key: 'permission',
      width: 200,
      fixed: 'left',
    },
    ...permissions.map((permission) => ({
      title: permission.role,
      dataIndex: permission.role,
      key: permission.role,
      width: 160,
      align: 'center' as const,
      render: (_: unknown, record: PermissionRow) => {
        const value = record[permission.role];
        return value ? (
          <CheckCircleOutlined style={{ color: COLORS.success, fontSize: 18 }} />
        ) : (
          <CloseCircleOutlined style={{ color: COLORS.error, fontSize: 18 }} />
        );
      },
    })),
  ];

  const permissionData: PermissionRow[] = PERMISSION_KEYS.map((permissionKey) => {
    const row: PermissionRow = {
      key: permissionKey.key,
      permission: permissionKey.label,
    };

    permissions.forEach((permission) => {
      row[permission.role] = permission[permissionKey.key];
    });

    return row;
  });

  return (
    <Card
      title="สิทธิ์การเข้าถึงเอกสาร (Document Access Permissions)"
      style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Table
        columns={permissionColumns}
        dataSource={permissionData}
        rowKey="key"
        pagination={false}
        size="middle"
        scroll={{ x: 900 }}
      />
    </Card>
  );
}
