import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { orgUnits } from '@/lib/db/schema';
import type {
  OrgStructureRepository,
  RidOrgUnitTreeNode,
} from '@/lib/repositories/org-structure.repository';
import type { OrgUnit } from '@/types/admin';
import type { RidOrgUnit } from '@/types/rid/vocabulary';

export class DatabaseOrgStructureRepository implements OrgStructureRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<OrgUnit[]> {
    const rows = await this.db.select().from(orgUnits);
    return rows.map(rowToOrg);
  }

  async findById(id: string): Promise<OrgUnit | null> {
    const rows = await this.db.select().from(orgUnits).where(eq(orgUnits.id, id)).limit(1);
    return rows[0] ? rowToOrg(rows[0]) : null;
  }

  async create(entity: OrgUnit): Promise<OrgUnit> {
    const [row] = await this.db.insert(orgUnits).values(orgToRow(entity)).returning();
    return rowToOrg(row);
  }

  async update(id: string, patch: Partial<OrgUnit>): Promise<OrgUnit | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged = { ...existing, ...patch } as OrgUnit;
    const [row] = await this.db
      .update(orgUnits)
      .set(orgToRow(merged))
      .where(eq(orgUnits.id, id))
      .returning();
    return row ? rowToOrg(row) : null;
  }

  async delete(id: string): Promise<OrgUnit | null> {
    const [row] = await this.db.delete(orgUnits).where(eq(orgUnits.id, id)).returning();
    return row ? rowToOrg(row) : null;
  }

  async hasChildren(parentId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: orgUnits.id })
      .from(orgUnits)
      .where(eq(orgUnits.parentId, parentId))
      .limit(1);
    return rows.length > 0;
  }

  async getRoot(): Promise<RidOrgUnit | null> {
    const all = await this.list();
    return all.find((unit) => unit.parentId === null && unit.kind === 'department') ?? null;
  }

  async getChildren(parentId: string): Promise<RidOrgUnit[]> {
    const rows = await this.db.select().from(orgUnits).where(eq(orgUnits.parentId, parentId));
    return rows.map(rowToOrg);
  }

  async getTreeFor(rootId: string): Promise<RidOrgUnitTreeNode | null> {
    const all = await this.list();
    const root = all.find((unit) => unit.id === rootId);
    if (!root) return null;

    const childrenByParent = new Map<string, RidOrgUnit[]>();
    for (const unit of all) {
      if (unit.parentId === null) continue;
      const bucket = childrenByParent.get(unit.parentId);
      if (bucket) {
        bucket.push(unit);
      } else {
        childrenByParent.set(unit.parentId, [unit]);
      }
    }

    const build = (node: RidOrgUnit): RidOrgUnitTreeNode => {
      const directChildren = childrenByParent.get(node.id) ?? [];
      return {
        unit: node,
        children: directChildren.map(build),
      };
    };

    return build(root);
  }
}

type Row = typeof orgUnits.$inferSelect;

function rowToOrg(row: Row): OrgUnit {
  if (row.kind === 'construction_office') {
    return {
      id: row.id,
      kind: 'construction_office',
      name: row.name,
      nameEn: row.nameEn,
      parentId: row.parentId,
      costCenter: row.costCenter,
      constructionTier: row.constructionTier,
    };
  }
  return {
    id: row.id,
    kind: row.kind as Exclude<OrgUnit['kind'], 'construction_office'>,
    name: row.name,
    nameEn: row.nameEn,
    parentId: row.parentId,
    costCenter: row.costCenter,
  };
}

function orgToRow(unit: OrgUnit): typeof orgUnits.$inferInsert {
  return {
    id: unit.id,
    kind: unit.kind,
    name: unit.name,
    nameEn: unit.nameEn,
    parentId: unit.parentId,
    costCenter: unit.costCenter,
    constructionTier:
      unit.kind === 'construction_office' ? unit.constructionTier ?? null : null,
  };
}
