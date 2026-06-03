'use client';

import { Button, Radio, Space, Typography } from 'antd';
import { FilePdfOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { COLORS } from '@/theme/antd-theme';

import type { TimeScale, ViewMode } from './constants';

const { Title, Text } = Typography;

interface GanttToolbarProps {
  projectName: string | undefined;
  projectId: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  timeScale: TimeScale;
  onTimeScaleChange: (scale: TimeScale) => void;
  canEditGantt: boolean;
  onOpenCreate: () => void;
  onExportPdf: () => void;
}

export function GanttToolbar({
  projectName,
  projectId,
  viewMode,
  onViewModeChange,
  timeScale,
  onTimeScaleChange,
  canEditGantt,
  onOpenCreate,
  onExportPdf,
}: GanttToolbarProps) {
  return (
    <>
      {/* ---------- Page Header ---------- */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          แผนภูมิแกนต์ (Gantt Chart)
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          {projectName ?? 'รายละเอียดโครงการ'}
        </Text>
      </div>

      {/* ---------- Toolbar ---------- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Space wrap size="middle">
          <Radio.Group
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: 'Baseline', value: 'baseline' },
              { label: 'ปัจจุบัน', value: 'current' },
              { label: 'เปรียบเทียบ', value: 'compare' },
            ]}
          />
          <Radio.Group
            value={timeScale}
            onChange={(e) => onTimeScaleChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: 'วัน', value: 'day' },
              { label: 'สัปดาห์', value: 'week' },
              { label: 'เดือน', value: 'month' },
            ]}
          />
        </Space>

        <Space>
          {canEditGantt ? (
            // T2 follow-up: demoted from `type="primary"` per
            // common/CLAUDE.md. The page primary is the adjacent
            // `ขออนุมัติแผนงาน` workflow CTA (submit the plan for
            // approval); `เพิ่มงาน` is a row-level edit affordance.
            <Button icon={<PlusOutlined />} onClick={onOpenCreate}>
              เพิ่มงาน
            </Button>
          ) : null}
          <Link href={`/projects/${projectId}/approval`}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              style={{
                backgroundColor: COLORS.accentTeal,
                borderColor: COLORS.accentTeal,
              }}
            >
              ขออนุมัติแผนงาน
            </Button>
          </Link>
          <Button icon={<FilePdfOutlined />} onClick={onExportPdf}>Export PDF</Button>
        </Space>
      </div>
    </>
  );
}
