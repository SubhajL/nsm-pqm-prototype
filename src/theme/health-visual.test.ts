import { describe, expect, it } from 'vitest';

import { COLORS } from './antd-theme';
import { getContrastRatio } from './contrast';
import {
  HEALTH_STATES,
  type HealthState,
  resolveHealthVisual,
} from './health-visual';

/**
 * Tier 2 PR 1 — canonical health-visual lock-in.
 *
 * The four pre-existing status-color modules
 *   - `src/components/common/status-visual.ts`
 *   - `src/components/common/kpi-card-color.ts`
 *   - `src/components/common/StatusBadge.tsx` (HEALTH_STATUS map)
 *   - `src/app/(dashboard)/projects/[id]/_components/milestone-progress-color.ts`
 * each made their own decision about how a status keyword maps to a
 * brand color. Audit gaps G15 (KPI bypassing AA-safe variants) and G20
 * (delayed milestones rendering in brand blue) were both symptoms of
 * that fragmentation.
 *
 * `resolveHealthVisual` is now the single source of truth. The adapter
 * modules above delegate here for color / icon resolution. The locks
 * below pin the AA contract per WCAG 2.x SC 1.4.3.
 */

const VALID_ICONS = ['check', 'warn', 'error', 'info', 'dot'] as const;

describe('resolveHealthVisual — shape', () => {
  it.each(HEALTH_STATES)(
    '`%s` returns a complete HealthVisual record',
    (state: HealthState) => {
      const v = resolveHealthVisual(state);
      expect(v.text).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(v.fill).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(v.tagColor.length).toBeGreaterThan(0);
      expect(VALID_ICONS).toContain(v.icon);
    },
  );
});

describe('resolveHealthVisual — WCAG-AA on white (text channel)', () => {
  it.each(HEALTH_STATES)(
    '`%s`.text satisfies AA (≥ 4.5:1) on white — the surface chips and progress strokes render on',
    (state: HealthState) => {
      const ratio = getContrastRatio(
        resolveHealthVisual(state).text,
        COLORS.white,
      );
      expect(
        ratio,
        `${state} text (${resolveHealthVisual(state).text}) on white: got ratio ${ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe('resolveHealthVisual — semantic anchors', () => {
  it('maps `success` to the AA-safe `successText` brand variant', () => {
    expect(resolveHealthVisual('success').text).toBe(COLORS.successText);
  });

  it('maps `warning` to the AA-safe `warningText` brand variant', () => {
    expect(resolveHealthVisual('warning').text).toBe(COLORS.warningText);
  });

  it('maps `error` to the AA-safe `errorText` brand variant', () => {
    expect(resolveHealthVisual('error').text).toBe(COLORS.errorText);
  });

  it('maps `info` to the AA-safe `info` token (#1D5EE6 — bumped in PR-A1)', () => {
    expect(resolveHealthVisual('info').text).toBe(COLORS.info);
  });

  it('maps `neutral` to the AA-safe `textMuted` token (#595959 — raised in PR-A1)', () => {
    expect(resolveHealthVisual('neutral').text).toBe(COLORS.textMuted);
  });
});

describe('resolveHealthVisual — project / milestone health bands', () => {
  it('`on_schedule` shares the success identity (green check)', () => {
    const v = resolveHealthVisual('on_schedule');
    expect(v.text).toBe(COLORS.successText);
    expect(v.fill).toBe(COLORS.success);
    expect(v.icon).toBe('check');
    expect(v.tagColor).toBe('green');
  });

  it('`watch` shares the warning identity (gold warn)', () => {
    const v = resolveHealthVisual('watch');
    expect(v.text).toBe(COLORS.warningText);
    expect(v.fill).toBe(COLORS.warning);
    expect(v.icon).toBe('warn');
    expect(v.tagColor).toBe('gold');
  });

  it('`delayed` shares the error identity (red error) — fixes G20', () => {
    const v = resolveHealthVisual('delayed');
    expect(v.text).toBe(COLORS.errorText);
    expect(v.fill).toBe(COLORS.error);
    expect(v.icon).toBe('error');
    expect(v.tagColor).toBe('red');
  });

  it('`not_started` is neutral grey (no judgement before work begins)', () => {
    const v = resolveHealthVisual('not_started');
    expect(v.text).toBe(COLORS.textMuted);
    expect(v.icon).toBe('dot');
  });

  it('`completed` shares the success identity', () => {
    expect(resolveHealthVisual('completed').text).toBe(COLORS.successText);
  });
});

describe('resolveHealthVisual — lifecycle states', () => {
  it('`planning` reads as info (blue)', () => {
    expect(resolveHealthVisual('planning').text).toBe(COLORS.info);
  });

  it('`in_progress` reads as info (blue) — matches AntD `processing`', () => {
    const v = resolveHealthVisual('in_progress');
    expect(v.text).toBe(COLORS.info);
    expect(v.tagColor).toBe('processing');
  });

  it('`on_hold` reads as warning (gold)', () => {
    expect(resolveHealthVisual('on_hold').text).toBe(COLORS.warningText);
  });

  it('`cancelled` reads as error (red)', () => {
    expect(resolveHealthVisual('cancelled').text).toBe(COLORS.errorText);
  });

  it('`draft` reads as neutral (grey)', () => {
    expect(resolveHealthVisual('draft').text).toBe(COLORS.textMuted);
  });
});

describe('resolveHealthVisual — risk + issue lifecycle', () => {
  it('`open` reads as error (open = unresolved problem)', () => {
    expect(resolveHealthVisual('open').text).toBe(COLORS.errorText);
  });

  it('`mitigating` reads as warning (in-flight remediation)', () => {
    expect(resolveHealthVisual('mitigating').text).toBe(COLORS.warningText);
  });

  it('`closed` reads as success (terminal resolution)', () => {
    expect(resolveHealthVisual('closed').text).toBe(COLORS.successText);
  });

  it('`accepted` reads as info (acknowledged + recorded, no further action)', () => {
    expect(resolveHealthVisual('accepted').text).toBe(COLORS.info);
  });

  it('`resolved` reads as success (issue terminal resolution)', () => {
    expect(resolveHealthVisual('resolved').text).toBe(COLORS.successText);
  });
});

describe('resolveHealthVisual — milestone-specific lifecycle', () => {
  it('`pending` reads as neutral (awaiting trigger)', () => {
    expect(resolveHealthVisual('pending').text).toBe(COLORS.textMuted);
  });

  it('`review` reads as warning (action required)', () => {
    expect(resolveHealthVisual('review').text).toBe(COLORS.warningText);
  });
});
