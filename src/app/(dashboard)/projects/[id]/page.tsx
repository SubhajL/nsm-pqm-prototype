'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Card,
  Col,
  Empty,
  Row,
  Typography,
  Tag,
  Timeline,
  Steps,
  Button,
  Progress,
  Space,
  Spin,
} from 'antd';
import {
  ExclamationCircleOutlined,
  DollarOutlined,
  ScheduleOutlined,
  BugOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  FileTextOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useProject } from '@/hooks/useProjects';
import { useMilestones } from '@/hooks/useMilestones';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useDailyReports } from '@/hooks/useDailyReports';
import { useIssues } from '@/hooks/useIssues';
import { useRisks } from '@/hooks/useRisks';
import { useEVM } from '@/hooks/useEVM';
import { useGantt } from '@/hooks/useGantt';
import { KPICard } from '@/components/common/KPICard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RidLifecycleGates } from '@/components/rid/RidLifecycleGates';
import { QualityGatePipeline } from '@/components/quality/QualityGatePipeline';
import { useQualityGates } from '@/hooks/useQuality';
import { formatBahtCurrency, formatBahtShort, formatThaiDateShort } from '@/lib/date-utils';
import {
  deriveCurrentMilestoneNumber,
} from '@/lib/project-milestone-derivations';
import {
  deriveAutoProjectStatus,
  deriveProjectScheduleHealth,
  deriveTaskGroupScheduleHealth,
  getExecutableGanttTasks,
} from '@/lib/project-progress-derivations';
import { deriveEvmMetrics } from '@/lib/evm-metrics';
import { COLORS } from '@/theme/antd-theme';
import {
  CONTRACTING_MODEL_LABELS,
  DELIVERY_METHOD_LABELS,
  getProjectDeliveryMethod,
  PROJECT_TYPE_LABELS,
  type ProjectStatus,
} from '@/types/project';

const { Title, Text } = Typography;

const CircularProgress = dynamic(
  () =>
    import('@/components/charts/CircularProgress').then(
      (mod) => mod.CircularProgress,
    ),
  { ssr: false, loading: () => <Spin /> },
);

