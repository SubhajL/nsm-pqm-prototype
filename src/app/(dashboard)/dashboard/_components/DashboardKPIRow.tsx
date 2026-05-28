'use client';

import { Col, Row } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';

import { KPICard } from '@/components/common/KPICard';
import { COLORS, PROJECT_STATUS_COLORS } from '@/theme/antd-theme';

import type { DashboardStatusFilter } from './helpers';

export function DashboardKPIRow({
  totalProjects,
  inProgressCount,
  planningCount,
  completedCount,
  inProgressPct,
  planningPct,
  completedPct,
  statusFilter,
  onStatusFilterChange,
}: {
  totalProjects: number;
  inProgressCount: number;
  planningCount: number;
  completedCount: number;
  inProgressPct: string;
  planningPct: string;
  completedPct: string;
  statusFilter: DashboardStatusFilter;
  onStatusFilterChange: (next: DashboardStatusFilter) => void;
}) {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <KPICard
          title="โครงการทั้งหมด (Total Projects)"
          value={totalProjects}
          icon={<FolderOutlined />}
          color={COLORS.info}
          subtitle="งบประมาณปี 2569"
          active={statusFilter === 'all'}
          onClick={() => onStatusFilterChange('all')}
        />
      </Col>
      <Col span={6}>
        <KPICard
          title="กำลังดำเนินการ (In Progress)"
          value={inProgressCount}
          icon={<ClockCircleOutlined />}
          color={COLORS.accentTeal}
          subtitle={`${inProgressPct}% ของทั้งหมด`}
          active={statusFilter === 'in_progress'}
          onClick={() => onStatusFilterChange('in_progress')}
        />
      </Col>
      <Col span={6}>
        <KPICard
          title="วางแผน (Planning)"
          value={planningCount}
          icon={<ScheduleOutlined />}
          color={PROJECT_STATUS_COLORS.planning}
          subtitle={`${planningPct}% ของทั้งหมด`}
          active={statusFilter === 'planning'}
          onClick={() => onStatusFilterChange('planning')}
        />
      </Col>
      <Col span={6}>
        <KPICard
          title="เสร็จสิ้น (Completed)"
          value={completedCount}
          icon={<CheckCircleOutlined />}
          color={COLORS.success}
          subtitle={`${completedPct}% ของทั้งหมด`}
          active={statusFilter === 'completed'}
          onClick={() => onStatusFilterChange('completed')}
        />
      </Col>
    </Row>
  );
}
