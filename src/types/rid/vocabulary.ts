/**
 * Canonical RID (Royal Irrigation Department) domain vocabulary.
 *
 * This module is the single source of truth for the names used across
 * every RID-fit feature in the NSM PQM prototype. Every downstream type,
 * Zod schema, persistence layer, and UI label should import from here so
 * that terminology cannot drift between modules.
 *
 * Stakeholder decisions were captured on 2026-05-28 — see
 * `src/types/rid/README.md` and MVP_EXECUTION_PLAN.md §PR-13 for the
 * decision log and the rationale behind each set of values.
 */

// ---------------------------------------------------------------------------
// Project class — coarse-grained category of work the project performs.
// Broader than the minimal construction/it/consulting list because RID also
// runs research projects (e.g. water-resource studies) and dedicated
// maintenance projects on its built irrigation assets.
// ---------------------------------------------------------------------------

export const PROJECT_CLASSES = [
  'construction',
  'it',
  'consulting',
  'research',
  'maintenance',
] as const;

export type ProjectClass = (typeof PROJECT_CLASSES)[number];

/**
 * Bilingual labels for the 5 RID `ProjectClass` values. Single source of
 * truth for any UI that needs to render a class as Thai/English text
 * (form selects, tables, headers, exports). Keep aligned with the
 * `PROJECT_CLASSES` array above.
 */
export const PROJECT_CLASS_LABELS: Record<ProjectClass, { th: string; en: string }> = {
  construction: { th: 'ก่อสร้าง', en: 'Construction' },
  it: { th: 'พัฒนาระบบ IT', en: 'IT/Software' },
  consulting: { th: 'งานที่ปรึกษา', en: 'Consulting' },
  research: { th: 'งานวิจัย', en: 'Research' },
  maintenance: { th: 'บำรุงรักษา (O&M)', en: 'Maintenance' },
};

// ---------------------------------------------------------------------------
// Delivery method — who actually executes the contracted work.
//
// RENAME of the legacy `ProjectExecutionModel = 'internal' | 'outsourced'`
// union. The new vocabulary adds `consultant_supervised` to model RID's
// "Full Vision" delivery, where a consulting firm supervises construction
// on RID's behalf. See `src/types/project.ts` for the back-compat alias.
// ---------------------------------------------------------------------------

export const DELIVERY_METHODS = [
  'in_house',
  'outsourced',
  'consultant_supervised',
] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

// ---------------------------------------------------------------------------
// Contracting model — pricing structure used in the awarded contract.
// Default set per MVP plan PR-13; flagged for stakeholder review.
// ---------------------------------------------------------------------------

export const CONTRACTING_MODELS = [
  'lump_sum',
  'unit_price',
  'cost_plus',
  'design_build',
] as const;

export type ContractingModel = (typeof CONTRACTING_MODELS)[number];

// ---------------------------------------------------------------------------
// Project size tier — coarse budget bucket used for approval-authority
// routing and reporting rollups.
//
// Thresholds in THB (Thai Baht), confirmed by stakeholder 2026-05-28:
//   - small:  totalBudgetTHB <= 50_000_000
//   - medium: 50_000_000 < totalBudgetTHB <= 500_000_000
//   - large:  totalBudgetTHB > 500_000_000
// ---------------------------------------------------------------------------

export const PROJECT_SIZE_TIERS = ['small', 'medium', 'large'] as const;

export type ProjectSizeTier = (typeof PROJECT_SIZE_TIERS)[number];

export const PROJECT_SIZE_TIER_THRESHOLDS = {
  // Thresholds in THB. Confirmed by stakeholder 2026-05-28.
  small_max: 50_000_000, //  <= 50M THB
  medium_max: 500_000_000, //  50M – 500M THB
  // large: > 500M THB
} as const;

/**
 * Classifies a project's total budget (in THB) into a `ProjectSizeTier`.
 *
 * Boundary rule (inclusive upper bound for the smaller tier):
 *   - exactly 50_000_000 -> 'small'
 *   - exactly 500_000_000 -> 'medium'
 *   - 500_000_001 -> 'large'
 */
export function classifyProjectSize(totalBudgetTHB: number): ProjectSizeTier {
  if (totalBudgetTHB <= PROJECT_SIZE_TIER_THRESHOLDS.small_max) {
    return 'small';
  }
  if (totalBudgetTHB <= PROJECT_SIZE_TIER_THRESHOLDS.medium_max) {
    return 'medium';
  }
  return 'large';
}

// ---------------------------------------------------------------------------
// RID lifecycle stage — the 7 stages of a RID construction project lifecycle.
//
// `land_acquisition` is surfaced as its own stage because land acquisition
// and asset compensation are documented top-3 RID delay drivers per
// Tiyarathtagarn's thesis. Treating it as a first-class stage lets the
// lifecycle gate component block downstream stages until acquisition
// conditions are met.
//
// This vocabulary is distinct from the existing `QualityGatePipeline`,
// which models ITP / inspection-level quality gates. The two render
// side-by-side on the project detail page.
// ---------------------------------------------------------------------------

export const RID_LIFECYCLE_STAGES = [
  'planning',
  'land_acquisition',
  'survey_design',
  'procurement',
  'construction',
  'handover',
  'om',
] as const;

export type RidLifecycleStage = (typeof RID_LIFECYCLE_STAGES)[number];

// ---------------------------------------------------------------------------
// RID org-unit taxonomy.
//
// Multi-tier model that covers RID's real organizational shape:
//   department -> bureau -> regional_office -> construction_office
//                                            -> provincial_office
//                                            -> om_project
// `basin` is a parallel geography overlay (e.g. ลุ่มน้ำเจ้าพระยา) that
// projects can additionally belong to for water-resource reporting.
//
// `construction_office` carries an additional `constructionTier` qualifier
// because RID's สำนักงานก่อสร้าง 1–24 are sized small / medium / large
// and that sizing affects approval routing. All other kinds reject the
// qualifier via the discriminated union.
// ---------------------------------------------------------------------------

export const RID_ORG_UNIT_KINDS = [
  'department',
  'bureau',
  'regional_office',
  'construction_office',
  'provincial_office',
  'om_project',
  'basin',
] as const;

export type RidOrgUnitKind = (typeof RID_ORG_UNIT_KINDS)[number];

export interface RidOrgUnitBase {
  id: string;
  kind: RidOrgUnitKind;
  /** Thai display name (canonical). */
  name: string;
  /** English display name; nullable for units without an official EN form. */
  nameEn: string | null;
  /** Null only for the root department. */
  parentId: string | null;
  /**
   * GFMIS cost-center code (PR-17). Nullable because RID-IT has not yet
   * confirmed the canonical code list — once they ship the mapping, every
   * non-null entry should match the agreed format. Cost centers apply at
   * every org level because finance reporting rolls up through the tree.
   */
  costCenter: string | null;
}

export type RidOrgUnit = RidOrgUnitBase &
  (
    | {
        kind: 'construction_office';
        /** สำนักงานก่อสร้าง size class (เล็ก / กลาง / ใหญ่). */
        constructionTier: ProjectSizeTier | null;
      }
    | { kind: Exclude<RidOrgUnitKind, 'construction_office'> }
  );
