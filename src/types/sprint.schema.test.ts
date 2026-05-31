/**
 * PR-30a — IT Sprint Zod schema tests.
 */

import { describe, expect, it } from 'vitest';

import {
  createItSprintRequestSchema,
  updateItSprintRequestSchema,
} from './sprint.schema';

describe('createItSprintRequestSchema', () => {
  const valid = {
    lifecycleStage: 'construction',
    sprintNumber: 3,
    startDate: '2026-06-01',
    endDate: '2026-06-14',
    goal: 'Deliver SRS for the alerting module.',
    velocityPoints: 21,
    completedPoints: 0,
    notes: '',
  };

  it('accepts a well-formed body', () => {
    expect(createItSprintRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('omitting completedPoints / notes / lifecycleStage is permitted', () => {
    const result = createItSprintRequestSchema.safeParse({
      sprintNumber: 1,
      startDate: '2026-06-01',
      endDate: '2026-06-14',
      goal: 'Sprint 1 kickoff',
      velocityPoints: 13,
    });
    expect(result.success).toBe(true);
  });

  it('rejects sprintNumber ≤ 0', () => {
    expect(
      createItSprintRequestSchema.safeParse({ ...valid, sprintNumber: 0 }).success,
    ).toBe(false);
    expect(
      createItSprintRequestSchema.safeParse({ ...valid, sprintNumber: -1 }).success,
    ).toBe(false);
  });

  it('rejects negative velocityPoints / completedPoints', () => {
    expect(
      createItSprintRequestSchema.safeParse({ ...valid, velocityPoints: -1 })
        .success,
    ).toBe(false);
    expect(
      createItSprintRequestSchema.safeParse({ ...valid, completedPoints: -1 })
        .success,
    ).toBe(false);
  });

  it('rejects empty goal', () => {
    expect(
      createItSprintRequestSchema.safeParse({ ...valid, goal: '' }).success,
    ).toBe(false);
  });

  it('rejects extra keys (strict)', () => {
    expect(
      createItSprintRequestSchema.safeParse({ ...valid, extra: 'x' }).success,
    ).toBe(false);
  });
});

describe('updateItSprintRequestSchema', () => {
  it('accepts a partial body with just velocityPoints', () => {
    expect(
      updateItSprintRequestSchema.safeParse({ velocityPoints: 30 }).success,
    ).toBe(true);
  });

  it('accepts a partial body with just completedPoints', () => {
    expect(
      updateItSprintRequestSchema.safeParse({ completedPoints: 17 }).success,
    ).toBe(true);
  });

  it('accepts notes update', () => {
    expect(
      updateItSprintRequestSchema.safeParse({ notes: 'late delivery' }).success,
    ).toBe(true);
  });

  it('rejects negative numbers', () => {
    expect(
      updateItSprintRequestSchema.safeParse({ completedPoints: -1 }).success,
    ).toBe(false);
  });

  it('rejects unknown fields (strict)', () => {
    expect(
      updateItSprintRequestSchema.safeParse({ bogus: 1 }).success,
    ).toBe(false);
  });
});
