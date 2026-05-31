/**
 * PR-19 — Drizzle schema barrel.
 *
 * Re-exports every table so callers can `import * as schema` and pass the
 * whole bag to `drizzle({ schema })`. The Drizzle client uses this object
 * as the relational-query lookup table; if you add a new table file,
 * also add its re-export below.
 */

export * from './enums';
export * from './project.schema';
export * from './wbs.schema';
export * from './boq.schema';
export * from './milestone.schema';
export * from './gantt.schema';
export * from './daily-report.schema';
export * from './quality-inspection.schema';
export * from './quality-gate.schema';
export * from './risk.schema';
export * from './issue.schema';
export * from './document.schema';
export * from './change-request.schema';
export * from './team-membership.schema';
export * from './evm.schema';
export * from './user.schema';
export * from './org-structure.schema';
export * from './audit-event.schema';
export * from './notification.schema';
export * from './permit.schema';
export * from './environmental-assessment.schema';
export * from './public-hearing.schema';
export * from './land-acquisition.schema';
export * from './project-approval-request.schema';
