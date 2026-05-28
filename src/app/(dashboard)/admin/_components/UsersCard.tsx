'use client';

import { Button, Card, Space, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import {
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

import { ROLE_COLORS, type OrgUnitWithUserCount, type User } from './helpers';

export function UsersCard({
  selectedDept,
  filteredUsers,
  onAddUser,
  onEditUser,
  onToggleStatus,
  onExportUsers,
}: {
  selectedDept: OrgUnitWithUserCount | null;
  filteredUsers: User[];
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onExportUsers: () => void;
}) {
  const columns: TableProps<User>['columns'] = [
    {
      title: 'ลำดับ',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_: unknown, __: User, index: number) => index + 1,
    },
    {
      title: 'ชื่อ-สกุล',
      dataIndex: 'name',
      key: 'name',
      width: 220,
    },
    {
      title: 'ตำแหน่ง',
      dataIndex: 'position',
      key: 'position',
      width: 170,
    },
    {
      title: 'บทบาทในระบบ',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: (role: string) => <Tag color={ROLE_COLORS[role] ?? 'default'}>{role}</Tag>,
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) =>
        status === 'active' ? <Tag color="green">Active</Tag> : <Tag color="red">Suspended</Tag>,
    },
    {
      title: 'โครงการ',
      dataIndex: 'projectCount',
      key: 'projectCount',
      width: 90,
      align: 'center',
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: User) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditUser(record)}
          >
            แก้ไข
          </Button>
          <Button
            size="small"
            icon={<StopOutlined />}
            danger={record.status === 'active'}
            onClick={() => onToggleStatus(record)}
          >
            {record.status === 'active' ? 'Suspend' : 'Activate'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title={`${selectedDept?.name ?? ''} — ${filteredUsers.length} คน`}>
      <Table<User>
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 900 }}
      />
      <div
        style={{
          marginTop: 16,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{
            backgroundColor: COLORS.accentTeal,
            borderColor: COLORS.accentTeal,
          }}
          onClick={onAddUser}
        >
          + เพิ่มผู้ใช้งาน
        </Button>
        <Button icon={<ImportOutlined />}>Import จาก HR</Button>
        <Button icon={<ExportOutlined />} onClick={onExportUsers}>Export รายชื่อ</Button>
      </div>
    </Card>
  );
}
