/**
 * PR-32 — AntD locale with Buddhist-Era date rendering.
 *
 * Wraps the stock `th_TH` locale and pins every DatePicker field/cell
 * format that involves a year to the `BBBB` token (rendered by the
 * buddhistEra dayjs plugin set up in `src/lib/dayjs-buddhist.ts` — import
 * that module wherever this locale is mounted, or typed input will not
 * parse).
 *
 * Pickers with an explicit `format` prop override these defaults — use
 * the exported `THAI_DATE_FORMAT` / `THAI_MONTH_FORMAT` constants there
 * so the year stays BE everywhere. Submission code keeps producing ISO CE
 * via `.format('YYYY-MM-DD')` on the dayjs value.
 */
import thTH from 'antd/locale/th_TH';
import type { Locale } from 'antd/es/locale';

/** Day-level picker display/input format (BE year). */
export const THAI_DATE_FORMAT = 'DD/MM/BBBB';

/** Month-picker display/input format (BE year). */
export const THAI_MONTH_FORMAT = 'MM/BBBB';

const baseDatePicker = thTH.DatePicker;
if (!baseDatePicker) {
  throw new Error('antd th_TH locale unexpectedly lacks a DatePicker section');
}

export const thaiBuddhistLocale: Locale = {
  ...thTH,
  DatePicker: {
    ...baseDatePicker,
    lang: {
      ...baseDatePicker.lang,
      fieldDateFormat: THAI_DATE_FORMAT,
      fieldDateTimeFormat: 'DD/MM/BBBB HH:mm:ss',
      fieldMonthFormat: THAI_MONTH_FORMAT,
      fieldYearFormat: 'BBBB',
      fieldWeekFormat: 'BBBB-wo',
      fieldQuarterFormat: 'BBBB-[Q]Q',
      yearFormat: 'BBBB',
      cellYearFormat: 'BBBB',
    },
  },
};
