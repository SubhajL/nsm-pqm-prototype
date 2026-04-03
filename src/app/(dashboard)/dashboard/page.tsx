'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Input,
  Progress,
  Row,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
  Button,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  PlusOutlined,
  ScheduleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

import { useProjects } from '@/hooks/useProjects';
import { KPICard } from '@/components/common/KPICard';
import { PortfolioBarChart } from '@/components/charts/PortfolioBarChart';
import { ProjectDonutChart } from '@/components/charts/ProjectDonutChart';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatBaht } from '@/lib/date-utils';
import { COLORS, PROJECT_STATUS_COLORS } from '@/theme/antd-theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { canCreateProject as canCreateProjectForRole } from '@/lib/auth';
import type { Project, ProjectExecutionModel, ProjectType } from '@/types/project';
import { PROJECT_EXECUTION_MODEL_LABELS, PROJECT_TYPE_LABELS } from '@/types/project';

const { Text, Title } = Typography;

type ProjectDisplayStatus = Project['status'] | 'on_schedule' | 'watch' | 'delayed';
type DashboardStatusFilter = 'all' | 'in_progress' | 'planning' | 'completed';

const TYPE_LABEL_MAP: Record<string, string> = {
  construction: 'ก่อสร้าง/ปรับปรุง (Construction)',
  it: 'พัฒนาระบบ IT (IT/Software)',
  equipment: 'จัดซื้อครุภัณฑ์ (Equipment)',
  academic: 'วิชาการ (Academic)',
  renovation: 'ตกแต่งพื้นที่จัดแสดง (Renovation)',
};

const STATUS_FILTER_OPTIONS: Array<{
  value: ProjectDisplayStatus;
  label: string;
}> = [
  { value: 'on_schedule', label: 'ตามแผน (On Schedule)' },
  { value: 'watch', label: 'เฝ้าระวัง (Watch)' },
  { value: 'delayed', label: 'ล่าช้า (Delayed)' },
  { value: 'planning', label: 'วางแผน (Planning)' },
  { value: 'completed', label: 'เสร็จสิ้น (Completed)' },
];

const DASHBOARD_STATUS_LABELS: Record<
  ProjectDisplayStatus,
  { th: string; en: string; color: string }
> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  planning: { th: 'วางแผน', en: 'Planning', color: PROJECT_STATUS_COLORS.planning },
  in_progress: { th: 'กำลังดำเนินการ', en: 'In Progress', color: PROJECT_STATUS_COLORS.inProgress },
  on_hold: { th: 'หยุดชั่วคราว', en: 'On Hold', color: 'warning' },
  completed: { th: 'เสร็จสิ้น', en: 'Completed', color: 'success' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled', color: 'error' },
  on_schedule: { th: 'ตามแผน', en: 'On Schedule', color: 'green' },
  watch: { th: 'เฝ้าระวัง', en: 'Watch', color: PROJECT_STATUS_COLORS.watch },
  delayed: { th: 'ล่าช้า', en: 'Delayed', color: PROJECT_STATUS_COLORS.delayed },
};

function BilingualTextCell({
  th,
  en,
  secondary = false,
}: {
  th: string;
  en: string;
  secondary?: boolean;
}) {
  return (
    <div style={{ lineHeight: 1.25 }}>
      <div>{th}</div>
      <Text type={secondary ? 'secondary' : undefined} style={{ fontSize: 12 }}>
        {en}
      </Text>
    </div>
  );
}

