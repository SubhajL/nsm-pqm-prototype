'use client';

import { Card, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';

export function FolderTreePanel({
  treeData,
  selectedFolderId,
  onSelect,
}: {
  treeData: DataNode[];
  selectedFolderId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card
      title="โครงสร้างโฟลเดอร์ (Folders)"
      style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      styles={{ body: { padding: '8px 16px' } }}
    >
      <Tree
        showIcon
        defaultExpandAll
        selectedKeys={[selectedFolderId]}
        onSelect={(keys) => {
          if (keys.length > 0) {
            onSelect(keys[0] as string);
          }
        }}
        treeData={treeData}
      />
    </Card>
  );
}
