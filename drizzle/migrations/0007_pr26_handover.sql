-- PR-26: Water/asset/O&M handover workflow (SOP 8.1 + 8.10).
--
-- Adds the four tables that back the handover packet → as-built register
-- + O&M manual + asset registration flow:
--   * handover_packets        (เอกสารส่งมอบ-รับมอบ)
--   * as_built_drawings       (แบบก่อสร้างจริง register)
--   * om_manual_entries       (คู่มือการใช้งานและบำรุงรักษา)
--   * asset_registrations     (การลงทะเบียนทรัพย์สิน, RID asset-system-compatible)
--
-- Three new pg enums are introduced (`handover_state`,
-- `om_manual_category`, `asset_type`). `contract_id` on
-- `handover_packets` is a denormalised text column (no FK) so cross-PR
-- migration ordering with PR-24 is independent.
--
-- Migration filename uses sequential numbering after PR-23's `0005`.
-- The admin merge step renames this file to the next available slot if
-- a sibling Wave-2 PR landed first.

CREATE TYPE "public"."handover_state" AS ENUM('draft', 'submitted', 'committee_review', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."om_manual_category" AS ENUM('operations', 'maintenance', 'safety', 'spare_parts');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('civil', 'mechanical', 'electrical', 'hydraulic', 'instrumentation');--> statement-breakpoint
CREATE TABLE "handover_packets" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"contract_id" text,
	"state" "handover_state" NOT NULL,
	"submitted_at" text,
	"accepted_at" text,
	"warranty_start_date" text,
	"warranty_end_date" text,
	"accepted_by" text,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "as_built_drawings" (
	"id" text PRIMARY KEY NOT NULL,
	"handover_packet_id" text NOT NULL,
	"drawing_number" text NOT NULL,
	"title" text NOT NULL,
	"document_file_id" text,
	"revision" text NOT NULL,
	"uploaded_at" text NOT NULL,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "om_manual_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"handover_packet_id" text NOT NULL,
	"category" "om_manual_category" NOT NULL,
	"title" text NOT NULL,
	"document_file_id" text,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "asset_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"handover_packet_id" text NOT NULL,
	"asset_code" text NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"installed_at" text NOT NULL,
	"installed_location" text NOT NULL,
	"initial_value" real NOT NULL,
	"cost_center" text,
	"notes" text NOT NULL
);
