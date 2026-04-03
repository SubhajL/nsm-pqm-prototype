'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tree,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';

import {
  useCreateOrgUnit,
  useOrgStructure,
  useUpdateOrgUnit,
} from '@/hooks/useOrgStructure';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useCreateUser, useUpdateUser, useUsers } from '@/hooks/useUsers';
import { buildAdminUserExportDocument } from '@/lib/export-documents';
import { downloadSpreadsheetReport } from '@/lib/export-utils';
import type { OrgUnit, User } from '@/types/admin';
import { COLORS } from '@/theme/antd-theme';
import { formatThaiDateShort } from '@/lib/date-utils';

const { Title, Text } = Typography;

function buildTree(units: OrgUnit[]): DataNode[] {
  const map = new Map<string, DataNode>();
  const roots: DataNode[] = [];

  units.forEach((unit) => {
    map.set(unit.id, {
      key: unit.id,
      title: (
        <span>
          <ApartmentOutlined style={{ marginRight: 6, color: COLORS.accentTeal }} />
          {unit.name}{' '}
          <Badge
            count={unit.userCount}
            style={{ backgroundColor: COLORS.accentTeal, marginLeft: 4 }}
            size="small"
          />
        </span>
      ),
      children: [],
    });
  });

  units.forEach((unit) => {
    const node = map.get(unit.id)!;
    if (unit.parentId && map.has(unit.parentId)) {
      const parent = map.get(unit.parentId)!;
      (parent.children as DataNode[]).push(node);
    } else if (!unit.parentId) {
      roots.push(node);
    }
  });

  return roots;
}

const ROLE_COLORS: Record<string, string> = {
  'System Admin': 'red',
  'Project Manager': 'blue',
  Engineer: 'geekblue',
  Coordinator: 'cyan',
  'Team Member': 'default',
  Executive: 'purple',
  Consultant: 'orange',
};

interface OrgUnitFormValues {
  name: string;
  nameEn: string;
  parentId: string | null;
}

interface UserFormValues {
  name: string;
  position: string;
  role: User['role'];
  departmentId: string;
  email: string;
  phone: string;
}

