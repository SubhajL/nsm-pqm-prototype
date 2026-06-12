import type { ContractAmendment } from '@/types/contract-amendment';

import type { Repository } from './types';

export interface ContractAmendmentRepository
  extends Repository<ContractAmendment> {
  listByContract(contractId: string): Promise<ContractAmendment[]>;
  /** PR-34 — highest amendment number (server-side sequence assignment). */
  findLatestByContract(contractId: string): Promise<ContractAmendment | null>;
}
