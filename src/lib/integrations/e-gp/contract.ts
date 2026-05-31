/**
 * PR-30b — e-GP (Thai government e-Procurement) wire-format contracts.
 *
 * Source notes (PR-30b discovery):
 *
 *  - Public documentation at procurement.rid.go.th describes
 *    procurement notices with fields covering the procurement
 *    reference id, method (e-bidding / specific method / selection),
 *    fiscal year (BE), and the awarded contractor block (name, tax id,
 *    awarded amount). RID also publishes a public "ประกาศผู้ชนะ"
 *    (winner-announcement) listing.
 *  - The wire format here is a JSON projection of those public
 *    fields. RID-IT has not published a machine-consumable feed at
 *    PR-30b; once they do, the schema below is the contract we need
 *    them to satisfy.
 *
 * No real procurement IDs are stored in the fixtures — every value
 * uses the synthetic `EGP-SAMPLE` prefix.
 */
import { z } from 'zod';

/** 13-digit Thai national tax id. */
const thaiTaxIdSchema = z
  .string()
  .regex(/^\d{13}$/, 'expected a 13-digit Thai tax id');

/**
 * Thai fiscal year expressed in Buddhist Era. RID's e-GP records
 * predate the Buddhist-era / CE switchover at 2543 (= 2000 CE) by
 * decades, so anything below 2500 is almost certainly malformed.
 */
const fiscalYearBESchema = z
  .number()
  .int()
  .min(2500, 'fiscalYearBE must be >= 2500');

export const EGP_PROCUREMENT_METHODS = [
  'e_bidding',
  'specific_method',
  'selection_method',
  'reverse_auction',
] as const;

export const egpProcurementReferenceSchema = z
  .object({
    /**
     * Synthetic reference id — format `EGP-<be2>-<contract-slug>` where
     * `<be2>` is the last two digits of the BE fiscal year and
     * `<contract-slug>` is the contract number normalised to
     * `[A-Za-z0-9-]+`.
     */
    referenceId: z.string().min(1),
    fiscalYearBE: fiscalYearBESchema,
    procurementMethod: z.enum(EGP_PROCUREMENT_METHODS),
    /** Thai display name of the publishing agency (e.g. RID). */
    publishingAgency: z.string().min(1),
    /** Procurement title as it would appear on the public notice. */
    title: z.string().min(1),
    /** Estimated budget on the notice. */
    estimatedBudgetTHB: z.number().nonnegative(),
    /** ISO date the notice was published. */
    publishedAt: z.string().min(1),
  })
  .strict();

export type EgpProcurementReference = z.infer<
  typeof egpProcurementReferenceSchema
>;

export const egpAwardNoticeSchema = z
  .object({
    referenceId: z.string().min(1),
    fiscalYearBE: fiscalYearBESchema,
    awardedContractor: z
      .object({
        name: z.string().min(1),
        taxId: thaiTaxIdSchema,
      })
      .strict(),
    awardAmountTHB: z.number().positive(),
    /** ISO date the award was published. */
    awardedAt: z.string().min(1),
  })
  .strict();

export type EgpAwardNotice = z.infer<typeof egpAwardNoticeSchema>;
