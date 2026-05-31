/**
 * PR-26 — Zod schemas for the HandoverPacket API surface.
 *
 *   - `createHandoverPacketRequestSchema` — POST body for
 *     `/api/handover-packets/by-project/[projectId]`.
 *   - `transitionHandoverPacketRequestSchema` — POST body for
 *     `/api/handover-packets/[packetId]/transition`.
 *
 * `state`, `submittedAt`, `acceptedAt`, etc. are NOT accepted from the
 * wire on creation — the route layer initialises them to draft/null so
 * the state-machine cannot be circumvented by client-controlled inserts.
 */

import { z } from 'zod';

import { HANDOVER_STATES } from './handover-packet';

const handoverStateSchema = z.enum(HANDOVER_STATES);

export const createHandoverPacketRequestSchema = z
  .object({
    contractId: z.string().min(1).nullable().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateHandoverPacketRequest = z.infer<
  typeof createHandoverPacketRequestSchema
>;

export const transitionHandoverPacketRequestSchema = z
  .object({
    targetState: handoverStateSchema,
  })
  .strict();

export type TransitionHandoverPacketRequest = z.infer<
  typeof transitionHandoverPacketRequestSchema
>;
