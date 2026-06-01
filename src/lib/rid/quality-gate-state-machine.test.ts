import { describe, expect, it } from 'vitest';

import type { GateStatus } from '@/types/quality';

import {
  canTransitionGate,
  isGateTerminal,
  legalNextGateStates,
} from './quality-gate-state-machine';

const ALL_STATES: readonly GateStatus[] = ['pending', 'conditional', 'passed'];

describe('canTransitionGate', () => {
  const allowed: Array<[GateStatus, GateStatus]> = [
    ['pending', 'conditional'],
    ['pending', 'passed'],
    ['conditional', 'passed'],
  ];

  it.each(allowed)('allows %s -> %s', (from, to) => {
    const result = canTransitionGate(from, to);
    expect(result.canTransition).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it.each(ALL_STATES)('rejects self-transition for %s', (state) => {
    const result = canTransitionGate(state, state);
    expect(result.canTransition).toBe(false);
    expect(result.reason).toMatch(/no-op|already/i);
  });

  it('rejects every outbound transition from terminal passed state', () => {
    for (const to of ALL_STATES) {
      if (to === 'passed') continue; // self-edge is covered above
      const result = canTransitionGate('passed', to);
      expect(result.canTransition).toBe(false);
      if (!result.canTransition) {
        expect(result.reason).toMatch(/passed|terminal/i);
      }
    }
  });

  it('rejects backward transition conditional -> pending', () => {
    const result = canTransitionGate('conditional', 'pending');
    expect(result.canTransition).toBe(false);
    if (!result.canTransition) {
      expect(result.reason).toMatch(/not allowed/i);
    }
  });

  it('reason on illegal edge lists the legal next states', () => {
    const result = canTransitionGate('conditional', 'pending');
    expect(result.canTransition).toBe(false);
    if (!result.canTransition) {
      expect(result.reason).toContain('passed');
    }
  });
});

describe('isGateTerminal', () => {
  it('treats passed as terminal', () => {
    expect(isGateTerminal('passed')).toBe(true);
  });

  it.each<GateStatus>(['pending', 'conditional'])('treats %s as non-terminal', (state) => {
    expect(isGateTerminal(state)).toBe(false);
  });
});

describe('legalNextGateStates', () => {
  it('returns conditional + passed from pending', () => {
    expect(legalNextGateStates('pending')).toEqual(['conditional', 'passed']);
  });

  it('returns passed from conditional', () => {
    expect(legalNextGateStates('conditional')).toEqual(['passed']);
  });

  it('returns empty list from terminal passed', () => {
    expect(legalNextGateStates('passed')).toEqual([]);
  });
});
