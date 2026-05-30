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
          <Space size="middle" wrap>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {projectCode}
            </Text>
            <Tag color="blue">{PROJECT_CLASS_LABELS[projectClass].th}</Tag>
            <Tag color={deliveryMethod === 'outsourced' ? 'gold' : 'cyan'}>
              {DELIVERY_METHOD_LABELS[deliveryMethod].th}
            </Tag>
            {contractingModel ? (
              <Tag color="geekblue">
                {CONTRACTING_MODEL_LABELS[contractingModel].th} (
                {CONTRACTING_MODEL_LABELS[contractingModel].en})
              </Tag>
            ) : null}
            <StatusBadge status={projectStatus} type="project" />
            {projectStatus === 'in_progress' ? (
              <StatusBadge status={projectScheduleHealth} type="project" />
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
