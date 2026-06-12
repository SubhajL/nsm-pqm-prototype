'use client';

import { Button, Descriptions, Divider, Drawer, Space, Typography, message } from 'antd';

import { announce } from '@/components/a11y';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useTransitionProcurementPackage } from '@/hooks/useProcurement';
import { formatBaht, formatThaiDateShort } from '@/lib/date-utils';
import {
  PROCUREMENT_METHOD_LABELS,
  PROCUREMENT_STATE_LABELS,
  type ProcurementPackage,
  type ProcurementState,
} from '@/types/procurement-package';

import { EngineeringEstimatesSection } from './EngineeringEstimatesSection';
import { TorDocumentsSection } from './TorDocumentsSection';
import { getLegalNextProcurementStates } from './procurement-actions';

const { Text } = Typography;

interface PackageDetailDrawerProps {
  projectId: string;
  procurementPackage: ProcurementPackage | null;
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

export function PackageDetailDrawer({
  projectId,
  procurementPackage,
  canManage,
  open,
  onClose,
}: PackageDetailDrawerProps) {
  const packageId = procurementPackage?.id;
  const transition = useTransitionProcurementPackage(projectId);

  const nextStates = procurementPackage
    ? getLegalNextProcurementStates(procurementPackage.state)
    : [];
  const forwardStates = nextStates.filter((state) => state !== 'cancelled');
  const canCancel = nextStates.includes('cancelled');

  const runTransition = async (to: ProcurementState) => {
    if (!packageId) return;
    try {
      await transition.mutateAsync({ packageId, to });
      message.success(`อัปเดตชุดจัดซื้อเป็น "${PROCUREMENT_STATE_LABELS[to].th}" แล้ว`);
      announce(`อัปเดตสถานะชุดจัดซื้อเป็น ${PROCUREMENT_STATE_LABELS[to].th}`);
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
      title={procurementPackage ? procurementPackage.name : 'ชุดจัดซื้อ (Package)'}
      extra={
        procurementPackage ? (
          <StatusBadge status={procurementPackage.state} type="procurement" />
        ) : null
      }
    >
      {procurementPackage && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Descriptions
            size="small"
            column={1}
            items={[
              {
                key: 'method',
                label: 'วิธีจัดหา (Method)',
                children: `${PROCUREMENT_METHOD_LABELS[procurementPackage.procurementMethod].th} (${PROCUREMENT_METHOD_LABELS[procurementPackage.procurementMethod].en})`,
              },
              {
                key: 'budget',
                label: 'วงเงิน (Budget Ceiling)',
                children: formatBaht(procurementPackage.budgetCeiling),
              },
              {
                key: 'opened',
                label: 'เปิดประมูล (Opened)',
                children: procurementPackage.openedAt
                  ? formatThaiDateShort(procurementPackage.openedAt)
                  : '—',
              },
              {
                key: 'closed',
                label: 'ปิดรับข้อเสนอ (Closed)',
                children: procurementPackage.closedAt
                  ? formatThaiDateShort(procurementPackage.closedAt)
                  : '—',
              },
            ]}
          />

          <Divider style={{ margin: '4px 0' }} />
          <SectionHeading>เอกสาร TOR (TOR Revisions)</SectionHeading>
          <TorDocumentsSection packageId={procurementPackage.id} canManage={canManage} />

          <Divider style={{ margin: '4px 0' }} />
          <SectionHeading>ราคากลาง (Engineering Estimates)</SectionHeading>
          <EngineeringEstimatesSection
            packageId={procurementPackage.id}
            canManage={canManage}
          />

          {canManage && (forwardStates.length > 0 || canCancel) && (
            <>
              <Divider style={{ margin: '4px 0' }} />
              <SectionHeading>ดำเนินการชุดจัดซื้อ (Advance Package)</SectionHeading>
              <Space wrap>
                {forwardStates.map((state, index) => (
                  <Button
                    key={state}
                    type={index === 0 ? 'primary' : 'default'}
                    loading={transition.isPending}
                    onClick={() => runTransition(state)}
                  >
                    {`${PROCUREMENT_STATE_LABELS[state].th} (${PROCUREMENT_STATE_LABELS[state].en})`}
                  </Button>
                ))}
                {canCancel && (
                  <Button
                    danger
                    loading={transition.isPending}
                    onClick={() => runTransition('cancelled')}
                  >
                    ยกเลิกชุดจัดซื้อ (Cancel)
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
