/**
 * PR-29 — RID progress-reporting types.
 *
 * Pure structural types for the RID e-GP family of progress reports.
 * See `docs/rid-reporting-templates.md` for the discovery write-up that
 * pins each section to its real-world counterpart in the RID
 * procurement boilerplate.
 *
 * Implementation note: all builders in this module are deterministic
 * (no `Date.now()`, no random ids). Callers pass `generatedAt` and the
 * builders thread it verbatim into the output so snapshot tests stay
 * stable.
 */

export const REPORT_KINDS = ['monthly', 'work_period', 'delay'] as const;
export type RidReportKind = (typeof REPORT_KINDS)[number];

/**
 * One labelled section of a rendered report. Bilingual `heading`
 * convention: `"ไทย (English)"`.
 */
export interface RidReportSection {
  /** Bilingual heading, format `"Thai (English)"`. */
  heading: string;
  /** Flat key/value rows in display order. */
  rows: Array<{ label: string; value: string }>;
}

/**
 * Bilingual signatory block per RID e-GP convention (PM + Engineer +
 * Witness). `name === null` indicates the role is intentionally left
 * blank for hand-fill at sign-off; `signedAt === null` indicates the
 * PDF was never physically signed (the prototype never auto-fills
 * sign-off timestamps).
 */
export interface RidReportSignatory {
  role: string;
  name: string | null;
  signedAt: string | null;
}

export interface RidReportData {
  kind: RidReportKind;
  projectId: string;
  /** ISO 8601 timestamp the report was generated. */
  generatedAt: string;
  /** ISO 8601 date (no time). `null` for ad-hoc reports without a window. */
  periodStart: string | null;
  /** ISO 8601 date (no time). `null` for ad-hoc reports without a window. */
  periodEnd: string | null;
  sections: RidReportSection[];
  signatories: RidReportSignatory[];
}

/**
 * Bilingual labels for the three report families. UI surfaces should
 * always render both forms (Thai-first) per project Thai-first rule.
 */
export const REPORT_KIND_LABELS: Record<RidReportKind, { th: string; en: string }> = {
  monthly: { th: 'รายงานประจำเดือน', en: 'Monthly Progress Report' },
  work_period: { th: 'รายงานปิดงวดงาน', en: 'Work-Period Completion Report' },
  delay: { th: 'รายงานความล่าช้า', en: 'Delay Report' },
};
