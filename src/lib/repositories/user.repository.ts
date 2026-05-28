import { addUser, getUserStore, updateUser } from '@/lib/user-store';
import type { User } from '@/types/admin';
import type { Repository } from './types';

export interface UserRepository extends Repository<User> {
  listByDepartment(departmentId: string): Promise<User[]>;
}

export class InMemoryUserRepository implements UserRepository {
  async list(): Promise<User[]> {
    return getUserStore();
  }

  async listByDepartment(departmentId: string): Promise<User[]> {
    return getUserStore().filter((user) => user.departmentId === departmentId);
  }

  async findById(id: string): Promise<User | null> {
    return getUserStore().find((user) => user.id === id) ?? null;
  }

  async create(entity: User): Promise<User> {
    return addUser(entity);
  }

  async update(id: string, patch: Partial<User>): Promise<User | null> {
    return updateUser(id, patch);
  }

  async delete(id: string): Promise<User | null> {
    const store = getUserStore();
    const index = store.findIndex((user) => user.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }
}
