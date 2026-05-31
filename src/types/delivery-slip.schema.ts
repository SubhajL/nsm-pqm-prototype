/**
 * PR-23 — Zod schema for the DeliverySlip (ใบส่งมอบงาน) API surface.
 *
 * `createDeliverySlipRequestSchema` is the POST body for
 * `/api/delivery-slips/[workPeriodId]`. `submittedBy` is filled by the
 * route from the active user (it is NOT accepted from the wire) so it is
 * absent from the schema; the route layer is the only legitimate writer
 * of audit-attributable identity.
 */

import { z } from 'zod';

export const createDeliverySlipRequestSchema = z
  .object({
    attachedDocIds: z.array(z.string().min(1)).default([]),
    notes: z.string().optional(),
  })
  .strict();

export type CreateDeliverySlipRequest = z.infer<
  typeof createDeliverySlipRequestSchema
>;
