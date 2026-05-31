import type { TorDocument } from '@/types/tor-document';

import type { Repository } from './types';

export interface TorDocumentRepository extends Repository<TorDocument> {
  listByProcurementPackage(procurementPackageId: string): Promise<TorDocument[]>;
}
