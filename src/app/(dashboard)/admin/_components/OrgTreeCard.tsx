'use client';

import { Button, Card, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

import type { OrgUnitWithUserCount } from './helpers';

export function OrgTreeCard({
  treeData,
  selectedDeptId,
  selectedDept,
  onSelect,
  onCreate,
  onEdit,
}: {
  treeData: DataNode[];
  selectedDeptId: string;
  selectedDept: OrgUnitWithUserCount | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: () => void;
}) {
  return (
    <Card title="ผังองค์กร (Organization Chart)" style={{ height: '100%' }}>
      <Tree
        treeData={treeData}
        defaultExpandedKeys={['dept-root', 'dept-om', 'dept-admin', 'dept-academic', 'dept-construction']}
        selectedKeys={[selectedDeptId]}
        onSelect={(keys) => {
          if (keys.length > 0) {
            onSelect(keys[0] as string);
          }
        }}
        blockNode
      />
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{
            backgroundColor: COLORS.accentTeal,
            borderColor: COLORS.accentTeal,
          }}
          onClick={onCreate}
        >
          + เพิ่มหน่วยงาน
        </Button>
        <Button
          icon={<EditOutlined />}
          onClick={() => {
            if (!selectedDept) return;
            onEdit();
          }}
        >
          แก้ไข
        </Button>
        <Button danger icon={<DeleteOutlined />}>
          ลบ
        </Button>
      </div>
    </Card>
  );
}
