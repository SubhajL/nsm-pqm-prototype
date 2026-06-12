'use client';

/**
 * PR-30a — IT-class project tabset (write-enabled since PR it-class-write-ui).
 *
 * Surfaces three RID DT6 (Digital Project Management Document) tabs on
 * IT-class projects:
 *   1. Vendor SOWs — register + create + legal state transitions.
 *   2. Sprint board — Hybrid-Agile sprints + create/edit + health banding.
 *   3. DT6 Notes — versioned notes per canonical area (append-only).
 *
 * Visibility: rendered ONLY when `project.projectClass === 'it'` (the
 * page-level slot-in does the conditional render). Manage rights mirror
 * the other RID surfaces: System Admin + Project Manager write; everyone
 * else reads. The routes re-enforce `edit_basic` + the IT-only guard
 * (422 IT_ONLY_FEATURE).
 */

import { Card, Tabs } from 'antd';

import { useAuthStore } from '@/stores/useAuthStore';

import { Dt6NotesTab } from './it/Dt6NotesTab';
import { SprintBoardTab } from './it/SprintBoardTab';
import { VendorSowsTab } from './it/VendorSowsTab';
import { canManageItClass } from './it/it-class-actions';

export function ItProjectTabs({ projectId }: { projectId: string }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const canManage = canManageItClass(currentUser?.role);

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
            children: <VendorSowsTab projectId={projectId} canManage={canManage} />,
          },
          {
            key: 'sprints',
            label: 'บอร์ดสปรินต์ (Sprint Board)',
            children: <SprintBoardTab projectId={projectId} canManage={canManage} />,
          },
          {
            key: 'dt6-notes',
            label: 'DT6 Notes',
            children: <Dt6NotesTab projectId={projectId} canManage={canManage} />,
          },
        ]}
      />
    </Card>
  );
}
