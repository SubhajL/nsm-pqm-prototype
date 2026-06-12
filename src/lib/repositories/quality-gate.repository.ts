import type { QualityGate } from '@/types/quality';
import type { Repository } from './types';

export interface QualityGateRepository extends Repository<QualityGate> {
  listByProject(projectId: string): Promise<QualityGate[]>;
  /**
   * PR-34 — compare-and-swap: update only while `status` still equals
   * `expected`; null when missing or already transitioned (callers map
   * to 409 STATE_CONFLICT).
   */
  updateIfState(
    id: string,
    expected: QualityGate['status'],
    patch: Partial<QualityGate>,
  ): Promise<QualityGate | null>;
}
