import { COLORS } from './antd-theme';

/**
 * Tier 2 PR 1 — canonical status → visual resolver.
 *
 * Consolidates four pre-existing modules that each made their own
 * decision about how a status keyword maps to a brand color:
 *   - `src/components/common/status-visual.ts` (generic semantic chips)
 *   - `src/components/common/kpi-card-color.ts` (KPI value tinting)
 *   - `src/components/common/StatusBadge.tsx` (HEALTH_STATUS map)
 *   - `src/app/(dashboard)/projects/[id]/_components/milestone-progress-color.ts`
 *
 * Each of those modules is now a thin adapter that maps its own
 * vocabulary onto `HealthState` and delegates here. The `text` channel
 * is locked at WCAG-AA on white by `health-visual.test.ts`.
 */

/** Bilingual icon name; the React renderer maps these to AntD icons. */
export type HealthIcon = 'check' | 'warn' | 'error' | 'info' | 'dot';

/**
 * Single source of truth for the health-state vocabulary. The union
 * type is derived from this array via `(typeof HEALTH_STATES)[number]`,
 * so any future state added here automatically appears in:
 *   - the `HealthState` union (compile-time exhaustiveness for the
 *     `resolveHealthVisual` switch — TS errors at the `assertNever`),
 *   - `it.each(HEALTH_STATES)` in `health-visual.test.ts` (AA contrast
 *     lock-in coverage of the new state).
 *
 * The intentionally wide vocabulary covers five overlapping families:
 * generic semantic + project lifecycle + health bands + milestone
 * lifecycle + risk/issue lifecycle. Many keywords collapse onto the
 * same visual identity (e.g. `on_schedule`, `completed`, and `closed`
 * are all the green-check family).
 */
export const HEALTH_STATES = [
  // Generic semantic
  'success',
  'warning',
  'error',
  'info',
  'neutral',
  // Project / milestone health bands (deriveTaskGroupScheduleHealth)
  'on_schedule',
  'watch',
  'delayed',
  'not_started',
  // Project lifecycle
  'planning',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
  'draft',
  // Milestone lifecycle
  'pending',
  'review',
  // Risk lifecycle
  'open',
  'mitigating',
  'closed',
  'accepted',
  // Issue lifecycle (open is shared with risk)
  'resolved',
] as const;

export type HealthState = (typeof HEALTH_STATES)[number];

export interface HealthVisual {
  /** AA-safe foreground color on white surfaces. Locked ≥ 4.5:1. */
  text: string;
  /** Brand fill color (filled chips, progress strokes, icon glyphs). */
  fill: string;
  /** AntD `<Tag color>` keyword for legacy callers (`'green'`, `'gold'`, …). */
  tagColor: string;
  /** Logical icon name; resolved to a real icon component by the renderer. */
  icon: HealthIcon;
}

/**
 * Visual identity families. Every HealthState collapses onto one of
 * these five families; the only per-state variance is the AntD
 * `tagColor` keyword (e.g. the success family splits into `'success'`
 * for lifecycle and `'green'` for health bands — both green-on-white,
 * but the keyword affects which AntD shade ships).
 */
const SUCCESS_FAMILY = {
  text: COLORS.successText,
  fill: COLORS.success,
  icon: 'check' as HealthIcon,
};
const WARNING_FAMILY = {
  text: COLORS.warningText,
  fill: COLORS.warning,
  icon: 'warn' as HealthIcon,
};
const ERROR_FAMILY = {
  text: COLORS.errorText,
  fill: COLORS.error,
  icon: 'error' as HealthIcon,
};
const INFO_FAMILY = {
  text: COLORS.info,
  fill: COLORS.info,
  icon: 'info' as HealthIcon,
};
const NEUTRAL_FAMILY = {
  text: COLORS.textMuted,
  fill: COLORS.textMuted,
  icon: 'dot' as HealthIcon,
};

function assertNever(state: never): never {
  throw new Error(`Unhandled HealthState: ${String(state)}`);
}

export function resolveHealthVisual(state: HealthState): HealthVisual {
  switch (state) {
    case 'success':
      return { ...SUCCESS_FAMILY, tagColor: 'success' };
    case 'completed':
      return { ...SUCCESS_FAMILY, tagColor: 'success' };
    case 'closed':
      return { ...SUCCESS_FAMILY, tagColor: 'success' };
    case 'resolved':
      return { ...SUCCESS_FAMILY, tagColor: 'success' };
    case 'on_schedule':
      return { ...SUCCESS_FAMILY, tagColor: 'green' };

    case 'warning':
      return { ...WARNING_FAMILY, tagColor: 'warning' };
    case 'on_hold':
      return { ...WARNING_FAMILY, tagColor: 'warning' };
    case 'review':
      return { ...WARNING_FAMILY, tagColor: 'warning' };
    case 'mitigating':
      return { ...WARNING_FAMILY, tagColor: 'warning' };
    case 'watch':
      return { ...WARNING_FAMILY, tagColor: 'gold' };

    case 'error':
      return { ...ERROR_FAMILY, tagColor: 'error' };
    case 'cancelled':
      return { ...ERROR_FAMILY, tagColor: 'error' };
    case 'open':
      return { ...ERROR_FAMILY, tagColor: 'error' };
    case 'delayed':
      return { ...ERROR_FAMILY, tagColor: 'red' };

    case 'info':
      return { ...INFO_FAMILY, tagColor: 'blue' };
    case 'planning':
      return { ...INFO_FAMILY, tagColor: 'blue' };
    case 'accepted':
      return { ...INFO_FAMILY, tagColor: 'blue' };
    case 'in_progress':
      return { ...INFO_FAMILY, tagColor: 'processing' };

    case 'neutral':
      return { ...NEUTRAL_FAMILY, tagColor: 'default' };
    case 'not_started':
      return { ...NEUTRAL_FAMILY, tagColor: 'default' };
    case 'pending':
      return { ...NEUTRAL_FAMILY, tagColor: 'default' };
    case 'draft':
      return { ...NEUTRAL_FAMILY, tagColor: 'default' };

    default:
      return assertNever(state);
  }
}
