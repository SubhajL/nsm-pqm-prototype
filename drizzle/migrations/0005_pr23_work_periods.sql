-- PR-23: งวดงาน-driven milestone + payment flow.
--
-- Adds the four tables that back the work-period lifecycle:
--   * work_periods           (งวดงาน)
--   * delivery_slips         (ใบส่งมอบงาน — contractor hand-off)
--   * committee_inspections  (committee receive-of-work record; distinct
--                             from the quality-inspection / ITP module)
--   * payment_vouchers       (ใบเบิกจ่ายเงิน)
--
-- Two new pg enums are introduced (`work_period_state`,
-- `payment_voucher_state`). Committee inspection `result` is plain text
-- so future extension values don't require an ALTER TYPE on every
-- preview environment.
--
-- These tables are always created; reachability of the feature is
-- governed at the route layer by `FEATURE_RID_PAYMENT_FLOW`.
--
-- Migration filename uses the literal `00XX` placeholder — the admin
-- merge step renames it to the next sequential number after rebasing
-- onto whichever sibling PR landed first.

CREATE TYPE "public"."work_period_state" AS ENUM('planned', 'in_progress', 'submitted', 'inspection_passed', 'inspection_failed', 'payment_requested', 'payment_approved', 'payment_disbursed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_voucher_state" AS ENUM('draft', 'submitted', 'approved', 'paid', 'rejected');--> statement-breakpoint
CREATE TABLE "work_periods" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"milestone_id" text,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"deliverables" jsonb NOT NULL,
	"planned_start_date" text NOT NULL,
	"planned_end_date" text NOT NULL,
	"amount" real NOT NULL,
	"percentage" real NOT NULL,
	"state" "work_period_state" NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "delivery_slips" (
	"id" text PRIMARY KEY NOT NULL,
	"work_period_id" text NOT NULL,
	"submitted_at" text NOT NULL,
	"submitted_by" text NOT NULL,
	"attached_doc_ids" jsonb NOT NULL,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "committee_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"work_period_id" text NOT NULL,
	"inspected_at" text NOT NULL,
	"inspectors" jsonb NOT NULL,
	"result" text NOT NULL,
	"conditions" text NOT NULL,
	"document_ids" jsonb NOT NULL
);--> statement-breakpoint
CREATE TABLE "payment_vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"work_period_id" text NOT NULL,
	"state" "payment_voucher_state" NOT NULL,
	"requested_amount" real NOT NULL,
	"approved_amount" real,
	"voucher_number" text,
	"paid_at" text,
	"notes" text NOT NULL
);
