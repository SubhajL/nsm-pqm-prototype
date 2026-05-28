'use client';

import { Card, Col, Row } from 'antd';

import { PortfolioBarChart } from '@/components/charts/PortfolioBarChart';
import { ProjectDonutChart } from '@/components/charts/ProjectDonutChart';

type DepartmentRow = {
  department: string;
  onSchedule: number;
  watch: number;
  delayed: number;
  planning: number;
  completed: number;
};

type DonutSlice = { name: string; value: number };

export function DashboardCharts({
  departmentStatusData,
  donutData,
}: {
  departmentStatusData: DepartmentRow[];
  donutData: DonutSlice[];
}) {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={14}>
        <Card
          title="สถานะโครงการรายแผนก (Status by Department)"
          styles={{ body: { padding: '16px 24px' } }}
        >
          <PortfolioBarChart data={departmentStatusData} height={350} />
        </Card>
      </Col>
      <Col span={10}>
        <Card
          title="ประเภทโครงการ (Project Type)"
          styles={{ body: { padding: '16px 24px' } }}
        >
          <ProjectDonutChart data={donutData} height={350} />
        </Card>
      </Col>
    </Row>
  );
}
