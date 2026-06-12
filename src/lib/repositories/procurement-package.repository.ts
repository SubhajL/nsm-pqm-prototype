import type { ProcurementPackage } from '@/types/procurement-package';

import type { Repository } from './types';

export interface ProcurementPackageRepository
  extends Repository<ProcurementPackage> {
  listByProject(projectId: string): Promise<ProcurementPackage[]>;
  /**
   * PR-34 — compare-and-swap: update only while `state` still equals
   * `expected`; null when missing or already transitioned (callers map
   * to 409 STATE_CONFLICT).
   */
  updateIfState(
    id: string,
    expected: ProcurementPackage['state'],
    patch: Partial<ProcurementPackage>,
  ): Promise<ProcurementPackage | null>;
}
