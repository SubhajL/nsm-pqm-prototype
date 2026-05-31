/**
 * PR-27 — Pure routing rules for the change-request and project-approval
 * workflows.
 *
 * Two responsibilities:
 *   1. Classify a CR's required approval level given its budget impact and
 *      the parent project's size tier (per PR-14 authority table).
 *   2. Gate state transitions for both `ChangeRequest.status` and
 *      `ProjectApprovalRequest.state` by actor role.
 *
 * This module is the SINGLE place where transition legality lives — API
 * routes call into it before writing, and the pure form lets us unit-test
 * the rules without a DB. No I/O. No imports from the persistence layer.
 *
 * Role → authority mapping reuses the conservative MVP table in
 * `src/lib/rid/approval-authority.ts`:
 *   - `pm` and `bureau_head` tiers are satisfied by `Project Manager` and
 *     `System Admin`.
 *   - `committee` is satisfied by `System Admin` only (placeholder until
 *     RID confirms a richer committee-member role).
 *
 * Threshold contract for `requiredApprovalLevelForChangeRequest`:
 *   - |impact| < ฿1M                       → 'pm'
 *   - ฿1M ≤ |impact| < ฿10M               → 'bureau_head'
 *   - |impact| ≥ ฿10M  OR  sizeTier='large' → 'committee'
 *
 * Negative budget deltas (scope reductions) are bucketed by absolute
 * magnitude — a ฿15M REDUCTION is as material as a ฿15M INCREASE.
 */

import type { UserRole } from '@/types/admin';
import type { ChangeRequest } from '@/types/document';
import type {
  ApprovalRequestApproverRole,
  ProjectApprovalRequest,
} from '@/types/project-approval-request';
import type { ProjectSizeTier } from '@/types/rid/vocabulary';

export type ApprovalLevel = 'pm' | 'bureau_head' | 'committee';

/** ฿1M — boundary between small and medium CRs (inclusive lower for medium). */
const MEDIUM_CR_BUDGET_THRESHOLD_THB = 1_000_000;
/** ฿10M — boundary between medium and large CRs (inclusive lower for large). */
const LARGE_CR_BUDGET_THRESHOLD_THB = 10_000_000;

/**
 * Classifies which approver tier must sign off on a change request.
 *
 * Rule:
 *   1. If the parent project is `large` size tier, ALL CRs route to the
 *      committee — large projects are inherently high-risk.
 *   2. Otherwise bucket by absolute budget impact:
 *        - |impact| < ฿1M  → pm
 *        - |impact| < ฿10M → bureau_head
 *        - else            → committee
 *
 * Pure — no I/O, no side effects.
 */
export function requiredApprovalLevelForChangeRequest(
  impactBudgetTHB: number,
  projectSizeTier: ProjectSizeTier,
): ApprovalLevel {
  if (projectSizeTier === 'large') {
    return 'committee';
  }
  const magnitude = Math.abs(impactBudgetTHB);
  if (magnitude < MEDIUM_CR_BUDGET_THRESHOLD_THB) return 'pm';
  if (magnitude < LARGE_CR_BUDGET_THRESHOLD_THB) return 'bureau_head';
  return 'committee';
}

// ---------------------------------------------------------------------------
// Role → authority capability table (PR-14 conservative MVP mapping).
// ---------------------------------------------------------------------------

/**
 * Roles that can approve at the PM tier. Project Manager + System Admin
 * per `ROLES_SATISFYING_AUTHORITY.section_head` in approval-authority.ts.
 */
const PM_TIER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'System Admin',
  'Project Manager',
]);

/**
 * Roles that can approve at the bureau-head tier. Same set as PM in the
 * MVP role table — admins explicitly bypass; PMs act as bureau heads
 * until the richer position model lands (planned for after PR-17).
 */
const BUREAU_TIER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'System Admin',
  'Project Manager',
]);

/**
 * Roles that can approve at the committee tier. Admin-only in the
 * conservative MVP table (fails closed for large-tier sign-off).
 */
const COMMITTEE_TIER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'System Admin',
]);

function roleCanActAtLevel(role: UserRole, level: ApprovalLevel): boolean {
  if (level === 'pm') return PM_TIER_ROLES.has(role);
  if (level === 'bureau_head') return BUREAU_TIER_ROLES.has(role);
  return COMMITTEE_TIER_ROLES.has(role);
}

// ---------------------------------------------------------------------------
// ChangeRequest state machine.
// ---------------------------------------------------------------------------

type CRStatus = ChangeRequest['status'];

/**
 * Allowed `(from, to)` pairs for `ChangeRequest.status`, paired with the
 * approval tier whose role must perform the transition. `null` tier means
 * "any role with approve_change_request can do it" (used for the initial
 * `submitted → under_review` triage step and for `* → rejected`).
 */
const CHANGE_REQUEST_TRANSITIONS: ReadonlyArray<{
  from: CRStatus;
  to: CRStatus;
  level: ApprovalLevel | null;
}> = [
  { from: 'submitted', to: 'under_review', level: null },
  { from: 'under_review', to: 'pm_approved', level: 'pm' },
  { from: 'under_review', to: 'bureau_approved', level: 'bureau_head' },
  { from: 'under_review', to: 'committee_approved', level: 'committee' },
  { from: 'pm_approved', to: 'bureau_approved', level: 'bureau_head' },
  { from: 'pm_approved', to: 'applied', level: 'pm' },
  { from: 'bureau_approved', to: 'committee_approved', level: 'committee' },
  { from: 'bureau_approved', to: 'applied', level: 'bureau_head' },
  { from: 'committee_approved', to: 'applied', level: 'committee' },
];

