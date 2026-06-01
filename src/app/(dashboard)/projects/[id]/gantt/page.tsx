'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Form, message, Skeleton, Typography } from 'antd';

import { useCreateGanttTask, useDeleteGanttTask, useGantt, useUpdateGanttTask } from '@/hooks/useGantt';
import { computeCriticalPath } from '@/lib/gantt/dependency-graph';
import type { GanttTask } from '@/types/gantt';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { canManageGantt } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { buildGanttExportDocument } from '@/lib/export-documents';
import { openPrintableReport } from '@/lib/export-utils';

import { GanttTaskFormModal } from './_components/GanttTaskFormModal';
import { GanttTaskTable } from './_components/GanttTaskTable';
import { GanttToolbar } from './_components/GanttToolbar';
import type { GanttTaskFormValues, TimeScale, ViewMode } from './_components/constants';
import {
  buildCreateFormValues,
  buildEditFormValues,
  buildPredecessorLabelsByTargetId,
  buildProjectScheduleHealthByParentId,
  buildTaskInputFromForm,
  buildTaskScheduleHealthById,
  buildTimelineConfig,
  buildTree,
  parseFormDate,
} from './_components/helpers';

const { Title } = Typography;

/* ------------------------------------------------------------------ */
/* Main Page Component                                                 */
/* ------------------------------------------------------------------ */

export default function GanttChartPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const [form] = Form.useForm<GanttTaskFormValues>();
  const { data: project } = useProject(projectId);
  const { data: ganttData, isLoading } = useGantt(projectId);
  const createTask = useCreateGanttTask(projectId);
  const updateTask = useUpdateGanttTask(projectId);
  const deleteTask = useDeleteGanttTask(projectId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [timeScale, setTimeScale] = useState<TimeScale>('month');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const canEditGantt = canManageGantt(currentUser?.role);

  const treeData = useMemo(() => {
    if (!ganttData?.data) return [];
    return buildTree(ganttData.data);
  }, [ganttData]);
  const timeline = useMemo(
    () => buildTimelineConfig(project?.startDate, project?.endDate, ganttData?.data ?? []),
    [ganttData?.data, project?.endDate, project?.startDate],
  );
  const taskScheduleHealthById = useMemo(
    () => buildTaskScheduleHealthById(ganttData?.data ?? [], timeline.today),
    [ganttData?.data, timeline.today],
  );
  const projectScheduleHealthByParentId = useMemo(
    () => buildProjectScheduleHealthByParentId(ganttData?.data ?? [], timeline.today),
    [ganttData?.data, timeline.today],
  );

  const taskOptions = useMemo(
    () =>
      (ganttData?.data ?? []).map((task) => ({
        label: task.text,
        value: task.id,
      })),
    [ganttData],
  );
  const predecessorLabelsByTargetId = useMemo(
    () => buildPredecessorLabelsByTargetId(ganttData?.data ?? [], ganttData?.links ?? []),
    [ganttData?.data, ganttData?.links],
  );

  // PR-3.5 — Compute the critical path from the current task + link
  // graph. Returned ids are rendered with a red left-border accent and
  // "วิกฤต (Critical)" tag inside `GanttTaskTable`.
  const criticalPath = useMemo(
    () => computeCriticalPath(ganttData?.data ?? [], ganttData?.links ?? []),
    [ganttData?.data, ganttData?.links],
  );

  useEffect(() => {
    if (!modalOpen) {
      form.resetFields();
      return;
    }

    if (editingTask) {
      form.setFieldsValue(buildEditFormValues(editingTask, ganttData?.links ?? []));
      return;
    }

    form.setFieldsValue(buildCreateFormValues(currentUser?.name ?? '', project?.startDate));
  }, [currentUser?.name, editingTask, form, ganttData?.links, modalOpen, project?.startDate]);

  const openCreateModal = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEditModal = (task: GanttTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const startDate = parseFormDate(values.start_date);
      const endDate = parseFormDate(values.end_date);

      if (!startDate.isValid() || !endDate.isValid()) {
        message.error('กรุณาระบุวันที่เริ่มต้นและวันที่สิ้นสุดให้ถูกต้อง');
        return;
      }

      const payload = buildTaskInputFromForm(values, startDate, endDate);

      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, ...payload });
        message.success('อัปเดตแผนงานแล้ว');
      } else {
        await createTask.mutateAsync(payload);
        message.success('เพิ่มงานในแผน Gantt แล้ว');
      }

      closeModal();
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        message.error(error.message);
      } else if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleExportPdf = () => {
    const opened = openPrintableReport(
      buildGanttExportDocument({
        project,
        ganttData,
        viewMode,
        timeScale,
      }),
    );
    if (!opened) {
      message.error('ไม่สามารถเปิดหน้าต่างรายงานได้ กรุณาอนุญาต pop-up');
    }
  };

  const handleDeleteTask = async (id: number) => {
    await deleteTask.mutateAsync({ id });
  };

  /* ----- Loading state ----- */
  if (isLoading) {
    return (
      <div>
        <Title level={3}>แผนภูมิแกนต์ (Gantt Chart)</Title>
        <Card style={{ marginTop: 16 }}>
          <Skeleton active paragraph={{ rows: 12 }} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <GanttToolbar
        projectName={project?.name}
        projectId={projectId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        timeScale={timeScale}
        onTimeScaleChange={setTimeScale}
        canEditGantt={canEditGantt}
        onOpenCreate={openCreateModal}
        onExportPdf={handleExportPdf}
      />

      <GanttTaskTable
        treeData={treeData}
        timeline={timeline}
        timeScale={timeScale}
        viewMode={viewMode}
        canEditGantt={canEditGantt}
        predecessorLabelsByTargetId={predecessorLabelsByTargetId}
        taskScheduleHealthById={taskScheduleHealthById}
        projectScheduleHealthByParentId={projectScheduleHealthByParentId}
        criticalTaskIds={criticalPath.criticalTaskIds}
        onEditTask={openEditModal}
        onDeleteTask={handleDeleteTask}
      />

      <GanttTaskFormModal
        open={modalOpen}
        editingTask={editingTask}
        form={form}
        taskOptions={taskOptions}
        predecessorOptions={ganttData?.data ?? []}
        isPending={createTask.isPending || updateTask.isPending}
        onCancel={closeModal}
        onOk={() => void handleSubmit()}
      />
    </div>
  );
}
