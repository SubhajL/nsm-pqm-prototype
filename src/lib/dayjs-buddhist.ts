/**
 * PR-32 — Buddhist-Era dayjs setup (side-effect module).
 *
 * `dayjs/plugin/buddhistEra` is FORMAT-ONLY: it renders the `BBBB` token
 * (CE + 543) but cannot parse it back — `dayjs('15/07/2569', 'DD/MM/BBBB')`
 * would otherwise yield CE year 2569 (543 years in the future). AntD
 * DatePickers parse typed input through `dayjs(text, format, true)`, so
 * without a parse shim every keyboard-entered BE date silently lands half
 * a millennium off.
 *
 * The shim rewrites the BE year INSIDE the input string (2569 → 2026)
 * before delegating to `customParseFormat` with `BBBB` substituted by
 * `YYYY`. Rewriting the string — rather than parsing first and shifting
 * the result — keeps leap days intact: BE 2567 is not a CE leap year, so
 * parse-then-shift would normalize 29/02/2567 to 1 March before the
 * shift could run.
 *
 * Import this module once from `src/app/providers.tsx` (client) — dayjs
 * is a singleton, so every picker and `.format()` call sees the setup.
 * Domain code MUST keep submitting ISO CE via `.format('YYYY-MM-DD')`.
 */
import dayjs from 'dayjs';
import type { PluginFunc } from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/th';

/** Internal dayjs parse config (stable across dayjs 1.x). */
interface ParseConfig {
  date?: unknown;
  args: ArrayLike<unknown>;
}

interface ParseProto {
  parse(cfg: ParseConfig): void;
  isValid(): boolean;
}

const BE_OFFSET_YEARS = 543;

function containsBuddhistToken(format: unknown): boolean {
  if (typeof format === 'string') return format.includes('BBBB');
  if (Array.isArray(format)) {
    return format.some((f) => typeof f === 'string' && f.includes('BBBB'));
  }
  return false;
}

function substituteBuddhistToken(format: string): string {
  return format.replace(/BBBB/g, 'YYYY');
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a position-anchored matcher for the numeric date tokens we use in
 * picker formats. Returns null for formats carrying tokens this shim does
 * not understand (e.g. `wo`, `Q`, month names) — callers then fall back
 * to parse-then-shift, which is correct for everything except leap days.
 */
function buildBuddhistMatcher(
  format: string,
): { regex: RegExp; groups: string[] } | null {
  const tokenizer = /\[([^\]]*)\]|BBBB|YYYY|DD|MM|HH|mm|ss|D|M|H|m|s|./g;
  let source = '^';
  const groups: string[] = [];
  for (const match of Array.from(format.matchAll(tokenizer))) {
    const token = match[0];
    if (match[1] !== undefined) {
      source += escapeRegExp(match[1]);
      continue;
    }
    switch (token) {
      case 'BBBB':
      case 'YYYY':
        source += '(\\d{4})';
        groups.push(token);
        break;
      case 'DD':
      case 'MM':
      case 'HH':
      case 'mm':
      case 'ss':
      case 'D':
      case 'M':
      case 'H':
      case 'm':
      case 's':
        source += '(\\d{1,2})';
        groups.push(token);
        break;
      default:
        if (/[A-Za-z]/.test(token)) return null;
        source += escapeRegExp(token);
    }
  }
  return { regex: new RegExp(`${source}$`, 'd'), groups };
}

/**
 * Rewrite the BE year digits inside `input` to CE per `format`, e.g.
 * ("15/07/2569", "DD/MM/BBBB") → "15/07/2026". Null when the input does
 * not line up with the format.
 */
function convertBuddhistInputToCe(input: string, format: string): string | null {
  const matcher = buildBuddhistMatcher(format);
  if (!matcher) return null;
  const match = matcher.regex.exec(input);
  if (!match?.indices) return null;
  const groupIndex = matcher.groups.indexOf('BBBB');
  if (groupIndex === -1) return null;
  const beYear = Number(match[groupIndex + 1]);
  const span = match.indices[groupIndex + 1];
  if (!Number.isInteger(beYear) || !span) return null;
  const ceYear = String(beYear - BE_OFFSET_YEARS).padStart(4, '0');
  return input.slice(0, span[0]) + ceYear + input.slice(span[1]);
}

const buddhistParse: PluginFunc = (_options, dayjsClass) => {
  const proto = dayjsClass.prototype as unknown as ParseProto;
  const originalParse = proto.parse;

  proto.parse = function parseWithBuddhistEra(cfg: ParseConfig) {
    const args = Array.from(cfg.args);
    const format = args.length > 1 ? args[1] : undefined;
    if (typeof cfg.date !== 'string' || !containsBuddhistToken(format)) {
      originalParse.call(this, cfg);
      return;
    }

    // A format ARRAY may mix CE and BE entries — try each independently
    // (first valid wins, like dayjs) so CE input never gets a BE shift.
    if (Array.isArray(format)) {
      for (const single of format) {
        proto.parse.call(this, {
          ...cfg,
          args: [args[0], single, ...args.slice(2)],
        });
        if (this.isValid()) return;
      }
      return;
    }

    if (typeof format === 'string') {
      const ceInput = convertBuddhistInputToCe(cfg.date, format);
      const ceFormat = substituteBuddhistToken(format);
      if (ceInput !== null) {
        originalParse.call(this, {
          ...cfg,
          date: ceInput,
          args: [ceInput, ceFormat, ...args.slice(2)],
        });
        return;
      }
      // Unsupported token mix — parse as YYYY, then shift the year. Wrong
      // only for leap days, which the matcher path already covers for all
      // formats the app actually mounts.
      originalParse.call(this, {
        ...cfg,
        args: [args[0], ceFormat, ...args.slice(2)],
      });
      const self = this as unknown as ParseProto & { $d: Date; init(): void };
      if (self.isValid() && self.$d instanceof Date) {
        self.$d.setFullYear(self.$d.getFullYear() - BE_OFFSET_YEARS);
        self.init();
      }
      return;
    }

    originalParse.call(this, cfg);
  };
};

dayjs.extend(customParseFormat);
dayjs.extend(buddhistEra);
dayjs.extend(buddhistParse);
dayjs.locale('th');

export {};
