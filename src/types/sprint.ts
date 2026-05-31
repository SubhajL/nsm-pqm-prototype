/**
 * PR-30a — IT Sprint entity (Hybrid-Agile per PMI Thailand Chapter).
 *
 * One `ItSprint` row per development sprint, nested inside a lifecycle
 * stage on an IT-class project. RID's DT6 Digital Project Management
 * Document treats sprints as a tactical layer beneath the lifecycle
 * stage they belong to — they do NOT replace the stage gate.
 *
 * - `lifecycleStage` is stored as plain text (matches the existing
 *   `RidLifecycleStage` union) so cross-table coupling stays loose.
 * - `velocityPoints` is the planned capacity (story points).
 * - `completedPoints` is the actuals; pure helpers in
 *   `src/lib/rid/it-class-helpers.ts` derive a health banding.
 */

export interface ItSprint {
  id: string;
  projectId: string;
  /** RidLifecycleStage value referenced as plain text (loose coupling). */
  lifecycleStage: string;
  /** Sequential sprint number on this project (1-indexed). */
  sprintNumber: number;
  /** ISO 8601 (CE) date. */
  startDate: string;
  /** ISO 8601 (CE) date. */
  endDate: string;
  /** Sprint goal — short bilingual statement. */
  goal: string;
  /** Story points planned for the sprint. */
  velocityPoints: number;
  /** Story points actually completed. */
  completedPoints: number;
  notes: string;
}
