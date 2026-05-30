import type { User } from '@/types/admin';
import type { Repository } from './types';

export interface UserRepository extends Repository<User> {
  listByDepartment(departmentId: string): Promise<User[]>;
}
