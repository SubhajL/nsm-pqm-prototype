import type { HandoverPacket } from '@/types/handover-packet';

import type { Repository } from './types';

export interface HandoverPacketRepository extends Repository<HandoverPacket> {
  listByProject(projectId: string): Promise<HandoverPacket[]>;
}
