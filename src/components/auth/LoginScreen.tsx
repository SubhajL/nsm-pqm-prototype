'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Card, Radio, Space, Spin, Tag, Typography, message } from 'antd';
import { LoginOutlined, UserOutlined } from '@ant-design/icons';
import { apiPost } from '@/lib/api-client';
import { getRoleMenuLabels } from '@/lib/project-access';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS } from '@/theme/antd-theme';
import { useLoginCandidates } from '@/hooks/useLoginCandidates';
import type { User } from '@/types/admin';

const { Title, Text } = Typography;

interface LoginResponse {
  user: User;
}
interface LoginScreenProps {
  nextPath: string | null;
}

export function LoginScreen({ nextPath }: LoginScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuthReady = useAuthStore((s) => s.setAuthReady);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const { data: loginCandidates, isLoading } = useLoginCandidates();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const selectedUser = useMemo(
    () => loginCandidates?.find((user) => user.id === selectedUserId) ?? null,
    [loginCandidates, selectedUserId],
  );

  useEffect(() => {
    if (!loginCandidates?.length) {
      setSelectedUserId('');
      return;
    }

    setSelectedUserId((current) => {
      if (current && loginCandidates.some((candidate) => candidate.id === current)) {
        return current;
      }

      return (
        loginCandidates.find((candidate) => candidate.canLogin)?.id ??
        loginCandidates[0]?.id ??
        ''
      );
    });
  }, [loginCandidates]);

  const handleLogin = async () => {
    if (!selectedUserId) {
      message.warning('กรุณาเลือกผู้ใช้งานสำหรับทดลองเข้าสู่ระบบ');
      return;
    }

    if (!selectedUser?.canLogin) {
      message.warning('ผู้ใช้งานนี้ยังไม่มีหน้าที่โครงการ จึงยังไม่สามารถเข้าสู่ระบบได้');
      return;
    }

    setSubmitting(true);

    try {
      await apiPost<LoginResponse>('/auth/login', { userId: selectedUserId });
      queryClient.clear();
      setCurrentProject(null);
      setAuthReady(false);
      message.success('เข้าสู่ระบบสำเร็จ');

      router.replace(nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard');
      router.refresh();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'ไม่สามารถเข้าสู่ระบบได้',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F5F7FA 0%, #E8F4F1 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 720,
          borderRadius: 12,
          boxShadow: '0 12px 28px rgba(30,58,95,0.12)',
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div>
            <Title level={2} style={{ marginBottom: 8 }}>
              เข้าสู่ระบบต้นแบบ PQM
            </Title>
            <Text type="secondary">
              เลือกผู้ใช้งานจำลองเพื่อทดสอบสิทธิ์การเข้าถึงเมนู หน้าจอผู้บริหาร และผู้ดูแลระบบ
            </Text>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Spin />
            </div>
          ) : (
            <Radio.Group
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {(loginCandidates ?? []).map((user) => (
                  <Card
                    key={user.id}
                    size="small"
                    onClick={() => setSelectedUserId(user.id)}
                    style={{
                      cursor: 'pointer',
                      opacity: user.canLogin ? 1 : 0.72,
                      borderColor: selectedUserId === user.id ? COLORS.accentTeal : '#E8ECF1',
                      boxShadow:
                        selectedUserId === user.id
                          ? '0 0 0 2px rgba(0,184,148,0.12)'
                          : 'none',
                    }}
                  >
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space size={12}>
                        <Radio value={user.id} disabled={!user.canLogin} />
                        <Avatar icon={<UserOutlined />} style={{ backgroundColor: COLORS.primary }} />
                        <div>
                          <Text strong>{user.name}</Text>
                          <div>
                            <Text type="secondary">
                              {user.position} • {user.department}
                            </Text>
                          </div>
                          {!user.canLogin && (
                            <div>
                              <Text type="warning">
                                ยังไม่มีหน้าที่โครงการ ต้องได้รับมอบหมายก่อนจึงเข้าสู่ระบบได้
                              </Text>
                            </div>
                          )}
                        </div>
                      </Space>
                      <Space direction="vertical" size={4} style={{ alignItems: 'flex-end' }}>
                        <Tag color="blue">{user.role}</Tag>
                        <Tag color={user.canLogin ? 'green' : 'gold'}>
                          {user.canLogin ? 'พร้อมใช้งาน' : 'รอมอบหมายโครงการ'}
                        </Tag>
                      </Space>
                    </Space>
                  </Card>
                ))}
              </Space>
            </Radio.Group>
          )}

          {selectedUser && (
            <Card size="small" style={{ background: '#FAFBFC', borderColor: '#E8ECF1' }}>
              <Text strong>สิทธิ์ที่คาดว่าจะได้:</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  {selectedUser.role === 'System Admin'
                    ? 'เห็นทุกโครงการและทุกเมนู รวมถึง Admin และ Executive'
                    : selectedUser.role === 'Executive'
                      ? 'เห็นทุกโครงการในมุมผู้บริหาร และเข้าเมนู Reports ได้ แต่ไม่เข้า Admin'
                      : 'เห็นเฉพาะโครงการที่ได้รับมอบหมาย และไม่เข้า Admin หรือ Executive'}
                </Text>
              </div>
              <div style={{ marginTop: 12 }}>
                <Text strong>เมนูที่มองเห็น:</Text>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {getRoleMenuLabels(selectedUser.role).map((label) => (
                    <Tag key={label} color="blue">
                      {label}
                    </Tag>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Text strong>สถานะการเข้าสู่ระบบ:</Text>{' '}
                <Tag color={selectedUser.canLogin ? 'green' : 'gold'}>
                  {selectedUser.canLogin ? 'เข้าสู่ระบบได้' : 'ต้องรอมอบหมายโครงการ'}
                </Tag>
              </div>
            </Card>
          )}

          <Button
            type="primary"
            icon={<LoginOutlined />}
            size="large"
            onClick={handleLogin}
            disabled={!selectedUser || !selectedUser.canLogin || isLoading}
            loading={submitting}
            style={{
              alignSelf: 'flex-end',
              backgroundColor: COLORS.accentTeal,
              borderColor: COLORS.accentTeal,
            }}
          >
            เข้าสู่ระบบ
          </Button>
        </Space>
      </Card>
    </div>
  );
}
