CREATE TYPE "public"."contracting_model" AS ENUM('lump_sum', 'unit_price', 'cost_plus', 'design_build');--> statement-breakpoint
CREATE TYPE "public"."delivery_method" AS ENUM('in_house', 'outsourced', 'consultant_supervised');--> statement-breakpoint
CREATE TYPE "public"."project_class" AS ENUM('construction', 'it', 'consulting', 'research', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."project_size_tier" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TYPE "public"."rid_lifecycle_stage" AS ENUM('planning', 'land_acquisition', 'survey_design', 'procurement', 'construction', 'handover', 'om');--> statement-breakpoint
CREATE TYPE "public"."rid_org_unit_kind" AS ENUM('department', 'bureau', 'regional_office', 'construction_office', 'provincial_office', 'om_project', 'basin');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text NOT NULL,
	"type" text NOT NULL,
	"delivery_method" "delivery_method" NOT NULL,
	"contracting_model" "contracting_model",
	"size_tier" "project_size_tier" NOT NULL,
	"status" text NOT NULL,
	"budget" real NOT NULL,
	"progress" real NOT NULL,
	"schedule_health" text,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"duration" integer NOT NULL,
	"spi_value" real NOT NULL,
	"cpi_value" real NOT NULL,
	"manager_id" text NOT NULL,
	"manager_name" text NOT NULL,
	"department_id" text NOT NULL,
	"department_name" text NOT NULL,
	"open_issues" integer NOT NULL,
	"high_risks" integer NOT NULL,
	"current_milestone" integer NOT NULL,
	"total_milestones" integer NOT NULL,
	"current_lifecycle_stage" "rid_lifecycle_stage" NOT NULL,
	"lifecycle_stage_history" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wbs_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"parent_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"weight" real NOT NULL,
	"progress" real NOT NULL,
	"level" integer NOT NULL,
	"has_boq" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boq_items" (
	"id" text PRIMARY KEY NOT NULL,
	"wbs_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" real NOT NULL,
	"unit" text NOT NULL,
	"unit_price" real NOT NULL,
	"total" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"due_date" text NOT NULL,
	"amount" real NOT NULL,
	"percentage" real NOT NULL,
	"deliverables" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gantt_projects" (
	"project_id" text PRIMARY KEY NOT NULL,
	"tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"report_number" integer NOT NULL,
	"date" text NOT NULL,
	"weather" text NOT NULL,
	"temperature" real NOT NULL,
	"linked_wbs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"personnel" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_personnel" integer NOT NULL,
	"activities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"issues" text NOT NULL,
	"signatures" jsonb NOT NULL,
	"status" text NOT NULL,
	"status_history" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_records" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"itp_id" text NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"inspectors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"wbs_link" text NOT NULL,
	"standards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overall_result" text NOT NULL,
	"fail_reason" text NOT NULL,
	"auto_ncr" boolean NOT NULL,
	"workflow_status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itp_items" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"item" text NOT NULL,
	"standard" text NOT NULL,
	"inspection_type" text NOT NULL,
	"inspector" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_gates" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"name_en" text NOT NULL,
	"status" text NOT NULL,
	"date" text,
	"checklist" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "risks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"likelihood" integer NOT NULL,
	"impact" integer NOT NULL,
	"score" real NOT NULL,
	"level" text NOT NULL,
	"status" text NOT NULL,
	"owner" text NOT NULL,
	"date_identified" text NOT NULL,
	"mitigation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"severity" text NOT NULL,
	"status" text NOT NULL,
	"assignee" text NOT NULL,
	"linked_wbs" text NOT NULL,
	"sla_hours" integer NOT NULL,
	"resolution" text,
	"progress" real,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"source_inspection_id" text,
	"source_risk_id" text,
	"source_type" text,
	"created_at" text NOT NULL,
	"closed_at" text
);
--> statement-breakpoint
CREATE TABLE "document_files" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"folder_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"version" integer NOT NULL,
	"size" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" text NOT NULL,
	"status" text NOT NULL,
	"workflow" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sha256" text,
	"size_bytes" integer,
	"mime_type" text,
	"virus_scan_status" text,
	"virus_scan_checked_at" text,
	"retention_policy" jsonb,
	"access_policy" jsonb
);
--> statement-breakpoint
CREATE TABLE "document_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"file_count" integer,
	"pending_count" integer
);
--> statement-breakpoint
CREATE TABLE "document_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"role" text NOT NULL,
	"upload" boolean NOT NULL,
	"download" boolean NOT NULL,
	"edit" boolean NOT NULL,
	"delete" boolean NOT NULL,
	"manage_folder" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"file_id" text NOT NULL,
	"version" integer NOT NULL,
	"date" text NOT NULL,
	"author" text NOT NULL,
	"note" text NOT NULL,
	"version_locked" boolean DEFAULT false NOT NULL,
	"sha256" text
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"budget_impact" real NOT NULL,
	"schedule_impact" real NOT NULL,
	"linked_wbs" text NOT NULL,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"requested_by" text NOT NULL,
	"requested_at" text NOT NULL,
	"approved_by" text,
	"approved_at" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"workflow" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"assignment_role" text NOT NULL,
	CONSTRAINT "team_memberships_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "evm_data_points" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"month" text NOT NULL,
	"month_thai" text NOT NULL,
	"pv" real NOT NULL,
	"ev" real NOT NULL,
	"ac" real NOT NULL,
	"paid_to_date" real,
	"spi" real NOT NULL,
	"cpi" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evm_project_registry" (
	"project_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" text NOT NULL,
	"role" text NOT NULL,
	"department" text NOT NULL,
	"department_id" text NOT NULL,
	"status" text NOT NULL,
	"project_count" integer NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_units" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "rid_org_unit_kind" NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"parent_id" text,
	"cost_center" text,
	"construction_tier" "project_size_tier"
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" text NOT NULL,
	"request_id" text NOT NULL,
	"actor_id" text,
	"actor_role" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"project_id" text,
	"before" jsonb,
	"after" jsonb,
	"decision_reason" text,
	"authority_basis" text,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"project_id" text,
	"is_read" boolean NOT NULL,
	"timestamp" text NOT NULL,
	"action_url" text,
	"severity" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wbs_nodes" ADD CONSTRAINT "wbs_nodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_actor_ts_idx" ON "audit_events" USING btree ("actor_id","timestamp");--> statement-breakpoint
CREATE INDEX "audit_events_request_id_idx" ON "audit_events" USING btree ("request_id");