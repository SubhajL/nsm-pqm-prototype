'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { canAccessAdmin, canAccessExecutive } from '@/lib/auth';
import { getAssignmentRoleForUserRole } from '@/lib/project-access';
import type { ProjectAssignmentRole } from '@/lib/project-membership-store';
import {
  useAddProjectTeamMember,
  useProjectTeam,
  useProjectTeamInviteCandidates,
  useRemoveProjectTeamMember,
} from '@/hooks/useProjectTeam';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS } from '@/theme/antd-theme';
import type { ProjectTeamMember } from '@/types/team';

const { Title, Text } = Typography;

const ROLE_LABELS: Record<ProjectAssignmentRole, { label: string; color: string }> = {
  manager: { label: 'ผู้จัดการโครงการ', color: 'blue' },
  engineer: { label: 'วิศวกร', color: 'geekblue' },
  coordinator: { label: 'ผู้ประสานงาน', color: 'cyan' },
  team_member: { label: 'สมาชิกทีม', color: 'default' },
  consultant: { label: 'ที่ปรึกษา', color: 'orange' },
};

function canLoseLoginAfterRemoval(member: ProjectTeamMember) {
  return (
    member.projectCount === 1 &&
    !canAccessAdmin(member.role) &&
    !canAccessExecutive(member.role) &&
    member.assignmentRole !== 'manager'
  );
}

