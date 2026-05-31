/**
 * PR-25 — Zod schemas for the permit register.
 *
 * - `createPermitRequestSchema` — POST body for `/api/permits/[projectId]`.
 * - `permitEntitySchema` — full permit row (used for repo-level validation
 *   helpers; the persistence layer trusts TypeScript shapes, so this is a
 *   defensive duplicate matching `Permit`).
 */

import { z } from 'zod';

import { PERMIT_STATUSES } from './permit';

const permitStatusSchema = z.enum(PERMIT_STATUSES);

export const createPermitRequestSchema = z
  .object({
    permitType: z.string().min(1, 'permitType is required'),
    title: z.string().min(1, 'title is required'),
    issuingAuthority: z.string().min(1, 'issuingAuthority is required'),
    status: permitStatusSchema.optional(),
    issuedAt: z.string().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreatePermitRequest = z.infer<typeof createPermitRequestSchema>;

export const permitEntitySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  permitType: z.string(),
  title: z.string(),
  issuingAuthority: z.string(),
  status: permitStatusSchema,
  issuedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  notes: z.string(),
});
