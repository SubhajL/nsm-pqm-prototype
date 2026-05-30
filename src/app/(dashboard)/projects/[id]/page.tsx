'use client';

import { useMemo } from 'react';
import {
  Card,
  Col,
  Row,
  Typography,
  Spin,
} from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
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
import { RidLifecycleGates } from '@/components/rid/RidLifecycleGates';
import { QualityGatePipeline } from '@/components/quality/QualityGatePipeline';
import { useQualityGates } from '@/hooks/useQuality';
import { formatThaiDateShort } from '@/lib/date-utils';
import {
  deriveCurrentMilestoneNumber,
} from '@/lib/project-milestone-derivations-pure';
import {
  deriveAutoProjectStatus,
  deriveProjectScheduleHealth,
  deriveTaskGroupScheduleHealth,
  getExecutableGanttTasks,
} from '@/lib/project-progress-derivations';
import { deriveEvmMetrics } from '@/lib/evm-metrics';
import { COLORS } from '@/theme/antd-theme';
import {
  getProjectDeliveryMethod,
  type ProjectStatus,
} from '@/types/project';

import { ProjectHeaderCard } from './_components/ProjectHeaderCard';
import { ProjectKPICards } from './_components/ProjectKPICards';
import { ActivityTimelineCard } from './_components/ActivityTimelineCard';
import { MilestonesCard } from './_components/MilestonesCard';
import { QuickActionsCard } from './_components/QuickActionsCard';

const { Text } = Typography;

export default function ProjectOverviewPage() {
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
      <ProjectHeaderCard
        projectName={projectName}
        projectCode={projectCode}
        projectType={projectType}
        deliveryMethod={deliveryMethod}
        contractingModel={contractingModel}
        projectStatus={projectStatus}
        projectScheduleHealth={projectScheduleHealth}
        projectProgressPercent={projectProgressPercent}
      />

      <ProjectKPICards
        projectId={projectId}
        budget={budget}
        budgetSpent={budgetSpent}
        budgetSpentLabel={budgetSpentLabel}
        spi={spi}
        deliveryMethod={deliveryMethod}
        evmMetrics={evmMetrics}
        currentMilestone={currentMilestone}
        totalMilestones={totalMilestones}
        openIssues={openIssues}
        highRisks={highRisks}
      />

      {/* ====== 3. Two Columns: Activity & Milestones ====== */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <ActivityTimelineCard items={activityItems} />
        </Col>
        <Col xs={24} lg={12}>
          <MilestonesCard currentStep={currentStep} milestoneViews={milestoneViews} />
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

      <QuickActionsCard projectId={projectId} />
    </div>
  );
}
