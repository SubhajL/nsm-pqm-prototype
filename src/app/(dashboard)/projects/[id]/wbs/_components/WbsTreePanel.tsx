'use client';

import { Card, Empty, Tree } from 'antd';

import type { WBSTreeNode } from './helpers';

export function WbsTreePanel({
  treeData,
  defaultExpandedKeys,
  selectedWbsId,
  onSelect,
}: {
  treeData: WBSTreeNode[];
  defaultExpandedKeys: string[];
  selectedWbsId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <Card
      title="WBS Tree View"
      styles={{ body: { padding: '12px 16px', maxHeight: 600, overflow: 'auto' } }}
    >
      {treeData.length > 0 ? (
        <Tree
          showLine={{ showLeafIcon: false }}
          showIcon={false}
          treeData={treeData}
          defaultExpandedKeys={defaultExpandedKeys}
          selectedKeys={selectedWbsId ? [selectedWbsId] : []}
          onSelect={(keys) => {
            if (keys.length > 0) {
              onSelect(keys[0] as string);
            }
          }}
          blockNode
        />
      ) : (
        <Empty description="ไม่พบข้อมูล WBS" />
      )}
    </Card>
  );
}
