'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  Col,
  Form,
  Row,
  Spin,
  Tabs,
  Typography,
  message,
} from 'antd';

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

import { OrgTreeCard } from './_components/OrgTreeCard';
import { OrgUnitModal } from './_components/OrgUnitModal';
import { PermissionLogCollapse } from './_components/PermissionLogCollapse';
import { UserModal } from './_components/UserModal';
import { UsersCard } from './_components/UsersCard';
import {
  buildTree,
  type DistributiveOmit,
  type OrgUnitFormValues,
  type UserFormValues,
} from './_components/helpers';

const { Title, Text } = Typography;

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

  const openCreateOrgModal = () => {
    setOrgModalMode('create');
    orgForm.resetFields();
    orgForm.setFieldsValue({
      kind: 'bureau',
      parentId: selectedDeptId,
      costCenter: null,
    });
    setOrgModalOpen(true);
  };

  const openEditOrgModal = () => {
    if (!selectedDept) return;
    setOrgModalMode('edit');
    orgForm.resetFields();
    orgForm.setFieldsValue({
      kind: selectedDept.kind,
      name: selectedDept.name,
      nameEn: selectedDept.nameEn,
      parentId: selectedDept.parentId,
      costCenter: selectedDept.costCenter,
      constructionTier:
        selectedDept.kind === 'construction_office'
          ? selectedDept.constructionTier
          : null,
    });
    setOrgModalOpen(true);
  };

  const openAddUserModal = () => {
    setEditingUser(null);
    userForm.setFieldsValue({ departmentId: selectedDeptId, role: 'Coordinator' });
    setUserModalOpen(true);
  };

  const openEditUserModal = (record: User) => {
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
  };

  const handleToggleStatus = async (record: User) => {
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
  };

  const handleSaveOrgUnit = async () => {
    try {
      const values = await orgForm.validateFields();

      // Normalize form values into PR-13's discriminated `RidOrgUnit` shape:
      // `constructionTier` is only present on the `construction_office`
      // branch, so we drop it for any other kind to keep the Zod
      // discriminator happy.
      const nameEn = values.nameEn?.trim() ? values.nameEn : null;
      const costCenter = values.costCenter?.trim() ? values.costCenter : null;
      const payload: DistributiveOmit<OrgUnit, 'id'> =
        values.kind === 'construction_office'
          ? {
              kind: 'construction_office',
              name: values.name,
              nameEn,
              parentId: values.parentId,
              costCenter,
              constructionTier: values.constructionTier ?? null,
            }
          : {
              kind: values.kind,
              name: values.name,
              nameEn,
              parentId: values.parentId,
              costCenter,
            };

      if (orgModalMode === 'create') {
        const createdUnit = (await createOrgUnit.mutateAsync(payload)) as OrgUnit;
        setSelectedDeptId(createdUnit.id);
        message.success(`เพิ่มหน่วยงาน ${values.name} แล้ว`);
      } else if (selectedDept) {
        await updateOrgUnit.mutateAsync({
          id: selectedDept.id,
          updates: payload,
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
                    <OrgTreeCard
                      treeData={treeData}
                      selectedDeptId={selectedDeptId}
                      selectedDept={selectedDept}
                      onSelect={setSelectedDeptId}
                      onCreate={openCreateOrgModal}
                      onEdit={openEditOrgModal}
                    />
                  </Col>

                  <Col xs={24} lg={16}>
                    <UsersCard
                      selectedDept={selectedDept}
                      filteredUsers={filteredUsers}
                      onAddUser={openAddUserModal}
                      onEditUser={openEditUserModal}
                      onToggleStatus={handleToggleStatus}
                      onExportUsers={handleExportUsers}
                    />
                  </Col>
                </Row>

                <PermissionLogCollapse permissionLogs={permissionLogs} />
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

      <OrgUnitModal
        open={orgModalOpen}
        mode={orgModalMode}
        form={orgForm}
        orgUnits={orgUnits ?? []}
        confirmLoading={createOrgUnit.isPending || updateOrgUnit.isPending}
        onCancel={() => {
          setOrgModalOpen(false);
          orgForm.resetFields();
        }}
        onOk={() => void handleSaveOrgUnit()}
      />

      <UserModal
        open={userModalOpen}
        editingUser={editingUser}
        form={userForm}
        orgUnits={orgUnits ?? []}
        confirmLoading={createUser.isPending || updateUser.isPending}
        onCancel={() => {
          setUserModalOpen(false);
          setEditingUser(null);
          userForm.resetFields();
        }}
        onOk={() => void handleSaveUser()}
      />
    </div>
  );
}
