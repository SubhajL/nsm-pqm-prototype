import type { ChangeRequest } from '@/types/document';
import type { Repository } from './types';

export interface ChangeRequestRepository extends Repository<ChangeRequest> {
  listByProject(projectId: string): Promise<ChangeRequest[]>;
  /**
   * PR-34 — compare-and-swap: update only while `status` still equals
   * `expected`; null when missing or already transitioned (callers map
   * to 409 STATE_CONFLICT).
   */
  updateIfState(
    id: string,
    expected: ChangeRequest['status'],
    patch: Partial<ChangeRequest>,
  ): Promise<ChangeRequest | null>;
}
