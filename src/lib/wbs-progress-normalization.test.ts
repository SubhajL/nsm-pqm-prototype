import { describe, expect, it } from 'vitest';

import type { WBSNode } from '@/hooks/useWBS';
import { normalizeProjectWbsProgress } from '@/lib/wbs-progress-normalization';

// ---------------------------------------------------------------------------
// Characterization tests: lock CURRENT leaf-to-parent rollup behavior in
// normalizeProjectWbsProgress. The function mutates the input array in place.
// ---------------------------------------------------------------------------

function makeNode(overrides: Partial<WBSNode>): WBSNode {
  return {
    id: overrides.id ?? '',
    projectId: 'P-TEST',
    parentId: overrides.parentId ?? null,
    code: overrides.code ?? '',
    name: overrides.name ?? '',
    weight: overrides.weight ?? 0,
    progress: overrides.progress ?? 0,
    level: overrides.level ?? 0,
    hasBOQ: overrides.hasBOQ ?? false,
  };
}

function progressById(nodes: WBSNode[]) {
  return Object.fromEntries(nodes.map((n) => [n.id, n.progress] as const));
}

describe('normalizeProjectWbsProgress', () => {
  it('returns an empty array unchanged', () => {
    expect(normalizeProjectWbsProgress([])).toEqual([]);
  });

  it('leaves a single root with no children at its current progress', () => {
    const nodes: WBSNode[] = [
      makeNode({ id: 'r', parentId: null, code: '1', weight: 100, progress: 42 }),
    ];
    normalizeProjectWbsProgress(nodes);
    expect(progressById(nodes)).toEqual({ r: 42 });
  });

  it('rolls up two leaves into a weighted root (60/40 weights)', () => {
    const nodes: WBSNode[] = [
      makeNode({ id: 'root', parentId: null, code: '1', weight: 100, progress: 0, level: 0 }),
      makeNode({ id: 'a', parentId: 'root', code: '1.1', weight: 60, progress: 80, level: 1 }),
      makeNode({ id: 'b', parentId: 'root', code: '1.2', weight: 40, progress: 50, level: 1 }),
    ];
    normalizeProjectWbsProgress(nodes);
    // (80*60 + 50*40) / 100 = 68
    expect(progressById(nodes)).toEqual({ root: 68, a: 80, b: 50 });
  });

  it('rolls up a 3-level tree, recomputing intermediate nodes from leaves', () => {
    const nodes: WBSNode[] = [
      makeNode({ id: 'root', parentId: null, code: '1', weight: 100, progress: 0, level: 0 }),
      makeNode({ id: 'a', parentId: 'root', code: '1.1', weight: 50, progress: 0, level: 1 }),
      makeNode({ id: 'b', parentId: 'root', code: '1.2', weight: 50, progress: 0, level: 1 }),
      makeNode({ id: 'a1', parentId: 'a', code: '1.1.1', weight: 50, progress: 100, level: 2 }),
      makeNode({ id: 'a2', parentId: 'a', code: '1.1.2', weight: 50, progress: 60, level: 2 }),
      makeNode({ id: 'b1', parentId: 'b', code: '1.2.1', weight: 100, progress: 25, level: 2 }),
    ];
    normalizeProjectWbsProgress(nodes);
    // a = (100*50 + 60*50) / 100 = 80
    // b = 25
    // root = (80*50 + 25*50) / 100 = 52.5
    expect(progressById(nodes)).toEqual({ root: 52.5, a: 80, b: 25, a1: 100, a2: 60, b1: 25 });
  });

  it('falls back to a simple average when all child weights are zero', () => {
    const nodes: WBSNode[] = [
      makeNode({ id: 'root', parentId: null, code: '1', weight: 100, progress: 0, level: 0 }),
      makeNode({ id: 'a', parentId: 'root', code: '1.1', weight: 0, progress: 30, level: 1 }),
      makeNode({ id: 'b', parentId: 'root', code: '1.2', weight: 0, progress: 70, level: 1 }),
    ];
    normalizeProjectWbsProgress(nodes);
    // (30 + 70) / 2 = 50
    expect(progressById(nodes)).toEqual({ root: 50, a: 30, b: 70 });
  });

  it('clamps leaf progress into [0, 100] before rolling up', () => {
    const nodes: WBSNode[] = [
      makeNode({ id: 'root', parentId: null, code: '1', weight: 100, progress: 0, level: 0 }),
      makeNode({ id: 'a', parentId: 'root', code: '1.1', weight: 50, progress: 150, level: 1 }),
      makeNode({ id: 'b', parentId: 'root', code: '1.2', weight: 50, progress: -20, level: 1 }),
    ];
    normalizeProjectWbsProgress(nodes);
    // 150 clamped to 100, -20 clamped to 0, weighted avg = (100*50 + 0*50)/100 = 50
    expect(progressById(nodes)).toEqual({ root: 50, a: 100, b: 0 });
  });

  it('processes two parallel root trees independently', () => {
    const nodes: WBSNode[] = [
      makeNode({ id: 'r1', parentId: null, code: '1', weight: 50, progress: 0, level: 0 }),
      makeNode({ id: 'r2', parentId: null, code: '2', weight: 50, progress: 0, level: 0 }),
      makeNode({ id: 'r1c1', parentId: 'r1', code: '1.1', weight: 100, progress: 40, level: 1 }),
      makeNode({ id: 'r2c1', parentId: 'r2', code: '2.1', weight: 100, progress: 90, level: 1 }),
    ];
    normalizeProjectWbsProgress(nodes);
    expect(progressById(nodes)).toEqual({ r1: 40, r2: 90, r1c1: 40, r2c1: 90 });
  });

  it('mutates the input array in place and returns the same reference', () => {
    const nodes: WBSNode[] = [
      makeNode({ id: 'root', parentId: null, code: '1', weight: 100, progress: 0, level: 0 }),
      makeNode({ id: 'a', parentId: 'root', code: '1.1', weight: 100, progress: 75, level: 1 }),
    ];
    const result = normalizeProjectWbsProgress(nodes);
    expect(result).toBe(nodes);
    expect(nodes[0].progress).toBe(75);
  });
});