function BilingualTagCell({
  th,
  en,
  color,
}: {
  th: string;
  en: string;
  color: string;
}) {
  return (
    <Tag color={color} style={{ paddingBlock: 4, whiteSpace: 'normal', lineHeight: 1.2 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <span>{th}</span>
        <span style={{ fontSize: 11 }}>{en}</span>
      </div>
    </Tag>
  );
}

function getProjectDisplayStatus(project: Project): ProjectDisplayStatus {
  if (project.status !== 'in_progress') {
    return project.status;
  }

  return project.scheduleHealth ?? 'on_schedule';
}

export default function PortfolioDashboardPage() {
  const { data: projects, isLoading, isError, error, refetch } = useProjects();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [tableStatusFilter, setTableStatusFilter] = useState<ProjectDisplayStatus | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>('all');
  const canCreateProject = canCreateProjectForRole(currentUser?.role);

  const {
    totalProjects,
    inProgressCount,
    completedCount,
    planningCount,
  } = useMemo(() => {
    if (!projects) {
      return {
        totalProjects: 0,
        inProgressCount: 0,
        completedCount: 0,
        planningCount: 0,
      };
    }

    const inProgressProjects = projects.filter((project) => project.status === 'in_progress');

    return {
      totalProjects: projects.length,
      inProgressCount: inProgressProjects.length,
      completedCount: projects.filter((project) => project.status === 'completed').length,
      planningCount: projects.filter((project) => project.status === 'planning').length,
    };
  }, [projects]);

  const scopedProjects = useMemo(() => {
    if (!projects) return [];
    if (statusFilter === 'all') return projects;
    return projects.filter((project) => project.status === statusFilter);
  }, [projects, statusFilter]);

  // Donut chart data: count by type
  const donutData = useMemo(() => {
    if (!scopedProjects.length) return [];
    const typeCounts: Record<string, number> = {};
    scopedProjects.forEach((p) => {
      typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
    });
    return Object.entries(typeCounts).map(([type, count]) => ({
      name: TYPE_LABEL_MAP[type] ?? type,
      value: count,
    }));
  }, [scopedProjects]);

  const departmentStatusData = useMemo(() => {
    if (!scopedProjects.length) return [];

    const departmentMap = new Map<
      string,
      {
        department: string;
        onSchedule: number;
        watch: number;
        delayed: number;
        planning: number;
        completed: number;
      }
    >();

    scopedProjects.forEach((project) => {
      const current =
        departmentMap.get(project.departmentId) ?? {
          department: project.departmentName,
          onSchedule: 0,
          watch: 0,
          delayed: 0,
          planning: 0,
          completed: 0,
        };

      const displayStatus = getProjectDisplayStatus(project);

      if (displayStatus === 'on_schedule') {
        current.onSchedule += 1;
      } else if (displayStatus === 'watch') {
        current.watch += 1;
      } else if (displayStatus === 'delayed') {
        current.delayed += 1;
      } else if (displayStatus === 'planning') {
        current.planning += 1;
      } else if (displayStatus === 'completed') {
        current.completed += 1;
      }

      departmentMap.set(project.departmentId, current);
    });

    return Array.from(departmentMap.values()).sort(
      (a, b) =>
        b.onSchedule +
          b.watch +
          b.delayed +
          b.planning +
          b.completed -
        (a.onSchedule + a.watch + a.delayed + a.planning + a.completed),
    );
  }, [scopedProjects]);

  // Filtered table data
  const filteredProjects = useMemo(() => {
    if (!scopedProjects.length) return [];
    return scopedProjects.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || p.type === typeFilter;
      const matchStatus =
        !tableStatusFilter || getProjectDisplayStatus(p) === tableStatusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [scopedProjects, search, tableStatusFilter, typeFilter]);

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
      title: 'ประเภท (Type)',
      dataIndex: 'type',
      key: 'type',
      width: 170,
      render: (type: ProjectType) => {
        const label = PROJECT_TYPE_LABELS[type];
        return label ? <BilingualTextCell th={label.th} en={label.en} secondary /> : type;
      },
    },
    {
      title: 'รูปแบบดำเนินงาน (Execution)',
      dataIndex: 'executionModel',
      key: 'executionModel',
      width: 170,
      render: (executionModel: ProjectExecutionModel) => {
        const label = PROJECT_EXECUTION_MODEL_LABELS[executionModel];
        if (!label) return executionModel;

        return (
          <BilingualTagCell
            th={label.th}
            en={label.en}
            color={executionModel === 'outsourced' ? 'gold' : 'cyan'}
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

  if (isLoading) {
    return (
      <div>
        <Title level={3}>แดชบอร์ดภาพรวมโครงการ (Portfolio Dashboard)</Title>
        <Row gutter={16}>
          {[1, 2, 3, 4].map((i) => (
            <Col span={6} key={i}>
              <Card>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={14}>
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </Col>
          <Col span={10}>
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </Col>
        </Row>
        <Card style={{ marginTop: 16 }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <Title level={3}>แดชบอร์ดภาพรวมโครงการ (Portfolio Dashboard)</Title>
        <Alert
          type="error"
          showIcon
          message="ไม่สามารถโหลดข้อมูลโครงการได้"
          description={error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง'}
          action={
            <Button size="small" onClick={() => void refetch()}>
              ลองใหม่
            </Button>
          }
        />
      </div>
    );
  }

  const inProgressPct =
    totalProjects > 0
      ? ((inProgressCount / totalProjects) * 100).toFixed(1)
      : '0';
  const completedPct =
    totalProjects > 0
      ? ((completedCount / totalProjects) * 100).toFixed(1)
      : '0';
  const planningPct =
    totalProjects > 0
      ? ((planningCount / totalProjects) * 100).toFixed(1)
      : '0';

  return (
    <div style={{ position: 'relative' }}>
      {/* Page Title */}
      <Title level={3} style={{ marginBottom: 24 }}>
        แดชบอร์ดภาพรวมโครงการ (Portfolio Dashboard)
      </Title>

      {/* KPI Cards Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <KPICard
            title="โครงการทั้งหมด (Total Projects)"
            value={totalProjects}
            icon={<FolderOutlined />}
            color={COLORS.info}
            subtitle="งบประมาณปี 2569"
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
        </Col>
        <Col span={6}>
          <KPICard
            title="กำลังดำเนินการ (In Progress)"
            value={inProgressCount}
            icon={<ClockCircleOutlined />}
            color="#00B894"
            subtitle={`${inProgressPct}% ของทั้งหมด`}
            active={statusFilter === 'in_progress'}
            onClick={() => setStatusFilter('in_progress')}
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
            onClick={() => setStatusFilter('planning')}
          />
        </Col>
        <Col span={6}>
          <KPICard
            title="เสร็จสิ้น (Completed)"
            value={completedCount}
            icon={<CheckCircleOutlined />}
            color="#27AE60"
            subtitle={`${completedPct}% ของทั้งหมด`}
            active={statusFilter === 'completed'}
            onClick={() => setStatusFilter('completed')}
          />
        </Col>
      </Row>

      {/* Charts Row */}
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

      {/* Project Table */}
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
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="ประเภทโครงการ (Project Type)"
              value={typeFilter}
              onChange={(val) => setTypeFilter(val)}
              allowClear
              style={{ width: '100%' }}
              options={Object.entries(PROJECT_TYPE_LABELS).map(
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
              onChange={(val) => setTableStatusFilter(val)}
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
        />
      </Card>

      {/* Floating Action Button */}
      {canCreateProject && (
        <Link href="/projects/new">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            style={{
              position: 'fixed',
              bottom: 32,
              right: 32,
              zIndex: 100,
              backgroundColor: '#00B894',
              borderColor: '#00B894',
              borderRadius: 8,
              height: 48,
              paddingInline: 24,
              boxShadow: '0 4px 12px rgba(0,184,148,0.4)',
            }}
          >
            สร้างโครงการใหม่
          </Button>
        </Link>
      )}
    </div>
  );
}