const CR_TERMINAL_STATES: ReadonlySet<CRStatus> = new Set<CRStatus>([
  'applied',
  'rejected',
]);

type TransitionResult = { ok: true } | { ok: false; reason: string };

export function canTransitionChangeRequest(
  from: CRStatus,
  to: CRStatus,
  actorRole: UserRole,
): TransitionResult {
  if (CR_TERMINAL_STATES.has(from)) {
    return {
      ok: false,
      reason: `Cannot transition out of terminal state "${from}"`,
    };
  }
  if (from === to) {
    return { ok: false, reason: `Self-transition from "${from}" is a no-op` };
  }
  if (to === 'rejected') {
    // Any role with PM-tier or higher can reject. Use the most permissive
    // tier (`pm`) so the matrix question is "is this role an approver at
    // all" rather than "is this role the *current* approver".
    if (!roleCanActAtLevel(actorRole, 'pm')) {
      return {
        ok: false,
        reason: `Role "${actorRole}" is not permitted to reject a change request`,
      };
    }
    return { ok: true };
  }

  const allowed = CHANGE_REQUEST_TRANSITIONS.find(
    (entry) => entry.from === from && entry.to === to,
  );
  if (!allowed) {
    return {
      ok: false,
      reason: `Transition "${from}" → "${to}" is not in the change-request state machine`,
    };
  }
  if (allowed.level !== null && !roleCanActAtLevel(actorRole, allowed.level)) {
    return {
      ok: false,
      reason: `Role "${actorRole}" lacks "${allowed.level}" approval capability for "${from}" → "${to}"`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// ProjectApprovalRequest state machine.
// ---------------------------------------------------------------------------

type ApprovalState = ProjectApprovalRequest['state'];

/**
 * Allowed `(from, to)` pairs for `ProjectApprovalRequest.state`, paired
 * with the approval tier whose role must perform the transition. `null`
 * tier means "any approver-capable role" — used for the initial intake
 * (`submitted → pm_review`) which is a triage step, and for rejection /
 * withdrawal which are submitter or approver-driven escape hatches.
 */
const APPROVAL_TRANSITIONS: ReadonlyArray<{
  from: ApprovalState;
  to: ApprovalState;
  level: ApprovalLevel | null;
}> = [
  { from: 'submitted', to: 'pm_review', level: null },
  { from: 'pm_review', to: 'bureau_review', level: 'pm' },
  { from: 'pm_review', to: 'approved', level: 'pm' },
  { from: 'bureau_review', to: 'committee_review', level: 'bureau_head' },
  { from: 'bureau_review', to: 'approved', level: 'bureau_head' },
  { from: 'committee_review', to: 'approved', level: 'committee' },
];

const APPROVAL_TERMINAL_STATES: ReadonlySet<ApprovalState> = new Set<ApprovalState>([
  'approved',
  'rejected',
  'withdrawn',
]);

export function canTransitionApprovalRequest(
  from: ApprovalState,
  to: ApprovalState,
  actorRole: UserRole,
): TransitionResult {
  if (APPROVAL_TERMINAL_STATES.has(from)) {
    return {
      ok: false,
      reason: `Cannot transition out of terminal state "${from}"`,
    };
  }
  if (from === to) {
    return { ok: false, reason: `Self-transition from "${from}" is a no-op` };
  }
  if (to === 'rejected' || to === 'withdrawn') {
    if (!roleCanActAtLevel(actorRole, 'pm')) {
      return {
        ok: false,
        reason: `Role "${actorRole}" is not permitted to ${to === 'rejected' ? 'reject' : 'withdraw'} an approval request`,
      };
    }
    return { ok: true };
  }

  const allowed = APPROVAL_TRANSITIONS.find(
    (entry) => entry.from === from && entry.to === to,
  );
  if (!allowed) {
    return {
      ok: false,
      reason: `Transition "${from}" → "${to}" is not in the approval state machine`,
    };
  }
  if (allowed.level !== null && !roleCanActAtLevel(actorRole, allowed.level)) {
    return {
      ok: false,
      reason: `Role "${actorRole}" lacks "${allowed.level}" approval capability for "${from}" → "${to}"`,
    };
  }
  return { ok: true };
}

/**
 * Maps a `ProjectApprovalRequest.state` to the role that must act on it
 * next. Returns `null` for terminal states.
 *
 * Used by the API route to populate `currentApproverRole` after a
 * transition lands.
 */
export function nextApproverRoleForState(
  state: ApprovalState,
): ApprovalRequestApproverRole | null {
  switch (state) {
    case 'submitted':
    case 'pm_review':
      return 'pm';
    case 'bureau_review':
      return 'bureau_head';
    case 'committee_review':
      return 'committee';
    case 'approved':
    case 'rejected':
    case 'withdrawn':
      return null;
  }
}
