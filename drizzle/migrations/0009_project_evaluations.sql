-- Bucket 2: Project evaluation persistence.
--
-- Adds `project_evaluations` — the executive end-of-project scorecard,
-- one canonical row per project. Replaces the previous hardcoded
-- in-memory `evaluationStore` in /api/evaluation/[projectId]/route.ts so
-- the read AND the new create/update path go through the repository
-- registry like every other domain.
--
-- `categories` holds the EvaluationCategory[] as jsonb. The summary
-- columns (overall_score / percentage / level) are derived server-side.
--
-- Sequential numbering after PR-26's 0008. The admin merge step renames
-- this to the next free slot if a sibling PR lands first.

CREATE TABLE "project_evaluations" (
	"project_id" text PRIMARY KEY NOT NULL,
	"project_name" text NOT NULL,
	"overall_score" real NOT NULL,
	"max_score" integer NOT NULL,
	"level" text NOT NULL,
	"percentage" integer NOT NULL,
	"evaluated_by" text NOT NULL,
	"evaluated_at" text NOT NULL,
	"categories" jsonb NOT NULL,
	"recommendation" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
