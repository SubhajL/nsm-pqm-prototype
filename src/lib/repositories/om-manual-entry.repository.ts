import type { OmManualEntry } from '@/types/om-manual';

import type { Repository } from './types';

export interface OmManualEntryRepository extends Repository<OmManualEntry> {
  listByHandoverPacket(handoverPacketId: string): Promise<OmManualEntry[]>;
}
