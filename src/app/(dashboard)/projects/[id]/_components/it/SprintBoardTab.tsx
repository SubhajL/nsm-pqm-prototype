'use client';

import { useMemo, useState } from 'react';
import { Button, Space, Spin, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { EmptyState } from '@/components/common';
import { useItSprints } from '@/hooks/useItClass';
import { computeSprintHealth } from '@/lib/rid/it-class-helpers';
import type { ItSprint } from '@/types/sprint';

import { SprintModal } from './SprintModal';
import { sprintHealthVisual } from './it-class-actions';

interface SprintBoardTabProps {
  projectId: string;
  canManage: boolean;
}

type SprintRow = ItSprint & { health: ReturnType<typeof computeSprintHealth> };

/** บอร์ดสปรินต์ — Hybrid-Agile sprints nested in the lifecycle stage. */
export function SprintBoardTab({ projectId, canManage }: SprintBoardTabProps) {
  const { data, isLoading } = useItSprints(projectId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ItSprint | null>(null);

  const sprintRows: SprintRow[] = useMemo(() => {
    return (data ?? []).map((sprint) => ({
      ...sprint,
      health: computeSprintHealth(sprint.velocityPoints, sprint.completedPoints),
    }));
  }, [data]);

  if (isLoading) return <Spin />;

  const columns: ColumnsType<SprintRow> = [
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
    { title: 'เป้าหมาย (Goal)', dataIndex: 'goal', key: 'goal', ellipsis: true },
    {
      title: 'แต้ม (Velocity)',
      key: 'velocity',
      align: 'right',
      render: (_: unknown, row: SprintRow) =>
        `${row.completedPoints} / ${row.velocityPoints}`,
    },
    {
      title: 'สถานะ (Health)',
      dataIndex: 'health',
      key: 'health',
      render: (health: SprintRow['health']) => {
        const visual = sprintHealthVisual(health);
        return <Tag color={visual.color}>{visual.label}</Tag>;
      },
    },
    ...(canManage
      ? [
          {
            title: '',
            key: 'actions',
            align: 'right' as const,
            width: 120,
            render: (_: unknown, row: SprintRow) => (
              <Button type="link" onClick={() => setEditing(row)}>
                แก้ไข (Edit)
              </Button>
            ),
          } satisfies ColumnsType<SprintRow>[number],
        ]
      : []),
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {canManage && (
        <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          สร้างสปรินต์ (Create Sprint)
        </Button>
      )}

      {sprintRows.length === 0 ? (
        <EmptyState size="small" title="ยังไม่มีสปรินต์ (No sprints yet)" />
      ) : (
        <Table<SprintRow>
          rowKey="id"
          size="middle"
          dataSource={sprintRows}
          pagination={false}
          columns={columns}
        />
      )}

      <SprintModal
        projectId={projectId}
        nextSprintNumber={
          sprintRows.length === 0
            ? 1
            : Math.max(...sprintRows.map((row) => row.sprintNumber)) + 1
        }
        sprint={null}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <SprintModal
        projectId={projectId}
        nextSprintNumber={0}
        sprint={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </Space>
  );
}
