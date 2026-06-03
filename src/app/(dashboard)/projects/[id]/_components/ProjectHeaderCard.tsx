'use client';

import dynamic from 'next/dynamic';
import { Card, Col, Row, Space, Spin, Tag, Typography } from 'antd';

import { StatusBadge } from '@/components/common/StatusBadge';
import {
  CONTRACTING_MODEL_LABELS,
  DELIVERY_METHOD_LABELS,
  PROJECT_CLASS_LABELS,
  type ProjectStatus,
} from '@/types/project';
import type {
  ContractingModel,
  DeliveryMethod,
  ProjectClass,
} from '@/types/rid/vocabulary';

const { Title, Text } = Typography;

const CircularProgress = dynamic(
  () =>
    import('@/components/charts/CircularProgress').then(
      (mod) => mod.CircularProgress,
    ),
  { ssr: false, loading: () => <Spin /> },
);

export function ProjectHeaderCard({
  projectName,
  projectCode,
  projectClass,
  deliveryMethod,
  contractingModel,
  projectStatus,
  projectScheduleHealth,
  projectProgressPercent,
}: {
  projectName: string;
  projectCode: string;
  projectClass: ProjectClass;
  deliveryMethod: DeliveryMethod;
  contractingModel: ContractingModel | null;
  projectStatus: ProjectStatus;
  projectScheduleHealth: string;
  projectProgressPercent: number;
}) {
  return (
    <Card
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      }}
    >
      <Row align="middle" justify="space-between" gutter={[24, 16]}>
        <Col flex="auto">
          <Title level={3} style={{ marginBottom: 4 }}>
            {projectName}
          </Title>
          {/* G18: status badges lead the chip row so the actual urgency
              signal (delayed / on-track / planning) wins the eye over
              descriptive metadata. The three metadata chips below drop
              their colored fills and render as neutral outlined Tags so
              they read as quiet context rather than competing alerts. */}
          <Space size="middle" wrap>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {projectCode}
            </Text>
            <StatusBadge status={projectStatus} type="project" />
            {projectStatus === 'in_progress' ? (
              <StatusBadge status={projectScheduleHealth} type="project" />
            ) : null}
            <Tag>{PROJECT_CLASS_LABELS[projectClass].th}</Tag>
            <Tag>{DELIVERY_METHOD_LABELS[deliveryMethod].th}</Tag>
            {contractingModel ? (
              <Tag>
                {CONTRACTING_MODEL_LABELS[contractingModel].th} (
                {CONTRACTING_MODEL_LABELS[contractingModel].en})
              </Tag>
            ) : null}
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            สถานะโครงการหลักคำนวณอัตโนมัติจากความคืบหน้าในแผนงาน Gantt
          </Text>
        </Col>
        <Col>
          <CircularProgress percent={projectProgressPercent} size={140} />
        </Col>
      </Row>
    </Card>
  );
}
