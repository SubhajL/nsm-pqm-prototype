'use client';

import { Button, Card, Space, Tag, message } from 'antd';
import {
  EditOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import type { WorkflowStatus } from '@/types/quality';
import { WORKFLOW_LABELS } from './constants';

export function WorkflowButtonsCard({
  inspectionId,
  workflowStatus,
  hasFailItems,
  updateStatusPending,
  onConfirm,
  onSign,
}: {
  inspectionId: string;
  workflowStatus: WorkflowStatus;
  hasFailItems: boolean;
  updateStatusPending: boolean;
  onConfirm: () => Promise<void>;
  onSign: () => Promise<void>;
}) {
  // Reference inspectionId to keep prop API stable
  void inspectionId;

  return (
    <Card
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      }}
    >
      <Space size="middle" wrap align="center">
        {/* Workflow status badge */}
        <Tag
          color={WORKFLOW_LABELS[workflowStatus].color}
          style={{ fontSize: 14, padding: '4px 12px', lineHeight: '24px' }}
        >
          {WORKFLOW_LABELS[workflowStatus].label}
        </Tag>

        <Button
          icon={<SaveOutlined />}
          disabled={workflowStatus !== 'draft'}
          onClick={() => message.success('บันทึกร่างแล้ว')}
        >
          บันทึกร่าง
        </Button>
        <Button
          type="primary"
          icon={<EditOutlined />}
          disabled={workflowStatus !== 'draft' || hasFailItems}
          loading={updateStatusPending}
          style={workflowStatus === 'draft' && !hasFailItems ? {
            backgroundColor: COLORS.accentTeal,
            borderColor: COLORS.accentTeal,
          } : undefined}
          onClick={async () => {
            try {
              await onConfirm();
              message.success('ยืนยันผลตรวจเรียบร้อยแล้ว');
            } catch (error) {
              message.error(error instanceof Error ? error.message : 'ไม่สามารถยืนยันผลตรวจได้');
            }
          }}
        >
          ยืนยันผลตรวจ
        </Button>
        <Button
          icon={<SafetyCertificateOutlined />}
          disabled={workflowStatus !== 'confirmed' || hasFailItems}
          loading={updateStatusPending}
          style={workflowStatus === 'confirmed' && !hasFailItems ? {
            color: COLORS.success,
            borderColor: COLORS.success,
          } : undefined}
          onClick={async () => {
            try {
              await onSign();
              message.success('ลงนามดิจิทัลเรียบร้อยแล้ว');
            } catch (error) {
              message.error(error instanceof Error ? error.message : 'ไม่สามารถลงนามได้');
            }
          }}
        >
          ลงนามดิจิทัล
        </Button>
      </Space>
    </Card>
  );
}
