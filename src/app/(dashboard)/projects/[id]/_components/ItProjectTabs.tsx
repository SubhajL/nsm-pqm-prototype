'use client';

/**
 * PR-30a — IT-class project tabset.
 *
 * Surfaces three RID DT6 (Digital Project Management Document) tabs on
 * IT-class projects:
 *   1. Vendor SOWs (Statement of Work + UAT criteria + acceptance state)
 *   2. Sprint board (Hybrid-Agile sprints + velocity / health banding)
 *   3. DT6 Notes — internal sub-tabs for the three canonical areas:
 *      - integration (การบูรณาการ)
 *      - communication_plan (แผนการสื่อสาร)
 *      - formal_procurement_plan (แผนการจัดซื้อจัดจ้าง)
 *
 * Visibility: this whole surface is rendered ONLY when
 * `project.projectClass === 'it'`. The page-level slot-in does the
 * conditional render so non-IT projects never load these tabs (and the
 * IT-only API calls never fire from the wrong context).
 *
 * Content is intentionally lightweight (read-only lists). UX polish —
 * inline editing, drag/drop kanban, rich markdown rendering — is out
 * of scope for PR-30a; the goal is to land the surface + persistence
 * so the demo can show DT6 alignment.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Spin, Table, Tabs, Tag, Typography } from 'antd';

import { apiGet } from '@/lib/api-client';
import { formatThaiDateShort } from '@/lib/date-utils';
import { computeSprintHealth } from '@/lib/rid/it-class-helpers';
import { COLORS } from '@/theme/antd-theme';
import {
  DT6_AREA_LABELS,
  DT6_AREAS,
  type Dt6Area,
  type KnowledgeAreaNote,
} from '@/types/knowledge-area-note';
import type { ItSprint } from '@/types/sprint';
import { SOW_STATE_LABELS, type VendorSow } from '@/types/vendor-sow';

const { Text, Paragraph } = Typography;

const HEALTH_TAG_COLOR: Record<ReturnType<typeof computeSprintHealth>, string> = {
  on_track: 'success',
  at_risk: 'warning',
  off_track: 'error',
};

const HEALTH_TAG_LABEL: Record<
  ReturnType<typeof computeSprintHealth>,
  { th: string; en: string }
> = {
  on_track: { th: 'ทันกำหนด', en: 'On Track' },
  at_risk: { th: 'เสี่ยง', en: 'At Risk' },
  off_track: { th: 'ล่าช้า', en: 'Off Track' },
};

function VendorSowsTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery<VendorSow[]>({
    queryKey: ['vendor-sows', projectId],
    queryFn: () => apiGet<VendorSow[]>(`/vendor-sows/by-project/${projectId}`),
    enabled: !!projectId,
  });

  if (isLoading) return <Spin />;
  if (!data || data.length === 0) {
    return (
      <Empty description="ยังไม่มีสัญญาผู้ขาย (No vendor SOW recorded yet)" />
    );
  }

  return (
    <Table<VendorSow>
      rowKey="id"
      dataSource={data}
      pagination={false}
      columns={[
        {
          title: 'งวด (Phase)',
          dataIndex: 'phase',
          key: 'phase',
        },
        {
          title: 'ขอบเขต (Scope)',
          dataIndex: 'scopeSummary',
          key: 'scopeSummary',
          ellipsis: true,
        },
        {
          title: 'สถานะ (State)',
          dataIndex: 'state',
          key: 'state',
          render: (state: VendorSow['state']) => {
            const label = SOW_STATE_LABELS[state];
            return <Tag color={label.color}>{`${label.th} (${label.en})`}</Tag>;
          },
        },
        {
          title: 'ประกัน (Warranty)',
          dataIndex: 'warrantyMonths',
          key: 'warrantyMonths',
          render: (m: number | null) => (m === null ? '—' : `${m} เดือน`),
        },
        {
          title: 'ลงนาม (Signed)',
          dataIndex: 'signedAt',
          key: 'signedAt',
          render: (d: string | null) => (d ? formatThaiDateShort(d) : '—'),
        },
      ]}
    />
  );
}

function SprintBoardTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery<ItSprint[]>({
    queryKey: ['it-sprints', projectId],
    queryFn: () => apiGet<ItSprint[]>(`/it-sprints/by-project/${projectId}`),
    enabled: !!projectId,
  });

  const sprintRows = useMemo(() => {
    return (data ?? []).map((sprint) => ({
      ...sprint,
      health: computeSprintHealth(sprint.velocityPoints, sprint.completedPoints),
    }));
  }, [data]);

  if (isLoading) return <Spin />;
  if (sprintRows.length === 0) {
    return <Empty description="ยังไม่มีสปรินต์ (No sprints yet)" />;
  }

  return (
    <Table
      rowKey="id"
      dataSource={sprintRows}
      pagination={false}
      columns={[
        {
          title: 'สปรินต์ (Sprint)',
          dataIndex: 'sprintNumber',
          key: 'sprintNumber',
          render: (n: number) => `Sprint #${n}`,
        },
        {
          title: 'ขั้นวงจรชีวิต (Lifecycle Stage)',
          dataIndex: 'lifecycleStage',
          key: 'lifecycleStage',
        },
        {
          title: 'เป้าหมาย (Goal)',
          dataIndex: 'goal',
          key: 'goal',
          ellipsis: true,
        },
        {
          title: 'แต้ม (Velocity)',
          key: 'velocity',
          render: (_: unknown, row: (typeof sprintRows)[number]) =>
            `${row.completedPoints} / ${row.velocityPoints}`,
        },
        {
          title: 'สถานะ (Health)',
          dataIndex: 'health',
          key: 'health',
          render: (h: keyof typeof HEALTH_TAG_LABEL) => (
            <Tag color={HEALTH_TAG_COLOR[h]}>
              {`${HEALTH_TAG_LABEL[h].th} (${HEALTH_TAG_LABEL[h].en})`}
            </Tag>
          ),
        },
      ]}
    />
  );
}

function KnowledgeAreaNotesTab({ projectId }: { projectId: string }) {
  const [activeArea, setActiveArea] = useState<Dt6Area>(DT6_AREAS[0]);
  const { data, isLoading } = useQuery<KnowledgeAreaNote[]>({
    queryKey: ['knowledge-area-notes', projectId, activeArea],
    queryFn: () =>
      apiGet<KnowledgeAreaNote[]>(
        `/knowledge-area-notes/by-project/${projectId}?area=${activeArea}`,
      ),
    enabled: !!projectId,
  });

  const latest = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data.reduce((acc, n) => (n.version > acc.version ? n : acc), data[0]);
  }, [data]);

  return (
    <Tabs
      activeKey={activeArea}
      onChange={(key) => setActiveArea(key as Dt6Area)}
      items={DT6_AREAS.map((area) => ({
        key: area,
        label: `${DT6_AREA_LABELS[area].th} (${DT6_AREA_LABELS[area].en})`,
        children: isLoading ? (
          <Spin />
        ) : latest ? (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              เวอร์ชัน (Version) {latest.version} ·{' '}
              {formatThaiDateShort(latest.authoredAt)} · โดย (by){' '}
              {latest.authoredBy}
            </Text>
            <Paragraph
              style={{
                whiteSpace: 'pre-wrap',
                marginTop: 12,
                padding: 16,
                background: COLORS.bgLayout,
                borderRadius: 8,
              }}
            >
              {latest.content}
            </Paragraph>
          </div>
        ) : (
          <Empty description="ยังไม่มีบันทึก (No note yet)" />
        ),
      }))}
    />
  );
}

export function ItProjectTabs({ projectId }: { projectId: string }) {
  return (
    <Card
      title="งานพัฒนาระบบ IT — DT6 (IT Project Surfaces)"
      style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
    >
      <Tabs
        items={[
          {
            key: 'vendor-sows',
            label: 'สัญญาผู้ขาย (Vendor SOWs)',
            children: <VendorSowsTab projectId={projectId} />,
          },
          {
            key: 'sprints',
            label: 'บอร์ดสปรินต์ (Sprint Board)',
            children: <SprintBoardTab projectId={projectId} />,
          },
          {
            key: 'dt6-notes',
            label: 'DT6 Notes',
            children: <KnowledgeAreaNotesTab projectId={projectId} />,
          },
        ]}
      />
    </Card>
  );
}
