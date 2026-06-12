'use client';

import { Alert, Button, Descriptions, Divider, Drawer, List, Space, Steps, Tooltip, Typography, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

import { announce } from '@/components/a11y';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  useAsBuiltDrawings,
  useAssetRegistrations,
  useOmManualEntries,
  useTransitionHandoverPacket,
} from '@/hooks/useHandover';
import { formatThaiDateShort } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import {
  HANDOVER_STATE_LABELS,
  type HandoverPacket,
  type HandoverState,
} from '@/types/handover-packet';

import { AsBuiltSection } from './AsBuiltSection';
import { AssetSection } from './AssetSection';
import { OmManualSection } from './OmManualSection';
import {
  completenessFromRecords,
  getLegalNextHandoverStates,
  missingArtifactLabel,
  requiresCompleteness,
} from './handover-actions';

const { Text } = Typography;

/** SOP 8.1 forward path rendered as a stepper; rejected shows as error state. */
const FORWARD_PATH: HandoverState[] = ['draft', 'submitted', 'committee_review', 'accepted'];

interface PacketDetailDrawerProps {
  projectId: string;
  packet: HandoverPacket | null;
  canManage: boolean;
  open: boolean;
  onClose: () => void;
}

function SectionHeading({ children }: { children: string }) {
  return (
    <Text strong style={{ display: 'block', marginBottom: 4 }}>
      {children}
    </Text>
  );
}

export function PacketDetailDrawer({
  projectId,
  packet,
  canManage,
  open,
  onClose,
}: PacketDetailDrawerProps) {
  const packetId = packet?.id;
  const { data: drawings } = useAsBuiltDrawings(packetId);
  const { data: omEntries } = useOmManualEntries(packetId);
  const { data: assets } = useAssetRegistrations(packetId);
  const transition = useTransitionHandoverPacket(projectId);

  const completeness = completenessFromRecords(
    drawings ?? [],
    omEntries ?? [],
    assets ?? [],
  );

  const nextStates = packet ? getLegalNextHandoverStates(packet.state) : [];
  const positiveStates = nextStates.filter((state) => state !== 'rejected');
  const canReject = nextStates.includes('rejected');

  const isRejected = packet?.state === 'rejected';
  const stepIndex = packet ? FORWARD_PATH.indexOf(packet.state) : 0;

  const runTransition = async (targetState: HandoverState) => {
    if (!packetId) return;
    try {
      await transition.mutateAsync({ packetId, targetState });
      message.success(`อัปเดตชุดส่งมอบเป็น "${HANDOVER_STATE_LABELS[targetState].th}" แล้ว`);
      announce(`อัปเดตสถานะชุดส่งมอบเป็น ${HANDOVER_STATE_LABELS[targetState].th}`);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  return (
    <Drawer
      width={560}
      open={open}
      onClose={onClose}
      title="ชุดส่งมอบ (Handover Packet)"
      extra={packet ? <StatusBadge status={packet.state} type="handover" /> : null}
    >
      {packet && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Steps
            size="small"
            current={isRejected ? 2 : Math.max(stepIndex, 0)}
            status={isRejected ? 'error' : undefined}
            items={FORWARD_PATH.map((state) => ({
              title: HANDOVER_STATE_LABELS[state].th,
              description: HANDOVER_STATE_LABELS[state].en,
            }))}
          />

          {!completeness.ok && (
            <Alert
              type="warning"
              showIcon
              message="เอกสารยังไม่ครบตาม SOP 8.1 (Packet incomplete)"
              description={
                <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                  {completeness.missing.map((key) => (
                    <li key={key}>{missingArtifactLabel(key)}</li>
                  ))}
                </ul>
              }
            />
          )}

          <div>
            <SectionHeading>รายการเอกสารส่งมอบ (Completeness Checklist)</SectionHeading>
            <List
              size="small"
              dataSource={[
                {
                  key: 'as_built_drawings',
                  ok: (drawings?.length ?? 0) > 0,
                },
                ...(['operations', 'maintenance', 'safety', 'spare_parts'] as const).map(
                  (category) => ({
                    key: `om_manual_${category}`,
                    ok: (omEntries ?? []).some((entry) => entry.category === category),
                  }),
                ),
                {
                  key: 'asset_registrations',
                  ok: (assets?.length ?? 0) > 0,
                },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    {item.ok ? (
                      <CheckCircleOutlined
                        style={{ color: COLORS.successText }}
                        aria-label="ครบ (complete)"
                      />
                    ) : (
                      <CloseCircleOutlined
                        style={{ color: COLORS.errorText }}
                        aria-label="ขาด (missing)"
                      />
                    )}
                    <Text type={item.ok ? undefined : 'secondary'}>
                      {missingArtifactLabel(item.key)}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>

          {packet.warrantyStartDate && packet.warrantyEndDate && (
            <Descriptions
              size="small"
              column={1}
              items={[
                {
                  key: 'warranty',
                  label: 'ช่วงประกัน (Warranty Window)',
                  children: `${formatThaiDateShort(packet.warrantyStartDate)} – ${formatThaiDateShort(packet.warrantyEndDate)}`,
                },
              ]}
            />
          )}

          <Divider style={{ margin: '4px 0' }} />
          <SectionHeading>แบบก่อสร้างจริง (As-built Drawings)</SectionHeading>
          <AsBuiltSection packetId={packet.id} drawings={drawings ?? []} canManage={canManage} />

          <Divider style={{ margin: '4px 0' }} />
          <SectionHeading>คู่มือ O&M (O&M Manual)</SectionHeading>
          <OmManualSection packetId={packet.id} entries={omEntries ?? []} canManage={canManage} />

          <Divider style={{ margin: '4px 0' }} />
          <SectionHeading>ทะเบียนทรัพย์สิน (Asset Register)</SectionHeading>
          <AssetSection packetId={packet.id} assets={assets ?? []} canManage={canManage} />

          {canManage && (positiveStates.length > 0 || canReject) && (
            <>
              <Divider style={{ margin: '4px 0' }} />
              <SectionHeading>ดำเนินการชุดส่งมอบ (Advance Packet)</SectionHeading>
              <Space wrap>
                {positiveStates.map((state, index) => {
                  const gated = requiresCompleteness(state) && !completeness.ok;
                  const button = (
                    <Button
                      type={index === 0 ? 'primary' : 'default'}
                      disabled={gated}
                      loading={transition.isPending}
                      onClick={() => runTransition(state)}
                    >
                      {`${HANDOVER_STATE_LABELS[state].th} (${HANDOVER_STATE_LABELS[state].en})`}
                    </Button>
                  );
                  return gated ? (
                    <Tooltip
                      key={state}
                      title="ต้องมีเอกสารครบตาม SOP 8.1 ก่อน (complete artifact set required)"
                    >
                      <span>{button}</span>
                    </Tooltip>
                  ) : (
                    <span key={state}>{button}</span>
                  );
                })}
                {canReject && (
                  <Button
                    danger
                    loading={transition.isPending}
                    onClick={() => runTransition('rejected')}
                  >
                    ส่งกลับแก้ไข (Reject — Revise)
                  </Button>
                )}
              </Space>
            </>
          )}
        </Space>
      )}
    </Drawer>
  );
}
