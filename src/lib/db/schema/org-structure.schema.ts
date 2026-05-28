import { pgTable, text } from 'drizzle-orm/pg-core';

import { projectSizeTierEnum, ridOrgUnitKindEnum } from './enums';

/**
 * RidOrgUnit storage — the type is a discriminated union on `kind`. We
 * persist as a single flat row with `kind` as the discriminator and the
 * one extra qualifier `constructionTier` nullable for every kind except
 * `construction_office`. The repository re-validates the union shape on
 * the way out.
 */
export const orgUnits = pgTable('org_units', {
  id: text('id').primaryKey(),
  kind: ridOrgUnitKindEnum('kind').notNull(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  parentId: text('parent_id'),
  costCenter: text('cost_center'),
  /** Only meaningful when `kind = construction_office`. Nullable otherwise. */
  constructionTier: projectSizeTierEnum('construction_tier'),
});

export type OrgUnitRow = typeof orgUnits.$inferSelect;
export type OrgUnitInsert = typeof orgUnits.$inferInsert;
