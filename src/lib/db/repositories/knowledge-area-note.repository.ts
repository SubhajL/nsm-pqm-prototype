import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { knowledgeAreaNotes } from '@/lib/db/schema';
import type { KnowledgeAreaNoteRepository } from '@/lib/repositories/knowledge-area-note.repository';
import type {
  Dt6Area,
  KnowledgeAreaNote,
} from '@/types/knowledge-area-note';

export class DatabaseKnowledgeAreaNoteRepository
  implements KnowledgeAreaNoteRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<KnowledgeAreaNote[]> {
    const rows = await this.db.select().from(knowledgeAreaNotes);
    return rows.map(rowToNote);
  }

  async listByProject(projectId: string): Promise<KnowledgeAreaNote[]> {
    const rows = await this.db
      .select()
      .from(knowledgeAreaNotes)
      .where(eq(knowledgeAreaNotes.projectId, projectId));
    return rows.map(rowToNote);
  }

  async findById(id: string): Promise<KnowledgeAreaNote | null> {
    const rows = await this.db
      .select()
      .from(knowledgeAreaNotes)
      .where(eq(knowledgeAreaNotes.id, id))
      .limit(1);
    return rows[0] ? rowToNote(rows[0]) : null;
  }

  async findLatestByProjectArea(
    projectId: string,
    area: Dt6Area,
  ): Promise<KnowledgeAreaNote | null> {
    const rows = await this.db
      .select()
      .from(knowledgeAreaNotes)
      .where(
        and(
          eq(knowledgeAreaNotes.projectId, projectId),
          eq(knowledgeAreaNotes.area, area),
        ),
      )
      .orderBy(desc(knowledgeAreaNotes.version))
      .limit(1);
    return rows[0] ? rowToNote(rows[0]) : null;
  }

  async create(entity: KnowledgeAreaNote): Promise<KnowledgeAreaNote> {
    const [row] = await this.db
      .insert(knowledgeAreaNotes)
      .values(noteToRow(entity))
      .returning();
    return rowToNote(row);
  }

  async update(
    id: string,
    patch: Partial<KnowledgeAreaNote>,
  ): Promise<KnowledgeAreaNote | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: KnowledgeAreaNote = { ...existing, ...patch };
    const [row] = await this.db
      .update(knowledgeAreaNotes)
      .set(noteToRow(merged))
      .where(eq(knowledgeAreaNotes.id, id))
      .returning();
    return row ? rowToNote(row) : null;
  }

  async delete(id: string): Promise<KnowledgeAreaNote | null> {
    const [row] = await this.db
      .delete(knowledgeAreaNotes)
      .where(eq(knowledgeAreaNotes.id, id))
      .returning();
    return row ? rowToNote(row) : null;
  }
}

type Row = typeof knowledgeAreaNotes.$inferSelect;

function rowToNote(row: Row): KnowledgeAreaNote {
  return {
    id: row.id,
    projectId: row.projectId,
    area: row.area as Dt6Area,
    version: row.version,
    content: row.content,
    authoredBy: row.authoredBy,
    authoredAt: row.authoredAt,
  };
}

function noteToRow(
  n: KnowledgeAreaNote,
): typeof knowledgeAreaNotes.$inferInsert {
  return {
    id: n.id,
    projectId: n.projectId,
    area: n.area,
    version: n.version,
    content: n.content,
    authoredBy: n.authoredBy,
    authoredAt: n.authoredAt,
  };
}
