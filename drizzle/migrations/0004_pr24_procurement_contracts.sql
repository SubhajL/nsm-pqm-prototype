-- PR-24: Procurement packages, TOR documents, engineering estimates,
-- awarded contracts, contract amendments, and contractor pre-qualifications.
--
-- Adds the six tables that back the RID-fit procurement → contract
-- workflow. Three new enums are introduced (`procurement_state`,
-- `procurement_method`, `engineering_estimate_basis`, `contract_state`);
-- the existing `contracting_model` enum from PR-RID-A is reused by
-- `awarded_contracts`.

CREATE TYPE "public"."procurement_state" AS ENUM('draft', 'tor_review', 'tender_open', 'evaluation', 'awarded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."procurement_method" AS ENUM('e_bidding', 'specific_method', 'selection', 'reverse_auction');--> statement-breakpoint
CREATE TYPE "public"."engineering_estimate_basis" AS ENUM('unit_price', 'cost_plus', 'lump_sum');--> statement-breakpoint
CREATE TYPE "public"."contract_state" AS ENUM('draft', 'signed', 'in_force', 'closed', 'terminated');--> statement-breakpoint
CREATE TABLE "procurement_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"state" "procurement_state" NOT NULL,
	"budget_ceiling" real NOT NULL,
	"procurement_method" "procurement_method" NOT NULL,
	"opened_at" text,
	"closed_at" text,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "tor_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"procurement_package_id" text NOT NULL,
	"version" integer NOT NULL,
	"scope_summary" text NOT NULL,
	"technical_requirements" text NOT NULL,
	"delivery_schedule" text NOT NULL,
	"evaluation_criteria" text NOT NULL,
	"document_file_id" text,
	"approved_at" text
);--> statement-breakpoint
CREATE TABLE "engineering_estimates" (
	"id" text PRIMARY KEY NOT NULL,
	"procurement_package_id" text NOT NULL,
	"boq_id" text,
	"basis" "engineering_estimate_basis" NOT NULL,
	"estimated_total" real NOT NULL,
	"contingency_percent" real NOT NULL,
	"estimated_by" text NOT NULL,
	"estimated_at" text NOT NULL,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "awarded_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"procurement_package_id" text NOT NULL,
	"project_id" text NOT NULL,
	"contract_number" text NOT NULL,
	"contractor_name" text NOT NULL,
	"contractor_tax_id" text,
	"award_amount" real NOT NULL,
	"contracting_model" "contracting_model" NOT NULL,
	"state" "contract_state" NOT NULL,
	"signed_at" text,
	"effective_date" text,
	"expiration_date" text,
	"warranty_months" integer,
	"notes" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "contract_amendments" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"amendment_number" integer NOT NULL,
	"amended_at" text NOT NULL,
	"amount_delta" real NOT NULL,
	"schedule_delta_days" integer NOT NULL,
	"reason" text NOT NULL,
	"approved_by" text NOT NULL,
	"document_file_id" text
);--> statement-breakpoint
CREATE TABLE "contractor_prequalifications" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"contractor_name" text NOT NULL,
	"contractor_tax_id" text,
	"prequalified_at" text NOT NULL,
	"valid_until" text,
	"ahp_score" real,
	"evidence_doc_ids" jsonb NOT NULL,
	"notes" text NOT NULL
);
