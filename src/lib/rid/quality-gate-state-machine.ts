/**
 * Quality Gate state-machine — pure helper.
 *
 * The QualityGate workflow per PR-PRQM-K:
 *   - `pending` → `conditional` | `passed`
 *   - `conditional` → `passed`
 *   - `passed` is terminal (re-opening a gate happens by creating a new gate)
 *
 * The helper is intentionally pure (no I/O, no clock, no randomness) so it
 * can be unit-tested under vitest's node env and re-used from both the
 * API route and the UI gating logic.
 */

import type { GateStatus } from '@/types/quality';

/**
 * Adjacency list for the QualityGate state machine. Every key → set of
 * legal target states. An empty array means terminal.
 */
const GATE_TRANSITIONS: Record<GateStatus, readonly GateStatus[]> = {
  pending: ['conditional', 'passed'],
  conditional: ['passed'],
  passed: [],
};

export interface QualityGateTransitionResult {
  canTransition: boolean;
  reason?: string;
}

/**
 * Whether a QualityGate may move from `from` to `to`.
 *
 * Returns `{ canTransition: true }` on success, or
 * `{ canTransition: false, reason }` on rejection. Self-transitions are
 * rejected — moving to the same state is never a meaningful workflow
 * event. Terminal `passed` rejects every outbound edge.
 */
export function canTransitionGate(
  from: GateStatus,
  to: GateStatus,
): QualityGateTransitionResult {
  if (from === to) {
    return {
      canTransition: false,
      reason: `Already in state '${from}'; no-op transition not allowed.`,
    };
  }

  const allowed = GATE_TRANSITIONS[from];

  if (allowed.length === 0) {
    return {
      canTransition: false,
      reason: `State '${from}' is terminal; no further transitions are permitted.`,
    };
  }

  if (!allowed.includes(to)) {
    return {
      canTransition: false,
      reason: `Transition from '${from}' to '${to}' is not allowed; legal next states are: ${allowed.join(', ')}.`,
    };
  }

  return { canTransition: true };
}

/**
 * Convenience predicate — does `state` have any outbound transitions?
 * The UI uses this to gate the per-gate action buttons.
 */
export function isGateTerminal(state: GateStatus): boolean {
  return GATE_TRANSITIONS[state].length === 0;
}

/**
 * Legal next states for a given gate. Returns an empty list for terminal
 * states. Stable order — used to drive the per-gate action button list.
 */
export function legalNextGateStates(
  from: GateStatus,
): readonly GateStatus[] {
  return GATE_TRANSITIONS[from];
}
