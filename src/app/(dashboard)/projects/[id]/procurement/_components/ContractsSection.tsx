'use client';

import { useState } from 'react';
import { Button, Card, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { EmptyState } from '@/components/common';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAwardedContracts } from '@/hooks/useProcurement';
import { formatBaht, formatThaiDateShort } from '@/lib/date-utils';
import type { AwardedContract } from '@/types/awarded-contract';
import type { ProcurementPackage } from '@/types/procurement-package';
import { CONTRACTING_MODEL_LABELS } from '@/types/project';

import { ContractAmendmentsPanel } from './ContractAmendmentsPanel';
import { CreateContractModal } from './CreateContractModal';

const { Text } = Typography;

interface ContractsSectionProps {
  projectId: string;
  packages: ProcurementPackage[];
  canManage: boolean;
}

/**
 * สัญญา (awarded contracts) register. Each row expands into its amendment
 * history; effective (post-amendment) values are derived inside the panel
 * via `foldContractAmendments` so the table stays cheap.
 */
export function ContractsSection({
  projectId,
  packages,
  canManage,
}: ContractsSectionProps) {
  const { data: contracts } = useAwardedContracts(projectId);
  const [createOpen, setCreateOpen] = useState(false);

  const list = contracts ?? [];
  const awardedPackages = packages.filter((pkg) => pkg.state === 'awarded');

  const columns: ColumnsType<AwardedContract> = [
    { title: 'เลขที่สัญญา (Contract No.)', dataIndex: 'contractNumber', key: 'contractNumber' },
    { title: 'คู่สัญญา (Contractor)', dataIndex: 'contractorName', key: 'contractorName' },
    {
      title: 'รูปแบบสัญญา (Model)',
      dataIndex: 'contractingModel',
      key: 'contractingModel',
      render: (model: AwardedContract['contractingModel']) => {
        const label = CONTRACTING_MODEL_LABELS[model];
        return `${label.th} (${label.en})`;
      },
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'state',
      key: 'state',
      render: (state: AwardedContract['state']) => (
        <StatusBadge status={state} type="contract" />
      ),
    },
    {
      title: 'มูลค่าสัญญา (Amount)',
      dataIndex: 'awardAmount',
      key: 'awardAmount',
      align: 'right',
      render: (awardAmount: number) => formatBaht(awardAmount),
    },
    {
      title: 'สิ้นสุดสัญญา (Expires)',
      dataIndex: 'expirationDate',
      key: 'expirationDate',
      render: (expirationDate: string | null) =>
        expirationDate ? formatThaiDateShort(expirationDate) : '—',
    },
    {
      title: 'ประกัน (Warranty)',
      dataIndex: 'warrantyMonths',
      key: 'warrantyMonths',
      align: 'right',
      render: (warrantyMonths: number | null) =>
        warrantyMonths === null ? '—' : `${warrantyMonths} เดือน`,
    },
  ];

  return (
    <Card
      title="สัญญา (Awarded Contracts)"
      style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      extra={
        canManage && awardedPackages.length > 0 ? (
          <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            บันทึกสัญญา (Record Contract)
          </Button>
        ) : null
      }
    >
      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีสัญญา (No contracts yet)"
          description={
            awardedPackages.length === 0
              ? 'สัญญาจะบันทึกได้เมื่อชุดจัดซื้อถึงสถานะลงนามแล้ว (awarded)'
              : 'บันทึกสัญญาจากชุดจัดซื้อที่ลงนามแล้ว'
          }
        />
      ) : (
        <>
          <Table
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={list}
            pagination={false}
            expandable={{
              expandedRowRender: (contract) => (
                <ContractAmendmentsPanel contract={contract} canManage={canManage} />
              ),
            }}
          />
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            ขยายแถวเพื่อดูสัญญาแก้ไขเพิ่มเติมและมูลค่าหลังแก้ไข (expand a row
            for amendments and effective values)
          </Text>
        </>
      )}

      <CreateContractModal
        projectId={projectId}
        awardedPackages={awardedPackages}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </Card>
  );
}
