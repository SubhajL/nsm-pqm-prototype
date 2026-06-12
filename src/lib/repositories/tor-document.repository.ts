import type { TorDocument } from '@/types/tor-document';

import type { Repository } from './types';

export interface TorDocumentRepository extends Repository<TorDocument> {
  listByProcurementPackage(procurementPackageId: string): Promise<TorDocument[]>;
  /** PR-34 — highest-version TOR (server-side sequence assignment). */
  findLatestByProcurementPackage(
    procurementPackageId: string,
  ): Promise<TorDocument | null>;
}
