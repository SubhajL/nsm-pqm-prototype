/**
 * Pure UI helpers for the IT-class (DT6) surface.
 *
 * These wrap the client-safe pure helpers in
 * `src/lib/rid/it-class-helpers.ts` so the tabs render ONLY the legal
 * next-state buttons and a consistent health visual without duplicating
 * the domain logic. The server routes remain the final authority
 * (409 INVALID_TRANSITION; 422 IT_ONLY_FEATURE on non-IT projects).
 *
 * Vocabulary note: DT6 (RID's Digital Project Management Document) is
 * canonical here — no PMBOK terminology.
 */

import type { computeSprintHealth } from '@/lib/rid/it-class-helpers';
import { canTransitionSow } from '@/lib/rid/it-class-helpers';
import { canEditProjectBasics } from '@/lib/project-access-pure';
import type { UserRole } from '@/types/admin';
import type { KnowledgeAreaNote } from '@/types/knowledge-area-note';
import { SOW_STATES, type SowState } from '@/types/vendor-sow';

/**
 * Every state the SOW may legally move to from `from`. Excludes the
 * self-transition. Order follows `SOW_STATES` so `accepted` renders
 * before the `rejected` rework action on the UAT step.
 */
export function getLegalNextSowStates(from: SowState): SowState[] {
  return SOW_STATES.filter((to) => to !== from && canTransitionSow(from, to).ok);
}

/**
 * Whether the current user may create SOWs/sprints/notes or record
 * transitions. Thin alias over the central `canEditProjectBasics` rule
 * (PR-31 cleanup); the server additionally enforces the IT-only guard.
 */
export const canManageItClass: (
  role: UserRole | null | undefined,
) => boolean = canEditProjectBasics;

/**
 * The active DT6 note: highest `version` in the list, or null when no
 * note has been authored yet. History is append-only server-side.
 */
export function latestNote(
  notes: readonly KnowledgeAreaNote[] | undefined,
): KnowledgeAreaNote | null {
  if (!notes || notes.length === 0) return null;
  return notes.reduce((acc, note) => (note.version > acc.version ? note : acc));
}

/**
 * Whether an API error is the IT-only guard (`422 IT_ONLY_FEATURE`).
 * Should not occur in practice — the tabset renders only for IT-class
 * projects — but a stale cache or direct navigation can still hit it.
 */
export function isItOnlyFeatureError(error: unknown): boolean {
  const candidate = error as { code?: string; status?: number } | null;
  return candidate?.code === 'IT_ONLY_FEATURE' || candidate?.status === 422;
}

type SprintHealth = ReturnType<typeof computeSprintHealth>;

const SPRINT_HEALTH_VISUALS: Record<SprintHealth, { label: string; color: string }> = {
  on_track: { label: 'ทันกำหนด (On Track)', color: 'success' },
  at_risk: { label: 'เสี่ยง (At Risk)', color: 'warning' },
  off_track: { label: 'ล่าช้า (Off Track)', color: 'error' },
};

/** Bilingual label + AntD tag color for a `computeSprintHealth` band. */
export function sprintHealthVisual(health: SprintHealth): {
  label: string;
  color: string;
} {
  return SPRINT_HEALTH_VISUALS[health];
}
