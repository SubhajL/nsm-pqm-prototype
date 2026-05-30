import { describe, expect, it } from 'vitest';

import { COLORS } from '@/theme/antd-theme';
import { getContrastRatio } from '@/theme/contrast';

import {
  STATUS_VALUES,
  type Status,
  resolveStatusVisual,
} from './status-visual';

describe('resolveStatusVisual', () => {
  it.each(STATUS_VALUES)(
    '`%s` exposes a non-color signal (icon + textual label channel) per WCAG SC 1.4.1',
    (status: Status) => {
      const visual = resolveStatusVisual(status);
      expect(visual.icon).toBeDefined();
      expect(visual.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(visual.textColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    },
  );

  it.each(STATUS_VALUES)(
    '`%s` textColor satisfies WCAG-AA (≥ 4.5:1) on white — the surface PR-A3 chips render on',
    (status: Status) => {
      const visual = resolveStatusVisual(status);
      const ratio = getContrastRatio(visual.textColor, COLORS.white);
      expect(
        ratio,
        `${status} (${visual.textColor}) on white: got ${ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('maps `success` to the existing AA-compliant `successText` brand variant', () => {
    expect(resolveStatusVisual('success').textColor).toBe(COLORS.successText);
  });

  it('maps `warning` to the AA-compliant `warningText` variant', () => {
    expect(resolveStatusVisual('warning').textColor).toBe(COLORS.warningText);
  });

  it('maps `error` to the AA-compliant `errorText` variant', () => {
    expect(resolveStatusVisual('error').textColor).toBe(COLORS.errorText);
  });

  it('maps `info` to the AA-compliant `info` (#1D5EE6 — bumped in PR-A1)', () => {
    expect(resolveStatusVisual('info').textColor).toBe(COLORS.info);
  });

  it('maps `neutral` to the AA-compliant `textMuted` (#595959 — raised in PR-A1)', () => {
    expect(resolveStatusVisual('neutral').textColor).toBe(COLORS.textMuted);
  });
});
