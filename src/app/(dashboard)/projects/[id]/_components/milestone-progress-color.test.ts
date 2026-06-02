import { describe, expect, it } from 'vitest';

import { COLORS } from '@/theme/antd-theme';

import { resolveMilestoneProgressStrokeColor } from './milestone-progress-color';

describe('resolveMilestoneProgressStrokeColor', () => {
  it('returns the error color for `delayed` milestones (audit G20 fix)', () => {
    expect(resolveMilestoneProgressStrokeColor('delayed')).toBe(COLORS.errorText);
  });

  it('returns the warning color for `watch` milestones', () => {
    expect(resolveMilestoneProgressStrokeColor('watch')).toBe(COLORS.warningText);
  });

  it('returns the success color for `on_schedule` milestones', () => {
    expect(resolveMilestoneProgressStrokeColor('on_schedule')).toBe(COLORS.successText);
  });

  it('returns the info color for `not_started` milestones (in-progress fallback)', () => {
    expect(resolveMilestoneProgressStrokeColor('not_started')).toBe(COLORS.info);
  });

  it('returns the info color for `completed` milestones (Progress bar is normally hidden when isCompleted, but keep a sane fallback)', () => {
    expect(resolveMilestoneProgressStrokeColor('completed')).toBe(COLORS.info);
  });

  it('returns the info color for unknown / future statuses (safe default)', () => {
    expect(resolveMilestoneProgressStrokeColor('something_new')).toBe(COLORS.info);
    expect(resolveMilestoneProgressStrokeColor('')).toBe(COLORS.info);
  });
});
