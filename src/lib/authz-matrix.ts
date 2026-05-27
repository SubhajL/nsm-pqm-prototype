import type { UserRole } from '@/types/admin';

/**
 * Action enum for the project authorization policy layer.
 *
 * Each action represents a discrete, gateable operation a user can attempt on a
 * project (or its child resources). Action names are intentionally domain-named
 * (`approve_milestone`, `submit_daily_report`) rather than HTTP-shaped
 * (`POST /milestones`) so the matrix stays stable as endpoints evolve.
 *
 * NOTE: Adding an action here is a breaking change for `AUTHZ_MATRIX` — the
 * matrix-completeness test (src/lib/authz-matrix.test.ts) will fail until every
 * role has explicitly opted in or out of the new action.
 */
export type Action =
  | 'view'
  | 'edit_basic'
  | 'edit_schedule'
  | 'edit_budget'
  | 'approve_milestone'
  | 'manage_team'
  | 'delete_project'
  | 'sign_handover'
  | 'submit_change_request'
  | 'approve_change_request'
  | 'upload_document'
  | 'approve_document'
  | 'edit_quality_inspection'
  | 'edit_risk'
  | 'edit_issue'
  | 'submit_daily_report'
  | 'approve_daily_report'
  | 'edit_evm'
  | 'create_project'
  | 'edit_wbs'
  | 'edit_boq';

/**
 * Complete list of actions. Used by tests to enforce matrix completeness — every
 * role must have an explicit allow/deny decision for every action.
 */
export const ALL_ACTIONS: readonly Action[] = [
  'view',
  'edit_basic',
  'edit_schedule',
  'edit_budget',
  'approve_milestone',
  'manage_team',
  'delete_project',
  'sign_handover',
  'submit_change_request',
  'approve_change_request',
  'upload_document',
  'approve_document',
  'edit_quality_inspection',
  'edit_risk',
  'edit_issue',
  'submit_daily_report',
  'approve_daily_report',
  'edit_evm',
  'create_project',
  'edit_wbs',
  'edit_boq',
] as const;

/**
 * Complete list of user roles. Used by tests to enforce matrix completeness.
 */
export const ALL_ROLES: readonly UserRole[] = [
  'System Admin',
  'Project Manager',
  'Engineer',
  'Coordinator',
  'Team Member',
  'Executive',
  'Consultant',
] as const;

/**
 * Authorization matrix: which roles can perform which actions.
 *
 * Composition with project visibility is handled by `canPerformProjectAction()`
 * in `project-api-access.ts` — the matrix here only encodes role-level
 * capability; whether the user can SEE the project is a separate (composed)
 * check.
 *
 * Editing guide:
 * - System Admin: super-user — every action.
 * - Project Manager: full project ownership, EXCEPT delete_project (reserved
 *   for sys-admin, since deletion is destructive across all child resources).
 * - Engineer: execution-focused — edits schedule/WBS/BOQ/quality/risk/issues
 *   and submits daily reports, but does NOT approve anything or manage team.
 * - Coordinator: coordination + approval — schedule, daily-report approval,
 *   issues, documents, change-request submission, team management view (no
 *   actual team writes — Coordinators coordinate, PMs assign).
 * - Team Member: minimal — view, submit own daily reports, raise issues.
 * - Executive: read-only — view across all projects (per visibility layer).
 * - Consultant: quality + documents only — supervises inspections and reviews
 *   docs but does not edit schedule/budget.
 *
 * If a permission seems wrong for the demo, update the matrix here AND the
 * matrix-completeness test — do not silently expand at the route level.
 */
export const AUTHZ_MATRIX: Record<UserRole, Set<Action>> = {
  'System Admin': new Set<Action>([
    'view',
    'edit_basic',
    'edit_schedule',
    'edit_budget',
    'approve_milestone',
    'manage_team',
    'delete_project',
    'sign_handover',
    'submit_change_request',
    'approve_change_request',
    'upload_document',
    'approve_document',
    'edit_quality_inspection',
    'edit_risk',
    'edit_issue',
    'submit_daily_report',
    'approve_daily_report',
    'edit_evm',
    'create_project',
    'edit_wbs',
    'edit_boq',
  ]),
  'Project Manager': new Set<Action>([
    'view',
    'edit_basic',
    'edit_schedule',
    'edit_budget',
    'approve_milestone',
    'manage_team',
    // 'delete_project' intentionally omitted — sys-admin only
    'sign_handover',
    'submit_change_request',
    'approve_change_request',
    'upload_document',
    'approve_document',
    'edit_quality_inspection',
    'edit_risk',
    'edit_issue',
    'submit_daily_report',
    'approve_daily_report',
    'edit_evm',
    'create_project',
    'edit_wbs',
    'edit_boq',
  ]),
  Engineer: new Set<Action>([
    'view',
    'edit_schedule',
    'submit_change_request',
    'upload_document',
    'edit_quality_inspection',
    'edit_risk',
    'edit_issue',
    'submit_daily_report',
    'edit_wbs',
    'edit_boq',
  ]),
  Coordinator: new Set<Action>([
    'view',
    'edit_schedule',
    'approve_milestone',
    'submit_change_request',
    'upload_document',
    'edit_risk',
    'edit_issue',
    'submit_daily_report',
    'approve_daily_report',
  ]),
  'Team Member': new Set<Action>([
    'view',
    'edit_issue',
    'submit_daily_report',
  ]),
  Executive: new Set<Action>(['view']),
  Consultant: new Set<Action>([
    'view',
    'edit_quality_inspection',
    'upload_document',
    'approve_document',
  ]),
};
