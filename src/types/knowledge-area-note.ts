/**
 * PR-30a — DT6 knowledge-area notes (RID's Digital Project Management
 * Document).
 *
 * IT-class projects keep free-form notes per "knowledge area" — three
 * canonical areas drawn from RID's own DT6 publication (not PMBOK
 * directly). Per stakeholder guidance: don't impose PMBOK terminology;
 * align to DT6.
 *
 * Each edit creates a new row with `version: previous + 1`. The history
 * is append-only — the active note is the highest `version` per
 * `(projectId, area)`.
 */

export const DT6_AREAS = [
  'integration',
  'communication_plan',
  'formal_procurement_plan',
] as const;

export type Dt6Area = (typeof DT6_AREAS)[number];

export interface KnowledgeAreaNote {
  id: string;
  projectId: string;
  area: Dt6Area;
  /** Monotonically increasing per `(projectId, area)`. */
  version: number;
  /** Markdown-style free text body. */
  content: string;
  /** `User.id` of the author. */
  authoredBy: string;
  /** ISO 8601 timestamp. */
  authoredAt: string;
}

export const DT6_AREA_LABELS: Record<Dt6Area, { th: string; en: string }> = {
  integration: { th: 'การบูรณาการ', en: 'Integration' },
  communication_plan: { th: 'แผนการสื่อสาร', en: 'Communication Plan' },
  formal_procurement_plan: {
    th: 'แผนการจัดซื้อจัดจ้าง',
    en: 'Formal Procurement Plan',
  },
};
