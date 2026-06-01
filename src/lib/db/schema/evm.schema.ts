import { numeric, pgTable, real, text } from 'drizzle-orm/pg-core';

/**
 * EVM data points — one row per (projectId, month). The InMemory impl
 * keeps the array sorted by month after every insert; the DB impl
 * achieves the same via ORDER BY.
 */
export const evmDataPoints = pgTable('evm_data_points', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  month: text('month').notNull(),
  monthThai: text('month_thai').notNull(),
  pv: numeric('pv', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  ev: numeric('ev', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  ac: numeric('ac', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  paidToDate: numeric('paid_to_date', { precision: 14, scale: 2, mode: 'number' }),
  spi: real('spi').notNull(),
  cpi: real('cpi').notNull(),
});

export type EvmRow = typeof evmDataPoints.$inferSelect;
export type EvmInsert = typeof evmDataPoints.$inferInsert;

/**
 * Lightweight registry of project ids that have been "initialized" for EVM
 * reporting — separate from the data-point table so an empty project can
 * still appear in EVM listings before any data is recorded.
 */
export const evmProjectRegistry = pgTable('evm_project_registry', {
  projectId: text('project_id').primaryKey(),
});

export type EvmProjectRegistryRow = typeof evmProjectRegistry.$inferSelect;
export type EvmProjectRegistryInsert = typeof evmProjectRegistry.$inferInsert;
