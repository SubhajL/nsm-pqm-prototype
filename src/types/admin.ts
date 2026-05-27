export type UserRole =
  | 'System Admin'
  | 'Project Manager'
  | 'Engineer'
  | 'Coordinator'
  | 'Team Member'
  | 'Executive'
  | 'Consultant';

export interface User {
  id: string;
  name: string;
  position: string;
  role: UserRole;
  department: string;
  departmentId: string;
  status: 'active' | 'suspended';
  projectCount: number;
  email: string;
  phone: string;
}

/**
 * Admin's org-unit type is the canonical RID multi-tier org unit from
 * `@/types/rid/vocabulary` (PR-13). PR-17 replaced the legacy flat
 * `{ id, name, nameEn, parentId, userCount }` shape with the discriminated
 * `RidOrgUnit` union so that bureau / regional_office / construction_office /
 * provincial_office / om_project / basin tiers are first-class.
 */
export type { RidOrgUnit as OrgUnit } from '@/types/rid/vocabulary';

/**
 * API-response shape: canonical OrgUnit augmented with a derived `userCount`
 * (number of users whose `departmentId` references this unit). The count is
 * computed per request from the user store, not persisted on the org unit.
 */
import type { RidOrgUnit } from '@/types/rid/vocabulary';
export type OrgUnitWithUserCount = RidOrgUnit & { userCount: number };

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  ip: string;
  os: string;
  module: string;
  action: string;
  timestamp: string;
}

export const MODULE_COLORS: Record<string, string> = {
  Task: 'blue',
  'Daily Report': 'cyan',
  Login: 'green',
  Document: 'purple',
  Risk: 'red',
  Quality: 'orange',
  Approval: 'green',
  Issue: 'red',
  Team: 'blue',
};
