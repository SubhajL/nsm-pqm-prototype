-- PR-30a: IT projectClass extensions.
--
-- Adds three tables backing the IT-class surfaces:
--   * vendor_sows           (Statement of Work per phase + UAT criteria)
--   * it_sprints            (Hybrid-Agile sprints nested in lifecycle stage)
--   * knowledge_area_notes  (DT6 free-form notes — integration,
--                            communication_plan, formal_procurement_plan)
--
-- Two new pg enums are introduced (`sow_state`, `dt6_area`). Sprint
-- `lifecycle_stage` stays plain text to avoid coupling to the
-- `rid_lifecycle_stage` enum.
--
-- These tables are always created; reachability is governed at the route
-- layer by a `projectClass === 'it'` check that returns
-- `422 IT_ONLY_FEATURE` on non-IT projects.
--
-- Migration filename uses the next sequential slot. Concurrent-merge note:
-- if siblings land first, the admin merge step renames this file to the
-- next available number.

CREATE TYPE "public"."sow_state" AS ENUM('draft', 'agreed', 'in_delivery', 'uat', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."dt6_area" AS ENUM('integration', 'communication_plan', 'formal_procurement_plan');--> statement-breakpoint
CREATE TABLE "vendor_sows" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"contract_id" text,
	"phase" text NOT NULL,
	"scope_summary" text NOT NULL,
	"uat_criteria" text NOT NULL,
	"warranty_months" integer,
	"state" "sow_state" NOT NULL,
	"signed_at" text,
	"accepted_at" text,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "it_sprints" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"lifecycle_stage" text NOT NULL,
	"sprint_number" integer NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"goal" text NOT NULL,
	"velocity_points" real NOT NULL,
	"completed_points" real NOT NULL,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "knowledge_area_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"area" "dt6_area" NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"authored_by" text NOT NULL,
	"authored_at" text NOT NULL
);
