-- PR-RID-A: ProjectType → ProjectClass migration.
--
-- Drops the free-text `type` column on `projects` (legacy NSM values:
-- construction / it / equipment / academic / renovation) in favour of the
-- already-defined `project_class` enum (RID values: construction / it /
-- consulting / research / maintenance). Existing rows are remapped:
--
--   construction → construction
--   it           → it
--   equipment    → maintenance   (equipment fits O&M better than research)
--   academic     → research
--   renovation   → construction  (renovation is a construction sub-type)
--
-- The fallback ELSE clause defends against any out-of-band value sneaking
-- in via direct SQL — it preserves data rather than failing the migration.

ALTER TABLE "projects" ADD COLUMN "project_class" "project_class";--> statement-breakpoint
UPDATE "projects" SET "project_class" = CASE
  WHEN "type" = 'construction' THEN 'construction'::project_class
  WHEN "type" = 'it' THEN 'it'::project_class
  WHEN "type" = 'equipment' THEN 'maintenance'::project_class
  WHEN "type" = 'academic' THEN 'research'::project_class
  WHEN "type" = 'renovation' THEN 'construction'::project_class
  ELSE 'construction'::project_class
END;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "project_class" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "type";
