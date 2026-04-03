import type { WBSNode } from '@/hooks/useWBS';

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function computeWeightedProgress(children: WBSNode[]) {
  if (children.length === 0) {
    return 0;
  }

  const totalWeight = children.reduce((sum, child) => sum + child.weight, 0);
  if (totalWeight <= 0) {
    return (
      children.reduce((sum, child) => sum + child.progress, 0) /
      children.length
    );
  }

  return (
    children.reduce((sum, child) => sum + child.progress * child.weight, 0) /
    totalWeight
  );
}

export function normalizeProjectWbsProgress(projectNodes: WBSNode[]) {
  const nodesById = new Map(projectNodes.map((node) => [node.id, node]));
  const childrenByParent = new Map<string | null, WBSNode[]>();

  projectNodes.forEach((node) => {
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  });

  const normalizeNode = (node: WBSNode): number => {
    const children = (childrenByParent.get(node.id) ?? [])
      .slice()
      .sort((left, right) => left.code.localeCompare(right.code, 'th'));

    if (children.length === 0) {
      return clampPercent(node.progress);
    }

    children.forEach((child) => {
      const currentChild = nodesById.get(child.id);
      if (currentChild) {
        currentChild.progress = clampPercent(normalizeNode(currentChild));
      }
    });

    const refreshedChildren = (childrenByParent.get(node.id) ?? []).map(
      (child) => nodesById.get(child.id) ?? child,
    );
    node.progress = clampPercent(computeWeightedProgress(refreshedChildren));
    return node.progress;
  };

  const rootNodes = projectNodes
    .filter((node) => node.parentId === null)
    .sort((left, right) => left.code.localeCompare(right.code, 'th'));

  rootNodes.forEach((rootNode) => {
    normalizeNode(rootNode);
  });

  return projectNodes;
}
