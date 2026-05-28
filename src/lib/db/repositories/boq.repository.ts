import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { boqItems } from '@/lib/db/schema';
import type { BoqRepository } from '@/lib/repositories/boq.repository';
import type { BOQItem } from '@/hooks/useBOQ';

export class DatabaseBoqRepository implements BoqRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<BOQItem[]> {
    const rows = await this.db.select().from(boqItems);
    return rows.map(rowToItem);
  }

  async listByWbs(wbsId: string): Promise<BOQItem[]> {
    const rows = await this.db.select().from(boqItems).where(eq(boqItems.wbsId, wbsId));
    return rows.map(rowToItem);
  }

  async findById(id: string): Promise<BOQItem | null> {
    const rows = await this.db.select().from(boqItems).where(eq(boqItems.id, id)).limit(1);
    return rows[0] ? rowToItem(rows[0]) : null;
  }

  async create(entity: BOQItem): Promise<BOQItem> {
    const [row] = await this.db.insert(boqItems).values(itemToRow(entity)).returning();
    return rowToItem(row);
  }

  async update(id: string, patch: Partial<BOQItem>): Promise<BOQItem | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: BOQItem = { ...existing, ...patch };
    const [row] = await this.db
      .update(boqItems)
      .set(itemToRow(merged))
      .where(eq(boqItems.id, id))
      .returning();
    return row ? rowToItem(row) : null;
  }

  async delete(id: string): Promise<BOQItem | null> {
    const [row] = await this.db.delete(boqItems).where(eq(boqItems.id, id)).returning();
    return row ? rowToItem(row) : null;
  }
}

type Row = typeof boqItems.$inferSelect;

function rowToItem(row: Row): BOQItem {
  return {
    id: row.id,
    wbsId: row.wbsId,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPrice,
    total: row.total,
  };
}

function itemToRow(item: BOQItem): typeof boqItems.$inferInsert {
  return {
    id: item.id,
    wbsId: item.wbsId,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    total: item.total,
  };
}
