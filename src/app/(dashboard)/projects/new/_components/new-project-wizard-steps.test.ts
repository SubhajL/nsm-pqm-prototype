import { describe, expect, it } from 'vitest';

import {
  NEW_PROJECT_STEPS,
  getNewProjectWizardFieldNames,
} from './new-project-wizard-steps';

describe('NEW_PROJECT_STEPS', () => {
  it('exposes 3 bilingual steps in order', () => {
    expect(NEW_PROJECT_STEPS).toHaveLength(3);
    expect(NEW_PROJECT_STEPS[0].key).toBe('basics');
    expect(NEW_PROJECT_STEPS[2].key).toBe('team');
    for (const step of NEW_PROJECT_STEPS) {
      expect(step.title).toMatch(/\(/);
    }
  });
});

describe('getNewProjectWizardFieldNames', () => {
  it('returns Basic Info fields for step 0', () => {
    const fields = getNewProjectWizardFieldNames(0);
    expect(fields).toContain('name');
    expect(fields).toContain('projectClass');
    expect(fields).toContain('deliveryMethod');
  });

  it('returns Schedule + Budget fields for step 1', () => {
    const fields = getNewProjectWizardFieldNames(1);
    expect(fields).toContain('startDate');
    expect(fields).toContain('endDate');
    expect(fields).toContain('budget');
  });

  it('returns empty for team step (optional fields validated at submit)', () => {
    expect(getNewProjectWizardFieldNames(2)).toEqual([]);
  });

  it('returns empty for unknown step indices', () => {
    expect(getNewProjectWizardFieldNames(99)).toEqual([]);
  });
});
