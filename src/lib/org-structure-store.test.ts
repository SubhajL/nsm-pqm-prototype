import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  addOrgUnit,
  getChildOrgUnits,
  getOrgStructureStore,
  getOrgUnitTreeFor,
  getRootOrgUnit,
} from './org-structure-store';
import type { OrgUnit } from '@/types/admin';

// ---------------------------------------------------------------------------
// PR-17 — tree helpers built on top of the flat org-structure store.
//
// Each test resets the global store to the seed (by clearing the
// __nsmOrgStructureStore global and forcing a re-import) so assertions
// against the seed shape are stable.
// ---------------------------------------------------------------------------

interface GlobalState {
  __nsmOrgStructureStore: OrgUnit[] | undefined;
}

function resetStore() {
  (globalThis as unknown as GlobalState).__nsmOrgStructureStore = undefined;
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  resetStore();
});

describe('getRootOrgUnit', () => {
  it('returns the single department root from the seed', () => {
    const root = getRootOrgUnit();
    expect(root).not.toBeNull();
    expect(root?.kind).toBe('department');
    expect(root?.parentId).toBeNull();
    expect(root?.id).toBe('dept-root');
  });

  it('exposes the costCenter property on the root (nullable per PR-17 default)', () => {
    const root = getRootOrgUnit();
    // Property must exist on the type — null is the seed default.
    expect(root?.costCenter).toBeNull();
  });
});

describe('getChildOrgUnits', () => {
  it('returns the direct children of the root', () => {
    const children = getChildOrgUnits('dept-root');
    expect(children.length).toBeGreaterThanOrEqual(3);
    expect(children.every((c) => c.parentId === 'dept-root')).toBe(true);
  });

  it('returns deeper-level children when given a non-root parent id', () => {
    const children = getChildOrgUnits('dept-001');
    expect(children.length).toBeGreaterThan(0);
    expect(children.every((c) => c.parentId === 'dept-001')).toBe(true);
  });

  it('returns an empty list for a leaf node', () => {
    const children = getChildOrgUnits('dept-001-1');
    expect(children).toEqual([]);
  });

  it('returns an empty list for an unknown id', () => {
    expect(getChildOrgUnits('does-not-exist')).toEqual([]);
  });
});

describe('getOrgUnitTreeFor', () => {
  it('returns null for an unknown root id', () => {
    expect(getOrgUnitTreeFor('missing')).toBeNull();
  });

  it('builds a nested tree rooted at the requested node', () => {
    const tree = getOrgUnitTreeFor('dept-root');
    expect(tree).not.toBeNull();
    expect(tree?.unit.id).toBe('dept-root');
    expect(tree?.children.length).toBeGreaterThan(0);
    // The root has a known grandchild via dept-001 -> dept-001-1.
    const dept001 = tree?.children.find((node) => node.unit.id === 'dept-001');
    expect(dept001).toBeDefined();
    expect(dept001?.children.some((c) => c.unit.id === 'dept-001-1')).toBe(true);
  });

  it('preserves the discriminator at every node', () => {
    const tree = getOrgUnitTreeFor('dept-root');
    function walk(node: NonNullable<typeof tree>): void {
      expect(typeof node.unit.kind).toBe('string');
      for (const child of node.children) walk(child);
    }
    if (tree) walk(tree);
  });

  it('reflects in-memory additions on subsequent calls', () => {
    addOrgUnit({
      id: 'dept-test-child',
      kind: 'bureau',
      name: 'ทดสอบ',
      nameEn: 'Test Bureau',
      parentId: 'dept-root',
      costCenter: null,
    });
    const tree = getOrgUnitTreeFor('dept-root');
    const found = tree?.children.find((node) => node.unit.id === 'dept-test-child');
    expect(found).toBeDefined();
  });
});

describe('seed store basics', () => {
  it('starts non-empty and every entry has a kind discriminator', () => {
    const store = getOrgStructureStore();
    expect(store.length).toBeGreaterThan(0);
    for (const unit of store) {
      expect(unit).toHaveProperty('kind');
      expect(unit).toHaveProperty('costCenter');
    }
  });
});
