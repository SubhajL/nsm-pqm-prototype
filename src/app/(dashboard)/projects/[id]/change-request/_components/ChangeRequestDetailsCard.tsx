'use client';

import { Button, Card, Descriptions, List, Steps, Tag, Typography } from 'antd';
import {
  ArrowUpOutlined,
  DownloadOutlined,
  FileOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import { formatBahtCurrency, formatThaiDate } from '@/lib/date-utils';
import type { ChangeRequest } from '@/types/document';
import { CR_PRIORITY_LABELS, CR_STATUS_LABELS } from '@/types/document';

const { Text } = Typography;

export function ChangeRequestDetailsCard({
  selectedChangeRequest,
}: {
  selectedChangeRequest: ChangeRequest;
}) {
  const workflowItems = selectedChangeRequest.workflow.map((step) => {
    let status: 'finish' | 'process' | 'wait' | 'error' = 'wait';
    if (step.status === 'done') status = 'finish';
    else if (step.status === 'current') status = 'process';
    else if (step.status === 'rejected') status = 'error';

    return {
      title: step.step,
      description: (
        <span>
          {step.user}
          {step.date ? ` — ${formatThaiDate(step.date)}` : ''}
        </span>
      ),
      status,
    };
  });

  const currentIndex = selectedChangeRequest.workflow.findIndex(
    (step) => step.status === 'current',
  );
  const current = currentIndex >= 0 ? currentIndex : 0;

  return (
    <Card
      title={
        <span>
          Change Request {selectedChangeRequest.id}
          <Tag
            color={CR_STATUS_LABELS[selectedChangeRequest.status].color}
            style={{ marginLeft: 8 }}
          >
            {CR_STATUS_LABELS[selectedChangeRequest.status].label}
          </Tag>
        </span>
      }
      style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
    >
      <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle">
        <Descriptions.Item label="หัวข้อ (Title)" span={2}>
          {selectedChangeRequest.title}
        </Descriptions.Item>
        <Descriptions.Item label="เหตุผล (Reason)" span={2}>
          {selectedChangeRequest.reason}
        </Descriptions.Item>
        <Descriptions.Item label="ผลกระทบงบประมาณ (Budget Impact)">
          <span
            style={{
              color:
                selectedChangeRequest.budgetImpact > 0 ? COLORS.error : COLORS.success,
              fontWeight: 600,
            }}
          >
            {selectedChangeRequest.budgetImpact > 0 ? (
              <ArrowUpOutlined style={{ marginRight: 4 }} />
            ) : null}
            {selectedChangeRequest.budgetImpact > 0 ? '+' : ''}
            {formatBahtCurrency(selectedChangeRequest.budgetImpact)}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="ผลกระทบเวลา (Schedule Impact)">
          <span style={{ color: COLORS.warning, fontWeight: 600 }}>
            +{selectedChangeRequest.scheduleImpact} วัน
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="เชื่อมโยง WBS (Linked WBS)">
          {selectedChangeRequest.linkedWbs}
        </Descriptions.Item>
        <Descriptions.Item label="ระดับความสำคัญ (Priority)">
          <Tag color={CR_PRIORITY_LABELS[selectedChangeRequest.priority].color}>
            {CR_PRIORITY_LABELS[selectedChangeRequest.priority].label}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 24 }}>
        <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
          เอกสารแนบ (Attachments)
        </Text>
        <List
          size="small"
          bordered
          dataSource={selectedChangeRequest.attachments}
          locale={{ emptyText: 'ยังไม่มีเอกสารแนบ' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="download" type="link" icon={<DownloadOutlined />} size="small">
                  ดาวน์โหลด
                </Button>,
              ]}
            >
              <span>
                <FileOutlined style={{ marginRight: 8, color: COLORS.info }} />
                {item}
              </span>
            </List.Item>
          )}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 16 }}>
          ขั้นตอนอนุมัติ (Approval Workflow)
        </Text>
        <Steps
          current={current}
          items={workflowItems.map((item) => ({
            title: item.title,
            description: item.description,
            status: item.status,
          }))}
        />
      </div>
    </Card>
  );
}
