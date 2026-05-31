/**
 * PR-30b — PFMS-SP2 wire-format contract (PLACEHOLDER).
 *
 * **Status: unconfirmed.** PFMS-SP2 is the Project & Financial
 * Management System (subprogramme 2) sometimes referenced by RID
 * planners. No public wire-format documentation was located at PR-30b
 * discovery time. The schema below is a best-effort stub — a project
 * report record carrying:
 *
 *   - the back-pointer to a PQM project,
 *   - a reporting window (start / end),
 *   - physical-progress and budget-utilisation snapshots.
 *
 * Per Q3 stakeholder decision (`MVP_EXECUTION_PLAN.md`), the wire
 * format will be validated at the demo conversation with RID-IT. Until
 * then, fixtures are stubs and the schema is `placeholder` maturity in
 * the integration manifest.
 */
import { z } from 'zod';

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected ISO date YYYY-MM-DD');

const percentSchema = z
  .number()
  .min(0, 'percent must be >= 0')
  .max(100, 'percent must be <= 100');

export const pfmsSp2ProjectReportSchema = z
  .object({
    /** PQM project id back-reference. */
    projectCode: z.string().min(1),
    /** Display name as it would appear on the report. */
    projectName: z.string().min(1),
    reportingPeriod: z
      .object({
        startDate: isoDateSchema,
        endDate: isoDateSchema,
      })
      .strict()
      .refine((p) => p.startDate <= p.endDate, {
        message: 'reportingPeriod.startDate must precede endDate',
      }),
    physicalProgressPercent: percentSchema,
    financialProgressPercent: percentSchema,
    /** Cumulative disbursement at end of period. */
    cumulativeDisbursementTHB: z.number().nonnegative(),
    /** Free-text note as it would appear on the report. */
    note: z.string().optional(),
  })
  .strict();

export type PfmsSp2ProjectReport = z.infer<
  typeof pfmsSp2ProjectReportSchema
>;