export default function AdminManagementPage() {
  const { data: orgUnits, isLoading: orgLoading } = useOrgStructure();
  const { data: allUsers, isLoading: usersLoading } = useUsers();
  const { data: auditLogs } = useAuditLogs();
  const createOrgUnit = useCreateOrgUnit();
  const updateOrgUnit = useUpdateOrgUnit();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [selectedDeptId, setSelectedDeptId] = useState<string>('dept-002-1');
  const [orgModalMode, setOrgModalMode] = useState<'create' | 'edit'>('create');
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [orgForm] = Form.useForm<OrgUnitFormValues>();
  const [userForm] = Form.useForm<UserFormValues>();

  const treeData = useMemo(() => {
    if (!orgUnits) return [];
    return buildTree(orgUnits);
  }, [orgUnits]);

  const selectedDept = useMemo(
    () => orgUnits?.find((unit) => unit.id === selectedDeptId) ?? null,
    [orgUnits, selectedDeptId],
  );

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((user) => user.departmentId === selectedDeptId);
  }, [allUsers, selectedDeptId]);

  const permissionLogs = useMemo(() => {
    if (!auditLogs) return [];
    return auditLogs.filter((log) => log.module === 'Admin' || log.module === 'Team').slice(0, 6);
  }, [auditLogs]);

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
            onClick={() => {
              setEditingUser(record);
              userForm.setFieldsValue({
                name: record.name,
                position: record.position,
                role: record.role,
                departmentId: record.departmentId,
                email: record.email,
                phone: record.phone,
              });
              setUserModalOpen(true);
            }}
          >
            แก้ไข
          </Button>
          <Button
            size="small"
            icon={<StopOutlined />}
            danger={record.status === 'active'}
            onClick={async () => {
              try {
                await updateUser.mutateAsync({
                  id: record.id,
                  updates: { status: record.status === 'active' ? 'suspended' : 'active' },
                });
                message.success(
                  record.status === 'active'
                    ? `ระงับการใช้งาน ${record.name} แล้ว`
                    : `เปิดใช้งาน ${record.name} แล้ว`,
                );
              } catch (error) {
                message.error(error instanceof Error ? error.message : 'ไม่สามารถอัปเดตสถานะผู้ใช้งานได้');
              }
            }}
          >
            {record.status === 'active' ? 'Suspend' : 'Activate'}
          </Button>
        </Space>
      ),
    },
  ];

  const handleSaveOrgUnit = async () => {
    try {
      const values = await orgForm.validateFields();

      if (orgModalMode === 'create') {
        const createdUnit = (await createOrgUnit.mutateAsync(values)) as OrgUnit;
        setSelectedDeptId(createdUnit.id);
        message.success(`เพิ่มหน่วยงาน ${values.name} แล้ว`);
      } else if (selectedDept) {
        await updateOrgUnit.mutateAsync({
          id: selectedDept.id,
          updates: values,
        });
        message.success(`แก้ไขหน่วยงาน ${values.name} แล้ว`);
      }

      setOrgModalOpen(false);
      orgForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleSaveUser = async () => {
    try {
      const values = await userForm.validateFields();

      if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser.id,
          updates: values,
        });
        message.success(`แก้ไขข้อมูล ${values.name} แล้ว`);
      } else {
        await createUser.mutateAsync({
          ...values,
          department: orgUnits?.find((unit) => unit.id === values.departmentId)?.name ?? '',
          status: 'active',
        });
        message.success(`เพิ่มผู้ใช้งาน ${values.name} แล้ว`);
      }

      setUserModalOpen(false);
      setEditingUser(null);
      userForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleExportUsers = () => {
    downloadSpreadsheetReport(
      buildAdminUserExportDocument({
        department: selectedDept,
        users: filteredUsers,
      }),
    );
    message.success('ส่งออกรายชื่อผู้ใช้งานแล้ว');
  };

  if (orgLoading || usersLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          จัดการผังองค์กรและผู้ใช้งาน (Admin Module)
        </Title>
      </div>

      <Tabs
        defaultActiveKey="org"
        items={[
          {
            key: 'org',
            label: 'ผังองค์กร',
            children: (
              <>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={8}>
                    <Card title="ผังองค์กร (Organization Chart)" style={{ height: '100%' }}>
                      <Tree
                        treeData={treeData}
                        defaultExpandedKeys={['dept-root', 'dept-001', 'dept-002', 'dept-004']}
                        selectedKeys={[selectedDeptId]}
                        onSelect={(keys) => {
                          if (keys.length > 0) {
                            setSelectedDeptId(keys[0] as string);
                          }
                        }}
                        blockNode
                      />
                      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          style={{
                            backgroundColor: COLORS.accentTeal,
                            borderColor: COLORS.accentTeal,
                          }}
                          onClick={() => {
                            setOrgModalMode('create');
                            orgForm.setFieldsValue({
                              parentId: selectedDeptId,
                            });
                            setOrgModalOpen(true);
                          }}
                        >
                          + เพิ่มหน่วยงาน
                        </Button>
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => {
                            if (!selectedDept) return;
                            setOrgModalMode('edit');
                            orgForm.setFieldsValue({
                              name: selectedDept.name,
                              nameEn: selectedDept.nameEn,
                              parentId: selectedDept.parentId,
                            });
                            setOrgModalOpen(true);
                          }}
                        >
                          แก้ไข
                        </Button>
                        <Button danger icon={<DeleteOutlined />}>
                          ลบ
                        </Button>
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} lg={16}>
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
                          onClick={() => {
                            setEditingUser(null);
                            userForm.setFieldsValue({ departmentId: selectedDeptId, role: 'Coordinator' });
                            setUserModalOpen(true);
                          }}
                        >
                          + เพิ่มผู้ใช้งาน
                        </Button>
                        <Button icon={<ImportOutlined />}>Import จาก HR</Button>
                        <Button icon={<ExportOutlined />} onClick={handleExportUsers}>Export รายชื่อ</Button>
                      </div>
                    </Card>
                  </Col>
                </Row>

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
              </>
            ),
          },
          {
            key: 'positions',
            label: 'ตำแหน่งงาน',
            children: (
              <Card>
                <Text type="secondary">
                  หน้าจอตำแหน่งงานอยู่ระหว่างพัฒนา (Position Management - Under Development)
                </Text>
              </Card>
            ),
          },
          {
            key: 'users',
            label: 'ผู้ใช้งาน',
            children: (
              <Card>
                <Text type="secondary">
                  หน้าจอผู้ใช้งานทั้งหมดอยู่ระหว่างพัฒนา (All Users - Under Development)
                </Text>
              </Card>
            ),
          },
          {
            key: 'roles',
            label: 'บทบาทและสิทธิ์',
            children: (
              <Card>
                <Text type="secondary">
                  หน้าจอบทบาทและสิทธิ์อยู่ระหว่างพัฒนา (Roles & Permissions - Under Development)
                </Text>
              </Card>
            ),
          },
        ]}
      />

      <Modal
        open={orgModalOpen}
        title={orgModalMode === 'create' ? 'เพิ่มหน่วยงาน' : 'แก้ไขหน่วยงาน'}
        okText="บันทึก"
        cancelText="ยกเลิก"
        onCancel={() => {
          setOrgModalOpen(false);
          orgForm.resetFields();
        }}
        onOk={() => void handleSaveOrgUnit()}
        confirmLoading={createOrgUnit.isPending || updateOrgUnit.isPending}
      >
        <Form layout="vertical" form={orgForm}>
          <Form.Item
            label="ชื่อหน่วยงาน"
            name="name"
            rules={[{ required: true, message: 'กรุณาระบุชื่อหน่วยงาน' }]}
          >
            <Input aria-label="ชื่อหน่วยงาน" />
          </Form.Item>
          <Form.Item
            label="ชื่อภาษาอังกฤษ"
            name="nameEn"
            rules={[{ required: true, message: 'กรุณาระบุชื่อภาษาอังกฤษ' }]}
          >
            <Input aria-label="ชื่อภาษาอังกฤษ" />
          </Form.Item>
          <Form.Item label="หน่วยงานแม่" name="parentId">
            <Select
              aria-label="หน่วยงานแม่"
              allowClear
              options={orgUnits?.map((unit) => ({ value: unit.id, label: unit.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={userModalOpen}
        title={editingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'}
        okText="บันทึก"
        cancelText="ยกเลิก"
        onCancel={() => {
          setUserModalOpen(false);
          setEditingUser(null);
          userForm.resetFields();
        }}
        onOk={() => void handleSaveUser()}
        confirmLoading={createUser.isPending || updateUser.isPending}
      >
        <Form layout="vertical" form={userForm}>
          <Form.Item
            label="ชื่อ-สกุล"
            name="name"
            rules={[{ required: true, message: 'กรุณาระบุชื่อ-สกุล' }]}
          >
            <Input aria-label="ชื่อ-สกุล" />
          </Form.Item>
          <Form.Item
            label="ตำแหน่ง"
            name="position"
            rules={[{ required: true, message: 'กรุณาระบุตำแหน่ง' }]}
          >
            <Input aria-label="ตำแหน่ง" />
          </Form.Item>
          <Form.Item
            label="บทบาทในระบบ"
            name="role"
            rules={[{ required: true, message: 'กรุณาเลือกบทบาท' }]}
          >
            <Select
              aria-label="บทบาทในระบบ"
              options={[
                'System Admin',
                'Project Manager',
                'Engineer',
                'Coordinator',
                'Team Member',
                'Executive',
                'Consultant',
              ].map((role) => ({ value: role, label: role }))}
            />
          </Form.Item>
          <Form.Item
            label="สังกัดหน่วยงาน"
            name="departmentId"
            rules={[{ required: true, message: 'กรุณาเลือกหน่วยงาน' }]}
          >
            <Select
              aria-label="สังกัดหน่วยงาน"
              options={orgUnits?.map((unit) => ({ value: unit.id, label: unit.name }))}
            />
          </Form.Item>
          <Form.Item
            label="อีเมล"
            name="email"
            rules={[{ required: true, message: 'กรุณาระบุอีเมล' }]}
          >
            <Input aria-label="อีเมล" />
          </Form.Item>
          <Form.Item
            label="เบอร์โทร"
            name="phone"
            rules={[{ required: true, message: 'กรุณาระบุเบอร์โทร' }]}
          >
            <Input aria-label="เบอร์โทร" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
