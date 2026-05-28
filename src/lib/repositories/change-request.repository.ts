import {
  addChangeRequest,
  getChangeRequestStore,
  updateChangeRequest,
} from '@/lib/change-request-store';
import type { ChangeRequest } from '@/types/document';
import type { Repository } from './types';

export interface ChangeRequestRepository extends Repository<ChangeRequest> {
  listByProject(projectId: string): Promise<ChangeRequest[]>;
}

export class InMemoryChangeRequestRepository implements ChangeRequestRepository {
  async list(): Promise<ChangeRequest[]> {
    return getChangeRequestStore();
  }

  async listByProject(projectId: string): Promise<ChangeRequest[]> {
    return getChangeRequestStore().filter((cr) => cr.projectId === projectId);
  }

  async findById(id: string): Promise<ChangeRequest | null> {
    return getChangeRequestStore().find((cr) => cr.id === id) ?? null;
  }

  async create(entity: ChangeRequest): Promise<ChangeRequest> {
    addChangeRequest(entity);
    return entity;
  }

  async update(
    id: string,
    patch: Partial<ChangeRequest>,
  ): Promise<ChangeRequest | null> {
    // Reuse the existing helper which has the right "must exist" semantics.
    return updateChangeRequest(id, patch);
  }

  async delete(id: string): Promise<ChangeRequest | null> {
    const store = getChangeRequestStore();
    const index = store.findIndex((cr) => cr.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }
}