export default function ProjectOverviewPage() {
  const router = useRouter();
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: milestones, isLoading: loadingMilestones } =
    useMilestones(projectId);
  const { data: reports, isLoading: loadingReports } = useDailyReports(projectId);
  const { data: issues, isLoading: loadingIssues } = useIssues(projectId);
  const { data: risks, isLoading: loadingRisks } = useRisks(projectId);
  const { data: evmData, isLoading: loadingEvm } = useEVM(projectId);
  const { data: ganttData } = useGantt(projectId);
  const { data: qualityGates } = useQualityGates(projectId);
  /**
   * PR-16 feature flag — when set to `'true'` the project detail page
   * renders the new `<RidLifecycleGates>` above the existing
   * `<QualityGatePipeline>`. The two stay separate per the senior
   * team-lead review (lifecycle gates vs ITP/quality gates are distinct
   * domain concepts). Defaults to OFF.
   */
  const ridLifecycleGatesEnabled =
    process.env.NEXT_PUBLIC_FEATURE_RID_LIFECYCLE_GATES === 'true';

  /* Derive the "current" step index from milestones status */
  const currentStep = useMemo(() => {
    if (!milestones) return 0;
    const idx = milestones.findIndex((m) => m.status === 'in_progress' || m.status === 'review');
    if (idx >= 0) {
      return idx;
    }

    const completedCount = milestones.filter((milestone) => milestone.status === 'completed').length;
    return completedCount >= milestones.length ? milestones.length : completedCount;
  }, [milestones]);

  const activityItems = useMemo(() => {
    const reportItems = (reports ?? []).map((report) => ({
      timestamp: report.date,
      color: COLORS.info,
      children: (
        <>
          <Text strong>ระบบ</Text> เพิ่มรายงานประจำวัน #{report.reportNumber}
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatThaiDateShort(report.date)}
          </Text>
        </>
      ),
    }));

    const issueItems = (issues ?? []).map((issue) => ({
      timestamp: issue.createdAt,
      color: COLORS.error,
      children: (
        <>
          <Text strong>{issue.assignee}</Text> เปิดปัญหาใหม่ {issue.id}
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {issue.title}
          </Text>
        </>
      ),
    }));

    const riskItems = (risks ?? []).map((risk) => ({
      timestamp: risk.dateIdentified,
      color: COLORS.warning,
      children: (
        <>
          <Text strong>{risk.owner}</Text> เพิ่มความเสี่ยงใหม่ {risk.id}
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {risk.title}
          </Text>
        </>
      ),
    }));

    return [...reportItems, ...issueItems, ...riskItems]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 6)
      .map(({ color, children }) => ({ color, children }));
  }, [issues, reports, risks]);
  const executableTasks = useMemo(() => getExecutableGanttTasks(ganttData?.data ?? []), [ganttData?.data]);
  const topLevelPhaseTasks = useMemo(
    () =>
      (ganttData?.data ?? [])
        .filter((task) => task.parent === 0 && task.type === 'project')
        .sort((left, right) => left.start_date.localeCompare(right.start_date)),
    [ganttData?.data],
  );
  const derivedProjectProgress = useMemo(() => {
    if ((project?.progress ?? 0) > 0) {
      return project?.progress ?? 0;
    }

    if (executableTasks.length === 0) {
      return project?.progress ?? 0;
    }

    return executableTasks.reduce((sum, task) => sum + task.progress, 0) / executableTasks.length;
  }, [executableTasks, project?.progress]);
  const projectStatus: ProjectStatus = useMemo(
    () =>
      deriveAutoProjectStatus(
        project?.status ?? 'planning',
        derivedProjectProgress,
        ganttData?.data ?? [],
      ),
    [derivedProjectProgress, ganttData?.data, project?.status],
  );
  const projectScheduleHealth = useMemo(
    () => project?.scheduleHealth ?? deriveProjectScheduleHealth(ganttData?.data ?? []),
    [ganttData?.data, project?.scheduleHealth],
  );
  const evmMetrics = useMemo(() => deriveEvmMetrics(project, evmData), [evmData, project]);
  const projectProgressPercent = Number((derivedProjectProgress * 100).toFixed(1));
  const milestoneViews = useMemo(
    () =>
      (milestones ?? []).map((milestone, index) => {
        const phaseTask = topLevelPhaseTasks[index];
        const phaseChildTasks = phaseTask
          ? executableTasks.filter((task) => task.parent === phaseTask.id)
          : [];
        const phaseHealth =
          phaseTask && phaseChildTasks.length > 0
            ? deriveTaskGroupScheduleHealth(phaseChildTasks)
            : (phaseTask?.progress ?? 0) > 0
              ? 'on_schedule'
              : 'not_started';
        const progressPercent = Number((((phaseTask?.progress ?? 0) || 0) * 100).toFixed(1));
        const displayStatus =
          milestone.status === 'completed' ? 'completed' : phaseHealth;

        let icon: React.ReactNode = undefined;
        if (milestone.status === 'completed') {
          icon = <CheckCircleOutlined style={{ color: COLORS.success }} />;
        } else if (displayStatus === 'delayed') {
          icon = <ExclamationCircleOutlined style={{ color: COLORS.error }} />;
        } else if (displayStatus === 'watch') {
          icon = <WarningOutlined style={{ color: COLORS.warning }} />;
        } else if (milestone.status === 'in_progress') {
          icon = <SyncOutlined spin style={{ color: COLORS.info }} />;
        }

        return {
          ...milestone,
          displayStatus,
          progressPercent,
          icon,
        };
      }),
    [executableTasks, milestones, topLevelPhaseTasks],
  );

  if (loadingProject || loadingMilestones || loadingReports || loadingIssues || loadingRisks || loadingEvm) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  /* ---- safe-access with demo defaults ---- */
  const projectName = project?.name ?? 'รายละเอียดโครงการ';
  const projectCode = project?.code ?? '-';
  const projectType = project?.type ?? 'construction';
  const deliveryMethod = getProjectDeliveryMethod(project);
  const contractingModel = project?.contractingModel ?? null;
  const projectProgress = derivedProjectProgress;
  const budget = project?.budget ?? 12_500_000;
  const spi = evmMetrics?.spi ?? project?.spiValue ?? 0.92;
  const currentMilestone = milestones ? deriveCurrentMilestoneNumber(milestones) : project?.currentMilestone ?? 0;
  const totalMilestones = milestones?.length ?? project?.totalMilestones ?? 0;
  const openIssues =
    issues?.filter((issue) => issue.status !== 'closed').length ??
    project?.openIssues ??
    0;
  const highRisks =
    risks?.filter(
      (risk) =>
        (risk.level === 'high' || risk.level === 'critical') &&
        risk.status !== 'closed',
    ).length ??
    project?.highRisks ??
    0;
  const budgetSpent =
    evmMetrics?.mode === 'outsourced'
      ? evmMetrics.paidToDate
      : evmMetrics?.mode === 'in_house'
        ? evmMetrics.ac
        : budget * projectProgress;
  const budgetSpentLabel =
    deliveryMethod === 'outsourced'
      ? 'จ่ายแล้วสะสม (Paid to Date)'
      : 'ใช้ไปแล้ว (Actual Cost)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ====== 1. Project Header Card ====== */}
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
              <Tag color="blue">{PROJECT_TYPE_LABELS[projectType].th}</Tag>
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

      {/* ====== 2. Six Mini KPI Cards ====== */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} xl={4}>
          <KPICard
            title="งบประมาณ"
            value={formatBahtShort(budget)}
            icon={<DollarOutlined />}
            color={COLORS.info}
            onClick={() => router.push(`/projects/${projectId}/s-curve`)}
            extraContent={
              <>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>
                  {budgetSpentLabel}
                </div>
                <Progress
                  percent={budget > 0 ? Number(((budgetSpent / budget) * 100).toFixed(1)) : 0}
                  size="small"
                  strokeColor={COLORS.info}
                  format={() => formatBahtCurrency(budgetSpent)}
                />
              </>
            }
          />
        </Col>
        <Col xs={12} md={8} xl={4}>
          <KPICard
            title="SPI"
            value={spi.toFixed(2)}
            icon={<WarningOutlined />}
            color={COLORS.warning}
            subtitle="Schedule Performance Index"
            onClick={() => router.push(`/projects/${projectId}/s-curve`)}
          />
        </Col>
        <Col xs={12} md={8} xl={4}>
          <KPICard
            title={deliveryMethod === 'outsourced' ? 'จ่ายแล้ว' : 'CPI'}
            value={
              deliveryMethod === 'outsourced'
                ? formatBahtShort(budgetSpent)
                : evmMetrics?.mode === 'in_house'
                  ? evmMetrics.cpi.toFixed(2)
                  : '0.00'
            }
            icon={<CheckCircleOutlined />}
            color={COLORS.success}
            subtitle={
              deliveryMethod === 'outsourced'
                ? 'Paid to Date'
                : 'Cost Performance Index'
            }
            onClick={() => router.push(`/projects/${projectId}/s-curve`)}
          />
        </Col>
        <Col xs={12} md={8} xl={4}>
          <KPICard
            title="งวดปัจจุบัน"
            value={`${currentMilestone}/${totalMilestones}`}
            icon={<ScheduleOutlined />}
            color={COLORS.info}
          />
        </Col>
        <Col xs={12} md={8} xl={4}>
          <KPICard
            title="ปัญหาเปิด"
            value={openIssues}
            icon={<BugOutlined />}
            color={COLORS.error}
            onClick={() => router.push(`/projects/${projectId}/issues`)}
          />
        </Col>
        <Col xs={12} md={8} xl={4}>
          <KPICard
            title="ความเสี่ยงสูง"
            value={highRisks}
            icon={<WarningOutlined />}
            color={COLORS.warning}
            onClick={() => router.push(`/projects/${projectId}/risk`)}
          />
        </Col>
      </Row>

      {/* ====== 3. Two Columns: Activity & Milestones ====== */}
      <Row gutter={[24, 24]}>
        {/* Left — Recent Activity */}
        <Col xs={24} lg={12}>
          <Card
            title="กิจกรรมล่าสุด (Recent Activity)"
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              height: '100%',
            }}
          >
            {activityItems.length > 0 ? (
              <Timeline items={activityItems} />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="ยังไม่มีกิจกรรมล่าสุดสำหรับโครงการนี้"
              />
            )}
          </Card>
        </Col>

        {/* Right — Payment Milestones */}
        <Col xs={24} lg={12}>
          <Card
            title="งวดงาน (Payment Milestones)"
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              height: '100%',
            }}
          >
            <Steps
              direction="vertical"
              current={currentStep}
              items={milestoneViews.map((ms) => {
                const isCompleted = ms.status === 'completed';
                const showProgress = !isCompleted && ms.progressPercent > 0;

                return {
                  title: (
                    <Space>
                      <Text strong>{ms.name}</Text>
                      <StatusBadge
                        status={ms.displayStatus}
                        type={ms.displayStatus === 'completed' ? 'milestone' : 'project'}
                      />
                    </Space>
                  ),
                  description: (
                    <div style={{ paddingTop: 4 }}>
                      <Text>
                        {formatBahtCurrency(ms.amount)} &middot; กำหนด{' '}
                        {formatThaiDateShort(ms.dueDate)}
                      </Text>
                      {isCompleted && (
                        <div style={{ marginTop: 4 }}>
                          <Tag color="success">ตรวจรับแล้ว</Tag>
                        </div>
                      )}
                      {showProgress && (
                        <div style={{ marginTop: 8, maxWidth: 240 }}>
                          <Progress
                            percent={ms.progressPercent}
                            size="small"
                            strokeColor={COLORS.info}
                          />
                        </div>
                      )}
                    </div>
                  ),
                  icon: ms.icon,
                };
              })}
            />
          </Card>
        </Col>
      </Row>

      {/* ====== 3b. RID Lifecycle Gates (PR-16, feature-flagged) ====== */}
      {ridLifecycleGatesEnabled && project ? (
        <Card
          title="ขั้นตอนวงจรชีวิตโครงการ (Lifecycle Gates)"
          style={{
            borderRadius: 8,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          }}
        >
          <RidLifecycleGates project={project} />
          <div style={{ marginTop: 24 }}>
            <QualityGatePipeline gates={qualityGates ?? []} />
          </div>
        </Card>
      ) : null}

      {/* ====== 4. Quick Action Buttons ====== */}
      <Card
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Space size="middle" wrap>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            href={`/projects/${projectId}/daily-report`}
            style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
          >
            สร้างรายงานประจำวัน
          </Button>
          <Button
            icon={<ArrowUpOutlined />}
            href={`/projects/${projectId}/progress`}
          >
            อัปเดต Progress
          </Button>
          <Button
            icon={<PlusOutlined />}
            href={`/projects/${projectId}/issues`}
          >
            เพิ่มปัญหา
          </Button>
        </Space>
      </Card>
    </div>
  );
}
