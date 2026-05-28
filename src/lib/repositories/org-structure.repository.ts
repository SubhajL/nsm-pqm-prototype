import {
  addOrgUnit,
  deleteOrgUnit,
  getChildOrgUnits,
  getOrgStructureStore,
  getOrgUnitTreeFor,
  getRootOrgUnit,
  updateOrgUnit,
  type RidOrgUnitTreeNode,
} from '@/lib/org-structure-store';
import type { OrgUnit } from '@/types/admin';
import type { RidOrgUnit } from '@/types/rid/vocabulary';
import type { Repository } from './types';

export interface OrgStructureRepository extends Repository<OrgUnit> {
  hasChildren(parentId: string): Promise<boolean>;
  getRoot(): Promise<RidOrgUnit | null>;
  getChildren(parentId: string): Promise<RidOrgUnit[]>;
  getTreeFor(rootId: string): Promise<RidOrgUnitTreeNode | null>;
}

export class InMemoryOrgStructureRepository implements OrgStructureRepository {
  async list(): Promise<OrgUnit[]> {
    return getOrgStructureStore();
  }

  async findById(id: string): Promise<OrgUnit | null> {
    return getOrgStructureStore().find((unit) => unit.id === id) ?? null;
  }

  async create(entity: OrgUnit): Promise<OrgUnit> {
    return addOrgUnit(entity);
  }

  async update(id: string, patch: Partial<OrgUnit>): Promise<OrgUnit | null> {
    // The store helper's signature constrains `updates` to `Partial<Omit<OrgUnit, 'id'>>`;
    // strip an accidental `id` field before delegating.
    const { id: _droppedId, ...rest } = patch as Partial<OrgUnit> & { id?: string };
    void _droppedId;
    return updateOrgUnit(id, rest);
  }

  async delete(id: string): Promise<OrgUnit | null> {
    return deleteOrgUnit(id);
  }

  async hasChildren(parentId: string): Promise<boolean> {
    return getOrgStructureStore().some((unit) => unit.parentId === parentId);
  }

  async getRoot(): Promise<RidOrgUnit | null> {
    return getRootOrgUnit();
  }

  async getChildren(parentId: string): Promise<RidOrgUnit[]> {
    return getChildOrgUnits(parentId);
  }

  async getTreeFor(rootId: string): Promise<RidOrgUnitTreeNode | null> {
    return getOrgUnitTreeFor(rootId);
  }
}
