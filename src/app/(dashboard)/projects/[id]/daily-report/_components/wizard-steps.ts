/**
 * PR-D1b — pure mapping of "wizard step index → AntD `Form` field names
 * to validate before advancing." Kept in a `.ts` file so it tests under
 * the project's node-env vitest config.
 *
 * Step indices:
 *   0 — Site info
 *   1 — Personnel (Form.List 'personnel')
 *   2 — Activities (Form.List 'activities')
 *   3 — Photos + Signatures + Issues
 */

export const DAILY_REPORT_STEPS = [
  { key: 'site-info', title: 'ข้อมูลหน้างาน (Site info)' },
  { key: 'personnel', title: 'บุคลากร (Personnel)' },
  { key: 'progress', title: 'กิจกรรม (Progress)' },
  { key: 'capture', title: 'ปัญหา + ภาพ + ลายเซ็น (Issues + Photos + Signatures)' },
] as const;

export type DailyReportStepKey = (typeof DAILY_REPORT_STEPS)[number]['key'];

/**
 * Field names to feed `form.validateFields(...)` before advancing past
 * the given step. Form.List fields are validated implicitly when the
 * list root key is included; AntD walks them recursively.
 */
export function getDailyReportWizardFieldNames(
  step: number,
): readonly string[] {
  switch (step) {
    case 0:
      return ['date', 'weather', 'temperature', 'linkedWbs'];
    case 1:
      return ['personnel'];
    case 2:
      return ['activities'];
    case 3:
      // PR-D1c — Step 4 fields after capture-primitive wiring:
      // `photos` is a CapturedPhoto[] from PhotoCaptureField;
      // `signatures` is `{reporter, inspector}` from SignatureCaptureField.
      return ['photos', 'signatures', 'issues'];
    default:
      return [];
  }
}
