import seedOrgStructure from '@/data/org-structure.json';
import type { OrgUnit } from '@/types/admin';
import type { RidOrgUnit } from '@/types/rid/vocabulary';

declare global {
  // eslint-disable-next-line no-var
  var __nsmOrgStructureStore: OrgUnit[] | undefined;
}

function cloneOrgUnit(unit: OrgUnit): OrgUnit {
  return { ...unit };
}

export function getOrgStructureStore() {
  if (!globalThis.__nsmOrgStructureStore) {
    globalThis.__nsmOrgStructureStore = (seedOrgStructure as OrgUnit[]).map(cloneOrgUnit);
  }

  return globalThis.__nsmOrgStructureStore;
}

export function addOrgUnit(unit: OrgUnit) {
  const store = getOrgStructureStore();
  store.push(unit);
  return unit;
}

export function updateOrgUnit(
  unitId: string,
  updates: Partial<Omit<OrgUnit, 'id'>>,
) {
  const store = getOrgStructureStore();
  const index = store.findIndex((unit) => unit.id === unitId);

  if (index < 0) {
    return null;
  }

  // Cast: the partial-update payload comes from a Zod-validated discriminated
  // union, so any combination it produces is sound at runtime. The cast is
  // local to the store mutation and the discriminator/qualifier invariants
  // are re-asserted by the Zod schema before any data reaches this point.
  store[index] = {
    ...store[index],
    ...updates,
  } as OrgUnit;

  return store[index];
}

export function deleteOrgUnit(unitId: string) {
  const store = getOrgStructureStore();
  const index = store.findIndex((unit) => unit.id === unitId);

  if (index < 0) {
    return null;
  }

  const [deleted] = store.splice(index, 1);
  return deleted;
}

// ---------------------------------------------------------------------------
// PR-17 tree helpers.
//
// Provide ergonomic lookup of the root department, immediate children of any
// node, and a fully nested subtree rooted at a given id. The flat store stays
// the source of truth; these helpers compute the tree shape on demand.
// ---------------------------------------------------------------------------

export interface RidOrgUnitTreeNode {
  unit: RidOrgUnit;
  children: RidOrgUnitTreeNode[];
}

/**
 * The single root department (the `kind: 'department'` unit with no parent).
 * Returns `null` if no such unit exists (defensive — the seed always ships
 * exactly one). If multiple roots are present, the first match wins.
 */
export function getRootOrgUnit(): RidOrgUnit | null {
  const store = getOrgStructureStore();
  return store.find((unit) => unit.parentId === null && unit.kind === 'department') ?? null;
}

/**
 * Direct children of `parentId`. Order matches insertion order in the store.
 */
export function getChildOrgUnits(parentId: string): RidOrgUnit[] {
  const store = getOrgStructureStore();
  return store.filter((unit) => unit.parentId === parentId);
}

/**
 * Builds a nested subtree rooted at `rootId`. Returns `null` if `rootId`
 * does not exist in the store. Each node's `children` array is sorted by
 * insertion order (mirroring `getChildOrgUnits`).
 *
 * Implementation: a single linear pass groups units by `parentId`, then a
 * recursive walk assembles the tree. This avoids O(n^2) re-scans when the
 * tree is large.
 */
export function getOrgUnitTreeFor(rootId: string): RidOrgUnitTreeNode | null {
  const store = getOrgStructureStore();
  const root = store.find((unit) => unit.id === rootId);
  if (!root) return null;

  const childrenByParent = new Map<string, RidOrgUnit[]>();
  for (const unit of store) {
    if (unit.parentId === null) continue;
    const bucket = childrenByParent.get(unit.parentId);
    if (bucket) {
      bucket.push(unit);
    } else {
      childrenByParent.set(unit.parentId, [unit]);
    }
  }

  function build(node: RidOrgUnit): RidOrgUnitTreeNode {
    const directChildren = childrenByParent.get(node.id) ?? [];
    return {
      unit: node,
      children: directChildren.map(build),
    };
  }

  return build(root);
}
