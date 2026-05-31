-- PR-27: Change-request + project-approval workflow.
--
-- Two changes:
--   1. EXTEND `change_requests` with impact-analysis columns + the
--      approval-chain audit trail. ALL columns are added with sensible
--      defaults so pre-PR-27 seed rows (which lack the new fields)
--      survive the migration unchanged. No existing column is dropped or
--      renamed.
--   2. ADD `project_approval_requests` register that backs the existing
--      `approval/page.tsx` UI (which was UI-only with no API in PR-26).
--      `decision_history` is JSONB-backed and append-only.
--
-- The CR `status` column stays plain text (not a pgEnum) so the
-- legacy values (`pending`, `approved`) continue to validate alongside
-- the PR-27 granular states (`submitted`, `under_review`, `pm_approved`,
-- `bureau_approved`, `committee_approved`, `applied`, `rejected`). The
-- Zod schemas in `src/types/document.schema.ts` gate the write path.

ALTER TABLE "change_requests" ADD COLUMN "impact_schedule_days" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "change_requests" ADD COLUMN "impact_budget_thb" real NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "change_requests" ADD COLUMN "impact_scope" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "change_requests" ADD COLUMN "approved_by_chain" jsonb NOT NULL DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "change_requests" ADD COLUMN "rejected_reason" text;--> statement-breakpoint
ALTER TABLE "change_requests" ADD COLUMN "decided_at" text;--> statement-breakpoint
CREATE TYPE "public"."approval_request_state" AS ENUM('submitted', 'pm_review', 'bureau_review', 'committee_review', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TABLE "project_approval_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"submitted_by" text NOT NULL,
	"submitted_at" text NOT NULL,
	"state" "approval_request_state" NOT NULL,
	"current_approver_role" text,
	"decision_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
