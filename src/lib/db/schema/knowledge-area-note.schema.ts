/**
 * PR-30a — `knowledge_area_notes` (DT6 per-area free-form notes).
 *
 * Mirrors `KnowledgeAreaNote` in `src/types/knowledge-area-note.ts`.
 * Versioning is append-only: every edit creates a new row with
 * `version = previous + 1` per `(projectId, area)`. The route layer
 * computes the next version.
 */

import { integer, pgTable, text } from 'drizzle-orm/pg-core';

import { dt6AreaEnum } from './enums';

export const knowledgeAreaNotes = pgTable('knowledge_area_notes', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  area: dt6AreaEnum('area').notNull(),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  authoredBy: text('authored_by').notNull(),
  authoredAt: text('authored_at').notNull(),
});

export type KnowledgeAreaNoteRow = typeof knowledgeAreaNotes.$inferSelect;
export type KnowledgeAreaNoteInsert = typeof knowledgeAreaNotes.$inferInsert;
