-- PR-25: Compliance registers (permits, environmental assessments,
-- public hearings, land acquisition).
--
-- Adds four register tables that back the pre-construction clearance
-- workflow. These are paired with a lifecycle-gate change in
-- `src/lib/rid/lifecycle-artifacts.ts` that adds
-- `pre_construction_clearance` as a second required artifact on the
-- `construction` stage (SOP 8.2 approval remains the first).
--
-- The public_hearings register has no enum — its workflow is implicit in
-- whether a minutes-of-meeting document has been attached.

CREATE TYPE "public"."permit_status" AS ENUM('draft', 'submitted', 'issued', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."eia_status" AS ENUM('not_started', 'in_progress', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."land_acquisition_status" AS ENUM('identified', 'negotiating', 'compensated', 'transferred', 'contested');--> statement-breakpoint
CREATE TABLE "permits" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"permit_type" text NOT NULL,
	"title" text NOT NULL,
	"issuing_authority" text NOT NULL,
	"status" "permit_status" NOT NULL,
	"issued_at" text,
	"expires_at" text,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "environmental_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" "eia_status" NOT NULL,
	"approved_at" text,
	"approval_reference" text,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "public_hearings" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"held_at" text NOT NULL,
	"location" text NOT NULL,
	"attendee_count" integer NOT NULL,
	"summary" text NOT NULL,
	"signed_minute_doc_id" text
);--> statement-breakpoint
CREATE TABLE "land_acquisition_records" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"parcel_reference" text NOT NULL,
	"landowner_name" text NOT NULL,
	"area_rai" real NOT NULL,
	"status" "land_acquisition_status" NOT NULL,
	"compensation_amount" real,
	"notes" text NOT NULL
);
