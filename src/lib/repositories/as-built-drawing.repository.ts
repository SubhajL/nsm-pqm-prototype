import type { AsBuiltDrawing } from '@/types/as-built-drawing';

import type { Repository } from './types';

export interface AsBuiltDrawingRepository extends Repository<AsBuiltDrawing> {
  listByHandoverPacket(handoverPacketId: string): Promise<AsBuiltDrawing[]>;
}
