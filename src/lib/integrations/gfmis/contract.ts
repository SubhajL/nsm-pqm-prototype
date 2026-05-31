/**
 * PR-30b — GFMIS (Government Fiscal Management Information System)
 * wire-format contracts.
 *
 * GFMIS is the canonical Thai government fiscal-disbursement and
 * budget-commitment system. Public docs describe a record format
 * keyed on cost-center (10 digits), budget-line (16 digits), fiscal
 * year (BE), and project / disbursement metadata.
 *
 * The schemas here lock the JSON shape we expect a future adapter to
 * accept / produce. Fixtures use synthetic codes only — no real
 * disbursement records appear in this repo.
 */
import { z } from 'zod';

/** GFMIS cost-center code: exactly 10 digits. */
export const gfmisCostCenterSchema = z
  .string()
  .regex(/^\d{10}$/, 'GFMIS cost center must be exactly 10 digits');

/**
 * GFMIS budget line / budget structure code. The canonical Thai
 * fiscal-system encoding is 16 digits (year segment + budget plan +
 * sub-plan + activity). We accept exactly 16 digits and lean on the
 * adapter to break it down further.
 */
export const gfmisBudgetLineSchema = z
  .string()
  .regex(/^\d{16}$/, 'GFMIS budget line must be exactly 16 digits');

const fiscalYearBESchema = z
  .number()
  .int()
  .min(2500, 'fiscalYearBE must be >= 2500');

export const GFMIS_DISBURSEMENT_DOCUMENT_TYPES = [
  /** ขบ. — ขอเบิก (disbursement request). */
  'KhB',
  /** ขจ. — ขอจ่าย (payment request). */
  'KhJ',
  /** PY — direct payment. */
  'PY',
] as const;

export const gfmisDisbursementRecordSchema = z
  .object({
    /**
     * GFMIS document number — agency conventions vary but historically
     * formatted as `<doc-type>-<be2>-<seq>`. We accept any non-empty
     * string and rely on document-type for routing.
     */
    documentNumber: z.string().min(1),
    documentType: z.enum(GFMIS_DISBURSEMENT_DOCUMENT_TYPES),
    /** Project code linking back to the PQM project entity. */
    projectCode: z.string().min(1),
    budgetLine: gfmisBudgetLineSchema,
    costCenter: gfmisCostCenterSchema,
    fiscalYearBE: fiscalYearBESchema,
    /** Disbursed amount in THB. Must be positive. */
    amountTHB: z.number().positive('amountTHB must be positive'),
    /** ISO date of the disbursement period start. */
    periodStartDate: z.string().min(1),
    /** ISO date of the disbursement period end. */
    periodEndDate: z.string().min(1),
    /** Optional free-text memo as it appears on the GFMIS document. */
    memo: z.string().optional(),
  })
  .strict();

export type GfmisDisbursementRecord = z.infer<
  typeof gfmisDisbursementRecordSchema
>;

export const gfmisBudgetCommitmentSchema = z
  .object({
    commitmentNumber: z.string().min(1),
    projectCode: z.string().min(1),
    budgetLine: gfmisBudgetLineSchema,
    costCenter: gfmisCostCenterSchema,
    fiscalYearBE: fiscalYearBESchema,
    /** Committed amount in THB (i.e. PO-equivalent encumbrance). */
    commitmentAmountTHB: z.number().positive(),
    /** ISO date the commitment was created. */
    committedAt: z.string().min(1),
  })
  .strict();

export type GfmisBudgetCommitment = z.infer<
  typeof gfmisBudgetCommitmentSchema
>;