export default function ProjectTeamPage() {
  const projectId = useRouteProjectId();
  const currentUser = useAuthStore((s) => s.currentUser);
  const canManageTeam = currentUser
    ? canAccessAdmin(currentUser.role) || currentUser.role === 'Project Manager'
    : false;
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: members, isLoading: loadingTeam } = useProjectTeam(projectId);
  const { data: inviteCandidates = [], isLoading: loadingCandidates } =
    useProjectTeamInviteCandidates(canManageTeam ? projectId : undefined);
  const addMember = useAddProjectTeamMember(projectId);
  const removeMember = useRemoveProjectTeamMember(projectId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState<string>();

  const roleCounts = useMemo(() => {
    const counts: Record<ProjectAssignmentRole, number> = {
      manager: 0,
      engineer: 0,
      coordinator: 0,
      team_member: 0,
      consultant: 0,
    };

    (members ?? []).forEach((member) => {
      counts[member.assignmentRole] += 1;
    });

    return counts;
  }, [members]);

  const lastDutyExample = useMemo(
    () => (members ?? []).find((member) => canLoseLoginAfterRemoval(member)),
    [members],
  );

  const handleInvite = async () => {
    if (!inviteUserId) {
      message.warning('กรุณาเลือกผู้ใช้งานที่จะเชิญเข้าทีม');
      return;
    }

    try {
      await addMember.mutateAsync({ userId: inviteUserId });
      const invitedUser = inviteCandidates.find((candidate) => candidate.id === inviteUserId);
      setInviteOpen(false);
      setInviteUserId(undefined);
      message.success(
        invitedUser
          ? `เพิ่ม ${invitedUser.name} เข้าทีมโครงการแล้ว`
          : 'เพิ่มสมาชิกเข้าทีมโครงการแล้ว',
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'ไม่สามารถเพิ่มสมาชิกได้');
    }
  };

  const handleRemove = async (member: ProjectTeamMember) => {
    try {
      const result = await removeMember.mutateAsync({ userId: member.id });
      message.success(
        result.remainingAssignedProjects === 0 &&
          !canAccessAdmin(member.role) &&
          !canAccessExecutive(member.role)
          ? `${member.name} ไม่มีหน้าที่โครงการเหลืออยู่ และจะไม่สามารถเข้าสู่ระบบได้`
          : `นำ ${member.name} ออกจากทีมโครงการแล้ว`,
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'ไม่สามารถนำสมาชิกออกได้');
    }
  };

  if (loadingProject || loadingTeam) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Space size={10}>
                <TeamOutlined style={{ color: COLORS.accentTeal }} />
                <Title level={3} style={{ margin: 0 }}>
                  ทีมโครงการ (Project Team)
                </Title>
              </Space>
              <Text type="secondary">
                {project?.name ?? 'โครงการ'}{project?.code ? ` • ${project.code}` : ''}
              </Text>
              <Text type="secondary">
                เมนูนี้เป็นข้อมูลระดับโครงการ จะแสดงความหมายได้ก็ต่อเมื่อมีการเลือกโครงการแล้ว
              </Text>
            </Space>
          </Col>
          <Col>
            {canManageTeam && (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setInviteOpen(true)}
                style={{
                  backgroundColor: COLORS.accentTeal,
                  borderColor: COLORS.accentTeal,
                }}
              >
                เชิญสมาชิก
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      {lastDutyExample && (
        <Alert
          type="warning"
          showIcon
          message="ตัวอย่างสำหรับเดโม"
          description={`หากลบ ${lastDutyExample.name} ออกจากโครงการนี้ ผู้ใช้นี้จะไม่มีหน้าที่โครงการเหลืออยู่ และจะไม่สามารถเข้าสู่ระบบได้`}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} xl={4}>
          <Card>
            <Statistic title="สมาชิกทั้งหมด" value={members?.length ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8} xl={4}>
          <Card>
            <Statistic title="ผู้จัดการโครงการ" value={roleCounts.manager} />
          </Card>
        </Col>
        <Col xs={12} md={8} xl={4}>
          <Card>
            <Statistic title="วิศวกร" value={roleCounts.engineer} />
          </Card>
        </Col>
        <Col xs={12} md={8} xl={4}>
          <Card>
            <Statistic title="ผู้ประสานงาน" value={roleCounts.coordinator} />
          </Card>
        </Col>
        <Col xs={12} md={8} xl={4}>
          <Card>
            <Statistic title="สมาชิกทีม" value={roleCounts.team_member} />
          </Card>
        </Col>
        <Col xs={12} md={8} xl={4}>
          <Card>
            <Statistic title="ที่ปรึกษา" value={roleCounts.consultant} />
          </Card>
        </Col>
      </Row>

      <Card
        title="รายชื่อสมาชิกโครงการ"
        style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      >
        {members && members.length > 0 ? (
          <Row gutter={[16, 16]}>
            {members.map((member) => (
              <Col xs={24} md={12} xl={8} key={`${member.id}-${member.assignmentRole}`}>
                <Card
                  size="small"
                  style={{
                    height: '100%',
                    borderRadius: 8,
                    borderColor: '#E8ECF1',
                  }}
                >
                  <Space align="start" size={12} style={{ width: '100%' }}>
                    <Avatar
                      size={52}
                      style={{ backgroundColor: COLORS.primary, flexShrink: 0 }}
                    >
                      {member.name.slice(0, 2)}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                      <Space wrap size={[8, 8]} style={{ marginBottom: 8 }}>
                        <Text strong>{member.name}</Text>
                        <Tag color={ROLE_LABELS[member.assignmentRole].color}>
                          {ROLE_LABELS[member.assignmentRole].label}
                        </Tag>
                        <Tag color={member.status === 'active' ? 'success' : 'error'}>
                          {member.status === 'active' ? 'Active' : 'Suspended'}
                        </Tag>
                      </Space>
                      <div>
                        <Text type="secondary">{member.position}</Text>
                      </div>
                      <div>
                        <Text type="secondary">{member.department}</Text>
                      </div>
                      <Space direction="vertical" size={4} style={{ marginTop: 12 }}>
                        <Space size={6}>
                          <MailOutlined style={{ color: COLORS.info }} />
                          <Text>{member.email}</Text>
                        </Space>
                        <Space size={6}>
                          <PhoneOutlined style={{ color: COLORS.info }} />
                          <Text>{member.phone}</Text>
                        </Space>
                      </Space>
                      {canManageTeam && member.assignmentRole !== 'manager' && (
                        <div style={{ marginTop: 12 }}>
                          <Popconfirm
                            title="นำสมาชิกออกจากทีมโครงการ"
                            description={
                              canLoseLoginAfterRemoval(member)
                                ? `${member.name} มีหน้าที่โครงการนี้เพียงงานเดียว หากนำออกจะไม่สามารถเข้าสู่ระบบได้`
                                : `ยืนยันการนำ ${member.name} ออกจากทีมโครงการ`
                            }
                            okText="นำออก"
                            cancelText="ยกเลิก"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => void handleRemove(member)}
                          >
                            <Button
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              loading={removeMember.isPending}
                            >
                              นำออกจากทีม
                            </Button>
                          </Popconfirm>
                        </div>
                      )}
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="ยังไม่มีสมาชิกโครงการ" />
        )}
      </Card>

      <Modal
        open={inviteOpen}
        title="เชิญสมาชิกเข้าทีมโครงการ"
        onCancel={() => {
          setInviteOpen(false);
          setInviteUserId(undefined);
        }}
        onOk={() => void handleInvite()}
        okText="เพิ่มสมาชิก"
        cancelText="ยกเลิก"
        okButtonProps={{
          loading: addMember.isPending,
          style: {
            backgroundColor: COLORS.accentTeal,
            borderColor: COLORS.accentTeal,
          },
        }}
      >
        <Form layout="vertical">
          <Form.Item label="เลือกผู้ใช้งาน">
            <Select
              value={inviteUserId}
              onChange={setInviteUserId}
              loading={loadingCandidates}
              aria-label="เลือกผู้ใช้งานเชิญ"
              placeholder="เลือก Engineer / Coordinator / Team Member / Consultant"
              options={inviteCandidates.map((user) => ({
                value: user.id,
                label: `${user.name} • ${user.role} • ${
                  ROLE_LABELS[getAssignmentRoleForUserRole(user.role)].label
                }`,
              }))}
            />
          </Form.Item>
          <Text type="secondary">
            ผู้ดูแลระบบและผู้บริหารไม่ถูกเพิ่มเป็นสมาชิกทีมโครงการ ส่วน Project Manager หลักยังคงอ้างอิงจากข้อมูลโครงการ
          </Text>
        </Form>
      </Modal>
    </div>
  );
}
