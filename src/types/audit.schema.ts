import { z } from 'zod';

import { userRoleSchema } from '@/types/admin.schema';

/**
 * Zod schema for `AuditEvent` (`./audit.ts`).
 *
 * Mirrors the TypeScript interface so the persisted snapshot (and any
 * future direct ingestion endpoint) can be runtime-validated. The
 * `before`/`after` fields are `unknown` — entity-specific schemas would
 * compose with this base shape if we ever needed strict validation on
 * snapshot contents.
 */
export const auditEventSchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.string().min(1),
    requestId: z.string().min(1),
    actorId: z.string().nullable(),
    actorRole: userRoleSchema.nullable(),
    action: z.string().min(1),
    resourceType: z.string().min(1),
    resourceId: z.string().min(1),
    projectId: z.string().nullable(),
    before: z.unknown().nullable(),
    after: z.unknown().nullable(),
    decisionReason: z.string().nullable(),
    authorityBasis: z.string().nullable(),
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
  })
  .strict();

export type AuditEventSchemaInput = z.input<typeof auditEventSchema>;
export type AuditEventSchemaOutput = z.infer<typeof auditEventSchema>;
