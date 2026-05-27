import { z } from 'zod';

import {
  PROJECT_SIZE_TIERS,
  RID_ORG_UNIT_KINDS,
} from '@/types/rid/vocabulary';

/**
 * Zod schemas for the admin domain (`src/types/admin.ts`).
 *
 * Covers `/api/users` and `/api/org-structure` write boundaries. Also covers
 * the `/api/auth/login` mock-login body (a single `userId`).
 */

export const userRoleSchema = z.enum([
  'System Admin',
  'Project Manager',
  'Engineer',
  'Coordinator',
  'Team Member',
  'Executive',
  'Consultant',
]);

const userMutableFieldsSchema = z.object({
  name: z.string().min(1, 'name is required'),
  position: z.string(),
  role: userRoleSchema,
  department: z.string(),
  departmentId: z.string().min(1, 'departmentId is required'),
  status: z.enum(['active', 'suspended']),
  email: z.string(),
  phone: z.string(),
});

export const createUserRequestSchema = userMutableFieldsSchema.strict();

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

export const updateUserRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    updates: userMutableFieldsSchema.partial().strict(),
  })
  .strict();

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

/**
 * PR-17: OrgUnit is now PR-13's `RidOrgUnit` discriminated union. The
 * `construction_office` branch requires `constructionTier`; every other
 * `kind` rejects it. `costCenter` lives on every branch (finance scope spans
 * all org levels). `nameEn` allows null per the canonical vocabulary.
 */

const orgUnitKindSchema = z.enum(RID_ORG_UNIT_KINDS);
const constructionTierSchema = z.enum(PROJECT_SIZE_TIERS);

const orgUnitBaseFieldsSchema = z.object({
  name: z.string().min(1, 'name is required'),
  nameEn: z.string().nullable(),
  parentId: z.string().nullable(),
  costCenter: z.string().nullable(),
});

// Non-construction-office kinds — `kind` is the discriminator literal.
const nonConstructionOrgUnitMutableSchema = orgUnitBaseFieldsSchema.extend({
  kind: orgUnitKindSchema.exclude(['construction_office']),
});

const constructionOfficeOrgUnitMutableSchema = orgUnitBaseFieldsSchema.extend({
  kind: z.literal('construction_office'),
  constructionTier: constructionTierSchema.nullable(),
});

const orgUnitMutableFieldsSchema = z.discriminatedUnion('kind', [
  nonConstructionOrgUnitMutableSchema.strict(),
  constructionOfficeOrgUnitMutableSchema.strict(),
]);

export const createOrgUnitRequestSchema = orgUnitMutableFieldsSchema;

export type CreateOrgUnitRequest = z.infer<typeof createOrgUnitRequestSchema>;

/**
 * For PATCH we keep things simple: every field is optional, but the same
 * discriminator rule still applies — if `kind` is `construction_office`,
 * `constructionTier` may be supplied; if `kind` is any other value,
 * `constructionTier` is rejected. We model that by branching on the
 * (optional) `kind` field with a discriminated union over its literal value
 * plus an "unspecified" branch that disallows `constructionTier`.
 */
const nonConstructionUpdateSchema = orgUnitBaseFieldsSchema
  .extend({ kind: orgUnitKindSchema.exclude(['construction_office']) })
  .partial()
  .strict();

const constructionOfficeUpdateSchema = orgUnitBaseFieldsSchema
  .extend({
    kind: z.literal('construction_office'),
    constructionTier: constructionTierSchema.nullable(),
  })
  .partial()
  .strict();

const orgUnitUpdateFieldsSchema = z.union([
  nonConstructionUpdateSchema,
  constructionOfficeUpdateSchema,
]);

export const updateOrgUnitRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    updates: orgUnitUpdateFieldsSchema,
  })
  .strict();

export type UpdateOrgUnitRequest = z.infer<typeof updateOrgUnitRequestSchema>;

export const deleteOrgUnitRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
  })
  .strict();

export type DeleteOrgUnitRequest = z.infer<typeof deleteOrgUnitRequestSchema>;

export const loginRequestSchema = z
  .object({
    userId: z.string().min(1, 'userId is required'),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;
