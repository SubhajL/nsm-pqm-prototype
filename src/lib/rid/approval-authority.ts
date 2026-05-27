/**
 * Approval-authority routing per project size tier.
 *
 * This module owns the mapping from `ProjectSizeTier` (defined in
 * `src/types/rid/vocabulary.ts`) to the organizational authority required to
 * approve a project at that tier. Per stakeholder confirmation on 2026-05-28
 * (see MVP_EXECUTION_PLAN.md §PR-14):
 *
 *   - small  (<= 50M THB)         -> section head
 *   - medium (50M – 500M THB)     -> bureau director
 *   - large  (> 500M THB)         -> deputy director-general
 *
 * The role-to-authority mapping (`ROLES_SATISFYING_AUTHORITY`) is a MVP
 * placeholder pending RID confirmation of which application UserRoles are
 * considered equivalent to each org-chart authority. PR-15+ will compose this
 * table with `canPerformProjectAction()` in the authz layer; this PR ships
 * the table only — no behaviour change.
 */
import {
  PROJECT_SIZE_TIERS,
  type ProjectSizeTier,
} from '@/types/rid/vocabulary';
import type { UserRole } from '@/types/admin';

/**
 * Organizational authority required to approve a project, ordered by ascending
 * seniority. Used by tier-aware approval flows in PR-15+.
 */
export type ApprovalAuthority =
  | 'section_head'
  | 'bureau_director'
  | 'deputy_director_general';

/**
 * Tier → required authority. Exhaustive over `ProjectSizeTier`; the test suite
 * enforces completeness via `PROJECT_SIZE_TIERS`.
 */
export const APPROVAL_AUTHORITY_BY_TIER: Record<
  ProjectSizeTier,
  ApprovalAuthority
> = {
  small: 'section_head',
  medium: 'bureau_director',
  large: 'deputy_director_general',
};

/**
 * Returns the approval authority required to approve a project at the given
 * size tier. Pure lookup over `APPROVAL_AUTHORITY_BY_TIER`.
 */
export function getRequiredApprovalAuthority(
  tier: ProjectSizeTier,
): ApprovalAuthority {
  return APPROVAL_AUTHORITY_BY_TIER[tier];
}

/**
 * NOTE (MVP placeholder, pending RID confirmation):
 *
 * Maps each `ApprovalAuthority` to the set of `UserRole`s that satisfy it.
 * The intent is that any user holding one of the listed roles is considered
 * to wield (at least) that authority. `System Admin` is always included
 * because admins bypass tier gating by policy.
 *
 * The actual RID org chart distinguishes section heads, bureau directors,
 * and deputy directors-general as distinct positions within the same broad
 * "Project Manager" application role; until the admin module models those
 * positions explicitly (planned for PR-17), the MVP treats `Project Manager`
 * as satisfying `section_head` and `bureau_director` but NOT
 * `deputy_director_general` (which only `System Admin` can satisfy in MVP).
 *
 * This conservative mapping fails closed: anything large-tier currently
 * requires System Admin sign-off, which is the safest default until RID
 * sign-off on the richer role model.
 */
export const ROLES_SATISFYING_AUTHORITY: Record<ApprovalAuthority, UserRole[]> =
  {
    section_head: ['System Admin', 'Project Manager'],
    bureau_director: ['System Admin', 'Project Manager'],
    deputy_director_general: ['System Admin'],
  };

/**
 * Convenience predicate: does the given UserRole satisfy the given
 * ApprovalAuthority under the MVP role-coverage table?
 */
export function roleSatisfiesAuthority(
  role: UserRole,
  authority: ApprovalAuthority,
): boolean {
  return ROLES_SATISFYING_AUTHORITY[authority].includes(role);
}

/**
 * Internal completeness guard — referenced by the test suite to ensure every
 * `ProjectSizeTier` value has an entry in `APPROVAL_AUTHORITY_BY_TIER`.
 */
export const _PROJECT_SIZE_TIERS_FOR_COVERAGE_CHECK = PROJECT_SIZE_TIERS;
