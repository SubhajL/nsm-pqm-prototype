import type { VendorSow } from '@/types/vendor-sow';

import type { Repository } from './types';

export interface VendorSowRepository extends Repository<VendorSow> {
  listByProject(projectId: string): Promise<VendorSow[]>;
  /**
   * PR-34 — compare-and-swap: update only while `state` still equals
   * `expected`; null when missing or already transitioned (callers map
   * to 409 STATE_CONFLICT).
   */
  updateIfState(
    id: string,
    expected: VendorSow['state'],
    patch: Partial<VendorSow>,
  ): Promise<VendorSow | null>;
}
