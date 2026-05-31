import type { AssetRegistration } from '@/types/asset-registration';

import type { Repository } from './types';

export interface AssetRegistrationRepository
  extends Repository<AssetRegistration> {
  listByHandoverPacket(handoverPacketId: string): Promise<AssetRegistration[]>;
}
