'use client';

import { Button, Divider, Drawer, List, Space, Tooltip, Typography, message } from 'antd';

import { announce } from '@/components/a11y';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  useCommitteeInspections,
  useDeliverySlips,
  usePaymentVouchers,
  useTransitionWorkPeriod,
} from '@/hooks/useWorkPeriods';
import type { DeliveryMethod } from '@/types/rid/vocabulary';
import {
  WORK_PERIOD_STATE_LABELS,
  type WorkPeriod,
  type WorkPeriodState,
} from '@/types/work-period';

import { CommitteeInspectionSection } from './CommitteeInspectionSection';
import { DeliverySlipSection } from './DeliverySlipSection';
import { PaymentVoucherSection } from './PaymentVoucherSection';
import {
  evidenceReadyForState,
  getLegalNextWorkPeriodStates,
  type EvidencePresence,
} from './work-period-actions';

const { Text } = Typography;

interface WorkPeriodDetailDrawerProps {
  projectId: string;
  workPeriod: WorkPeriod | null;
  deliveryMethod: DeliveryMethod;
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

export function WorkPeriodDetailDrawer({
  projectId,
  workPeriod,
  deliveryMethod,
  canManage,
  open,
  onClose,
}: WorkPeriodDetailDrawerProps) {
  const workPeriodId = workPeriod?.id;
  const { data: slips } = useDeliverySlips(workPeriodId);
  const { data: inspections } = useCommitteeInspections(workPeriodId);
  const { data: vouchers } = usePaymentVouchers(workPeriodId);
  const transition = useTransitionWorkPeriod(projectId);

  const presence: EvidencePresence = {
    hasDeliverySlip: (slips?.length ?? 0) > 0,
    hasCommitteeInspection: (inspections?.length ?? 0) > 0,
    paymentVoucherState: vouchers?.[0]?.state ?? null,
  };

  const showCommittee = deliveryMethod !== 'in_house';
  const nextStates = workPeriod
    ? getLegalNextWorkPeriodStates(workPeriod.state, deliveryMethod)
    : [];
  const forwardStates = nextStates.filter((state) => state !== 'cancelled');
  const canCancel = nextStates.includes('cancelled');

  const runTransition = async (targetState: WorkPeriodState) => {
    if (!workPeriodId) return;
    try {
      await transition.mutateAsync({ workPeriodId, targetState });
      message.success(`อัปเดตงวดงานเป็น "${WORK_PERIOD_STATE_LABELS[targetState].th}" แล้ว`);
      announce(`อัปเดตสถานะงวดงานเป็น ${WORK_PERIOD_STATE_LABELS[targetState].th}`);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  return (
    <Drawer
      width={520}
      open={open}
      onClose={onClose}
      title={
        workPeriod
          ? `งวดที่ ${workPeriod.number}: ${workPeriod.title}`
          : 'งวดงาน (Work Period)'
      }
      extra={
        workPeriod ? <StatusBadge status={workPeriod.state} type="workPeriod" /> : null
      }
    >
      {workPeriod && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {workPeriod.deliverables.length > 0 && (
            <div>
              <SectionHeading>รายการส่งมอบ (Deliverables)</SectionHeading>
              <List
                size="small"
                dataSource={workPeriod.deliverables}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            </div>
          )}

          <Divider style={{ margin: '4px 0' }} />
          <SectionHeading>ใบส่งมอบงาน (Delivery Slips)</SectionHeading>
          <DeliverySlipSection
            workPeriodId={workPeriod.id}
            slips={slips ?? []}
            canManage={canManage}
          />

          {showCommittee && (
            <>
              <Divider style={{ margin: '4px 0' }} />
              <SectionHeading>การตรวจรับโดยคณะกรรมการ (Committee Inspection)</SectionHeading>
              <CommitteeInspectionSection
                workPeriodId={workPeriod.id}
                inspections={inspections ?? []}
                canManage={canManage}
              />
            </>
          )}

          <Divider style={{ margin: '4px 0' }} />
          <SectionHeading>ฎีกาเบิกจ่าย (Payment Voucher)</SectionHeading>
          <PaymentVoucherSection
            workPeriodId={workPeriod.id}
            vouchers={vouchers ?? []}
            canManage={canManage}
          />

          {canManage && (forwardStates.length > 0 || canCancel) && (
            <>
              <Divider style={{ margin: '4px 0' }} />
              <SectionHeading>ดำเนินการงวดงาน (Advance Work Period)</SectionHeading>
              <Space wrap>
                {forwardStates.map((state, index) => {
                  const ready = evidenceReadyForState(state, presence);
                  // One primary per surface: the first (positive) forward
                  // step is primary; alternatives (e.g. inspection_failed)
                  // demote to default.
                  const button = (
                    <Button
                      type={index === 0 ? 'primary' : 'default'}
                      disabled={!ready}
                      loading={transition.isPending}
                      onClick={() => runTransition(state)}
                    >
                      {`${WORK_PERIOD_STATE_LABELS[state].th} (${WORK_PERIOD_STATE_LABELS[state].en})`}
                    </Button>
                  );
                  return ready ? (
                    <span key={state}>{button}</span>
                  ) : (
                    <Tooltip
                      key={state}
                      title="ต้องบันทึกเอกสารหลักฐานในขั้นตอนนี้ก่อน (evidence record required)"
                    >
                      <span>{button}</span>
                    </Tooltip>
                  );
                })}
                {canCancel && (
                  <Button danger loading={transition.isPending} onClick={() => runTransition('cancelled')}>
                    ยกเลิกงวดงาน (Cancel)
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
