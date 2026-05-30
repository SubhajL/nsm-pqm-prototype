import type { OrgUnit } from '@/types/admin';
import type { RidOrgUnit } from '@/types/rid/vocabulary';
import type { Repository } from './types';

export interface RidOrgUnitTreeNode {
  unit: RidOrgUnit;
  children: RidOrgUnitTreeNode[];
}

export interface OrgStructureRepository extends Repository<OrgUnit> {
  hasChildren(parentId: string): Promise<boolean>;
  getRoot(): Promise<RidOrgUnit | null>;
  getChildren(parentId: string): Promise<RidOrgUnit[]>;
  getTreeFor(rootId: string): Promise<RidOrgUnitTreeNode | null>;
}
