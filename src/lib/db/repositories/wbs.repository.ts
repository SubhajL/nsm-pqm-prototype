import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { wbsNodes } from '@/lib/db/schema';
import type { WbsRepository } from '@/lib/repositories/wbs.repository';
import type { WBSNode } from '@/hooks/useWBS';

export class DatabaseWbsRepository implements WbsRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<WBSNode[]> {
    const rows = await this.db.select().from(wbsNodes);
    return rows.map(rowToNode);
  }

  async listByProject(projectId: string): Promise<WBSNode[]> {
    const rows = await this.db.select().from(wbsNodes).where(eq(wbsNodes.projectId, projectId));
    return rows.map(rowToNode);
  }

  async findById(id: string): Promise<WBSNode | null> {
    const rows = await this.db.select().from(wbsNodes).where(eq(wbsNodes.id, id)).limit(1);
    return rows[0] ? rowToNode(rows[0]) : null;
  }

  async create(entity: WBSNode): Promise<WBSNode> {
    const [row] = await this.db.insert(wbsNodes).values(nodeToRow(entity)).returning();
    return rowToNode(row);
  }

  async update(id: string, patch: Partial<WBSNode>): Promise<WBSNode | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: WBSNode = { ...existing, ...patch };
    const [row] = await this.db
      .update(wbsNodes)
      .set(nodeToRow(merged))
      .where(eq(wbsNodes.id, id))
      .returning();
    return row ? rowToNode(row) : null;
  }

  async delete(id: string): Promise<WBSNode | null> {
    const [row] = await this.db.delete(wbsNodes).where(eq(wbsNodes.id, id)).returning();
    return row ? rowToNode(row) : null;
  }
}

type Row = typeof wbsNodes.$inferSelect;

function rowToNode(row: Row): WBSNode {
  return {
    id: row.id,
    projectId: row.projectId,
    parentId: row.parentId,
    code: row.code,
    name: row.name,
    weight: row.weight,
    progress: row.progress,
    level: row.level,
    hasBOQ: row.hasBOQ,
  };
}

function nodeToRow(node: WBSNode): typeof wbsNodes.$inferInsert {
  return {
    id: node.id,
    projectId: node.projectId,
    parentId: node.parentId,
    code: node.code,
    name: node.name,
    weight: node.weight,
    progress: node.progress,
    level: node.level,
    hasBOQ: node.hasBOQ,
  };
}
