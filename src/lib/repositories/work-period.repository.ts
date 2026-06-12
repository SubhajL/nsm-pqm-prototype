import type { WorkPeriod } from '@/types/work-period';

import type { Repository } from './types';

export interface WorkPeriodRepository extends Repository<WorkPeriod> {
  listByProject(projectId: string): Promise<WorkPeriod[]>;
  /**
   * PR-34 — compare-and-swap: update only while `state` still equals
   * `expected`; null when missing or already transitioned (callers map
   * to 409 STATE_CONFLICT).
   */
  updateIfState(
    id: string,
    expected: WorkPeriod['state'],
    patch: Partial<WorkPeriod>,
  ): Promise<WorkPeriod | null>;
}
