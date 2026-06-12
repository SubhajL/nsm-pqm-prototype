/**
 * PR-27 — Project approval workflow repository interface.
 *
 * Mirrors the standard CRUD surface from `types.ts`. The
 * `listByProject` accessor lets the per-project API route avoid loading
 * the whole table; `findByProject` returns the most recent ACTIVE (non-
 * terminal) request for a project so the UI can show "there is a
 * pending approval" without paging through history.
 */

import type { ProjectApprovalRequest } from '@/types/project-approval-request';

import type { Repository } from './types';

export interface ProjectApprovalRequestRepository
  extends Repository<ProjectApprovalRequest> {
  /** Every approval request (history + active) for a project. */
  listByProject(projectId: string): Promise<ProjectApprovalRequest[]>;
  /**
   * PR-34 — compare-and-swap: update only while `state` still equals
   * `expected`; null when missing or already transitioned (callers map
   * to 409 STATE_CONFLICT).
   */
  updateIfState(
    id: string,
    expected: ProjectApprovalRequest['state'],
    patch: Partial<ProjectApprovalRequest>,
  ): Promise<ProjectApprovalRequest | null>;
  /**
   * PR-34 — CAS keyed on state AND decision-history length. A
   * `request_changes` decision keeps the state unchanged, so a
   * state-only CAS would let two concurrent decisions both pass and
   * the second full-row write drop the first's append-only history
   * entry. The history-length predicate makes the later writer lose.
   */
  updateIfStateAndHistoryLength(
    id: string,
    expectedState: ProjectApprovalRequest['state'],
    expectedHistoryLength: number,
    patch: Partial<ProjectApprovalRequest>,
  ): Promise<ProjectApprovalRequest | null>;
}
