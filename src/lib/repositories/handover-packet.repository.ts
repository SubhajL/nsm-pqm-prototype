import type { HandoverPacket } from '@/types/handover-packet';

import type { Repository } from './types';

export interface HandoverPacketRepository extends Repository<HandoverPacket> {
  listByProject(projectId: string): Promise<HandoverPacket[]>;
  /**
   * PR-34 — compare-and-swap: update only while `state` still equals
   * `expected`; null when missing or already transitioned (callers map
   * to 409 STATE_CONFLICT).
   */
  updateIfState(
    id: string,
    expected: HandoverPacket['state'],
    patch: Partial<HandoverPacket>,
  ): Promise<HandoverPacket | null>;
}
