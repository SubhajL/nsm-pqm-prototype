import { z } from 'zod';

/**
 * Zod schemas for the notification domain.
 *
 * The PATCH `notifications` route only accepts an ID list to mark as read.
 */

export const markNotificationsReadRequestSchema = z
  .object({
    ids: z.array(z.string().min(1)),
  })
  .strict();

export type MarkNotificationsReadRequest = z.infer<
  typeof markNotificationsReadRequestSchema
>;
