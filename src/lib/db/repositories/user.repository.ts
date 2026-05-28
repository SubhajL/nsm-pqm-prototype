import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import type { UserRepository } from '@/lib/repositories/user.repository';
import type { User, UserRole } from '@/types/admin';

export class DatabaseUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<User[]> {
    const rows = await this.db.select().from(users);
    return rows.map(rowToUser);
  }

  async listByDepartment(departmentId: string): Promise<User[]> {
    const rows = await this.db.select().from(users).where(eq(users.departmentId, departmentId));
    return rows.map(rowToUser);
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async create(entity: User): Promise<User> {
    const [row] = await this.db.insert(users).values(userToRow(entity)).returning();
    return rowToUser(row);
  }

  async update(id: string, patch: Partial<User>): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: User = { ...existing, ...patch };
    const [row] = await this.db
      .update(users)
      .set(userToRow(merged))
      .where(eq(users.id, id))
      .returning();
    return row ? rowToUser(row) : null;
  }

  async delete(id: string): Promise<User | null> {
    const [row] = await this.db.delete(users).where(eq(users.id, id)).returning();
    return row ? rowToUser(row) : null;
  }
}

type Row = typeof users.$inferSelect;

function rowToUser(row: Row): User {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    role: row.role as UserRole,
    department: row.department,
    departmentId: row.departmentId,
    status: row.status as User['status'],
    projectCount: row.projectCount,
    email: row.email,
    phone: row.phone,
  };
}

function userToRow(user: User): typeof users.$inferInsert {
  return {
    id: user.id,
    name: user.name,
    position: user.position,
    role: user.role,
    department: user.department,
    departmentId: user.departmentId,
    status: user.status,
    projectCount: user.projectCount,
    email: user.email,
    phone: user.phone,
  };
}
