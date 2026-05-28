'use client';

import { Progress } from 'antd';
import type { DataNode } from 'antd/es/tree';

import type { WBSNode } from '@/hooks/useWBS';
import { COLORS } from '@/theme/antd-theme';

export interface WBSTreeNode extends DataNode {
  key: string;
  title: React.ReactNode;
  children: WBSTreeNode[];
}

export function findPreferredWbsNodeId(
  nodes: WBSNode[],
  pendingSelectedWbsId: string | null,
  currentSelectedWbsId?: string,
) {
  if (
    pendingSelectedWbsId &&
    nodes.some((node) => node.id === pendingSelectedWbsId)
  ) {
    return pendingSelectedWbsId;
  }

  if (currentSelectedWbsId && nodes.some((node) => node.id === currentSelectedWbsId)) {
    return currentSelectedWbsId;
  }

  return (
    nodes.find((node) => node.level > 0 && node.hasBOQ)?.id ??
    nodes.find((node) => node.level > 0)?.id ??
    nodes[0]?.id
  );
}

export function buildTree(nodes: WBSNode[]): WBSTreeNode[] {
  const map = new Map<string, WBSTreeNode>();
  const roots: WBSTreeNode[] = [];

  // First pass: create tree node entries keyed by id
  for (const node of nodes) {
    map.set(node.id, {
      key: node.id,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span>
            {node.code} {node.name} ({node.weight}%)
          </span>
          <Progress
            percent={node.progress}
            size="small"
            strokeColor={COLORS.accentTeal}
            style={{ width: 80, marginBottom: 0 }}
            format={() => `${node.progress}%`}
          />
        </span>
      ),
      children: [],
    });
  }

  // Second pass: wire children to parents
  for (const node of nodes) {
    const treeNode = map.get(node.id)!;
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  return roots;
}
