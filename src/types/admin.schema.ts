import { z } from 'zod';

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

const orgUnitMutableFieldsSchema = z.object({
  name: z.string().min(1, 'name is required'),
  nameEn: z.string(),
  parentId: z.string().nullable(),
});

export const createOrgUnitRequestSchema = orgUnitMutableFieldsSchema.strict();

export type CreateOrgUnitRequest = z.infer<typeof createOrgUnitRequestSchema>;

export const updateOrgUnitRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    updates: orgUnitMutableFieldsSchema.partial().strict(),
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
