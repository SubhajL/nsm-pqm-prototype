import { z } from 'zod';

/**
 * Zod schemas for the team domain.
 *
 * `team/[projectId]` POST and DELETE only receive a single `userId`.
 * Eligibility (role, duplicate membership, last-PM guard) is enforced in
 * the route after schema validation passes.
 */

export const inviteTeamMemberRequestSchema = z
  .object({
    userId: z.string().min(1, 'userId is required'),
  })
  .strict();

export type InviteTeamMemberRequest = z.infer<
  typeof inviteTeamMemberRequestSchema
>;

export const removeTeamMemberRequestSchema = z
  .object({
    userId: z.string().min(1, 'userId is required'),
  })
  .strict();

export type RemoveTeamMemberRequest = z.infer<
  typeof removeTeamMemberRequestSchema
>;
