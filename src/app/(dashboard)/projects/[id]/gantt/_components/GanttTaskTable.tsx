'use client';

import { Button, Card, message, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { StatusBadge } from '@/components/common/StatusBadge';
import type { GanttTask } from '@/types/gantt';
import type { TaskScheduleHealth } from '@/lib/project-progress-derivations';
import { COLORS } from '@/theme/antd-theme';

import {
  COLOR_MILESTONE,
  type GanttRow,
  type TimelineConfig,
  type TimeScale,
  type ViewMode,
} from './constants';
import { GanttLegend } from './GanttLegend';
import { TimelineBar } from './TimelineBar';
import { TimelineHeader } from './TimelineHeader';
import { getColumnWidths, getProgressColor, getStatusTag, getTimelineColumnWidth } from './helpers';

const { Text } = Typography;

interface GanttTaskTableProps {
  treeData: GanttRow[];
  timeline: TimelineConfig;
  timeScale: TimeScale;
  viewMode: ViewMode;
  canEditGantt: boolean;
  predecessorLabelsByTargetId: Map<number, string[]>;
  taskScheduleHealthById: Map<number, TaskScheduleHealth>;
  projectScheduleHealthByParentId: Map<number, TaskScheduleHealth>;
  /**
   * PR-3.5 — Task ids on the critical path (zero slack). When a row's
   * id is in this set, the activity cell renders a red left-border
   * accent + bilingual "Critical (วิกฤต)" tag.
   */
  criticalTaskIds?: ReadonlySet<number>;
  onEditTask: (task: GanttTask) => void;
  onDeleteTask: (id: number) => Promise<void>;
}

export function GanttTaskTable({
  treeData,
  timeline,
  timeScale,
  viewMode,
  canEditGantt,
  predecessorLabelsByTargetId,
  taskScheduleHealthById,
  projectScheduleHealthByParentId,
  criticalTaskIds,
  onEditTask,
  onDeleteTask,
}: GanttTaskTableProps) {
  const timelineColumnWidth = getTimelineColumnWidth(timeScale, timeline.totalDays);
  const colW = getColumnWidths(timeScale);

  // Calculate total scroll width: sum of left columns + timeline
  const leftColumnsTotal = colW.activity + colW.owner + colW.progress + colW.predecessors + colW.status;
  const scrollX = timelineColumnWidth
    ? leftColumnsTotal + timelineColumnWidth + (canEditGantt ? colW.actions : 0)
    : 1100;

  const columns: ColumnsType<GanttRow> = (() => {
      const baseColumns: ColumnsType<GanttRow> = [
      {
        title: 'กิจกรรม (Activity)',
        dataIndex: 'text',
        key: 'text',
        width: colW.activity,
        fixed: 'left' as const,
        render: (text: string, record: GanttRow) => {
          const isParent = record.level === 0;
          const isMilestone = record.type === 'milestone';
          const isCritical = criticalTaskIds?.has(record.id) ?? false;
          const predecessors = predecessorLabelsByTargetId.get(record.id) ?? [];
          return (
            <div
              style={
                isCritical
                  ? {
                      paddingLeft: 8,
                      borderLeft: `3px solid ${COLORS.error}`,
                    }
                  : undefined
              }
            >
              <span
                style={{
                  fontWeight: isParent ? 600 : 400,
                  color: isMilestone ? COLOR_MILESTONE : COLORS.textDark,
                }}
              >
                {isMilestone && (
                  <span style={{ marginRight: 4, color: COLOR_MILESTONE }}>
                    ◆
                  </span>
                )}
                {text}
              </span>
              {isCritical ? (
                <Tag
                  color="red"
                  style={{ marginLeft: 6, fontSize: 11, lineHeight: '14px' }}
                  aria-label="งานวิกฤต (Critical path task)"
                >
                  วิกฤต (Critical)
                </Tag>
              ) : null}
              {predecessors.length > 0 ? (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ขึ้นกับ: {predecessors.join(', ')}
                  </Text>
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        title: 'ผู้รับผิดชอบ',
        dataIndex: 'owner',
        key: 'owner',
        width: colW.owner,
        render: (owner: string) => owner || '—',
      },
      {
        title: '% สำเร็จ',
        dataIndex: 'progress',
        key: 'progress',
        width: colW.progress,
        align: 'center' as const,
        render: (progress: number, record: GanttRow) => {
          if (record.type === 'milestone') return '—';
          const pct = Math.round(progress * 100);
          return (
            <span
              style={{
                fontWeight: 600,
                color: getProgressColor(progress),
              }}
            >
              {pct}%
            </span>
          );
        },
      },
      {
        title: 'งานก่อนหน้า',
        key: 'predecessors',
        width: colW.predecessors,
        render: (_: unknown, record: GanttRow) => {
          const predecessors = predecessorLabelsByTargetId.get(record.id) ?? [];

          if (predecessors.length === 0) {
            return '—';
          }

          return (
            <Space wrap size={4}>
              {predecessors.map((label) => (
                <Tag key={`${record.id}-${label}`} color="purple">
                  {label}
                </Tag>
              ))}
            </Space>
          );
        },
      },
      {
        title: 'สถานะ (Status)',
        key: 'status',
        width: colW.status,
        render: (_: unknown, record: GanttRow) => {
          if (record.type === 'milestone') {
            return getStatusTag(record.progress, record.type);
          }

          const scheduleHealth =
            record.type === 'task'
              ? taskScheduleHealthById.get(record.id)
              : projectScheduleHealthByParentId.get(record.id);
          const showScheduleHealth =
            Boolean(scheduleHealth) &&
            scheduleHealth !== 'not_started' &&
            !(record.type === 'task' && record.progress >= 1);
          const scheduleBadgeStatus = showScheduleHealth ? scheduleHealth ?? null : null;

          return (
            <Space wrap size={4}>
              {getStatusTag(record.progress, record.type)}
              {scheduleBadgeStatus ? (
                <StatusBadge status={scheduleBadgeStatus} type="project" />
              ) : null}
            </Space>
          );
        },
      },
      {
        title: (
          <div>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>
              แผนงาน (Timeline)
            </div>
            <TimelineHeader timeline={timeline} timeScale={timeScale} />
          </div>
        ),
        key: 'timeline',
        width: timelineColumnWidth,
        render: (_: unknown, record: GanttRow) => (
          <TimelineBar
            startDate={record.start_date}
            endDate={record.end_date}
            progress={record.progress}
            type={record.type}
            isParent={record.level === 0}
            timeline={timeline}
            viewMode={viewMode}
            baselineStartDate={record.baseline_start_date}
            baselineEndDate={record.baseline_end_date}
          />
        ),
      },
      ];

      if (canEditGantt) {
        baseColumns.push({
          title: 'จัดการ',
          key: 'actions',
          width: colW.actions,
          align: 'center',
          render: (_value, record) => (
            <Space size="small">
              <Button
                size="small"
                icon={<EditOutlined />}
                aria-label={`แก้ไข ${record.text}`}
                onClick={() =>
                  onEditTask({
                    id: record.id,
                    text: record.text,
                    owner: record.owner,
                    start_date: record.start_date,
                    end_date: record.end_date,
                    progress: record.progress,
                    parent: record.parent,
                    type: record.type,
                    duration: Math.max(
                      dayjs(record.end_date).diff(dayjs(record.start_date), 'day') + 1,
                      1,
                    ),
                  })
                }
              />
              <Popconfirm
                title="ลบงานในแผน Gantt"
                description={`ต้องการลบ "${record.text}" ใช่หรือไม่`}
                okText="ลบ"
                cancelText="ยกเลิก"
                onConfirm={async () => {
                  try {
                    await onDeleteTask(record.id);
                    message.success('ลบงานในแผน Gantt แล้ว');
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : 'ไม่สามารถลบงานในแผน Gantt ได้');
                  }
                }}
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  aria-label={`ลบ ${record.text}`}
                />
              </Popconfirm>
            </Space>
          ),
        });
      }

      return baseColumns;
    })();

  return (
    <>
      {/* ---------- Gantt Table ---------- */}
      <Card
        styles={{
          body: { padding: '0 0 16px 0' },
        }}
        style={{
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Table<GanttRow>
          columns={columns}
          dataSource={treeData}
          rowKey="key"
          pagination={false}
          size="middle"
          scroll={{ x: scrollX }}
          expandable={{
            defaultExpandAllRows: true,
            expandRowByClick: true,
          }}
          rowClassName={(record) =>
            record.level === 0 ? 'gantt-parent-row' : ''
          }
        />

        {/* ---------- Legend ---------- */}
        <div style={{ padding: '0 24px' }}>
          <GanttLegend />
        </div>
      </Card>

      {/* ---------- Inline styles for parent row highlight ---------- */}
      <style jsx global>{`
        .gantt-parent-row td {
          background-color: ${COLORS.surfaceCool} !important;
        }
        .gantt-parent-row:hover td {
          background-color: ${COLORS.tableHeaderBg} !important;
        }
      `}</style>
    </>
  );
}
