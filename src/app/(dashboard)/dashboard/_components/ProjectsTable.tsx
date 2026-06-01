'use client';

import { Card, Col, Input, Progress, Row, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { EmptyState } from '@/components/common';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatBaht } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import type { Project } from '@/types/project';
import { DELIVERY_METHOD_LABELS, PROJECT_CLASS_LABELS } from '@/types/project';
import type { DeliveryMethod, ProjectClass } from '@/types/rid/vocabulary';

import { BilingualTagCell, BilingualTextCell } from './BilingualCells';
import {
  DASHBOARD_STATUS_LABELS,
  STATUS_FILTER_OPTIONS,
  getProjectDisplayStatus,
  type ProjectDisplayStatus,
} from './helpers';

export function ProjectsTable({
  filteredProjects,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  tableStatusFilter,
  onTableStatusFilterChange,
}: {
  filteredProjects: Project[];
  search: string;
  onSearchChange: (next: string) => void;
  typeFilter: string | undefined;
  onTypeFilterChange: (next: string | undefined) => void;
  tableStatusFilter: ProjectDisplayStatus | undefined;
  onTableStatusFilterChange: (next: ProjectDisplayStatus | undefined) => void;
}) {
  const columns: ColumnsType<Project> = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_val, _rec, index) => index + 1,
    },
    {
      title: 'ชื่อโครงการ (Project Name)',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Project) => (
        <Link href={`/projects/${record.id}`} style={{ color: COLORS.info }}>
          {name}
        </Link>
      ),
    },
    {
      title: 'ประเภท (Class)',
      dataIndex: 'projectClass',
      key: 'projectClass',
      width: 170,
      render: (projectClass: ProjectClass) => {
        const label = PROJECT_CLASS_LABELS[projectClass];
        return label ? <BilingualTextCell th={label.th} en={label.en} secondary /> : projectClass;
      },
    },
    {
      title: 'รูปแบบดำเนินงาน (Delivery Method)',
      dataIndex: 'deliveryMethod',
      key: 'deliveryMethod',
      width: 170,
      render: (deliveryMethod: DeliveryMethod) => {
        const label = DELIVERY_METHOD_LABELS[deliveryMethod];
        if (!label) return deliveryMethod;

        return (
          <BilingualTagCell
            th={label.th}
            en={label.en}
            color={deliveryMethod === 'outsourced' ? 'gold' : 'cyan'}
          />
        );
      },
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (_status: string, record: Project) => {
        const displayStatus = getProjectDisplayStatus(record);
        const label = DASHBOARD_STATUS_LABELS[displayStatus];

        return label ? (
          <BilingualTagCell th={label.th} en={label.en} color={label.color} />
        ) : (
          <StatusBadge status={displayStatus} type="project" />
        );
      },
    },
    {
      title: 'ความก้าวหน้า (Progress)',
      dataIndex: 'progress',
      key: 'progress',
      width: 160,
      render: (progress: number) => (
        <Progress
          percent={Math.round(progress * 100)}
          size="small"
          strokeColor={COLORS.accentTeal}
        />
      ),
    },
    {
      title: 'งบประมาณ (Budget)',
      dataIndex: 'budget',
      key: 'budget',
      width: 150,
      align: 'right',
      render: (budget: number) => `${formatBaht(budget)} บาท`,
    },
    {
      title: 'ผจก.โครงการ (PM)',
      dataIndex: 'managerName',
      key: 'managerName',
      width: 180,
    },
  ];

  return (
    <Card
      title="รายการโครงการทั้งหมด (All Projects)"
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder="ค้นหาโครงการ... (Search projects)"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
          />
        </Col>
        <Col span={6}>
          <Select
            placeholder="ประเภทโครงการ (Project Class)"
            value={typeFilter}
            onChange={(val) => onTypeFilterChange(val)}
            allowClear
            style={{ width: '100%' }}
            options={Object.entries(PROJECT_CLASS_LABELS).map(
              ([key, label]) => ({
                value: key,
                label: `${label.th} (${label.en})`,
              }),
            )}
          />
        </Col>
        <Col span={6}>
          <Select
            showSearch
            placeholder="สถานะโครงการ (Project Status)"
            value={tableStatusFilter}
            onChange={(val) => onTableStatusFilterChange(val)}
            allowClear
            optionFilterProp="label"
            style={{ width: '100%' }}
            options={STATUS_FILTER_OPTIONS}
          />
        </Col>
      </Row>
      <Table<Project>
        columns={columns}
        dataSource={filteredProjects}
        rowKey="id"
        scroll={{ x: 1280 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          position: ['bottomLeft'],
        }}
        size="middle"
        locale={{
          emptyText: (
            <EmptyState
              size="small"
              title="ไม่พบโครงการ (No projects found)"
              description="ลองล้างตัวกรองหรือสร้างโครงการใหม่ (Try clearing filters or create a new project)"
            />
          ),
        }}
      />
    </Card>
  );
}
