import { pgTable, real, text } from 'drizzle-orm/pg-core';

import { landAcquisitionStatusEnum } from './enums';

export const landAcquisitionRecords = pgTable('land_acquisition_records', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  parcelReference: text('parcel_reference').notNull(),
  landownerName: text('landowner_name').notNull(),
  areaRai: real('area_rai').notNull(),
  status: landAcquisitionStatusEnum('status').notNull(),
  compensationAmount: real('compensation_amount'),
  notes: text('notes').notNull(),
});

export type LandAcquisitionRow =
  typeof landAcquisitionRecords.$inferSelect;
export type LandAcquisitionInsert =
  typeof landAcquisitionRecords.$inferInsert;
