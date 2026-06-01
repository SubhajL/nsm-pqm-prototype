import { describe, expect, it } from 'vitest';

import {
  DAILY_REPORT_STEPS,
  getDailyReportWizardFieldNames,
} from './wizard-steps';

describe('DAILY_REPORT_STEPS', () => {
  it('exposes 4 bilingual steps in order', () => {
    expect(DAILY_REPORT_STEPS).toHaveLength(4);
    for (const step of DAILY_REPORT_STEPS) {
      expect(step.title).toMatch(/\(/);
      expect(step.title).toMatch(/\)/);
    }
  });
});

describe('getDailyReportWizardFieldNames', () => {
  it('returns site-info fields for step 0', () => {
    expect(getDailyReportWizardFieldNames(0)).toEqual([
      'date',
      'weather',
      'temperature',
      'linkedWbs',
    ]);
  });

  it('returns personnel root for step 1 (Form.List children validate recursively)', () => {
    expect(getDailyReportWizardFieldNames(1)).toEqual(['personnel']);
  });

  it('returns activities root for step 2', () => {
    expect(getDailyReportWizardFieldNames(2)).toEqual(['activities']);
  });

  it('returns capture-step fields for step 3', () => {
    const fields = getDailyReportWizardFieldNames(3);
    expect(fields).toContain('photoMetadata');
    expect(fields).toContain('reporterName');
    expect(fields).toContain('inspectorName');
  });

  it('returns empty for unknown step indices', () => {
    expect(getDailyReportWizardFieldNames(99)).toEqual([]);
    expect(getDailyReportWizardFieldNames(-1)).toEqual([]);
  });
});
