/**
 * Pure UI helpers for the การส่งมอบ-รับมอบ (handover) surface.
 *
 * These wrap the client-safe pure helpers in
 * `src/lib/rid/handover-helpers.ts` so the packet card renders ONLY the
 * legal next-state buttons and the completeness checklist mirrors the
 * server's SOP 8.1 artifact gate. The server route remains the final
 * authority — it re-checks every move and returns 409 INVALID_TRANSITION /
 * 409 INCOMPLETE_HANDOVER (with a `missing` key array) on rejection.
 */

import {
  canTransitionHandover,
  isHandoverComplete,
  type HandoverCompletenessResult,
} from '@/lib/rid/handover-helpers';
import type { UserRole } from '@/types/admin';
import type { AsBuiltDrawing } from '@/types/as-built-drawing';
import type { AssetRegistration } from '@/types/asset-registration';
import { HANDOVER_STATES, type HandoverState } from '@/types/handover-packet';
import {
  OM_MANUAL_CATEGORY_LABELS,
  type OmManualCategory,
  type OmManualEntry,
} from '@/types/om-manual';

/**
 * Every state the packet may legally move to from `from`. Excludes the
 * self-transition. The returned order follows `HANDOVER_STATES` so the UI
 * renders `accepted` before the `rejected` revise action.
 */
export function getLegalNextHandoverStates(from: HandoverState): HandoverState[] {
  return HANDOVER_STATES.filter(
    (to) => to !== from && canTransitionHandover(from, to).ok,
  );
}

/**
 * Whether the current user may create packets / file artifacts / record
 * transitions. Mirrors the procurement rule: System Admin and Project
 * Manager manage; everyone else reads. The server independently enforces
 * `edit_basic` per project.
 */
export function canManageHandover(role: UserRole | null | undefined): boolean {
  return role === 'System Admin' || role === 'Project Manager';
}

/**
 * Bridge the three artifact-register record lists into the shape
 * `isHandoverComplete` consumes, so the UI checklist and the server gate
 * derive from the same SSOT.
 */
export function completenessFromRecords(
  drawings: readonly AsBuiltDrawing[],
  omEntries: readonly OmManualEntry[],
  assets: readonly AssetRegistration[],
): HandoverCompletenessResult {
  return isHandoverComplete({
    asBuiltCount: drawings.length,
    omManualCategoriesPresent: new Set<OmManualCategory>(
      omEntries.map((entry) => entry.category),
    ),
    assetCount: assets.length,
  });
}

/**
 * Mirror of the route's REQUIRES_COMPLETENESS set: the forward path
 * (`submitted` / `committee_review` / `accepted`) demands the full SOP 8.1
 * artifact set; `rejected` and the rejected → `draft` revise loop are
 * exempt so the committee can recycle incomplete packets.
 */
export function requiresCompleteness(target: HandoverState): boolean {
  return target === 'submitted' || target === 'committee_review' || target === 'accepted';
}

const ARTIFACT_LABELS: Record<string, string> = {
  as_built_drawings: 'แบบก่อสร้างจริง (As-built drawings)',
  asset_registrations: 'ทะเบียนทรัพย์สิน (Asset registrations)',
  ...Object.fromEntries(
    Object.entries(OM_MANUAL_CATEGORY_LABELS).map(([category, label]) => [
      `om_manual_${category}`,
      `คู่มือ${label.th} (O&M: ${label.en})`,
    ]),
  ),
};

/**
 * Bilingual display label for a completeness `missing` key (either from
 * `completenessFromRecords` or a 409 INCOMPLETE_HANDOVER envelope).
 * Unknown keys fall back to the raw key so a server-side vocabulary
 * extension degrades readably instead of crashing.
 */
export function missingArtifactLabel(key: string): string {
  return ARTIFACT_LABELS[key] ?? key;
}
