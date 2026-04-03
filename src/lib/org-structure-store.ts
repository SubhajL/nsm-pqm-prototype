import seedOrgStructure from '@/data/org-structure.json';
import type { OrgUnit } from '@/types/admin';

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

  store[index] = {
    ...store[index],
    ...updates,
  };

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
