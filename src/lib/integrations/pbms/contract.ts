/**
 * PR-30b — PBMS wire-format contract (PLACEHOLDER).
 *
 * **Status: unconfirmed.** PBMS (Project Budget Management System) is
 * referenced by Thai government budget-monitoring workflows. No
 * public wire-format documentation was located at PR-30b discovery
 * time. The schema below captures the minimal pair we'd most plausibly
 * need from an eventual adapter:
 *
 *   - a budget-line allocation,
 *   - a utilisation snapshot against it.
 *
 * Per Q3 stakeholder decision, the wire format will be validated at
 * the demo conversation with RID-IT. Until then, fixtures are stubs
 * and the schema is `placeholder` maturity in the integration manifest.
 */
import { z } from 'zod';

const fiscalYearBESchema = z
  .number()
  .int()
  .min(2500, 'fiscalYearBE must be >= 2500');

const percentSchema = z.number().min(0).max(100);

export const pbmsBudgetUtilisationSchema = z
  .object({
    /** PQM project code. */
    projectCode: z.string().min(1),
    /** PBMS budget line — placeholder format until RID-IT confirms. */
    budgetLine: z.string().min(1),
    fiscalYearBE: fiscalYearBESchema,
    /** Allocated budget on the line (THB). */
    allocatedTHB: z.number().nonnegative(),
    /** Spent / encumbered to date (THB). */
    utilisedTHB: z.number().nonnegative(),
    /** Pre-computed utilisation percent (allocated / utilised × 100). */
    utilisationPercent: percentSchema,
    /** ISO timestamp of the snapshot. */
    asOf: z.string().min(1),
  })
  .strict()
  .refine((p) => p.utilisedTHB <= p.allocatedTHB, {
    message: 'utilisedTHB must not exceed allocatedTHB',
    path: ['utilisedTHB'],
  });

export type PbmsBudgetUtilisation = z.infer<
  typeof pbmsBudgetUtilisationSchema
>;
